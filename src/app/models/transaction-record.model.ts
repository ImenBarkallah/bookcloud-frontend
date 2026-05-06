import { ReservationTransactionPhase } from '../enums/reservation-transaction-phase.enum';
import { TransactionRecordType } from '../enums/transaction-record-type.enum';

/** Mirrors backend `com.bookcloud.smartlibrary.model.TransactionRecord`. */
export interface TransactionRecord {
  id: string;
  type: TransactionRecordType;
  reservationPhase: ReservationTransactionPhase | null;
  occurredAt: string | null;
  userUid: string | null;
  bookId: string | null;
  referenceId: string | null;
}

