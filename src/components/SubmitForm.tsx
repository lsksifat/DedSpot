'use client';

import { useState } from 'react';

const CATEGORIES = ['cafe', 'restaurant', 'library', 'university', 'school', 'park', 'mall', 'government', 'mosque', 'hospital', 'transport', 'coworking', 'other'];
const ACCESS = ['open', 'password', 'login', 'voucher', 'unknown'];
const OWNERS = ['business', 'public', 'educational', 'individual', 'ngo', 'unknown'];
const LIGHTS = ['good', 'moderate', 'poor', 'unknown'];
const CROWDS = ['busy', 'moderate', 'quiet', 'unknown'];

const initial = {
  name: '', category: 'cafe', lat: '', lng: '', area: '', city: '',
  access_type: 'open', is_free: true, password_is_public: false, wifi_password: '',
  owner_type: 'business', why_free: '', hours: '',
  has_power: false, has_seating: false, is_quiet: false,
  lighting: 'unknown', crowd_level: 'unknown', has_cctv: false, staff_present: false, family_friendly: false,
  website_url: '', // honeypot
};

export default function SubmitForm() {
  const [f, setF] = useState({ ...initial });
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof initial, v: string | boolean) => setF((p) => ({ ...p, [k]: v }));

  const useMyLocation = () => {
    if (!('geolocation' in navigator)) return setMsg({ kind: 'err', text: 'Location not supported.' });
    navigator.geolocation.getCurrentPosition(
      (pos) => setF((p) => ({ ...p, lat: pos.coords.latitude.toFixed(6), lng: pos.coords.longitude.toFixed(6) })),
      () => setMsg({ kind: 'err', text: 'Could not read your location.' }),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setBusy(true);
    try {
      const payload = {
        ...f,
        lat: Number(f.lat), lng: Number(f.lng),
        wifi_password: f.password_is_public ? f.wifi_password : undefined,
      };
      const res = await fetch('/api/spots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submission failed.');
      setMsg({ kind: 'ok', text: data.message || 'Thanks! Your spot is pending review.' });
      setF({ ...initial });
    } catch (err) {
      setMsg({ kind: 'err', text: err instanceof Error ? err.message : 'Something went wrong.' });
    } finally {
      setBusy(false);
    }
  };

  const check = (k: keyof typeof initial, label: string) => (
    <label className="row" style={{ gap: 8 }}>
      <input type="checkbox" style={{ width: 'auto' }} checked={f[k] as boolean} onChange={(e) => set(k, e.target.checked)} />
      {label}
    </label>
  );

  return (
    <form onSubmit={submit} className="card card-pad" style={{ maxWidth: 720 }}>
      {msg && <div className={`alert ${msg.kind === 'ok' ? 'ok' : 'err'}`}>{msg.text}</div>}

      <div className="field">
        <label>Spot name *</label>
        <input required minLength={2} maxLength={160} value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Dhanmondi Lake Café" />
      </div>

      <div className="grid-2">
        <div className="field">
          <label>Category</label>
          <select value={f.category} onChange={(e) => set('category', e.target.value)}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Owner type</label>
          <select value={f.owner_type} onChange={(e) => set('owner_type', e.target.value)}>
            {OWNERS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className="field">
        <button type="button" className="btn btn-ghost" onClick={useMyLocation}>📍 Use my current location</button>
        <div className="hint">Or enter coordinates manually. Must be inside Bangladesh.</div>
      </div>
      <div className="grid-2">
        <div className="field">
          <label>Latitude *</label>
          <input required inputMode="decimal" value={f.lat} onChange={(e) => set('lat', e.target.value)} placeholder="23.7461" />
        </div>
        <div className="field">
          <label>Longitude *</label>
          <input required inputMode="decimal" value={f.lng} onChange={(e) => set('lng', e.target.value)} placeholder="90.3742" />
        </div>
      </div>
      <div className="grid-2">
        <div className="field"><label>Area</label><input maxLength={80} value={f.area} onChange={(e) => set('area', e.target.value)} /></div>
        <div className="field"><label>City</label><input maxLength={80} value={f.city} onChange={(e) => set('city', e.target.value)} /></div>
      </div>

      <div className="grid-2">
        <div className="field">
          <label>Access</label>
          <select value={f.access_type} onChange={(e) => set('access_type', e.target.value)}>
            {ACCESS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Opening hours</label>
          <input maxLength={120} value={f.hours} onChange={(e) => set('hours', e.target.value)} placeholder="09:00-22:00" />
        </div>
      </div>

      <div className="field">
        {check('password_is_public', 'Password is publicly posted (owner allows sharing)')}
        {f.password_is_public && (
          <input maxLength={128} value={f.wifi_password} onChange={(e) => set('wifi_password', e.target.value)} placeholder="Publicly posted WiFi password" style={{ marginTop: 8 }} />
        )}
        <div className="hint">Only add a password if it is officially/publicly posted. Never share private network passwords.</div>
      </div>

      <div className="field">
        <label>Why is it free?</label>
        <input maxLength={300} value={f.why_free} onChange={(e) => set('why_free', e.target.value)} placeholder="e.g. Free for customers" />
      </div>

      <div className="grid-2">
        <div className="field">
          <label>Lighting</label>
          <select value={f.lighting} onChange={(e) => set('lighting', e.target.value)}>{LIGHTS.map((c) => <option key={c} value={c}>{c}</option>)}</select>
        </div>
        <div className="field">
          <label>Crowd level</label>
          <select value={f.crowd_level} onChange={(e) => set('crowd_level', e.target.value)}>{CROWDS.map((c) => <option key={c} value={c}>{c}</option>)}</select>
        </div>
      </div>

      <div className="field stack">
        {check('has_power', 'Power outlets')}
        {check('has_seating', 'Seating')}
        {check('is_quiet', 'Quiet / study-friendly')}
        {check('has_cctv', 'CCTV present')}
        {check('staff_present', 'Staff present')}
        {check('family_friendly', 'Family friendly')}
      </div>

      {/* Honeypot: hidden from humans, hides from screen readers, catches bots. */}
      <input
        type="text" tabIndex={-1} autoComplete="off" aria-hidden="true"
        value={f.website_url} onChange={(e) => set('website_url', e.target.value)}
        style={{ position: 'absolute', left: '-9999px', width: 1, height: 1 }}
      />

      <button className="btn btn-primary btn-block" disabled={busy}>
        {busy ? <span className="spinner" /> : 'Submit spot for review'}
      </button>
    </form>
  );
}
