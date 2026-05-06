import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { CreateLoanRequestDto } from '../../dto/create-loan-request.dto';
import { Loan } from '../../models/loan.model';

/** Aligné sur {@code UserLoanItemDto} côté Spring. */
export interface UserLoanItem {
  loanId: string;
  bookId: string;
  bookTitle: string;
  bookAuthor: string;
  coverUrl: string | null;
  status: 'ACTIVE' | 'RETURNED' | 'OVERDUE' | string;
  borrowedAt: string | null;
  dueAt: string | null;
  returnedAt: string | null;
  renewalCount: number;
  maxRenewals: number;
  branchId: string | null;
  canRenew: boolean;
  canReturn: boolean;
}

export interface LoanHistoryLine {
  id: string;
  type: string;
  summary: string | null;
  occurredAt: string | null;
}

/** Aligné sur {@code AdminLoanListItemDto} / détail admin (dates ISO). */
export interface AdminLoanRow {
  id: string;
  bookId: string;
  bookTitle?: string | null;
  bookAuthor?: string | null;
  coverUrl?: string | null;
  userUid: string;
  userDisplayName?: string | null;
  userEmail?: string | null;
  borrowedAt: string | null;
  dueAt: string | null;
  returnedAt: string | null;
  status: string;
  branchId: string | null;
  copyId: string | null;
  renewalCount: number;
}

export interface AdminLoanDetail extends AdminLoanRow {
  history: LoanHistoryLine[];
}

/** Aligné sur {@code LoanController} — `/api/loans`. */
@Injectable({ providedIn: 'root' })
export class LoanApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  myLoans(): Observable<UserLoanItem[]> {
    return this.http.get<UserLoanItem[]>(`${this.base}/api/loans/me`);
  }

  getById(id: string): Observable<Loan> {
    return this.http.get<Loan>(`${this.base}/api/loans/${encodeURIComponent(id)}`);
  }

  /** GET `/api/loans` — ADMIN / LIBRARIAN (liste enrichie). */
  listAll(): Observable<AdminLoanRow[]> {
    return this.http.get<AdminLoanRow[]>(`${this.base}/api/loans`);
  }

  /** GET `/api/loans/{id}/admin-detail` — détail + historique. */
  getAdminDetail(loanId: string): Observable<AdminLoanDetail> {
    return this.http.get<AdminLoanDetail>(
      `${this.base}/api/loans/${encodeURIComponent(loanId)}/admin-detail`,
    );
  }

  borrow(req: CreateLoanRequestDto): Observable<Loan> {
    return this.http.post<Loan>(`${this.base}/api/loans`, req);
  }

  renew(loanId: string): Observable<unknown> {
    return this.http.post(`${this.base}/api/loans/${encodeURIComponent(loanId)}/renew`, {});
  }

  returnLoan(loanId: string): Observable<unknown> {
    return this.http.post(`${this.base}/api/loans/${encodeURIComponent(loanId)}/return`, {});
  }

  deleteLoan(loanId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/api/loans/${encodeURIComponent(loanId)}`);
  }
}
