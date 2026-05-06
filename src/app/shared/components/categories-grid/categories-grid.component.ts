import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  OnDestroy,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { forkJoin } from 'rxjs';

import { resolvePublicUploadUrl } from '../../../core/utils/public-upload-url';
import { BooksCatalogApiService } from '../../../core/services/books-catalog-api.service';
import { BookListItem } from '../../../models/home-sections.models';

gsap.registerPlugin(ScrollTrigger);

type CategoryIcon = 'science' | 'fiction' | 'history' | 'art' | 'tech' | 'children';

export interface CategoryCardVm {
  id: string;
  name: string;
  count: number;
  gradient: string;
  icon: CategoryIcon;
  /** Photo Cloudinary / upload — sinon dégradé + icône */
  imageUrl?: string | null;
}

const GRADIENTS: string[] = [
  'linear-gradient(145deg, #1e3a8a, #38bdf8)',
  'linear-gradient(145deg, #4c1d95, #a855f7)',
  'linear-gradient(145deg, #92400e, #fbbf24)',
  'linear-gradient(145deg, #9d174d, #fb7185)',
  'linear-gradient(145deg, #0e7490, #22d3ee)',
  'linear-gradient(145deg, #166534, #4ade80)',
];

const ICONS: CategoryIcon[] = ['science', 'fiction', 'history', 'art', 'tech', 'children'];

@Component({
  selector: 'app-categories-grid',
  templateUrl: './categories-grid.component.html',
  styleUrls: ['./categories-grid.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoriesGridComponent implements OnDestroy {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly api = inject(BooksCatalogApiService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  cards: CategoryCardVm[] = [];
  loading = true;

  private scrollTween?: gsap.core.Tween | gsap.core.Timeline;
  private tilts: Array<{ kill: () => void }> = [];

  constructor() {
    forkJoin({
      categories: this.api.listCategories(),
      books: this.api.listBooks(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ categories, books }) => {
        const counts = this.countByCategory(books);
        this.cards = [...categories]
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((c, i) => {
            const img = (c.imageUrl ?? '').trim();
            return {
              id: c.id,
              name: c.name,
              count: counts.get(c.id) ?? 0,
              gradient: GRADIENTS[i % GRADIENTS.length],
              icon: ICONS[i % ICONS.length],
              imageUrl: img || null,
            };
          });
        this.loading = false;
        this.cdr.markForCheck();
        this.cdr.detectChanges();
        /* Données async : attendre le paint Angular + layout (*ngFor) avant GSAP / ScrollTrigger */
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            this.setupMotion();
            ScrollTrigger.refresh();
          });
        });
      });
  }

  private countByCategory(books: BookListItem[]): Map<string, number> {
    const map = new Map<string, number>();
    for (const b of books) {
      const cid = b.categoryId;
      if (!cid) {
        continue;
      }
      map.set(cid, (map.get(cid) ?? 0) + 1);
    }
    return map;
  }

  private setupMotion(): void {
    this.teardownMotion();
    const cards = this.host.nativeElement.querySelectorAll('.category-card') as NodeListOf<HTMLElement>;
    if (!cards.length) {
      return;
    }

    this.scrollTween = gsap.from(cards, {
      scrollTrigger: {
        trigger: this.host.nativeElement,
        start: 'top 82%',
        once: true,
      },
      scale: 0.8,
      opacity: 0,
      stagger: 0.1,
      duration: 0.65,
      ease: 'back.out(1.2)',
    });

    cards.forEach((card: HTMLElement) => {
      const inner = card.querySelector('.category-inner') as HTMLElement | null;
      if (!inner) {
        return;
      }
      gsap.set(inner, { transformPerspective: 900 });
      const rx = gsap.quickTo(inner, 'rotationX', { duration: 0.5, ease: 'power3.out' });
      const ry = gsap.quickTo(inner, 'rotationY', { duration: 0.5, ease: 'power3.out' });
      const onMove = (e: MouseEvent) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        ry(px * -18);
        rx(py * 18);
      };
      const onLeave = () => {
        rx(0);
        ry(0);
      };
      card.addEventListener('mousemove', onMove);
      card.addEventListener('mouseleave', onLeave);
      this.tilts.push({
        kill: () => {
          card.removeEventListener('mousemove', onMove);
          card.removeEventListener('mouseleave', onLeave);
        },
      });
    });
  }

  private teardownMotion(): void {
    this.scrollTween?.scrollTrigger?.kill();
    this.scrollTween?.kill();
    this.scrollTween = undefined;
    this.tilts.forEach((t) => t.kill());
    this.tilts = [];
  }

  ngOnDestroy(): void {
    this.teardownMotion();
  }

  /** Fond carte : photo + overlay lisible, ou dégradé legacy. */
  cardBackground(c: CategoryCardVm): string {
    if (c.imageUrl) {
      const resolved = resolvePublicUploadUrl(c.imageUrl);
      if (!resolved) {
        return c.gradient;
      }
      const safe = resolved.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      return `linear-gradient(165deg, rgba(4, 10, 28, 0.92) 0%, rgba(4, 10, 28, 0.35) 42%, rgba(4, 10, 28, 0.2) 100%), url("${safe}")`;
    }
    return c.gradient;
  }
}
