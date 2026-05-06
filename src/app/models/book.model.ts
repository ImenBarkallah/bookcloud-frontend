/** Dates API : chaînes ISO-8601 (équivalent sérialisé de `java.time.Instant`). */
export interface Book {
  id: string;
  title: string;
  description?: string | null;
  authorId: string | null;
  author: string;
  authorIds?: string[] | null;
  isbn: string | null;
  categoryId: string;
  coverUrl?: string | null;
  totalCopies: number;
  availableCopies: number;
  defaultBranchId: string | null;
  publicationYear: number | null;
  language: string | null;
  publisher: string | null;
  /** Backend stores as string (e.g. PHYSICAL | EBOOK | AUDIO). */
  mediaFormat: string | null;
  featured?: boolean;
  createdAt: string | null;
}

