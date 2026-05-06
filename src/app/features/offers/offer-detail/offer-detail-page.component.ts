import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { AuthToastService } from '../../../core/services/auth-toast.service';
import { resolvePublicUploadUrl } from '../../../core/utils/public-upload-url';
import { BookDetailApi } from '../../../core/services/catalogue.models';
import { BookApiService } from '../../../core/services/book-api.service';
import { OffersApiService, OfferDto } from '../../../core/services/offers-api.service';

@Component({
  selector: 'app-offer-detail-page',
  templateUrl: './offer-detail-page.component.html',
  styleUrls: ['./offer-detail-page.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OfferDetailPageComponent implements OnInit {
  readonly uploadUrl = resolvePublicUploadUrl;
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(OffersApiService);
  private readonly bookApi = inject(BookApiService);
  private readonly toast = inject(AuthToastService);
  private readonly cdr = inject(ChangeDetectorRef);

  loading = true;
  error = false;
  offer: OfferDto | null = null;
  books: BookDetailApi[] = [];

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.loading = true;
    this.error = false;
    this.cdr.markForCheck();
    try {
      const offer = await firstValueFrom(this.api.get(id));
      this.offer = offer;
      // hydrate related books
      const ids = (offer.relatedBookIds ?? []).slice(0, 24);
      const hydrated: BookDetailApi[] = [];
      for (const bid of ids) {
        try {
          hydrated.push(await firstValueFrom(this.bookApi.getBook(bid)));
        } catch {
          // ignore missing
        }
      }
      this.books = hydrated;
      this.loading = false;
      this.cdr.markForCheck();
    } catch {
      this.loading = false;
      this.error = true;
      this.toast.showPlain('Offre introuvable.', 'error');
      this.cdr.markForCheck();
    }
  }
}

