import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import { Subscription } from 'rxjs';
import gsap from 'gsap';
import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Points,
  PointsMaterial,
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
} from 'three';
import { animate, stagger } from '@motionone/dom';

import { Partner } from '../../../models/home-sections.models';
import { PartnerPublicApiService } from '../../../core/services/partner-public-api.service';
import { environment } from '../../../../environments/environment';
import { loadSplitting } from '../../utils/load-splitting';

/** Horizontal scroll speed for GSAP marquee (pixels per second). */
const MARQUEE_PX_PER_SEC = 46;

@Component({
  selector: 'app-partners-strip',
  templateUrl: './partners-strip.component.html',
  styleUrls: ['./partners-strip.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PartnersStripComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly partnersApi = inject(PartnerPublicApiService);

  /** Liste publique complète (backend déjà triée : tier puis nom). */
  partners: Partner[] = [];

  partnersLoaded = false;
  partnersLoadError = false;

  sectionEntered = false;

  private renderer?: WebGLRenderer;
  private rafId?: number;
  private sub?: Subscription;
  private intersectionObserver?: IntersectionObserver;
  private resizeObserver?: ResizeObserver;
  private resizeDebounce?: ReturnType<typeof setTimeout>;
  private readonly marqueeCleanups: Array<() => void> = [];

  ngOnInit(): void {
    this.sub = this.partnersApi.list().subscribe({
      next: (list) => {
        this.partnersLoadError = false;
        this.partnersLoaded = true;
        this.partners = list ?? [];
        this.cdr.markForCheck();
        setTimeout(() => {
          this.tryParticles();
          this.scheduleMarqueeInit();
        }, 0);
      },
      error: (err: unknown) => {
        this.partnersLoadError = true;
        this.partnersLoaded = true;
        this.partners = [];
        console.error('[PartnersStrip] GET /api/public/partners failed — is the backend running at', environment.apiBaseUrl, err);
        this.clearMarquees();
        this.cdr.markForCheck();
      },
    });
  }

  ngAfterViewInit(): void {
    const el = this.host.nativeElement;
    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            this.sectionEntered = true;
            this.cdr.markForCheck();
            this.intersectionObserver?.disconnect();
            this.intersectionObserver = undefined;
            break;
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -10% 0px' },
    );
    this.intersectionObserver.observe(el);

    void this.splitSubtitle();

    this.resizeObserver = new ResizeObserver(() => {
      clearTimeout(this.resizeDebounce);
      this.resizeDebounce = setTimeout(() => {
        this.scheduleMarqueeInit();
      }, 180);
    });
    this.resizeObserver.observe(el);

    setTimeout(() => this.scheduleMarqueeInit(), 0);
  }

  /** GSAP infinite ticker: duplicate groups + translate X with linear ease (package.json: gsap). */
  private scheduleMarqueeInit(): void {
    if (typeof window === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.clearMarquees();
      return;
    }
    requestAnimationFrame(() => {
      this.clearMarquees();
      this.initMarqueeTrack('[data-partners-marquee="main"]', MARQUEE_PX_PER_SEC);
    });
  }

  private initMarqueeTrack(selector: string, pxPerSec: number): void {
    const track = this.host.nativeElement.querySelector(selector) as HTMLElement | null;
    if (!track) {
      return;
    }
    const groups = track.querySelectorAll('.partners-marquee__group');
    if (groups.length < 2) {
      return;
    }
    const shift = (groups[1] as HTMLElement).offsetLeft;
    if (shift <= 0) {
      return;
    }

    gsap.killTweensOf(track);
    gsap.set(track, { x: 0 });

    const duration = Math.max(12, shift / pxPerSec);
    const tween = gsap.fromTo(
      track,
      { x: 0 },
      {
        x: -shift,
        duration,
        ease: 'none',
        repeat: -1,
      },
    );

    const viewport = track.closest('.partners-marquee__viewport');
    const onEnter = (): void => {
      tween.pause();
    };
    const onLeave = (): void => {
      tween.resume();
    };
    viewport?.addEventListener('mouseenter', onEnter);
    viewport?.addEventListener('mouseleave', onLeave);

    this.marqueeCleanups.push(() => {
      tween.kill();
      gsap.killTweensOf(track);
      viewport?.removeEventListener('mouseenter', onEnter);
      viewport?.removeEventListener('mouseleave', onLeave);
    });
  }

  private clearMarquees(): void {
    for (const fn of this.marqueeCleanups) {
      fn();
    }
    this.marqueeCleanups.length = 0;
  }

  logoSrc(p: Partner): string | null {
    const raw = (p?.logoUrl ?? '').trim();
    if (!raw) return null;
    if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('data:')) return raw;
    if (raw.startsWith('/')) return `${environment.apiBaseUrl}${raw}`;
    return raw;
  }

  private async splitSubtitle(): Promise<void> {
    const subEl = this.host.nativeElement.querySelector('.partners-sub-split');
    if (!subEl) {
      return;
    }
    try {
      const Splitting = await loadSplitting();
      Splitting({ target: subEl, by: 'words' });
      const words = subEl.querySelectorAll('.word');
      animate(
        Array.from(words) as HTMLElement[],
        { opacity: [0, 1], y: [10, 0] },
        { duration: 0.45, delay: stagger(0.06) },
      );
    } catch {
      /* optional */
    }
  }

  private tryParticles(): void {
    if (this.renderer || !this.partners.length) {
      return;
    }
    const canvas = this.host.nativeElement.querySelector('.particle-line-canvas') as HTMLCanvasElement | null;
    if (!canvas) {
      return;
    }
    const w = canvas.clientWidth || 800;
    const h = 24;
    const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setSize(w, h);
    this.renderer = renderer;
    const scene = new Scene();
    const camera = new PerspectiveCamera(50, w / h, 0.1, 50);
    camera.position.z = 8;

    const count = 40;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (i / count) * 16 - 8;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 0.3;
      positions[i * 3 + 2] = 0;
    }
    const geo = new BufferGeometry();
    geo.setAttribute('position', new Float32BufferAttribute(positions, 3));
    const mat = new PointsMaterial({
      size: 0.08,
      vertexColors: false,
      color: new Color(0x7b5ea7),
      transparent: true,
      opacity: 0.9,
    });
    const pts = new Points(geo, mat);
    scene.add(pts);

    const loop = () => {
      this.rafId = requestAnimationFrame(loop);
      const arr = geo.attributes['position'].array as Float32Array;
      for (let i = 0; i < count; i++) {
        arr[i * 3] += 0.02;
        if (arr[i * 3] > 8) {
          arr[i * 3] = -8;
        }
      }
      geo.attributes['position'].needsUpdate = true;
      renderer.render(scene, camera);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.intersectionObserver?.disconnect();
    this.resizeObserver?.disconnect();
    clearTimeout(this.resizeDebounce);
    this.clearMarquees();
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
    this.renderer?.dispose();
  }

  trackPartner(_i: number, p: Partner): string {
    return p.id;
  }
}
