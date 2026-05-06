import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface MeResponse {
  uid: string;
  email: string;
}

@Injectable({ providedIn: 'root' })
export class BackendApiService {
  constructor(private http: HttpClient) {}

  health(): Observable<{ status: string }> {
    return this.http.get<{ status: string }>(
      `${environment.apiBaseUrl}/api/public/health`
    );
  }

  /** Nécessite un utilisateur connecté (Bearer) si firebase.enabled=true côté backend. */
  me(): Observable<MeResponse> {
    return this.http.get<MeResponse>(`${environment.apiBaseUrl}/api/me`);
  }
}
