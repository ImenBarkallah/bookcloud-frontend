import { Injectable } from '@angular/core';
import {
  GoogleAuthProvider,
  User,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { BehaviorSubject } from 'rxjs';
import { firebaseApp } from '../firebase/firebase-app';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly auth = getAuth(firebaseApp);

  /** État auth Firebase (mis à jour après restauration de session). */
  private readonly userSubject = new BehaviorSubject<User | null>(this.auth.currentUser);
  readonly user$ = this.userSubject.asObservable();

  constructor() {
    onAuthStateChanged(this.auth, (user) => this.userSubject.next(user));
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
    await signInWithPopup(this.auth, provider);
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

  async getIdToken(): Promise<string | null> {
    const user = this.auth.currentUser;
    if (!user) {
      return null;
    }
    return user.getIdToken();
  }
}
