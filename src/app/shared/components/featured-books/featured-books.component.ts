import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  ChangeDetectorRef,
  inject,
} from '@angular/core';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Subscription } from 'rxjs';

import { BookApiService } from '../../../core/services/book-api.service';
import { BookCatalogItem } from '../../../core/services/catalogue.models';

gsap.registerPlugin(ScrollTrigger);

@Component({
  selector: 'app-featured-books',
  templateUrl: './featured-books.component.html',
  styleUrls: ['./featured-books.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeaturedBooksComponent implements AfterViewInit, OnDestroy {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly bookApi = inject(BookApiService);
  private readonly cdr = inject(ChangeDetectorRef);
  private scrollTrigger?: ScrollTrigger;
  private introTween?: gsap.core.Tween | gsap.core.Timeline;
  private readonly sub = new Subscription();

  loading = true;
  books: BookCatalogItem[] = [];

  ngAfterViewInit(): void {
    this.sub.add(
      this.bookApi.getFeaturedBooks().subscribe({
        next: (rows) => {
          this.books = (rows ?? []).slice(0, 5);
          this.loading = false;
          this.cdr.markForCheck();
          queueMicrotask(() => this.runIntro());
        },
        error: () => {
          this.loading = false;
          this.books = [];
          this.cdr.markForCheck();
          queueMicrotask(() => this.runIntro());
        },
      }),
    );
  }

  private runIntro(): void {
    const heading = this.host.nativeElement.querySelector('.featured-heading');
    if (heading) {
      this.scrollTrigger = ScrollTrigger.create({
        trigger: heading,
        start: 'top 85%',
        once: true,
        onEnter: () => heading.classList.add('underline-visible'),
      });
    }

    const track = this.host.nativeElement.querySelector('.featured-track');
    const cards = this.host.nativeElement.querySelectorAll('.book-card') as NodeListOf<HTMLElement>;
    this.introTween = gsap.from(cards, {
      scrollTrigger: {
        trigger: track,
        start: 'top 88%',
        once: true,
      },
      x: 120,
      opacity: 0,
      stagger: 0.12,
      duration: 0.85,
      ease: 'power3.out',
    });
  }

  ngOnDestroy(): void {
    this.scrollTrigger?.kill();
    const st = this.introTween?.scrollTrigger;
    st?.kill();
    this.introTween?.kill();
    this.sub.unsubscribe();
  }

  starIndexes(): number[] {
    return [0, 1, 2, 3, 4];
  }

  ratingStars(avg: number): number {
    const n = Number(avg);
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(5, Math.round(n)));
  }

  available(b: BookCatalogItem): boolean {
    return (b.availableCopies ?? 0) > 0;
  }

  coverStyle(b: BookCatalogItem): Record<string, string> {
    const url = (b.coverUrl ?? '').trim();
    if (url) {
      return {
        backgroundImage: `linear-gradient(145deg, rgba(123,94,167,0.4), rgba(0,212,255,0.35)), url(${url})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      };
    }
    return { background: 'linear-gradient(145deg, #3d2a5c, #7b5ea7)' };
  }
}
