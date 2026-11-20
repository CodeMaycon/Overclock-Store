export interface ProductVariant {
  id: string;
  name: string;
  durationValue: number;
  durationType: 'HOURS' | 'DAYS' | 'LIFETIME';
  priceCents: number;
  compareAtPriceCents?: number;
  stockCount: number;
  isPopular?: boolean;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  shortDescription: string;
  fullDescription: string;
  category: string;
  status: 'ONLINE' | 'MAINTENANCE' | 'OUT_OF_STOCK';
  badge?: string;
  videoUrl?: string;
  images: string[];
  features: string[];
  specifications: {
    os: string;
    processor: string;
    anticheat: string;
    streamProof: string;
    injectionMode: string;
  };
  variants: ProductVariant[];
  currentVersion: string;
  lastUpdated: string;
  rating: number;
  reviewCount: number;
}

export interface StatusService {
  id: string;
  name: string;
  slug: string;
  category: string;
  status: 'OPERATIONAL' | 'DEGRADED' | 'MAINTENANCE' | 'OUTAGE';
  uptimePercentage: number;
  historyBars: ('UP' | 'DEGRADED' | 'DOWN')[];
  currentIncident?: {
    title: string;
    description: string;
    status: string;
    updatedAt: string;
  };
}

export interface Changelog {
  id: string;
  productSlug: string;
  productName: string;
  version: string;
  title: string;
  date: string;
  type: 'FEATURE' | 'SECURITY' | 'MAINTENANCE';
  changes: string[];
}

export interface Review {
  id: string;
  productName: string;
  userName: string;
  userAvatar: string;
  rating: number;
  date: string;
  isVerified: boolean;
  comment: string;
  productPlan: string;
}

export interface LicenseItem {
  id: string;
  key: string;
  productName: string;
  productSlug: string;
  variantName: string;
  status: 'ACTIVE' | 'NOT_ACTIVATED' | 'FROZEN' | 'EXPIRED' | 'REVOKED';
  activatedAt?: string;
  expiresAt?: string;
  remainingTime: string;
  hwid: string | null;
  lastHwidResetAt?: string;
  downloadAvailable: boolean;
  version: string;
}

export interface MockUser {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: 'CUSTOMER' | 'RESELLER' | 'ADMIN';
  isLoggedIn: boolean;
  isDiscordLinked: boolean;
  discordId?: string;
  discordUsername?: string;
  discordAvatar?: string;
  avatarUrl: string;
}

// ----------------------------------------------------
// DADOS LIMPOS PARA PRODUÇÃO (SEM MOCKUPS)
// ----------------------------------------------------

export const MOCK_USER: MockUser = {
  id: "",
  username: "",
  fullName: "",
  email: "",
  role: "ADMIN",
  isLoggedIn: false,
  isDiscordLinked: false,
  avatarUrl: ""
};

export const MOCK_PRODUCTS: Product[] = [];
export const MOCK_STATUS_SERVICES: StatusService[] = [];
export const MOCK_LICENSES: LicenseItem[] = [];
export const MOCK_CHANGELOGS: Changelog[] = [];
export const MOCK_REVIEWS: Review[] = [];
export const MOCK_ORDERS: any[] = [];
