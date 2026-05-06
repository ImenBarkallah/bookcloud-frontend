import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
} from '@angular/core';
import Lenis from '@studio-freight/lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent implements AfterViewInit, OnDestroy {
  private lenis?: Lenis;

  private readonly tickerRaf = (time: number) => {
    this.lenis?.raf(time * 1000);
  };

  ngAfterViewInit(): void {
    /** Native wheel scroll — avoids "preventDefault inside passive listener" with Zone.js + Lenis. */
    this.lenis = new Lenis({
      duration: 1.4,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: false,
      syncTouch: false,
    });
    this.lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(this.tickerRaf);
    gsap.ticker.lagSmoothing(0);
  }

  ngOnDestroy(): void {
    gsap.ticker.remove(this.tickerRaf);
    this.lenis?.destroy();
  }
}
