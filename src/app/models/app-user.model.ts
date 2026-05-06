import { Role } from '../enums/role.enum';

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  role: Role;
  createdAt: string | null;
  phone: string | null;
  blocked: boolean;
  /** null or <=0 = unlimited  */
  maxActiveLoans: number | null;
  membershipExpiresAt: string | null;
}

