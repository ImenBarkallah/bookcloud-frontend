import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import * as THREE from 'three';

import { AuthToastService } from '../../../../core/services/auth-toast.service';
import { resolvePublicUploadUrl } from '../../../../core/utils/public-upload-url';
import { LoanApiService, UserLoanItem } from '../../../../core/services/loan-api.service';

gsap.registerPlugin(ScrollTrigger);

type LoanTab = 'active' | 'history';

@Component({
  selector: 'app-my-loans-page',
  standalone: true,
  imports: [CommonModule, TranslateModule, RouterLink],
  templateUrl: './my-loans-page.component.html',
  styleUrls: ['./my-loans-page.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyLoansPageComponent implements OnInit, AfterViewInit, OnDestroy {
  readonly skelSlots = [1, 2, 3, 4, 5, 6] as const;

  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly loansApi = inject(LoanApiService);
  private readonly toast = inject(AuthToastService);

  @ViewChild('bgCanvas') private readonly bgCanvas?: ElementRef<HTMLCanvasElement>;

  readonly loading = signal(true);
  readonly error = signal(false);
  readonly loans = signal<UserLoanItem[]>([]);
  readonly tab = signal<LoanTab>('active');
  readonly pendingIds = signal<ReadonlySet<string>>(new Set());

  readonly filteredLoans = computed(() => {
    const rows = [...this.loans()];
    const t = this.tab();
    const f = rows.filter((l) => {
      const st = String(l.status ?? '').toUpperCase();
      if (t === 'active') {
        return st === 'ACTIVE' || st === 'OVERDUE';
      }
      return st === 'RETURNED';
    });
    if (t === 'active') {
      f.sort((a, b) => this.ts(a.dueAt) - this.ts(b.dueAt));
    } else {
      f.sort((a, b) => this.ts(b.returnedAt) - this.ts(a.returnedAt));
    }
    return f;
  });

  readonly isEmpty = computed(
    () => !this.loading() && !this.error() && this.filteredLoans().length === 0,
  );

  private threeRaf = 0;
  private threeRenderer?: THREE.WebGLRenderer;
  private resizeListener?: () => void;

  ngOnInit(): void {
    this.load();
  }

  coverUrl(loan: UserLoanItem): string | null {
    const raw = (loan.coverUrl ?? '').trim();
    return raw ? (resolvePublicUploadUrl(raw) ?? raw) : null;
  }

  ngAfterViewInit(): void {
    const reduce =
      typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduce) {
      this.initThreeBackdrop();
      queueMicrotask(() => this.initScrollAnimations());
    }
  }

  private ts(iso: string | null | undefined): number {
    if (!iso) {
      return 0;
    }
    const n = Date.parse(iso);
    return Number.isFinite(n) ? n : 0;
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.loansApi.myLoans().subscribe({
      next: (rows) => {
        this.loans.set(rows ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  setTab(t: LoanTab): void {
    this.tab.set(t);
  }

  trackLoanId(_index: number, loan: UserLoanItem): string {
    return loan.loanId;
  }

  isPending(id: string): boolean {
    return this.pendingIds().has(id);
  }

  renew(loan: UserLoanItem, ev: Event): void {
    ev.stopPropagation();
    if (!loan.canRenew || this.isPending(loan.loanId)) {
      return;
    }
    this.pendingIds.update((s) => new Set(s).add(loan.loanId));
    this.loansApi.renew(loan.loanId).subscribe({
      next: () => {
        this.toast.showKey('LOANS.RENEW_OK', 'success');
        this.load();
        this.pendingIds.update((s) => {
          const n = new Set(s);
          n.delete(loan.loanId);
          return n;
        });
      },
      error: (err: unknown) => {
        this.toast.showPlain(this.errBody(err), 'error');
        this.pendingIds.update((s) => {
          const n = new Set(s);
          n.delete(loan.loanId);
          return n;
        });
      },
    });
  }

  returnBook(loan: UserLoanItem, ev: Event): void {
    ev.stopPropagation();
    if (!loan.canReturn || this.isPending(loan.loanId)) {
      return;
    }
    this.pendingIds.update((s) => new Set(s).add(loan.loanId));
    this.loansApi.returnLoan(loan.loanId).subscribe({
      next: () => {
        this.toast.showKey('LOANS.RETURN_OK', 'success');
        this.load();
        this.pendingIds.update((s) => {
          const n = new Set(s);
          n.delete(loan.loanId);
          return n;
        });
      },
      error: (err: unknown) => {
        this.toast.showPlain(this.errBody(err), 'error');
        this.pendingIds.update((s) => {
          const n = new Set(s);
          n.delete(loan.loanId);
          return n;
        });
      },
    });
  }

  private errBody(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      const body = err.error;
      if (typeof body === 'string' && body.trim()) {
        return body.trim();
      }
      const o = body as { message?: string; error?: string } | undefined;
      const raw = o?.message ?? o?.error;
      if (typeof raw === 'string' && raw.trim()) {
        return raw.trim();
      }
    }
    return 'Request failed';
  }

  private initThreeBackdrop(): void {
    const canvas = this.bgCanvas?.nativeElement;
    if (!canvas) {
      return;
    }
    const scene = new THREE.Scene();
    const w = Math.max(320, canvas.clientWidth || this.host.nativeElement.clientWidth);
    const h = Math.max(140, canvas.clientHeight || 200);
    const camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 50);
    camera.position.set(0, 1.2, 4.5);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'low-power',
    });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(w, h, false);
    renderer.setClearColor(0x000000, 0);
    this.threeRenderer = renderer;

    const grid = new THREE.GridHelper(10, 16, 0x7b5ea7, 0x2a3344);
    grid.position.y = -0.5;
    grid.rotation.x = 0.1;
    scene.add(grid);
    scene.add(new THREE.AmbientLight(0xd8dce8, 0.5));

    const loop = (): void => {
      grid.rotation.z += 0.00035;
      renderer.render(scene, camera);
      this.threeRaf = requestAnimationFrame(loop);
    };
    this.threeRaf = requestAnimationFrame(loop);

    this.resizeListener = () => {
      const cw = Math.max(320, canvas.clientWidth);
      const ch = Math.max(140, canvas.clientHeight);
      camera.aspect = cw / ch;
      camera.updateProjectionMatrix();
      renderer.setSize(cw, ch, false);
    };
    window.addEventListener('resize', this.resizeListener);
  }

  private initScrollAnimations(): void {
    const root = this.host.nativeElement;
    const title = root.querySelector('[data-loans-head]');
    const cards = root.querySelectorAll('[data-loan-card]');
    if (title) {
      gsap.from(title, {
        scrollTrigger: { trigger: root, start: 'top 88%', toggleActions: 'play none none none' },
        y: 22,
        opacity: 0,
        duration: 0.5,
        ease: 'power2.out',
      });
    }
    if (cards.length) {
      gsap.from(cards, {
        scrollTrigger: { trigger: root, start: 'top 78%', toggleActions: 'play none none none' },
        y: 26,
        opacity: 0,
        duration: 0.45,
        stagger: 0.06,
        ease: 'power2.out',
      });
    }
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.threeRaf);
    if (this.resizeListener) {
      window.removeEventListener('resize', this.resizeListener);
    }
    const root = this.host.nativeElement;
    ScrollTrigger.getAll().forEach((st) => {
      if (st.trigger === root) {
        st.kill();
      }
    });
    this.threeRenderer?.dispose();
  }
}
