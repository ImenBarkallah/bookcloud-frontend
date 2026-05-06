import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  inject,
} from '@angular/core';
import gsap from 'gsap';
import { firstValueFrom } from 'rxjs';

import { AuthToastService } from '../../../../core/services/auth-toast.service';
import { LoanApiService } from '../../../../core/services/loan-api.service';
import { ReservationApiService } from '../../../../core/services/reservation-api.service';
import { BookApiService } from '../../../../core/services/book-api.service';
import { BookCatalogItem, BookDetailApi } from '../../../../core/services/catalogue.models';

@Component({
  selector: 'app-catalogue-quick-view',
  templateUrl: './catalogue-quick-view.component.html',
  styleUrls: ['./catalogue-quick-view.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogueQuickViewComponent implements OnChanges, OnDestroy {
  @Input() bookId: string | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() borrowed = new EventEmitter<{ bookId: string; availableCopies: number }>();

  private readonly books = inject(BookApiService);
  private readonly loans = inject(LoanApiService);
  private readonly reservations = inject(ReservationApiService);
  private readonly toast = inject(AuthToastService);
  private readonly cdr = inject(ChangeDetectorRef);

  detail?: BookDetailApi;
  similar: BookCatalogItem[] = [];
  loading = false;
  borrowing = false;

  private panel?: HTMLElement;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['bookId']) {
      const id = this.bookId;
      if (id) {
        void this.load(id);
      } else {
        this.animateClose();
        this.detail = undefined;
        this.similar = [];
      }
    }
  }

  ngOnDestroy(): void {
    gsap.killTweensOf('.qv-panel');
    gsap.killTweensOf('.qv-backdrop');
  }

  @HostListener('document:keydown.escape')
  onEsc(): void {
    if (this.bookId) {
      this.close();
    }
  }

  close(): void {
    this.closed.emit();
  }

  backdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('qv-backdrop')) {
      this.close();
    }
  }

  trackSimilar(_: number, b: BookCatalogItem): string {
    return b.id;
  }

  coverUrl(d: BookDetailApi): string | null {
    const direct = (d.coverUrl ?? '').trim();
    return direct || null;
  }

  private async load(id: string): Promise<void> {
    this.loading = true;
    this.cdr.markForCheck();
    try {
      const [d, s] = await Promise.all([
        firstValueFrom(this.books.getBook(id)),
        firstValueFrom(this.books.getSimilar(id)),
      ]);
      this.detail = d;
      this.similar = s;
    } catch {
      this.toast.showKey('CATALOGUE.ERR.LOAD', 'error');
      this.detail = undefined;
      this.similar = [];
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
      requestAnimationFrame(() => this.animateOpen());
    }
  }

  borrow(): void {
    if (!this.detail) {
      return;
    }
    this.borrowing = true;
    this.cdr.markForCheck();
    this.loans.borrow({ bookId: this.detail.id }).subscribe({
      next: () => {
        const next = Math.max(0, this.detail!.availableCopies - 1);
        this.detail = { ...this.detail!, availableCopies: next };
        this.toast.showKey('CATALOGUE.BORROW_SUCCESS', 'success');
        this.borrowed.emit({ bookId: this.detail.id, availableCopies: next });
        this.borrowing = false;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        const raw = (err.error as { error?: string } | undefined)?.error;
        const msg = raw ?? '';
        if (!msg || msg.startsWith('CATALOGUE.') || msg.startsWith('ERR.')) {
          this.toast.showKey(msg || 'CATALOGUE.ERR.BORROW', 'error');
        } else {
          this.toast.showPlain(msg, 'error');
        }
        this.borrowing = false;
        this.cdr.markForCheck();
      },
    });
  }

  reserve(): void {
    if (!this.detail) {
      return;
    }
    this.borrowing = true;
    this.cdr.markForCheck();
    this.reservations.create(this.detail.id).subscribe({
      next: () => {
        this.toast.showKey('PUBLIC.RESERVE_SUCCESS', 'success');
        this.borrowing = false;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        const raw = (err.error as { error?: string } | undefined)?.error;
        const msg = raw ?? '';
        if (!msg || msg.startsWith('CATALOGUE.') || msg.startsWith('ERR.')) {
          this.toast.showKey(msg || 'PUBLIC.RESERVE_ERR', 'error');
        } else {
          this.toast.showPlain(msg, 'error');
        }
        this.borrowing = false;
        this.cdr.markForCheck();
      },
    });
  }

  private animateOpen(): void {
    const panel = document.querySelector('.qv-panel') as HTMLElement | null;
    const backdrop = document.querySelector('.qv-backdrop') as HTMLElement | null;
    if (!panel || !backdrop) {
      return;
    }
    this.panel = panel;
    gsap.fromTo(panel, { xPercent: 100 }, { xPercent: 0, duration: 0.55, ease: 'power3.out' });
    gsap.fromTo(backdrop, { opacity: 0 }, { opacity: 1, duration: 0.35 });
    gsap.from('.qv-animate', {
      opacity: 0,
      y: 12,
      stagger: 0.06,
      duration: 0.4,
      delay: 0.25,
      ease: 'power2.out',
    });
  }

  private animateClose(): void {
    const panel = document.querySelector('.qv-panel');
    const backdrop = document.querySelector('.qv-backdrop');
    if (panel) {
      gsap.to(panel, { xPercent: 100, duration: 0.4, ease: 'power3.in' });
    }
    if (backdrop) {
      gsap.to(backdrop, { opacity: 0, duration: 0.3 });
    }
  }
}
