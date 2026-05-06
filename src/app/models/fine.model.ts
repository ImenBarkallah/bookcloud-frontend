import { FineStatus } from '../enums/fine-status.enum';

export interface Fine {
  id: string;
  loanId: string;
  userUid: string;
  amountCents: number;
  status: FineStatus;
  createdAt: string | null;
  paidAt: string | null;
}

