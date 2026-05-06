export interface BookCatalogItemDto {
  id: string;
  title: string;
  author: string;
  categoryId: string;
  categoryName: string;
  coverUrl: string | null;
  publicationYear: number | null;
  language: string | null;
  publisher: string | null;
  isbn: string | null;
  totalCopies: number;
  availableCopies: number;
  isNew: boolean;
  isPopular: boolean;
  averageRating: number;
  ratingCount: number;
  isFavorited: boolean | null;
  mediaFormat: string | null;
}

