import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  inject,
} from '@angular/core';
import { animate } from 'motion';

import { BookCatalogItem } from '../../../../core/services/catalogue.models';

@Component({
  selector: 'app-catalogue-book-card',
  templateUrl: './catalogue-book-card.component.html',
  styleUrls: ['./catalogue-book-card.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogueBookCardComponent {
  @Input({ required: true }) book!: BookCatalogItem;
  @Input() layout: 'grid' | 'list' = 'grid';
  @Input() borrowing = false;
  @Output() borrow = new EventEmitter<void>();
  @Output() favoriteToggle = new EventEmitter<void>();
  @Output() quickView = new EventEmitter<void>();

  private readonly host = inject(ElementRef<HTMLElement>);
  coverFailed = false;

  gradientFallback(): string {
    const h = Math.abs(this.book.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 360);
    return `linear-gradient(145deg, hsl(${h}, 42%, 28%), hsl(${(h + 40) % 360}, 38%, 18%))`;
  }

  onCoverError(): void {
    this.coverFailed = true;
  }

  favoriteAnim(): void {
    const heart = this.host.nativeElement.querySelector('.heart-btn');
    if (heart) {
      animate(heart, { scale: [0, 1.35, 1] }, { duration: 0.45 });
    }
  }

  triggerBorrowFlash(): void {
    const el = this.host.nativeElement.querySelector('.card-surface');
    if (el) {
      el.classList.add('borrow-flash');
      setTimeout(() => el.classList.remove('borrow-flash'), 900);
    }
  }

  triggerBorrowShake(): void {
    const el = this.host.nativeElement.querySelector('.borrow-btn');
    if (el) {
      el.classList.add('borrow-shake');
      setTimeout(() => el.classList.remove('borrow-shake'), 600);
    }
  }
}
