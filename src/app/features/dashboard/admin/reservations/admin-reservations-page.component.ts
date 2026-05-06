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
  AdminReservationDetail,
  AdminReservationRow,
  ReservationApiService,
} from '../../../../core/services/reservation-api.service';

type StatusFilter = 'ALL' | 'PENDING' | 'APPROVED' | 'CANCELLED' | 'EXPIRED';

@Component({
  selector: 'app-admin-reservations-page',
  templateUrl: './admin-reservations-page.component.html',
  styleUrls: ['./admin-reservations-page.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminReservationsPageComponent implements OnInit {
  private readonly reservationsApi = inject(ReservationApiService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toast = inject(AuthToastService);

  q = '';
  statusFilter: StatusFilter = 'ALL';

  all: AdminReservationRow[] = [];
  filtered: AdminReservationRow[] = [];

  loading = true;
  error = false;

  pendingIds = new Set<string>();

  detailModalOpen = false;
  detailId: string | null = null;
  detailLoading = false;
  detailError = false;
  detail: AdminReservationDetail | null = null;

  private readonly search$ = new Subject<string>();

  ngOnInit(): void {
    this.search$
      .pipe(debounceTime(250), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.applyFilters());
    this.load();
  }

  onQueryChange(v: string): void {
    this.q = v;
    this.search$.next(v);
  }

  setStatusFilter(s: StatusFilter): void {
    this.statusFilter = s;
    this.applyFilters();
    this.cdr.markForCheck();
  }

  trackById(_: number, r: AdminReservationRow): string {
    return r.id;
  }

  normStatus(r: AdminReservationRow): string {
    return String(r.status ?? '').toUpperCase();
  }

  statusLabelKey(r: AdminReservationRow): string {
    switch (this.normStatus(r)) {
      case 'PENDING':
        return 'ADMIN.RESERVATIONS.STATUS_PENDING';
      case 'APPROVED':
        return 'ADMIN.RESERVATIONS.STATUS_APPROVED';
      case 'CANCELLED':
        return 'ADMIN.RESERVATIONS.STATUS_CANCELLED';
      case 'EXPIRED':
        return 'ADMIN.RESERVATIONS.STATUS_EXPIRED';
      default:
        return 'ADMIN.RESERVATIONS.STATUS_UNKNOWN';
    }
  }

  userLabel(r: AdminReservationRow): string {
    const name = (r.userDisplayName ?? '').trim();
    if (name) return name;
    const mail = (r.userEmail ?? '').trim();
    if (mail) return mail;
    return this.uidShort(r.userUid);
  }

  bookTitle(r: AdminReservationRow): string {
    const t = (r.bookTitle ?? '').trim();
    return t || r.bookId;
  }

  uidShort(uid: string | null | undefined): string {
    const u = (uid ?? '').trim();
    if (!u) return '—';
    return u.length > 12 ? `${u.slice(0, 8)}…` : u;
  }

  col(status: 'PENDING' | 'APPROVED' | 'CANCELLED' | 'EXPIRED'): AdminReservationRow[] {
    return this.filtered.filter((r) => this.normStatus(r) === status);
  }

  canApprove(r: AdminReservationRow): boolean {
    return this.normStatus(r) === 'PENDING';
  }

  canReject(r: AdminReservationRow): boolean {
    const s = this.normStatus(r);
    return s === 'PENDING' || s === 'APPROVED';
  }

  canConvert(r: AdminReservationRow): boolean {
    return this.normStatus(r) === 'APPROVED';
  }

  isPending(id: string): boolean {
    return this.pendingIds.has(id);
  }

  approve(r: AdminReservationRow): void {
    if (!this.canApprove(r) || this.isPending(r.id)) return;
    this.pendingIds.add(r.id);
    this.cdr.markForCheck();
    this.reservationsApi.approve(r.id).subscribe({
      next: () => {
        this.toast.showKey('ADMIN.RESERVATIONS.TOAST_APPROVED', 'success');
        this.pendingIds.delete(r.id);
        this.reloadDetailIfOpen(r.id);
        this.load();
      },
      error: (err: unknown) => {
        this.toast.showPlain(this.errBody(err), 'error');
        this.pendingIds.delete(r.id);
        this.cdr.markForCheck();
      },
    });
  }

  reject(r: AdminReservationRow): void {
    if (!this.canReject(r) || this.isPending(r.id)) return;
    this.pendingIds.add(r.id);
    this.cdr.markForCheck();
    this.reservationsApi.reject(r.id).subscribe({
      next: () => {
        this.toast.showKey('ADMIN.RESERVATIONS.TOAST_REJECTED', 'success');
        this.pendingIds.delete(r.id);
        this.reloadDetailIfOpen(r.id);
        this.load();
      },
      error: (err: unknown) => {
        this.toast.showPlain(this.errBody(err), 'error');
        this.pendingIds.delete(r.id);
        this.cdr.markForCheck();
      },
    });
  }

  convert(r: AdminReservationRow): void {
    if (!this.canConvert(r) || this.isPending(r.id)) return;
    this.pendingIds.add(r.id);
    this.cdr.markForCheck();
    this.reservationsApi.convertToLoan(r.id).subscribe({
      next: (loanId) => {
        this.toast.showKey('ADMIN.RESERVATIONS.TOAST_CONVERTED', 'success');
        this.pendingIds.delete(r.id);
        if (this.detailId === r.id) {
          this.closeDetail();
        }
        this.load();
        // Option: redirect to loan detail page later if needed
        void loanId;
      },
      error: (err: unknown) => {
        this.toast.showPlain(this.errBody(err), 'error');
        this.pendingIds.delete(r.id);
        this.cdr.markForCheck();
      },
    });
  }

  openDetail(r: AdminReservationRow): void {
    this.detailModalOpen = true;
    this.detailId = r.id;
    this.detailLoading = true;
    this.detailError = false;
    this.detail = null;
    this.cdr.markForCheck();
    this.reservationsApi.getAdminDetail(r.id).subscribe({
      next: (d) => {
        this.detail = d;
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

  closeDetail(): void {
    this.detailModalOpen = false;
    this.detailId = null;
    this.detailLoading = false;
    this.detailError = false;
    this.detail = null;
    this.cdr.markForCheck();
  }

  approveFromDetail(): void {
    const d = this.detail;
    if (!d) return;
    this.approve(d);
  }

  rejectFromDetail(): void {
    const d = this.detail;
    if (!d) return;
    this.reject(d);
  }

  convertFromDetail(): void {
    const d = this.detail;
    if (!d) return;
    this.convert(d);
  }

  private load(): void {
    this.loading = true;
    this.error = false;
    this.cdr.markForCheck();
    this.reservationsApi.listAll().subscribe({
      next: (rows) => {
        this.all = [...(rows ?? [])].sort((a, b) => this.ts(b.reservedAt) - this.ts(a.reservedAt));
        this.applyFilters();
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.error = true;
        this.loading = false;
        this.all = [];
        this.filtered = [];
        this.cdr.markForCheck();
      },
    });
  }

  private applyFilters(): void {
    const needle = (this.q ?? '').trim().toLowerCase();
    let rows = [...this.all];
    if (this.statusFilter !== 'ALL') {
      rows = rows.filter((r) => this.normStatus(r) === this.statusFilter);
    }
    if (needle) {
      rows = rows.filter((r) => {
        const hay = [
          r.id,
          r.bookId,
          r.bookTitle,
          r.bookAuthor,
          r.userUid,
          r.userDisplayName,
          r.userEmail,
          r.pickupBranchId,
          r.status,
          r.queuePosition?.toString(),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return hay.includes(needle);
      });
    }
    this.filtered = rows;
    this.cdr.markForCheck();
  }

  private ts(iso: string | null | undefined): number {
    if (!iso) return 0;
    const n = Date.parse(iso);
    return Number.isFinite(n) ? n : 0;
  }

  private errBody(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      const body = err.error;
      if (typeof body === 'string' && body.trim()) return body.trim();
      const o = body as { message?: string; error?: string } | undefined;
      const raw = o?.message ?? o?.error;
      if (typeof raw === 'string' && raw.trim()) return raw.trim();
    }
    return 'Request failed';
  }

  private reloadDetailIfOpen(id: string): void {
    if (!this.detailModalOpen || this.detailId !== id) return;
    this.detailLoading = true;
    this.cdr.markForCheck();
    this.reservationsApi.getAdminDetail(id).subscribe({
      next: (d) => {
        this.detail = d;
        this.detailLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.detailLoading = false;
        this.cdr.markForCheck();
      },
    });
  }
}

