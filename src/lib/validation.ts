import { z } from 'zod';

// Bangladesh bounding box — rejects coordinates outside the country.
export const BD_BBOX = { minLat: 20.3, maxLat: 26.8, minLng: 88.0, maxLng: 92.8 };

const lat = z.coerce.number().min(BD_BBOX.minLat).max(BD_BBOX.maxLat);
const lng = z.coerce.number().min(BD_BBOX.minLng).max(BD_BBOX.maxLng);

const category = z.enum([
  'cafe', 'restaurant', 'library', 'university', 'school', 'park',
  'mall', 'government', 'mosque', 'hospital', 'transport', 'coworking', 'other',
]);
const accessType = z.enum(['open', 'password', 'login', 'voucher', 'unknown']);
const ownerType = z.enum(['business', 'public', 'educational', 'individual', 'ngo', 'unknown']);
const lighting = z.enum(['good', 'moderate', 'poor', 'unknown']);
const crowdLevel = z.enum(['busy', 'moderate', 'quiet', 'unknown']);
const audience = z.enum(['student', 'woman', 'family', 'traveler', 'remote_worker', 'other']);

const shortText = (max: number) => z.string().trim().max(max).optional();

// GET /api/spots/near
export const nearQuerySchema = z.object({
  lat,
  lng,
  radius: z.coerce.number().min(100).max(20000).default(3000),
  limit: z.coerce.number().int().min(1).max(200).default(60),
  category: category.optional(),
  audience: audience.optional(),
});

// POST /api/spots  (submitting a new spot — lands in the moderation queue)
export const submitSpotSchema = z
  .object({
    name: z.string().trim().min(2).max(160),
    category,
    lat,
    lng,
    address: shortText(200),
    area: shortText(80),
    city: shortText(80),
    district: shortText(80),
    is_free: z.boolean().default(true),
    access_type: accessType.default('unknown'),
    password_is_public: z.boolean().default(false),
    wifi_password: z.string().trim().max(128).optional(),
    speed_mbps: z.coerce.number().min(0).max(10000).optional(),
    owner_name: shortText(120),
    owner_type: ownerType.default('unknown'),
    why_free: shortText(300),
    has_power: z.boolean().default(false),
    has_seating: z.boolean().default(false),
    is_quiet: z.boolean().default(false),
    hours: shortText(120),
    lighting: lighting.default('unknown'),
    crowd_level: crowdLevel.default('unknown'),
    has_cctv: z.boolean().default(false),
    staff_present: z.boolean().default(false),
    family_friendly: z.boolean().default(false),
    // Honeypot: real users never fill this hidden field. Bots often do.
    website_url: z.string().max(0).optional(),
  })
  .transform((v) => {
    // Never persist a password unless it is explicitly marked public.
    if (!v.password_is_public) v.wifi_password = undefined;
    return v;
  });

export const reviewSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional(),
  audience: audience.default('other'),
  website_url: z.string().max(0).optional(), // honeypot
});

export const reportSchema = z.object({
  category: z.enum(['harassment', 'theft', 'unsafe_area', 'scam', 'fake_listing', 'closed', 'other']),
  note: z.string().trim().max(1000).optional(),
  website_url: z.string().max(0).optional(), // honeypot
});

export type SubmitSpotInput = z.infer<typeof submitSpotSchema>;
export type ReviewInput = z.infer<typeof reviewSchema>;
