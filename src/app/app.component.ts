import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';
import { NavigationCancel, NavigationEnd, NavigationStart, Router } from '@angular/router';
import gsap from 'gsap';
import { Subscription, filter } from 'rxjs';

import { BackendApiService } from './services/backend-api.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'bookcloud';

  @ViewChild('routeShell') routeShell?: ElementRef<HTMLElement>;

  private readonly backend = inject(BackendApiService);
  private readonly router = inject(Router);
  private routeAnim?: gsap.core.Tween;
  private readonly subs = new Subscription();
  private initialNavigation = true;

  ngOnInit(): void {
    this.backend.health().subscribe({
      next: (r) => console.log('[bookcloud] Backend health:', r),
      error: (e) => console.warn('[bookcloud] Backend injoignable ou CORS:', e),
    });

    this.subs.add(
      this.router.events
        .pipe(
          filter(
            (e): e is NavigationStart | NavigationEnd | NavigationCancel =>
              e instanceof NavigationStart ||
              e instanceof NavigationEnd ||
              e instanceof NavigationCancel,
          ),
        )
        .subscribe((e) => {
          const el = this.routeShell?.nativeElement;
          if (!el) {
            return;
          }
          if (e instanceof NavigationStart) {
            if (this.initialNavigation) {
              return;
            }
            this.routeAnim?.kill();
            this.routeAnim = gsap.to(el, {
              opacity: 0,
              duration: 0.22,
              ease: 'power2.in',
              overwrite: true,
            });
            return;
          }
          if (this.initialNavigation) {
            this.initialNavigation = false;
            return;
          }
          this.routeAnim?.kill();
          this.routeAnim = gsap.to(el, {
            opacity: 1,
            duration: 0.38,
            ease: 'power2.out',
            delay: 0.04,
            overwrite: true,
          });
        }),
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    this.routeAnim?.kill();
  }
}
