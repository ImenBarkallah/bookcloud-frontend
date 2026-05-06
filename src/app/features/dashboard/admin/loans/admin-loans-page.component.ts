import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  OnInit,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { AuthToastService } from '../../../../core/services/auth-toast.service';
import {
  AdminLoanDetail,
  AdminLoanRow,
  LoanApiService,
} from '../../../../core/services/loan-api.service';

type ViewMode = 'table' | 'kanban';
type StatusFilter = 'ALL' | 'ACTIVE' | 'OVERDUE' | 'RETURNED';

@Component({
  selector: 'app-admin-loans-page',
  templateUrl: './admin-loans-page.component.html',
  styleUrls: ['./admin-loans-page.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminLoansPageComponent implements OnInit {
  private readonly loansApi = inject(LoanApiService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toast = inject(AuthToastService);

  view: ViewMode = 'table';
  q = '';
  statusFilter: StatusFilter = 'ALL';

  allLoans: AdminLoanRow[] = [];
  filteredLoans: AdminLoanRow[] = [];

  loading = true;
  error = false;

  deleteModalOpen = false;
  deleteTarget: AdminLoanRow | null = null;
  pendingDelete = false;

  detailModalOpen = false;
  detailLoanId: string | null = null;
  detailData: AdminLoanDetail | null = null;
  detailLoading = false;
  detailError = false;

  pendingIds = new Set<string>();

  private readonly search$ = new Subject<string>();

  ngOnInit(): void {
    this.search$
      .pipe(debounceTime(250), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.applyFilters());

    this.load();
  }

  setView(v: ViewMode): void {
    this.view = v;
  }

  onQueryChange(value: string): void {
    this.q = value;
    this.search$.next(value);
  }

  setStatusFilter(s: StatusFilter): void {
    this.statusFilter = s;
    this.applyFilters();
    this.cdr.markForCheck();
  }

  trackById(_: number, l: AdminLoanRow): string {
    return l.id;
  }

  normStatus(l: AdminLoanRow): string {
    return String(l.status ?? '').toUpperCase();
  }

  /** KPI sur la liste complète (hors recherche). */
  kpiActive(): number {
    return this.allLoans.filter((l) => this.normStatus(l) === 'ACTIVE').length;
  }

  kpiOverdue(): number {
    return this.allLoans.filter((l) => this.normStatus(l) === 'OVERDUE').length;
  }

  kpiReturned(): number {
    return this.allLoans.filter((l) => this.normStatus(l) === 'RETURNED').length;
  }

  kpiTotal(): number {
    return this.allLoans.length;
  }

  loansColumn(status: 'ACTIVE' | 'OVERDUE' | 'RETURNED'): AdminLoanRow[] {
    return this.filteredLoans.filter((l) => this.normStatus(l) === status);
  }

  canRenew(l: AdminLoanRow): boolean {
    return this.normStatus(l) === 'ACTIVE';
  }

  canReturn(l: AdminLoanRow): boolean {
    const s = this.normStatus(l);
    return s === 'ACTIVE' || s === 'OVERDUE';
  }

  /** Annuler / supprimer : backend accepte tout état (réajuste le stock si actif). */
  canCancelLoan(_l: AdminLoanRow): boolean {
    return true;
  }

  isPending(id: string): boolean {
    return this.pendingIds.has(id);
  }

  userLabel(l: AdminLoanRow): string {
    const name = (l.userDisplayName ?? '').trim();
    if (name) {
      return name;
    }
    const mail = (l.userEmail ?? '').trim();
    if (mail) {
      return mail;
    }
    return this.uidShort(l.userUid);
  }

  bookTitle(l: AdminLoanRow): string {
    const t = (l.bookTitle ?? '').trim();
    return t || l.bookId;
  }

  statusLabelKey(l: AdminLoanRow): string {
    const s = this.normStatus(l);
    if (s === 'ACTIVE') {
      return 'ADMIN.LOANS.STATUS_ACTIVE';
    }
    if (s === 'OVERDUE') {
      return 'ADMIN.LOANS.STATUS_OVERDUE';
    }
    if (s === 'RETURNED') {
      return 'ADMIN.LOANS.STATUS_RETURNED';
    }
    return 'ADMIN.LOANS.STATUS_UNKNOWN';
  }

  renew(l: AdminLoanRow): void {
    if (!this.canRenew(l) || this.isPending(l.id)) {
      return;
    }
    this.pendingIds.add(l.id);
    this.cdr.markForCheck();
    this.loansApi.renew(l.id).subscribe({
      next: () => {
        this.toast.showKey('ADMIN.LOANS.TOAST_RENEW', 'success');
        this.pendingIds.delete(l.id);
        this.afterMutationRefreshDetail(l.id);
        this.load();
      },
      error: (err: unknown) => {
        this.toast.showPlain(this.errBody(err), 'error');
        this.pendingIds.delete(l.id);
        this.cdr.markForCheck();
      },
    });
  }

  returnBook(l: AdminLoanRow): void {
    if (!this.canReturn(l) || this.isPending(l.id)) {
      return;
    }
    this.pendingIds.add(l.id);
    this.cdr.markForCheck();
    this.loansApi.returnLoan(l.id).subscribe({
      next: () => {
        this.toast.showKey('ADMIN.LOANS.TOAST_RETURN', 'success');
        this.pendingIds.delete(l.id);
        this.afterMutationRefreshDetail(l.id);
        this.load();
      },
      error: (err: unknown) => {
        this.toast.showPlain(this.errBody(err), 'error');
        this.pendingIds.delete(l.id);
        this.cdr.markForCheck();
      },
    });
  }

  openCancelModal(l: AdminLoanRow): void {
    if (!this.canCancelLoan(l) || this.isPending(l.id)) {
      return;
    }
    this.deleteTarget = l;
    this.deleteModalOpen = true;
    this.cdr.markForCheck();
  }

  closeDeleteModal(): void {
    this.deleteModalOpen = false;
    this.deleteTarget = null;
    this.cdr.markForCheck();
  }

  confirmDelete(): void {
    const id = this.deleteTarget?.id;
    if (!id) {
      return;
    }
    this.pendingDelete = true;
    this.cdr.markForCheck();
    this.loansApi.deleteLoan(id).subscribe({
      next: () => {
        this.toast.showKey('ADMIN.LOANS.TOAST_DELETED', 'success');
        this.pendingDelete = false;
        this.closeDeleteModal();
        if (this.detailLoanId === id) {
          this.closeDetailModal();
        }
        this.load();
      },
      error: (err: unknown) => {
        this.toast.showPlain(this.errBody(err), 'error');
        this.pendingDelete = false;
        this.cdr.markForCheck();
      },
    });
  }

  openDetail(l: AdminLoanRow): void {
    this.detailModalOpen = true;
    this.detailLoanId = l.id;
    this.detailData = null;
    this.detailError = false;
    this.detailLoading = true;
    this.cdr.markForCheck();
    this.loansApi.getAdminDetail(l.id).subscribe({
      next: (d) => {
        this.detailData = d;
        this.detailLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.detailError = true;
        this.detailLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  closeDetailModal(): void {
    this.detailModalOpen = false;
    this.detailLoanId = null;
    this.detailData = null;
    this.detailError = false;
    this.detailLoading = false;
    this.cdr.markForCheck();
  }

  renewFromDetail(): void {
    const d = this.detailData;
    if (!d || !this.canRenew(d) || this.isPending(d.id)) {
      return;
    }
    this.pendingIds.add(d.id);
    this.cdr.markForCheck();
    this.loansApi.renew(d.id).subscribe({
      next: () => {
        this.toast.showKey('ADMIN.LOANS.TOAST_RENEW', 'success');
        this.pendingIds.delete(d.id);
        this.reloadDetailOnly(d.id);
        this.load();
      },
      error: (err: unknown) => {
        this.toast.showPlain(this.errBody(err), 'error');
        this.pendingIds.delete(d.id);
        this.cdr.markForCheck();
      },
    });
  }

  returnFromDetail(): void {
    const d = this.detailData;
    if (!d || !this.canReturn(d) || this.isPending(d.id)) {
      return;
    }
    this.pendingIds.add(d.id);
    this.cdr.markForCheck();
    this.loansApi.returnLoan(d.id).subscribe({
      next: () => {
        this.toast.showKey('ADMIN.LOANS.TOAST_RETURN', 'success');
        this.pendingIds.delete(d.id);
        this.reloadDetailOnly(d.id);
        this.load();
      },
      error: (err: unknown) => {
        this.toast.showPlain(this.errBody(err), 'error');
        this.pendingIds.delete(d.id);
        this.cdr.markForCheck();
      },
    });
  }

  cancelFromDetail(): void {
    const d = this.detailData;
    if (!d || this.isPending(d.id)) {
      return;
    }
    this.deleteTarget = d;
    this.deleteModalOpen = true;
    this.cdr.markForCheck();
  }

  uidShort(uid: string | null | undefined): string {
    const u = (uid ?? '').trim();
    if (!u) {
      return '—';
    }
    return u.length > 12 ? `${u.slice(0, 8)}…` : u;
  }

  private load(): void {
    this.loading = true;
    this.error = false;
    this.cdr.markForCheck();
    this.loansApi.listAll().subscribe({
      next: (rows) => {
        this.allLoans = [...(rows ?? [])].sort((a, b) => {
          const ta = this.ts(a.borrowedAt);
          const tb = this.ts(b.borrowedAt);
          return tb - ta;
        });
        this.applyFilters();
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.error = true;
        this.loading = false;
        this.allLoans = [];
        this.filteredLoans = [];
        this.cdr.markForCheck();
      },
    });
  }

  private applyFilters(): void {
    const needle = (this.q ?? '').trim().toLowerCase();
    let rows = [...this.allLoans];
    if (this.statusFilter !== 'ALL') {
      rows = rows.filter((l) => this.normStatus(l) === this.statusFilter);
    }
    if (needle) {
      rows = rows.filter((l) => {
        const hay = [
          l.id,
          l.bookId,
          l.bookTitle,
          l.bookAuthor,
          l.userUid,
          l.userDisplayName,
          l.userEmail,
          l.branchId,
          l.copyId,
          l.status,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return hay.includes(needle);
      });
    }
    this.filteredLoans = rows;
    this.cdr.markForCheck();
  }

  private ts(iso: string | null | undefined): number {
    if (!iso) {
      return 0;
    }
    const n = Date.parse(iso);
    return Number.isFinite(n) ? n : 0;
  }

  private errBody(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      const body = err.error;
      if (typeof body === 'string' && body.trim()) {
        return body.trim();
      }
      const o = body as { message?: string; error?: string } | undefined;
      const raw = o?.message ?? o?.error;
      if (typeof raw === 'string' && raw.trim()) {
        return raw.trim();
      }
    }
    return 'Request failed';
  }

  private reloadDetailOnly(loanId: string): void {
    if (this.detailLoanId !== loanId || !this.detailModalOpen) {
      return;
    }
    this.detailLoading = true;
    this.cdr.markForCheck();
    this.loansApi.getAdminDetail(loanId).subscribe({
      next: (d) => {
        this.detailData = d;
        this.detailLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.detailLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  private afterMutationRefreshDetail(loanId: string): void {
    if (this.detailLoanId === loanId && this.detailModalOpen) {
      this.reloadDetailOnly(loanId);
    }
  }
}
