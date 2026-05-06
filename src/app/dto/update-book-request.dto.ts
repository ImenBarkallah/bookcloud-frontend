export interface UpdateBookRequestDto {
  title?: string | null;
  description?: string | null;
  authorIds?: string[] | null;
  isbn?: string | null;
  categoryId?: string | null;
  coverUrl?: string | null;
  totalCopies?: number | null;
  defaultBranchId?: string | null;
  publicationYear?: number | null;
  language?: string | null;
  publisher?: string | null;
  featured?: boolean | null;
}

