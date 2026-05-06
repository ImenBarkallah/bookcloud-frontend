import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';
import gsap from 'gsap';
import {
  AmbientLight,
  Color,
  IcosahedronGeometry,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from 'three';
import { animate, stagger } from '@motionone/dom';

import {
  AdminDashboardOverview,
  AdminDashboardService,
  AdminCategoryCount,
  AdminMonthlySeriesPoint,
  AdminTopBook,
  AdminTopUser,
} from './services/admin-dashboard.service';
import { LibraryHistoryEntry } from '../../../models/library-history-entry.model';

@Component({
  selector: 'app-admin-dashboard-page',
  templateUrl: './admin-dashboard-page.component.html',
  styleUrls: ['./admin-dashboard-page.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDashboardPageComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly api = inject(AdminDashboardService);
  private readonly cdr = inject(ChangeDetectorRef);

  @ViewChild('bgCanvas') bgCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('gridRoot') gridRoot?: ElementRef<HTMLElement>;

  loading = true;
  error = false;
  overview: AdminDashboardOverview | null = null;
  monthly: AdminMonthlySeriesPoint[] = [];
  byCategory: AdminCategoryCount[] = [];
  topBorrowed: AdminTopBook[] = [];
  topFavorited: AdminTopBook[] = [];
  topUsers: AdminTopUser[] = [];
  recent: LibraryHistoryEntry[] = [];

  private rafId = 0;
  private renderer?: WebGLRenderer;

  ngOnInit(): void {
    this.loading = true;
    this.error = false;
    this.cdr.markForCheck();

    let done = 0;
    const finishOk = () => {
      done += 1;
      if (done >= 6) {
        this.loading = false;
        this.cdr.markForCheck();
      }
    };
    const finishErr = () => {
      this.error = true;
      this.loading = false;
      this.cdr.markForCheck();
    };

    this.api.getOverview().subscribe({
      next: (o) => {
        this.overview = o;
        finishOk();
      },
      error: finishErr,
    });

    this.api.getMonthlyActivity(12).subscribe({
      next: (rows) => {
        this.monthly = rows ?? [];
        finishOk();
      },
      error: finishErr,
    });

    this.api.getTopBorrowedBooks(5).subscribe({
      next: (rows) => {
        this.topBorrowed = rows ?? [];
        finishOk();
      },
      error: finishErr,
    });

    this.api.getTopFavoritedBooks(5).subscribe({
      next: (rows) => {
        this.topFavorited = rows ?? [];
        finishOk();
      },
      error: finishErr,
    });

    this.api.getTopUsers(5).subscribe({
      next: (rows) => {
        this.topUsers = rows ?? [];
        finishOk();
      },
      error: finishErr,
    });

    this.api.getBooksByCategory(8).subscribe({
      next: (rows) => {
        this.byCategory = rows ?? [];
        finishOk();
      },
      error: finishErr,
    });

    this.api.getRecentActivity(10).subscribe({
      next: (rows) => {
        this.recent = rows ?? [];
        // optional: don't block the page on activity
        finishOk();
      },
      error: () => {
        this.recent = [];
        finishOk();
      },
    });
  }

  ngAfterViewInit(): void {
    this.initBg();
    const root = this.gridRoot?.nativeElement;
    if (root) {
      const cards = root.querySelectorAll('.kpi, .panel');
      animate(
        Array.from(cards) as HTMLElement[],
        { opacity: [0, 1], transform: ['translateY(14px)', 'none'] },
        { duration: 0.5, delay: stagger(0.06) },
      );
    }
    const topChrome = document.querySelectorAll('.admin-main .topbar, .admin-main .page-head');
    if (topChrome.length) {
      animate(
        Array.from(topChrome) as HTMLElement[],
        { opacity: [0, 1], transform: ['translateY(-8px)', 'none'] },
        { duration: 0.45, delay: stagger(0.08) },
      );
    }
    gsap.fromTo(
      '.admin-title',
      { y: 10, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.6, ease: 'power2.out' },
    );
  }

  private initBg(): void {
    const canvas = this.bgCanvas?.nativeElement;
    if (!canvas) {
      return;
    }
    const w = canvas.clientWidth || 1200;
    const h = canvas.clientHeight || 280;
    const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setSize(w, h);
    this.renderer = renderer;

    const scene = new Scene();
    scene.background = null;
    scene.add(new AmbientLight(0xffffff, 0.75));

    const cam = new PerspectiveCamera(55, w / h, 0.1, 100);
    cam.position.z = 7.8;

    const geo = new IcosahedronGeometry(2.2, 2);
    const mat = new MeshStandardMaterial({
      color: new Color('#7b5ea7'),
      emissive: new Color('#00d4ff'),
      emissiveIntensity: 0.25,
      metalness: 0.35,
      roughness: 0.55,
      transparent: true,
      opacity: 0.9,
    });
    const mesh = new Mesh(geo, mat);
    mesh.position.set(-2.2, 0.15, 0);
    scene.add(mesh);

    const mesh2 = new Mesh(
      new IcosahedronGeometry(1.5, 1),
      new MeshStandardMaterial({
        color: new Color('#00d4ff'),
        emissive: new Color('#7b5ea7'),
        emissiveIntensity: 0.15,
        metalness: 0.25,
        roughness: 0.6,
        transparent: true,
        opacity: 0.75,
      }),
    );
    mesh2.position.set(2.4, -0.55, -0.4);
    scene.add(mesh2);

    const loop = (t: number) => {
      this.rafId = requestAnimationFrame(loop);
      const time = t * 0.001;
      mesh.rotation.x = time * 0.25;
      mesh.rotation.y = time * 0.32;
      mesh2.rotation.x = -time * 0.2;
      mesh2.rotation.y = time * 0.28;
      renderer.render(scene, cam);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  ngOnDestroy(): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
    this.renderer?.dispose();
  }

  // --- helpers for charts ---

  monthlyLabels(): string[] {
    return (this.monthly ?? []).map((p) => p.month);
  }

  monthlyMax(): number {
    let max = 0;
    for (const p of this.monthly ?? []) {
      max = Math.max(max, p.loans ?? 0, p.signups ?? 0);
    }
    return Math.max(1, max);
  }

  linePoints(values: number[], width = 520, height = 140, pad = 12): string {
    const n = values.length;
    if (!n) return '';
    const max = Math.max(1, ...values.map((v) => Number(v ?? 0)));
    const w = Math.max(1, width - pad * 2);
    const h = Math.max(1, height - pad * 2);
    return values
      .map((v, i) => {
        const x = pad + (n === 1 ? 0 : (i / (n - 1)) * w);
        const y = pad + (1 - Number(v ?? 0) / max) * h;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }

  seriesLoans(): number[] {
    return (this.monthly ?? []).map((p) => p.loans ?? 0);
  }

  seriesSignups(): number[] {
    return (this.monthly ?? []).map((p) => p.signups ?? 0);
  }

  // --- charts: pie / bars ---

  pieSegments() {
    const o = this.overview;
    const available = Number(o?.availableCopies ?? 0);
    const borrowed = Number(o?.borrowedCopies ?? 0);
    const reserved = Number((o?.pendingReservations ?? 0) + (o?.approvedReservations ?? 0));
    const total = Math.max(1, available + borrowed + reserved);

    const base = [
      { key: 'available', label: 'Disponible', value: available, color: 'rgba(0, 212, 255, 0.95)' },
      { key: 'borrowed', label: 'Emprunté', value: borrowed, color: 'rgba(255, 255, 255, 0.75)' },
      { key: 'reserved', label: 'Réservé', value: reserved, color: 'rgba(123, 94, 167, 0.95)' },
    ] as const;

    let offset = 0;
    const items = base.map((s) => {
      const frac = Number(s.value ?? 0) / total;
      const dasharray = this.pieDash(frac, offset);
      offset += frac;
      return { ...s, frac, dasharray };
    });

    return { total, items };
  }

  pieDash(frac: number, offsetFrac: number): string {
    const c = 100;
    const len = Math.max(0, Math.min(1, frac)) * c;
    const gap = c - len;
    const off = -Math.max(0, Math.min(1, offsetFrac)) * c;
    return `${len.toFixed(3)} ${gap.toFixed(3)} ${off.toFixed(3)}`;
  }

  categoryMax(): number {
    return Math.max(1, ...(this.byCategory ?? []).map((r) => Number(r.books ?? 0)));
  }
}

