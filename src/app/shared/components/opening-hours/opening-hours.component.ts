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
import {
  AmbientLight,
  Color,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Scene,
  SphereGeometry,
  WebGLRenderer,
} from 'three';
import { animate, inView, stagger } from '@motionone/dom';

import { LibraryBranchHours } from '../../../models/home-sections.models';
import { firestoreQuery$ } from '../../../core/services/firestore-observable';

@Component({
  selector: 'app-opening-hours',
  templateUrl: './opening-hours.component.html',
  styleUrls: ['./opening-hours.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OpeningHoursComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly cdr = inject(ChangeDetectorRef);

  /** Backend Firestore collection name used by SmartLibrary API */
  readonly branches$ = firestoreQuery$<LibraryBranchHours>('libraryBranches');

  branches: LibraryBranchHours[] = [];
  selectedId = '';

  private rafId?: number;
  private renderer?: WebGLRenderer;

  ngOnInit(): void {
    this.branches$.subscribe((list) => {
      this.branches = list;
      if (!this.selectedId && list.length) {
        this.selectedId = list[0].id;
      }
      this.cdr.markForCheck();
      setTimeout(() => this.tryGlobe(), 0);
    });
  }

  private tryGlobe(): void {
    if (this.renderer) {
      return;
    }
    const mobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;
    if (mobile || !this.branches.length) {
      return;
    }
    this.initGlobe();
  }

  selected(): LibraryBranchHours | null {
    return this.branches.find((b) => b.id === this.selectedId) ?? this.branches[0] ?? null;
  }

  selectTab(id: string): void {
    this.selectedId = id;
    this.cdr.markForCheck();
  }

  weekdays(): { day: string; hours: string }[] {
    const b = this.selected();
    const raw = b?.openingHours ?? '';
    if (!raw.trim()) {
      return [
        { day: 'Mon–Sun', hours: '—' },
      ];
    }
    const lines = raw
      .split(/\n+/)
      .map((l: string) => l.trim())
      .filter(Boolean);
    if (lines.length >= 3) {
      return lines.map((line: string) => {
        const m = line.match(/^([^:]+):\s*(.+)$/);
        return m ? { day: m[1].trim(), hours: m[2].trim() } : { day: '', hours: line };
      });
    }
    return [{ day: 'Hours', hours: raw }];
  }

  todayLine(): number {
    const d = new Date().getDay();
    const idx = d === 0 ? 6 : d - 1;
    return Math.min(idx, Math.max(0, this.weekdays().length - 1));
  }

  ngAfterViewInit(): void {
    const section = this.host.nativeElement;
    inView(
      section,
      () => {
        const rows = section.querySelectorAll('.hours-table tr');
        if (rows.length) {
          animate(
            Array.from(rows) as HTMLElement[],
            { opacity: [0, 1], transform: ['translateX(-20px)', 'none'] },
            { delay: stagger(0.06), duration: 0.45 },
          );
        }
        const card = section.querySelector('.branch-info-card');
        if (card) {
          animate(card as HTMLElement, { opacity: [0, 1], transform: ['translateY(30px)', 'none'] }, { duration: 0.6 });
        }
      },
      { margin: '-100px 0px -100px 0px' },
    );

    const dot = this.host.nativeElement.querySelector('.open-dot');
    if (dot) {
      animate(
        dot as HTMLElement,
        { transform: ['scale(1)', 'scale(1.5)', 'scale(1)'], opacity: [1, 0.5, 1] },
        { duration: 1.5, repeat: Infinity, easing: 'ease-in-out' },
      );
    }
  }

  private initGlobe(): void {
    const canvas = this.host.nativeElement.querySelector('.mini-globe') as HTMLCanvasElement | null;
    const b = this.selected();
    if (!canvas) {
      return;
    }
    const w = canvas.clientWidth || 400;
    const h = 200;
    const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setSize(w, h);
    this.renderer = renderer;
    const world = new Scene();
    const cam = new PerspectiveCamera(45, w / h, 0.1, 100);
    cam.position.z = 3.2;
    world.add(new AmbientLight(0xffffff, 0.85));
    const sphere = new Mesh(
      new SphereGeometry(1, 48, 48),
      new MeshBasicMaterial({ color: new Color(0x1a1030) }),
    );
    world.add(sphere);
    const marker = new Mesh(
      new SphereGeometry(0.06, 16, 16),
      new MeshBasicMaterial({ color: new Color(0x00d4ff) }),
    );
    const lat = b?.coordinates?.lat ?? 36.8;
    const lng = b?.coordinates?.lng ?? 10.18;
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lng + 180) * (Math.PI / 180);
    const r = 1.05;
    marker.position.set(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.cos(phi),
      r * Math.sin(phi) * Math.sin(theta),
    );
    world.add(marker);

    const loop = (t: number) => {
      this.rafId = requestAnimationFrame(loop);
      world.rotation.y = t * 0.0003;
      renderer.render(world, cam);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  ngOnDestroy(): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
    this.renderer?.dispose();
  }

  mapsUrl(addr: string | null | undefined): string {
    const safe = (addr ?? '').trim();
    return `https://maps.google.com/?q=${encodeURIComponent(safe || 'library')}`;
  }
}
