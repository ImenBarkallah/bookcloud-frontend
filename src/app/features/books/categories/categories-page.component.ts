import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';

import { resolvePublicUploadUrl } from '../../../core/utils/public-upload-url';
import { CategoryApiService } from '../../../core/services/category-api.service';
import { CategoryOption } from '../../../core/services/catalogue.models';

@Component({
  selector: 'app-categories-page',
  templateUrl: './categories-page.component.html',
  styleUrls: ['./categories-page.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoriesPageComponent implements OnInit {
  readonly uploadUrl = resolvePublicUploadUrl;

  private readonly api = inject(CategoryApiService);
  private readonly cdr = inject(ChangeDetectorRef);

  categories: CategoryOption[] = [];
  loading = true;
  error = false;

  ngOnInit(): void {
    this.api.GetAllCategories().subscribe({
      next: (list) => {
        this.categories = list;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.error = true;
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }
}
