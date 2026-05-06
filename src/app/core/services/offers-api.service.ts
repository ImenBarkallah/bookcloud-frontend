import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

export type OfferType = 'BOOK' | 'EVENT' | 'CATEGORY' | 'PERSONALIZED';

export interface OfferDto {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  type: OfferType;
  startDate: string | null;
  endDate: string | null;
  active: boolean;
  expired: boolean;
  personalized: boolean;
  relatedBookIds: string[] | null;
  categoryIds: string[] | null;
}

@Injectable({ providedIn: 'root' })
export class OffersApiService {
  private readonly base = environment.apiBaseUrl;
  constructor(private readonly http: HttpClient) {}

  listActive(): Observable<OfferDto[]> {
    return this.http.get<OfferDto[]>(`${this.base}/api/offers`);
  }

  recommended(userId: string, limit = 10): Observable<OfferDto[]> {
    return this.http.get<OfferDto[]>(
      `${this.base}/api/offers/recommended/${encodeURIComponent(userId)}?limit=${encodeURIComponent(String(limit))}`,
    );
  }

  get(id: string): Observable<OfferDto> {
    return this.http.get<OfferDto>(`${this.base}/api/offers/${encodeURIComponent(id)}`);
  }
}

