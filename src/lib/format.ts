export function formatDistance(m?: number): string | null {
  if (m == null || !Number.isFinite(m)) return null;
  if (m < 950) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

export function ratingText(avg?: number | null, count?: number): string {
  if (!count || avg == null) return 'No reviews yet';
  return `★ ${avg.toFixed(1)} (${count})`;
}

const CATEGORY_LABEL: Record<string, string> = {
  cafe: 'Café', restaurant: 'Restaurant', library: 'Library', university: 'University',
  school: 'School', park: 'Park', mall: 'Mall', government: 'Government',
  mosque: 'Mosque', hospital: 'Hospital', transport: 'Transport', coworking: 'Coworking', other: 'Other',
};
export const categoryLabel = (c: string) => CATEGORY_LABEL[c] ?? c;
