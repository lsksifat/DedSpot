'use client';

import { useEffect, useRef, useState } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Spot } from '@/lib/types';
import { safetyLevel } from '@/lib/safety';

interface Props {
  spots: Spot[];
  userLoc?: { lat: number; lng: number } | null;
  selectedId?: number | null;
  onSelectAction?: (id: number) => void;
}

const BD_CENTER: [number, number] = [90.36, 23.78];
const LEVEL_COLOR: Record<string, string> = {
  high: '#2fbf71', moderate: '#f4b740', low: '#ef5350', unknown: '#8aa0c2',
};

// Keyless OpenStreetMap raster style (no API key, no billing).
const OSM_STYLE = {
  version: 8 as const,
  sources: {
    osm: {
      type: 'raster' as const,
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [{ id: 'osm', type: 'raster' as const, source: 'osm' }],
};

export default function MapView({ spots, userLoc, selectedId, onSelectAction }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const glRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const userMarkerRef = useRef<any>(null);
  const [ready, setReady] = useState(false);

  // Initialise the map once (client-only import avoids SSR "window" errors).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const maplibregl = (await import('maplibre-gl')).default;
      if (cancelled || !containerRef.current || mapRef.current) return;
      glRef.current = maplibregl;
      const map = new maplibregl.Map({
        container: containerRef.current,
        style: OSM_STYLE as any,
        center: userLoc ? [userLoc.lng, userLoc.lat] : BD_CENTER,
        zoom: userLoc ? 13 : 6.3,
        attributionControl: true,
      });
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
      map.on('load', () => !cancelled && setReady(true));
      mapRef.current = map;
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Render spot markers whenever the list changes.
  useEffect(() => {
    const map = mapRef.current;
    const gl = glRef.current;
    if (!map || !gl || !ready) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = spots.map((s) => {
      const marker = new gl.Marker({ color: LEVEL_COLOR[safetyLevel(s)] })
        .setLngLat([s.lng, s.lat])
        .setPopup(new gl.Popup({ offset: 24 }).setText(s.name))
        .addTo(map);
      marker.getElement().style.cursor = 'pointer';
      marker.getElement().addEventListener('click', () => onSelectAction?.(s.id));
      return marker;
    });
  }, [spots, ready, onSelectAction]);

  // Fly to and mark the user's location.
  useEffect(() => {
    const map = mapRef.current;
    const gl = glRef.current;
    if (!map || !gl || !ready || !userLoc) return;
    map.flyTo({ center: [userLoc.lng, userLoc.lat], zoom: 14, speed: 1.4 });
    userMarkerRef.current?.remove();
    userMarkerRef.current = new gl.Marker({ color: '#4f8cff' })
      .setLngLat([userLoc.lng, userLoc.lat])
      .setPopup(new gl.Popup({ offset: 24 }).setText('You are here'))
      .addTo(map);
  }, [userLoc, ready]);

  // Center on a selected spot.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || selectedId == null) return;
    const s = spots.find((x) => x.id === selectedId);
    if (s) map.flyTo({ center: [s.lng, s.lat], zoom: 15, speed: 1.4 });
  }, [selectedId, spots, ready]);

  return <div ref={containerRef} className="map-wrap" aria-label="Map of WiFi spots" />;
}
