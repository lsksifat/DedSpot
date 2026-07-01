import postgres, { type Sql } from 'postgres';

// Lazy, cached Postgres client. Cached on globalThis so Next's dev hot-reload
// doesn't open a new connection pool on every change.
declare global {
  // eslint-disable-next-line no-var
  var __dedspot_sql: Sql | undefined;
}

export function db(): Sql {
  if (globalThis.__dedspot_sql) return globalThis.__dedspot_sql;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set — see .env.example');
  // Local Docker uses no SSL; hosted providers (Supabase, etc.) require it.
  const isLocal = /@(localhost|127\.0\.0\.1|db:)/.test(url);
  const client = postgres(url, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 15,
    ssl: isLocal ? false : 'require',
    // Disabled so we're compatible with Supabase's transaction pooler
    // (PgBouncer rejects prepared statements). Fine for our query volume.
    prepare: false,
  });
  globalThis.__dedspot_sql = client;
  return client;
}

// Reusable public column list. Masks wifi_password unless it is publicly posted.
// Using db()`...` composition keeps every value parameterized.
export function publicSpotColumns(sql: Sql) {
  return sql`
    id, source, name, category, lat, lng, address, area, city, district,
    is_free, access_type, password_is_public,
    CASE WHEN password_is_public THEN wifi_password ELSE NULL END AS wifi_password,
    speed_mbps, owner_name, owner_type, why_free,
    has_power, has_seating, is_quiet, hours,
    lighting, crowd_level, has_cctv, staff_present, family_friendly,
    status, verified, created_at, updated_at
  `;
}
