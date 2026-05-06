import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, forkJoin, map, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { environment } from '../../../../../environments/environment';

export interface AdminKpis {
  users: number;
  loans: number;
  reservations: number;
  fines: number;
}

@Injectable({ providedIn: 'root' })
export class AdminDashboardService {
  constructor(private readonly http: HttpClient) {}

  /**
   * KPI counts for admin overview.
   * Uses existing endpoints; falls back to 0 if any call fails.
   */
  getKpis(): Observable<AdminKpis> {
    const users$ = this.http.get<unknown[]>(`${environment.apiBaseUrl}/api/users`).pipe(
      map((l) => l.length),
      catchError(() => of(0)),
    );
    const loans$ = this.http.get<unknown[]>(`${environment.apiBaseUrl}/api/loans`).pipe(
      map((l) => l.length),
      catchError(() => of(0)),
    );
    const reservations$ = this.http.get<unknown[]>(`${environment.apiBaseUrl}/api/reservations`).pipe(
      map((l) => l.length),
      catchError(() => of(0)),
    );
    const fines$ = this.http.get<unknown[]>(`${environment.apiBaseUrl}/api/fines`).pipe(
      map((l) => l.length),
      catchError(() => of(0)),
    );
    return forkJoin({ users: users$, loans: loans$, reservations: reservations$, fines: fines$ });
  }
}

