import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { readStoredLang } from './language-storage';

/**
 * Charge la langue (JSON via HttpLoader) avant le premier rendu pour éviter d’afficher les clés brutes.
 */
export function translateAppInitializerFactory(translate: TranslateService): () => Promise<unknown> {
  return () => {
    const lang = readStoredLang();
    translate.addLangs(['en', 'fr']);
    translate.setDefaultLang('en');
    return firstValueFrom(translate.use(lang));
  };
}
