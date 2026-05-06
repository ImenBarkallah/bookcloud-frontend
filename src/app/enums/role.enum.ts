export enum Role {
  ADMIN = 'ADMIN',
  BIBLIOTHECAIRE = 'LIBRARIAN',
  USER = 'USER',
}

export function roleFromFirestore(value: string | null | undefined): Role {
  if (!value?.trim()) {
    return Role.USER;
  }
  const normalized = value.trim().toUpperCase();
  switch (normalized) {
    case Role.ADMIN:
      return Role.ADMIN;
    case Role.BIBLIOTHECAIRE:
      return Role.BIBLIOTHECAIRE;
    // Compat: documents sans accent / anciennes valeurs
    case 'BIBLIOTHECAIRE':
      return Role.BIBLIOTHECAIRE;
    case Role.USER:
      return Role.USER;
    default:
      return Role.USER;
  }
}
