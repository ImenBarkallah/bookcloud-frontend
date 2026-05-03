import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

import { persistLang } from '../../shared/language-storage';

@Component({
  selector: 'app-site-footer',
  templateUrl: './site-footer.component.html',
  styleUrls: ['./site-footer.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SiteFooterComponent {
  readonly currentYear = new Date().getFullYear();
  private readonly translate = inject(TranslateService);

  setLang(lang: string): void {
    persistLang(lang);
    void this.translate.use(lang);
  }
}
