import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { PublicHomeStatsService } from '../../services/public-home-stats.service';

gsap.registerPlugin(ScrollTrigger);

@Component({
  selector: 'app-stats-banner',
  templateUrl: './stats-banner.component.html',
  styleUrls: ['./stats-banner.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatsBannerComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly api = inject(PublicHomeStatsService);
  private triggers: ScrollTrigger[] = [];

  stats = { books: 0, members: 0 };

  ngOnInit(): void {
    this.api.getHomeStats().subscribe({
      next: (s) => {
        this.stats = { books: Number(s?.books ?? 0), members: Number(s?.members ?? 0) };
      },
      error: () => {},
    });
  }

  ngAfterViewInit(): void {
    const root = this.host.nativeElement;
    const items = root.querySelectorAll('.stat-value') as NodeListOf<HTMLElement>;

    items.forEach((el: HTMLElement) => {
      const end = Number(el.dataset['countEnd'] ?? 0);
      const obj = { val: 0 };
      const st = ScrollTrigger.create({
        trigger: el,
        start: 'top 88%',
        once: true,
        onEnter: () => {
          // If the dataset value is updated later (async stats), re-read it at animation start.
          const target = Number(el.dataset['countEnd'] ?? end);
          gsap.to(obj, {
            val: target,
            duration: 2.2,
            ease: 'power2.out',
            onUpdate: () => {
              const v = Math.round(obj.val);
              const suffix = el.dataset['suffix'] ?? '';
              el.textContent = v.toLocaleString() + suffix;
            },
          });
        },
      });
      this.triggers.push(st);
    });
  }

  ngOnDestroy(): void {
    this.triggers.forEach((t) => t.kill());
  }
}
