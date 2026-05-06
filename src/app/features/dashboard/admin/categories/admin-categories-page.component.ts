import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { animate, stagger } from '@motionone/dom';
import { Subject, Subscription, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, finalize, switchMap } from 'rxjs/operators';

import { AuthToastService } from '../../../../core/services/auth-toast.service';
import { resolvePublicUploadUrl } from '../../../../core/utils/public-upload-url';
import { CategoryApiService } from '../../../../core/services/category-api.service';
import { CategoryOption } from '../../../../core/services/catalogue.models';

type ViewMode = 'grid' | 'table';
type CategoryModalKind = 'create' | 'edit' | 'view';

@Component({
  selector: 'app-admin-categories-page',
  templateUrl: './admin-categories-page.component.html',
  styleUrls: ['./admin-categories-page.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminCategoriesPageComponent implements OnInit, OnDestroy {
  /** Exposé au template : URLs `/uploads/...` → `http://localhost:8080/uploads/...` */
  readonly uploadUrl = resolvePublicUploadUrl;

  private readonly api = inject(CategoryApiService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toast = inject(AuthToastService);

  view: ViewMode = 'grid';
  q = '';

  page = 0;
  pageSize = 12;
  readonly pageSizeOptions = [6, 12, 24, 48] as const;

  categories: CategoryOption[] = [];
  totalElements = 0;
  totalPages = 0;

  loading = true;
  error = false;

  /** Modal catégorie (création / édition / consultation) */
  categoryModalOpen = false;
  categoryModalKind: CategoryModalKind = 'create';
  editingId: string | null = null;
  formName = '';
  formDescription = '';
  modalDetailLoading = false;
  pendingSave = false;

  /** Confirmation suppression */
  deleteModalOpen = false;
  deleteTarget: CategoryOption | null = null;
  pendingDelete = false;

  /** Image (Cloudinary / upload) */
  imageFile: File | null = null;
  previewObjectUrl: string | null = null;
  currentImageUrl: string | null = null;

  // Reset native file input when clearing
  @ViewChild('catImgInput') catImgInput?: ElementRef<HTMLInputElement>;

  private readonly search$ = new Subject<string>();
  private loadSub?: Subscription;
  private modalLoadSub?: Subscription;

  ngOnDestroy(): void {
    this.loadSub?.unsubscribe();
    this.modalLoadSub?.unsubscribe();
  }

  ngOnInit(): void {
    this.search$
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.page = 0;
        this.loadPage();
      });

    this.loadPage();
  }

  setView(v: ViewMode): void {
    this.view = v;
  }

  onQueryChange(value: string): void {
    this.q = value;
    this.search$.next(value);
  }

  setPageSize(raw: number): void {
    const n = Number(raw);
    if (!Number.isFinite(n)) {
      return;
    }
    this.pageSize = n;
    this.page = 0;
    this.loadPage();
  }

  prevPage(): void {
    if (this.page <= 0) {
      return;
    }
    this.page -= 1;
    this.loadPage();
  }

  nextPage(): void {
    if (this.page >= this.totalPages - 1) {
      return;
    }
    this.page += 1;
    this.loadPage();
  }

  trackById(_: number, c: CategoryOption): string {
    return c.id;
  }

  openCreateModal(): void {
    this.categoryModalKind = 'create';
    this.editingId = null;
    this.formName = '';
    this.formDescription = '';
    this.modalDetailLoading = false;
    this.clearImageSelection();
    this.categoryModalOpen = true;
    this.cdr.markForCheck();
  }

  openViewModal(c: CategoryOption): void {
    this.categoryModalKind = 'view';
    this.editingId = c.id;
    this.categoryModalOpen = true;
    this.loadCategoryForModal(c.id);
    this.cdr.markForCheck();
  }

  openEditModal(c: CategoryOption): void {
    this.categoryModalKind = 'edit';
    this.editingId = c.id;
    this.categoryModalOpen = true;
    this.loadCategoryForModal(c.id);
    this.cdr.markForCheck();
  }

  closeCategoryModal(): void {
    this.categoryModalOpen = false;
    this.modalLoadSub?.unsubscribe();
    this.modalDetailLoading = false;
    this.editingId = null;
    this.clearImageSelection();
    this.cdr.markForCheck();
  }

  switchViewToEdit(): void {
    if (!this.editingId) {
      return;
    }
    this.categoryModalKind = 'edit';
    this.cdr.markForCheck();
  }

  saveCategoryModal(): void {
    const name = (this.formName ?? '').trim();
    if (!name) {
      this.toast.showKey('ADMIN.CATEGORIES.ERR_NAME', 'error');
      return;
    }
    const description = (this.formDescription ?? '').trim();
    const body = { name, description: description || null };

    if (this.categoryModalKind === 'create') {
      this.pendingSave = true;
      this.cdr.markForCheck();
      this.api
        .addCategory(body)
        .pipe(
          switchMap((res) => {
            if (this.imageFile) {
              return this.api.uploadCategoryImage(res.id, this.imageFile);
            }
            return of(null);
          }),
          finalize(() => {
            this.pendingSave = false;
            this.cdr.markForCheck();
          }),
        )
        .subscribe({
          next: () => {
            this.toast.showKey('ADMIN.CATEGORIES.TOAST_CREATED', 'success');
            this.closeCategoryModal();
            this.loadPage();
          },
          error: (err: unknown) => {
            this.toast.showPlain(this.errBody(err), 'error');
            this.loadPage();
            this.cdr.markForCheck();
          },
        });
      return;
    }

    if (this.categoryModalKind === 'edit' && this.editingId) {
      this.pendingSave = true;
      this.cdr.markForCheck();
      this.api
        .update(this.editingId, body)
        .pipe(
          switchMap(() => {
            if (this.imageFile) {
              return this.api.uploadCategoryImage(this.editingId!, this.imageFile);
            }
            return of(null);
          }),
          finalize(() => {
            this.pendingSave = false;
            this.cdr.markForCheck();
          }),
        )
        .subscribe({
          next: () => {
            this.toast.showKey('ADMIN.CATEGORIES.TOAST_UPDATED', 'success');
            this.closeCategoryModal();
            this.loadPage();
          },
          error: (err: unknown) => {
            this.toast.showPlain(this.errBody(err), 'error');
            this.cdr.markForCheck();
          },
        });
    }
  }

  modalImageSrc(): string | null {
    if (this.previewObjectUrl) {
      return this.previewObjectUrl;
    }
    const u = (this.currentImageUrl ?? '').trim();
    return resolvePublicUploadUrl(u || null);
  }

  onCategoryImageSelected(files: FileList | null): void {
    this.imageFile = files && files.length ? files.item(0) : null;
    if (this.previewObjectUrl) {
      URL.revokeObjectURL(this.previewObjectUrl);
      this.previewObjectUrl = null;
    }
    if (this.imageFile) {
      this.previewObjectUrl = URL.createObjectURL(this.imageFile);
    }
    this.cdr.markForCheck();
  }

  clearImageSelection(): void {
    if (this.previewObjectUrl) {
      URL.revokeObjectURL(this.previewObjectUrl);
      this.previewObjectUrl = null;
    }
    this.imageFile = null;
    this.currentImageUrl = null;
  }

  clearPendingImageOnly(): void {
    if (this.previewObjectUrl) {
      URL.revokeObjectURL(this.previewObjectUrl);
      this.previewObjectUrl = null;
    }
    this.imageFile = null;
    if (this.catImgInput?.nativeElement) {
      this.catImgInput.nativeElement.value = '';
    }
    this.cdr.markForCheck();
  }

  openDeleteModal(c: CategoryOption): void {
    this.deleteTarget = c;
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
    this.api
      .deleteCategory(id)
      .pipe(
        finalize(() => {
          this.pendingDelete = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          this.toast.showKey('ADMIN.CATEGORIES.TOAST_DELETED', 'success');
          this.closeDeleteModal();
          this.loadPage();
        },
        error: (err: unknown) => {
          this.toast.showPlain(this.errBody(err), 'error');
          this.cdr.markForCheck();
        },
      });
  }

  private loadCategoryForModal(id: string): void {
    this.modalLoadSub?.unsubscribe();
    if (this.previewObjectUrl) {
      URL.revokeObjectURL(this.previewObjectUrl);
      this.previewObjectUrl = null;
    }
    this.imageFile = null;
    this.modalDetailLoading = true;
    this.formName = '';
    this.formDescription = '';
    this.currentImageUrl = null;
    this.cdr.markForCheck();

    this.modalLoadSub = this.api
      .getCategoryById(id)
      .pipe(
        finalize(() => {
          this.modalDetailLoading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (cat) => {
          this.formName = cat.name ?? '';
          this.formDescription = (cat.description ?? '').trim();
          const img = (cat.imageUrl ?? '').trim();
          this.currentImageUrl = img || null;
          this.clearPendingImageOnly();
          this.cdr.markForCheck();
        },
        error: () => {
          this.toast.showKey('ADMIN.CATEGORIES.ERR_LOAD', 'error');
          this.closeCategoryModal();
          this.cdr.markForCheck();
        },
      });
  }

  private loadPage(): void {
    this.loadSub?.unsubscribe();
    this.loading = true;
    this.error = false;
    this.cdr.markForCheck();

    const search = (this.q ?? '').trim();
    this.loadSub = this.api
      .getCategoriesPaged({
        page: this.page,
        size: this.pageSize,
        search: search || null,
      })
      .subscribe({
        next: (res) => {
          this.categories = res.content ?? [];
          this.totalElements = res.totalElements ?? 0;
          this.totalPages = res.totalPages ?? 0;
          this.page = res.number ?? this.page;
          this.loading = false;
          this.cdr.markForCheck();
          queueMicrotask(() => this.animateIn());
        },
        error: () => {
          this.error = true;
          this.loading = false;
          this.categories = [];
          this.totalElements = 0;
          this.totalPages = 0;
          this.cdr.markForCheck();
        },
      });
  }

  private animateIn(): void {
    const root = document.querySelector('.admin-categories');
    if (!root) {
      return;
    }
    const cards = root.querySelectorAll('.cat-card, .cat-row');
    if (!cards.length) {
      return;
    }
    animate(
      Array.from(cards) as HTMLElement[],
      { opacity: [0, 1], transform: ['translateY(10px)', 'none'] },
      { duration: 0.35, delay: stagger(0.03) },
    );
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
}
