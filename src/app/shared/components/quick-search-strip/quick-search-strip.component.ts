import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import { Router } from '@angular/router';
import { animate, inView, stagger } from '@motionone/dom';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';

import { BookListItem } from '../../../models/home-sections.models';
import { BooksCatalogApiService } from '../../../core/services/books-catalog-api.service';
import { BookApiService } from '../../../features/books/services/book-api.service';
import { CategoryApiService } from '../../../core/services/category-api.service';
import { CategoryOption } from '../../../core/services/catalogue.models';

@Component({
  selector: 'app-quick-search-strip',
  templateUrl: './quick-search-strip.component.html',
  styleUrls: ['./quick-search-strip.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuickSearchStripComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly api = inject(BooksCatalogApiService);
  private readonly bookApi = inject(BookApiService);
  private readonly categoriesApi = inject(CategoryApiService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  query = '';
  categoryFilter: string | null = null;
  suggestions: BookListItem[] = [];
  showSuggestions = false;
  private readonly query$ = new Subject<string>();
  private sub?: Subscription;

  readonly trending = ['Harry Potter', 'Dune', 'Sapiens', '1984', 'Le Petit Prince'];

  categories: CategoryOption[] = [];

  private stopInView?: () => void;
  private pillLoopStop?: () => void;
  private blurTimer?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    // Real categories from backend
    this.categoriesApi.GetAllCategories().subscribe({
      next: (c) => {
        this.categories = c ?? [];
        this.cdr.markForCheck();
      },
      error: () => {},
    });

    // Real-time suggestions from backend (paged search)
    this.sub = this.query$
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        switchMap((q) =>
          this.bookApi.getPaged({
            page: 0,
            size: 5,
            search: q || undefined,
            categoryId: this.categoryFilter,
          }),
        ),
      )
      .subscribe({
        next: (res) => {
          this.suggestions =
            (res?.content ?? []).map((b) => ({
              id: b.id,
              title: b.title,
              author: b.author,
              isbn: b.isbn ?? undefined,
              coverUrl: b.coverUrl ?? undefined,
              categoryId: b.categoryId,
            })) ?? [];
          this.showSuggestions = (this.query.trim().length > 0 && this.suggestions.length > 0) || false;
          this.cdr.markForCheck();
          this.staggerSuggestions();
        },
        error: () => {
          this.suggestions = [];
          this.showSuggestions = false;
          this.cdr.markForCheck();
        },
      });
  }

  ngAfterViewInit(): void {
    const root = this.host.nativeElement;
    this.stopInView = inView(
      root,
      () => {
        const input = root.querySelector('.search-input');
        const sel = root.querySelector('.category-select-wrap');
        const btn = root.querySelector('.search-btn');
        if (input) {
          animate(input as HTMLElement, { opacity: [0, 1], transform: ['translateX(-30px)', 'none'] }, { duration: 0.5, easing: 'ease-out' });
        }
        if (sel) {
          animate(sel as HTMLElement, { opacity: [0, 1], transform: ['translateY(20px)', 'none'] }, { duration: 0.5, delay: 0.1, easing: 'ease-out' });
        }
        if (btn) {
          animate(btn as HTMLElement, { opacity: [0, 1], transform: ['translateX(30px)', 'none'] }, { duration: 0.5, delay: 0.2, easing: 'ease-out' });
        }
      },
      { margin: '-100px 0px -100px 0px' },
    );

    const pill = root.querySelector('.kbd-hint-pill') as HTMLElement | null;
    if (pill && typeof window !== 'undefined' && window.matchMedia('(min-width: 769px)').matches) {
      const ctrl = animate(
        pill,
        { transform: ['translateY(0px)', 'translateY(-4px)', 'translateY(0px)'] },
        { duration: 2, easing: 'ease-in-out', repeat: Infinity },
      );
      this.pillLoopStop = () => ctrl.cancel();
    }
  }

  ngOnDestroy(): void {
    this.stopInView?.();
    this.pillLoopStop?.();
    clearTimeout(this.blurTimer);
    this.sub?.unsubscribe();
    this.query$.complete();
  }

  hideSuggestionsDelayed(): void {
    this.blurTimer = setTimeout(() => {
      this.showSuggestions = false;
      this.cdr.markForCheck();
    }, 150);
  }

  onQueryInput(): void {
    const q = this.query.trim().toLowerCase();
    if (!q) {
      this.suggestions = [];
      this.showSuggestions = false;
      this.cdr.markForCheck();
      return;
    }
    this.query$.next(this.query.trim());
  }

  private staggerSuggestions(): void {
    const root = this.host.nativeElement;
    requestAnimationFrame(() => {
      const items = Array.from(root.querySelectorAll('.suggestion-item')) as HTMLElement[];
      if (!items.length) {
        return;
      }
      animate(
        items,
        { opacity: [0, 1], transform: ['translateY(-8px)', 'none'] },
        { duration: 0.25, delay: stagger(0.05) },
      );
    });
  }

  pickSuggestion(b: BookListItem): void {
    this.query = b.title ?? '';
    this.showSuggestions = false;
    this.router.navigate(['/catalogue'], {
      queryParams: { search: this.query.trim(), category: this.categoryFilter || undefined },
    });
  }

  submitSearch(): void {
    const q = this.query.trim();
    this.router.navigate(['/catalogue'], {
      queryParams: {
        search: q || undefined,
        category: this.categoryFilter || undefined,
      },
    });
    this.showSuggestions = false;
  }

  applyTrend(term: string): void {
    this.query = term;
    this.onQueryInput();
    this.cdr.markForCheck();
  }

  focusSearch(): void {
    const el = this.host.nativeElement.querySelector('.search-input-field') as HTMLInputElement | null;
    el?.focus();
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(ev: KeyboardEvent): void {
    if ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === 'k') {
      ev.preventDefault();
      this.focusSearch();
    }
  }

  onTrendHover(el: HTMLElement, enter: boolean): void {
    animate(el, { transform: enter ? 'scale(1.06)' : 'scale(1)' }, { duration: 0.2 });
  }

  onFocusInput(): void {
    if (this.query.trim() && this.suggestions.length) {
      this.showSuggestions = true;
      this.cdr.markForCheck();
    }
  }

  onSearchBtnHover(el: HTMLElement, enter: boolean): void {
    animate(el, { transform: enter ? 'scale(1.04)' : 'scale(1)' }, { duration: 0.25 });
  }
}
