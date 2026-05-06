import {
  HttpErrorResponse,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { AuthToastService } from '../services/auth-toast.service';
import { environment } from '../../../environments/environment';

@Injectable()
export class ApiErrorInterceptor implements HttpInterceptor {
  constructor(
    private router: Router,
    private toast: AuthToastService,
  ) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler) {
    if (!this.isApiRequest(req)) {
      return next.handle(req);
    }

    return next.handle(req).pipe(
      catchError((err: HttpErrorResponse) => {
        const path = this.router.url.split(/[?#]/)[0] ?? '';

        if (err.status === 401) {
          void this.router.navigate(['/auth/login'], {
            queryParams: { returnUrl: this.router.url },
          });
        }

        if (err.status === 403) {
          if (path !== '/403') {
            void this.router.navigate(['/403'], {
              queryParams: { returnUrl: this.router.url },
            });
          } else {
            this.toast.showKey('ERROR_PAGE.FORBIDDEN.TOAST', 'error');
          }
        }

        if (err.status >= 500) {
          if (path !== '/500') {
            const returnUrl = this.router.url.split('?')[0];
            void this.router.navigate(['/500'], {
              queryParams: returnUrl && returnUrl !== '/500' ? { returnUrl } : undefined,
            });
          } else {
            this.toast.showKey('ERROR_PAGE.SERVER.TOAST', 'error');
          }
        }

        return throwError(() => err);
      }),
    );
  }

  private isApiRequest(req: HttpRequest<unknown>): boolean {
    const url = req.url;
    return (
      url.startsWith(environment.apiBaseUrl) ||
      url.startsWith('/api/') ||
      url.includes(':8080/api/')
    );
  }
}