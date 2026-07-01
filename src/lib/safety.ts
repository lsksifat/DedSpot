import type { Spot, Audience } from './types';

// Pure, transparent, rule-based scoring. No hidden ML, no fake precision:
// when we don't have enough facts we say "unknown" rather than guessing.

export type SafetyLevel = 'high' | 'moderate' | 'low' | 'unknown';
export type BadgeTone = 'safe' | 'warn' | 'danger' | 'info' | 'neutral';
export interface Badge { label: string; tone: BadgeTone; }

function knownSafetyFactors(s: Spot): number {
  let n = 0;
  if (s.lighting !== 'unknown') n++;
  if (s.crowd_level !== 'unknown') n++;
  if (s.has_cctv) n++;
  if (s.staff_present) n++;
  return n;
}

export function safetyScore(s: Spot): number {
  let score = 10;
  score += s.lighting === 'good' ? 25 : s.lighting === 'moderate' ? 14 : 0;
  if (s.has_cctv) score += 18;
  if (s.staff_present) score += 18;
  score += s.crowd_level === 'busy' || s.crowd_level === 'moderate' ? 15
    : s.crowd_level === 'quiet' ? 5 : 0;
  if (s.verified) score += 10;
  if (s.family_friendly) score += 4;
  return Math.max(0, Math.min(100, score));
}

export function safetyLevel(s: Spot): SafetyLevel {
  if (knownSafetyFactors(s) < 2) return 'unknown';
  const score = safetyScore(s);
  if (score >= 70) return 'high';
  if (score >= 45) return 'moderate';
  return 'low';
}

// Women's-safety indicator — informational, respectful, attribute-based.
export type WomenSafety = 'suitable' | 'caution' | 'unknown';
export function womenSafety(s: Spot): WomenSafety {
  if (knownSafetyFactors(s) < 2) return 'unknown';
  const wellLit = s.lighting === 'good';
  const watched = s.has_cctv || s.staff_present;
  const notIsolated = s.crowd_level === 'busy' || s.crowd_level === 'moderate';
  if (wellLit && watched && notIsolated) return 'suitable';
  if (s.lighting === 'poor' || s.crowd_level === 'quiet') return 'caution';
  return 'caution';
}

export function audiences(s: Spot): Audience[] {
  const out: Audience[] = [];
  if (s.has_seating && (s.has_power || s.is_quiet)) out.push('student');
  if (s.has_power && s.has_seating && s.is_quiet) out.push('remote_worker');
  if (s.family_friendly || (s.lighting === 'good' && s.staff_present)) out.push('family');
  if (womenSafety(s) === 'suitable') out.push('woman');
  if (s.access_type === 'open' || s.password_is_public || s.category === 'transport') out.push('traveler');
  return out;
}

const AUDIENCE_LABEL: Record<Audience, string> = {
  student: 'Good for students',
  remote_worker: 'Remote-work friendly',
  family: 'Family friendly',
  woman: 'Women-safety: suitable',
  traveler: 'Traveler friendly',
  other: 'General',
};

export function badges(s: Spot): Badge[] {
  const out: Badge[] = [];
  const lvl = safetyLevel(s);
  out.push({
    label: `Safety: ${lvl}`,
    tone: lvl === 'high' ? 'safe' : lvl === 'moderate' ? 'warn' : lvl === 'low' ? 'danger' : 'neutral',
  });
  for (const a of audiences(s)) {
    out.push({ label: AUDIENCE_LABEL[a], tone: a === 'woman' ? 'safe' : 'info' });
  }
  if (s.is_free) out.push({ label: 'Free', tone: 'safe' });
  if (s.access_type === 'open') out.push({ label: 'Open (no password)', tone: 'info' });
  if (s.password_is_public) out.push({ label: 'Password posted', tone: 'info' });
  if (s.has_power) out.push({ label: 'Power outlets', tone: 'neutral' });
  if (s.is_quiet) out.push({ label: 'Quiet', tone: 'neutral' });
  if (s.has_cctv) out.push({ label: 'CCTV', tone: 'neutral' });
  if (s.staff_present) out.push({ label: 'Staff present', tone: 'neutral' });
  if (s.verified) out.push({ label: '✓ Verified', tone: 'safe' });
  return out;
}

// Security reminder shown on every spot (public WiFi hygiene).
export const PUBLIC_WIFI_TIP =
  'Public WiFi is shared and can be watched. Avoid banking or logging into sensitive accounts, prefer sites with the padlock (HTTPS), and turn off auto-connect. A VPN adds an extra layer of protection.';
