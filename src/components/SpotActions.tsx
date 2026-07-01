'use client';

import { useState } from 'react';

const AUDIENCES = ['student', 'woman', 'family', 'traveler', 'remote_worker', 'other'];
const REPORTS = ['harassment', 'theft', 'unsafe_area', 'scam', 'fake_listing', 'closed', 'other'];

export default function SpotActions({ spotId }: { spotId: number }) {
  const [rating, setRating] = useState(5);
  const [audience, setAudience] = useState('other');
  const [comment, setComment] = useState('');
  const [hp, setHp] = useState(''); // honeypot
  const [rvMsg, setRvMsg] = useState<{ k: 'ok' | 'err'; t: string } | null>(null);
  const [rvBusy, setRvBusy] = useState(false);

  const [rCat, setRCat] = useState('unsafe_area');
  const [rNote, setRNote] = useState('');
  const [rMsg, setRMsg] = useState<{ k: 'ok' | 'err'; t: string } | null>(null);
  const [rBusy, setRBusy] = useState(false);

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setRvBusy(true); setRvMsg(null);
    try {
      const res = await fetch(`/api/spots/${spotId}/reviews`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, audience, comment: comment || undefined, website_url: hp }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Failed');
      setRvMsg({ k: 'ok', t: 'Thanks! Reloading…' });
      setTimeout(() => location.reload(), 700);
    } catch (err) {
      setRvMsg({ k: 'err', t: err instanceof Error ? err.message : 'Failed to submit.' });
    } finally { setRvBusy(false); }
  };

  const submitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setRBusy(true); setRMsg(null);
    try {
      const res = await fetch(`/api/spots/${spotId}/report`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: rCat, note: rNote || undefined, website_url: hp }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Failed');
      setRMsg({ k: 'ok', t: d.message || 'Report submitted confidentially.' });
      setRNote('');
    } catch (err) {
      setRMsg({ k: 'err', t: err instanceof Error ? err.message : 'Failed to submit.' });
    } finally { setRBusy(false); }
  };

  return (
    <section className="section">
      <div className="finder">
        <form onSubmit={submitReview} className="card card-pad">
          <h3 style={{ marginTop: 0 }}>Leave a review</h3>
          {rvMsg && <div className={`alert ${rvMsg.k === 'ok' ? 'ok' : 'err'}`}>{rvMsg.t}</div>}
          <div className="grid-2">
            <div className="field">
              <label>Rating</label>
              <select value={rating} onChange={(e) => setRating(Number(e.target.value))}>
                {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{'★'.repeat(n)}</option>)}
              </select>
            </div>
            <div className="field">
              <label>You are a…</label>
              <select value={audience} onChange={(e) => setAudience(e.target.value)}>
                {AUDIENCES.map((a) => <option key={a} value={a}>{a.replace('_', ' ')}</option>)}
              </select>
            </div>
          </div>
          <div className="field">
            <label>Comment</label>
            <textarea rows={3} maxLength={1000} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="How was the WiFi, seating, safety?" />
          </div>
          <input type="text" tabIndex={-1} aria-hidden="true" value={hp} onChange={(e) => setHp(e.target.value)} style={{ position: 'absolute', left: '-9999px', width: 1, height: 1 }} />
          <button className="btn btn-primary btn-block" disabled={rvBusy}>{rvBusy ? <span className="spinner" /> : 'Post review'}</button>
        </form>

        <form onSubmit={submitReport} className="card card-pad">
          <h3 style={{ marginTop: 0 }}>Report a problem</h3>
          <p className="muted" style={{ marginTop: 0, fontSize: 14 }}>
            Confidential. Used by moderators only — never shown publicly as an accusation.
          </p>
          {rMsg && <div className={`alert ${rMsg.k === 'ok' ? 'ok' : 'err'}`}>{rMsg.t}</div>}
          <div className="field">
            <label>Reason</label>
            <select value={rCat} onChange={(e) => setRCat(e.target.value)}>
              {REPORTS.map((c) => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Details (optional)</label>
            <textarea rows={3} maxLength={1000} value={rNote} onChange={(e) => setRNote(e.target.value)} />
          </div>
          <button className="btn btn-ghost btn-block" disabled={rBusy}>{rBusy ? <span className="spinner" /> : 'Submit report'}</button>
        </form>
      </div>
    </section>
  );
}
