/** Clé localStorage pour la langue affichée par ngx-translate. */
export const LANG_STORAGE_KEY = 'bookcloud.lang';

export const SUPPORTED_LANGS = ['en', 'fr'] as const;
export type AppLang = (typeof SUPPORTED_LANGS)[number];

function browserPreferredLang(): AppLang {
  if (typeof navigator === 'undefined') {
    return 'en';
  }
  const nav = navigator.language?.slice(0, 2).toLowerCase() ?? 'en';
  return nav === 'fr' ? 'fr' : 'en';
}

/** Lit la langue stockée ou déduit depuis le navigateur. */
export function readStoredLang(): AppLang {
  try {
    const raw = localStorage.getItem(LANG_STORAGE_KEY);
    if (raw && SUPPORTED_LANGS.includes(raw as AppLang)) {
      return raw as AppLang;
    }
  } catch {
    /* navigation privée / indispo */
  }
  return browserPreferredLang();
}

export function persistLang(lang: string): void {
  if (!SUPPORTED_LANGS.includes(lang as AppLang)) {
    return;
  }
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {
    /* ignore */
  }
}
