import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { AuthToastService } from '../../../../core/services/auth-toast.service';
import { LibraryBranchApiService } from '../../../../core/services/library-branch-api.service';
import { LibraryBranch } from '../../../../models/library-branch.model';

@Component({
  selector: 'app-admin-branches-page',
  templateUrl: './admin-branches-page.component.html',
  styleUrls: ['./admin-branches-page.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminBranchesPageComponent implements OnInit {
  private readonly api = inject(LibraryBranchApiService);
  private readonly toast = inject(AuthToastService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  loading = true;
  error = false;

  q = '';
  all: LibraryBranch[] = [];
  filtered: LibraryBranch[] = [];

  private readonly search$ = new Subject<string>();

  // modal (create/edit)
  modalOpen = false;
  modalLoading = false;
  pendingSave = false;
  editing: LibraryBranch | null = null;

  formName = '';
  formAddress = '';
  formOpeningHours = '';

  // delete confirm
  deleteOpen = false;
  deleteTarget: LibraryBranch | null = null;
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
    this.api.list().subscribe({
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
        this.toast.showPlain('Impossible de charger les branches.', 'error');
        this.cdr.markForCheck();
      },
    });
  }

  onQueryChange(v: string): void {
    this.q = v;
    this.search$.next(v);
  }

  trackById(_: number, b: LibraryBranch): string {
    return b.id;
  }

  openCreate(): void {
    this.modalOpen = true;
    this.modalLoading = false;
    this.editing = null;
    this.formName = '';
    this.formAddress = '';
    this.formOpeningHours = '';
    this.cdr.markForCheck();
  }

  openEdit(b: LibraryBranch): void {
    this.modalOpen = true;
    this.modalLoading = true;
    this.editing = b;
    this.cdr.markForCheck();
    this.api.get(b.id).subscribe({
      next: (fresh) => {
        this.modalLoading = false;
        this.editing = fresh;
        this.formName = (fresh.name ?? '') as string;
        this.formAddress = (fresh.address ?? '') as string;
        this.formOpeningHours = (fresh.openingHours ?? '') as string;
        this.cdr.markForCheck();
      },
      error: () => {
        this.modalLoading = false;
        this.toast.showPlain('Impossible de charger cette branche.', 'error');
        this.cdr.markForCheck();
      },
    });
  }

  closeModal(): void {
    if (this.pendingSave) return;
    this.modalOpen = false;
    this.editing = null;
    this.cdr.markForCheck();
  }

  save(): void {
    if (this.pendingSave) return;
    const name = this.formName.trim();
    if (!name) {
      this.toast.showPlain('Le nom est requis.', 'error');
      return;
    }
    this.pendingSave = true;
    this.cdr.markForCheck();

    const body = {
      name,
      address: this.formAddress.trim() || null,
      openingHours: this.formOpeningHours.trim() || null,
    };

    const done = () => {
      this.pendingSave = false;
      this.cdr.markForCheck();
    };

    if (!this.editing) {
      this.api.create(body).subscribe({
        next: () => {
          done();
          this.toast.showPlain('Branche créée.', 'success');
          this.modalOpen = false;
          this.load();
        },
        error: () => {
          done();
          this.toast.showPlain('Création impossible.', 'error');
        },
      });
      return;
    }

    this.api.update(this.editing.id, body).subscribe({
      next: () => {
        done();
        this.toast.showPlain('Branche mise à jour.', 'success');
        this.modalOpen = false;
        this.load();
      },
      error: () => {
        done();
        this.toast.showPlain('Mise à jour impossible.', 'error');
      },
    });
  }

  openDelete(b: LibraryBranch): void {
    this.deleteOpen = true;
    this.deleteTarget = b;
    this.cdr.markForCheck();
  }

  closeDelete(): void {
    if (this.pendingDelete) return;
    this.deleteOpen = false;
    this.deleteTarget = null;
    this.cdr.markForCheck();
  }

  confirmDelete(): void {
    if (!this.deleteTarget || this.pendingDelete) return;
    this.pendingDelete = true;
    this.cdr.markForCheck();
    this.api.delete(this.deleteTarget.id).subscribe({
      next: () => {
        this.pendingDelete = false;
        this.deleteOpen = false;
        this.toast.showPlain('Branche supprimée.', 'success');
        this.deleteTarget = null;
        this.load();
      },
      error: () => {
        this.pendingDelete = false;
        this.toast.showPlain('Suppression impossible.', 'error');
        this.cdr.markForCheck();
      },
    });
  }

  private applyFilters(): void {
    const q = (this.q ?? '').trim().toLowerCase();
    if (!q) {
      this.filtered = [...this.all];
      this.cdr.markForCheck();
      return;
    }
    this.filtered = (this.all ?? []).filter((b) => {
      const name = (b.name ?? '').toLowerCase();
      const addr = (b.address ?? '').toLowerCase();
      return name.includes(q) || addr.includes(q);
    });
    this.cdr.markForCheck();
  }
}

