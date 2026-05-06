import { Role } from '../enums';

/** Firestore document stored at `roles/{Role}` */
export interface RoleDocument {
  label: string;
  permissions: string[];
}

/** Effective role after applying defaults/fallbacks */
export interface EffectiveRole {
  id: Role;
  label: string;
  permissions: string[];
}

