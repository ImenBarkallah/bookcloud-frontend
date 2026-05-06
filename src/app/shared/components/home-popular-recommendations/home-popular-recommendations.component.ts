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
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import * as THREE from 'three';
import { distinctUntilChanged, map } from 'rxjs';

import { AuthService } from '../../../core/services/auth.service';
import { GuestFavoritesService } from '../../../core/services/guest-favorites.service';
import { BookCatalogItem } from '../../../core/services/catalogue.models';
import { HomeDiscoveryApiService } from '../../../core/services/home-discovery-api.service';
import { CatalogueStateService } from '../../../core/services/catalogue-state.service';

gsap.registerPlugin(ScrollTrigger);

const PAGE_LIMIT = 8;

@Component({
  selector: 'app-home-popular-recommendations',
  standalone: true,
  imports: [CommonModule, TranslateModule, RouterLink],
  templateUrl: './home-popular-recommendations.component.html',
  styleUrls: ['./home-popular-recommendations.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePopularRecommendationsComponent implements OnInit, AfterViewInit, OnDestroy {
  readonly skelSlots = [1, 2, 3, 4, 5, 6, 7, 8] as const;

  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly api = inject(HomeDiscoveryApiService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly catalogueState = inject(CatalogueStateService);
  private readonly guestFavs = inject(GuestFavoritesService);

  @ViewChild('bgCanvas') private readonly bgCanvas?: ElementRef<HTMLCanvasElement>;

  /** Section populaire */
  readonly popularBooks = signal<BookCatalogItem[]>([]);
  readonly popularDone = signal(false);
  readonly popularError = signal(false);

  /** Recommandations (compte requis) */
  readonly recBooks = signal<BookCatalogItem[]>([]);
  readonly recDone = signal(false);
  readonly recError = signal(false);

  readonly hasUser = signal(false);
  readonly pendingToggleIds = signal<ReadonlySet<string>>(new Set());

  readonly recEmptyKind = computed<'none' | 'guest' | 'no-favorites' | 'error'>(() => {
    if (!this.recDone()) {
      return 'none';
    }
    if (this.recError()) {
      return 'error';
    }
    if (!this.hasUser()) {
      return 'guest';
    }
    if (this.recBooks().length === 0) {
      return 'no-favorites';
    }
    return 'none';
  });

  private threeRaf = 0;
  private threeRenderer?: THREE.WebGLRenderer;
  private threeScene?: THREE.Scene;
  private resizeListener?: () => void;

  constructor() {
    this.auth.user$
      .pipe(
        map((u) => u?.uid ?? ''),
        distinctUntilChanged(),
        takeUntilDestroyed(),
      )
      .subscribe((uid) => {
        this.hasUser.set(!!uid);
        if (uid) {
          this.loadRecommendations();
        } else {
          this.recBooks.set([]);
          this.recDone.set(true);
          this.recError.set(false);
        }
      });
  }

  ngOnInit(): void {
    this.loadPopular();
  }

  ngAfterViewInit(): void {
    const prefersReduce =
      typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!prefersReduce) {
      this.initThreeBackdrop();
      queueMicrotask(() => this.initScrollAnimations());
    }
  }

  private loadPopular(): void {
    this.api.getPopular(PAGE_LIMIT).subscribe({
      next: (list) => {
        this.popularBooks.set(list ?? []);
        this.popularError.set(false);
        this.popularDone.set(true);
      },
      error: () => {
        this.popularError.set(true);
        this.popularDone.set(true);
      },
    });
  }

  private loadRecommendations(): void {
    this.recDone.set(false);
    this.recError.set(false);
    this.api.getRecommendations(PAGE_LIMIT).subscribe({
      next: (list) => {
        this.recBooks.set(list ?? []);
        this.recError.set(false);
        this.recDone.set(true);
      },
      error: (err: unknown) => {
        this.recBooks.set([]);
        this.recError.set(true);
        this.recDone.set(true);
        if (err instanceof HttpErrorResponse && err.status === 401) {
          this.recError.set(false);
        }
      },
    });
  }

  private initThreeBackdrop(): void {
    const canvas = this.bgCanvas?.nativeElement;
    if (!canvas) {
      return;
    }
    const scene = new THREE.Scene();
    const w = Math.max(320, canvas.clientWidth || this.host.nativeElement.clientWidth);
    const h = Math.max(120, canvas.clientHeight || 180);
    const camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 50);
    camera.position.set(0, 1.4, 4.2);
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
    this.threeScene = scene;

    const grid = new THREE.GridHelper(9, 14, 0x5b7a9e, 0x2a3344);
    grid.position.y = -0.45;
    grid.rotation.x = 0.12;
    scene.add(grid);

    const amb = new THREE.AmbientLight(0xcfd6e6, 0.55);
    scene.add(amb);

    const loop = (): void => {
      grid.rotation.z += 0.00045;
      renderer.render(scene, camera);
      this.threeRaf = requestAnimationFrame(loop);
    };
    this.threeRaf = requestAnimationFrame(loop);

    this.resizeListener = () => this.resizeThree(camera, renderer);
    window.addEventListener('resize', this.resizeListener);
  }

  private resizeThree(camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer): void {
    const canvas = this.bgCanvas?.nativeElement;
    if (!canvas) {
      return;
    }
    const w = Math.max(320, canvas.clientWidth);
    const h = Math.max(120, canvas.clientHeight);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }

  private initScrollAnimations(): void {
    const root = this.host.nativeElement;
    const title = root.querySelector('[data-discovery-title]');
    const cards = root.querySelectorAll('[data-discovery-card]');
    if (title) {
      gsap.from(title, {
        scrollTrigger: {
          trigger: root,
          start: 'top 85%',
          toggleActions: 'play none none none',
        },
        y: 24,
        opacity: 0,
        duration: 0.55,
        ease: 'power2.out',
      });
    }
    if (cards.length) {
      gsap.from(cards, {
        scrollTrigger: {
          trigger: root,
          start: 'top 78%',
          toggleActions: 'play none none none',
        },
        y: 28,
        opacity: 0,
        duration: 0.5,
        stagger: 0.05,
        ease: 'power2.out',
      });
    }
  }

  trackBook(_i: number, b: BookCatalogItem): string {
    return b.id;
  }

  isPending(id: string): boolean {
    return this.pendingToggleIds().has(id);
  }

  toggleFavorite(book: BookCatalogItem, ev: Event): void {
    ev.preventDefault();
    ev.stopPropagation();
    if (!this.auth.currentUser) {
      const next = this.guestFavs.toggle(book.id);
      this.patchFavorite(book.id, next);
      this.catalogueState.patchBookFavorite(book.id, next);
      return;
    }
    if (this.isPending(book.id)) {
      return;
    }
    const prev = book.isFavorited;
    const optimistic = !prev;
    this.patchFavorite(book.id, optimistic);
    this.catalogueState.patchBookFavorite(book.id, optimistic);
    this.pendingToggleIds.update((s) => new Set(s).add(book.id));

    this.api.toggleFavorite(book.id).subscribe({
      next: (r) => {
        this.patchFavorite(r.bookId, r.favorited);
        this.catalogueState.patchBookFavorite(r.bookId, r.favorited);
        this.pendingToggleIds.update((s) => {
          const n = new Set(s);
          n.delete(book.id);
          return n;
        });
      },
      error: (err: unknown) => {
        this.patchFavorite(book.id, prev);
        this.catalogueState.patchBookFavorite(book.id, prev);
        this.pendingToggleIds.update((s) => {
          const n = new Set(s);
          n.delete(book.id);
          return n;
        });
        if (err instanceof HttpErrorResponse && err.status === 401) {
          void this.router.navigate(['/auth', 'login']);
        }
      },
    });
  }

  private patchFavorite(bookId: string, favorited: boolean): void {
    const mapRow = (b: BookCatalogItem): BookCatalogItem =>
      b.id === bookId ? { ...b, isFavorited: favorited } : b;
    this.popularBooks.update((rows) => rows.map(mapRow));
    this.recBooks.update((rows) => rows.map(mapRow));
  }

  coverFailed = signal<Record<string, true>>({});

  onCoverError(id: string): void {
    this.coverFailed.update((m) => ({ ...m, [id]: true }));
  }

  coverGradient(id: string): string {
    const h = Math.abs(id.split('').reduce((a, c) => a + c.charCodeAt(0), 0));
    const hue = h % 360;
    return `linear-gradient(145deg, hsl(${hue}, 32%, 20%), hsl(${(hue + 48) % 360}, 36%, 16%))`;
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
    this.threeScene?.clear();
  }
}
