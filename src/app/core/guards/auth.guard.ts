import { Injectable } from '@angular/core';
import {ActivatedRouteSnapshot,CanActivate,Router,RouterStateSnapshot,UrlTree,
} from '@angular/router';

import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(
    private readonly auth: AuthService,
    private readonly router: Router,
  ) {}

  async canActivate(
    _route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
  ): Promise<boolean | UrlTree> {
    await this.auth.authStateReady();
    try {
      await this.auth.redirectHandled;
    } catch {
      /* noop */
    }

    if (this.auth.currentUser) {
      return true;
    }
    
    return this.router.createUrlTree(['/auth/login'], {
      queryParams: { returnUrl: state.url },
    });
  }
}
