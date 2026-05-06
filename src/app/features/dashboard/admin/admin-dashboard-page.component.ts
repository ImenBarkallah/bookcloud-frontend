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

import { AdminDashboardService, AdminKpis } from './services/admin-dashboard.service';

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
  kpis: AdminKpis | null = null;

  private rafId = 0;
  private renderer?: WebGLRenderer;

  ngOnInit(): void {
    this.api.getKpis().subscribe({
      next: (kpis) => {
        this.kpis = kpis;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.error = true;
        this.loading = false;
        this.cdr.markForCheck();
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
}

