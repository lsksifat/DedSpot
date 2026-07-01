'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Spot } from '@/lib/types';
import SpotCard from './SpotCard';
import MapView from './MapView';

type Status = 'idle' | 'locating' | 'loading' | 'ready' | 'error';
const RADII = [1000, 3000, 5000, 10000];

export default function NearbyScanner() {
  const [status, setStatus] = useState<Status>('idle');
  const [spots, setSpots] = useState<Spot[]>([]);
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [radius, setRadius] = useState(3000);
  const [error, setError] = useState('');

  // Show some spots on first load so the map isn't empty before scanning.
  useEffect(() => {
    fetch('/api/spots?limit=40')
      .then((r) => r.json())
      .then((d) => Array.isArray(d.spots) && setSpots(d.spots))
      .catch(() => {});
  }, []);

  const fetchNear = useCallback(async (lat: number, lng: number, r: number) => {
    setStatus('loading');
    try {
      const res = await fetch(`/api/spots/near?lat=${lat}&lng=${lng}&radius=${r}`);
      if (!res.ok) throw new Error('Request failed');
      const data = await res.json();
      setSpots(data.spots ?? []);
      setStatus('ready');
    } catch {
      setError('Could not load nearby spots. Please try again.');
      setStatus('error');
    }
  }, []);

  const scan = useCallback(() => {
    setError('');
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setError('Your browser does not support location.');
      setStatus('error');
      return;
    }
    setStatus('locating');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLoc(loc);
        void fetchNear(loc.lat, loc.lng, radius);
      },
      (err) => {
        setError(
          err.code === err.PERMISSION_DENIED
            ? 'Location permission denied. Enable it, or browse the map manually.'
            : 'Could not get your location. Try again in an open area.',
        );
        setStatus('error');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    );
  }, [fetchNear, radius]);

  const onRadiusChange = (r: number) => {
    setRadius(r);
    if (userLoc) void fetchNear(userLoc.lat, userLoc.lng, r);
  };

  const locating = status === 'locating' || status === 'loading';

  return (
    <div>
      <div className="row" style={{ marginBottom: 14 }}>
        <button className="btn btn-primary" onClick={scan} disabled={locating}>
          {locating ? <span className="spinner" /> : '📍'}
          {status === 'locating' ? 'Finding you…' : status === 'loading' ? 'Scanning…' : 'Scan near me'}
        </button>
        <label className="row" style={{ gap: 6 }}>
          <span className="muted">Radius</span>
          <select
            value={radius}
            onChange={(e) => onRadiusChange(Number(e.target.value))}
            style={{ width: 'auto' }}
          >
            {RADII.map((r) => (
              <option key={r} value={r}>{r / 1000} km</option>
            ))}
          </select>
        </label>
        {status === 'ready' && (
          <span className="muted">{spots.length} spot{spots.length === 1 ? '' : 's'} found</span>
        )}
      </div>

      {error && <div className="alert err">{error}</div>}

      <div className="finder">
        <MapView spots={spots} userLoc={userLoc} selectedId={selectedId} onSelectAction={setSelectedId} />
        <div className="spot-list">
          {spots.length === 0 && (
            <div className="muted center" style={{ padding: 24 }}>
              Tap <strong>Scan near me</strong> to find free WiFi around you.
            </div>
          )}
          {spots.map((s) => (
            <div key={s.id}>
              <SpotCard spot={s} active={s.id === selectedId} onSelect={setSelectedId} />
              <a href={`/spot/${s.id}`} className="muted" style={{ fontSize: 13, display: 'inline-block', margin: '4px 4px 0' }}>
                View details →
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
