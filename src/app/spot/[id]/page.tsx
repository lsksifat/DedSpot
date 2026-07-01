import { notFound } from 'next/navigation';
import { db, publicSpotColumns } from '@/lib/db';
import type { Spot, Review } from '@/lib/types';
import { badges, safetyLevel, womenSafety, PUBLIC_WIFI_TIP } from '@/lib/safety';
import { categoryLabel, ratingText } from '@/lib/format';
import Badges from '@/components/Badges';
import SpotActions from '@/components/SpotActions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function getSpot(id: number) {
  const sql = db();
  const [spot] = await sql<Spot[]>`
    SELECT ${publicSpotColumns(sql)},
      (SELECT ROUND(AVG(rating), 1)::float FROM spot_reviews r
         WHERE r.spot_id = wifi_spots.id AND r.status = 'approved') AS avg_rating,
      (SELECT COUNT(*)::int FROM spot_reviews r
         WHERE r.spot_id = wifi_spots.id AND r.status = 'approved') AS reviews_count
    FROM wifi_spots WHERE id = ${id} AND status = 'approved' LIMIT 1`;
  if (!spot) return null;
  const reviews = await sql<Review[]>`
    SELECT id, spot_id, rating, comment, audience, created_at
    FROM spot_reviews WHERE spot_id = ${id} AND status = 'approved'
    ORDER BY created_at DESC LIMIT 50`;
  return { spot, reviews };
}

export default async function SpotPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const data = await getSpot(id);
  if (!data) notFound();
  const { spot, reviews } = data;

  const place = [spot.area, spot.city, spot.district].filter(Boolean).join(', ');
  const gmaps = `https://www.google.com/maps/dir/?api=1&destination=${spot.lat},${spot.lng}`;
  const osm = `https://www.openstreetmap.org/directions?to=${spot.lat}%2C${spot.lng}`;
  const women = womenSafety(spot);

  return (
    <>
      <section className="hero" style={{ paddingBottom: 8 }}>
        <h1 style={{ marginBottom: 6 }}>{spot.name}</h1>
        <div className="muted">{categoryLabel(spot.category)}{place ? ` · ${place}` : ''}</div>
        <div className="muted">{ratingText(spot.avg_rating, spot.reviews_count)}</div>
        <div style={{ marginTop: 12 }}><Badges items={badges(spot)} /></div>
        <div className="row" style={{ marginTop: 14 }}>
          <a className="btn btn-primary" href={gmaps} target="_blank" rel="noopener noreferrer">🧭 Directions (Google)</a>
          <a className="btn btn-ghost" href={osm} target="_blank" rel="noopener noreferrer">Directions (OSM)</a>
        </div>
      </section>

      <div className="finder">
        <div className="card card-pad">
          <h2 style={{ marginTop: 0 }}>Details</h2>
          <dl className="kv">
            <dt>Free</dt><dd>{spot.is_free ? 'Yes' : 'No'}</dd>
            <dt>Access</dt><dd>{spot.access_type}</dd>
            {spot.password_is_public && spot.wifi_password && (<><dt>WiFi password</dt><dd><code>{spot.wifi_password}</code> <span className="muted">(publicly posted)</span></dd></>)}
            {spot.speed_mbps != null && (<><dt>Speed</dt><dd>{spot.speed_mbps} Mbps</dd></>)}
            <dt>Owner</dt><dd>{spot.owner_name || '—'} ({spot.owner_type})</dd>
            {spot.why_free && (<><dt>Why free</dt><dd>{spot.why_free}</dd></>)}
            {spot.hours && (<><dt>Hours</dt><dd>{spot.hours}</dd></>)}
            <dt>Amenities</dt><dd>{[spot.has_power && 'Power', spot.has_seating && 'Seating', spot.is_quiet && 'Quiet'].filter(Boolean).join(', ') || '—'}</dd>
          </dl>
        </div>

        <div className="card card-pad">
          <h2 style={{ marginTop: 0 }}>Safety</h2>
          <dl className="kv">
            <dt>Overall</dt><dd>{safetyLevel(spot)}</dd>
            <dt>Women-safety</dt><dd>{women === 'suitable' ? 'Suitable' : women === 'caution' ? 'Use caution' : 'Not enough info'}</dd>
            <dt>Lighting</dt><dd>{spot.lighting}</dd>
            <dt>Crowd</dt><dd>{spot.crowd_level}</dd>
            <dt>CCTV</dt><dd>{spot.has_cctv ? 'Yes' : 'Unknown/No'}</dd>
            <dt>Staff</dt><dd>{spot.staff_present ? 'Present' : 'Unknown/No'}</dd>
          </dl>
          <div className="alert info" style={{ marginBottom: 0 }}>🔒 {PUBLIC_WIFI_TIP}</div>
        </div>
      </div>

      <section className="section">
        <h2>Reviews</h2>
        {reviews.length === 0 && <p className="muted">No reviews yet. Be the first to help others.</p>}
        <div className="stack">
          {reviews.map((r) => (
            <div key={r.id} className="card card-pad">
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <strong>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</strong>
                <span className="muted" style={{ fontSize: 13 }}>{r.audience.replace('_', ' ')}</span>
              </div>
              {r.comment && <p style={{ margin: '8px 0 0' }}>{r.comment}</p>}
            </div>
          ))}
        </div>
      </section>

      <SpotActions spotId={spot.id} />
    </>
  );
}
