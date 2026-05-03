import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  inject,
} from '@angular/core';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface CategoryCard {
  nameKey: string;
  count: number;
  gradient: string;
  icon: 'science' | 'fiction' | 'history' | 'art' | 'tech' | 'children';
}

@Component({
  selector: 'app-categories-grid',
  templateUrl: './categories-grid.component.html',
  styleUrls: ['./categories-grid.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoriesGridComponent implements AfterViewInit, OnDestroy {
  private readonly host = inject(ElementRef<HTMLElement>);
  private scrollTween?: gsap.core.Tween | gsap.core.Timeline;
  private tilts: Array<{ kill: () => void }> = [];

  readonly categories: CategoryCard[] = [
    {
      nameKey: 'CATEGORIES.SCIENCE',
      count: 1820,
      gradient: 'linear-gradient(145deg, #1e3a8a, #38bdf8)',
      icon: 'science',
    },
    {
      nameKey: 'CATEGORIES.FICTION',
      count: 4100,
      gradient: 'linear-gradient(145deg, #4c1d95, #a855f7)',
      icon: 'fiction',
    },
    {
      nameKey: 'CATEGORIES.HISTORY',
      count: 960,
      gradient: 'linear-gradient(145deg, #92400e, #fbbf24)',
      icon: 'history',
    },
    {
      nameKey: 'CATEGORIES.ART',
      count: 740,
      gradient: 'linear-gradient(145deg, #9d174d, #fb7185)',
      icon: 'art',
    },
    {
      nameKey: 'CATEGORIES.TECH',
      count: 1320,
      gradient: 'linear-gradient(145deg, #0e7490, #22d3ee)',
      icon: 'tech',
    },
    {
      nameKey: 'CATEGORIES.CHILDREN',
      count: 890,
      gradient: 'linear-gradient(145deg, #166534, #4ade80)',
      icon: 'children',
    },
  ];

  ngAfterViewInit(): void {
    const cards = this.host.nativeElement.querySelectorAll('.category-card') as NodeListOf<HTMLElement>;
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

  ngOnDestroy(): void {
    this.scrollTween?.scrollTrigger?.kill();
    this.scrollTween?.kill();
    this.tilts.forEach((t) => t.kill());
  }
}
