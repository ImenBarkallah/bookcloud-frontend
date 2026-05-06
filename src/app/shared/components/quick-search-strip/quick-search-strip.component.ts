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

import { BookListItem } from '../../../models/home-sections.models';
import { BooksCatalogApiService } from '../../../core/services/books-catalog-api.service';

@Component({
  selector: 'app-quick-search-strip',
  templateUrl: './quick-search-strip.component.html',
  styleUrls: ['./quick-search-strip.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuickSearchStripComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly api = inject(BooksCatalogApiService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  query = '';
  categoryFilter = 'all';
  suggestions: BookListItem[] = [];
  showSuggestions = false;
  allBooks: BookListItem[] = [];
  booksLoaded = false;

  readonly trending = ['Harry Potter', 'Dune', 'Sapiens', '1984', 'Le Petit Prince'];

  readonly categories = [
    { id: 'all', labelKey: 'HOME.QUICK_SEARCH.CAT_ALL' },
    { id: 'fiction', labelKey: 'HOME.QUICK_SEARCH.CAT_FICTION' },
    { id: 'science', labelKey: 'HOME.QUICK_SEARCH.CAT_SCIENCE' },
    { id: 'history', labelKey: 'HOME.QUICK_SEARCH.CAT_HISTORY' },
    { id: 'art', labelKey: 'HOME.QUICK_SEARCH.CAT_ART' },
    { id: 'tech', labelKey: 'HOME.QUICK_SEARCH.CAT_TECH' },
    { id: 'kids', labelKey: 'HOME.QUICK_SEARCH.CAT_KIDS' },
  ];

  private stopInView?: () => void;
  private pillLoopStop?: () => void;
  private blurTimer?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    this.api.listBooks().subscribe((books) => {
      this.allBooks = books ?? [];
      this.booksLoaded = true;
      this.cdr.markForCheck();
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
  }

  hideSuggestionsDelayed(): void {
    this.blurTimer = setTimeout(() => {
      this.showSuggestions = false;
      this.cdr.markForCheck();
    }, 150);
  }

  onQueryInput(): void {
    const q = this.query.trim().toLowerCase();
    if (!q || !this.allBooks.length) {
      this.suggestions = [];
      this.showSuggestions = false;
      this.cdr.markForCheck();
      return;
    }
    this.suggestions = this.allBooks
      .filter(
        (b) =>
          (b.title?.toLowerCase().includes(q) ?? false) ||
          (b.author?.toLowerCase().includes(q) ?? false) ||
          (b.isbn?.toLowerCase().includes(q) ?? false),
      )
      .slice(0, 5);
    this.showSuggestions = this.suggestions.length > 0;
    this.cdr.markForCheck();
    this.staggerSuggestions();
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
    this.router.navigate(['/catalogue'], { queryParams: { q: this.query } });
  }

  submitSearch(): void {
    const q = this.query.trim();
    const params: Record<string, string> = {};
    if (q) {
      params['q'] = q;
    }
    if (this.categoryFilter && this.categoryFilter !== 'all') {
      params['cat'] = this.categoryFilter;
    }
    this.router.navigate(['/catalogue'], { queryParams: params });
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
