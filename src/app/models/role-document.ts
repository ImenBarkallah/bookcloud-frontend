import { Role } from './user-role';

/**
 * Document Firestore : collection `roles`, ID du document = valeur {@link Role}
 * (ex. `roles/ADMIN`, `roles/LIBRARIAN`, `roles/USER`).
 */
export interface RoleDocument {
  /** Libellé affichable (optionnel) */
  label?: string;
  /**
   * Liste des clés de permission accordées à ce rôle.
   * Si la liste contient `*`, toutes les permissions sont accordées (utile pour ADMIN).
   */
  permissions: string[];
}

/** Métadonnées enrichies côté app (après fusion avec les défauts). */
export interface EffectiveRole extends RoleDocument {
  id: Role;
}
