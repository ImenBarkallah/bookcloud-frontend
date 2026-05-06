import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** Redirige les utilisateurs déjà connectés hors des pages login/register. */
@Injectable({ providedIn: 'root' })
export class GuestAuthGuard implements CanActivate {

  constructor(
    private auth: AuthService,
    private router: Router,
  ) {}

  /**
   * Après `signInWithRedirect` (Google), la session n’est appliquée qu’après
   * `getRedirectResult()` dans AuthService. Sans attendre, `currentUser` peut
   * encore être null au premier cycle du guard → comportements incohérents.
   */
  async canActivate(): Promise<boolean | UrlTree> {
    await this.auth.authStateReady();
    try {
      await this.auth.redirectHandled;
    } catch {
      /* aligné sur AuthService */
    }
    return this.auth.currentUser ? this.router.parseUrl('/home') : true;
  }
}