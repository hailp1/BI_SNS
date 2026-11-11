import type { ReactNode } from 'react';

interface KpiCardProps {
  title: string;
  value: string;
  subtitle?: string;
  badge?: string;
  badgeTone?: 'positive' | 'negative' | 'neutral';
  icon?: ReactNode;
  accent?: 'red' | 'blue' | 'emerald' | 'amber' | 'slate';
}

const ACCENT_MAP: Record<NonNullable<KpiCardProps['accent']>, string> = {
  red: 'border-l-red-600',
  blue: 'border-l-blue-600',
  emerald: 'border-l-emerald-600',
  amber: 'border-l-amber-500',
  slate: 'border-l-slate-700',
};

const BADGE_MAP: Record<NonNullable<KpiCardProps['badgeTone']>, string> = {
  positive: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  negative: 'bg-red-50 text-red-700 border-red-200',
  neutral: 'bg-slate-100 text-slate-700 border-slate-200',
};

export function KpiCard({
  title,
  value,
  subtitle,
  badge,
  badgeTone = 'neutral',
  icon,
  accent = 'red',
}: KpiCardProps) {
  return (
    <div
      className={`rounded-xl border border-slate-200 border-l-4 ${ACCENT_MAP[accent]} bg-white p-4 shadow-sm transition hover:shadow-md`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</span>
        {icon && <div className="text-slate-400">{icon}</div>}
      </div>
      <div className="mt-2 flex items-baseline justify-between gap-2">
        <span className="text-2xl font-bold tracking-tight text-slate-900">{value}</span>
        {badge && (
          <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${BADGE_MAP[badgeTone]}`}>
            {badge}
          </span>
        )}
      </div>
      {subtitle && <p className="mt-1.5 text-xs text-slate-500">{subtitle}</p>}
    </div>
  );
}

