import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../../environments/environment';
import { Role } from '../../../../enums/role.enum';

export interface AdminUserRow {
  uid: string;
  email: string | null;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  role: Role;
  blocked: boolean;
}

export interface UpdateAdminUserRequestDto {
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
  email?: string | null;
}

@Injectable({ providedIn: 'root' })
export class AdminUsersApiService {
  private readonly base = environment.apiBaseUrl;

  constructor(private readonly http: HttpClient) {}

  listAll(): Observable<AdminUserRow[]> {
    return this.http.get<AdminUserRow[]>(`${this.base}/api/users`);
  }

  get(uid: string): Observable<AdminUserRow> {
    return this.http.get<AdminUserRow>(`${this.base}/api/users/${encodeURIComponent(uid)}`);
  }

  update(uid: string, body: UpdateAdminUserRequestDto): Observable<AdminUserRow> {
    return this.http.put<AdminUserRow>(`${this.base}/api/users/${encodeURIComponent(uid)}`, body);
  }

  updateRole(uid: string, role: Role): Observable<AdminUserRow> {
    return this.http.put<AdminUserRow>(`${this.base}/api/users/${encodeURIComponent(uid)}/role`, { role });
  }

  setBlocked(uid: string, blocked: boolean): Observable<AdminUserRow> {
    return this.http.put<AdminUserRow>(
      `${this.base}/api/users/${encodeURIComponent(uid)}/blocked/${blocked}`,
      {},
    );
  }

  delete(uid: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/api/users/${encodeURIComponent(uid)}`);
  }
}

