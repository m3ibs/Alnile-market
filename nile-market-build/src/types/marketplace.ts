export type UserRole = 'user' | 'admin';
export type Currency = 'SDG' | 'USD';
export type ListingCondition = 'new' | 'used' | 'unspecified';
export type ListingStatus = 'active' | 'pending' | 'sold' | 'rejected';
export type ReportReason = 'spam' | 'fraud' | 'prohibited' | 'wrong_category' | 'other';
export type ReportStatus = 'open' | 'resolved' | 'dismissed';

export interface UserPublic {
  uid: string;
  displayName: string;
  photoURL?: string;
  stateId?: string;
  city?: string;
  role: UserRole;
  isBanned: boolean;
  createdAt: any;
  updatedAt: any;
}

export interface UserPrivate {
  email: string;
  phone?: string;
  whatsapp?: string;
  updatedAt: any;
}

export interface Category {
  id: string;
  nameAr: string;
  slug: string;
  icon: string;
  order: number;
  isActive: boolean;
  createdAt?: any;
  updatedAt?: any;
}

export interface SudanState {
  id: string;
  nameAr: string;
  cities: string[];
  order: number;
  isActive: boolean;
  createdAt?: any;
  updatedAt?: any;
}

export interface Listing {
  id: string;
  ownerId: string;
  ownerName: string;
  ownerPhoto?: string;
  title: string;
  description: string;
  price: number;
  currency: Currency;
  negotiable: boolean;
  categoryId: string;
  categoryName: string;
  stateId: string;
  stateName: string;
  city: string;
  condition: ListingCondition;
  contactPhone: string;
  contactWhatsapp?: string;
  images: string[];
  status: ListingStatus;
  isFeatured: boolean;
  views: number;
  createdAt: any;
  updatedAt: any;
}

export interface ListingStat {
  listingId: string;
  views: number;
  updatedAt: any;
}

export interface Favorite {
  id: string;
  userId: string;
  listingId: string;
  createdAt: any;
}

export interface Report {
  id: string;
  reporterId: string;
  reporterName: string;
  listingId: string;
  listingTitle: string;
  reason: ReportReason;
  details?: string;
  status: ReportStatus;
  adminNote?: string;
  createdAt: any;
  updatedAt: any;
}

export interface PlatformSettings {
  requireApproval: boolean;
  noticeText?: string;
  seeded: boolean;
  updatedAt?: any;
}
