import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { BookCatalogItem } from './catalogue.models';

export interface FavoriteToggleResponse {
  bookId: string;
  favorited: boolean;
}

/**
 * API dédiée à la section d’accueil « populaires & recommandations » — indépendante du catalogue.
 */
@Injectable({ providedIn: 'root' })
export class HomeDiscoveryApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  getPopular(limit: number): Observable<BookCatalogItem[]> {
    const clamped = Math.min(48, Math.max(1, Math.floor(limit)));
    const params = new HttpParams().set('limit', String(clamped));
    return this.http.get<BookCatalogItem[]>(`${this.base}/api/discovery/popular`, { params });
  }

  /** Sans session valide le backend renvoie 401 — on renvoie une liste vide sans erreur UI. */
  getRecommendations(limit: number): Observable<BookCatalogItem[]> {
    const clamped = Math.min(48, Math.max(1, Math.floor(limit)));
    const params = new HttpParams().set('limit', String(clamped));
    return this.http
      .get<BookCatalogItem[]>(`${this.base}/api/discovery/recommendations`, { params })
      .pipe(
        catchError((err: { status?: number }) => {
          if (err?.status === 401) {
            return of([]);
          }
          return throwError(() => err);
        }),
      );
  }

  /** Un seul endpoint de bascule favori (idempotent côté UX). */
  toggleFavorite(bookId: string): Observable<FavoriteToggleResponse> {
    return this.http.post<FavoriteToggleResponse>(`${this.base}/api/favorites/toggle`, { bookId });
  }
}
