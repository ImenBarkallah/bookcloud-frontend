import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { BookListItem, CategoryItem } from '../../../models/home-sections.models';
import { BookApiService } from './book-api.service';
import { CategoryApiService } from '../../../core/services/category-api.service';

/**
 * Façade légère pour la grille d’accueil / recherche rapide :
 * délègue à {@link CategoryApiService} et {@link BookApiService} (comme les contrôleurs backend).
 */
@Injectable({ providedIn: 'root' })
export class BooksCatalogApiService {
  private readonly categoryApi = inject(CategoryApiService);
  private readonly bookApi = inject(BookApiService);

  /** Lists books; pass categoryId to mirror GET /api/books?categoryId= */
  listBooks(categoryId?: string | null): Observable<BookListItem[]> {
    return this.bookApi
      .listAll({ categoryId: categoryId ?? undefined, authorId: undefined })
      .pipe(catchError(() => of([]))) as Observable<BookListItem[]>;
  }

  /** GET /api/categories */
  listCategories(): Observable<CategoryItem[]> {
    return this.categoryApi.GetAllCategories().pipe(catchError(() => of([])));
  }
}
