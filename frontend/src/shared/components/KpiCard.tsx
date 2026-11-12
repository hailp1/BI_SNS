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
  red: '#e11d48',
  blue: '#2563eb',
  emerald: '#10b981',
  amber: '#f59e0b',
  slate: '#334155',
};

const BADGE_MAP: Record<NonNullable<KpiCardProps['badgeTone']>, string> = {
  positive: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  negative: 'bg-rose-50 text-rose-700 border-rose-200',
  neutral: 'bg-slate-100 text-slate-700 border-slate-200',
};

export function KpiCard({
  title,
  value,
  subtitle,
  badge,
  badgeTone = 'neutral',
  icon,
  accent = 'blue',
}: KpiCardProps) {
  return (
    <div
      className="flex flex-col justify-between rounded-xl border border-slate-100 bg-white p-3.5 shadow-sm transition-all hover:shadow-md"
      style={{ borderLeft: `5px solid ${ACCENT_MAP[accent]}` }}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{title}</span>
        {icon && <div className="text-slate-400">{icon}</div>}
      </div>
      <div className="mt-1.5 flex items-baseline justify-between gap-2">
        <span className="font-mono-num text-2xl font-black tracking-tight text-slate-900">{value}</span>
        {badge && (
          <span className={`font-mono-num rounded-full border px-2 py-0.5 text-[11px] font-bold ${BADGE_MAP[badgeTone]}`}>
            {badge}
          </span>
        )}
      </div>
      {subtitle && <p className="mt-1.5 border-t border-slate-100/80 pt-1.5 text-[11px] font-semibold text-slate-500">{subtitle}</p>}
    </div>
  );
}
