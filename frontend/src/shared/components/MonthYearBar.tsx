import { RotateCcw } from 'lucide-react';
import { useFiltersStore } from '../stores/filters.store';

const MONTHS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];

export function MonthYearBar() {
  const selectedMonths = useFiltersStore((s) => s.selectedMonths);
  const toggleMonth = useFiltersStore((s) => s.toggleMonth);
  const resetAll = useFiltersStore((s) => s.resetAll);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-[10px] font-black uppercase text-sky-800">📅 Tháng:</span>
        {MONTHS.map((m) => {
          const active = selectedMonths.includes(m);
          return (
            <button
              key={m}
              type="button"
              onClick={() => toggleMonth(m)}
              className={`month-pill ${active ? 'active' : ''}`}
            >
              T{parseInt(m, 10)}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={resetAll}
        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-600 transition hover:bg-slate-100"
      >
        <RotateCcw className="h-3 w-3" />
        Reset
      </button>
    </div>
  );
}
