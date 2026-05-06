import { initializeApp } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { environment } from '../../environments/environment';

/** Instance Firebase unique pour toute l’application Angular. */
export const firebaseApp = initializeApp(environment.firebase);

/** Analytics (navigateur uniquement). Évite de faire échouer tout le bundle si Analytics est bloqué ou indisponible. */
let firebaseAnalytics: ReturnType<typeof getAnalytics> | undefined;
void (async (): Promise<void> => {
  try {
    if (typeof window === 'undefined' || !environment.firebase.measurementId) {
      return;
    }
    if (await isSupported()) {
      firebaseAnalytics = getAnalytics(firebaseApp);
    }
  } catch {
    /* bloqueurs, environnement non navigateur, etc. — l’auth reste utilisable */
  }
})();
export { firebaseAnalytics };
