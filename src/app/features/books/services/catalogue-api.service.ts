import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import { Partner, PartnerTier } from '../../../models/home-sections.models';
import {
  AuthorItem,
  BookCatalogItem,
  BookDetailApi,
  CategoryOption,
  PagedBooksResponse,
  PagedCategoriesResponse,
} from '../../../core/services/catalogue.models';

export interface FavoriteToggleResponse {
  bookId: string;
  favorited: boolean;
}

export interface PagedQuery {
  page: number;
  size: number;
  search?: string;
  categoryId?: string | null;
  yearFrom?: number | null;
  yearTo?: number | null;
  minRating?: number | null;
  availableOnly?: boolean;
  format?: string | null;
  sort?: string;
}

@Injectable({ providedIn: 'root' })
export class CatalogueApiService {
  private readonly base = environment.apiBaseUrl;

  constructor(private readonly http: HttpClient) {}

  getPaged(q: PagedQuery): Observable<PagedBooksResponse> {
    const page = Number.isFinite(q.page) && q.page >= 0 ? Math.floor(q.page) : 0;
    const sizeRaw = Number.isFinite(q.size) ? Math.floor(q.size) : 12;
    const size = Math.min(48, Math.max(1, sizeRaw));
    let params = new HttpParams().set('page', String(page)).set('size', String(size));
    if (q.search) {
      params = params.set('search', q.search);
    }
    if (q.categoryId) {
      params = params.set('categoryId', q.categoryId);
    }
    if (q.yearFrom != null && Number.isFinite(q.yearFrom)) {
      params = params.set('yearFrom', String(Math.floor(q.yearFrom)));
    }
    if (q.yearTo != null && Number.isFinite(q.yearTo)) {
      params = params.set('yearTo', String(Math.floor(q.yearTo)));
    }
    if (q.minRating != null && Number.isFinite(q.minRating)) {
      params = params.set('minRating', String(q.minRating));
    }
    if (q.availableOnly) {
      params = params.set('availableOnly', 'true');
    }
    if (q.format) {
      params = params.set('format', q.format);
    }
    if (q.sort) {
      params = params.set('sort', q.sort);
    }
    return this.http.get<PagedBooksResponse>(`${this.base}/api/books/catalog/paged`, { params });
  }

  /** GET /api/categories (same data as the former /api/books/categories alias; avoids /{id} routing clash). */
  getCategories(): Observable<CategoryOption[]> {
    return this.http.get<CategoryOption[]>(`${this.base}/api/categories`);
  }

  /** GET /api/categories/paged — pagination + recherche côté serveur */
  getCategoriesPaged(params: {
    page: number;
    size: number;
    search?: string | null;
  }): Observable<PagedCategoriesResponse> {
    let hp = new HttpParams()
      .set('page', String(Math.max(0, Math.floor(params.page))))
      .set('size', String(Math.min(100, Math.max(1, Math.floor(params.size)))));
    const s = (params.search ?? '').trim();
    if (s) {
      hp = hp.set('search', s);
    }
    return this.http.get<PagedCategoriesResponse>(`${this.base}/api/categories/paged`, { params: hp });
  }

  getCategoryById(id: string): Observable<CategoryOption> {
    return this.http.get<CategoryOption>(`${this.base}/api/categories/${encodeURIComponent(id)}`);
  }

  createCategory(body: { name: string; description?: string | null }): Observable<{ id: string }> {
    return this.http.post<{ id: string }>(`${this.base}/api/categories`, body);
  }

  updateCategory(id: string, body: { name: string; description?: string | null }): Observable<void> {
    return this.http.put<void>(`${this.base}/api/categories/${encodeURIComponent(id)}`, body);
  }

  deleteCategory(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/api/categories/${encodeURIComponent(id)}`);
  }

  /** POST multipart `file` — ADMIN / BIBLIOTHÉCAIRE ; renvoie la catégorie avec `imageUrl`. */
  uploadCategoryImage(id: string, file: File): Observable<CategoryOption> {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<CategoryOption>(
      `${this.base}/api/categories/${encodeURIComponent(id)}/image`,
      fd,
    );
  }

  getBook(id: string): Observable<BookDetailApi> {
    return this.http.get<BookDetailApi>(`${this.base}/api/books/${encodeURIComponent(id)}`);
  }

  getSimilar(id: string): Observable<BookCatalogItem[]> {
    return this.http.get<BookCatalogItem[]>(
      `${this.base}/api/books/${encodeURIComponent(id)}/similar`,
    );
  }

  /** GET /api/books/featured — sélection Home (max 5) */
  getFeaturedBooks(): Observable<BookCatalogItem[]> {
    return this.http.get<BookCatalogItem[]>(`${this.base}/api/books/featured`);
  }

  toggleFavorite(bookId: string): Observable<FavoriteToggleResponse> {
    return this.http.post<FavoriteToggleResponse>(
      `${this.base}/api/books/${encodeURIComponent(bookId)}/favorite`,
      {},
    );
  }

  borrow(bookId: string): Observable<unknown> {
    return this.http.post(`${this.base}/api/loans`, { bookId });
  }

  /** Liste publique des auteurs */
  getAuthors(): Observable<AuthorItem[]> {
    return this.http.get<AuthorItem[]>(`${this.base}/api/authors`);
  }

  getAuthor(id: string): Observable<AuthorItem> {
    return this.http.get<AuthorItem>(`${this.base}/api/authors/${encodeURIComponent(id)}`);
  }

  /** Partenaires & sponsors (lecture publique: non archivés). */
  getPublicPartners(): Observable<Partner[]> {
    return this.http.get<Partner[]>(`${this.base}/api/public/partners`).pipe(
      map((rows) =>
        (rows ?? []).map((p) => ({
          ...p,
          tier: normalizePartnerTier(p.tier),
          logoUrl: typeof p.logoUrl === 'string' ? p.logoUrl.trim() : p.logoUrl,
          name: typeof p.name === 'string' ? p.name.trim() : p.name,
        })),
      ),
    );
  }

  /** Réservation — compte requis (Spring renvoie 401 sinon). */
  reserve(bookId: string, pickupBranchId?: string | null): Observable<unknown> {
    const body: { bookId: string; pickupBranchId?: string } = { bookId };
    if (pickupBranchId) {
      body.pickupBranchId = pickupBranchId;
    }
    return this.http.post(`${this.base}/api/reservations`, body);
  }
}

function normalizePartnerTier(raw: unknown): PartnerTier {
  const t = String(raw ?? '').trim().toUpperCase();
  if (t === 'GOLD' || t === 'SILVER' || t === 'BRONZE') {
    return t;
  }
  return 'BRONZE';
}
