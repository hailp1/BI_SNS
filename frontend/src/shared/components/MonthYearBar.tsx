import { Check, Calendar, RotateCcw, Sparkles } from 'lucide-react';
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

  // Human-readable summary for selected months
  const selectedSummary = (() => {
    if (isYtdActive) return `Lũy kế YTD (T1–T${ytdEnd}/${year})`;
    if (isFullYearActive) return `Toàn bộ 12 Tháng / Năm ${year}`;
    if (selectedMonths.length === 0) return 'Chưa chọn tháng (mặc định T10)';
    if (selectedMonths.length === 1) return `Tháng T${parseInt(selectedMonths[0], 10)}/${year}`;
    const sorted = [...selectedMonths].sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
    return `${sorted.map((m) => `T${parseInt(m, 10)}`).join(', ')} (${selectedMonths.length} tháng)`;
  })();

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-slate-200/90 bg-white p-2.5 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="flex items-center gap-1 mr-1 text-[11px] font-black uppercase tracking-wider text-sky-900 bg-sky-100/70 px-2 py-1 rounded-lg border border-sky-200/80">
            <Calendar className="h-3.5 w-3.5 text-sky-700" />
            <span>Tháng:</span>
          </span>

          {/* Nút YTD */}
          <button
            type="button"
            onClick={() => setSelectedMonths(ytdMonths)}
            className={`relative flex items-center gap-1 px-3 py-1.5 text-xs font-black rounded-lg transition-all duration-200 ${
              isYtdActive
                ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white shadow-md shadow-emerald-500/30 ring-2 ring-emerald-400 scale-[1.03]'
                : 'bg-emerald-50/70 text-emerald-800 border border-emerald-300 hover:bg-emerald-100/80 hover:shadow-xs'
            }`}
            title={`Chọn lũy kế YTD (T1–T${ytdEnd})`}
          >
            {isYtdActive && <Sparkles className="h-3.5 w-3.5 text-yellow-300 animate-pulse" />}
            <span>YTD</span>
            {isYtdActive && (
              <span className="ml-0.5 rounded-full bg-white/25 px-1 py-0.2 text-[9px] font-extrabold text-white">
                T1–T{ytdEnd}
              </span>
            )}
          </button>

          {/* Nút Cả năm */}
          <button
            type="button"
            onClick={() => setSelectedMonths(MONTHS)}
            className={`relative flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 ${
              isFullYearActive
                ? 'bg-gradient-to-r from-indigo-600 to-purple-700 text-white shadow-md shadow-indigo-500/30 ring-2 ring-indigo-400 scale-[1.03]'
                : 'bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200/80 hover:text-slate-900'
            }`}
            title="Chọn cả 12 tháng"
          >
            {isFullYearActive && <Check className="h-3.5 w-3.5 text-white" />}
            <span>Cả năm</span>
          </button>

          <span className="mx-1 h-5 w-px bg-slate-300" />

          {/* 12 Nút Tháng T1..T12 */}
          <div className="flex flex-wrap items-center gap-1">
            {MONTHS.map((m) => {
              const active = selectedMonths.includes(m);
              const mNum = parseInt(m, 10);
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => handleMonthClick(m)}
                  onDoubleClick={() => setSelectedMonths([m])}
                  className={`relative flex items-center justify-center min-w-[38px] px-2.5 py-1.5 text-xs font-bold rounded-lg transition-all duration-150 ${
                    active
                      ? 'bg-gradient-to-r from-sky-600 to-[#004B91] text-white font-black shadow-md shadow-sky-500/30 ring-2 ring-sky-400 scale-[1.04] z-10'
                      : 'bg-white text-slate-700 border border-slate-300 hover:border-sky-400 hover:text-sky-700 hover:bg-sky-50/70 shadow-2xs'
                  }`}
                  title={
                    singleMode
                      ? `Chọn chỉ T${mNum}`
                      : `Click: bật/tắt T${mNum} • Double-click: chỉ chọn T${mNum}`
                  }
                >
                  {active && <span className="absolute -top-1 -right-1 flex h-2 w-2 rounded-full bg-yellow-400 ring-1 ring-white" />}
                  <span>T{mNum}</span>
                </button>
              );
            })}
          </div>

          <span className="mx-1 h-5 w-px bg-slate-300" />

          {/* Quý Q1..Q4 */}
          <div className="flex items-center gap-1">
            {QUARTERS.map((q) => {
              const qActive =
                selectedMonths.length === q.months.length &&
                q.months.every((m) => selectedMonths.includes(m));
              return (
                <button
                  key={q.label}
                  type="button"
                  onClick={() => setSelectedMonths(q.months)}
                  className={`px-2.5 py-1.5 text-xs font-bold rounded-lg transition-all duration-150 ${
                    qActive
                      ? 'bg-gradient-to-r from-blue-700 to-indigo-800 text-white font-black shadow-sm ring-2 ring-blue-400 scale-[1.03]'
                      : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-slate-800'
                  }`}
                  title={`Chọn ${q.label} (${q.months.map((m) => `T${parseInt(m, 10)}`).join(', ')})`}
                >
                  {q.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Chế độ chọn: Nhiều tháng vs 1 tháng */}
          <div className="flex items-center rounded-lg border border-slate-300 bg-slate-100 p-0.5 text-[11px] font-bold">
            <button
              type="button"
              onClick={() => setSingleMode(false)}
              className={`rounded-md px-2.5 py-1 transition-all ${
                !singleMode ? 'bg-[#004B91] text-white shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Cho phép chọn cùng lúc nhiều tháng bằng cách click lần lượt"
            >
              Nhiều tháng
            </button>
            <button
              type="button"
              onClick={() => {
                setSingleMode(true);
                if (selectedMonths.length > 1) {
                  setSelectedMonths([selectedMonths[selectedMonths.length - 1]]);
                }
              }}
              className={`rounded-md px-2.5 py-1 transition-all ${
                singleMode ? 'bg-[#004B91] text-white shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Mỗi lần click chỉ chọn đúng 1 tháng duy nhất"
            >
              1 tháng
            </button>
          </div>

          <button
            type="button"
            onClick={resetAll}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
            title="Đặt lại bộ lọc về mặc định (T10/2026)"
          >
            <RotateCcw className="h-3 w-3" />
            Reset
          </button>
        </div>
      </div>

      {/* Thông tin trực quan trạng thái bộ lọc đang được chọn */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 pt-1 border-t border-slate-100 text-[11px]">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-slate-500 font-medium">Đang lọc hiển thị:</span>
          <span className="font-bold text-sky-900 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
            {selectedSummary}
          </span>
        </div>
        <div className="text-[10.5px] text-slate-400">
          Tip: Click để bật/tắt tháng • Double-click để chọn ngay 1 tháng
        </div>
      </div>
    </div>
  );
}
