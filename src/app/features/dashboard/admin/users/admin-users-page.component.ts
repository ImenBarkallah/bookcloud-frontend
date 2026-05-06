import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { AuthToastService } from '../../../../core/services/auth-toast.service';
import { Role } from '../../../../enums/role.enum';
import { AdminUserRow, AdminUsersApiService } from '../services/admin-users-api.service';

@Component({
  selector: 'app-admin-users-page',
  templateUrl: './admin-users-page.component.html',
  styleUrls: ['./admin-users-page.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminUsersPageComponent implements OnInit {
  readonly Role = Role;
  readonly roles: Role[] = [Role.ADMIN, Role.BIBLIOTHECAIRE, Role.USER];

  private readonly api = inject(AdminUsersApiService);
  private readonly toast = inject(AuthToastService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  loading = true;
  error = false;

  q = '';
  all: AdminUserRow[] = [];
  filtered: AdminUserRow[] = [];

  private readonly search$ = new Subject<string>();

  // edit modal
  modalOpen = false;
  modalLoading = false;
  pendingSave = false;
  editing: AdminUserRow | null = null;

  formFirstName = '';
  formLastName = '';
  formEmail = '';
  formDisplayName = '';

  // delete confirm
  deleteOpen = false;
  deleteTarget: AdminUserRow | null = null;
  pendingDelete = false;

  ngOnInit(): void {
    this.search$
      .pipe(debounceTime(200), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.applyFilters());
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = false;
    this.cdr.markForCheck();
    this.api.listAll().subscribe({
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
        this.toast.showPlain('Impossible de charger les utilisateurs.', 'error');
        this.cdr.markForCheck();
      },
    });
  }

  onQueryChange(v: string): void {
    this.q = v;
    this.search$.next(v);
  }

  trackByUid(_: number, u: AdminUserRow): string {
    return u.uid;
  }

  fullName(u: AdminUserRow): string {
    const fn = (u.firstName ?? '').trim();
    const ln = (u.lastName ?? '').trim();
    const full = `${fn} ${ln}`.trim();
    return full || (u.displayName ?? '—');
  }

  roleLabel(r: Role): string {
    if (r === Role.BIBLIOTHECAIRE) return 'LIBRARIAN';
    return r;
  }

  openEdit(u: AdminUserRow): void {
    this.modalOpen = true;
    this.modalLoading = true;
    this.editing = u;
    this.cdr.markForCheck();
    this.api.get(u.uid).subscribe({
      next: (fresh) => {
        this.modalLoading = false;
        this.editing = fresh;
        this.formFirstName = (fresh.firstName ?? '') as string;
        this.formLastName = (fresh.lastName ?? '') as string;
        this.formEmail = (fresh.email ?? '') as string;
        this.formDisplayName = (fresh.displayName ?? '') as string;
        this.cdr.markForCheck();
      },
      error: () => {
        this.modalLoading = false;
        this.toast.showPlain('Impossible de charger cet utilisateur.', 'error');
        this.cdr.markForCheck();
      },
    });
  }

  closeEdit(): void {
    this.modalOpen = false;
    this.modalLoading = false;
    this.pendingSave = false;
    this.editing = null;
    this.formFirstName = '';
    this.formLastName = '';
    this.formEmail = '';
    this.formDisplayName = '';
    this.cdr.markForCheck();
  }

  save(): void {
    const u = this.editing;
    if (!u || this.pendingSave) return;
    this.pendingSave = true;
    this.cdr.markForCheck();
    this.api
      .update(u.uid, {
        firstName: this.formFirstName.trim() || null,
        lastName: this.formLastName.trim() || null,
        email: this.formEmail.trim() || null,
        displayName: this.formDisplayName.trim() || null,
      })
      .subscribe({
        next: (updated) => {
          this.pendingSave = false;
          this.toast.showPlain('Utilisateur mis à jour.', 'success');
          this.patchRow(updated);
          this.closeEdit();
          this.applyFilters();
        },
        error: () => {
          this.pendingSave = false;
          this.toast.showPlain('Erreur lors de la mise à jour.', 'error');
          this.cdr.markForCheck();
        },
      });
  }

  async changeRole(u: AdminUserRow, role: Role): Promise<void> {
    if (!u?.uid || u.role === role) return;
    this.api.updateRole(u.uid, role).subscribe({
      next: (updated) => {
        this.toast.showPlain('Rôle mis à jour.', 'success');
        this.patchRow(updated);
        this.applyFilters();
      },
      error: () => this.toast.showPlain('Impossible de changer le rôle.', 'error'),
    });
  }

  toggleBlocked(u: AdminUserRow): void {
    this.api.setBlocked(u.uid, !u.blocked).subscribe({
      next: (updated) => {
        this.toast.showPlain(updated.blocked ? 'Utilisateur désactivé.' : 'Utilisateur activé.', 'success');
        this.patchRow(updated);
        this.applyFilters();
      },
      error: () => this.toast.showPlain('Impossible de modifier le statut.', 'error'),
    });
  }

  openDelete(u: AdminUserRow): void {
    this.deleteOpen = true;
    this.deleteTarget = u;
    this.pendingDelete = false;
    this.cdr.markForCheck();
  }

  closeDelete(): void {
    this.deleteOpen = false;
    this.deleteTarget = null;
    this.pendingDelete = false;
    this.cdr.markForCheck();
  }

  confirmDelete(): void {
    const u = this.deleteTarget;
    if (!u || this.pendingDelete) return;
    this.pendingDelete = true;
    this.cdr.markForCheck();
    this.api.delete(u.uid).subscribe({
      next: () => {
        this.pendingDelete = false;
        this.toast.showPlain('Utilisateur supprimé.', 'success');
        this.all = this.all.filter((x) => x.uid !== u.uid);
        this.closeDelete();
        this.applyFilters();
      },
      error: () => {
        this.pendingDelete = false;
        this.toast.showPlain('Impossible de supprimer.', 'error');
        this.cdr.markForCheck();
      },
    });
  }

  private patchRow(updated: AdminUserRow): void {
    const up = updated;
    this.all = this.all.map((x) => (x.uid === up.uid ? up : x));
    this.filtered = this.filtered.map((x) => (x.uid === up.uid ? up : x));
    this.cdr.markForCheck();
  }

  private applyFilters(): void {
    const needle = (this.q ?? '').trim().toLowerCase();
    let rows = [...this.all];
    if (needle) {
      rows = rows.filter((u) => {
        const hay = [u.firstName, u.lastName, u.displayName, u.email, u.role]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return hay.includes(needle);
      });
    }
    this.filtered = rows.sort((a, b) => this.fullName(a).localeCompare(this.fullName(b)));
    this.cdr.markForCheck();
  }
}

