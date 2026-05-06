import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import gsap from 'gsap';

@Component({
  selector: 'app-auth-shell',
  templateUrl: './auth-shell.component.html',
  styleUrls: ['./auth-shell.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthShellComponent implements AfterViewInit, OnDestroy {
  @ViewChild('authAnim', { read: ElementRef }) authAnim?: ElementRef<HTMLElement>;

  private sub?: Subscription;
  private first = true;

  constructor(private readonly router: Router) {}

  ngAfterViewInit(): void {
    this.sub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => {
        if (!e.urlAfterRedirects.startsWith('/auth')) {
          return;
        }
        if (this.first) {
          this.first = false;
          return;
        }
        const host = this.authAnim?.nativeElement;
        if (!host) {
          return;
        }
        gsap.fromTo(
          host,
          { x: 48, opacity: 0, filter: 'blur(4px)' },
          { x: 0, opacity: 1, filter: 'blur(0px)', duration: 0.4, ease: 'power2.inOut' },
        );
      });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
