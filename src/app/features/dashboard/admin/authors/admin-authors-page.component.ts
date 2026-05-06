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
import { resolvePublicUploadUrl } from '../../../../core/utils/public-upload-url';
import { Book } from '../../../../models/book.model';
import {
  AdminAuthor,
  AuthorApiService,
  CreateAuthorBody,
  UpdateAuthorBody,
} from '../../../../core/services/author-api.service';
import { BookApiService } from '../../../../core/services/book-api.service';

type ViewMode = 'cards' | 'table';

@Component({
  selector: 'app-admin-authors-page',
  templateUrl: './admin-authors-page.component.html',
  styleUrls: ['./admin-authors-page.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminAuthorsPageComponent implements OnInit {
  readonly uploadUrl = resolvePublicUploadUrl;

  private readonly authorsApi = inject(AuthorApiService);
  private readonly booksApi = inject(BookApiService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toast = inject(AuthToastService);

  view: ViewMode = 'cards';
  q = '';

  loading = true;
  error = false;

  authors: AdminAuthor[] = [];
  filtered: AdminAuthor[] = [];
  books: Book[] = [];

  // modal add/edit/view
  modalOpen = false;
  modalKind: 'create' | 'edit' | 'view' = 'create';
  editingId: string | null = null;
  pendingSave = false;

  formName = '';
  formBio = '';
  formCountry = '';
  imageFile: File | null = null;
  previewObjectUrl: string | null = null;
  currentImageUrl: string | null = null;

  // delete confirm
  deleteModalOpen = false;
  deleteTarget: AdminAuthor | null = null;
  pendingDelete = false;

  // “voir livres”
  booksModalOpen = false;
  booksTarget: AdminAuthor | null = null;

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

  onQueryChange(v: string): void {
    this.q = v;
    this.search$.next(v);
  }

  kpiAuthors(): number {
    return this.authors.length;
  }

  kpiTotalBooks(): number {
    return this.books.length;
  }

  booksCount(a: AdminAuthor): number {
    const id = a.id;
    return this.books.filter((b) => (b.authorIds ?? (b.authorId ? [b.authorId] : [])).includes(id)).length;
  }

  trackById(_: number, a: AdminAuthor): string {
    return a.id;
  }

  openCreate(): void {
    this.modalKind = 'create';
    this.editingId = null;
    this.modalOpen = true;
    this.resetForm();
    this.cdr.markForCheck();
  }

  openView(a: AdminAuthor): void {
    this.modalKind = 'view';
    this.editingId = a.id;
    this.modalOpen = true;
    this.resetForm();
    this.fillForm(a);
    this.cdr.markForCheck();
  }

  openEdit(a: AdminAuthor): void {
    this.modalKind = 'edit';
    this.editingId = a.id;
    this.modalOpen = true;
    this.resetForm();
    this.fillForm(a);
    this.cdr.markForCheck();
  }

  closeModal(): void {
    this.modalOpen = false;
    this.editingId = null;
    this.revokePreview();
    this.imageFile = null;
    this.previewObjectUrl = null;
    this.currentImageUrl = null;
    this.cdr.markForCheck();
  }

  onPickImage(file: File | null): void {
    this.revokePreview();
    this.imageFile = file;
    this.previewObjectUrl = file ? URL.createObjectURL(file) : null;
    this.cdr.markForCheck();
  }

  save(): void {
    if (this.pendingSave) return;
    const name = this.formName.trim();
    if (!name) {
      this.toast.showPlain('Nom obligatoire', 'error');
      return;
    }
    this.pendingSave = true;
    this.cdr.markForCheck();

    if (this.modalKind === 'create') {
      const body: CreateAuthorBody = { name, bio: this.formBio?.trim() || null, country: this.formCountry?.trim() || null };
      this.authorsApi.create(body).subscribe({
        next: (r) => this.afterSaveWithOptionalUpload(r.id),
        error: (err: unknown) => this.afterSaveError(err),
      });
      return;
    }

    const id = this.editingId;
    if (!id) {
      this.pendingSave = false;
      this.cdr.markForCheck();
      return;
    }
    const body: UpdateAuthorBody = { name, bio: this.formBio?.trim() || null, country: this.formCountry?.trim() || null };
    this.authorsApi.update(id, body).subscribe({
      next: () => this.afterSaveWithOptionalUpload(id),
      error: (err: unknown) => this.afterSaveError(err),
    });
  }

  openDelete(a: AdminAuthor): void {
    this.deleteTarget = a;
    this.deleteModalOpen = true;
    this.cdr.markForCheck();
  }

  closeDelete(): void {
    this.deleteModalOpen = false;
    this.deleteTarget = null;
    this.pendingDelete = false;
    this.cdr.markForCheck();
  }

  confirmDelete(): void {
    const id = this.deleteTarget?.id;
    if (!id || this.pendingDelete) return;
    this.pendingDelete = true;
    this.cdr.markForCheck();
    this.authorsApi.delete(id).subscribe({
      next: () => {
        this.pendingDelete = false;
        this.closeDelete();
        this.load();
      },
      error: (err: unknown) => {
        this.toast.showPlain(this.errBody(err), 'error');
        this.pendingDelete = false;
        this.cdr.markForCheck();
      },
    });
  }

  openBooks(a: AdminAuthor): void {
    this.booksTarget = a;
    this.booksModalOpen = true;
    this.cdr.markForCheck();
  }

  closeBooks(): void {
    this.booksModalOpen = false;
    this.booksTarget = null;
    this.cdr.markForCheck();
  }

  booksForTarget(): Book[] {
    const id = this.booksTarget?.id;
    if (!id) return [];
    return this.books
      .filter((b) => (b.authorIds ?? (b.authorId ? [b.authorId] : [])).includes(id))
      .sort((a, b) => String(a.title ?? '').localeCompare(String(b.title ?? '')));
  }

  private load(): void {
    this.loading = true;
    this.error = false;
    this.cdr.markForCheck();
    this.authorsApi.list().subscribe({
      next: (rows) => {
        this.authors = rows ?? [];
        // books for KPI and per-author count
        this.booksApi.listAll().subscribe({
          next: (b) => {
            this.books = b ?? [];
            this.applyFilters();
            this.loading = false;
            this.cdr.markForCheck();
          },
          error: () => {
            this.books = [];
            this.applyFilters();
            this.loading = false;
            this.cdr.markForCheck();
          },
        });
      },
      error: () => {
        this.error = true;
        this.loading = false;
        this.authors = [];
        this.filtered = [];
        this.cdr.markForCheck();
      },
    });
  }

  private applyFilters(): void {
    const needle = (this.q ?? '').trim().toLowerCase();
    let rows = [...this.authors];
    if (needle) {
      rows = rows.filter((a) => {
        const hay = [a.name, a.bio, a.country].filter(Boolean).join(' ').toLowerCase();
        return hay.includes(needle);
      });
    }
    this.filtered = rows.sort((a, b) => String(a.name ?? '').localeCompare(String(b.name ?? '')));
    this.cdr.markForCheck();
  }

  private resetForm(): void {
    this.formName = '';
    this.formBio = '';
    this.formCountry = '';
    this.imageFile = null;
    this.previewObjectUrl = null;
    this.currentImageUrl = null;
    this.revokePreview();
  }

  private fillForm(a: AdminAuthor): void {
    this.formName = a.name ?? '';
    this.formBio = (a.bio ?? '') as string;
    this.formCountry = (a.country ?? '') as string;
    this.currentImageUrl = (a.imageUrl ?? null) as string | null;
  }

  private afterSaveWithOptionalUpload(id: string): void {
    const file = this.imageFile;
    if (!file) {
      this.pendingSave = false;
      this.closeModal();
      this.load();
      return;
    }
    this.authorsApi.uploadImage(id, file).subscribe({
      next: () => {
        this.pendingSave = false;
        this.closeModal();
        this.load();
      },
      error: (err: unknown) => this.afterSaveError(err),
    });
  }

  private afterSaveError(err: unknown): void {
    this.toast.showPlain(this.errBody(err), 'error');
    this.pendingSave = false;
    this.cdr.markForCheck();
  }

  private revokePreview(): void {
    if (this.previewObjectUrl) {
      URL.revokeObjectURL(this.previewObjectUrl);
    }
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
}

