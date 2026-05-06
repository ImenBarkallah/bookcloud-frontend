import { HistoryEventType } from '../enums/history-event-type.enum';

/** Mirrors backend `com.bookcloud.smartlibrary.model.LibraryHistoryEntry`. */
export interface LibraryHistoryEntry {
  id: string;
  userUid: string;
  type: HistoryEventType;
  referenceId: string | null;
  bookId: string | null;
  summary: string | null;
  occurredAt: string | null;
}

