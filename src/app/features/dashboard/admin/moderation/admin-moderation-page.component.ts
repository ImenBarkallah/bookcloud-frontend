import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { AuthToastService } from '../../../../core/services/auth-toast.service';
import {
  AdminModerationApiService,
  ModerationReport,
  ModerationReportStatus,
} from '../services/admin-moderation-api.service';

type StatusTab = ModerationReportStatus | 'ALL';

@Component({
  selector: 'app-admin-moderation-page',
  templateUrl: './admin-moderation-page.component.html',
  styleUrls: ['./admin-moderation-page.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminModerationPageComponent implements OnInit {
  private readonly api = inject(AdminModerationApiService);
  private readonly toast = inject(AuthToastService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  loading = true;
  error = false;

  tab: StatusTab = 'OPEN';
  q = '';

  all: ModerationReport[] = [];
  filtered: ModerationReport[] = [];

  pending = new Set<string>();
  private readonly search$ = new Subject<string>();

  // detail modal
  detailOpen = false;
  detail: ModerationReport | null = null;
  resolutionNote = '';
  hideOnResolve = true;

  ngOnInit(): void {
    this.search$
      .pipe(debounceTime(200), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.applyFilters());
    this.load();
  }

  setTab(t: StatusTab): void {
    this.tab = t;
    this.load();
  }

  onQueryChange(v: string): void {
    this.q = v;
    this.search$.next(v);
  }

  load(): void {
    this.loading = true;
    this.error = false;
    this.cdr.markForCheck();
    const status = this.tab === 'ALL' ? null : this.tab;
    this.api.listReports(status).subscribe({
      next: (rows) => {
        this.all = rows ?? [];
        this.applyFilters();
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.all = [];
        this.filtered = [];
        this.loading = false;
        this.error = true;
        this.cdr.markForCheck();
      },
    });
  }

  openDetail(r: ModerationReport): void {
    this.detailOpen = true;
    this.detail = r;
    this.resolutionNote = '';
    this.hideOnResolve = true;
    this.cdr.markForCheck();
  }

  closeDetail(): void {
    this.detailOpen = false;
    this.detail = null;
    this.resolutionNote = '';
    this.cdr.markForCheck();
  }

  resolve(r: ModerationReport): void {
    if (this.pending.has(r.id)) return;
    this.pending.add(r.id);
    this.cdr.markForCheck();
    this.api
      .resolveReport(r.id, { action: 'RESOLVE', note: this.resolutionNote || null, hideContent: this.hideOnResolve })
      .subscribe({
        next: (updated) => {
          this.pending.delete(r.id);
          this.toast.showPlain('Report résolu.', 'success');
          this.patch(updated);
          this.closeDetail();
          this.applyFilters();
        },
        error: () => {
          this.pending.delete(r.id);
          this.toast.showPlain('Impossible de résoudre.', 'error');
          this.cdr.markForCheck();
        },
      });
  }

  reject(r: ModerationReport): void {
    if (this.pending.has(r.id)) return;
    this.pending.add(r.id);
    this.cdr.markForCheck();
    this.api.resolveReport(r.id, { action: 'REJECT', note: this.resolutionNote || null, hideContent: false }).subscribe({
      next: (updated) => {
        this.pending.delete(r.id);
        this.toast.showPlain('Report rejeté.', 'success');
        this.patch(updated);
        this.closeDetail();
        this.applyFilters();
      },
      error: () => {
        this.pending.delete(r.id);
        this.toast.showPlain('Impossible de rejeter.', 'error');
        this.cdr.markForCheck();
      },
    });
  }

  toggleHidden(r: ModerationReport, hidden: boolean): void {
    const key = `${r.id}:hide`;
    if (this.pending.has(key)) return;
    this.pending.add(key);
    this.cdr.markForCheck();
    this.api.setHidden(r.entityType, r.entityId, hidden).subscribe({
      next: () => {
        this.pending.delete(key);
        this.toast.showPlain(hidden ? 'Contenu masqué.' : 'Contenu rétabli.', 'success');
        this.cdr.markForCheck();
      },
      error: () => {
        this.pending.delete(key);
        this.toast.showPlain('Action impossible.', 'error');
        this.cdr.markForCheck();
      },
    });
  }

  kpiOpen(): number {
    return this.all.filter((r) => r.status === 'OPEN').length;
  }
  kpiResolved(): number {
    return this.all.filter((r) => r.status === 'RESOLVED').length;
  }
  kpiRejected(): number {
    return this.all.filter((r) => r.status === 'REJECTED').length;
  }

  private patch(updated: ModerationReport): void {
    this.all = this.all.map((x) => (x.id === updated.id ? updated : x));
    this.filtered = this.filtered.map((x) => (x.id === updated.id ? updated : x));
    this.cdr.markForCheck();
  }

  private applyFilters(): void {
    const needle = (this.q ?? '').trim().toLowerCase();
    let rows = [...this.all];
    if (needle) {
      rows = rows.filter((r) => {
        const hay = [r.entityType, r.entityId, r.reason, r.details, r.status, r.reporterUid]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return hay.includes(needle);
      });
    }
    this.filtered = rows;
    this.cdr.markForCheck();
  }
}

