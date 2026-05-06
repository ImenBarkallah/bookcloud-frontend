import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  inject,
} from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import gsap from 'gsap';

import { CatalogueSort, CatalogueViewMode } from '../../../../core/services/catalogue.models';

@Component({
  selector: 'app-catalogue-toolbar',
  templateUrl: './catalogue-toolbar.component.html',
  styleUrls: ['./catalogue-toolbar.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogueToolbarComponent implements AfterViewInit, OnDestroy {
  @Input() showing = 0;
  @Input() total = 0;
  @Input() searchValue = '';
  @Input() sort: CatalogueSort = 'newest';
  @Input() viewMode: CatalogueViewMode = 'grid';

  @Output() searchChange = new EventEmitter<string>();
  @Output() sortChange = new EventEmitter<CatalogueSort>();
  @Output() viewModeChange = new EventEmitter<CatalogueViewMode>();
  @Output() openFilters = new EventEmitter<void>();

  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly searchSubject = new Subject<string>();
  private sub?: Subscription;
  private scrollOff?: () => void;

  constructor() {
    this.sub = this.searchSubject
      .pipe(debounceTime(400), distinctUntilChanged())
      .subscribe((v) => this.searchChange.emit(v));
  }

  ngAfterViewInit(): void {
    const el = this.host.nativeElement;
    const onScroll = (): void => {
      const y = window.scrollY || 0;
      const t = Math.min(1, y / 120);
      gsap.to(el, { scale: 1 - t * 0.03, duration: 0.2, overwrite: true });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    this.scrollOff = () => window.removeEventListener('scroll', onScroll);
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.searchSubject.complete();
    this.scrollOff?.();
  }

  onSearchInput(value: string): void {
    this.searchSubject.next(value);
  }

  onSortSelect(value: string): void {
    if (value === 'newest' || value === 'title' || value === 'year' || value === 'rating') {
      this.sortChange.emit(value);
    }
  }

  setView(mode: CatalogueViewMode): void {
    this.viewModeChange.emit(mode);
  }
}
