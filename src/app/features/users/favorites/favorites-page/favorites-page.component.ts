import { CommonModule } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Component, ChangeDetectionStrategy, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { environment } from '../../../../../environments/environment';
import { AuthService } from '../../../../core/services/auth.service';
import { GuestFavoritesService } from '../../../../core/services/guest-favorites.service';
import { resolvePublicUploadUrl } from '../../../../core/utils/public-upload-url';
import { BookApiService } from '../../../../core/services/book-api.service';
import { forkJoin, of } from 'rxjs';

@Component({
  selector: 'app-favorites-page',
  standalone: true,
  imports: [CommonModule, TranslateModule, RouterLink],
  templateUrl: './favorites-page.component.html',
  styleUrls: ['./favorites-page.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FavoritesPageComponent {
  readonly skelSlots = [1, 2, 3, 4, 5, 6, 7, 8] as const;

  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;
  private readonly auth = inject(AuthService);
  private readonly guestFavs = inject(GuestFavoritesService);
  private readonly bookApi = inject(BookApiService);

  readonly loading = signal(true);
  readonly error = signal(false);
  readonly items = signal<BookCard[]>([]);
  readonly pendingIds = signal<ReadonlySet<string>>(new Set());

  readonly isEmpty = computed(() => !this.loading() && !this.error() && this.items().length === 0);

  constructor() {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(false);
    if (this.auth.currentUser) {
      const params = new HttpParams().set('limit', '200');
      this.http.get<BookCard[]>(`${this.base}/api/favorites`, { params }).subscribe({
        next: (rows) => {
          this.items.set(rows ?? []);
          this.loading.set(false);
        },
        error: () => {
          this.error.set(true);
          this.loading.set(false);
        },
      });
      return;
    }

    // Guest favorites: localStorage ids -> hydrate via public GET /api/books/{id} (permitAll).
    const ids = Array.from(this.guestFavs.ids());
    if (ids.length === 0) {
      this.items.set([]);
      this.loading.set(false);
      return;
    }
    forkJoin(ids.map((id) => this.bookApi.getBook(id))).subscribe({
      next: (rows) => {
        this.items.set((rows ?? []).map((b) => toCard(b)));
        this.loading.set(false);
      },
      error: () => {
        // If some books were deleted, keep page usable.
        this.items.set([]);
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  isPending(id: string): boolean {
    return this.pendingIds().has(id);
  }

  toggle(book: BookCard, ev: Event): void {
    ev.preventDefault();
    ev.stopPropagation();
    if (this.isPending(book.id)) {
      return;
    }
    this.pendingIds.update((s) => new Set(s).add(book.id));

    // optimistic: remove from favorites list immediately
    const prev = this.items();
    this.items.set(prev.filter((b) => b.id !== book.id));

    if (!this.auth.currentUser) {
      // guest mode: local only
      this.guestFavs.remove(book.id);
      this.pendingIds.update((s) => {
        const n = new Set(s);
        n.delete(book.id);
        return n;
      });
      return;
    }

    this.http
      .post<{ bookId: string; favorited: boolean }>(`${this.base}/api/favorites/toggle`, { bookId: book.id })
      .subscribe({
        next: (r) => {
          if (r.favorited) {
            this.items.update((rows) => [book, ...rows]);
          }
          this.pendingIds.update((s) => {
            const n = new Set(s);
            n.delete(book.id);
            return n;
          });
        },
        error: () => {
          // rollback
          this.items.set(prev);
          this.pendingIds.update((s) => {
            const n = new Set(s);
            n.delete(book.id);
            return n;
          });
        },
      });
  }

  coverUrl(b: BookCard): string | null {
    const url = (b.coverUrl ?? '').trim();
    return url ? (resolvePublicUploadUrl(url) ?? url) : null;
  }
}

type BookCard = {
  id: string;
  title: string;
  author: string;
  categoryId?: string | null;
  categoryName?: string | null;
  coverUrl?: string | null;
  isbn?: string | null;
};

function toCard(b: unknown): BookCard {
  const x = b as {
    id: string;
    title?: string;
    author?: string;
    categoryId?: string;
    categoryName?: string;
    coverUrl?: string | null;
    isbn?: string;
  };
  return {
    id: String(x.id),
    title: String(x.title ?? ''),
    author: String(x.author ?? ''),
    categoryId: x.categoryId ?? null,
    categoryName: x.categoryName ?? null,
    coverUrl: typeof x.coverUrl === 'string' ? x.coverUrl : null,
    isbn: x.isbn ?? null,
  };
}
