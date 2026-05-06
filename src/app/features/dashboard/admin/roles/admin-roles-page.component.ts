import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { doc, getFirestore, setDoc } from 'firebase/firestore';

import { firebaseApp } from '../../../../firebase/firebase-app';
import { AuthToastService } from '../../../../core/services/auth-toast.service';
import { RolesService } from '../../../../core/services/roles.service';
import { Role } from '../../../../enums/role.enum';

type PermissionLevel = 'READ' | 'WRITE' | 'DELETE';
type ModuleKey = 'CATALOGUE' | 'LOANS' | 'RESERVATIONS' | 'USERS' | 'ROLES';

const MODULE_PERMISSIONS: Record<ModuleKey, { label: string; perms: Record<PermissionLevel, string> }> = {
  CATALOGUE: {
    label: 'Catalogue',
    perms: { READ: 'catalogue.read', WRITE: 'catalogue.edit', DELETE: 'catalogue.delete' },
  },
  LOANS: {
    label: 'Emprunts',
    perms: { READ: 'loans.read', WRITE: 'loans.manage', DELETE: 'loans.delete' },
  },
  RESERVATIONS: {
    label: 'Réservations',
    perms: { READ: 'reservations.read', WRITE: 'reservations.manage', DELETE: 'reservations.delete' },
  },
  USERS: {
    label: 'Utilisateurs',
    perms: { READ: 'users.read', WRITE: 'users.manage', DELETE: 'users.delete' },
  },
  ROLES: {
    label: 'Rôles & accès',
    perms: { READ: 'roles.read', WRITE: 'roles.manage', DELETE: 'roles.delete' },
  },
};

@Component({
  selector: 'app-admin-roles-page',
  templateUrl: './admin-roles-page.component.html',
  styleUrls: ['./admin-roles-page.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminRolesPageComponent implements OnInit {
  readonly Role = Role;
  readonly modules = Object.entries(MODULE_PERMISSIONS) as [ModuleKey, (typeof MODULE_PERMISSIONS)[ModuleKey]][];

  private readonly db = getFirestore(firebaseApp);
  private readonly rolesSvc = inject(RolesService);
  private readonly toast = inject(AuthToastService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  loading = true;

  // editable state per role
  label: Record<Role, string> = {
    [Role.ADMIN]: 'ADMIN',
    [Role.BIBLIOTHECAIRE]: 'LIBRARIAN',
    [Role.USER]: 'USER',
  };
  permissions: Record<Role, Set<string>> = {
    [Role.ADMIN]: new Set(['*']),
    [Role.BIBLIOTHECAIRE]: new Set([]),
    [Role.USER]: new Set([]),
  };

  pendingSave: Record<Role, boolean> = {
    [Role.ADMIN]: false,
    [Role.BIBLIOTHECAIRE]: false,
    [Role.USER]: false,
  };

  ngOnInit(): void {
    this.rolesSvc.roleEffective$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((m) => {
        // hydrate from cache (fallbacks already applied in RolesService)
        ([Role.ADMIN, Role.BIBLIOTHECAIRE, Role.USER] as const).forEach((r) => {
          const eff = m.get(r);
          if (!eff) return;
          this.label[r] = eff.label ?? r;
          this.permissions[r] = new Set(Array.isArray(eff.permissions) ? eff.permissions : []);
        });
        this.loading = false;
        this.cdr.markForCheck();
      });
  }

  has(role: Role, perm: string): boolean {
    return this.permissions[role]?.has('*') || this.permissions[role]?.has(perm);
  }

  toggle(role: Role, perm: string): void {
    const set = this.permissions[role] ?? new Set<string>();
    if (set.has('*') && perm !== '*') {
      // if wildcard set, ignore fine toggles (admin)
      return;
    }
    if (set.has(perm)) set.delete(perm);
    else set.add(perm);
    this.permissions[role] = new Set(set);
    this.cdr.markForCheck();
  }

  setWildcard(role: Role, on: boolean): void {
    if (on) {
      this.permissions[role] = new Set(['*']);
    } else {
      this.permissions[role] = new Set([]);
    }
    this.cdr.markForCheck();
  }

  async save(role: Role): Promise<void> {
    if (this.pendingSave[role]) return;
    this.pendingSave[role] = true;
    this.cdr.markForCheck();
    try {
      const ref = doc(this.db, 'roles', role);
      const perms = Array.from(this.permissions[role] ?? new Set<string>()).sort();
      const label = (this.label[role] ?? role).trim() || role;
      await setDoc(ref, { label, permissions: perms }, { merge: true });
      this.toast.showPlain('Rôle mis à jour.', 'success');
    } catch {
      this.toast.showPlain('Impossible d’enregistrer.', 'error');
    } finally {
      this.pendingSave[role] = false;
      this.cdr.markForCheck();
    }
  }
}

