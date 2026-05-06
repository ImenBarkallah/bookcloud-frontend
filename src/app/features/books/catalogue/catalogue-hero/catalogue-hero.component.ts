import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  ViewChild,
  inject,
} from '@angular/core';
import gsap from 'gsap';
import * as SplittingNs from 'splitting';
import {
  AmbientLight,
  BoxGeometry,
  Color,
  Group,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from 'three';

@Component({
  selector: 'app-catalogue-hero',
  templateUrl: './catalogue-hero.component.html',
  styleUrls: ['./catalogue-hero.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogueHeroComponent implements AfterViewInit, OnDestroy {
  /** Not static: host lives inside *ngIf(useThree). */
  @ViewChild('canvasHost', { static: false }) canvasHost?: ElementRef<HTMLDivElement>;
  @ViewChild('titleSplit', { static: true }) titleSplit!: ElementRef<HTMLHeadingElement>;

  private readonly zone = inject(NgZone);
  private renderer?: WebGLRenderer;
  private scene?: Scene;
  private camera?: PerspectiveCamera;
  private shelfGroup?: Group;
  private animationId = 0;
  private splitCleanup?: () => void;

  useThree =
    typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches;

  ngAfterViewInit(): void {
    queueMicrotask(() => {
      if (this.useThree && this.canvasHost?.nativeElement) {
        this.zone.runOutsideAngular(() => this.initThree());
      }
    });
    this.zone.runOutsideAngular(() => this.initSplitting());
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.animationId);
    this.renderer?.dispose();
    this.splitCleanup?.();
  }

  private initSplitting(): void {
    const Splitting = (SplittingNs as { default?: (opts: unknown) => unknown }).default ?? SplittingNs;
    const el = this.titleSplit.nativeElement;
    const result = Splitting({ target: el, by: 'chars' });
    const chars = el.querySelectorAll('.char');
    gsap.fromTo(
      chars,
      { y: 36, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.55,
        stagger: 0.025,
        ease: 'power3.out',
        delay: 0.15,
      },
    );
    this.splitCleanup = () => {
      if (Array.isArray(result)) {
        result.forEach((r) => {
          if (r && 'chars' in r && r.chars) {
            (r.chars as HTMLElement[]).forEach((c) => c.remove());
          }
        });
      }
    };
  }

  private initThree(): void {
    const host = this.canvasHost?.nativeElement;
    if (!host) {
      return;
    }
    const w = host.clientWidth || window.innerWidth;
    const h = host.clientHeight || 260;

    this.scene = new Scene();
    this.scene.background = new Color(0x0a0a0f);

    this.camera = new PerspectiveCamera(42, w / h, 0.1, 80);
    this.camera.position.set(0, 1.2, 7);

    this.renderer = new WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(w, h);
    host.appendChild(this.renderer.domElement);

    const ambient = new AmbientLight(0xffffff, 0.55);
    this.scene.add(ambient);

    this.shelfGroup = new Group();
    const palette = [0x7b5ea7, 0x5a3f8c, 0x00d4ff, 0x3d7a8f, 0x9b7ec9];
    const spineGeom = new BoxGeometry(0.22, 1.35, 0.08);

    for (let i = 0; i < 20; i++) {
      const mat = new MeshStandardMaterial({
        color: palette[i % palette.length],
        roughness: 0.45,
        metalness: 0.15,
      });
      const mesh = new Mesh(spineGeom, mat);
      mesh.position.x = -2.1 + i * 0.22;
      mesh.position.y = -0.55;
      mesh.rotation.z = (Math.sin(i * 0.35) * 6 * Math.PI) / 180;
      this.shelfGroup.add(mesh);
    }

    const shelfBoard = new Mesh(
      new BoxGeometry(5.2, 0.08, 0.35),
      new MeshStandardMaterial({ color: 0x2a2438, roughness: 0.7 }),
    );
    shelfBoard.position.y = -1.25;
    this.shelfGroup.add(shelfBoard);

    this.scene.add(this.shelfGroup);

    let idx = 0;
    for (const obj of this.shelfGroup.children) {
      if (obj === shelfBoard) {
        continue;
      }
      const baseY = obj.position.y;
      gsap.fromTo(
        obj.position,
        { y: baseY - 1.8 },
        { y: baseY, duration: 0.85, delay: idx * 0.05, ease: 'power2.out' },
      );
      idx++;
    }

    const loop = (): void => {
      this.animationId = requestAnimationFrame(loop);
      if (this.shelfGroup && this.camera && this.renderer && this.scene) {
        this.shelfGroup.rotation.y = Math.sin(Date.now() * 0.00025) * 0.04;
        this.renderer.render(this.scene, this.camera);
      }
    };
    loop();
  }
}
