import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  ViewChild,
  inject,
} from '@angular/core';

import { AuthToastService } from '../../../../core/services/auth-toast.service';
import { resolvePublicUploadUrl } from '../../../../core/utils/public-upload-url';
import {
  AdminNewsApiService,
  CreateNewsRequestDto,
  NewsDto,
  NewsType,
  UpdateNewsRequestDto,
} from '../services/admin-news-api.service';

type NewsModalKind = 'create' | 'edit';

@Component({
  selector: 'app-admin-news-page',
  templateUrl: './admin-news-page.component.html',
  styleUrls: ['./admin-news-page.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminNewsPageComponent {
  readonly uploadUrl = resolvePublicUploadUrl;

  private readonly api = inject(AdminNewsApiService);
  private readonly toast = inject(AuthToastService);
  private readonly cdr = inject(ChangeDetectorRef);

  rows: NewsDto[] = [];
  loading = true;

  modalOpen = false;
  modalKind: NewsModalKind = 'create';
  editing: NewsDto | null = null;
  pendingSave = false;

  deleteOpen = false;
  deleteTarget: NewsDto | null = null;
  pendingDelete = false;

  formTitle = '';
  formContent = '';
  formType: NewsType = 'ANNOUNCEMENT';
  formActive = true;

  imageFile: File | null = null;
  previewObjectUrl: string | null = null;
  currentImageUrl: string | null = null;

  readonly typeOptions: { id: NewsType; label: string }[] = [
    { id: 'ANNOUNCEMENT', label: 'ANNOUNCEMENT 📢' },
    { id: 'EVENT', label: 'EVENT 📅' },
    { id: 'TIP', label: 'TIP 💡' },
  ];

  @ViewChild('newsImgInput') newsImgInput?: ElementRef<HTMLInputElement>;

  constructor() {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.cdr.markForCheck();
    this.api.listAdmin({}).subscribe({
      next: (r) => {
        this.rows = r ?? [];
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.rows = [];
        this.loading = false;
        this.toast.showPlain('Impossible de charger les news.', 'error');
        this.cdr.markForCheck();
      },
    });
  }

  openCreate(): void {
    this.modalKind = 'create';
    this.editing = null;
    this.resetForm();
    this.modalOpen = true;
  }

  openEdit(row: NewsDto): void {
    this.modalKind = 'edit';
    this.editing = row;
    this.resetForm();
    this.formTitle = row.title ?? '';
    this.formContent = row.content ?? '';
    this.formType = row.type ?? 'ANNOUNCEMENT';
    this.formActive = !!row.active;
    this.currentImageUrl = row.imageUrl ?? null;
    this.modalOpen = true;
  }

  closeModal(): void {
    this.modalOpen = false;
  }

  openDelete(row: NewsDto): void {
    this.deleteTarget = row;
    this.deleteOpen = true;
  }

  closeDelete(): void {
    this.deleteOpen = false;
    this.deleteTarget = null;
  }

  onPickImage(file: File | null): void {
    this.clearPreviewOnly();
    this.imageFile = file;
    if (file) {
      this.previewObjectUrl = URL.createObjectURL(file);
    }
  }

  clearPendingImageOnly(): void {
    this.clearPreviewOnly();
    this.imageFile = null;
    if (this.newsImgInput?.nativeElement) {
      this.newsImgInput.nativeElement.value = '';
    }
    this.cdr.markForCheck();
  }

  private clearPreviewOnly(): void {
    if (this.previewObjectUrl) {
      URL.revokeObjectURL(this.previewObjectUrl);
    }
    this.previewObjectUrl = null;
  }

  save(): void {
    const title = this.formTitle.trim();
    const content = this.formContent.trim();
    if (!title || !content) {
      this.toast.showPlain('Titre et contenu sont obligatoires.', 'error');
      return;
    }

    const imageUrl = this.currentImageUrl ?? null;

    this.pendingSave = true;
    this.cdr.markForCheck();

    if (this.modalKind === 'create') {
      const body: CreateNewsRequestDto = {
        title,
        content,
        type: this.formType,
        imageUrl,
        active: this.formActive,
      };
      this.api.create(body).subscribe({
        next: ({ id }) => {
          const file = this.imageFile;
          if (!file) {
            this.pendingSave = false;
            this.modalOpen = false;
            this.toast.showPlain('News ajoutée.', 'success');
            this.load();
            return;
          }
          this.api.uploadImage(id, file).subscribe({
            next: () => {
              this.pendingSave = false;
              this.modalOpen = false;
              this.toast.showPlain('News ajoutée.', 'success');
              this.load();
            },
            error: (err: HttpErrorResponse) => {
              this.pendingSave = false;
              this.toast.showPlain(this.errMsg(err, 'Upload image impossible.'), 'error');
              this.cdr.markForCheck();
            },
          });
        },
        error: (err: HttpErrorResponse) => {
          this.pendingSave = false;
          this.toast.showPlain(this.errMsg(err, 'Création impossible.'), 'error');
          this.cdr.markForCheck();
        },
      });
      return;
    }

    const id = this.editing?.id;
    if (!id) {
      this.pendingSave = false;
      this.toast.showPlain('News introuvable.', 'error');
      this.cdr.markForCheck();
      return;
    }

    const patch: UpdateNewsRequestDto = {
      title,
      content,
      type: this.formType,
      imageUrl,
      active: this.formActive,
    };
    this.api.update(id, patch).subscribe({
      next: () => {
        const file = this.imageFile;
        if (!file) {
          this.pendingSave = false;
          this.modalOpen = false;
          this.toast.showPlain('News mise à jour.', 'success');
          this.load();
          return;
        }
        this.api.uploadImage(id, file).subscribe({
          next: () => {
            this.pendingSave = false;
            this.modalOpen = false;
            this.toast.showPlain('News mise à jour.', 'success');
            this.load();
          },
          error: (err: HttpErrorResponse) => {
            this.pendingSave = false;
            this.toast.showPlain(this.errMsg(err, 'Upload image impossible.'), 'error');
            this.cdr.markForCheck();
          },
        });
      },
      error: (err: HttpErrorResponse) => {
        this.pendingSave = false;
        this.toast.showPlain(this.errMsg(err, 'Modification impossible.'), 'error');
        this.cdr.markForCheck();
      },
    });
  }

  toggleActive(row: NewsDto): void {
    this.api.update(row.id, { active: !row.active }).subscribe({
      next: (updated) => {
        this.rows = this.rows.map((r) => (r.id === row.id ? updated : r));
        this.toast.showPlain(updated.active ? 'Activé.' : 'Désactivé.', 'success');
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.toast.showPlain(this.errMsg(err, 'Action impossible.'), 'error');
      },
    });
  }

  confirmDelete(): void {
    const target = this.deleteTarget;
    if (!target) return;
    this.pendingDelete = true;
    this.cdr.markForCheck();
    this.api.delete(target.id).subscribe({
      next: () => {
        this.pendingDelete = false;
        this.deleteOpen = false;
        this.deleteTarget = null;
        this.toast.showPlain('News supprimée.', 'success');
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.pendingDelete = false;
        this.toast.showPlain(this.errMsg(err, 'Suppression impossible.'), 'error');
        this.cdr.markForCheck();
      },
    });
  }

  dateLabel(raw: string | null): string {
    if (!raw) return '—';
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return raw;
    return d.toLocaleDateString();
  }

  typeChip(t: NewsType): { label: string; cls: string } {
    if (t === 'EVENT') return { label: 'EVENT', cls: 'chip chip--cyan' };
    if (t === 'TIP') return { label: 'TIP', cls: 'chip chip--purple' };
    return { label: 'ANNOUNCEMENT', cls: 'chip chip--gray' };
  }

  trackById(_: number, r: NewsDto): string {
    return r.id;
  }

  private resetForm(): void {
    this.formTitle = '';
    this.formContent = '';
    this.formType = 'ANNOUNCEMENT';
    this.formActive = true;
    this.clearPendingImageOnly();
    this.currentImageUrl = null;
  }

  private errMsg(err: HttpErrorResponse, fallback: string): string {
    const raw = (err.error as { error?: string } | undefined)?.error;
    const msg = (raw ?? '').trim();
    return msg || fallback;
  }
}

