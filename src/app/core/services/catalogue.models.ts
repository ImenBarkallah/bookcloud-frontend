export type CatalogueSort = 'newest' | 'title' | 'year' | 'rating';
export type CatalogueViewMode = 'grid' | 'list';
export type MediaFormat = 'PHYSICAL' | 'EBOOK' | 'AUDIO';

export interface BookFilters {
  search: string;
  categoryId: string | null;
  availableOnly: boolean;
  minRating: number | null;
  yearFrom: number | null;
  yearTo: number | null;
  format: MediaFormat | null;
  sort: CatalogueSort;
}

export const defaultBookFilters = (): BookFilters => ({
  search: '',
  categoryId: null,
  availableOnly: false,
  minRating: null,
  yearFrom: null,
  yearTo: null,
  format: null,
  sort: 'newest',
});

export interface BookCatalogItem {
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
  isFavorited: boolean;
  mediaFormat: string;
  featured: boolean;
}

export interface PagedBooksResponse {
  content: BookCatalogItem[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

/** GET `/api/books/catalog/paged` query — aligné sur {@link BookCatalogQuery} côté Spring. */
export interface PagedQuery {
  page: number;
  size: number;
  search?: string;
  categoryId?: string | null;
  yearFrom?: number | null;
  yearTo?: number | null;
  minRating?: number | null;
  availableOnly?: boolean;
  format?: string | null;
  sort?: string;
}

/** POST `/api/books/{bookId}/favorite` — aligné sur {@code FavoriteToggleResponse} backend. */
export interface FavoriteToggleResponse {
  bookId: string;
  favorited: boolean;
}

export interface CategoryOption {
  id: string;
  name: string;
  description?: string;
  /** URL Cloudinary ou `/uploads/categories/...` */
  imageUrl?: string | null;
}

/** GET /api/categories/paged */
export interface PagedCategoriesResponse {
  content: CategoryOption[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

/** GET /api/authors */
export interface AuthorItem {
  id: string;
  name: string;
  bio?: string;
  country?: string;
}

/** Raw GET /api/books/{id} body */
export interface BookDetailApi {
  id: string;
  title: string;
  description?: string | null;
  authorId?: string;
  authorIds?: string[] | null;
  author: string;
  isbn?: string;
  categoryId: string;
  coverUrl?: string | null;
  totalCopies: number;
  availableCopies: number;
  defaultBranchId?: string;
  publicationYear?: number;
  language?: string;
  publisher?: string;
  mediaFormat?: string;
  featured?: boolean;
  createdAt?: string | null;
}

export interface LoanCreated {
  id: string;
  bookId: string;
}
