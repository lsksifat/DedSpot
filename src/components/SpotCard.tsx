import type { Spot } from '@/lib/types';
import { badges } from '@/lib/safety';
import { formatDistance, ratingText, categoryLabel } from '@/lib/format';
import Badges from './Badges';

interface Props {
  spot: Spot;
  onSelect?: (id: number) => void;
  active?: boolean;
}

export default function SpotCard({ spot, onSelect, active }: Props) {
  const dist = formatDistance(spot.distance_m);
  const place = [spot.area, spot.city].filter(Boolean).join(', ');
  return (
    <div
      className="card spot"
      style={active ? { borderColor: 'var(--primary)' } : undefined}
      onClick={() => onSelect?.(spot.id)}
      role={onSelect ? 'button' : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onKeyDown={(e) => { if (onSelect && (e.key === 'Enter' || e.key === ' ')) onSelect(spot.id); }}
    >
      <div className="top">
        <div>
          <h3>{spot.name}</h3>
          <div className="meta">
            {categoryLabel(spot.category)}{place ? ` · ${place}` : ''}
          </div>
          <div className="meta">{ratingText(spot.avg_rating, spot.reviews_count)}</div>
        </div>
        {dist && <span className="dist">{dist}</span>}
      </div>
      <Badges items={badges(spot)} max={5} />
    </div>
  );
}
