import { HttpClient } from '@angular/common/http';
import { TranslateLoader } from '@ngx-translate/core';
import { Observable } from 'rxjs';

export class HttpTranslateLoader implements TranslateLoader {
  constructor(
    private readonly http: HttpClient,
    private readonly prefix = '/assets/i18n/',
    private readonly suffix = '.json',
  ) {}

  getTranslation(lang: string): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>(`${this.prefix}${lang}${this.suffix}`);
  }
}

export function httpTranslateLoaderFactory(http: HttpClient): TranslateLoader {
  return new HttpTranslateLoader(http);
}
