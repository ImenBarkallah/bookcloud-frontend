import { BookCopyStatus } from '../enums/book-copy-status.enum';

export interface BookCopy {
  id: string;
  bookId: string;
  branchId: string;
  barcode: string | null;
  status: BookCopyStatus;
  createdAt: string | null;
}

