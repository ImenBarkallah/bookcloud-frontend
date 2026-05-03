import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-catalogue-page',
  templateUrl: './catalogue-page.component.html',
  styleUrls: ['./catalogue-page.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CataloguePageComponent {}
