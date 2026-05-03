import { inject, Injectable, OnDestroy } from '@angular/core';
import { User } from 'firebase/auth';
import {
  Timestamp,
  doc,
  getFirestore,
  onSnapshot,
  setDoc,
} from 'firebase/firestore';
import { BehaviorSubject, Subscription } from 'rxjs';

import { firebaseApp } from '../firebase/firebase-app';
import { UserProfile } from '../models/user-profile';
import { Role } from '../models/user-role';
import { AuthService } from './auth.service';
import { RolesService } from './roles.service';

/** Central auth + Firestore profile (real-time). */
@Injectable({ providedIn: 'root' })
export class AuthStateService implements OnDestroy {
  private readonly db = getFirestore(firebaseApp);

  readonly currentUser$ = new BehaviorSubject<User | null>(this.auth.currentUser);
  readonly userProfile$ = new BehaviorSubject<UserProfile | null>(null);

  private profileUnsub?: () => void;
  private readonly sub: Subscription;

  constructor(private readonly auth: AuthService) {
    inject(RolesService);
    this.sub = this.auth.user$.subscribe((user) => {
      this.currentUser$.next(user);
      this.teardownProfile();
      this.userProfile$.next(null);
      if (user) {
        this.watchProfile(user);
      }
    });
  }

  private teardownProfile(): void {
    this.profileUnsub?.();
    this.profileUnsub = undefined;
  }

  private watchProfile(user: User): void {
    const ref = doc(this.db, 'users', user.uid);
    const unsub = onSnapshot(
      ref,
      async (snap) => {
        if (!snap.exists()) {
          const created = this.buildDefaultProfile(user);
          await setDoc(ref, created, { merge: true });
          return;
        }
        this.userProfile$.next(snap.data() as UserProfile);
      },
      () => {
        this.userProfile$.next(this.buildDefaultProfile(user));
      },
    );
    this.profileUnsub = unsub;
  }

  private buildDefaultProfile(user: User): UserProfile {
    const parts = (user.displayName ?? '').trim().split(/\s+/);
    const firstName = parts[0] ?? '';
    const lastName = parts.length > 1 ? parts.slice(1).join(' ') : '';
    const y = new Date().getFullYear();
    return {
      uid: user.uid,
      email: user.email ?? '',
      displayName: user.displayName ?? (`${firstName} ${lastName}`.trim() || 'Member'),
      firstName,
      lastName,
      photoURL: user.photoURL ?? '',
      role: Role.USER,
      memberCardId: `MBR-${y}-${user.uid.slice(-4).toUpperCase()}`,
      activeLoans: 0,
      returnedTotal: 0,
      reservations: 0,
      finesDue: 0,
      createdAt: Timestamp.now(),
      preferences: {
        language: 'en',
        theme: 'dark',
        notifications: true,
        emailAlerts: true,
        emailWhenAvailable: true,
        emailDueReminder: true,
        pushNotifications: false,
        catalogueView: 'grid',
      },
    };
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
    this.teardownProfile();
  }
}
