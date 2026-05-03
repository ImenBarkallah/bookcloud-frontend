import { Injectable } from '@angular/core';
import {
  collection,
  getFirestore,
  limit,
  onSnapshot,
  orderBy,
  query,
} from 'firebase/firestore';
import { BehaviorSubject } from 'rxjs';

import { firebaseApp } from '../firebase/firebase-app';
import { AuthStateService } from './auth-state.service';

export interface NavNotification {
  id: string;
  message: string;
  createdAt: Date;
  read: boolean;
}

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly db = getFirestore(firebaseApp);
  readonly items$ = new BehaviorSubject<NavNotification[]>([]);
  readonly unreadCount$ = new BehaviorSubject(0);

  private unsub?: () => void;

  constructor(private readonly authState: AuthStateService) {
    this.authState.currentUser$.subscribe((user) => {
      this.unsub?.();
      this.unsub = undefined;
      this.items$.next([]);
      this.unreadCount$.next(0);
      if (!user) {
        return;
      }
      const ref = collection(this.db, 'users', user.uid, 'notifications');
      const q = query(ref, orderBy('createdAt', 'desc'), limit(5));
      this.unsub = onSnapshot(
        q,
        (snap) => {
          const list: NavNotification[] = [];
          snap.forEach((d) => {
            const data = d.data() as {
              message?: string;
              createdAt?: { toDate?: () => Date };
              read?: boolean;
            };
            list.push({
              id: d.id,
              message: data.message ?? '',
              createdAt: data.createdAt?.toDate?.() ?? new Date(),
              read: !!data.read,
            });
          });
          this.items$.next(list);
          this.unreadCount$.next(list.filter((n) => !n.read).length);
        },
        () => {
          this.items$.next([]);
          this.unreadCount$.next(0);
        },
      );
    });
  }
}
