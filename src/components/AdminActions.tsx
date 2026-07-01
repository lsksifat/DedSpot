'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

async function post(url: string, body: object): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function SpotActionsAdmin({ id }: { id: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const act = async (action: 'approve' | 'reject') => {
    setBusy(true);
    const ok = await post(`/api/admin/spots/${id}`, { action });
    if (ok) router.refresh();
    else { setBusy(false); alert('Action failed. Try again.'); }
  };
  return (
    <div className="row">
      <button className="btn btn-primary" disabled={busy} onClick={() => act('approve')} style={{ padding: '6px 12px' }}>Approve</button>
      <button className="btn btn-ghost" disabled={busy} onClick={() => act('reject')} style={{ padding: '6px 12px' }}>Reject</button>
    </div>
  );
}

export function ReportActionsAdmin({ id }: { id: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const act = async (status: 'reviewed' | 'actioned' | 'dismissed') => {
    setBusy(true);
    const ok = await post(`/api/admin/reports/${id}`, { status });
    if (ok) router.refresh();
    else { setBusy(false); alert('Action failed. Try again.'); }
  };
  return (
    <div className="row">
      <button className="btn btn-ghost" disabled={busy} onClick={() => act('reviewed')} style={{ padding: '6px 10px' }}>Reviewed</button>
      <button className="btn btn-ghost" disabled={busy} onClick={() => act('dismissed')} style={{ padding: '6px 10px' }}>Dismiss</button>
      <button className="btn btn-primary" disabled={busy} onClick={() => act('actioned')} style={{ padding: '6px 10px' }}>Actioned</button>
    </div>
  );
}
