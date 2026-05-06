/** Small frontend-only view models used by the public home/catalogue UI. */

export interface CategoryItem {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string | null;
}

export interface BookListItem {
  id: string;
  title: string;
  author?: string;
  authorName?: string;
  coverUrl?: string;
  categoryId?: string;
  publishedYear?: number;
  isbn?: string;
}

export type AnnouncementType = 'INFO' | 'EVENT' | 'ALERT' | 'NEW';

export interface Announcement {
  id: string;
  title: string;
  /** Some templates use `body`, some use `message`. Keep both. */
  body?: string;
  message?: string;
  type: AnnouncementType;
  date?: unknown;
  imageUrl?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  pinned?: boolean;
}

export interface LibraryBranchHours {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  openingHours?: string;
  features?: string[];
  coordinates?: { lat: number; lng: number };
}

export type PartnerTier = 'GOLD' | 'SILVER' | 'BRONZE';

export interface Partner {
  id: string;
  name: string;
  tier: PartnerTier;
  logoUrl?: string;
  website?: string;
  archived?: boolean;
}

export interface Testimonial {
  id: string;
  name: string;
  role?: string;
  quote: string;
  rating?: number;
  stars?: number;
  avatarUrl?: string;
  featured?: boolean;
}

