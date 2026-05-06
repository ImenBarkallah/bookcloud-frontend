import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  ViewChild,
  inject,
} from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  updateProfile,
} from 'firebase/auth';
import {
  Timestamp,
  collection,
  doc,
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query,
  updateDoc,
} from 'firebase/firestore';
import {
  getDownloadURL,
  getStorage,
  ref as storageRef,
  uploadBytesResumable,
} from 'firebase/storage';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  AmbientLight,
  BoxGeometry,
  Color,
  Group,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  PointLight,
  Scene,
  WebGLRenderer,
} from 'three';
import { combineLatest, map, Subject, Subscription, takeUntil } from 'rxjs';

import { firebaseApp } from '../../../../firebase/firebase-app';
import { UserProfile } from '../../../../models/user-profile.model';
import { Role } from '../../../../enums/role.enum';
import { AuthStateService } from '../../../../core/services/auth-state.service';
import { AuthService } from '../../../../core/services/auth.service';

interface ActivityRow {
  text: string;
  at: Date;
  tone: 'borrow' | 'return' | 'reserve' | 'review';
}

@Component({
  selector: 'app-profile-page',
  templateUrl: './profile-page.component.html',
  styleUrls: ['./profile-page.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfilePageComponent implements AfterViewInit, OnDestroy {
  @ViewChild('threeHost', { static: false }) threeHost?: ElementRef<HTMLDivElement>;
  @ViewChild('tabsUnderline') tabsUnderline?: ElementRef<HTMLDivElement>;
  @ViewChild('tabsRow') tabsRow?: ElementRef<HTMLElement>;
  @ViewChild('avatarWrapper') avatarWrapper?: ElementRef<HTMLElement>;
  @ViewChild('memberIdEl') memberIdEl?: ElementRef<HTMLElement>;
  @ViewChild('personalSaveBtn') personalSaveBtn?: ElementRef<HTMLButtonElement>;

  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly authState = inject(AuthStateService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly zone = inject(NgZone);

  private readonly fs = getFirestore(firebaseApp);
  private readonly storage = getStorage(firebaseApp);

  tabIndex = 0;
  readonly tabs = ['info', 'security', 'preferences', 'activity'] as const;

  vm$ = combineLatest([
    this.authState.currentUser$,
    this.authState.userProfile$,
  ]).pipe(
    map(([user, profile]) => ({
      user,
      profile,
    })),
  );

  uploadProgress = 0;
  avatarBusy = false;
  saveBusy = false;
  pwdBusy = false;
  deleteOpen = false;
  deletePhrase = '';
  addressOpen = false;

  qrData = '';
  qrImgSrc = '';
  /** Typewriter display for member card line */
  memberCardDisplay = '';
  activity: ActivityRow[] = [];

  readonly countries = ['France', 'Canada', 'Belgium', 'Switzerland', 'United States', 'Morocco', 'Other'];

  readonly Role = Role;

  personalForm = this.fb.nonNullable.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    phone: [''],
    dateOfBirth: [''],
    bio: [''],
    street: [''],
    city: [''],
    country: [''],
  });

  securityForm = this.fb.nonNullable.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', Validators.required],
  });

  prefsForm = this.fb.nonNullable.group({
    language: this.fb.nonNullable.control<'fr' | 'en'>('en'),
    theme: this.fb.nonNullable.control<'dark' | 'light'>('dark'),
    emailWhenAvailable: [true],
    emailDueReminder: [true],
    pushNotifications: [false],
    catalogueView: this.fb.nonNullable.control<'grid' | 'list'>('grid'),
  });

  private sub = new Subscription();
  private readonly destroy$ = new Subject<void>();
  private pageEntranceRan = false;
  private avatarHoverCleanups: Array<() => void> = [];
  private statHoverCleanups: Array<() => void> = [];
  private formInteractCleanups: Array<() => void> = [];
  private saveBtnCleanups: Array<() => void> = [];
  private coverHoverCleanups: Array<() => void> = [];
  private downloadCleanups: Array<() => void> = [];
  private bioInputCleanup?: () => void;
  private bioCounterBound = false;
  private typewriterInterval?: ReturnType<typeof setInterval>;
  private qrRevealDone = false;
  private readonly saveBtnHoverAttached = new Set<HTMLElement>();
  private formFieldDelegationAttached = false;
  private renderer?: WebGLRenderer;
  private scene?: Scene;
  private camera?: PerspectiveCamera;
  private ring?: Group;
  private anim = 0;

  ngAfterViewInit(): void {
    queueMicrotask(() => this.zone.runOutsideAngular(() => this.initThree()));
    this.sub.add(
      this.vm$.pipe(takeUntil(this.destroy$)).subscribe((vm) => {
        if (vm.user && vm.profile) {
          const p = vm.profile;
          this.qrData = vm.user.uid;
          void this.refreshQrImg(vm.user.uid);
          this.patchForms(p);
          void this.loadActivity(vm.user.uid);
          if (!this.pageEntranceRan) {
            this.pageEntranceRan = true;
            queueMicrotask(() => {
              this.runPageEntranceMasterTimeline(p);
              this.setupAvatarHoverAnimations();
              this.setupStatCardHovers();
              this.setupCoverEditAnimations();
              this.setupFormFieldAnimations();
              this.setupSaveButtonAnimations();
              this.setupDownloadButtonAnimation();
              this.setupTabItemHovers();
            });
          }
        }
        this.cdr.markForCheck();
      }),
    );
    queueMicrotask(() => this.positionTabUnderlineFromRects());
  }

  private runPageEntranceMasterTimeline(profile: UserProfile): void {
    const avatarEl = this.avatarWrapper?.nativeElement;
    const master = gsap.timeline({ defaults: { ease: 'power3.out' } });

    master.from('.profile-card', {
      x: -60,
      opacity: 0,
      duration: 0.7,
      ease: 'power3.out',
    });

    master.from(
      '.stat-card',
      {
        y: 30,
        opacity: 0,
        duration: 0.5,
        stagger: 0.1,
        ease: 'back.out(1.7)',
      },
      0.3,
    );

    master.from(
      '.member-card',
      {
        y: 40,
        opacity: 0,
        duration: 0.6,
        ease: 'power2.out',
      },
      0.7,
    );

    master.from(
      '.profile-form-panel',
      {
        x: 60,
        opacity: 0,
        duration: 0.7,
        ease: 'power3.out',
      },
      0.2,
    );

    master.from(
      '.tab-item',
      {
        y: -20,
        opacity: 0,
        duration: 0.4,
        stagger: 0.08,
        ease: 'power2.out',
      },
      0.5,
    );

    master.from(
      '.profile-form-panel .profile-tab-panel.is-active .form-group',
      {
        y: 20,
        opacity: 0,
        duration: 0.4,
        stagger: 0.07,
        ease: 'power2.out',
      },
      0.7,
    );

    if (avatarEl) {
      master.from(
        avatarEl,
        {
          scale: 0,
          opacity: 0,
          duration: 0.8,
          ease: 'elastic.out(1, 0.5)',
        },
        0.4,
      );
      master.fromTo(
        avatarEl,
        { boxShadow: '0 0 0px rgba(123,94,167,0)' },
        {
          boxShadow: '0 0 25px rgba(123,94,167,0.8)',
          duration: 0.6,
          yoyo: true,
          repeat: 1,
          ease: 'power2.inOut',
        },
        1.0,
      );
    }

    master.call(() => this.animateCounters(profile));
    master.call(() => this.startMemberIdTypewriter(profile.memberCardId), [], 1.05);
  }

  private animateCounters(p: UserProfile): void {
    const vals = [p.activeLoans, p.returnedTotal, p.reservations, p.finesDue];
    const selectors = ['stat-loans', 'stat-returned', 'stat-res', 'stat-fines'];
    selectors.forEach((cls, i) => {
      const el = document.querySelector(`.${cls} .stat-num`) as HTMLElement | null;
      if (!el) {
        return;
      }
      this.animateCounter(el, vals[i]);
    });
  }

  private animateCounter(element: HTMLElement, endValue: number): void {
    const obj = { value: 0 };
    gsap.to(obj, {
      value: endValue,
      duration: 1.5,
      delay: 0.8,
      ease: 'power2.out',
      onUpdate: () => {
        element.textContent = Math.round(obj.value).toString();
      },
    });
  }

  private startMemberIdTypewriter(fullId: string): void {
    if (this.typewriterInterval) {
      clearInterval(this.typewriterInterval);
    }
    const text = fullId.startsWith('#') ? fullId.slice(1) : fullId;
    this.memberCardDisplay = '';
    let i = 0;
    this.typewriterInterval = setInterval(() => {
      if (i >= text.length) {
        if (this.typewriterInterval) {
          clearInterval(this.typewriterInterval);
          this.typewriterInterval = undefined;
        }
        return;
      }
      this.memberCardDisplay += text[i];
      i++;
      this.cdr.markForCheck();
    }, 60);
  }

  private setupAvatarHoverAnimations(): void {
    const wrap = this.avatarWrapper?.nativeElement;
    const overlay = wrap?.querySelector('.avatar-upload-overlay') as HTMLElement | null;
    const hit = wrap?.querySelector('.avatar-hit') as HTMLElement | null;
    if (!wrap || !overlay || !hit) {
      return;
    }
    gsap.set(overlay, { opacity: 0 });
    const onEnter = (): void => {
      gsap.to(wrap, { scale: 1.08, duration: 0.3, ease: 'power2.out' });
      gsap.to(overlay, { opacity: 1, duration: 0.25 });
    };
    const onLeave = (): void => {
      gsap.to(wrap, { scale: 1, duration: 0.3, ease: 'power2.out' });
      gsap.to(overlay, { opacity: 0, duration: 0.25 });
    };
    hit.addEventListener('mouseenter', onEnter);
    hit.addEventListener('mouseleave', onLeave);
    this.avatarHoverCleanups.push(() => {
      hit.removeEventListener('mouseenter', onEnter);
      hit.removeEventListener('mouseleave', onLeave);
    });
  }

  private setupStatCardHovers(): void {
    document.querySelectorAll('.stats-grid .stat-card').forEach((card) => {
      const el = card as HTMLElement;
      const enter = (): void => {
        gsap.to(el, {
          y: -6,
          scale: 1.03,
          duration: 0.3,
          ease: 'power2.out',
          boxShadow: '0 12px 30px rgba(123,94,167,0.3)',
        });
      };
      const leave = (): void => {
        gsap.to(el, {
          y: 0,
          scale: 1,
          duration: 0.3,
          ease: 'power2.out',
          boxShadow: 'none',
        });
      };
      el.addEventListener('mouseenter', enter);
      el.addEventListener('mouseleave', leave);
      this.statHoverCleanups.push(() => {
        el.removeEventListener('mouseenter', enter);
        el.removeEventListener('mouseleave', leave);
      });
    });
  }

  private setupCoverEditAnimations(): void {
    const strip = document.querySelector('.cover-strip') as HTMLElement | null;
    const btn = document.querySelector('.cover-edit-btn') as HTMLElement | null;
    if (!strip || !btn) {
      return;
    }
    gsap.set(btn, { opacity: 0.6, scale: 0.9 });
    const onEnter = (): void => {
      gsap.to(btn, { opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(2)' });
    };
    const onLeave = (): void => {
      gsap.to(btn, { opacity: 0.6, scale: 0.9, duration: 0.25 });
    };
    strip.addEventListener('mouseenter', onEnter);
    strip.addEventListener('mouseleave', onLeave);
    const onClick = (): void => {
      gsap.to(btn, { rotation: 360, duration: 0.4, ease: 'power2.inOut', clearProps: 'rotation' });
    };
    btn.addEventListener('click', onClick);
    this.coverHoverCleanups.push(() => {
      strip.removeEventListener('mouseenter', onEnter);
      strip.removeEventListener('mouseleave', onLeave);
      btn.removeEventListener('click', onClick);
    });
  }

  private setupFormFieldAnimations(): void {
    const panel = document.querySelector('.profile-form-panel');
    if (!panel || this.formFieldDelegationAttached) {
      return;
    }
    this.formFieldDelegationAttached = true;

    const onFocusIn = (ev: Event): void => {
      const input = (ev.target as HTMLElement | null)?.closest?.(
        'input:not([type=checkbox]):not([type=radio]), textarea, select',
      ) as HTMLElement | null;
      if (!input || !panel.contains(input)) {
        return;
      }
      gsap.to(input, {
        borderColor: '#7B5EA7',
        boxShadow: '0 0 0 3px rgba(123,94,167,0.2)',
        duration: 0.25,
        ease: 'power2.out',
      });
      const label = input.closest('.form-group') as HTMLElement | null;
      const icon = label?.querySelector('span:first-of-type') as HTMLElement | null;
      if (icon && label?.classList.contains('pf-field')) {
        gsap.to(icon, { color: '#7B5EA7', duration: 0.2 });
      }
    };

    const onFocusOut = (ev: Event): void => {
      const input = (ev.target as HTMLElement | null)?.closest?.(
        'input:not([type=checkbox]):not([type=radio]), textarea, select',
      ) as HTMLElement | null;
      if (!input || !panel.contains(input)) {
        return;
      }
      gsap.to(input, {
        borderColor: 'rgba(255,255,255,0.12)',
        boxShadow: '0 0 0 0px rgba(123,94,167,0)',
        duration: 0.25,
      });
      const label = input.closest('.form-group') as HTMLElement | null;
      const icon = label?.querySelector('span:first-of-type') as HTMLElement | null;
      if (icon && label?.classList.contains('pf-field')) {
        gsap.to(icon, { color: 'rgba(255,255,255,0.4)', duration: 0.2 });
      }
    };

    panel.addEventListener('focusin', onFocusIn);
    panel.addEventListener('focusout', onFocusOut);
    this.formInteractCleanups.push(() => {
      panel.removeEventListener('focusin', onFocusIn);
      panel.removeEventListener('focusout', onFocusOut);
      this.formFieldDelegationAttached = false;
    });

    this.tryBindBioCounter();
  }

  private tryBindBioCounter(): void {
    if (this.bioCounterBound) {
      return;
    }
    const bio = document.querySelector('.profile-page .bio-field textarea') as HTMLTextAreaElement | null;
    const bioCountEl = document.querySelector('.profile-page .bio-count') as HTMLElement | null;
    if (!bio || !bioCountEl) {
      return;
    }
    this.bioCounterBound = true;
    const onInput = (): void => {
      const len = bio.value.length;
      let col = 'rgba(255,255,255,0.35)';
      if (len >= 180) {
        col = '#FF4D4D';
      } else if (len >= 150) {
        col = '#EF9F27';
      }
      gsap.to(bioCountEl, { color: col, duration: 0.2 });
    };
    bio.addEventListener('input', onInput);
    this.bioInputCleanup = () => {
      bio.removeEventListener('input', onInput);
      this.bioCounterBound = false;
    };
  }

  private setupTabItemHovers(): void {
    document.querySelectorAll('.tab-item').forEach((tab) => {
      const el = tab as HTMLElement;
      const defColor = 'rgba(255,255,255,0.55)';
      const onEnter = (): void => {
        if (el.classList.contains('active')) {
          return;
        }
        gsap.to(el, { color: '#7B5EA7', duration: 0.2 });
      };
      const onLeave = (): void => {
        if (el.classList.contains('active')) {
          gsap.to(el, { color: '#fff', duration: 0.2 });
          return;
        }
        gsap.to(el, { color: defColor, duration: 0.2 });
      };
      el.addEventListener('mouseenter', onEnter);
      el.addEventListener('mouseleave', onLeave);
      this.formInteractCleanups.push(() => {
        el.removeEventListener('mouseenter', onEnter);
        el.removeEventListener('mouseleave', onLeave);
      });
    });
  }

  private setupSaveButtonAnimations(): void {
    document.querySelectorAll('.profile-save-btn').forEach((btn) => {
      const el = btn as HTMLElement;
      if (this.saveBtnHoverAttached.has(el)) {
        return;
      }
      this.saveBtnHoverAttached.add(el);
      const onEnter = (): void => {
        if ((el as HTMLButtonElement).disabled) {
          return;
        }
        gsap.to(el, {
          scale: 1.03,
          duration: 0.25,
          ease: 'power2.out',
          boxShadow: '0 8px 25px rgba(123,94,167,0.5)',
        });
      };
      const onLeave = (): void => {
        gsap.to(el, { scale: 1, duration: 0.25, boxShadow: 'none' });
      };
      el.addEventListener('mouseenter', onEnter);
      el.addEventListener('mouseleave', onLeave);
      this.saveBtnCleanups.push(() => {
        el.removeEventListener('mouseenter', onEnter);
        el.removeEventListener('mouseleave', onLeave);
        this.saveBtnHoverAttached.delete(el);
      });
    });
  }

  private setupDownloadButtonAnimation(): void {
    const btn = document.querySelector('.btn-download-card') as HTMLElement | null;
    if (!btn) {
      return;
    }
    const enter = (): void => {
      gsap.to(btn, {
        scale: 1.05,
        duration: 0.25,
        ease: 'power2.out',
        boxShadow: '0 6px 20px rgba(123,94,167,0.4)',
      });
    };
    const leave = (): void => {
      gsap.to(btn, { scale: 1, duration: 0.25, boxShadow: 'none' });
    };
    btn.addEventListener('mouseenter', enter);
    btn.addEventListener('mouseleave', leave);
    this.downloadCleanups.push(() => {
      btn.removeEventListener('mouseenter', enter);
      btn.removeEventListener('mouseleave', leave);
    });
  }

  private shakeInvalidFields(): void {
    document
      .querySelectorAll(
        '.pf-field input.ng-invalid.ng-touched, .pf-field textarea.ng-invalid.ng-touched, .pf-field select.ng-invalid.ng-touched',
      )
      .forEach((el) => {
        const input = el as HTMLElement;
        gsap
          .timeline()
          .to(input, { borderColor: '#FF4D4D', duration: 0.2 })
          .to(input, { x: -6, duration: 0.07 })
          .to(input, { x: 6, duration: 0.07 })
          .to(input, { x: -4, duration: 0.07 })
          .to(input, { x: 4, duration: 0.07 })
          .to(input, { x: 0, duration: 0.07 });
      });
  }

  private showSaveToast(success: boolean): void {
    const toast = document.createElement('div');
    toast.className = 'profile-toast';
    toast.textContent = success ? 'Saved successfully' : 'Something went wrong';
    toast.style.cssText =
      'position:fixed;top:1rem;right:1rem;z-index:9999;padding:0.85rem 1.25rem;border-radius:14px;background:rgba(10,10,15,0.95);border:1px solid rgba(46,204,113,0.6);color:#fff;font-size:0.9rem;backdrop-filter:blur(12px)';
    if (!success) {
      toast.style.borderColor = 'rgba(255,77,77,0.6)';
    }
    document.body.appendChild(toast);
    gsap.fromTo(toast, { x: 100, opacity: 0 }, { x: 0, opacity: 1, duration: 0.4, ease: 'power3.out' });
    gsap.to(toast, { x: 100, opacity: 0, duration: 0.3, delay: 3, onComplete: () => toast.remove() });
  }

  private positionTabUnderlineFromRects(): void {
    const row = this.tabsRow?.nativeElement;
    const u = this.tabsUnderline?.nativeElement;
    const tabs = document.querySelectorAll('.profile-tab.tab-item');
    const active = tabs[this.tabIndex] as HTMLElement | undefined;
    if (!row || !u || !active) {
      return;
    }
    const rr = row.getBoundingClientRect();
    const tr = active.getBoundingClientRect();
    gsap.set(u, { x: tr.left - rr.left + row.scrollLeft, width: tr.width });
  }

  private async refreshQrImg(uid: string): Promise<void> {
    try {
      const { toDataURL } = await import('qrcode');
      this.qrImgSrc = await toDataURL(uid, {
        width: 240,
        margin: 1,
        color: { dark: '#7b5ea7ff', light: '#0a0a0fff' },
      });
      this.cdr.markForCheck();
      queueMicrotask(() => {
        const delay = this.qrRevealDone ? 0 : 1.0;
        this.qrRevealDone = true;
        gsap.from('.qr-code-wrapper', {
          scale: 0,
          opacity: 0,
          rotation: -10,
          duration: 0.8,
          delay,
          ease: 'elastic.out(1, 0.6)',
        });
      });
    } catch {
      this.qrImgSrc = '';
    }
  }

  private patchForms(p: UserProfile): void {
    this.personalForm.patchValue({
      firstName: p.firstName,
      lastName: p.lastName,
      phone: p.phone ?? '',
      dateOfBirth: p.dateOfBirth ?? '',
      bio: p.bio ?? '',
      street: p.address?.street ?? '',
      city: p.address?.city ?? '',
      country: p.address?.country ?? '',
    });
    this.prefsForm.patchValue({
      language: p.preferences.language,
      theme: p.preferences.theme,
      emailWhenAvailable: p.preferences.emailWhenAvailable,
      emailDueReminder: p.preferences.emailDueReminder,
      pushNotifications: p.preferences.pushNotifications,
      catalogueView: p.preferences.catalogueView,
    });
  }

  private async loadActivity(uid: string): Promise<void> {
    try {
      const q = query(
        collection(this.fs, 'users', uid, 'activity'),
        orderBy('at', 'desc'),
        limit(10),
      );
      const snap = await getDocs(q);
      const rows: ActivityRow[] = [];
      snap.forEach((d) => {
        const x = d.data() as { text?: string; at?: Timestamp; tone?: ActivityRow['tone'] };
        rows.push({
          text: x.text ?? '',
          at: x.at?.toDate?.() ?? new Date(),
          tone: x.tone ?? 'borrow',
        });
      });
      this.activity = rows.length
        ? rows
        : [
            {
              text: 'Welcome — loan and return events will show here.',
              at: new Date(),
              tone: 'review',
            },
          ];
    } catch {
      this.activity = [
        {
          text: 'Activity timeline (add Firestore users/{uid}/activity with field `at`).',
          at: new Date(),
          tone: 'review',
        },
      ];
    }
    this.cdr.markForCheck();
    this.zone.runOutsideAngular(() => {
      gsap.from('.activity-row', {
        x: 24,
        opacity: 0,
        stagger: 0.06,
        duration: 0.45,
        ease: 'power2.out',
        delay: 0.05,
      });
    });
  }

  private initThree(): void {
    const host = this.threeHost?.nativeElement;
    if (!host) {
      return;
    }
    const w = host.clientWidth || window.innerWidth;
    const h = 280;
    this.scene = new Scene();
    // Transparent canvas (Three r152+); TS types may still expect Color
    this.scene.background = null as never;

    this.camera = new PerspectiveCamera(42, w / h, 0.1, 100);
    this.camera.position.set(0, 3.2, 7);
    this.camera.lookAt(0, 0.5, 0);

    this.renderer = new WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(w, h);
    host.appendChild(this.renderer.domElement);

    this.scene.add(new AmbientLight(0xffffff, 0.35));
    const pl = new PointLight(0x7b5ea7, 1.2, 40);
    pl.position.set(4, 6, 4);
    this.scene.add(pl);

    this.ring = new Group();
    const cols = [0x7b5ea7, 0x00d4ff, 0xc45c38, 0x8b2942, 0x2ecc71];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const spine = new Mesh(
        new BoxGeometry(0.12, 0.85, 0.35),
        new MeshStandardMaterial({
          color: cols[i % cols.length],
          roughness: 0.6,
          metalness: 0.1,
          transparent: true,
          opacity: 0.35,
        }),
      );
      spine.position.set(Math.cos(a) * 2.2, 0.4, Math.sin(a) * 2.2);
      spine.rotation.y = -a;
      this.ring.add(spine);
    }
    this.scene.add(this.ring);

    const loop = (): void => {
      this.anim = requestAnimationFrame(loop);
      if (this.ring) {
        this.ring.rotation.y += 0.003;
      }
      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }
    };
    loop();
  }

  roleLabel(role: Role): string {
    switch (role) {
      case Role.ADMIN:
        return 'ADMIN';
      case Role.BIBLIOTHECAIRE:
        return 'LIBRARIAN';
      default:
        return 'MEMBER';
    }
  }

  memberSince(ts: Timestamp | undefined): string {
    if (!ts?.toDate) {
      return '—';
    }
    return ts.toDate().toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  }

  selectTab(i: number): void {
    if (i === this.tabIndex) {
      return;
    }
    const exitPanel = document.querySelector('.profile-tab-panel.is-active') as HTMLElement | null;
    const finishSwitch = (): void => {
      this.zone.run(() => {
        this.tabIndex = i;
        this.cdr.markForCheck();
        requestAnimationFrame(() => {
          const row = this.tabsRow?.nativeElement;
          const u = this.tabsUnderline?.nativeElement;
          const tabs = document.querySelectorAll('.profile-tab.tab-item');
          const clicked = tabs[i] as HTMLElement | undefined;
          if (row && u && clicked) {
            const rr = row.getBoundingClientRect();
            const tr = clicked.getBoundingClientRect();
            gsap.to(u, {
              x: tr.left - rr.left + row.scrollLeft,
              width: tr.width,
              duration: 0.35,
              ease: 'power2.inOut',
            });
          }
          const activePanel = document.querySelector('.profile-tab-panel.is-active.tab-content-active') as HTMLElement | null;
          if (activePanel) {
            gsap.fromTo(
              activePanel,
              { opacity: 0, x: 20 },
              { opacity: 1, x: 0, duration: 0.3, ease: 'power2.out' },
            );
            gsap.from(activePanel.querySelectorAll('.form-group'), {
              y: 15,
              opacity: 0,
              stagger: 0.06,
              duration: 0.35,
              ease: 'power2.out',
              delay: 0.2,
            });
          }
          this.setupSaveButtonAnimations();
          if (i === 0) {
            this.tryBindBioCounter();
          }
        });
      });
    };

    if (exitPanel) {
      const exitTl = gsap.timeline({ onComplete: finishSwitch });
      exitTl.to(exitPanel, { opacity: 0, x: -20, duration: 0.2 });
    } else {
      finishSwitch();
    }
  }

  toggleAddress(): void {
    this.addressOpen = !this.addressOpen;
    this.cdr.markForCheck();
  }

  async onAvatar(ev: Event): Promise<void> {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    const user = this.auth.currentUser;
    if (!file || !user) {
      return;
    }
    this.avatarBusy = true;
    this.uploadProgress = 0;
    this.cdr.markForCheck();
    const path = `users/${user.uid}/avatar.jpg`;
    const ref = storageRef(this.storage, path);
    const task = uploadBytesResumable(ref, file);
    task.on(
      'state_changed',
      (s) => {
        this.uploadProgress = s.totalBytes ? Math.round((100 * s.bytesTransferred) / s.totalBytes) : 0;
        this.cdr.markForCheck();
      },
      () => {
        this.avatarBusy = false;
        this.cdr.markForCheck();
      },
      async () => {
        const url = await getDownloadURL(ref);
        await updateProfile(user, { photoURL: url });
        await updateDoc(doc(this.fs, 'users', user.uid), { photoURL: url });
        const avatarEl = this.avatarWrapper?.nativeElement;
        if (avatarEl) {
          const tl = gsap.timeline();
          tl.to(avatarEl, { scale: 0.85, duration: 0.15 })
            .to(avatarEl, { scale: 1.1, duration: 0.3, ease: 'back.out(2)' })
            .to(avatarEl, { scale: 1, duration: 0.2 });
          gsap.fromTo(
            avatarEl,
            { boxShadow: '0 0 0px rgba(123,94,167,0)' },
            {
              boxShadow: '0 0 30px rgba(123,94,167,1)',
              duration: 0.4,
              yoyo: true,
              repeat: 1,
            },
          );
        }
        this.avatarBusy = false;
        this.uploadProgress = 0;
        this.cdr.markForCheck();
      },
    );
  }

  async savePersonal(): Promise<void> {
    if (this.personalForm.invalid) {
      this.personalForm.markAllAsTouched();
      this.shakeInvalidFields();
      return;
    }
    const user = this.auth.currentUser;
    if (!user) {
      return;
    }
    const btn = this.personalSaveBtn?.nativeElement;
    const label = btn?.querySelector('.btn-save-label');
    const spinner = btn?.querySelector('.btn-save-spinner');
    const check = btn?.querySelector('.btn-save-check');
    this.saveBusy = true;
    btn?.classList.add('is-loading');
    this.cdr.markForCheck();
    if (label && spinner) {
      gsap.to(label, { opacity: 0, y: -10, duration: 0.2 });
      gsap.fromTo(spinner, { opacity: 0, rotation: 0 }, { opacity: 1, duration: 0.15 });
      gsap.to(spinner, { rotation: '+=360', duration: 0.8, repeat: -1, ease: 'none' });
    }
    const v = this.personalForm.getRawValue();
    const displayName = `${v.firstName} ${v.lastName}`.trim();
    try {
      await updateProfile(user, { displayName });
      await updateDoc(doc(this.fs, 'users', user.uid), {
        firstName: v.firstName,
        lastName: v.lastName,
        displayName,
        phone: v.phone || null,
        dateOfBirth: v.dateOfBirth || null,
        bio: v.bio || null,
        address: {
          street: v.street || '',
          city: v.city || '',
          country: v.country || '',
        },
      });
      if (spinner) {
        gsap.killTweensOf(spinner);
      }
      btn?.classList.remove('is-loading');
      if (label) {
        gsap.set(label, { opacity: 1, y: 0 });
      }
      if (spinner) {
        gsap.set(spinner, { opacity: 0, rotation: 0 });
      }
      const successTl = gsap.timeline({
        onComplete: () => {
          if (btn) {
            gsap.set(btn, { clearProps: 'backgroundColor' });
          }
        },
      });
      if (btn && check) {
        successTl
          .to(btn, { backgroundColor: '#1D9E75', duration: 0.3 })
          .fromTo(
            check,
            { opacity: 0, scale: 0 },
            { opacity: 1, scale: 1, duration: 0.4, ease: 'elastic.out(1, 0.5)' },
            '<',
          )
          .to(btn, { backgroundColor: '#7B5EA7', duration: 0.4, delay: 1.5 });
        gsap.delayedCall(2.2, () => gsap.set(check, { opacity: 0, scale: 0 }));
      }
      this.showSaveToast(true);
    } catch {
      if (spinner) {
        gsap.killTweensOf(spinner);
      }
      btn?.classList.remove('is-loading');
      if (label) {
        gsap.set(label, { opacity: 1, y: 0 });
      }
      if (spinner) {
        gsap.set(spinner, { opacity: 0, rotation: 0 });
      }
      if (btn) {
        gsap.to(btn, { backgroundColor: '#FF4D4D', duration: 0.2 });
        const shake = gsap.timeline({
          onComplete: () => gsap.set(btn, { clearProps: 'backgroundColor,x' }),
        });
        shake
          .to(btn, { x: -8, duration: 0.07 })
          .to(btn, { x: 8, duration: 0.07 })
          .to(btn, { x: -6, duration: 0.07 })
          .to(btn, { x: 6, duration: 0.07 })
          .to(btn, { x: -4, duration: 0.07 })
          .to(btn, { x: 4, duration: 0.07 })
          .to(btn, { x: 0, duration: 0.07 });
      }
      this.showSaveToast(false);
    } finally {
      this.saveBusy = false;
      this.cdr.markForCheck();
    }
  }

  async savePreferences(): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) {
      return;
    }
    const p = this.prefsForm.getRawValue();
    await updateDoc(doc(this.fs, 'users', user.uid), {
      preferences: {
        language: p.language,
        theme: p.theme,
        notifications: true,
        emailAlerts: true,
        emailWhenAvailable: p.emailWhenAvailable,
        emailDueReminder: p.emailDueReminder,
        pushNotifications: p.pushNotifications,
        catalogueView: p.catalogueView,
      },
    });
    const card = document.querySelector('.prefs-card');
    if (card) {
      gsap.fromTo(
        card,
        { boxShadow: '0 0 0 rgba(46,204,113,0)' },
        {
          boxShadow: '0 0 28px rgba(46,204,113,0.45)',
          duration: 0.4,
          yoyo: true,
          repeat: 1,
        },
      );
    }
    this.cdr.markForCheck();
  }

  async updatePassword(): Promise<void> {
    const user = this.auth.currentUser;
    const email = user?.email;
    if (!user || !email || this.securityForm.invalid) {
      this.securityForm.markAllAsTouched();
      return;
    }
    const { currentPassword, newPassword, confirmPassword } = this.securityForm.getRawValue();
    if (newPassword !== confirmPassword) {
      return;
    }
    this.pwdBusy = true;
    try {
      const cred = EmailAuthProvider.credential(email, currentPassword);
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, newPassword);
      this.securityForm.reset();
    } finally {
      this.pwdBusy = false;
      this.cdr.markForCheck();
    }
  }

  async confirmDelete(): Promise<void> {
    if (this.deletePhrase !== 'DELETE') {
      return;
    }
    const user = this.auth.currentUser;
    if (!user) {
      return;
    }
    try {
      await user.delete();
    } catch {
      /* requires recent login */
    }
    this.deleteOpen = false;
    this.cdr.markForCheck();
  }

  async downloadCard(ev?: Event): Promise<void> {
    const trigger = (ev?.currentTarget as HTMLElement | undefined) ?? document.querySelector('.btn-download-card');
    if (trigger) {
      gsap
        .timeline()
        .to(trigger, { scale: 0.95, duration: 0.1 })
        .to(trigger, { scale: 1.05, duration: 0.2 })
        .to(trigger, { scale: 1, duration: 0.15 });
    }
    const { toDataURL } = await import('qrcode');
    const user = this.auth.currentUser;
    if (!user) {
      return;
    }
    const url = await toDataURL(user.uid, {
      width: 512,
      margin: 2,
      color: { dark: '#7b5ea7ff', light: '#0a0a0fff' },
    });
    const a = document.createElement('a');
    a.href = url;
    a.download = `BookCloud-card-${user.uid.slice(-4)}.png`;
    a.click();
  }

  bioCount(): number {
    return this.personalForm.controls.bio.value?.length ?? 0;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.sub.unsubscribe();
    ScrollTrigger.getAll().forEach((t) => t.kill());
    gsap.killTweensOf([
      '.profile-page .profile-card',
      '.profile-page .stat-card',
      '.profile-page .member-card',
      '.profile-page .avatar-wrapper',
      '.profile-page .form-group',
      '.profile-page .tab-item',
      '.profile-page .profile-save-btn',
      '.profile-page .qr-code-wrapper',
      '.profile-page .profile-form-panel',
    ]);
    if (this.typewriterInterval) {
      clearInterval(this.typewriterInterval);
    }
    this.avatarHoverCleanups.forEach((fn) => fn());
    this.statHoverCleanups.forEach((fn) => fn());
    this.formInteractCleanups.forEach((fn) => fn());
    this.saveBtnCleanups.forEach((fn) => fn());
    this.coverHoverCleanups.forEach((fn) => fn());
    this.downloadCleanups.forEach((fn) => fn());
    this.bioInputCleanup?.();
    cancelAnimationFrame(this.anim);
    if (this.renderer) {
      this.renderer.dispose();
    }
  }
}
