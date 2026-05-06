import { Injectable } from '@angular/core';
import {ActivatedRouteSnapshot,CanActivate,Router,RouterStateSnapshot,UrlTree,
} from '@angular/router';
import { firstValueFrom, of } from 'rxjs';
import { Role } from '../../enums/role.enum';
import { AuthService } from '../services/auth.service';
import { AuthStateService } from '../services/auth-state.service';

@Injectable({ providedIn: 'root' })
export class RoleGuard implements CanActivate {

  constructor(
    private auth: AuthService,
    private authState: AuthStateService,
    private router: Router,
  ) {}

  async canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Promise<boolean | UrlTree> {

    await this.auth.authStateReady();
    try {
      await this.auth.redirectHandled;
    } catch {
      /* noop */
    }

    if (!this.auth.currentUser) {
      return this.router.createUrlTree(['/auth/login'], {
        queryParams: { returnUrl: state.url },
      });
    }

    const requiredRoles = route.data?.['roles'] as Role[] || [];

    if (requiredRoles.length === 0) {
      return true;
    }

    const profile = await firstValueFrom(this.authState.userProfile$);

    const userRole = profile?.role ?? Role.USER;

    return requiredRoles.includes(userRole)
      ? true
      : this.router.createUrlTree(['/403'], {
          queryParams: { returnUrl: state.url },
        });
  }
}

