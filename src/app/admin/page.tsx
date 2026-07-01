import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { categoryLabel } from '@/lib/format';
import { SpotActionsAdmin, ReportActionsAdmin } from '@/components/AdminActions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Admin — DedSpot', robots: { index: false } };

type PendingSpot = {
  id: string; name: string; category: string;
  area: string | null; city: string | null; lat: number; lng: number; access_type: string;
};
type ReportRow = { id: string; category: string; note: string | null; spot_id: string; spot_name: string };
type RunRow = { id: string; status: string; fetched: number; valid: number; upserted: number; error: string | null };

export default async function AdminPage() {
  const session = await requireRole(['admin', 'moderator']);
  if (!session) {
    return (
      <section className="hero">
        <h1>Admins only</h1>
        <p className="lead">You need an admin account to view this page. Sign in with an authorised email.</p>
      </section>
    );
  }

  const sql = db();
  const pending = await sql<PendingSpot[]>`
    SELECT id::text AS id, name, category, area, city, lat, lng, access_type
    FROM wifi_spots WHERE status = 'pending' ORDER BY created_at DESC LIMIT 100`;
  const reports = await sql<ReportRow[]>`
    SELECT r.id::text AS id, r.category, r.note, s.id::text AS spot_id, s.name AS spot_name
    FROM spot_reports r JOIN wifi_spots s ON s.id = r.spot_id
    WHERE r.status = 'pending' ORDER BY r.created_at DESC LIMIT 100`;
  const runs = await sql<RunRow[]>`
    SELECT id::text AS id, status, fetched, valid, upserted, error
    FROM ingest_runs ORDER BY id DESC LIMIT 10`;
  const [stats] = await sql<{ approved: number; pending: number }[]>`
    SELECT count(*) FILTER (WHERE status='approved')::int AS approved,
           count(*) FILTER (WHERE status='pending')::int AS pending FROM wifi_spots`;
  const [users] = await sql<{ n: number }[]>`SELECT count(*)::int AS n FROM users`;

  return (
    <>
      <section className="hero" style={{ paddingBottom: 8 }}>
        <h1 style={{ marginBottom: 6 }}>Admin dashboard</h1>
        <div className="muted">{session.user?.email} · {String(session.user?.role)}</div>
        <div className="row" style={{ marginTop: 12 }}>
          <span className="badge safe">{stats?.approved ?? 0} approved</span>
          <span className="badge warn">{stats?.pending ?? 0} pending</span>
          <span className="badge info">{users?.n ?? 0} users</span>
        </div>
      </section>

      <section className="section">
        <h2>Pending spots ({pending.length})</h2>
        {pending.length === 0 && <p className="muted">Nothing waiting for review. 🎉</p>}
        <div className="stack">
          {pending.map((s) => (
            <div key={s.id} className="card card-pad">
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <div>
                  <strong>{s.name}</strong>
                  <div className="muted" style={{ fontSize: 13 }}>
                    {categoryLabel(s.category)} · {[s.area, s.city].filter(Boolean).join(', ') || '—'} · {s.lat.toFixed(4)}, {s.lng.toFixed(4)} · {s.access_type}
                  </div>
                </div>
                <SpotActionsAdmin id={Number(s.id)} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <h2>Safety reports ({reports.length})</h2>
        <p className="muted" style={{ marginTop: 0, fontSize: 14 }}>Confidential — moderation only. Never shown publicly.</p>
        <div className="stack">
          {reports.length === 0 && <p className="muted">No open reports.</p>}
          {reports.map((r) => (
            <div key={r.id} className="card card-pad">
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <div>
                  <strong>{r.category.replace('_', ' ')}</strong> — <a href={`/spot/${r.spot_id}`}>{r.spot_name}</a>
                  {r.note && <div className="muted" style={{ fontSize: 13 }}>{r.note}</div>}
                </div>
                <ReportActionsAdmin id={Number(r.id)} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <h2>Recent ingest runs</h2>
        <div className="stack">
          {runs.length === 0 && <p className="muted">No runs yet.</p>}
          {runs.map((run) => (
            <div key={run.id} className="card card-pad">
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span>#{run.id} · <span className={`badge ${run.status === 'success' ? 'safe' : run.status === 'error' ? 'danger' : 'info'}`}>{run.status}</span></span>
                <span className="muted" style={{ fontSize: 13 }}>{run.upserted} upserted / {run.valid} valid / {run.fetched} fetched</span>
              </div>
              {run.error && <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>{run.error.slice(0, 200)}</div>}
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
