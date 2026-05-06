import { ReservationStatus } from '../enums/reservation-status.enum';

/** Mirrors backend `com.bookcloud.smartlibrary.model.Reservation`. */
export interface Reservation {
  id: string;
  bookId: string;
  userUid: string;
  status: ReservationStatus;
  createdAt: string | null;
  updatedAt: string | null;
  pickupBranchId: string | null;
  expiresAt: string | null;
  queuePosition: number | null;
  /** JSON alias in backend (`@JsonGetter("reservedAt")`). */
  reservedAt?: string | null;
}

