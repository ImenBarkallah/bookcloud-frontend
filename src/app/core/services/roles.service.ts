import { Injectable, OnDestroy } from '@angular/core';
import { doc, DocumentSnapshot, getFirestore, onSnapshot } from 'firebase/firestore';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';

import { firebaseApp } from '../../firebase/firebase-app';
import { EffectiveRole, RoleDocument } from '../../models/role-document.model';
import { Role } from '../../enums/role.enum';

/**
 * Permissions par défaut si le document Firestore `roles/{Role}` est absent ou vide.
 * À personnaliser selon les clés utilisées dans l’app (guards, boutons, etc.).
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<Role, string[]> = {
  [Role.USER]: ['catalogue.read', 'profile.self'],
  [Role.BIBLIOTHECAIRE]: [
    'catalogue.read',
    'catalogue.edit',
    'loans.manage',
    'reservations.manage',
    'profile.self',
  ],
  [Role.ADMIN]: ['*'],
};

/**
 * Lit la collection Firestore `roles` (un document par rôle, ID = ADMIN | LIBRARIAN | USER).
 * Les champs typiques : `label` (string), `permissions` (array of strings).
 */
@Injectable({ providedIn: 'root' })
export class RolesService implements OnDestroy {
  private readonly db = getFirestore(firebaseApp);

  private readonly cache = new Map<Role, EffectiveRole>();
  private readonly subs = new Subscription();

  /** Dernière définition connue par rôle (temps réel via Firestore). */
  readonly roleEffective$ = new BehaviorSubject<Map<Role, EffectiveRole>>(new Map());

  constructor() {
    ([Role.USER, Role.BIBLIOTHECAIRE, Role.ADMIN] as const).forEach((r) => this.watchRoleIntoCache(r));
  }

  private mergeRole(role: Role, snap: DocumentSnapshot): EffectiveRole {
    const raw = snap.exists() ? (snap.data() as Partial<RoleDocument>) : {};
    const fromDb = Array.isArray(raw.permissions) ? raw.permissions : [];
    const permissions = fromDb.length > 0 ? fromDb : DEFAULT_ROLE_PERMISSIONS[role];
    return {
      id: role,
      label: raw.label ?? role,
      permissions,
    };
  }

	private watchRoleIntoCache(role: Role): void {
		const ref = doc(this.db, 'roles', role);
		const sub = onSnapshot(
			ref,
			(snap) => {
				const effective = this.mergeRole(role, snap);
				this.cache.set(role, effective);
				this.roleEffective$.next(new Map(this.cache));
			},
			() => {
				// Règles Firestore ou réseau : garder les permissions par défaut côté client
				this.cache.set(role, this.fallbackEffective(role));
				this.roleEffective$.next(new Map(this.cache));
			},
		);
		this.subs.add(sub);
	}

  /** Snapshot actuel du rôle (depuis le cache temps réel). */
  getCachedRole(role: Role | null | undefined): EffectiveRole | null {
    if (!role) {
      return null;
    }
    return this.cache.get(role) ?? null;
  }

  /** Observable du document effectif pour un rôle. */
  watchEffectiveRole(role: Role): Observable<EffectiveRole> {
    return this.roleEffective$.pipe(
      map((m) => m.get(role)),
      map((r) => r ?? this.fallbackEffective(role)),
      distinctUntilChanged((a, b) => a.permissions.join(',') === b.permissions.join(',')),
    );
  }

  private fallbackEffective(role: Role): EffectiveRole {
    return {
      id: role,
      label: role,
      permissions: DEFAULT_ROLE_PERMISSIONS[role],
    };
  }

  /**
   * Indique si le rôle possède une permission (ou `*` pour tout).
   * Utilisable avec le profil utilisateur : `hasPermission(profile.role, 'catalogue.edit')`.
   */
  hasPermission(role: Role | null | undefined, permission: string): boolean {
    if (!role) {
      return false;
    }
    const eff = this.cache.get(role) ?? this.fallbackEffective(role);
    const perms = eff.permissions;
    return perms.includes('*') || perms.includes(permission);
  }

  /** Observable booléen pour les templates (combine avec userProfile$ au besoin). */
  hasPermission$(role: Role | null | undefined, permission: string): Observable<boolean> {
    return this.roleEffective$.pipe(
      map(() => this.hasPermission(role, permission)),
      distinctUntilChanged(),
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }
}
