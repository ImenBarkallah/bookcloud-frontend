import { DOCUMENT } from '@angular/common';
import { Injectable, effect, inject, signal } from '@angular/core';

const STORAGE_COLLAPSED = 'admin.sidebar.collapsed';

/** État partagé : sidebar réduite (desktop) et tiroir navigation (petit écran). */
@Injectable({ providedIn: 'root' })
export class AdminSidebarUiService {
  private readonly doc = inject(DOCUMENT);

  /** Desktop : barre étroite avec icônes seules. */
  readonly collapsed = signal(this.readCollapsed());

  /** ≤1100px : panneau latéral coulissant. */
  readonly mobileOpen = signal(false);

  /** Verrouille le scroll du document quand le tiroir mobile est ouvert. */
  private readonly syncMobileBodyScroll = effect(() => {
    const open = this.mobileOpen();
    const body = this.doc.body;
    const narrow =
      typeof window !== 'undefined' && window.matchMedia('(max-width: 1100px)').matches;
    if (open && narrow) {
      body.classList.add('admin-mobile-nav-open');
    } else {
      body.classList.remove('admin-mobile-nav-open');
    }
  });

  constructor() {
    if (typeof window !== 'undefined') {
      window.matchMedia('(min-width: 1101px)').addEventListener('change', (e) => {
        if (e.matches) {
          this.mobileOpen.set(false);
        }
      });
    }
  }

  toggleCollapsed(): void {
    this.collapsed.update((v) => !v);
    this.persistCollapsed();
  }

  setCollapsed(value: boolean): void {
    this.collapsed.set(value);
    this.persistCollapsed();
  }

  toggleMobile(): void {
    this.mobileOpen.update((v) => !v);
  }

  openMobile(): void {
    this.mobileOpen.set(true);
  }

  closeMobile(): void {
    this.mobileOpen.set(false);
  }

  private readCollapsed(): boolean {
    try {
      return sessionStorage.getItem(STORAGE_COLLAPSED) === '1';
    } catch {
      return false;
    }
  }

  private persistCollapsed(): void {
    try {
      sessionStorage.setItem(STORAGE_COLLAPSED, this.collapsed() ? '1' : '0');
    } catch {
      /* ignore */
    }
  }
}
