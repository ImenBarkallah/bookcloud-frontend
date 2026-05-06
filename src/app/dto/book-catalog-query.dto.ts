export interface BookCatalogQueryDto {
  page?: number;
  size?: number;
  search?: string | null;
  categoryId?: string | null;
  language?: string | null;
  yearFrom?: number | null;
  yearTo?: number | null;
  minRating?: number | null;
  availableOnly?: boolean | null;
  /** title | year | rating | newest */
  sort?: string | null;
  /** PHYSICAL | EBOOK | AUDIO */
  format?: string | null;
}

