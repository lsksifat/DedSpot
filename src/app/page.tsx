import NearbyScanner from '@/components/NearbyScanner';

const BRAND = process.env.NEXT_PUBLIC_BRAND || 'DedSpot';

export default function HomePage() {
  return (
    <>
      <section className="hero">
        <h1>Find safe, free WiFi near you — anywhere in Bangladesh.</h1>
        <p className="lead">
          {BRAND} shows free WiFi spots around you with real details: distance, directions,
          safety, who runs it, and whether it suits students, families or women travelling alone.
        </p>
      </section>

      <NearbyScanner />

      <section className="section">
        <h2>Why {BRAND}?</h2>
        <div className="grid-2">
          <div className="card card-pad">
            <h3 style={{ marginTop: 0 }}>📍 Accurate nearby scan</h3>
            <p className="muted">
              We use your device location to list the closest free spots first — with live distance
              and one-tap directions.
            </p>
          </div>
          <div className="card card-pad">
            <h3 style={{ marginTop: 0 }}>🛡️ Safety first</h3>
            <p className="muted">
              Every spot shows lighting, CCTV, staff presence and crowd level, plus a women-safety
              indicator — based on facts, not rumours.
            </p>
          </div>
          <div className="card card-pad">
            <h3 style={{ marginTop: 0 }}>🔒 Stay protected on public WiFi</h3>
            <p className="muted">
              Public WiFi can be risky. We show you exactly how to stay safe — and offer built-in
              protection so your data stays private.
            </p>
          </div>
          <div className="card card-pad">
            <h3 style={{ marginTop: 0 }}>🌏 Growing every day</h3>
            <p className="muted">
              New spots are added automatically from open map data and the community, across every
              district of Bangladesh.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
