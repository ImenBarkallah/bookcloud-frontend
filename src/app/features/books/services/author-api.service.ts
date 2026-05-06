import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { AuthorItem } from '../../../core/services/catalogue.models';

export interface AuthorDetail extends AuthorItem {
  imageUrl?: string | null;
  createdAt?: string | null;
}

export interface CreateAuthorBody {
  name: string;
  bio?: string | null;
  country?: string | null;
}

export interface UpdateAuthorBody {
  name?: string | null;
  bio?: string | null;
  country?: string | null;
}

/** @deprecated Utiliser {@link AuthorDetail} — conservé pour compat imports admin. */
export type AdminAuthor = AuthorDetail;

/** Aligné sur {@code AuthorController} — `/api/authors`. */
@Injectable({ providedIn: 'root' })
export class AuthorApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  list(): Observable<AuthorDetail[]> {
    return this.http.get<AuthorDetail[]>(`${this.base}/api/authors`);
  }

  getById(id: string): Observable<AuthorDetail> {
    return this.http.get<AuthorDetail>(`${this.base}/api/authors/${encodeURIComponent(id)}`);
  }

  create(body: CreateAuthorBody): Observable<{ id: string }> {
    return this.http.post<{ id: string }>(`${this.base}/api/authors`, body);
  }

  update(id: string, body: UpdateAuthorBody): Observable<void> {
    return this.http.put<void>(`${this.base}/api/authors/${encodeURIComponent(id)}`, body);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/api/authors/${encodeURIComponent(id)}`);
  }

  uploadImage(id: string, file: File): Observable<AuthorDetail> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<AuthorDetail>(`${this.base}/api/authors/${encodeURIComponent(id)}/image`, form);
  }
}
