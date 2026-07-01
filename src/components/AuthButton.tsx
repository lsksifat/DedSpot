'use client';

import { useState } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';

export default function AuthButton() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);

  if (status === 'loading') return <span className="muted" aria-hidden>…</span>;

  if (!session?.user) {
    return (
      <button className="btn btn-primary" onClick={() => signIn('google')} style={{ padding: '8px 14px' }}>
        Sign in
      </button>
    );
  }

  const { name, email, image, role } = session.user;
  return (
    <div style={{ position: 'relative' }}>
      <button
        className="btn btn-ghost"
        onClick={() => setOpen((v) => !v)}
        style={{ padding: '6px 10px', gap: 8 }}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" width={24} height={24} style={{ borderRadius: '50%' }} referrerPolicy="no-referrer" />
        ) : (
          <span>👤</span>
        )}
        <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {name || email}
        </span>
      </button>
      {open && (
        <div className="card card-pad" role="menu" style={{ position: 'absolute', right: 0, top: '110%', minWidth: 200, zIndex: 30 }}>
          <div className="muted" style={{ fontSize: 13, marginBottom: 8 }}>
            {email}
            {role === 'admin' && <span className="badge safe" style={{ marginLeft: 6 }}>admin</span>}
          </div>
          {(role === 'admin' || role === 'moderator') && (
            <a href="/admin" className="btn btn-ghost btn-block" style={{ marginBottom: 8 }}>Admin dashboard</a>
          )}
          <button className="btn btn-ghost btn-block" onClick={() => signOut()}>Sign out</button>
        </div>
      )}
    </div>
  );
}
