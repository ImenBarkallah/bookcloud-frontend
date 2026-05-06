import { LoanStatus } from '../enums/loan-status.enum';

/** Mirrors backend `com.bookcloud.smartlibrary.model.Loan`. */
export interface Loan {
  id: string;
  bookId: string;
  userUid: string;
  borrowedAt: string | null;
  dueAt: string | null;
  returnedAt: string | null;
  status: LoanStatus;
  branchId: string | null;
  copyId: string | null;
  renewalCount: number;
}

