import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../../environments/environment';

export type NewsType = 'ANNOUNCEMENT' | 'EVENT' | 'TIP';

export interface NewsDto {
  id: string;
  title: string;
  content: string;
  type: NewsType;
  imageUrl: string | null;
  createdAt: string | null;
  active: boolean;
}

export interface CreateNewsRequestDto {
  title: string;
  content: string;
  type: NewsType;
  imageUrl?: string | null;
  active: boolean;
}

export interface UpdateNewsRequestDto {
  title?: string | null;
  content?: string | null;
  type?: NewsType | null;
  imageUrl?: string | null;
  active?: boolean | null;
}

@Injectable({ providedIn: 'root' })
export class AdminNewsApiService {
  private readonly base = environment.apiBaseUrl;
  constructor(private readonly http: HttpClient) {}

  listAdmin(q?: { active?: boolean | null; type?: NewsType | null }): Observable<NewsDto[]> {
    let params = new HttpParams();
    if (q?.active != null) params = params.set('active', String(q.active));
    if (q?.type) params = params.set('type', q.type);
    return this.http.get<NewsDto[]>(`${this.base}/api/news/admin`, { params });
  }

  getAdmin(id: string): Observable<NewsDto> {
    return this.http.get<NewsDto>(`${this.base}/api/news/admin/${encodeURIComponent(id)}`);
  }

  create(body: CreateNewsRequestDto): Observable<{ id: string }> {
    return this.http.post<{ id: string }>(`${this.base}/api/news`, body);
  }

  update(id: string, body: UpdateNewsRequestDto): Observable<NewsDto> {
    return this.http.put<NewsDto>(`${this.base}/api/news/${encodeURIComponent(id)}`, body);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/api/news/${encodeURIComponent(id)}`);
  }

  uploadImage(id: string, file: File): Observable<NewsDto> {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<NewsDto>(`${this.base}/api/news/${encodeURIComponent(id)}/image`, fd);
  }
}

