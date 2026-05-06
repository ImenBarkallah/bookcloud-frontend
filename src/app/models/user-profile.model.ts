import { Timestamp } from 'firebase/firestore';

import { Role } from '../enums';

export type CatalogueView = 'grid' | 'list';
export type ThemeMode = 'dark' | 'light';

export interface UserPreferences {
  language: 'en' | 'fr';
  theme: ThemeMode;
  notifications: boolean;
  emailAlerts: boolean;
  emailWhenAvailable: boolean;
  emailDueReminder: boolean;
  pushNotifications: boolean;
  catalogueView: CatalogueView;
}

export interface UserAddress {
  street?: string;
  city?: string;
  country?: string;
  zip?: string;
}

/**
 * Frontend-only Firestore profile for `users/{uid}`.
 * (Not the Spring `AppUser` entity — this is the client profile document.)
 */
export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  firstName: string;
  lastName: string;
  photoURL: string;
  role: Role;
  memberCardId: string;
  activeLoans: number;
  returnedTotal: number;
  reservations: number;
  finesDue: number;
  createdAt: Timestamp;
  preferences: UserPreferences;

  phone?: string;
  dateOfBirth?: string;
  bio?: string;
  address?: UserAddress;
}

