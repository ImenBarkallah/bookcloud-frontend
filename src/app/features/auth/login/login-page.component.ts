import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  NgZone,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import gsap from 'gsap';
import {
  AmbientLight,
  BoxGeometry,
  BufferGeometry,
  Color,
  Fog,
  Float32BufferAttribute,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  PointLight,
  Points,
  PointsMaterial,
  Scene,
  WebGLRenderer,
} from 'three';
import { AuthService } from '../../../core/services/auth.service';
import { AuthToastService } from '../../../core/services/auth-toast.service';

@Component({
  selector: 'app-login-page',
  templateUrl: './login-page.component.html',
  styleUrls: ['./login-page.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPageComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('canvasHost', { static: true }) canvasHost!: ElementRef<HTMLDivElement>;
  @ViewChild('emailInput') emailInput?: ElementRef<HTMLInputElement>;
  @ViewChild('pwdInput') pwdInput?: ElementRef<HTMLInputElement>;
  @ViewChild('submitBtn') submitBtn?: ElementRef<HTMLButtonElement>;
  @ViewChild('forgotSheet') forgotSheet?: ElementRef<HTMLElement>;
  @ViewChild('forgotEnvelope') forgotEnvelope?: ElementRef<HTMLElement>;
  @ViewChild('forgotEmailInput') forgotEmailInput?: ElementRef<HTMLInputElement>;

  private readonly zone = inject(NgZone);
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(AuthToastService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly loginForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    remember: [false],
  });

  readonly forgotEmailForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  loading = false;
  forgotModalOpen = false;
  forgotSuccess = false;
  forgotLoading = false;
  showPassword = false;
  useThree = true;
  emailFocused = false;
  pwdFocused = false;

  private renderer?: WebGLRenderer;
  private scene?: Scene;
  private camera?: PerspectiveCamera;
  private animationId = 0;
  private dust?: Points;
  private entrance?: gsap.core.Timeline;
  private tweens: gsap.core.Tween[] = [];
  private forgotEnvelopeFloat?: gsap.core.Tween;
  private camZ = 12;
  private targetCam = { x: 0, y: 1.6 };

  ngOnInit(): void {
    void this.redirectIfAlreadySignedIn();
  }

  /** After Google redirect, session is ready here; also sends logged-in users away from `/login`. */
  private async redirectIfAlreadySignedIn(): Promise<void> {
    await this.auth.redirectHandled;
    await this.auth.authStateReady();
    if (this.auth.currentUser) {
      await this.router.navigateByUrl('/home');
    }
  }

  ngAfterViewInit(): void {
    this.useThree = typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches;
    if (this.useThree) {
      this.zone.runOutsideAngular(() => this.initThree());
    }
    this.zone.runOutsideAngular(() => this.runEntranceAnimations());
    this.setupGoogleHover();
    this.setupSubmitHover();
  }

  private setupGoogleHover(): void {
    const btn = document.querySelector('.btn-google');
    if (!btn) {
      return;
    }
    const tw = gsap.to(btn, { scale: 1.02, paused: true, duration: 0.25, ease: 'power2.out' });
    btn.addEventListener('mouseenter', () => tw.play());
    btn.addEventListener('mouseleave', () => tw.reverse());
    this.tweens.push(tw);
  }

  private setupSubmitHover(): void {
    const btn = this.submitBtn?.nativeElement;
    if (!btn) {
      return;
    }
    const tw = gsap.to(btn, { scale: 1.03, filter: 'brightness(1.1)', paused: true, duration: 0.25 });
    btn.addEventListener('mouseenter', () => tw.play());
    btn.addEventListener('mouseleave', () => tw.reverse());
    this.tweens.push(tw);
  }

  private runEntranceAnimations(): void {
    this.entrance = gsap.timeline({ defaults: { ease: 'power3.out' } });
    const canvasLayer = document.querySelector('.login-canvas-layer');
    if (canvasLayer) {
      this.entrance.from(canvasLayer, { opacity: 0, duration: 1 }, 0);
    }
    this.entrance.from(
      '.login-card',
      { y: 40, opacity: 0, duration: 0.7 },
      0.15,
    );
    this.entrance.from(
      '.login-book-icon',
      { scale: 0, duration: 0.65, ease: 'elastic.out(1, 0.6)' },
      0.55,
    );
    this.entrance.from('.login-title-block .t1', { y: 24, opacity: 0, duration: 0.35 }, 0.65);
    this.entrance.from('.login-title-block .t2', { y: 24, opacity: 0, duration: 0.35 }, 0.78);
    this.entrance.from('.btn-google', { x: -24, opacity: 0, duration: 0.35 }, 0.85);
    this.entrance.from('.divider', { scaleX: 0, opacity: 0, duration: 0.3 }, 0.92);
    this.entrance.from('.field-email', { x: -28, opacity: 0, duration: 0.35 }, 1);
    this.entrance.from('.field-password', { x: -28, opacity: 0, duration: 0.35 }, 1.12);
    this.entrance.from('.login-meta-row', { opacity: 0, duration: 0.3 }, 1.2);
    this.entrance.from('.btn-submit', { y: 20, opacity: 0, duration: 0.4 }, 1.28);
    this.entrance.from('.login-footer-link', { opacity: 0, duration: 0.35 }, 1.38);
  }

  private initThree(): void {
    const host = this.canvasHost.nativeElement;
    const w = window.innerWidth;
    const h = window.innerHeight;

    this.scene = new Scene();
    this.scene.background = new Color(0x0a0a0f);
    this.scene.fog = new Fog(0x0a0a0f, 5, 28);

    this.camera = new PerspectiveCamera(58, w / h, 0.1, 120);
    this.camera.position.set(0, 1.55, this.camZ);

    this.renderer = new WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(w, h);
    host.appendChild(this.renderer.domElement);

    const ambient = new AmbientLight(0xfff5e4, 0.55);
    this.scene.add(ambient);
    const purple = new PointLight(0x7b5ea7, 2.2, 40);
    purple.position.set(0, 6, 4);
    this.scene.add(purple);

    const floor = new Mesh(
      new PlaneGeometry(24, 140),
      new MeshStandardMaterial({ color: 0x151018, roughness: 0.95, metalness: 0.05 }),
    );
    floor.rotation.x = -Math.PI / 2;
    this.scene.add(floor);

    const shelfMat = new MeshStandardMaterial({ color: 0x4a382f, roughness: 0.85 });
    const bookCols = [0xc45c38, 0x8b2942, 0x7a4a30, 0xb87333, 0xa84858];

    for (let z = -55; z < 55; z += 4.2) {
      for (const side of [-1, 1] as const) {
        const shelf = new Mesh(new BoxGeometry(0.2, 2.8, 2.6), shelfMat);
        shelf.position.set(side * 3.6, 1.4, z);
        this.scene.add(shelf);
        for (let i = 0; i < 9; i++) {
          const bh = 0.18 + Math.random() * 0.28;
          const book = new Mesh(
            new BoxGeometry(0.24, bh, 0.38),
            new MeshStandardMaterial({
              color: bookCols[i % bookCols.length],
              roughness: 0.55,
              metalness: 0.1,
            }),
          );
          book.position.set(
            side * 3.42,
            0.35 + bh / 2 + (i % 3) * 0.42,
            z + ((i % 3) - 1) * 0.55,
          );
          this.scene.add(book);
        }
      }
    }

    const dustPos = new Float32Array(150 * 3);
    for (let i = 0; i < 150; i++) {
      dustPos[i * 3] = (Math.random() - 0.5) * 10;
      dustPos[i * 3 + 1] = Math.random() * 4;
      dustPos[i * 3 + 2] = -30 + Math.random() * 60;
    }
    const dg = new BufferGeometry();
    dg.setAttribute('position', new Float32BufferAttribute(dustPos, 3));
    this.dust = new Points(
      dg,
      new PointsMaterial({
        color: 0xfff5e4,
        size: 0.045,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
      }),
    );
    this.scene.add(this.dust);

    let t = 0;
    const animate = () => {
      this.animationId = requestAnimationFrame(animate);
      t += 0.016;
      this.camZ -= 0.028;
      if (this.camZ < -28) {
        this.camZ += 52;
      }
      if (this.camera) {
        this.camera.position.z = this.camZ;
        this.camera.position.x += (this.targetCam.x - this.camera.position.x) * 0.06;
        this.camera.position.y += (this.targetCam.y - this.camera.position.y) * 0.06;
        this.camera.lookAt(0, 1.55, this.camZ - 24);
      }
      if (this.dust) {
        const arr = this.dust.geometry.attributes['position'].array as Float32Array;
        for (let i = 0; i < 150; i++) {
          arr[i * 3 + 1] += 0.004;
          if (arr[i * 3 + 1] > 5) {
            arr[i * 3 + 1] = 0;
          }
        }
        this.dust.geometry.attributes['position'].needsUpdate = true;
      }
      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }
    };
    animate();
  }

  @HostListener('window:mousemove', ['$event'])
  onMouseMove(ev: MouseEvent): void {
    if (!this.useThree || !this.camera) {
      return;
    }
    const nx = (ev.clientX / window.innerWidth - 0.5) * 0.6;
    const ny = (ev.clientY / window.innerHeight - 0.5) * 0.35;
    this.targetCam.x = Math.max(-0.3, Math.min(0.3, nx));
    this.targetCam.y = 1.55 + Math.max(-0.15, Math.min(0.15, -ny));
  }

  @HostListener('document:keydown', ['$event'])
  onDocumentKeydown(ev: KeyboardEvent): void {
    if (ev.key === 'Escape' && this.forgotModalOpen) {
      ev.preventDefault();
      void this.closeForgotModal();
    }
  }

  @HostListener('window:resize')
  onResize(): void {
    if (!this.renderer || !this.camera) {
      return;
    }
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  togglePwdVisibility(): void {
    this.showPassword = !this.showPassword;
    const eye = document.querySelector('.eye-toggle');
    if (eye) {
      gsap.to(eye, { rotation: this.showPassword ? 180 : 0, duration: 0.35, ease: 'power2.out' });
    }
    this.cdr.markForCheck();
  }

  async submit(): Promise<void> {
    if (this.loginForm.invalid) {
      this.shakeCard();
      return;
    }
    const { email, password } = this.loginForm.getRawValue();
    this.loading = true;
    this.cdr.markForCheck();
    try {
      await this.auth.signInWithEmail(email, password);
      await this.successTransition();
      await this.router.navigateByUrl('/home');
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code ?? '';
      this.toast.showErrorFromFirebase(code);
      this.shakeCard();
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  async google(): Promise<void> {
    this.loading = true;
    this.cdr.markForCheck();
    try {
      await this.auth.signInWithGoogle();
      // Full-page redirect to Google — success runs after return via `redirectHandled` + `ngOnInit` navigate.
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code ?? '';
      this.toast.showErrorFromFirebase(code);
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  openForgotModal(): void {
    const prefilled = this.loginForm.controls.email.value?.trim() ?? '';
    this.forgotEmailForm.reset({ email: prefilled });
    this.forgotSuccess = false;
    this.forgotModalOpen = true;
    if (typeof document !== 'undefined') {
      document.body.style.overflow = 'hidden';
    }
    this.cdr.detectChanges();
    queueMicrotask(() => {
      this.zone.runOutsideAngular(() => this.playForgotModalOpen());
      this.zone.run(() => {
        this.forgotEmailInput?.nativeElement?.focus();
        this.cdr.markForCheck();
      });
    });
  }

  async closeForgotModal(): Promise<void> {
    if (!this.forgotModalOpen) {
      return;
    }
    const backdrop = document.querySelector('.forgot-reset-backdrop');
    const sheet = this.forgotSheet?.nativeElement;
    this.forgotEnvelopeFloat?.kill();
    this.forgotEnvelopeFloat = undefined;
    const envEl = this.forgotEnvelope?.nativeElement;
    if (envEl) {
      gsap.killTweensOf(envEl);
    }
    if (backdrop && sheet) {
      await Promise.all([
        gsap.to(backdrop, { opacity: 0, duration: 0.3, ease: 'power2.in' }),
        gsap.to(sheet, { y: '100%', duration: 0.45, ease: 'power3.in' }),
      ]);
    }
    this.zone.run(() => {
      this.forgotModalOpen = false;
      this.forgotSuccess = false;
      this.forgotEmailForm.reset({ email: '' });
      if (typeof document !== 'undefined') {
        document.body.style.overflow = '';
      }
      this.cdr.markForCheck();
    });
  }

  async submitForgotReset(): Promise<void> {
    if (this.forgotEmailForm.invalid) {
      this.forgotEmailForm.markAllAsTouched();
      this.cdr.markForCheck();
      return;
    }
    const email = this.forgotEmailForm.getRawValue().email.trim();
    this.forgotLoading = true;
    this.cdr.markForCheck();
    try {
      await this.auth.sendPasswordReset(email);
      this.forgotSuccess = true;
      this.cdr.detectChanges();
      this.zone.runOutsideAngular(() => this.playForgotSuccessAnimation());
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code ?? '';
      this.toast.showErrorFromFirebase(code);
    } finally {
      this.forgotLoading = false;
      this.cdr.markForCheck();
    }
  }

  private playForgotModalOpen(): void {
    const backdrop = document.querySelector('.forgot-reset-backdrop');
    const sheet = this.forgotSheet?.nativeElement;
    if (!backdrop || !sheet) {
      return;
    }
    gsap.set(sheet, { y: '100%' });
    gsap.set(backdrop, { opacity: 0 });
    gsap.to(backdrop, { opacity: 1, duration: 0.38, ease: 'power2.out' });
    gsap.to(sheet, { y: 0, duration: 0.58, ease: 'power3.out', delay: 0.04 });
  }

  private playForgotSuccessAnimation(): void {
    const wrap = this.forgotEnvelope?.nativeElement;
    if (!wrap) {
      return;
    }
    this.forgotEnvelopeFloat?.kill();
    gsap.killTweensOf(wrap);
    gsap.fromTo(
      wrap,
      { scale: 0.45, opacity: 0, rotateX: -22, transformPerspective: 520 },
      {
        scale: 1,
        opacity: 1,
        rotateX: 0,
        duration: 0.75,
        ease: 'elastic.out(1, 0.62)',
      },
    );
    this.forgotEnvelopeFloat = gsap.to(wrap, {
      y: -12,
      duration: 1.45,
      ease: 'sine.inOut',
      repeat: -1,
      yoyo: true,
    });
  }

  private async successTransition(): Promise<void> {
    const card = document.querySelector('.login-card');
    if (!card) {
      return;
    }
    await gsap.to(card, { scale: 1.06, duration: 0.22, ease: 'power2.out' });
    card.classList.add('login-success-flash');
    await gsap.to(card, { scale: 1, duration: 0.35, ease: 'power2.out' });
    card.classList.remove('login-success-flash');
  }

  private shakeCard(): void {
    const card = document.querySelector('.login-card');
    if (!card) {
      return;
    }
    gsap.fromTo(
      card,
      { x: 0 },
      { x: 10, duration: 0.06, repeat: 5, yoyo: true, ease: 'power1.inOut' },
    );
  }

  ripple(ev: MouseEvent): void {
    const btn = ev.currentTarget as HTMLElement;
    const r = document.createElement('span');
    r.className = 'ripple-dot';
    const rect = btn.getBoundingClientRect();
    r.style.left = `${ev.clientX - rect.left}px`;
    r.style.top = `${ev.clientY - rect.top}px`;
    btn.appendChild(r);
    gsap.fromTo(r, { scale: 0, opacity: 0.6 }, { scale: 4, opacity: 0, duration: 0.55, onComplete: () => r.remove() });
  }

  ngOnDestroy(): void {
    this.forgotEnvelopeFloat?.kill();
    if (this.forgotModalOpen && typeof document !== 'undefined') {
      document.body.style.overflow = '';
    }
    cancelAnimationFrame(this.animationId);
    this.entrance?.kill();
    this.tweens.forEach((t) => t.kill());
    if (this.renderer) {
      this.renderer.dispose();
      const lose = this.renderer
        .getContext()
        .getExtension('WEBGL_lose_context') as { loseContext: () => void } | null;
      lose?.loseContext();
    }
    this.scene?.traverse((o) => {
      if (o instanceof Mesh) {
        o.geometry.dispose();
        const mat = o.material;
        if (Array.isArray(mat)) {
          mat.forEach((m) => m.dispose());
        } else {
          mat.dispose();
        }
      }
    });
    this.dust?.geometry.dispose();
    (this.dust?.material as PointsMaterial)?.dispose?.();
  }
}
