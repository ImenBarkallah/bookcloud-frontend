import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  inject,
} from '@angular/core';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import * as THREE from 'three';

@Component({
  selector: 'app-about-page',
  templateUrl: './about-page.component.html',
  styleUrls: ['./about-page.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AboutPageComponent implements AfterViewInit, OnDestroy {
  private readonly host = inject(ElementRef<HTMLElement>);

  @ViewChild('libraryCanvas') private readonly libraryCanvas?: ElementRef<HTMLCanvasElement>;

  private introTween?: gsap.core.Timeline;
  private threeRaf = 0;
  private threeRenderer?: THREE.WebGLRenderer;
  private resizeListener?: () => void;

  ngAfterViewInit(): void {
    gsap.registerPlugin(ScrollTrigger);
    this.initMotion();
    this.initThreeLibrary();
    this.initTilt();
  }

  ngOnDestroy(): void {
    this.introTween?.kill();
    ScrollTrigger.getAll().forEach((t) => t.kill());
    if (this.threeRaf) cancelAnimationFrame(this.threeRaf);
    if (this.resizeListener) window.removeEventListener('resize', this.resizeListener);
    this.threeRenderer?.dispose();
  }

  private initMotion(): void {
    const root = this.host.nativeElement;
    const hero = root.querySelector('.about-hero');
    const blocks = root.querySelectorAll('.about-block');
    const dev = root.querySelector('.about-dev');
    const feats = root.querySelectorAll('[data-feat]');
    const blobs = root.querySelectorAll('.blob');

    this.introTween = gsap.timeline({
      scrollTrigger: { trigger: root, start: 'top 80%', once: true },
    });
    if (hero) {
      this.introTween.fromTo(
        hero,
        { opacity: 0, y: 22, filter: 'blur(6px)' },
        { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.7, ease: 'power2.out' },
      );
    }
    if (blocks.length) {
      this.introTween.fromTo(
        blocks,
        { opacity: 0, y: 18 },
        { opacity: 1, y: 0, duration: 0.45, stagger: 0.08, ease: 'power2.out' },
        hero ? '-=0.25' : 0,
      );
    }
    if (feats.length) {
      this.introTween.fromTo(
        feats,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.35, stagger: 0.05, ease: 'power2.out' },
        '-=0.2',
      );
    }
    if (dev) {
      this.introTween.fromTo(
        dev,
        { opacity: 0, y: 18 },
        { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out' },
        '-=0.2',
      );
    }

    // Floating blobs (ambient motion)
    if (blobs.length) {
      gsap.to(blobs, {
        y: (i) => (i % 2 === 0 ? -18 : 14),
        x: (i) => (i % 2 === 0 ? 12 : -10),
        duration: 5.5,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
        stagger: 0.2,
      });
    }

    // Parallax visual frame on scroll
    const visual = root.querySelector('.visual-frame');
    if (visual) {
      gsap.to(visual, {
        y: -18,
        scrollTrigger: { trigger: visual, start: 'top 85%', end: 'bottom 20%', scrub: true },
      });
    }
  }

  private initTilt(): void {
    const root = this.host.nativeElement;
    const cards = Array.from(root.querySelectorAll('[data-tilt]')) as HTMLElement[];
    cards.forEach((el: HTMLElement) => {
      const onMove = (ev: PointerEvent): void => {
        const r = el.getBoundingClientRect();
        const px = (ev.clientX - r.left) / Math.max(1, r.width);
        const py = (ev.clientY - r.top) / Math.max(1, r.height);
        const rx = (0.5 - py) * 6;
        const ry = (px - 0.5) * 8;
        gsap.to(el, {
          rotateX: rx,
          rotateY: ry,
          transformPerspective: 900,
          transformOrigin: 'center',
          duration: 0.25,
          ease: 'power2.out',
        });
      };
      const onLeave = (): void => {
        gsap.to(el, { rotateX: 0, rotateY: 0, duration: 0.35, ease: 'power2.out' });
      };
      el.addEventListener('pointermove', onMove);
      el.addEventListener('pointerleave', onLeave);
    });
  }

  private initThreeLibrary(): void {
    const canvas = this.libraryCanvas?.nativeElement;
    if (!canvas) return;
    const reduce =
      typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 50);
    camera.position.set(0, 1.1, 5.4);
    camera.lookAt(0, 0.2, 0);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'low-power',
    });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.threeRenderer = renderer;

    const group = new THREE.Group();
    scene.add(group);

    // "Library shelves" blocks
    const shelfGeo = new THREE.BoxGeometry(1.8, 0.16, 0.18);
    const shelfMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#00D4FF'),
      transparent: true,
      opacity: 0.28,
      wireframe: true,
    });
    for (let i = 0; i < 4; i++) {
      const shelf = new THREE.Mesh(shelfGeo, shelfMat);
      shelf.position.set(0, -0.3 + i * 0.35, 0);
      group.add(shelf);
    }

    // "Books" as thin boxes with accent colors
    const bookGeo = new THREE.BoxGeometry(0.08, 0.22, 0.14);
    const cols = ['#7B5EA7', '#00D4FF', '#9B7EC8', '#38BDF8', '#A78BFA'];
    for (let i = 0; i < 22; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(cols[i % cols.length]),
        transparent: true,
        opacity: 0.55,
      });
      const b = new THREE.Mesh(bookGeo, mat);
      b.position.x = -0.78 + i * 0.075;
      b.position.y = -0.18 + (i % 4) * 0.35;
      b.position.z = 0.03 + (i % 3) * 0.03;
      b.rotation.z = (i % 7 === 0 ? 1 : 0) * 0.1;
      group.add(b);
    }

    // Particles / stars (subtle depth)
    const pts = new THREE.BufferGeometry();
    const count = 180;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3 + 0] = (Math.random() - 0.5) * 5;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 4;
      pos[i * 3 + 2] = -1.5 - Math.random() * 3.2;
    }
    pts.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const ptsMat = new THREE.PointsMaterial({
      size: 0.03,
      color: new THREE.Color('#7B5EA7'),
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
    });
    const stars = new THREE.Points(pts, ptsMat);
    scene.add(stars);

    const size = (): void => {
      const w = canvas.clientWidth || 360;
      const h = canvas.clientHeight || 360;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    size();
    this.resizeListener = () => size();
    window.addEventListener('resize', this.resizeListener, { passive: true });

    const loop = (t: number): void => {
      this.threeRaf = requestAnimationFrame(loop);
      const time = t * 0.001;
      group.rotation.y = Math.sin(time * 0.65) * 0.22;
      group.rotation.x = Math.cos(time * 0.5) * 0.08;
      stars.rotation.y = -time * 0.08;
      renderer.render(scene, camera);
    };
    this.threeRaf = requestAnimationFrame(loop);
  }
}
