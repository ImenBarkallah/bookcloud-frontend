import { DOCUMENT } from '@angular/common';
import { Injectable, NgZone, inject } from '@angular/core';
import { Router } from '@angular/router';
import gsap from 'gsap';

import { AuthService } from './auth.service';

/** Full-screen goodbye sequence then Firebase signOut + navigation. */
@Injectable({ providedIn: 'root' })
export class LogoutFlowService {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly zone = inject(NgZone);
  private readonly doc = inject(DOCUMENT);

  private overlayEl?: HTMLDivElement;

  async runLogout(displayName: string): Promise<void> {
    const host = this.doc.body;
    const overlay = this.doc.createElement('div');
    overlay.className = 'logout-flow-overlay';
    overlay.innerHTML = `
      <div class="logout-flow-inner">
        <div class="logout-flow-card">
          <div class="logout-book-icon" aria-hidden="true">📖</div>
          <h2 class="logout-title">See you soon!</h2>
          <p class="logout-sub">Goodbye, <span class="logout-name"></span></p>
          <p class="logout-tag">BookCloud Library</p>
          <div class="logout-bar-wrap">
            <div class="logout-bar"></div>
          </div>
          <p class="logout-progress-text">Signing out...</p>
        </div>
      </div>
    `;
    host.appendChild(overlay);
    this.overlayEl = overlay;
    const nameEl = overlay.querySelector('.logout-name');
    if (nameEl) {
      nameEl.textContent = displayName || 'reader';
    }

    const inner = overlay.querySelector('.logout-flow-inner') as HTMLElement;
    const card = overlay.querySelector('.logout-flow-card') as HTMLElement;
    const bar = overlay.querySelector('.logout-bar') as HTMLElement;

    gsap.set(overlay, { opacity: 0, backdropFilter: 'blur(0px)' });
    gsap.to(overlay, {
      opacity: 1,
      duration: 0.4,
      ease: 'power2.out',
      onUpdate(this: gsap.core.Tween) {
        const p = this.progress();
        inner.style.backdropFilter = `blur(${p * 8}px)`;
      },
    });

    gsap.fromTo(
      card,
      { scale: 0.82, opacity: 0, y: 20 },
      { scale: 1, opacity: 1, y: 0, duration: 0.45, ease: 'elastic.out(1, 0.75)', delay: 0.12 },
    );

    await gsap.to(bar, {
      scaleX: 1,
      duration: 1,
      ease: 'power2.inOut',
      transformOrigin: 'left center',
      onStart: () => {
        gsap.set(bar, { scaleX: 0 });
      },
    }).then();

    await this.auth.signOutUser();

    const shell = this.doc.querySelector('.route-shell');
    if (shell) {
      await gsap
        .to(shell, {
          rotation: -2,
          scale: 0.96,
          opacity: 0,
          duration: 0.45,
          ease: 'power2.in',
          transformOrigin: '50% 40%',
        })
        .then();
      gsap.set(shell, { clearProps: 'all' });
    }

    gsap.killTweensOf([overlay, card, bar]);
    overlay.remove();
    this.overlayEl = undefined;

    await this.zone.run(async () => {
      await this.router.navigate(['/auth/login'], {
        state: { fromLogout: true },
      });
    });
  }

  kill(): void {
    if (this.overlayEl?.parentNode) {
      gsap.killTweensOf(this.overlayEl);
      this.overlayEl.remove();
      this.overlayEl = undefined;
    }
  }
}
