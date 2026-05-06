import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { EMPTY, Subject } from 'rxjs';
import { catchError, switchMap, takeUntil } from 'rxjs/operators';

import { AuthToastService } from '../../../core/services/auth-toast.service';
import { AuthService } from '../../../core/services/auth.service';
import { resolvePublicUploadUrl } from '../../../core/utils/public-upload-url';
import { LoanApiService } from '../../../core/services/loan-api.service';
import { ReservationApiService } from '../../../core/services/reservation-api.service';
import { BookApiService } from '../../../core/services/book-api.service';
import { BookCatalogItem, BookDetailApi } from '../../../core/services/catalogue.models';

@Component({
  selector: 'app-book-detail-page',
  templateUrl: './book-detail-page.component.html',
  styleUrls: ['./book-detail-page.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookDetailPageComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly books = inject(BookApiService);
  private readonly loans = inject(LoanApiService);
  private readonly reservations = inject(ReservationApiService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(AuthToastService);
  private readonly cdr = inject(ChangeDetectorRef);

  private readonly destroy$ = new Subject<void>();

  book: BookDetailApi | null = null;
  similar: BookCatalogItem[] = [];
  loading = true;
  notFound = false;
  borrowBusy = false;
  reserveBusy = false;

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        takeUntil(this.destroy$),
        switchMap((params) => {
          const id = params.get('id');
          if (!id) {
            this.notFound = true;
            this.loading = false;
            this.book = null;
            this.cdr.markForCheck();
            return EMPTY;
          }
          this.loading = true;
          this.notFound = false;
          this.book = null;
          this.similar = [];
          this.cdr.markForCheck();
          return this.books.getBook(id).pipe(
            catchError(() => {
              this.notFound = true;
              this.loading = false;
              this.book = null;
              this.cdr.markForCheck();
              return EMPTY;
            }),
          );
        }),
      )
      .subscribe({
        next: (b) => {
          this.book = b;
          this.loading = false;
          this.cdr.markForCheck();
          if (b?.id) {
            this.books.getSimilar(b.id).subscribe({
              next: (s) => {
                this.similar = s;
                this.cdr.markForCheck();
              },
              error: () => {
                this.similar = [];
                this.cdr.markForCheck();
              },
            });
          }
        },
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  coverUrl(b: BookDetailApi): string | null {
    const url = (b.coverUrl ?? '').trim();
    return url ? (resolvePublicUploadUrl(url) ?? url) : null;
  }

  get loggedIn(): boolean {
    return !!this.auth.currentUser;
  }

  loginForAction(): void {
    void this.router.navigate(['/auth/login'], {
      queryParams: { returnUrl: this.router.url },
    });
  }

  borrow(): void {
    if (!this.book || !this.loggedIn) {
      this.loginForAction();
      return;
    }
    this.borrowBusy = true;
    this.cdr.markForCheck();
    this.loans.borrow({ bookId: this.book.id }).subscribe({
      next: () => {
        const next = Math.max(0, this.book!.availableCopies - 1);
        this.book = { ...this.book!, availableCopies: next };
        this.toast.showKey('CATALOGUE.BORROW_SUCCESS', 'success');
        this.borrowBusy = false;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        const raw = (err.error as { error?: string } | undefined)?.error;
        if (raw && !raw.startsWith('CATALOGUE.') && !raw.startsWith('ERR.')) {
          this.toast.showPlain(raw, 'error');
        } else {
          this.toast.showKey('CATALOGUE.ERR.BORROW', 'error');
        }
        this.borrowBusy = false;
        this.cdr.markForCheck();
      },
    });
  }

  reserve(): void {
    if (!this.book || !this.loggedIn) {
      this.loginForAction();
      return;
    }
    this.reserveBusy = true;
    this.cdr.markForCheck();
    this.reservations.create(this.book.id).subscribe({
      next: () => {
        this.toast.showKey('PUBLIC.RESERVE_SUCCESS', 'success');
        this.reserveBusy = false;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        const raw = (err.error as { error?: string } | undefined)?.error;
        if (raw && !raw.includes('CATALOGUE.') && !raw.includes('ERR.')) {
          this.toast.showPlain(raw, 'error');
        } else {
          this.toast.showKey('PUBLIC.RESERVE_ERR', 'error');
        }
        this.reserveBusy = false;
        this.cdr.markForCheck();
      },
    });
  }

  trackSimilar(_: number, item: BookCatalogItem): string {
    return item.id;
  }
}
