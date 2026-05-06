import { Injectable, inject } from '@angular/core';
import { Params } from '@angular/router';
import { BehaviorSubject, firstValueFrom } from 'rxjs';

import { AuthToastService } from './auth-toast.service';
import { BookApiService } from '../../features/books/services/book-api.service';
import {
  BookCatalogItem,
  BookFilters,
  CatalogueViewMode,
  defaultBookFilters,
} from './catalogue.models';

export function mergeQueryIntoFilters(q: Params): BookFilters {
  const d = defaultBookFilters();
  const search = q['search'];
  if (typeof search === 'string' && search.trim()) {
    d.search = search.trim();
  }
  const category = q['category'];
  if (typeof category === 'string' && category) {
    d.categoryId = category;
  }
  if (q['available'] === 'true') {
    d.availableOnly = true;
  }
  const rating = q['rating'];
  if (rating != null && rating !== '') {
    const n = Number(rating);
    if (Number.isFinite(n)) {
      d.minRating = n;
    }
  }
  const yf = q['yearFrom'];
  if (yf != null && yf !== '') {
    const n = Number(yf);
    if (Number.isFinite(n)) {
      d.yearFrom = Math.floor(n);
    }
  }
  const yt = q['yearTo'];
  if (yt != null && yt !== '') {
    const n = Number(yt);
    if (Number.isFinite(n)) {
      d.yearTo = Math.floor(n);
    }
  }
  const fmt = q['format'];
  if (fmt === 'PHYSICAL' || fmt === 'EBOOK' || fmt === 'AUDIO') {
    d.format = fmt;
  }
  const sort = q['sort'];
  if (sort === 'newest' || sort === 'title' || sort === 'year' || sort === 'rating') {
    d.sort = sort;
  }
  return d;
}

export function filtersToParams(f: BookFilters, view: CatalogueViewMode): Params {
  const p: Params = {};
  if (f.search) {
    p['search'] = f.search;
  }
  if (f.categoryId) {
    p['category'] = f.categoryId;
  }
  if (f.availableOnly) {
    p['available'] = 'true';
  }
  if (f.minRating != null && Number.isFinite(f.minRating)) {
    p['rating'] = String(f.minRating);
  }
  if (f.yearFrom != null && Number.isFinite(f.yearFrom)) {
    p['yearFrom'] = String(Math.floor(f.yearFrom));
  }
  if (f.yearTo != null && Number.isFinite(f.yearTo)) {
    p['yearTo'] = String(Math.floor(f.yearTo));
  }
  if (f.format) {
    p['format'] = f.format;
  }
  p['sort'] = f.sort;
  p['view'] = view;
  return p;
}

@Injectable({ providedIn: 'root' })
export class CatalogueStateService {
  private readonly api = inject(BookApiService);
  private readonly toast = inject(AuthToastService);

  private readonly pageSizeValue = 12;

  readonly filters$ = new BehaviorSubject<BookFilters>(defaultBookFilters());
  readonly books$ = new BehaviorSubject<BookCatalogItem[]>([]);
  readonly loading$ = new BehaviorSubject<boolean>(false);
  readonly loadingMore$ = new BehaviorSubject<boolean>(false);
  readonly totalCount$ = new BehaviorSubject<number>(0);
  readonly totalPages$ = new BehaviorSubject<number>(0);
  readonly currentPage$ = new BehaviorSubject<number>(0);
  readonly viewMode$ = new BehaviorSubject<CatalogueViewMode>('grid');
  readonly selectedBookId$ = new BehaviorSubject<string | null>(null);

  applyRouteParams(params: Params): void {
    this.filters$.next(mergeQueryIntoFilters(params));
    const v = params['view'];
    if (v === 'list' || v === 'grid') {
      this.viewMode$.next(v);
    }
  }

  async reload(reset: boolean): Promise<void> {
    const filters = this.filters$.value;
    const page = reset ? 0 : this.currentPage$.value + 1;
    if (reset) {
      this.loading$.next(true);
      this.books$.next([]);
    } else {
      this.loadingMore$.next(true);
    }
    try {
      const res = await firstValueFrom(
        this.api.getPaged({
          page,
            size: this.pageSizeValue,
          search: filters.search || undefined,
          categoryId: filters.categoryId,
          yearFrom: filters.yearFrom,
          yearTo: filters.yearTo,
          minRating: filters.minRating,
          availableOnly: filters.availableOnly,
          format: filters.format,
          sort: filters.sort,
        }),
      );
      const merged = reset ? res.content : [...this.books$.value, ...res.content];
      this.books$.next(merged);
      this.totalCount$.next(res.totalElements);
      this.totalPages$.next(res.totalPages);
      this.currentPage$.next(res.number);
    } catch {
      this.toast.showKey('CATALOGUE.ERR.LOAD', 'error');
    } finally {
      this.loading$.next(false);
      this.loadingMore$.next(false);
    }
  }

  loadMore(): void {
    if (
      this.loading$.value ||
      this.loadingMore$.value ||
      this.currentPage$.value + 1 >= this.totalPages$.value
    ) {
      return;
    }
    void this.reload(false);
  }

  updateBookAvailability(bookId: string, availableCopies: number): void {
    const list = this.books$.value.map((b) =>
      b.id === bookId ? { ...b, availableCopies } : b,
    );
    this.books$.next(list);
  }

  patchBookFavorite(bookId: string, favorited: boolean): void {
    const list = this.books$.value.map((b) =>
      b.id === bookId ? { ...b, isFavorited: favorited } : b,
    );
    this.books$.next(list);
  }

  openQuickView(bookId: string): void {
    this.selectedBookId$.next(bookId);
  }

  closeQuickView(): void {
    this.selectedBookId$.next(null);
  }

  hasMore(): boolean {
    return this.currentPage$.value + 1 < this.totalPages$.value;
  }

  getPageSize(): number {
    return this.pageSizeValue;
  }
}
