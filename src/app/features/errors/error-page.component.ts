import { Location } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  OnInit,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

export type ErrorPageKind = 'not-found' | 'forbidden' | 'server';

@Component({
  selector: 'app-error-page',
  templateUrl: './error-page.component.html',
  styleUrls: ['./error-page.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ErrorPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  kind: ErrorPageKind = 'not-found';

  ngOnInit(): void {
    this.applyRouteKind();
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.applyRouteKind();
        this.cdr.markForCheck();
      });
  }

  private applyRouteKind(): void {
    const fromRoute = this.route.snapshot.data['errorKind'] as ErrorPageKind | undefined;
    if (fromRoute === 'not-found' || fromRoute === 'forbidden' || fromRoute === 'server') {
      this.kind = fromRoute;
      return;
    }
    this.kind = this.inferKindFromUrl(this.router.url);
  }

  private inferKindFromUrl(url: string): ErrorPageKind {
    const path = url.split(/[?#]/)[0] ?? '';
    if (path === '/403' || path.startsWith('/403/')) {
      return 'forbidden';
    }
    if (path === '/500' || path.startsWith('/500/')) {
      return 'server';
    }
    return 'not-found';
  }

  goHome(): void {
    void this.router.navigateByUrl('/');
  }

  goBack(): void {
    this.location.back();
  }

  retry(): void {
    const raw = this.route.snapshot.queryParamMap.get('returnUrl');
    if (raw?.startsWith('/') && !raw.startsWith('//')) {
      void this.router.navigateByUrl(raw);
      return;
    }
    this.goBack();
  }
}
