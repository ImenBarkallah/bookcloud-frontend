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
  selector: 'app-how-it-works',
  templateUrl: './how-it-works.component.html',
  styleUrls: ['./how-it-works.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HowItWorksComponent implements AfterViewInit, OnDestroy {
  private readonly host = inject(ElementRef<HTMLElement>);
  private triggers: ScrollTrigger[] = [];
  private stepTween?: gsap.core.Tween | gsap.core.Timeline;

  ngAfterViewInit(): void {
    const path = this.host.nativeElement.querySelector('.timeline-path') as SVGPathElement | null;
    if (path) {
      const len = path.getTotalLength();
      path.style.strokeDasharray = `${len}`;
      path.style.strokeDashoffset = `${len}`;
      const lineTrigger = ScrollTrigger.create({
        trigger: path.closest('.timeline-svg-wrap'),
        start: 'top 80%',
        once: true,
        onEnter: () => {
          gsap.to(path, {
            strokeDashoffset: 0,
            duration: 1.6,
            ease: 'power2.inOut',
          });
        },
      });
      this.triggers.push(lineTrigger);
    }

    const steps = this.host.nativeElement.querySelectorAll('.timeline-step') as NodeListOf<HTMLElement>;
    this.stepTween = gsap.from(steps, {
      scrollTrigger: {
        trigger: this.host.nativeElement.querySelector('.timeline-row'),
        start: 'top 82%',
        once: true,
      },
      x: -48,
      opacity: 0,
      stagger: 0.2,
      duration: 0.75,
      ease: 'power3.out',
    });
  }

  ngOnDestroy(): void {
    this.triggers.forEach((t) => t.kill());
    this.stepTween?.scrollTrigger?.kill();
    this.stepTween?.kill();
  }
}
