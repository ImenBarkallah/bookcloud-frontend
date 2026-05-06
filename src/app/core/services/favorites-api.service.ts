import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

export type FavoriteCountResponse = { count: number };

@Injectable({ providedIn: 'root' })
export class FavoritesApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  count(): Observable<FavoriteCountResponse> {
    return this.http.get<FavoriteCountResponse>(`${this.base}/api/favorites/count`);
  }
}

