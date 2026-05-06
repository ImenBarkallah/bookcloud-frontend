import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  NgZone,
  OnDestroy,
  ViewChild,
  inject,
} from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import gsap from 'gsap';
import { firstValueFrom } from 'rxjs';
import {
  AmbientLight,
  BoxGeometry,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  PointLight,
  Points,
  PointsMaterial,
  Scene,
  SpotLight,
  WebGLRenderer,
} from 'three';
import { AuthService } from '../../../core/services/auth.service';
import { BackendApiService } from '../../system/services/backend-api.service';
import { AuthToastService } from '../../../core/services/auth-toast.service';
import { passwordsMatchValidator } from './register-validators';

function passwordStrength(p: string): number {
  let s = 0;
  if (p.length >= 8) {
    s++;
  }
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) {
    s++;
  }
  if (/\d/.test(p)) {
    s++;
  }
  if (/[^a-zA-Z0-9]/.test(p)) {
    s++;
  }
  return Math.min(s, 4);
}

@Component({
  selector: 'app-register-page',
  templateUrl: './register-page.component.html',
  styleUrls: ['./register-page.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterPageComponent implements AfterViewInit, OnDestroy {
  readonly rainDrops = [0, 1, 2, 3, 4, 5];
  @ViewChild('canvasHost', { static: true }) canvasHost!: ElementRef<HTMLDivElement>;
  @ViewChild('stepPanels') stepPanels?: ElementRef<HTMLElement>;
  @ViewChild('checkPath') checkPath?: ElementRef<SVGPathElement>;

  private readonly zone = inject(NgZone);
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly backend = inject(BackendApiService);
  private readonly router = inject(Router);
  private readonly toast = inject(AuthToastService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly accountForm = this.fb.nonNullable.group(
    {
      fullName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirm: ['', Validators.required],
    },
    { validators: passwordsMatchValidator },
  );

  readonly profileForm = this.fb.nonNullable.group({
    phone: [''],
  });

  step = 1;
  useThree = true;
  loading = false;
  avatarPreview: string | null = null;
  memberId = '';
  qrPayload = '';
  qrDataUrl = '';
  countdown = 3;
  successName = '';

  private renderer?: WebGLRenderer;
  private scene?: Scene;
  private camera?: PerspectiveCamera;
  private worldGroup = new Group();
  private bookGroups: Group[] = [];
  private animationId = 0;
  private particles?: Points;
  private entrance?: gsap.core.Timeline;
  private timerId?: ReturnType<typeof setInterval>;
  private tilt = { x: 0, y: 0 };

  constructor() {
    this.memberId = `MEM-${Date.now().toString(36).toUpperCase()}`;
    this.qrPayload = this.memberId;
  }

  /** Bound to password confirm field micro-animation (group-level match). */
  readonly confirmAnimOk = (): boolean => this.confirmOk();

  ngAfterViewInit(): void {
    this.useThree = typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches;
    if (this.useThree) {
      this.zone.runOutsideAngular(() => this.initReadingRoom());
    }
    this.zone.runOutsideAngular(() => this.runEntrance());
    this.accountForm.controls.password.valueChanges.subscribe(() => {
      this.animateStrengthBar();
      this.cdr.markForCheck();
    });
    void this.refreshQrImage();
  }

  private async refreshQrImage(): Promise<void> {
    try {
      const { toDataURL } = await import('qrcode');
      this.qrDataUrl = await toDataURL(this.qrPayload, {
        width: 128,
        margin: 1,
        color: { dark: '#e8e4f2ff', light: '#141018ff' },
      });
      this.cdr.markForCheck();
    } catch {
      this.qrDataUrl = '';
    }
  }

  strengthScore(): number {
    return passwordStrength(this.accountForm.controls.password.value);
  }

  strengthLabelKey(): string {
    const keys = ['REGISTER.STRENGTH_WEAK', 'REGISTER.STRENGTH_FAIR', 'REGISTER.STRENGTH_GOOD', 'REGISTER.STRENGTH_STRONG'];
    const s = Math.min(Math.max(this.strengthScore(), 1), 4);
    return keys[s - 1];
  }

  private animateStrengthBar(): void {
    const segs = document.querySelectorAll('.str-seg');
    const score = this.strengthScore();
    segs.forEach((el, i) => {
      const active = i < score;
      gsap.to(el, {
        scaleY: active ? 1 : 0.35,
        opacity: active ? 1 : 0.35,
        duration: 0.35,
        ease: 'power2.out',
      });
      const colors = ['#e74c3c', '#f39c12', '#f1c40f', '#2ecc71'];
      if (active) {
        gsap.to(el, { backgroundColor: colors[Math.min(score - 1, 3)], duration: 0.25 });
      }
    });
    this.cdr.markForCheck();
  }

  confirmMismatch(): boolean {
    const g = this.accountForm;
    return (
      g.hasError('mismatch') &&
      g.controls.confirm.dirty &&
      g.controls.confirm.value.length > 0
    );
  }

  confirmOk(): boolean {
    const g = this.accountForm;
    return (
      !g.hasError('mismatch') &&
      g.controls.confirm.valid &&
      g.controls.confirm.value === g.controls.password.value &&
      g.controls.confirm.dirty
    );
  }

  onAvatar(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !file.type.startsWith('image/')) {
      return;
    }
    if (this.avatarPreview?.startsWith('blob:')) {
      URL.revokeObjectURL(this.avatarPreview);
    }
    this.avatarPreview = URL.createObjectURL(file);
    const preview = document.querySelector('.avatar-circle');
    if (preview) {
      gsap.fromTo(preview, { scale: 0.85 }, { scale: 1, duration: 0.45, ease: 'back.out(1.6)' });
    }
    this.cdr.markForCheck();
  }

  nextStep(): void {
    if (this.step !== 1 || this.accountForm.invalid) {
      if (this.accountForm.invalid) {
        this.accountForm.markAllAsTouched();
        this.shake('.register-card');
      }
      return;
    }
    const p1 = document.querySelector('.panel-one');
    const p2 = document.querySelector('.panel-two');
    const tl = gsap.timeline();
    if (p1) {
      tl.to(p1, { x: -80, opacity: 0, duration: 0.35, ease: 'power2.in' });
    }
    tl.add(() => {
      this.step = 2;
      this.memberId = `MEM-${Date.now().toString(36).toUpperCase()}`;
      this.qrPayload = `${this.memberId}|${this.accountForm.controls.email.value}`;
      this.cdr.markForCheck();
      void this.refreshQrImage();
    });
    if (p2) {
      tl.fromTo(p2, { x: 80, opacity: 0 }, { x: 0, opacity: 1, duration: 0.4, ease: 'power2.out' }, '-=0.05');
    }
    tl.add(() => this.flipPreviewCard());
  }

  private flipPreviewCard(): void {
    const card = document.querySelector('.member-card-preview');
    if (!card) {
      return;
    }
    gsap.set(card, { transformPerspective: 900 });
    gsap.fromTo(
      card,
      { rotationY: 90, opacity: 0 },
      { rotationY: 360, opacity: 1, duration: 1.1, ease: 'power3.out' },
    );
  }

  async submitRegistration(): Promise<void> {
    if (this.accountForm.invalid || this.confirmMismatch()) {
      this.accountForm.markAllAsTouched();
      return;
    }
    this.loading = true;
    this.cdr.markForCheck();
    const { email, password, fullName } = this.accountForm.getRawValue();
    try {
      await this.auth.registerWithEmail(email, password, fullName);
      await this.auth.getIdToken();
      try {
        await firstValueFrom(this.backend.me());
      } catch {
        /* Backend optionnel au premier provisioning */
      }
      this.successName = fullName.split(' ')[0] || fullName;
      const p2 = document.querySelector('.panel-two');
      const p3 = document.querySelector('.panel-three');
      const tl = gsap.timeline();
      if (p2) {
        tl.to(p2, { x: -80, opacity: 0, duration: 0.35 });
      }
      tl.add(() => {
        this.step = 3;
        this.cdr.markForCheck();
      });
      if (p3) {
        tl.fromTo(p3, { x: 80, opacity: 0 }, { x: 0, opacity: 1, duration: 0.45 }, '-=0.1');
      }
      tl.add(() => {
        requestAnimationFrame(() => {
          this.playSuccessAnimations();
          this.loading = false;
          this.cdr.markForCheck();
          this.startRedirectTimer();
        });
      });
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code ?? '';
      this.toast.showErrorFromFirebase(code);
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  private playSuccessAnimations(): void {
    const path = this.checkPath?.nativeElement;
    if (path) {
      const len = path.getTotalLength();
      path.style.strokeDasharray = `${len}`;
      path.style.strokeDashoffset = `${len}`;
      gsap.to(path, { strokeDashoffset: 0, duration: 1.1, ease: 'power2.inOut' });
    }
    gsap.from('.success-title', { y: 40, opacity: 0, duration: 0.55, ease: 'bounce.out', delay: 0.2 });
    gsap.from('.success-sub', { opacity: 0, duration: 0.6, delay: 0.5 });
    gsap.from('.rain-book', { y: -120, opacity: 0, stagger: 0.06, duration: 0.55, ease: 'power2.out', delay: 0.35 });
    gsap.from('.success-cta', { y: 24, opacity: 0, duration: 0.45, delay: 0.75 });
  }

  private startRedirectTimer(): void {
    this.countdown = 3;
    clearInterval(this.timerId);
    this.timerId = setInterval(() => {
      this.countdown--;
      this.cdr.markForCheck();
      if (this.countdown <= 0) {
        clearInterval(this.timerId);
        void this.router.navigateByUrl('/home');
      }
    }, 1000);
  }

  goDashboard(): void {
    clearInterval(this.timerId);
    void this.router.navigateByUrl('/home');
  }

  private initReadingRoom(): void {
    const host = this.canvasHost.nativeElement;
    const w = window.innerWidth;
    const h = window.innerHeight;

    this.scene = new Scene();
    this.scene.background = new Color(0x0a0a0f);

    this.camera = new PerspectiveCamera(48, w / h, 0.5, 200);
    this.camera.position.set(0, 14, 14);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(w, h);
    host.appendChild(this.renderer.domElement);

    const warm = new SpotLight(0xfff8e7, 2.4, 80, Math.PI / 5, 0.35, 1);
    warm.position.set(0, 22, 4);
    warm.target.position.set(0, 0, 0);
    this.scene.add(warm);
    this.scene.add(warm.target);

    const rim = new PointLight(0x7b5ea7, 1.4, 60);
    rim.position.set(-14, 10, 6);
    this.scene.add(rim);
    this.scene.add(new AmbientLight(0xffffff, 0.35));

    const floor = new Mesh(
      new PlaneGeometry(80, 80),
      new MeshStandardMaterial({ color: 0x141018, roughness: 0.95 }),
    );
    floor.rotation.x = -Math.PI / 2;
    this.worldGroup.add(floor);

    const coverMat = new MeshStandardMaterial({ color: 0x5a3d7a, roughness: 0.45 });
    const pageMat = new MeshStandardMaterial({
      color: 0xf5f1ff,
      roughness: 0.35,
      transparent: true,
      opacity: 0.92,
    });

    for (let i = 0; i < 8; i++) {
      const g = new Group();
      const ang = (i / 8) * Math.PI * 2;
      const r = 7 + (i % 3) * 0.4;
      g.position.set(Math.cos(ang) * r, 2 + (i % 4) * 0.4, Math.sin(ang) * r);
      g.rotation.y = ang + Math.PI / 2;

      const cover = new Mesh(new BoxGeometry(2.2, 0.35, 3), coverMat);
      cover.position.y = 0;
      g.add(cover);
      const pages = new Mesh(new PlaneGeometry(2.1, 2.9), pageMat);
      pages.rotation.x = -Math.PI / 2;
      pages.position.y = 0.05;
      g.add(pages);

      this.bookGroups.push(g);
      this.worldGroup.add(g);
    }

    const ff = new Float32Array(100 * 3);
    for (let i = 0; i < 100; i++) {
      ff[i * 3] = (Math.random() - 0.5) * 24;
      ff[i * 3 + 1] = 2 + Math.random() * 10;
      ff[i * 3 + 2] = (Math.random() - 0.5) * 24;
    }
    const fg = new BufferGeometry();
    fg.setAttribute('position', new Float32BufferAttribute(ff, 3));
    this.particles = new Points(
      fg,
      new PointsMaterial({ color: 0x00d4ff, size: 0.09, transparent: true, opacity: 0.85 }),
    );
    this.worldGroup.add(this.particles);

    this.scene.add(this.worldGroup);

    let t = 0;
    const animate = () => {
      this.animationId = requestAnimationFrame(animate);
      t += 0.016;
      this.worldGroup.rotation.x = this.tilt.x;
      this.worldGroup.rotation.y = this.tilt.y;
      this.bookGroups.forEach((g, i) => {
        g.position.y = 2 + (i % 4) * 0.4 + Math.sin(t * 1.2 + i) * 0.25;
        g.rotation.y += 0.004;
      });
      if (this.particles) {
        const arr = this.particles.geometry.attributes['position'].array as Float32Array;
        for (let i = 0; i < 100; i++) {
          arr[i * 3 + 1] += 0.006 * Math.sin(t + i);
        }
        this.particles.geometry.attributes['position'].needsUpdate = true;
      }
      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }
    };
    animate();
  }

  @HostListener('window:mousemove', ['$event'])
  onMouseMove(ev: MouseEvent): void {
    const nx = (ev.clientX / window.innerWidth - 0.5) * 2;
    const ny = (ev.clientY / window.innerHeight - 0.5) * 2;
    this.tilt.y = nx * 0.09;
    this.tilt.x = -ny * 0.09;
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

  private runEntrance(): void {
    this.entrance = gsap.timeline();
    const cv = document.querySelector('.register-canvas-layer');
    if (cv) {
      this.entrance.from(cv, { opacity: 0, duration: 1 }, 0);
    }
    this.entrance.from('.register-card', { y: 50, opacity: 0, duration: 0.75, ease: 'power3.out' }, 0.12);
    this.entrance.from('.step-pill', { opacity: 0, y: -12, stagger: 0.08, duration: 0.4 }, 0.25);
  }

  private shake(sel: string): void {
    const el = document.querySelector(sel);
    if (!el) {
      return;
    }
    gsap.fromTo(el, { x: 0 }, { x: 12, duration: 0.06, repeat: 5, yoyo: true });
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.animationId);
    clearInterval(this.timerId);
    this.entrance?.kill();
    if (this.avatarPreview?.startsWith('blob:')) {
      URL.revokeObjectURL(this.avatarPreview);
    }
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
    this.particles?.geometry.dispose();
    (this.particles?.material as PointsMaterial)?.dispose?.();
  }
}
