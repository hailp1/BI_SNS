import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';

interface EChartsCardProps {
  title: string;
  subtitle?: string;
  option: EChartsOption;
  height?: number;
  loading?: boolean;
}

export function EChartsCard({ title, subtitle, option, height = 320, loading = false }: EChartsCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-800">{title}</h3>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {loading ? (
        <div style={{ height }} className="flex items-center justify-center text-sm text-slate-400">
          Đang tải biểu đồ...
        </div>
      ) : (
        <ReactECharts option={option} style={{ height, width: '100%' }} notMerge lazyUpdate />
      )}
    </div>
  );
}

