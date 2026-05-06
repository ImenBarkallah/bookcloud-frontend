import { environment } from '../../../environments/environment';

/**
 * Les URLs stockées côté API pour les fichiers locaux sont relatives (`/uploads/...`).
 * Le navigateur les résout sur l’hôte de la page (ex. :4200) → 404 ; le backend sert sur :8080.
 * Préfixe avec `apiBaseUrl` ; laisse inchangé http(s) (ex. Cloudinary).
 */
export function resolvePublicUploadUrl(
  path: string | null | undefined,
): string | null {
  if (path == null) {
    return null;
  }
  const p = String(path).trim();
  if (!p) {
    return null;
  }
  if (p.startsWith('http://') || p.startsWith('https://')) {
    return p;
  }
  if (p.startsWith('/uploads')) {
    const base = environment.apiBaseUrl.replace(/\/$/, '');
    return `${base}${p}`;
  }
  return p;
}
