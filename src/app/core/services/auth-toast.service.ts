import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface AuthToastMessage {
  text: string;
  variant: 'error' | 'success';
  /** When false, display {@link text} as plain copy (e.g. API error body). */
  translate?: boolean;
}

@Injectable({ providedIn: 'root' })
export class AuthToastService {
  private readonly subject = new BehaviorSubject<AuthToastMessage | null>(null);
  readonly message$ = this.subject.asObservable();

  showErrorFromFirebase(code: string): void {
    const text = mapFirebaseAuthCode(code);
    this.subject.next({ text, variant: 'error' });
  }

  showSuccess(text: string): void {
    this.subject.next({ text, variant: 'success' });
  }

  showPlain(text: string, variant: 'error' | 'success' = 'error'): void {
    this.subject.next({ text, variant, translate: false });
  }

  dismiss(): void {
    this.subject.next(null);
  }

  /** Affiche une clé i18n (préfixe autre que ERR.). */
  showKey(key: string, variant: 'error' | 'success' = 'error'): void {
    this.subject.next({ text: key, variant });
  }
}

function mapFirebaseAuthCode(code: string): string {
  switch (code) {
    case 'auth/invalid-email':
      return 'ERR.INVALID_EMAIL';
    case 'auth/user-disabled':
      return 'ERR.USER_DISABLED';
    case 'auth/user-not-found':
      return 'ERR.USER_NOT_FOUND';
    case 'auth/wrong-password':
      return 'ERR.WRONG_PASSWORD';
    case 'auth/email-already-in-use':
      return 'ERR.EMAIL_IN_USE';
    case 'auth/weak-password':
      return 'ERR.WEAK_PASSWORD';
    case 'auth/popup-closed-by-user':
      return 'ERR.POPUP_CLOSED';
    case 'auth/popup-blocked':
      return 'ERR.POPUP_BLOCKED';
    case 'auth/cancelled-popup-request':
      return 'ERR.POPUP_CANCELLED';
    case 'auth/operation-not-allowed':
      return 'ERR.PROVIDER_DISABLED';
    case 'auth/unauthorized-domain':
      return 'ERR.UNAUTHORIZED_DOMAIN';
    case 'auth/network-request-failed':
      return 'ERR.NETWORK';
    default:
      return 'ERR.GENERIC';
  }
}
