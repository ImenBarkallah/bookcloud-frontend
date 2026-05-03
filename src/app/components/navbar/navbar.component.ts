import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  ViewChild,
  inject,
} from '@angular/core';
import { Router } from '@angular/router';
import gsap from 'gsap';
import { TranslateService } from '@ngx-translate/core';
import { combineLatest, pairwise, Subscription } from 'rxjs';

import { persistLang } from '../../shared/language-storage';
import { AuthStateService } from '../../services/auth-state.service';
import { LogoutFlowService } from '../../services/logout-flow.service';
import { NotificationsService } from '../../services/notifications.service';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavbarComponent implements AfterViewInit, OnDestroy {
  @ViewChild('guestCluster') guestCluster?: ElementRef<HTMLElement>;
  @ViewChild('authCluster') authCluster?: ElementRef<HTMLElement>;
  @ViewChild('dropdownPanel') dropdownPanel?: ElementRef<HTMLElement>;
  @ViewChild('chevron') chevron?: ElementRef<SVGElement>;

  private readonly translate = inject(TranslateService);
  private readonly authState = inject(AuthStateService);
  private readonly notifSvc = inject(NotificationsService);
  private readonly logoutFlow = inject(LogoutFlowService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly vm$ = combineLatest([
    this.authState.currentUser$,
    this.authState.userProfile$,
  ]);

  readonly notifications$ = this.notifSvc.items$;
  readonly unread$ = this.notifSvc.unreadCount$;

  menuOpen = false;
  notifOpen = false;
  scrolled = false;

  private introTween?: gsap.core.Timeline;
  private shrinkTween?: gsap.core.Tween;
  private sub = new Subscription();

  ngAfterViewInit(): void {
    const userMenu = document.querySelector('.user-menu') as HTMLElement | null;
    if (userMenu) {
      const umEnter = (): void => {
        gsap.to(userMenu, {
          scale: 1.03,
          borderColor: '#7B5EA7',
          duration: 0.25,
          ease: 'power2.out',
          boxShadow: '0 0 15px rgba(123,94,167,0.3)',
        });
      };
      const umLeave = (): void => {
        gsap.to(userMenu, {
          scale: 1,
          duration: 0.25,
          clearProps: 'borderColor,boxShadow',
        });
      };
      userMenu.addEventListener('mouseenter', umEnter);
      userMenu.addEventListener('mouseleave', umLeave);
    }

    const nav = document.querySelector('.navbar-shell');
    if (nav) {
      this.introTween = gsap.timeline();
      this.introTween.from(nav, {
        y: -100,
        opacity: 0,
        duration: 0.85,
        ease: 'power3.out',
      });
      this.introTween.from(
        '.navbar-shell .nav-link, .navbar-shell .nav-brand, .navbar-shell .nav-actions > *',
        {
          y: -24,
          opacity: 0,
          stagger: 0.08,
          duration: 0.55,
          ease: 'power2.out',
        },
        '-=0.4',
      );
    }

    this.sub.add(
      this.authState.currentUser$.pipe(pairwise()).subscribe(([prev, curr]) => {
        if (!!prev === !!curr && prev?.uid === curr?.uid) {
          return;
        }
        queueMicrotask(() => this.animateAuthSwap(!!curr));
      }),
    );
  }

  private animateAuthSwap(isAuthenticated: boolean): void {
    const guest = this.guestCluster?.nativeElement;
    const auth = this.authCluster?.nativeElement;
    if (isAuthenticated && auth) {
      gsap.fromTo(
        auth,
        { x: 36, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.4, ease: 'power2.out', delay: 0.08 },
      );
    } else if (!isAuthenticated && guest) {
      gsap.fromTo(
        guest.querySelectorAll('.btn-login, .btn-signup'),
        { x: 28, opacity: 0 },
        { x: 0, opacity: 1, stagger: 0.06, duration: 0.32, ease: 'power2.out' },
      );
    }
  }

  ngOnDestroy(): void {
    this.introTween?.kill();
    this.shrinkTween?.kill();
    this.sub.unsubscribe();
    gsap.killTweensOf([
      this.guestCluster?.nativeElement,
      this.authCluster?.nativeElement,
      this.dropdownPanel?.nativeElement,
    ]);
  }

  @HostListener('window:scroll')
  onScroll(): void {
    const next = window.scrollY > 48;
    if (next === this.scrolled) {
      return;
    }
    this.scrolled = next;
    const nav = document.querySelector('.navbar-shell');
    if (!nav) {
      return;
    }
    this.shrinkTween?.kill();
    this.shrinkTween = gsap.to(nav, {
      scale: next ? 0.97 : 1,
      duration: 0.35,
      ease: 'power2.out',
    });
  }

  @HostListener('document:click', ['$event'])
  onDocClick(ev: MouseEvent): void {
    const t = ev.target as Node;
    if (this.menuOpen && !document.querySelector('.user-menu-host')?.contains(t)) {
      this.closeMenu();
    }
    if (this.notifOpen && !document.querySelector('.notif-host')?.contains(t)) {
      this.notifOpen = false;
      this.cdr.markForCheck();
    }
  }

  setLang(lang: string): void {
    persistLang(lang);
    void this.translate.use(lang);
  }

  toggleMenu(): void {
    if (this.menuOpen) {
      this.closeMenu();
      return;
    }
    this.menuOpen = true;
    const chev = this.chevron?.nativeElement;
    if (chev) {
      gsap.to(chev, { rotation: 180, duration: 0.3, ease: 'power2.inOut' });
    }
    this.cdr.detectChanges();
    requestAnimationFrame(() => {
      const panel = this.dropdownPanel?.nativeElement;
      if (panel) {
        gsap.fromTo(
          panel,
          { opacity: 0, y: -12, scale: 0.95 },
          { opacity: 1, y: 0, scale: 1, duration: 0.25, ease: 'power2.out' },
        );
        gsap.from(panel.querySelectorAll('.dd-item'), {
          x: -10,
          opacity: 0,
          stagger: 0.04,
          duration: 0.25,
          ease: 'power2.out',
          delay: 0.05,
        });
      }
    });
    this.cdr.markForCheck();
  }

  closeMenu(): void {
    if (!this.menuOpen) {
      return;
    }
    const panel = this.dropdownPanel?.nativeElement;
    const chev = this.chevron?.nativeElement;
    const finish = (): void => {
      this.menuOpen = false;
      this.cdr.markForCheck();
    };
    if (panel) {
      gsap.to(panel, {
        opacity: 0,
        y: -8,
        scale: 0.96,
        duration: 0.2,
        ease: 'power2.in',
        onComplete: finish,
      });
    } else {
      finish();
    }
    if (chev) {
      gsap.to(chev, { rotation: 0, duration: 0.3, ease: 'power2.inOut' });
    }
  }

  toggleNotif(ev: Event): void {
    ev.stopPropagation();
    this.notifOpen = !this.notifOpen;
    this.cdr.markForCheck();
    const panel = document.querySelector('.notif-dropdown') as HTMLElement | null;
    if (panel && this.notifOpen) {
      gsap.fromTo(panel, { opacity: 0, y: -8 }, { opacity: 1, y: 0, duration: 0.22, ease: 'power2.out' });
    }
  }

  bellEnter(btn: EventTarget | null): void {
    const el = btn as HTMLElement;
    gsap
      .timeline()
      .to(el, { rotation: 15, duration: 0.1 })
      .to(el, { rotation: -15, duration: 0.1 })
      .to(el, { rotation: 10, duration: 0.1 })
      .to(el, { rotation: -10, duration: 0.1 })
      .to(el, { rotation: 0, duration: 0.1 });
  }

  async logout(displayName: string): Promise<void> {
    this.closeMenu();
    await this.logoutFlow.runLogout(displayName);
  }

  displayName(user: import('firebase/auth').User | null, profile: import('../../models/user-profile').UserProfile | null): string {
    return profile?.displayName?.trim() || user?.displayName?.trim() || user?.email?.split('@')[0] || 'Reader';
  }
}
