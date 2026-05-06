import { BookCatalogItemDto } from './book-catalog-item.dto';

export interface PagedBooksResponseDto {
  content: BookCatalogItemDto[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

