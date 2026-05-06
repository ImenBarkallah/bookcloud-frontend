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

@Component({
  selector: 'app-stats-banner',
  templateUrl: './stats-banner.component.html',
  styleUrls: ['./stats-banner.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatsBannerComponent implements AfterViewInit, OnDestroy {
  private readonly host = inject(ElementRef<HTMLElement>);
  private triggers: ScrollTrigger[] = [];

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
          gsap.to(obj, {
            val: end,
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
