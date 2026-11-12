import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';

interface EChartsCardProps {
  title: string;
  subtitle?: string;
  option: EChartsOption;
  height?: number;
  loading?: boolean;
  gradientClass?: 'grad-primary' | 'grad-green' | 'grad-blue' | 'grad-purple' | 'grad-orange' | 'grad-red';
  badgeText?: string;
  badgeClass?: string;
}

export function EChartsCard({
  title,
  subtitle,
  option,
  height = 300,
  loading = false,
  gradientClass,
  badgeText,
  badgeClass = 'badge-pill badge-pill-blue',
}: EChartsCardProps) {
  if (gradientClass) {
    return (
      <div className="material-card flex flex-col p-4 pt-0">
        <div className={`floating-chart-header ${gradientClass}`}>
          {loading ? (
            <div style={{ height }} className="flex items-center justify-center text-sm text-white/80">
              Đang tải biểu đồ...
            </div>
          ) : (
            <ReactECharts option={option} style={{ height, width: '100%' }} notMerge />
          )}
        </div>
        <div className="flex items-start justify-between px-2 pt-3">
          <div>
            <h3 className="text-sm font-bold text-slate-800">{title}</h3>
            {subtitle && <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>}
          </div>
          {badgeText && <span className={badgeClass}>{badgeText}</span>}
        </div>
      </div>
    );
  }

  return (
    <div className="material-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-800">{title}</h3>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>
        {badgeText && <span className={badgeClass}>{badgeText}</span>}
      </div>
      {loading ? (
        <div style={{ height }} className="flex items-center justify-center text-sm text-slate-400">
          Đang tải biểu đồ...
        </div>
      ) : (
        <ReactECharts option={option} style={{ height, width: '100%' }} notMerge />
      )}
    </div>
  );
}
