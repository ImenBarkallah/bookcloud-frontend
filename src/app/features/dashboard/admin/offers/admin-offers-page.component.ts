import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { AuthToastService } from '../../../../core/services/auth-toast.service';
import { CategoryApiService } from '../../../../core/services/category-api.service';
import { CategoryOption } from '../../../../core/services/catalogue.models';
import {
  AdminOffersApiService,
  CreateOfferRequestDto,
  OfferDto,
  OfferType,
} from '../services/admin-offers-api.service';

type StatusFilter = 'ALL' | 'ACTIVE' | 'EXPIRED';

@Component({
  selector: 'app-admin-offers-page',
  templateUrl: './admin-offers-page.component.html',
  styleUrls: ['./admin-offers-page.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminOffersPageComponent implements OnInit {
  private readonly api = inject(AdminOffersApiService);
  private readonly categoriesApi = inject(CategoryApiService);
  private readonly toast = inject(AuthToastService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  loading = true;
  error = false;

  q = '';
  status: StatusFilter = 'ALL';
  page = 0;
  size = 12;
  type: OfferType | 'ALL' = 'ALL';

  categories: CategoryOption[] = [];
  all: OfferDto[] = [];
  filtered: OfferDto[] = [];

  private readonly search$ = new Subject<string>();

  // modal
  modalOpen = false;
  modalKind: 'create' | 'edit' | 'view' = 'create';
  editingId: string | null = null;
  pendingSave = false;

  formTitle = '';
  formDescription = '';
  formImageUrl = '';
  formType: OfferType = 'EVENT';
  formActive = true;
  formStartDate: string = '';
  formEndDate: string = '';
  // keep as string[] but the template currently binds textarea; accept comma/newline input via getter/setter helpers
  formRelatedBookIds: string[] = [];
  formCategoryIds: string[] = [];

  // delete
  deleteOpen = false;
  deleteTarget: OfferDto | null = null;
  pendingDelete = false;

  ngOnInit(): void {
    this.search$
      .pipe(debounceTime(200), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.applyFilters());

    this.categoriesApi.GetAllCategories().subscribe({
      next: (rows) => {
        this.categories = rows ?? [];
        this.cdr.markForCheck();
      },
    });
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = false;
    this.cdr.markForCheck();
    this.api
      .listAdmin({
        page: this.page,
        size: this.size,
        search: this.q?.trim() || null,
        type: this.type === 'ALL' ? null : this.type,
        active: this.status === 'ACTIVE' ? true : this.status === 'EXPIRED' ? null : null,
        expired: this.status === 'EXPIRED' ? true : this.status === 'ACTIVE' ? false : null,
      })
      .subscribe({
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

  onQueryChange(v: string): void {
    this.q = v;
    this.search$.next(v);
  }

  setStatus(s: StatusFilter): void {
    this.status = s;
    this.page = 0;
    this.load();
  }

  kpiTotal(): number {
    return this.all.length;
  }
  kpiActive(): number {
    return this.all.filter((o) => o.active && !o.expired).length;
  }
  kpiDraft(): number {
    return this.all.filter((o) => !o.active && !o.expired).length;
  }
  kpiExpired(): number {
    return this.all.filter((o) => o.expired).length;
  }

  openCreate(): void {
    this.modalOpen = true;
    this.modalKind = 'create';
    this.editingId = null;
    this.resetForm();
    this.cdr.markForCheck();
  }

  openEdit(o: OfferDto): void {
    this.modalOpen = true;
    this.modalKind = 'edit';
    this.editingId = o.id;
    this.api.getAdmin(o.id).subscribe({
      next: (full) => {
        this.fillForm(full);
        this.cdr.markForCheck();
      },
      error: () => {
        this.toast.showPlain('Impossible de charger.', 'error');
        this.cdr.markForCheck();
      },
    });
  }

  openView(o: OfferDto): void {
    this.modalOpen = true;
    this.modalKind = 'view';
    this.editingId = o.id;
    this.api.getAdmin(o.id).subscribe({
      next: (full) => {
        this.fillForm(full);
        this.cdr.markForCheck();
      },
      error: () => {
        this.toast.showPlain('Impossible de charger.', 'error');
        this.cdr.markForCheck();
      },
    });
  }

  closeModal(): void {
    this.modalOpen = false;
    this.pendingSave = false;
    this.cdr.markForCheck();
  }

  save(): void {
    if (this.pendingSave) return;
    const title = this.formTitle.trim();
    if (!title) {
      this.toast.showPlain('Titre obligatoire', 'error');
      return;
    }
    this.pendingSave = true;
    this.cdr.markForCheck();

    const body: CreateOfferRequestDto = {
      title,
      description: this.formDescription.trim() || null,
      imageUrl: this.formImageUrl.trim() || null,
      type: this.formType,
      active: this.formActive,
      startDate: this.formStartDate || null,
      endDate: this.formEndDate || null,
      relatedBookIds: (this.formRelatedBookIds ?? []).filter(Boolean),
      categoryIds: (this.formCategoryIds ?? []).filter(Boolean),
    };

    if (this.modalKind === 'create') {
      this.api.create(body).subscribe({
        next: () => {
          this.pendingSave = false;
          this.toast.showPlain('Offre créée.', 'success');
          this.closeModal();
          this.load();
        },
        error: () => {
          this.pendingSave = false;
          this.toast.showPlain('Erreur création.', 'error');
          this.cdr.markForCheck();
        },
      });
      return;
    }

    const id = this.editingId;
    if (!id) {
      this.pendingSave = false;
      this.cdr.markForCheck();
      return;
    }
    this.api.update(id, body).subscribe({
      next: () => {
        this.pendingSave = false;
        this.toast.showPlain('Offre mise à jour.', 'success');
        this.closeModal();
        this.load();
      },
      error: () => {
        this.pendingSave = false;
        this.toast.showPlain('Erreur mise à jour.', 'error');
        this.cdr.markForCheck();
      },
    });
  }

  openDelete(o: OfferDto): void {
    this.deleteOpen = true;
    this.deleteTarget = o;
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
    const id = this.deleteTarget?.id;
    if (!id || this.pendingDelete) return;
    this.pendingDelete = true;
    this.cdr.markForCheck();
    this.api.delete(id).subscribe({
      next: () => {
        this.pendingDelete = false;
        this.toast.showPlain('Offre supprimée.', 'success');
        this.closeDelete();
        this.load();
      },
      error: () => {
        this.pendingDelete = false;
        this.toast.showPlain('Impossible de supprimer.', 'error');
        this.cdr.markForCheck();
      },
    });
  }

  private applyFilters(): void {
    // server-filtered; keep simple local rendering
    this.filtered = [...this.all];
    this.cdr.markForCheck();
  }

  private resetForm(): void {
    this.formTitle = '';
    this.formDescription = '';
    this.formImageUrl = '';
    this.formType = 'EVENT';
    this.formActive = true;
    this.formStartDate = '';
    this.formEndDate = '';
    this.formRelatedBookIds = [];
    this.formCategoryIds = [];
  }

  private fillForm(o: OfferDto): void {
    this.formTitle = o.title ?? '';
    this.formDescription = (o.description ?? '') as string;
    this.formImageUrl = (o.imageUrl ?? '') as string;
    this.formType = (o.type ?? 'EVENT') as OfferType;
    this.formActive = !!o.active;
    this.formStartDate = (o.startDate ?? '') as string;
    this.formEndDate = (o.endDate ?? '') as string;
    this.formRelatedBookIds = (o.relatedBookIds ?? []) as string[];
    this.formCategoryIds = (o.categoryIds ?? []) as string[];
  }

  // Template helper for textarea binding (IDs separated by comma/newline)
  get relatedBookIdsText(): string {
    return (this.formRelatedBookIds ?? []).join('\n');
  }
  set relatedBookIdsText(v: string) {
    const ids = String(v ?? '')
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    this.formRelatedBookIds = ids;
  }
}

