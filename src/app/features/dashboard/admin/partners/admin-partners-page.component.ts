import { HttpClient, HttpParams } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  OnDestroy,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, Subscription, debounceTime, distinctUntilChanged } from 'rxjs';

import { environment } from '../../../../../environments/environment';
import { AuthToastService } from '../../../../core/services/auth-toast.service';
import { Partner, PartnerTier } from '../../../../models/home-sections.models';

type EditTier = PartnerTier;
type ViewMode = 'grid' | 'table';

interface PagedPartnersResponse {
  content: Partner[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

@Component({
  selector: 'app-admin-partners-page',
  templateUrl: './admin-partners-page.component.html',
  styleUrls: ['./admin-partners-page.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminPartnersPageComponent implements OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toast = inject(AuthToastService);

  loading = true;
  error = false;

  view: ViewMode = 'grid';
  q = '';
  showArchived = false;

  page = 0;
  pageSize = 12;
  readonly pageSizeOptions = [6, 12, 24, 48] as const;

  partners: Partner[] = [];
  totalElements = 0;
  totalPages = 0;

  // Modal create / edit
  modalOpen = false;
  modalEdit = false;
  editingId: string | null = null;
  name = '';
  tier: EditTier = 'SILVER';
  website = '';
  archived = false;
  logoFile: File | null = null;
  /** Prévisualisation locale quand un nouveau fichier est choisi */
  previewObjectUrl: string | null = null;

  private readonly search$ = new Subject<string>();
  private loadSub?: Subscription;
  readonly apiBaseUrl = environment.apiBaseUrl;

  constructor() {
    this.search$
      .pipe(debounceTime(250), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.page = 0;
        this.load();
      });
    this.load();
  }

  load(): void {
    this.loadSub?.unsubscribe();
    this.loading = true;
    this.error = false;
    this.cdr.markForCheck();

    let params = new HttpParams()
      .set('page', String(Math.max(0, Math.floor(this.page))))
      .set('size', String(Math.min(100, Math.max(1, Math.floor(this.pageSize)))))
      .set('includeArchived', String(!!this.showArchived));
    const s = (this.q ?? '').trim();
    if (s) {
      params = params.set('search', s);
    }

    this.loadSub = this.http
      .get<PagedPartnersResponse>(`${environment.apiBaseUrl}/api/admin/partners/paged`, { params })
      .subscribe({
        next: (res) => {
          this.partners = res.content ?? [];
          this.totalElements = res.totalElements ?? 0;
          this.totalPages = res.totalPages ?? 0;
          this.page = res.number ?? this.page;
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.error = true;
          this.loading = false;
          this.partners = [];
          this.totalElements = 0;
          this.totalPages = 0;
          this.cdr.markForCheck();
        },
      });
  }

  onQueryChange(v: string): void {
    this.q = v;
    this.search$.next(v);
  }

  toggleShowArchived(): void {
    this.showArchived = !this.showArchived;
    this.page = 0;
    this.load();
  }

  setView(v: ViewMode): void {
    this.view = v;
  }

  setPageSize(raw: number): void {
    const n = Number(raw);
    if (!Number.isFinite(n)) return;
    this.pageSize = Math.floor(n);
    this.page = 0;
    this.load();
  }

  prevPage(): void {
    if (this.page <= 0) return;
    this.page -= 1;
    this.load();
  }

  nextPage(): void {
    if (this.page >= this.totalPages - 1) return;
    this.page += 1;
    this.load();
  }

  openModal(): void {
    this.modalEdit = false;
    this.editingId = null;
    this.modalOpen = true;
    this.logoFile = null;
    this.archived = false;
    this.revokePreview();
  }

  closeModal(): void {
    this.modalOpen = false;
    this.modalEdit = false;
    this.editingId = null;
    this.logoFile = null;
    this.revokePreview();
  }

  openEditModal(p: Partner): void {
    this.modalEdit = true;
    this.editingId = p.id;
    this.modalOpen = true;
    this.name = p.name ?? '';
    this.tier = (p.tier as EditTier) ?? 'SILVER';
    this.website = (p.website ?? '').trim();
    this.archived = !!p.archived;
    this.logoFile = null;
    this.revokePreview();
    this.cdr.markForCheck();
  }

  onFileSelected(files: FileList | null): void {
    this.logoFile = files && files.length ? files.item(0) : null;
    this.revokePreview();
    if (this.logoFile) {
      this.previewObjectUrl = URL.createObjectURL(this.logoFile);
    }
    this.cdr.markForCheck();
  }

  saveModal(): void {
    if (this.modalEdit && this.editingId) {
      this.updatePartner();
      return;
    }
    this.create();
  }

  create(): void {
    const name = (this.name ?? '').trim();
    if (!name) {
      return;
    }
    const body = { name, tier: this.tier, website: (this.website ?? '').trim(), archived: false };
    this.http.post<{ id: string }>(`${environment.apiBaseUrl}/api/admin/partners`, body).subscribe({
      next: (created) => {
        this.name = '';
        this.website = '';
        this.tier = 'SILVER';
        const id = created?.id;
        if (id && this.logoFile) {
          const form = new FormData();
          form.append('file', this.logoFile);
          this.http
            .post<Partner>(`${environment.apiBaseUrl}/api/admin/partners/${encodeURIComponent(id)}/logo`, form)
            .subscribe({
              next: () => {
                this.toast.showKey('ADMIN.PARTNERS.TOAST_CREATED', 'success');
                this.logoFile = null;
                this.revokePreview();
                this.modalOpen = false;
                this.load();
              },
              error: () => {
                this.toast.showKey('ADMIN.PARTNERS.ERR_SAVE', 'error');
                this.cdr.markForCheck();
              },
            });
          return;
        }
        this.toast.showKey('ADMIN.PARTNERS.TOAST_CREATED', 'success');
        this.logoFile = null;
        this.revokePreview();
        this.modalOpen = false;
        this.load();
      },
      error: () => {
        this.toast.showKey('ADMIN.PARTNERS.ERR_SAVE', 'error');
        this.cdr.markForCheck();
      },
    });
  }

  private updatePartner(): void {
    const id = this.editingId;
    if (!id) return;
    const name = (this.name ?? '').trim();
    if (!name) return;
    const body = {
      name,
      tier: this.tier,
      website: (this.website ?? '').trim(),
      archived: this.archived,
    };
    this.http.put(`${environment.apiBaseUrl}/api/admin/partners/${encodeURIComponent(id)}`, body).subscribe({
      next: () => {
        if (this.logoFile) {
          const form = new FormData();
          form.append('file', this.logoFile);
          this.http
            .post<Partner>(`${environment.apiBaseUrl}/api/admin/partners/${encodeURIComponent(id)}/logo`, form)
            .subscribe({
              next: () => {
                this.toast.showKey('ADMIN.PARTNERS.TOAST_UPDATED', 'success');
                this.afterSaveClose();
              },
              error: () => {
                this.toast.showKey('ADMIN.PARTNERS.ERR_SAVE', 'error');
                this.cdr.markForCheck();
              },
            });
          return;
        }
        this.toast.showKey('ADMIN.PARTNERS.TOAST_UPDATED', 'success');
        this.afterSaveClose();
      },
      error: () => {
        this.toast.showKey('ADMIN.PARTNERS.ERR_SAVE', 'error');
        this.cdr.markForCheck();
      },
    });
  }

  private afterSaveClose(): void {
    this.logoFile = null;
    this.revokePreview();
    this.modalOpen = false;
    this.modalEdit = false;
    this.editingId = null;
    this.load();
  }

  ngOnDestroy(): void {
    this.revokePreview();
  }

  private revokePreview(): void {
    if (this.previewObjectUrl) {
      URL.revokeObjectURL(this.previewObjectUrl);
      this.previewObjectUrl = null;
    }
  }

  /** Aperçu dans la modal : nouveau fichier choisi, sinon logo actuel en édition */
  modalPreviewSrc(): string | null {
    if (this.previewObjectUrl) return this.previewObjectUrl;
    if (!this.modalEdit || !this.editingId) return null;
    const p = this.partners.find((x) => x.id === this.editingId);
    return p ? this.logoSrc(p) : null;
  }

  setArchived(p: Partner, archived: boolean): void {
    const params = new HttpParams().set('archived', String(archived));
    this.http
      .patch(`${environment.apiBaseUrl}/api/admin/partners/${encodeURIComponent(p.id)}/archive`, null, { params })
      .subscribe({
        next: () => {
          this.toast.showKey(
            archived ? 'ADMIN.PARTNERS.TOAST_ARCHIVED' : 'ADMIN.PARTNERS.TOAST_UNARCHIVED',
            'success',
          );
          this.load();
        },
        error: () => {
          this.toast.showKey('ADMIN.PARTNERS.ERR_SAVE', 'error');
          this.cdr.markForCheck();
        },
      });
  }

  logoSrc(p: Partner): string | null {
    const raw = (p?.logoUrl ?? '').trim();
    if (!raw) return null;
    if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('data:')) return raw;
    if (raw.startsWith('/')) return `${this.apiBaseUrl}${raw}`;
    return raw;
  }
}

