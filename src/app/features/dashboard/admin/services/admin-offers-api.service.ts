import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../../environments/environment';

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

export interface CreateOfferRequestDto {
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  type: OfferType;
  startDate?: string | null;
  endDate?: string | null;
  active: boolean;
  relatedBookIds?: string[] | null;
  categoryIds?: string[] | null;
}

@Injectable({ providedIn: 'root' })
export class AdminOffersApiService {
  private readonly base = environment.apiBaseUrl;
  constructor(private readonly http: HttpClient) {}

  listAdmin(q: {
    page?: number;
    size?: number;
    search?: string | null;
    type?: OfferType | null;
    active?: boolean | null;
    expired?: boolean | null;
  }): Observable<OfferDto[]> {
    let params = new HttpParams();
    if (q.page != null) params = params.set('page', String(q.page));
    if (q.size != null) params = params.set('size', String(q.size));
    if (q.search) params = params.set('search', q.search);
    if (q.type) params = params.set('type', q.type);
    if (q.active != null) params = params.set('active', String(q.active));
    if (q.expired != null) params = params.set('expired', String(q.expired));
    return this.http.get<OfferDto[]>(`${this.base}/api/offers/admin`, { params });
  }

  getAdmin(id: string): Observable<OfferDto> {
    return this.http.get<OfferDto>(`${this.base}/api/offers/admin/${encodeURIComponent(id)}`);
  }

  create(body: CreateOfferRequestDto): Observable<{ id: string }> {
    return this.http.post<{ id: string }>(`${this.base}/api/offers`, body);
  }

  update(id: string, body: CreateOfferRequestDto): Observable<void> {
    return this.http.put<void>(`${this.base}/api/offers/${encodeURIComponent(id)}`, body);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/api/offers/${encodeURIComponent(id)}`);
  }
}

