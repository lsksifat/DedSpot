export type Category =
  | 'cafe' | 'restaurant' | 'library' | 'university' | 'school' | 'park'
  | 'mall' | 'government' | 'mosque' | 'hospital' | 'transport' | 'coworking' | 'other';

export type AccessType = 'open' | 'password' | 'login' | 'voucher' | 'unknown';
export type OwnerType = 'business' | 'public' | 'educational' | 'individual' | 'ngo' | 'unknown';
export type Lighting = 'good' | 'moderate' | 'poor' | 'unknown';
export type CrowdLevel = 'busy' | 'moderate' | 'quiet' | 'unknown';
export type Audience = 'student' | 'woman' | 'family' | 'traveler' | 'remote_worker' | 'other';

export interface Spot {
  id: number;
  source: 'user' | 'osm' | 'partner' | 'seed';
  name: string;
  category: Category;
  lat: number;
  lng: number;
  address: string | null;
  area: string | null;
  city: string | null;
  district: string | null;
  is_free: boolean;
  access_type: AccessType;
  password_is_public: boolean;
  wifi_password: string | null; // present only when password_is_public
  speed_mbps: number | null;
  owner_name: string | null;
  owner_type: OwnerType;
  why_free: string | null;
  has_power: boolean;
  has_seating: boolean;
  is_quiet: boolean;
  hours: string | null;
  lighting: Lighting;
  crowd_level: CrowdLevel;
  has_cctv: boolean;
  staff_present: boolean;
  family_friendly: boolean;
  status: 'pending' | 'approved' | 'rejected';
  verified: boolean;
  created_at: string;
  updated_at: string;
  // Computed / joined:
  distance_m?: number;
  avg_rating?: number | null;
  reviews_count?: number;
}

export interface Review {
  id: number;
  spot_id: number;
  rating: number;
  comment: string | null;
  audience: Audience;
  created_at: string;
}
