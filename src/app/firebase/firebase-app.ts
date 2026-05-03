import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { environment } from '../../environments/environment';

/** Instance Firebase unique pour toute l’application Angular. */
export const firebaseApp = initializeApp(environment.firebase);

/** Analytics (navigateur uniquement ; nécessite measurementId dans la config). */
export const firebaseAnalytics = getAnalytics(firebaseApp);
