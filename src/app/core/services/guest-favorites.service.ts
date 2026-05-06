import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'bc_guest_favorite_book_ids';

@Injectable({ providedIn: 'root' })
export class GuestFavoritesService {
  readonly ids = signal<ReadonlySet<string>>(readIds());

  has(id: string): boolean {
    return this.ids().has(id);
  }

  toggle(id: string): boolean {
    const next = new Set(this.ids());
    if (next.has(id)) {
      next.delete(id);
      this.persist(next);
      return false;
    }
    next.add(id);
    this.persist(next);
    return true;
  }

  remove(id: string): void {
    const next = new Set(this.ids());
    next.delete(id);
    this.persist(next);
  }

  private persist(next: ReadonlySet<string>): void {
    this.ids.set(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(next)));
    } catch {
      /* ignore */
    }
  }
}

function readIds(): ReadonlySet<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.map((x) => String(x)).filter((s) => s.trim()));
  } catch {
    return new Set();
  }
}

