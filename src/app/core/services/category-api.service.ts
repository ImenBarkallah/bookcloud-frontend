import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { CategoryOption, PagedCategoriesResponse } from './catalogue.models';

@Injectable({
  providedIn: 'root',
})
export class CategoryApiService {
  private readonly baseUrl = `${environment.apiBaseUrl}/api/categories`;

  constructor(private httpClient: HttpClient) {}

  /** GET `/api/categories` — liste complète. */
  GetAllCategories(): Observable<CategoryOption[]> {
    return this.httpClient.get<CategoryOption[]>(this.baseUrl);
  }

  /** GET `/api/categories/paged` — pagination + recherche optionnelle. */
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
    return this.httpClient.get<PagedCategoriesResponse>(`${this.baseUrl}/paged`, { params: hp });
  }

  /** GET `/api/categories/{id}`. */
  getCategoryById(id: string): Observable<CategoryOption> {
    return this.httpClient.get<CategoryOption>(`${this.baseUrl}/${encodeURIComponent(id)}`);
  }

  /** POST `/api/categories`. */
  addCategory(body: { name: string; description?: string | null }): Observable<{ id: string }> {
    return this.httpClient.post<{ id: string }>(this.baseUrl, body);
  }

  /** PUT `/api/categories/{id}`. */
  update(id: string, body: { name: string; description?: string | null }): Observable<void> {
    return this.httpClient.put<void>(`${this.baseUrl}/${encodeURIComponent(id)}`, body);
  }

  /** DELETE `/api/categories/{id}`. */
  deleteCategory(id: string): Observable<void> {
    return this.httpClient.delete<void>(`${this.baseUrl}/${encodeURIComponent(id)}`);
  }

  /** POST multipart `/api/categories/{id}/image`. */
  uploadCategoryImage(id: string, file: File): Observable<CategoryOption> {
    const fd = new FormData();
    fd.append('file', file);
    return this.httpClient.post<CategoryOption>(`${this.baseUrl}/${encodeURIComponent(id)}/image`, fd);
  }
}
