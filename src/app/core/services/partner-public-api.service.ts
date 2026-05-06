import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import { Partner, PartnerTier } from '../../models/home-sections.models';

/** Aligné sur {@code PartnerPublicController} — `/api/public/partners`. */
@Injectable({ providedIn: 'root' })
export class PartnerPublicApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  list(): Observable<Partner[]> {
    return this.http.get<Partner[]>(`${this.base}/api/public/partners`).pipe(
      map((rows) =>
        (rows ?? []).map((p) => ({
          ...p,
          tier: normalizePartnerTier(p.tier),
          logoUrl: typeof p.logoUrl === 'string' ? p.logoUrl.trim() : p.logoUrl,
          name: typeof p.name === 'string' ? p.name.trim() : p.name,
        })),
      ),
    );
  }
}

function normalizePartnerTier(raw: unknown): PartnerTier {
  const t = String(raw ?? '').trim().toUpperCase();
  if (t === 'GOLD' || t === 'SILVER' || t === 'BRONZE') {
    return t;
  }
  return 'BRONZE';
}
