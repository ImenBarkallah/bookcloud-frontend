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
import { BufferGeometry, Float32BufferAttribute, LineBasicMaterial, LineSegments, Points, PointsMaterial, Scene, PerspectiveCamera, WebGLRenderer, AmbientLight } from 'three';
import { animate, inView, stagger } from '@motionone/dom';

import { Testimonial } from '../../../models/home-sections.models';
import { loadSplitting } from '../../utils/load-splitting';
import { firestoreQuery$ } from '../../../core/services/firestore-observable';

@Component({
  selector: 'app-testimonials',
  templateUrl: './testimonials.component.html',
  styleUrls: ['./testimonials.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TestimonialsComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly cdr = inject(ChangeDetectorRef);

  @ViewChild('thumbViewport') thumbViewport?: ElementRef<HTMLElement>;

  readonly testimonials$ = firestoreQuery$<Testimonial>('testimonials');

  /** Deux copies des cartes pour le défilement infini sans couture. */
  readonly thumbDupCycles = [0, 1] as const;

  allItems: Testimonial[] = [];
  /** Témoignage affiché dans la grande carte (choix utilisateur ou premier / featured). */
  selectedId: string | null = null;

  private starTw?: gsap.core.Tween;
  private rafId?: number;
  private renderer?: WebGLRenderer;
  private scene?: Scene;
  /** Timeline GSAP : défilement horizontal en boucle (pas d’arrêt au survol). */
  private thumbMarquee?: gsap.core.Timeline;

  ngOnInit(): void {
    this.testimonials$.subscribe((list) => {
      const base = list.length ? list : this.fallback();
      this.allItems = base;
      const stillHere = base.some((t) => t.id === this.selectedId);
      if (!stillHere) {
        const feat = base.find((t) => t.featured);
        this.selectedId = feat?.id ?? base[0]?.id ?? null;
      }
      this.cdr.markForCheck();
      queueMicrotask(() => this.refreshThumbMarquee());
    });
  }

  ngAfterViewInit(): void {
    const mobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;

    const root = this.host.nativeElement;
    inView(
      root,
      () => {
        animate(
          root.querySelector('.testimonial-header') as HTMLElement,
          { opacity: [0, 1], transform: ['translateY(30px)', 'none'] },
          { duration: 0.7 },
        );
        const feat = root.querySelector('.featured-testimonial') as HTMLElement | null;
        if (feat) {
          animate(feat, { opacity: [0, 1], transform: ['scale(0.95)', 'scale(1)'] }, { duration: 0.6, delay: 0.3 });
        }
        const stars = root.querySelectorAll('.featured-stars .star');
        if (stars.length) {
          this.starTw = gsap.fromTo(
            stars,
            { scale: 0 },
            { scale: 1, duration: 0.35, stagger: 0.1, ease: 'back.out(1.7)' },
          );
        }
      },
      { margin: '-100px 0px -100px 0px' },
    );

    if (!mobile) {
      this.initStarsCanvas();
    }

    const flair = root.querySelector('.quote-flair');
    if (flair) {
      gsap.to(flair, { y: '+=5', duration: 1.6, yoyo: true, repeat: -1, ease: 'sine.inOut' });
    }

    void this.runSplittingSubtitle();
    queueMicrotask(() => this.refreshThumbMarquee());
  }

  private async runSplittingSubtitle(): Promise<void> {
    const el = this.host.nativeElement.querySelector('.testimonials-sub-split');
    if (!el) {
      return;
    }
    try {
      const Splitting = await loadSplitting();
      Splitting({ target: el, by: 'words' });
      const words = el.querySelectorAll('.word');
      animate(
        Array.from(words) as HTMLElement[],
        { opacity: [0, 1], transform: ['translateY(12px)', 'none'] },
        { duration: 0.45, delay: stagger(0.08) },
      );
    } catch {
      /* optional */
    }
  }

  private initStarsCanvas(): void {
    const canvas = this.host.nativeElement.querySelector('.stars-canvas') as HTMLCanvasElement | null;
    if (!canvas) {
      return;
    }
    const w = canvas.clientWidth || 600;
    const h = 120;
    const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setSize(w, h);
    this.renderer = renderer;
    const scene = new Scene();
    this.scene = scene;
    const camera = new PerspectiveCamera(50, w / h, 0.1, 100);
    camera.position.z = 8;
    scene.add(new AmbientLight(0xffffff, 0.9));

    const count = 80;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 14;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 4;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 4;
    }
    const geo = new BufferGeometry();
    geo.setAttribute('position', new Float32BufferAttribute(positions, 3));
    const pts = new Points(geo, new PointsMaterial({ color: 0xffffff, size: 0.05, transparent: true, opacity: 0.85 }));
    scene.add(pts);

    const lineGeo = new BufferGeometry();
    const linePos: number[] = [];
    for (let i = 0; i < count; i += 6) {
      linePos.push(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
      linePos.push(positions[(i + 1) * 3], positions[(i + 1) * 3 + 1], positions[(i + 1) * 3 + 2]);
    }
    lineGeo.setAttribute('position', new Float32BufferAttribute(new Float32Array(linePos), 3));
    const lines = new LineSegments(lineGeo, new LineBasicMaterial({ color: 0x7b5ea7, transparent: true, opacity: 0.22 }));
    scene.add(lines);

    const loop = (t: number) => {
      this.rafId = requestAnimationFrame(loop);
      const time = t * 0.001;
      pts.rotation.y = time * 0.08;
      lines.rotation.y = time * 0.08;
      renderer.render(scene, camera);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  ngOnDestroy(): void {
    this.starTw?.kill();
    this.thumbMarquee?.kill();
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
    this.renderer?.dispose();
  }

  /** Défilement infini GSAP : bande dupliquée, boucle sans pause ni hover stop. */
  private refreshThumbMarquee(): void {
    this.thumbMarquee?.kill();
    this.thumbMarquee = undefined;
    const el = this.thumbViewport?.nativeElement;
    if (!el || this.allItems.length < 2) {
      return;
    }
    requestAnimationFrame(() => {
      const loopLen = el.scrollWidth / 2;
      const maxScroll = el.scrollWidth - el.clientWidth;
      if (loopLen < 16 || maxScroll < 16) {
        return;
      }
      let start = el.scrollLeft % loopLen;
      if (!Number.isFinite(start)) {
        start = 0;
      }
      gsap.set(el, { scrollLeft: start });
      const end = start + loopLen;
      if (end > maxScroll + 1) {
        return;
      }
      const pxPerSec = 28;
      const dur = Math.max(14, loopLen / pxPerSec);
      this.thumbMarquee = gsap
        .timeline({ repeat: -1 })
        .to(el, { scrollLeft: end, duration: dur, ease: 'none' })
        .set(el, { scrollLeft: start });
    });
  }

  /** Flèches ‹ › : défilement animé (GSAP), puis relance du marquee. */
  thumbNav(dir: -1 | 1): void {
    const el = this.thumbViewport?.nativeElement;
    if (!el || this.allItems.length < 2) {
      return;
    }
    this.thumbMarquee?.kill();
    this.thumbMarquee = undefined;
    const track = el.querySelector('.thumbs-track') as HTMLElement | null;
    const gapRaw = track ? getComputedStyle(track).gap : '16px';
    const gap = parseFloat(gapRaw) || 16;
    const first = el.querySelector('.thumb-card') as HTMLElement | null;
    const step = (first?.offsetWidth ?? 260) + gap;
    const loopLen = el.scrollWidth / 2;
    const raw = el.scrollLeft + dir * step;
    const next = ((raw % loopLen) + loopLen) % loopLen;
    gsap.to(el, {
      scrollLeft: next,
      duration: 0.55,
      ease: 'power2.out',
      onComplete: () => this.refreshThumbMarquee(),
    });
  }

  fallback(): Testimonial[] {
    return [
      {
        id: 'x1',
        name: 'Alex M.',
        role: 'Student',
        quote: 'Borrowing takes seconds — love the interface.',
        rating: 5,
        featured: true,
      },
      {
        id: 'x2',
        name: 'Samira K.',
        role: 'Researcher',
        quote: 'The catalogue search is fast and the reservation flow is crystal clear.',
        rating: 5,
      },
      {
        id: 'x3',
        name: 'Jordan L.',
        role: 'Teacher',
        quote: 'Finally a library app that feels modern — dark mode and QR checkout are great.',
        rating: 4,
      },
      {
        id: 'x4',
        name: 'Marco V.',
        role: 'Parent',
        quote: 'My kids pick books from home; we pick them up on Saturday without hassle.',
        rating: 5,
      },
    ];
  }

  activeTestimonial(): Testimonial | null {
    if (!this.allItems.length) {
      return null;
    }
    return this.allItems.find((t) => t.id === this.selectedId) ?? this.allItems[0];
  }

  selectTestimonial(t: Testimonial): void {
    if (this.selectedId === t.id) {
      return;
    }
    this.selectedId = t.id;
    this.cdr.markForCheck();
    queueMicrotask(() => this.animateFeaturedSwap());
  }

  private animateFeaturedSwap(): void {
    const root = this.host.nativeElement;
    const block = root.querySelector('.featured-testimonial') as HTMLElement | null;
    if (!block) {
      return;
    }
    gsap.fromTo(block, { opacity: 0.45, y: 8 }, { opacity: 1, y: 0, duration: 0.38, ease: 'power2.out' });
    const stars = root.querySelectorAll('.featured-stars .star');
    if (stars.length) {
      gsap.fromTo(stars, { scale: 0.5 }, { scale: 1, duration: 0.28, stagger: 0.06, ease: 'back.out(1.5)' });
    }
  }

  starIndexes(): number[] {
    return [0, 1, 2, 3, 4];
  }

  ratingFill(n: number, i: number): boolean {
    return i < Math.round(n);
  }
}
