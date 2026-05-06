import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../../environments/environment';
import { LibraryHistoryEntry } from '../../../../models/library-history-entry.model';

export interface AdminDashboardOverview {
  totalBooks: number;
  totalCopies: number;
  availableCopies: number;
  borrowedCopies: number;

  totalUsers: number;
  newUsersThisMonth: number;
  activeUsers: number;

  activeLoans: number;
  overdueLoans: number;
  loansToday: number;

  pendingReservations: number;
  approvedReservations: number;

  totalFines: number;
  openFines: number;
  totalFineAmountCents: number;
  usersWithDebt: number;
}

export interface AdminTopBook {
  bookId: string;
  title: string;
  author: string;
  coverUrl: string | null;
  borrowCount: number;
  favoriteCount: number;
  totalCopies: number;
  availableCopies: number;
}

export interface AdminTopUser {
  userUid: string;
  displayName: string;
  email: string | null;
  totalLoans: number;
  activeLoans: number;
}

export interface AdminMonthlySeriesPoint {
  month: string; // YYYY-MM
  loans: number;
  signups: number;
  reservations: number;
  fines: number;
}

export interface AdminCategoryCount {
  categoryId: string;
  categoryName: string;
  books: number;
}

@Injectable({ providedIn: 'root' })
export class AdminDashboardService {
  constructor(private readonly http: HttpClient) {}

  getOverview(): Observable<AdminDashboardOverview> {
    return this.http.get<AdminDashboardOverview>(`${environment.apiBaseUrl}/api/admin/dashboard/overview`);
  }

  getTopBorrowedBooks(limit = 5): Observable<AdminTopBook[]> {
    const params = new HttpParams().set('limit', String(limit));
    return this.http.get<AdminTopBook[]>(`${environment.apiBaseUrl}/api/admin/dashboard/top-books/borrowed`, {
      params,
    });
  }

  getTopFavoritedBooks(limit = 5): Observable<AdminTopBook[]> {
    const params = new HttpParams().set('limit', String(limit));
    return this.http.get<AdminTopBook[]>(`${environment.apiBaseUrl}/api/admin/dashboard/top-books/favorited`, {
      params,
    });
  }

  getTopUsers(limit = 5): Observable<AdminTopUser[]> {
    const params = new HttpParams().set('limit', String(limit));
    return this.http.get<AdminTopUser[]>(`${environment.apiBaseUrl}/api/admin/dashboard/top-users`, { params });
  }

  getMonthlyActivity(months = 12): Observable<AdminMonthlySeriesPoint[]> {
    const params = new HttpParams().set('months', String(months));
    return this.http.get<AdminMonthlySeriesPoint[]>(`${environment.apiBaseUrl}/api/admin/dashboard/monthly`, {
      params,
    });
  }

  getBooksByCategory(limit = 8): Observable<AdminCategoryCount[]> {
    const params = new HttpParams().set('limit', String(limit));
    return this.http.get<AdminCategoryCount[]>(`${environment.apiBaseUrl}/api/admin/dashboard/books-by-category`, {
      params,
    });
  }

  getRecentActivity(limit = 12): Observable<LibraryHistoryEntry[]> {
    const params = new HttpParams().set('limit', String(limit));
    return this.http.get<LibraryHistoryEntry[]>(`${environment.apiBaseUrl}/api/admin/dashboard/recent-activity`, {
      params,
    });
  }
}

