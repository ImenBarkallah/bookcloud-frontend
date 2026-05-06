import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  NgZone,
  OnDestroy,
  ViewChild,
  inject,
} from '@angular/core';
import gsap from 'gsap';
import {
  AmbientLight,
  BoxGeometry,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  PointLight,
  Points,
  PointsMaterial,
  Scene,
  WebGLRenderer,
} from 'three';

@Component({
  selector: 'app-hero-three',
  templateUrl: './hero-three.component.html',
  styleUrls: ['./hero-three.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeroThreeComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvasHost', { static: true }) canvasHost!: ElementRef<HTMLDivElement>;

  private readonly zone = inject(NgZone);
  private renderer?: WebGLRenderer;
  private scene?: Scene;
  private camera?: PerspectiveCamera;
  private animationId = 0;
  private pageGeometry?: PlaneGeometry;
  private pageMesh?: Mesh;
  private leftCover?: Mesh;
  private rightCover?: Mesh;
  private particles?: Points;
  private particleVel = new Float32Array();
  private introTimeline?: gsap.core.Timeline;
  private heroTweens: gsap.core.Tween[] = [];
  private targetCam = { x: 0, y: 0 };
  useThree = typeof window !== 'undefined' && window.innerWidth >= 768;

  ngAfterViewInit(): void {
    this.matchMedia();
    if (this.useThree) {
      this.zone.runOutsideAngular(() => this.initThree());
    }
    this.zone.runOutsideAngular(() => this.initGsapIntro());
    this.zone.runOutsideAngular(() => this.initButtonMicroAnimations());
  }

  private matchMedia(): void {
    this.useThree = typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches;
  }

  private initThree(): void {
    const host = this.canvasHost.nativeElement;
    const w = host.clientWidth || window.innerWidth;
    const h = host.clientHeight || window.innerHeight;

    this.scene = new Scene();
    this.scene.background = new Color(0x0a0a0f);

    this.camera = new PerspectiveCamera(45, w / h, 0.1, 100);
    this.camera.position.set(0, 0.5, 6);

    this.renderer = new WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(w, h);
    host.appendChild(this.renderer.domElement);

    const ambient = new AmbientLight(0xffffff, 0.35);
    this.scene.add(ambient);
    const purple = new PointLight(0x7b5ea7, 2.2, 24);
    purple.position.set(2, 3, 4);
    this.scene.add(purple);
    const cyan = new PointLight(0x00d4ff, 0.8, 20);
    cyan.position.set(-3, 1, 2);
    this.scene.add(cyan);

    const coverMat = new MeshStandardMaterial({ color: 0x2a1f3d, metalness: 0.3, roughness: 0.5 });
    const pageMat = new MeshStandardMaterial({ color: 0xe8e4f2, metalness: 0.05, roughness: 0.9 });

    this.leftCover = new Mesh(new BoxGeometry(0.25, 2.6, 1.8), coverMat);
    this.leftCover.position.set(-0.75, 0, 0);
    this.scene.add(this.leftCover);

    this.rightCover = new Mesh(new BoxGeometry(0.25, 2.6, 1.8), coverMat);
    this.rightCover.position.set(0.75, 0, 0);
    this.scene.add(this.rightCover);

    this.pageGeometry = new PlaneGeometry(1.4, 2.4, 48, 48);
    this.pageMesh = new Mesh(this.pageGeometry, pageMat);
    this.pageMesh.rotation.y = Math.PI / 2;
    this.scene.add(this.pageMesh);

    const particlePositions = new Float32Array(200 * 3);
    this.particleVel = new Float32Array(200 * 3);
    for (let i = 0; i < 200; i++) {
      particlePositions[i * 3] = (Math.random() - 0.5) * 14;
      particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 10;
      particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 8;
      this.particleVel[i * 3 + 1] = 0.008 + Math.random() * 0.012;
    }
    const pGeo = new BufferGeometry();
    pGeo.setAttribute('position', new Float32BufferAttribute(particlePositions, 3));

    this.particles = new Points(
      pGeo,
      new PointsMaterial({
        color: 0x7b5ea7,
        size: 0.07,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      }),
    );
    this.scene.add(this.particles);

    let t = 0;

    const animate = () => {
      this.animationId = requestAnimationFrame(animate);
      t += 0.016;

      if (this.pageGeometry) {
        const pos = this.pageGeometry.attributes['position'];
        const arr = pos.array as Float32Array;
        for (let i = 0; i < pos.count; i++) {
          const x = arr[i * 3];
          const y = arr[i * 3 + 1];
          arr[i * 3 + 2] = Math.sin(x * 3 + t * 1.4) * 0.08 + Math.sin(y * 2 + t) * 0.05;
        }
        pos.needsUpdate = true;
      }

      if (this.particles) {
        const posAttr = this.particles.geometry.attributes['position'];
        const arr = posAttr.array as Float32Array;
        for (let i = 0; i < 200; i++) {
          arr[i * 3 + 1] += this.particleVel[i * 3 + 1];
          if (arr[i * 3 + 1] > 6) {
            arr[i * 3 + 1] = -5;
          }
        }
        posAttr.needsUpdate = true;
      }

      if (this.camera) {
        this.camera.position.x += (this.targetCam.x - this.camera.position.x) * 0.04;
        this.camera.position.y += (this.targetCam.y - this.camera.position.y) * 0.04;
        this.camera.lookAt(0, 0, 0);
      }

      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }
    };

    animate();
  }

  @HostListener('window:mousemove', ['$event'])
  onMouseMove(ev: MouseEvent): void {
    if (!this.useThree || !this.camera) {
      return;
    }
    const nx = (ev.clientX / window.innerWidth) * 2 - 1;
    const ny = -(ev.clientY / window.innerHeight) * 2 + 1;
    this.targetCam.x = nx * 0.35;
    this.targetCam.y = ny * 0.2;
  }

  @HostListener('window:resize')
  onResize(): void {
    if (!this.renderer || !this.camera || !this.canvasHost) {
      return;
    }
    const host = this.canvasHost.nativeElement;
    const w = host.clientWidth;
    const h = host.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  private initGsapIntro(): void {
    this.introTimeline = gsap.timeline({ defaults: { ease: 'power3.out' } });
    this.introTimeline.from('.hero-badge', { y: 28, opacity: 0, duration: 0.8 }, 0);
    this.introTimeline.from('.hero-title-line', { y: 36, opacity: 0, duration: 0.8, stagger: 0.12 }, 0.15);
    this.introTimeline.from('.hero-sub', { y: 24, opacity: 0, duration: 0.8 }, 0.35);
    this.introTimeline.from('.hero-cta-group > *', { y: 28, opacity: 0, duration: 0.75, stagger: 0.12 }, 0.5);
  }

  private initButtonMicroAnimations(): void {
    const explore = document.querySelector('.btn-solid');
    const ghost = document.querySelector('.btn-ghost');
    if (explore) {
      const tw = gsap.to(explore, { scale: 1.05, paused: true, duration: 0.25, ease: 'power2.out' });
      explore.addEventListener('mouseenter', () => tw.play());
      explore.addEventListener('mouseleave', () => tw.reverse());
      this.heroTweens.push(tw);
    }
    if (ghost) {
      const tw = gsap.to(ghost, {
        boxShadow: '0 0 32px rgba(123, 94, 167, 0.45)',
        borderColor: 'rgba(0, 212, 255, 0.55)',
        backgroundColor: 'rgba(123, 94, 167, 0.25)',
        paused: true,
        duration: 0.4,
        ease: 'power2.out',
      });
      ghost.addEventListener('mouseenter', () => tw.play());
      ghost.addEventListener('mouseleave', () => tw.reverse());
      this.heroTweens.push(tw);
    }
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.animationId);
    this.introTimeline?.kill();
    this.heroTweens.forEach((t) => t.kill());
    if (this.renderer) {
      this.renderer.dispose();
      const lose = this.renderer
        .getContext()
        .getExtension('WEBGL_lose_context') as { loseContext: () => void } | null;
      lose?.loseContext();
    }
    this.pageGeometry?.dispose();
    this.leftCover?.geometry.dispose();
    (this.leftCover?.material as MeshStandardMaterial)?.dispose?.();
    this.rightCover?.geometry.dispose();
    (this.rightCover?.material as MeshStandardMaterial)?.dispose?.();
    this.pageMesh?.geometry.dispose();
    (this.pageMesh?.material as MeshStandardMaterial)?.dispose?.();
    this.particles?.geometry.dispose();
    (this.particles?.material as PointsMaterial)?.dispose?.();
  }
}
