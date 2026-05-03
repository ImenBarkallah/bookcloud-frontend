import {
  Directive,
  ElementRef,
  Input,
  NgZone,
  OnDestroy,
  AfterViewInit,
  inject,
} from '@angular/core';
import { AbstractControl } from '@angular/forms';
import gsap from 'gsap';
import { merge, type Subscription } from 'rxjs';

/** GSAP micro-interactions: purple icon + border glow while typing; SVG check draw when valid. */
@Directive({
  selector: '[appFieldMicroAnim]',
})
export class FieldMicroAnimDirective implements AfterViewInit, OnDestroy {
  /** Form control bound to the inner input. */
  @Input({ required: true }) fieldControl!: AbstractControl;

  /** Optional fields (e.g. phone): no checkmark when empty even if control is valid. */
  @Input() optionalField = false;

  /** Use when group-level validation matters (e.g. password confirm). */
  @Input() validWhen?: () => boolean;

  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly zone = inject(NgZone);

  private inputEl?: HTMLInputElement;
  private iconWrap?: HTMLElement;
  private checkSvg?: SVGSVGElement;
  private checkPath?: SVGPathElement;
  private sub?: Subscription;
  private wasValidUi = false;
  private readonly defaultIconColor = 'rgba(255, 255, 255, 0.45)';
  private readonly purple = '#7b5ea7';
  private iconColorTransitionReady = false;

  ngAfterViewInit(): void {
    const el = this.host.nativeElement;
    this.inputEl = el.querySelector('input') ?? undefined;
    this.iconWrap = el.querySelector('.field-icon') ?? undefined;
    if (!this.inputEl || !this.iconWrap) {
      return;
    }

    if (el.querySelector('.eye-toggle')) {
      el.classList.add('field-micro-has-eye');
    }

    if (!this.iconColorTransitionReady && this.iconWrap) {
      this.iconWrap.style.transition = 'color 0.3s ease';
      this.iconColorTransitionReady = true;
    }

    this.ensureCheckSvg(el);

    const onInput = (): void => this.zone.runOutsideAngular(() => this.onTypingPulse());
    const onFocus = (): void => this.zone.runOutsideAngular(() => this.onFocusStyle());
    const onBlur = (): void => this.zone.runOutsideAngular(() => this.onBlurStyle());

    this.inputEl.addEventListener('input', onInput);
    this.inputEl.addEventListener('focus', onFocus);
    this.inputEl.addEventListener('blur', onBlur);

    this.zone.runOutsideAngular(() => {
      this.sub = merge(this.fieldControl.valueChanges, this.fieldControl.statusChanges).subscribe(() => {
        this.syncValidityUi();
      });
      queueMicrotask(() => this.syncValidityUi());
    });

    this.cleanupInput = (): void => {
      this.inputEl?.removeEventListener('input', onInput);
      this.inputEl?.removeEventListener('focus', onFocus);
      this.inputEl?.removeEventListener('blur', onBlur);
    };
  }

  private cleanupInput?: () => void;

