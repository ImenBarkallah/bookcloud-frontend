import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { AuthService } from '../../services/auth.service';

/** Redirige les utilisateurs déjà connectés hors des pages login/register. */
@Injectable({ providedIn: 'root' })
export class GuestAuthGuard implements CanActivate {
  constructor(
    private readonly auth: AuthService,
    private readonly router: Router,
  ) {}

  canActivate(): boolean | UrlTree {
    if (this.auth.currentUser) {
      return this.router.createUrlTree(['/home']);
    }
    return true;
  }
}
