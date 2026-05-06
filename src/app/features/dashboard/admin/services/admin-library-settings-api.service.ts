import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../../environments/environment';

export interface LibrarySettingsDto {
  id: string;
  defaultLoanDays: number | null;
  maxActiveLoansDefault: number | null;
  reservationExpiryDays: number | null;
  finePerDay: number | null;
  updatedAt: string | null;
}

export interface UpdateLibrarySettingsRequestDto {
  defaultLoanDays?: number | null;
  maxActiveLoansDefault?: number | null;
  reservationExpiryDays?: number | null;
  finePerDay?: number | null;
}

@Injectable({ providedIn: 'root' })
export class AdminLibrarySettingsApiService {
  private readonly base = environment.apiBaseUrl;

  constructor(private readonly http: HttpClient) {}

  get(): Observable<LibrarySettingsDto> {
    return this.http.get<LibrarySettingsDto>(`${this.base}/api/admin/settings/library`);
  }

  update(body: UpdateLibrarySettingsRequestDto): Observable<LibrarySettingsDto> {
    return this.http.put<LibrarySettingsDto>(`${this.base}/api/admin/settings/library`, body);
  }
}

