import { RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { useFiltersStore } from '../stores/filters.store';

const MONTHS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];

const QUARTERS: { label: string; months: string[] }[] = [
  { label: 'Q1', months: ['01', '02', '03'] },
  { label: 'Q2', months: ['04', '05', '06'] },
  { label: 'Q3', months: ['07', '08', '09'] },
  { label: 'Q4', months: ['10', '11', '12'] },
];

export function MonthYearBar() {
  const year = useFiltersStore((s) => s.year);
  const selectedMonths = useFiltersStore((s) => s.selectedMonths);
  const toggleMonth = useFiltersStore((s) => s.toggleMonth);
  const setSelectedMonths = useFiltersStore((s) => s.setSelectedMonths);
  const resetAll = useFiltersStore((s) => s.resetAll);
  const [singleMode, setSingleMode] = useState(false);

  const ytdEnd = year === '2026' ? 10 : 12;
  const ytdMonths = MONTHS.slice(0, ytdEnd);
  const isYtdActive =
    selectedMonths.length === ytdMonths.length &&
    ytdMonths.every((m) => selectedMonths.includes(m));
  const isFullYearActive = selectedMonths.length === 12;

  const handleMonthClick = (m: string) => {
    if (singleMode) {
      setSelectedMonths([m]);
    } else {
      toggleMonth(m);
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-[10px] font-black uppercase text-sky-800">📅 Tháng:</span>

        <button
          type="button"
          onClick={() => setSelectedMonths(ytdMonths)}
          className={`month-pill font-black ${isYtdActive ? 'active' : ''}`}
          title={`Chọn lũy kế YTD (T1–T${ytdEnd})`}
        >
          YTD
        </button>

        <button
          type="button"
          onClick={() => setSelectedMonths(MONTHS)}
          className={`month-pill font-bold ${isFullYearActive ? 'active' : ''}`}
          title="Chọn cả 12 tháng"
        >
          Cả năm
        </button>

        <span className="mx-0.5 h-4 w-px bg-slate-300" />

        {MONTHS.map((m) => {
          const active = selectedMonths.includes(m);
          return (
            <button
              key={m}
              type="button"
              onClick={() => handleMonthClick(m)}
              onDoubleClick={() => setSelectedMonths([m])}
              className={`month-pill ${active ? 'active' : ''}`}
              title={singleMode ? `Chọn chỉ T${parseInt(m, 10)}` : `Click: bật/tắt T${parseInt(m, 10)} • Double-click: chỉ chọn T${parseInt(m, 10)}`}
            >
              T{parseInt(m, 10)}
            </button>
          );
        })}

        <span className="mx-0.5 h-4 w-px bg-slate-300" />

        {QUARTERS.map((q) => {
          const qActive =
            selectedMonths.length === q.months.length &&
            q.months.every((m) => selectedMonths.includes(m));
          return (
            <button
              key={q.label}
              type="button"
              onClick={() => setSelectedMonths(q.months)}
              className={`month-pill ${qActive ? 'active' : ''}`}
              title={`Chọn ${q.label}`}
            >
              {q.label}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-1.5">
        <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5 text-[10px] font-bold">
          <button
            type="button"
            onClick={() => setSingleMode(false)}
            className={`rounded-md px-2 py-0.5 transition ${
              !singleMode ? 'bg-[#004B91] text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Nhiều tháng
          </button>
          <button
            type="button"
            onClick={() => setSingleMode(true)}
            className={`rounded-md px-2 py-0.5 transition ${
              singleMode ? 'bg-[#004B91] text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            1 tháng
          </button>
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
    </div>
  );
}
