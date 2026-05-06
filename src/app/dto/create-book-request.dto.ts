export interface CreateBookRequestDto {
  title: string;
  description?: string | null;
  authorIds: string[];
  isbn?: string | null;
  categoryId: string;
  coverUrl?: string | null;
  totalCopies: number;
  defaultBranchId?: string | null;
  publicationYear?: number | null;
  language?: string | null;
  publisher?: string | null;
  featured?: boolean;
}

