import { Injectable } from '@angular/core';
import {
  GoogleAuthProvider,
  User,
  createUserWithEmailAndPassword,
  getAuth,
  getRedirectResult,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
	signInWithPopup,
  signInWithRedirect,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { BehaviorSubject } from 'rxjs';
import { firebaseApp } from '../../firebase/firebase-app';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly auth = getAuth(firebaseApp);

  /** État auth Firebase (mis à jour après restauration de session). */
  private readonly userSubject = new BehaviorSubject<User | null>(this.auth.currentUser);
  readonly user$ = this.userSubject.asObservable();

  /**
   * Resolves after redirect OAuth result is consumed (if any). Use before trusting `currentUser` on first paint.
   */
  readonly redirectHandled: Promise<void>;

  constructor() {
    onAuthStateChanged(this.auth, (user) => this.userSubject.next(user));
    this.redirectHandled = this.finishGoogleRedirectIfAny();
  }

  /** After `signInWithRedirect`, completes OAuth when user returns to the app (no popup / COOP noise). */
  private async finishGoogleRedirectIfAny(): Promise<void> {
    try {
      await getRedirectResult(this.auth);
    } catch (e) {
      /* Annulation compte / pas de redirect en attente — codes usuels ignorés */
      const code = (e as { code?: string })?.code ?? '';
      if (code && code !== 'auth/missing-or-invalid-nonce') {
        console.warn('[auth] getRedirectResult:', code, e);
      }
    }
  }

  /** Wait until Firebase restored session (for guards / initial route). */
  authStateReady(): Promise<void> {
    return this.auth.authStateReady();
  }

  get currentUser(): User | null {
    return this.auth.currentUser;
  }

  async signInWithEmail(email: string, password: string): Promise<void> {
    await signInWithEmailAndPassword(this.auth, email, password);
  }

  async signInWithGoogle(): Promise<void> {
    const provider = new GoogleAuthProvider();
		// Prefer popup when allowed (better UX on desktop). Fallback to redirect for mobile / popup-blocked.
		try {
			await signInWithPopup(this.auth, provider);
		} catch (e) {
			const code = (e as { code?: string })?.code ?? '';
			if (
				code === 'auth/popup-blocked' ||
				code === 'auth/popup-closed-by-user' ||
				code === 'auth/cancelled-popup-request'
			) {
				await signInWithRedirect(this.auth, provider);
				return;
			}
			throw e;
		}
  }

  async registerWithEmail(
    email: string,
    password: string,
    displayName: string,
  ): Promise<User> {
    const cred = await createUserWithEmailAndPassword(this.auth, email, password);
    if (displayName?.trim()) {
      await updateProfile(cred.user, { displayName: displayName.trim() });
    }
    return cred.user;
  }

  async sendPasswordReset(email: string): Promise<void> {
    await sendPasswordResetEmail(this.auth, email);
  }

  async signOutUser(): Promise<void> {
    await signOut(this.auth);
  }

  /**
   * @param forceRefresh — si true, demande un nouveau jeton à Firebase (utile avant POST multipart
   *   ou après une autre requête, pour éviter un Bearer rejeté côté API → 401).
   */
  async getIdToken(forceRefresh = false): Promise<string | null> {
    // Ensure Firebase restored session / redirect state before reading currentUser.
    // Otherwise early HTTP calls can miss the Authorization header and trigger 401s.
    try {
      await this.redirectHandled;
    } catch {
      /* ignore */
    }
    await this.auth.authStateReady();
    const user = this.auth.currentUser;
    if (!user) {
      return null;
    }
    return user.getIdToken(forceRefresh);
  }
}
