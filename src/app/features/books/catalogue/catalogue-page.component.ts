import { HttpErrorResponse } from '@angular/common/http';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import Lenis from '@studio-freight/lenis';
import gsap from 'gsap';
import { distinctUntilChanged } from 'rxjs/operators';

import { AuthToastService } from '../../../core/services/auth-toast.service';
import { CatalogueBookCardComponent } from './catalogue-book-card/catalogue-book-card.component';
import { LoanApiService } from '../../../core/services/loan-api.service';
import { BookApiService } from '../../../core/services/book-api.service';
import { CategoryApiService } from '../../../core/services/category-api.service';
import {
  BookCatalogItem,
  BookFilters,
  CatalogueSort,
  CatalogueViewMode,
  CategoryOption,
  defaultBookFilters,
} from '../../../core/services/catalogue.models';
import {
  CatalogueStateService,
  filtersToParams,
} from '../../../core/services/catalogue-state.service';

@Component({
  selector: 'app-catalogue-page',
  templateUrl: './catalogue-page.component.html',
  styleUrls: ['./catalogue-page.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CataloguePageComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly state = inject(CatalogueStateService);
  private readonly bookApi = inject(BookApiService);
  private readonly categoriesApi = inject(CategoryApiService);
  private readonly loans = inject(LoanApiService);
  private readonly toast = inject(AuthToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  @ViewChild('scrollSentinel') sentinel?: ElementRef<HTMLElement>;
  @ViewChild('gridHost') gridHost?: ElementRef<HTMLElement>;

  categories: CategoryOption[] = [];
  mobileFiltersOpen = false;
  borrowingIds = new Set<string>();

  readonly filters$ = this.state.filters$;
  readonly books$ = this.state.books$;
  readonly loading$ = this.state.loading$;
  readonly loadingMore$ = this.state.loadingMore$;
  readonly totalCount$ = this.state.totalCount$;
  readonly viewMode$ = this.state.viewMode$;
  readonly selectedBookId$ = this.state.selectedBookId$;

  private lenis?: Lenis;
  private rafId = 0;
  private intersection?: IntersectionObserver;
  private prevBookLen = 0;

  ngOnInit(): void {
    this.categoriesApi.GetAllCategories().subscribe({
      next: (c) => {
        this.categories = c;
        this.cdr.markForCheck();
      },
      error: () => {},
    });

    this.route.queryParams
      .pipe(
        distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((params) => {
        this.state.applyRouteParams(params);
        void this.state.reload(true);
      });

    /** smoothWheel calls preventDefault on wheel; Chrome may still treat some paths as passive → console spam. Native scroll is fine here. */
    const lenis = new Lenis({
      smoothWheel: false,
      syncTouch: false,
    });
    this.lenis = lenis;
    const raf = (time: number): void => {
      lenis.raf(time);
      this.rafId = requestAnimationFrame(raf);
    };
    this.rafId = requestAnimationFrame(raf);
  }

  ngAfterViewInit(): void {
    this.state.books$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((books) => {
      if (books.length !== this.prevBookLen) {
        this.prevBookLen = books.length;
        requestAnimationFrame(() => {
          this.attachIntersectionObserver();
          this.staggerCards();
        });
      }
    });
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.rafId);
    this.lenis?.destroy();
    this.intersection?.disconnect();
  }

  applyFilters(f: BookFilters): void {
    this.mobileFiltersOpen = false;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: filtersToParams(f, this.state.viewMode$.value),
      replaceUrl: true,
    });
  }

  resetFilters(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: filtersToParams(defaultBookFilters(), this.state.viewMode$.value),
      replaceUrl: true,
    });
  }

  onSearch(q: string): void {
    const next = { ...this.state.filters$.value, search: q };
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: filtersToParams(next, this.state.viewMode$.value),
      replaceUrl: true,
    });
  }

  onSort(sort: CatalogueSort): void {
    const next = { ...this.state.filters$.value, sort };
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: filtersToParams(next, this.state.viewMode$.value),
      replaceUrl: true,
    });
  }

  onView(mode: CatalogueViewMode): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: filtersToParams(this.state.filters$.value, mode),
      replaceUrl: true,
    });
  }

  favorite(book: BookCatalogItem, card: CatalogueBookCardComponent): void {
    const prev = book.isFavorited;
    this.state.patchBookFavorite(book.id, !prev);
    card.favoriteAnim();
    this.bookApi.toggleFavorite(book.id).subscribe({
      next: (r) => {
        this.state.patchBookFavorite(book.id, r.favorited);
      },
      error: () => {
        this.state.patchBookFavorite(book.id, prev);
        this.toast.showKey('CATALOGUE.ERR.FAVORITE', 'error');
      },
    });
  }

  borrow(book: BookCatalogItem, card: CatalogueBookCardComponent): void {
    this.borrowingIds.add(book.id);
    this.cdr.markForCheck();
    this.loans.borrow({ bookId: book.id }).subscribe({
      next: () => {
        const copies = Math.max(0, book.availableCopies - 1);
        this.state.updateBookAvailability(book.id, copies);
        card.triggerBorrowFlash();
        this.toast.showKey('CATALOGUE.BORROW_SUCCESS', 'success');
        this.borrowingIds.delete(book.id);
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        card.triggerBorrowShake();
        const raw = (err.error as { error?: string } | undefined)?.error;
        if (raw && !raw.includes('CATALOGUE.') && !raw.includes('ERR.')) {
          this.toast.showPlain(raw, 'error');
        } else {
          this.toast.showKey('CATALOGUE.ERR.BORROW', 'error');
        }
        this.borrowingIds.delete(book.id);
        this.cdr.markForCheck();
      },
    });
  }

  quickView(id: string): void {
    this.state.openQuickView(id);
  }

  closeDrawer(): void {
    this.state.closeQuickView();
  }

  onDrawerBorrow(e: { bookId: string; availableCopies: number }): void {
    this.state.updateBookAvailability(e.bookId, e.availableCopies);
  }

  trackBook(_: number, b: BookCatalogItem): string {
    return b.id;
  }

  hasMore(): boolean {
    return this.state.hasMore();
  }

  skeletonItems(): number[] {
    return Array.from({ length: 12 }, (_, i) => i);
  }

  skeletonMore(): number[] {
    return Array.from({ length: 3 }, (_, i) => i);
  }

  private attachIntersectionObserver(): void {
    const el = this.sentinel?.nativeElement;
    this.intersection?.disconnect();
    if (!el || !this.state.hasMore()) {
      return;
    }
    this.intersection = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          this.state.loadMore();
        }
      },
      { root: null, rootMargin: '200px', threshold: 0 },
    );
    this.intersection.observe(el);
  }

  private staggerCards(): void {
    const host = this.gridHost?.nativeElement;
    if (!host) {
      return;
    }
    const cards = host.querySelectorAll('.card-root');
    if (!cards.length) {
      return;
    }
    gsap.fromTo(
      cards,
      { opacity: 0, y: 18 },
      {
        opacity: 1,
        y: 0,
        duration: 0.45,
        stagger: 0.04,
        ease: 'power2.out',
      },
    );
  }
}
