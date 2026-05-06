import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { CreateBookCopyRequestDto } from '../../../dto/create-book-copy-request.dto';
import { CreateBookRequestDto } from '../../../dto/create-book-request.dto';
import { UpdateBookRequestDto } from '../../../dto/update-book-request.dto';
import { Book } from '../../../models/book.model';
import {
  BookCatalogItem,
  BookDetailApi,
  FavoriteToggleResponse,
  PagedBooksResponse,
  PagedQuery,
} from '../../../core/services/catalogue.models';

/** Aligné sur {@code BookController} — `/api/books`. */
@Injectable({ providedIn: 'root' })
export class BookApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  /** GET `/api/books/catalog/paged` */
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

  getSimilar(id: string): Observable<BookCatalogItem[]> {
    return this.http.get<BookCatalogItem[]>(
      `${this.base}/api/books/${encodeURIComponent(id)}/similar`,
    );
  }

  getFeaturedBooks(): Observable<BookCatalogItem[]> {
    return this.http.get<BookCatalogItem[]>(`${this.base}/api/books/featured`);
  }

  toggleFavorite(bookId: string): Observable<FavoriteToggleResponse> {
    return this.http.post<FavoriteToggleResponse>(
      `${this.base}/api/books/${encodeURIComponent(bookId)}/favorite`,
      {},
    );
  }

  /** GET `/api/books` — categoryId, authorId optionnels. */
  listAll(filters?: { categoryId?: string | null; authorId?: string | null }): Observable<Book[]> {
    let params = new HttpParams();
    if (filters?.categoryId) params = params.set('categoryId', filters.categoryId);
    if (filters?.authorId) params = params.set('authorId', filters.authorId);
    return this.http.get<Book[]>(`${this.base}/api/books`, { params });
  }

  getBook(id: string): Observable<BookDetailApi> {
    return this.http.get<BookDetailApi>(`${this.base}/api/books/${encodeURIComponent(id)}`);
  }

  /** Alias de {@link getBook} — même endpoint GET `/api/books/{id}`. */
  getById(id: string): Observable<BookDetailApi> {
    return this.getBook(id);
  }

  create(req: CreateBookRequestDto): Observable<{ id: string }> {
    return this.http.post<{ id: string }>(`${this.base}/api/books`, req);
  }

  update(id: string, req: UpdateBookRequestDto): Observable<void> {
    return this.http.put<void>(`${this.base}/api/books/${encodeURIComponent(id)}`, req);
  }

  setFeatured(id: string, featured: boolean): Observable<void> {
    return this.http.put<void>(
      `${this.base}/api/books/${encodeURIComponent(id)}/featured/${featured}`,
      {},
    );
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/api/books/${encodeURIComponent(id)}`);
  }

  uploadImage(id: string, file: File): Observable<Book> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<Book>(`${this.base}/api/books/${encodeURIComponent(id)}/image`, form);
  }

  registerCopy(bookId: string, req: CreateBookCopyRequestDto): Observable<{ id: string }> {
    return this.http.post<{ id: string }>(
      `${this.base}/api/books/${encodeURIComponent(bookId)}/copies`,
      req,
    );
  }
}
