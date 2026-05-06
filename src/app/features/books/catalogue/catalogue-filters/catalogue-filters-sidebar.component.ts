import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';

import {
  BookFilters,
  CatalogueSort,
  CategoryOption,
  MediaFormat,
  defaultBookFilters,
} from '../../../../core/services/catalogue.models';

@Component({
  selector: 'app-catalogue-filters-sidebar',
  templateUrl: './catalogue-filters-sidebar.component.html',
  styleUrls: ['./catalogue-filters-sidebar.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogueFiltersSidebarComponent implements OnChanges {
  @Input() categories: CategoryOption[] | null = [];
  @Input() mobileOpen = false;
  @Input() applied: BookFilters = defaultBookFilters();

  @Output() apply = new EventEmitter<BookFilters>();
  @Output() reset = new EventEmitter<void>();
  @Output() closeMobile = new EventEmitter<void>();

  draft: BookFilters = defaultBookFilters();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['applied']?.currentValue) {
      this.draft = { ...changes['applied'].currentValue };
    }
  }

  patch(partial: Partial<BookFilters>): void {
    this.draft = { ...this.draft, ...partial };
  }

  setRating(stars: number): void {
    this.patch({ minRating: stars });
  }

  setFormat(f: MediaFormat | null): void {
    this.patch({ format: f });
  }

  onApply(): void {
    this.apply.emit({ ...this.draft });
  }

  onReset(): void {
    this.reset.emit();
  }

  sortPresets(): { id: CatalogueSort; key: string }[] {
    return [
      { id: 'newest', key: 'CATALOGUE.SORT_NEWEST' },
      { id: 'title', key: 'CATALOGUE.SORT_TITLE' },
      { id: 'year', key: 'CATALOGUE.SORT_YEAR' },
      { id: 'rating', key: 'CATALOGUE.SORT_RATING' },
    ];
  }
}
