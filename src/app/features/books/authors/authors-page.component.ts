import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';

import { AuthorApiService } from '../../../core/services/author-api.service';
import { AuthorItem } from '../../../core/services/catalogue.models';

@Component({
  selector: 'app-authors-page',
  templateUrl: './authors-page.component.html',
  styleUrls: ['./authors-page.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthorsPageComponent implements OnInit {
  private readonly api = inject(AuthorApiService);
  private readonly cdr = inject(ChangeDetectorRef);

  authors: AuthorItem[] = [];
  loading = true;
  error = false;

  ngOnInit(): void {
    this.api.list().subscribe({
      next: (list) => {
        this.authors = list;
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
