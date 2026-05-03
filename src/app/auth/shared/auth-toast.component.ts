import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import gsap from 'gsap';
import { Subscription } from 'rxjs';
import { AuthToastMessage, AuthToastService } from '../services/auth-toast.service';

@Component({
  selector: 'app-auth-toast',
  templateUrl: './auth-toast.component.html',
  styleUrls: ['./auth-toast.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthToastComponent implements OnInit, OnDestroy {
  msg: AuthToastMessage | null = null;

  private sub?: Subscription;
  private hideTimer?: ReturnType<typeof setTimeout>;

  constructor(
    private readonly toast: AuthToastService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.sub = this.toast.message$.subscribe((m) => {
      this.msg = m;
      this.cdr.markForCheck();
      if (m) {
        this.animateIn();
        clearTimeout(this.hideTimer);
        this.hideTimer = setTimeout(() => this.dismissAnimated(), 4500);
      }
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    clearTimeout(this.hideTimer);
  }

  translationKey(text: string): string {
    return text;
  }

  private animateIn(): void {
    requestAnimationFrame(() => {
      const el = document.querySelector('.auth-toast-panel');
      if (!el) {
        return;
      }
      gsap.fromTo(
        el,
        { x: 120, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.45, ease: 'power3.out' },
      );
    });
  }

  dismissAnimated(): void {
    const el = document.querySelector('.auth-toast-panel');
    if (el) {
      gsap.to(el, {
        x: 120,
        opacity: 0,
        duration: 0.35,
        ease: 'power2.in',
        onComplete: () => this.toast.dismiss(),
      });
    } else {
      this.toast.dismiss();
    }
  }
}
