import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Reservation } from '../../models/reservation.model';

export interface ReservationHistoryLine {
  id: string;
  type: string;
  summary: string | null;
  occurredAt: string | null;
}

/** Aligné sur {@code AdminReservationListItemDto} / détail admin (dates ISO). */
export interface AdminReservationRow {
  id: string;
  bookId: string;
  bookTitle?: string | null;
  bookAuthor?: string | null;
  coverUrl?: string | null;
  userUid: string;
  userDisplayName?: string | null;
  userEmail?: string | null;
  reservedAt: string | null;
  expiresAt: string | null;
  queuePosition: number | null;
  status: string;
  pickupBranchId: string | null;
}

export interface AdminReservationDetail extends AdminReservationRow {
  history: ReservationHistoryLine[];
}

/** Aligné sur {@code ReservationController} — `/api/reservations`. */
@Injectable({ providedIn: 'root' })
export class ReservationApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  myReservations(): Observable<Reservation[]> {
    return this.http.get<Reservation[]>(`${this.base}/api/reservations/me`);
  }

  /** GET `/api/reservations` — ADMIN / LIBRARIAN (liste enrichie). */
  listAll(): Observable<AdminReservationRow[]> {
    return this.http.get<AdminReservationRow[]>(`${this.base}/api/reservations`);
  }

  getById(id: string): Observable<Reservation> {
    return this.http.get<Reservation>(`${this.base}/api/reservations/${encodeURIComponent(id)}`);
  }

  /** GET `/api/reservations/{id}/admin-detail` — détail + historique. */
  getAdminDetail(reservationId: string): Observable<AdminReservationDetail> {
    return this.http.get<AdminReservationDetail>(
      `${this.base}/api/reservations/${encodeURIComponent(reservationId)}/admin-detail`,
    );
  }

  create(bookId: string, pickupBranchId?: string | null): Observable<Reservation> {
    const body: { bookId: string; pickupBranchId?: string } = { bookId };
    if (pickupBranchId) {
      body.pickupBranchId = pickupBranchId;
    }
    return this.http.post<Reservation>(`${this.base}/api/reservations`, body);
  }

  cancel(id: string): Observable<Reservation> {
    return this.http.post<Reservation>(
      `${this.base}/api/reservations/${encodeURIComponent(id)}/cancel`,
      {},
    );
  }

  complete(id: string): Observable<Reservation> {
    return this.http.post<Reservation>(
      `${this.base}/api/reservations/${encodeURIComponent(id)}/complete`,
      {},
    );
  }

  approve(reservationId: string): Observable<Reservation> {
    return this.http.post<Reservation>(
      `${this.base}/api/reservations/${encodeURIComponent(reservationId)}/approve`,
      {},
    );
  }

  reject(reservationId: string): Observable<Reservation> {
    return this.http.post<Reservation>(
      `${this.base}/api/reservations/${encodeURIComponent(reservationId)}/reject`,
      {},
    );
  }

  convertToLoan(reservationId: string): Observable<string> {
    return this.http.post(
      `${this.base}/api/reservations/${encodeURIComponent(reservationId)}/convert-to-loan`,
      {},
      { responseType: 'text' as const },
    );
  }
}