  private ensureCheckSvg(hostEl: HTMLElement): void {
    const existing = hostEl.querySelector('.field-micro-check-svg') as SVGSVGElement | null;
    if (existing) {
      this.checkSvg = existing;
      this.checkPath = existing.querySelector('.field-micro-check-path') as SVGPathElement;
      this.applyCheckSvgLayout(hostEl, existing);
      return;
    }
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('class', 'field-micro-check-svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS(ns, 'path');
    path.setAttribute('class', 'field-micro-check-path');
    path.setAttribute('d', 'M4.5 12.5l5 5L19.5 7');
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', '#2ecc71');
    path.setAttribute('stroke-width', '2.25');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(path);
    hostEl.appendChild(svg);
    this.checkSvg = svg;
    this.checkPath = path;
    this.applyCheckSvgLayout(hostEl, svg);
    svg.style.opacity = '0';
    gsap.set(path, { strokeDasharray: 0, strokeDashoffset: 0 });
  }

  /**
   * Inline layout so the checkmark stays position:absolute under Angular emulated encapsulation
   * (dynamically appended nodes don't get _ngcontent shim; without this the SVG sits in-flow and breaks the field).
   */
  private applyCheckSvgLayout(hostEl: HTMLElement, svg: SVGSVGElement): void {
    const hasEye = hostEl.classList.contains('field-micro-has-eye');
    svg.style.position = 'absolute';
    svg.style.right = hasEye ? '46px' : '14px';
    svg.style.top = '50%';
    svg.style.transform = 'translateY(-50%)';
    svg.style.width = '22px';
    svg.style.height = '22px';
    svg.style.pointerEvents = 'none';
    svg.style.zIndex = '2';
  }

  /** Do not use GSAP for icon color — it can inject transform and break vertical centering (translateY -50%). */
  private setIconColor(color: string): void {
    const icon = this.iconWrap;
    if (!icon) {
      return;
    }
    gsap.killTweensOf(icon);
    icon.style.removeProperty('transform');
    icon.style.color = color;
  }

  private onTypingPulse(): void {
    const input = this.inputEl;
    const icon = this.iconWrap;
    if (!input || !icon) {
      return;
    }
    if (this.shouldShowValid()) {
      return;
    }
    const has = !!input.value?.length;
    if (!has) {
      this.setIconColor(this.defaultIconColor);
      gsap.to(input, {
        borderColor: 'rgba(255, 255, 255, 0.12)',
        boxShadow: 'none',
        duration: 0.28,
        overwrite: 'auto',
      });
      return;
    }
    this.setIconColor(this.purple);
    gsap.to(input, {
      borderColor: this.purple,
      duration: 0.28,
      ease: 'power2.out',
      overwrite: 'auto',
    });
    gsap.fromTo(
      input,
      { boxShadow: '0 0 0 rgba(123, 94, 167, 0)' },
      {
        boxShadow: '0 0 26px rgba(123, 94, 167, 0.55)',
        duration: 0.42,
        ease: 'power2.out',
        yoyo: true,
        repeat: 1,
      },
    );
  }

  private onFocusStyle(): void {
    const input = this.inputEl;
    const icon = this.iconWrap;
    if (!input || !icon || !input.value?.length || this.shouldShowValid()) {
      return;
    }
    this.setIconColor(this.purple);
    gsap.to(input, { borderColor: this.purple, duration: 0.25, overwrite: 'auto' });
  }

  private onBlurStyle(): void {
    const input = this.inputEl;
    const icon = this.iconWrap;
    if (!input || !icon) {
      return;
    }
    if (this.shouldShowValid()) {
      return;
    }
    if (!input.value?.length) {
      this.setIconColor(this.defaultIconColor);
      gsap.to(input, {
        borderColor: 'rgba(255, 255, 255, 0.12)',
        boxShadow: 'none',
        duration: 0.28,
        overwrite: 'auto',
      });
    }
  }

  private shouldShowValid(): boolean {
    const raw = this.fieldControl.value;
    const str = typeof raw === 'string' ? raw.trim() : String(raw ?? '').trim();
    if (this.optionalField && !str) {
      return false;
    }
    if (this.validWhen) {
      return this.validWhen();
    }
    return this.fieldControl.valid;
  }

  private syncValidityUi(): void {
    const show = this.shouldShowValid();
    const input = this.inputEl;
    const icon = this.iconWrap;
    const svg = this.checkSvg;
    const path = this.checkPath;
    if (!input || !icon || !svg || !path) {
      return;
    }

    if (show) {
      this.setIconColor('#2ecc71');
      gsap.to(input, {
        borderColor: 'rgba(46, 204, 113, 0.65)',
        boxShadow: '0 0 18px rgba(46, 204, 113, 0.35)',
        duration: 0.35,
      });
      svg.classList.add('field-micro-check-visible');
      if (!this.wasValidUi) {
        const len = path.getTotalLength();
        gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
        gsap.to(svg, { opacity: 1, duration: 0.28, ease: 'power2.out' });
        gsap.to(path, {
          strokeDashoffset: 0,
          duration: 0.55,
          ease: 'power2.out',
        });
      }
      this.wasValidUi = true;
      return;
    }

    if (this.wasValidUi) {
      const len = path.getTotalLength();
      gsap.set(path, { strokeDasharray: len });
      gsap.to(path, {
        strokeDashoffset: len,
        duration: 0.22,
        ease: 'power2.in',
      });
      gsap.to(svg, { opacity: 0, duration: 0.22 });
      svg.classList.remove('field-micro-check-visible');
      this.wasValidUi = false;
    }

    if (!input.value?.length) {
      this.setIconColor(this.defaultIconColor);
      gsap.to(input, {
        borderColor: 'rgba(255, 255, 255, 0.12)',
        boxShadow: 'none',
        duration: 0.28,
      });
    } else {
      this.setIconColor(this.purple);
      gsap.to(input, {
        borderColor: this.purple,
        boxShadow: 'none',
        duration: 0.28,
      });
    }
  }

  ngOnDestroy(): void {
    this.cleanupInput?.();
    this.sub?.unsubscribe();
    gsap.killTweensOf([this.inputEl, this.iconWrap, this.checkSvg, this.checkPath]);
  }
}
