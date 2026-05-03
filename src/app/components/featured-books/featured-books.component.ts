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

interface FeaturedBook {
  titleKey: string;
  authorKey: string;
  categoryKey: string;
  rating: number;
  available: boolean;
  gradient: string;
}

@Component({
  selector: 'app-featured-books',
  templateUrl: './featured-books.component.html',
  styleUrls: ['./featured-books.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeaturedBooksComponent implements AfterViewInit, OnDestroy {
  private readonly host = inject(ElementRef<HTMLElement>);
  private scrollTrigger?: ScrollTrigger;
  private introTween?: gsap.core.Tween | gsap.core.Timeline;

  readonly books: FeaturedBook[] = [
    {
      titleKey: 'FEATURED.B1_TITLE',
      authorKey: 'FEATURED.B1_AUTHOR',
      categoryKey: 'FEATURED.CAT_FICTION',
      rating: 5,
      available: true,
      gradient: 'linear-gradient(145deg, #3d2a5c, #7b5ea7)',
    },
    {
      titleKey: 'FEATURED.B2_TITLE',
      authorKey: 'FEATURED.B2_AUTHOR',
      categoryKey: 'FEATURED.CAT_SCIFI',
      rating: 4,
      available: true,
      gradient: 'linear-gradient(145deg, #0d3d4d, #00d4ff)',
    },
    {
      titleKey: 'FEATURED.B3_TITLE',
      authorKey: 'FEATURED.B3_AUTHOR',
      categoryKey: 'FEATURED.CAT_HISTORY',
      rating: 5,
      available: false,
      gradient: 'linear-gradient(145deg, #4a3518, #c9a227)',
    },
    {
      titleKey: 'FEATURED.B4_TITLE',
      authorKey: 'FEATURED.B4_AUTHOR',
      categoryKey: 'FEATURED.CAT_BIO',
      rating: 4,
      available: true,
      gradient: 'linear-gradient(145deg, #2d1f3d, #e05297)',
    },
  ];

  ngAfterViewInit(): void {
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
  }

  starIndexes(): number[] {
    return [0, 1, 2, 3, 4];
  }
}
