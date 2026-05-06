import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

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

@Injectable({ providedIn: 'root' })
export class NewsApiService {
  private readonly base = environment.apiBaseUrl;
  constructor(private readonly http: HttpClient) {}

  listActive(type?: NewsType | null): Observable<NewsDto[]> {
    let params = new HttpParams();
    if (type) params = params.set('type', type);
    return this.http.get<NewsDto[]>(`${this.base}/api/news`, { params });
  }
}

