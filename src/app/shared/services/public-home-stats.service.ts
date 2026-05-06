import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

export interface PublicHomeStatsDto {
  books: number;
  members: number;
}

@Injectable({ providedIn: 'root' })
export class PublicHomeStatsService {
  private readonly base = environment.apiBaseUrl;

  constructor(private readonly http: HttpClient) {}

  getHomeStats(): Observable<PublicHomeStatsDto> {
    return this.http.get<PublicHomeStatsDto>(`${this.base}/api/public/home-stats`);
  }
}

