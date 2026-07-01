import type { Badge } from '@/lib/safety';

const toneClass: Record<string, string> = {
  safe: 'badge safe', warn: 'badge warn', danger: 'badge danger',
  info: 'badge info', neutral: 'badge',
};

export default function Badges({ items, max }: { items: Badge[]; max?: number }) {
  const list = max ? items.slice(0, max) : items;
  return (
    <div className="badges">
      {list.map((b, i) => (
        <span key={i} className={toneClass[b.tone] ?? 'badge'}>{b.label}</span>
      ))}
    </div>
  );
}
