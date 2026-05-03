import { Timestamp } from 'firebase/firestore';

import { Role } from './user-role';

export interface UserPreferences {
  language: 'fr' | 'en';
  theme: 'dark' | 'light';
  notifications: boolean;
  emailAlerts: boolean;
  emailWhenAvailable: boolean;
  emailDueReminder: boolean;
  pushNotifications: boolean;
  catalogueView: 'grid' | 'list';
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  firstName: string;
  lastName: string;
  photoURL: string;
  role: Role;
  phone?: string;
  bio?: string;
  dateOfBirth?: string;
  address?: {
    street?: string;
    city?: string;
    country?: string;
  };
  memberCardId: string;
  activeLoans: number;
  returnedTotal: number;
  reservations: number;
  finesDue: number;
  createdAt: Timestamp;
  preferences: UserPreferences;
}
