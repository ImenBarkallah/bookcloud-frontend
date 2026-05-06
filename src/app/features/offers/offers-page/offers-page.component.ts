import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { combineLatest } from 'rxjs';

import { AuthStateService } from '../../../core/services/auth-state.service';
import { AuthToastService } from '../../../core/services/auth-toast.service';
import { resolvePublicUploadUrl } from '../../../core/utils/public-upload-url';
import { OffersApiService, OfferDto } from '../../../core/services/offers-api.service';

@Component({
  selector: 'app-offers-page',
  templateUrl: './offers-page.component.html',
  styleUrls: ['./offers-page.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OffersPageComponent implements OnInit {
  readonly uploadUrl = resolvePublicUploadUrl;

  private readonly api = inject(OffersApiService);
  private readonly auth = inject(AuthStateService);
  private readonly toast = inject(AuthToastService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  loading = true;
  error = false;

  offers: OfferDto[] = [];
  recommended: OfferDto[] = [];

  ngOnInit(): void {
    combineLatest([this.auth.currentUser$, this.auth.userProfile$])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(([u, p]) => {
        this.load(u?.uid ?? null);
      });
  }

  load(uid: string | null): void {
    this.loading = true;
    this.error = false;
    this.offers = [];
    this.recommended = [];
    this.cdr.markForCheck();

    this.api.listActive().subscribe({
      next: (rows) => {
        this.offers = rows ?? [];
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.error = true;
        this.toast.showPlain('Impossible de charger les offres.', 'error');
        this.cdr.markForCheck();
      },
    });

    if (uid) {
      this.api.recommended(uid, 10).subscribe({
        next: (rows) => {
          this.recommended = rows ?? [];
          this.cdr.markForCheck();
        },
      });
    }
  }

  badge(o: OfferDto): 'new' | 'limited' | 'for-you' | null {
    if (o.personalized) return 'for-you';
    // Limited = ends within 3 days
    if (o.endDate) {
      const end = new Date(o.endDate);
      const now = new Date();
      const diffDays = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && diffDays <= 3) return 'limited';
    }
    // New = started within 7 days
    if (o.startDate) {
      const start = new Date(o.startDate);
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && diffDays <= 7) return 'new';
    }
    return null;
  }
}

