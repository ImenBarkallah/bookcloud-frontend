import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../../environments/environment';

export type ModerationReportStatus = 'OPEN' | 'RESOLVED' | 'REJECTED';

export interface ModerationReport {
  id: string;
  entityType: string;
  entityId: string;
  reason: string;
  details: string | null;
  status: ModerationReportStatus;
  reporterUid: string | null;
  createdAt: string | null;
  resolvedAt: string | null;
  resolvedByUid: string | null;
  resolutionNote: string | null;
}

@Injectable({ providedIn: 'root' })
export class AdminModerationApiService {
  private readonly base = environment.apiBaseUrl;

  constructor(private readonly http: HttpClient) {}

  listReports(status?: ModerationReportStatus | null): Observable<ModerationReport[]> {
    let params = new HttpParams();
    if (status) {
      params = params.set('status', status);
    }
    return this.http.get<ModerationReport[]>(`${this.base}/api/moderation/reports`, { params });
  }

  resolveReport(id: string, body: { action: 'RESOLVE' | 'REJECT'; note?: string | null; hideContent?: boolean | null }): Observable<ModerationReport> {
    return this.http.put<ModerationReport>(`${this.base}/api/moderation/reports/${encodeURIComponent(id)}/resolve`, body);
  }

  setHidden(entityType: string, entityId: string, hidden: boolean): Observable<void> {
    return this.http.put<void>(
      `${this.base}/api/moderation/content/${encodeURIComponent(entityType)}/${encodeURIComponent(entityId)}/hidden/${hidden}`,
      {},
    );
  }
}

