import {
  QueryConstraint,
  collection,
  getFirestore,
  onSnapshot,
  query,
} from 'firebase/firestore';
import { Observable } from 'rxjs';

import { firebaseApp } from '../../firebase/firebase-app';

export function firestoreQuery$<T>(
  path: string,
  ...constraints: QueryConstraint[]
): Observable<T[]> {
  return new Observable((subscriber) => {
    const db = getFirestore(firebaseApp);
    const q = query(collection(db, path), ...constraints);
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) }) as T);
        subscriber.next(rows);
      },
      () => {
        // Invité ou règles Firestore : pas d’erreur non gérée dans la console
        subscriber.next([] as T[]);
      },
    );
    return () => unsub();
  });
}
