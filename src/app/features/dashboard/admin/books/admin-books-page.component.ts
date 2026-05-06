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
import { CreateBookRequestDto } from '../../../../dto/create-book-request.dto';
import { UpdateBookRequestDto } from '../../../../dto/update-book-request.dto';
import { Book } from '../../../../models/book.model';
import { AuthorApiService } from '../../../../core/services/author-api.service';
import { BookApiService } from '../../../../core/services/book-api.service';
import { CategoryApiService } from '../../../../core/services/category-api.service';
import { AuthorItem, BookDetailApi, CategoryOption } from '../../../../core/services/catalogue.models';

type AvailabilityFilter = 'ALL' | 'AVAILABLE' | 'UNAVAILABLE';

@Component({
  selector: 'app-admin-books-page',
  templateUrl: './admin-books-page.component.html',
  styleUrls: ['./admin-books-page.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminBooksPageComponent implements OnInit {
  readonly uploadUrl = resolvePublicUploadUrl;

  private readonly books = inject(BookApiService);
  private readonly categoriesApi = inject(CategoryApiService);
  private readonly authorsApi = inject(AuthorApiService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toast = inject(AuthToastService);

  loading = true;
  error = false;

  q = '';
  availability: AvailabilityFilter = 'ALL';
  categoryId: string | null = null;
  authorId: string | null = null;

  categories: CategoryOption[] = [];
  authors: AuthorItem[] = [];

  all: Book[] = [];
  filtered: Book[] = [];

  pendingIds = new Set<string>();

  // modal add/edit/view
  modalOpen = false;
  modalKind: 'create' | 'edit' | 'view' = 'create';
  editingId: string | null = null;
  modalLoading = false;
  pendingSave = false;

  formTitle = '';
  formDescription = '';
  formAuthorIds: string[] = [];
  formCategoryId = '';
  formTotalCopies = 1;
  formIsbn = '';
  formPublisher = '';
  formPublicationYear: number | null = null;
  formFeatured = false;

  imageFile: File | null = null;
  previewObjectUrl: string | null = null;
  currentCoverUrl: string | null = null;

  // delete confirm
  deleteModalOpen = false;
  deleteTarget: Book | null = null;
  pendingDelete = false;

  private readonly search$ = new Subject<string>();

  ngOnInit(): void {
    this.search$
      .pipe(debounceTime(250), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.applyFilters());

    this.categoriesApi.GetAllCategories().subscribe({
      next: (rows) => {
        this.categories = rows ?? [];
        this.cdr.markForCheck();
      },
    });
    this.authorsApi.list().subscribe({
      next: (rows) => {
        this.authors = rows ?? [];
        this.cdr.markForCheck();
      },
    });

    this.load();
  }

  onQueryChange(v: string): void {
    this.q = v;
    this.search$.next(v);
  }

  setAvailability(a: AvailabilityFilter): void {
    this.availability = a;
    this.applyFilters();
  }

  setCategory(id: string | null): void {
    this.categoryId = id && id.trim() ? id : null;
    this.load();
  }

  setAuthor(id: string | null): void {
    this.authorId = id && id.trim() ? id : null;
    this.load();
  }

  kpiTotal(): number {
    return this.all.length;
  }

  kpiAvailable(): number {
    return this.all.filter((b) => (b.availableCopies ?? 0) > 0).length;
  }

  kpiUnavailable(): number {
    return this.all.filter((b) => (b.availableCopies ?? 0) <= 0).length;
  }

  // popularity is optional; no backend metric -> heuristic: “popular” if availableCopies lower than total
  kpiPopular(): number {
    return this.all.filter((b) => (b.totalCopies ?? 0) > 0 && (b.availableCopies ?? 0) < (b.totalCopies ?? 0))
      .length;
  }

  trackById(_: number, b: Book): string {
    return b.id;
  }

  isAvailable(b: Book): boolean {
    return (b.availableCopies ?? 0) > 0;
  }

  canDelete(id: string): boolean {
    return !this.pendingIds.has(id);
  }

  openCreate(): void {
    this.modalKind = 'create';
    this.editingId = null;
    this.modalOpen = true;
    this.modalLoading = false;
    this.resetForm();
    this.cdr.markForCheck();
  }

  openView(b: Book): void {
    this.modalKind = 'view';
    this.editingId = b.id;
    this.modalOpen = true;
    this.modalLoading = true;
    this.resetForm();
    this.cdr.markForCheck();
    this.books.getById(b.id).subscribe({
      next: (full) => {
        this.fillForm(full);
        this.modalLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.modalLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  openEdit(b: Book): void {
    this.modalKind = 'edit';
    this.editingId = b.id;
    this.modalOpen = true;
    this.modalLoading = true;
    this.resetForm();
    this.cdr.markForCheck();
    this.books.getById(b.id).subscribe({
      next: (full) => {
        this.fillForm(full);
        this.modalLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.modalLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  closeModal(): void {
    this.modalOpen = false;
    this.editingId = null;
    this.revokePreview();
    this.imageFile = null;
    this.previewObjectUrl = null;
    this.currentCoverUrl = null;
    this.cdr.markForCheck();
  }

  onPickImage(file: File | null): void {
    this.revokePreview();
    this.imageFile = file;
    if (file) {
      this.previewObjectUrl = URL.createObjectURL(file);
    } else {
      this.previewObjectUrl = null;
    }
    this.cdr.markForCheck();
  }

  save(): void {
    if (this.pendingSave) return;
    const title = this.formTitle.trim();
    const categoryId = this.formCategoryId.trim();
    const authorIds = (this.formAuthorIds ?? []).map((s) => String(s).trim()).filter(Boolean);

    if (!title) {
      this.toast.showPlain('Titre obligatoire', 'error');
      return;
    }
    if (!categoryId) {
      this.toast.showPlain('Catégorie obligatoire', 'error');
      return;
    }
    if (authorIds.length === 0) {
      this.toast.showPlain('Au moins un auteur est obligatoire', 'error');
      return;
    }

    this.pendingSave = true;
    this.cdr.markForCheck();

    const base = {
      description: this.formDescription?.trim() || null,
      isbn: this.formIsbn?.trim() || null,
      coverUrl: this.currentCoverUrl?.trim() || null,
      publisher: this.formPublisher?.trim() || null,
      publicationYear: this.formPublicationYear,
      defaultBranchId: null,
      featured: !!this.formFeatured,
    };

    if (this.modalKind === 'create') {
      const req: CreateBookRequestDto = {
        title,
        categoryId,
        authorIds,
        totalCopies: Math.max(1, Math.floor(this.formTotalCopies || 1)),
        ...base,
      };
      this.books.create(req).subscribe({
        next: (r) => this.afterSaveWithOptionalUpload(r.id, true),
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
    const req: UpdateBookRequestDto = {
      title,
      categoryId,
      authorIds,
      totalCopies: Math.max(0, Math.floor(this.formTotalCopies || 0)),
      ...base,
    };
    this.books.update(id, req).subscribe({
      next: () => this.afterSaveWithOptionalUpload(id, false),
      error: (err: unknown) => this.afterSaveError(err),
    });
  }

  openDelete(b: Book): void {
    this.deleteTarget = b;
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
    this.books.delete(id).subscribe({
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

  private load(): void {
    this.loading = true;
    this.error = false;
    this.cdr.markForCheck();
    this.books.listAll({ categoryId: this.categoryId, authorId: this.authorId }).subscribe({
      next: (rows) => {
        this.all = rows ?? [];
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
    if (this.availability !== 'ALL') {
      rows = rows.filter((b) => (this.availability === 'AVAILABLE' ? this.isAvailable(b) : !this.isAvailable(b)));
    }
    if (needle) {
      rows = rows.filter((b) => {
        const hay = [
          b.title,
          b.author,
          b.categoryId,
          b.isbn,
          b.publisher,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return hay.includes(needle);
      });
    }
    this.filtered = rows.sort((a, b) => String(a.title ?? '').localeCompare(String(b.title ?? '')));
    this.cdr.markForCheck();
  }

  private resetForm(): void {
    this.formTitle = '';
    this.formDescription = '';
    this.formAuthorIds = [];
    this.formCategoryId = '';
    this.formTotalCopies = 1;
    this.formIsbn = '';
    this.formPublisher = '';
    this.formPublicationYear = null;
    this.formFeatured = false;
    this.imageFile = null;
    this.previewObjectUrl = null;
    this.currentCoverUrl = null;
    this.revokePreview();
  }

  private fillForm(b: Book | BookDetailApi): void {
    this.formTitle = b.title ?? '';
    this.formDescription = (b.description ?? '') as string;
    this.formAuthorIds = (b.authorIds ?? (b.authorId ? [b.authorId] : []) ?? []).filter(Boolean) as string[];
    this.formCategoryId = b.categoryId ?? '';
    this.formTotalCopies = Math.max(0, Number(b.totalCopies ?? 0));
    this.formIsbn = (b.isbn ?? '') as string;
    this.formPublisher = (b.publisher ?? '') as string;
    this.formPublicationYear = (b.publicationYear ?? null) as number | null;
    this.currentCoverUrl = (b.coverUrl ?? null) as string | null;
    this.formFeatured = !!b.featured;
  }

  toggleFeatured(b: Book, checked: boolean): void {
    if (this.pendingIds.has(b.id)) return;
    this.pendingIds.add(b.id);
    this.cdr.markForCheck();
    this.books.setFeatured(b.id, checked).subscribe({
      next: () => {
        b.featured = checked;
        this.pendingIds.delete(b.id);
        this.toast.showPlain(checked ? 'Livre mis en avant.' : 'Livre retiré des mises en avant.', 'success');
        this.cdr.markForCheck();
      },
      error: (err: unknown) => {
        this.pendingIds.delete(b.id);
        this.toast.showPlain(this.errBody(err), 'error');
        this.cdr.markForCheck();
      },
    });
  }

  private afterSaveWithOptionalUpload(id: string, created: boolean): void {
    const file = this.imageFile;
    if (!file) {
      this.pendingSave = false;
      this.toast.showPlain(created ? 'Livre créé.' : 'Livre mis à jour.', 'success');
      this.closeModal();
      this.load();
      return;
    }
    this.books.uploadImage(id, file).subscribe({
      next: () => {
        this.pendingSave = false;
        this.toast.showPlain(created ? 'Livre créé.' : 'Livre mis à jour.', 'success');
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

