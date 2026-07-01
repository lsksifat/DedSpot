// Loads sample development spots from db/seed_fallback.json.
// Idempotent: clears previous seed rows first. Real data = `npm run db:ingest`.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getSql, ROOT } from './lib.mjs';

const sql = getSql();

try {
  const { spots } = JSON.parse(
    readFileSync(resolve(ROOT, 'db', 'seed_fallback.json'), 'utf8'),
  );

  await sql`DELETE FROM wifi_spots WHERE source = 'seed'`;

  for (const s of spots) {
    await sql`
      INSERT INTO wifi_spots (
        source, name, category, lat, lng, area, city, district,
        is_free, access_type, password_is_public, wifi_password,
        owner_name, owner_type, why_free,
        has_power, has_seating, is_quiet, hours,
        lighting, crowd_level, has_cctv, staff_present, family_friendly,
        status, verified
      ) VALUES (
        'seed', ${s.name}, ${s.category}, ${s.lat}, ${s.lng},
        ${s.area ?? null}, ${s.city ?? null}, ${s.district ?? null},
        ${s.is_free ?? true}, ${s.access_type ?? 'unknown'},
        ${s.password_is_public ?? false}, ${s.wifi_password ?? null},
        ${s.owner_name ?? null}, ${s.owner_type ?? 'unknown'}, ${s.why_free ?? null},
        ${s.has_power ?? false}, ${s.has_seating ?? false}, ${s.is_quiet ?? false}, ${s.hours ?? null},
        ${s.lighting ?? 'unknown'}, ${s.crowd_level ?? 'unknown'},
        ${s.has_cctv ?? false}, ${s.staff_present ?? false}, ${s.family_friendly ?? false},
        ${s.status ?? 'approved'}, ${s.verified ?? false}
      )
    `;
  }
  console.log(`✅ Seeded ${spots.length} sample spots.`);
} catch (err) {
  console.error('❌ Seeding failed:', err.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
