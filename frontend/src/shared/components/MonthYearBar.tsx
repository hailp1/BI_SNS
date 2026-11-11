import { Calendar, Globe, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { changeAppLanguage } from '../../i18n';
import { useFiltersStore } from '../stores/filters.store';

const MONTHS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
const YEARS = ['2026', '2025'];

export function MonthYearBar() {
  const { i18n } = useTranslation();
  const year = useFiltersStore((s) => s.year);
  const selectedMonths = useFiltersStore((s) => s.selectedMonths);
  const setYear = useFiltersStore((s) => s.setYear);
  const toggleMonth = useFiltersStore((s) => s.toggleMonth);
  const resetAll = useFiltersStore((s) => s.resetAll);

  const currentLang = (i18n.language || 'vi').slice(0, 2) as 'vi' | 'en' | 'ko';

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
          <Calendar className="h-4 w-4 text-red-600" />
          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            aria-label="Chọn năm"
            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-800 outline-none focus:border-red-500"
          >
            {YEARS.map((y) => (
              <option key={y} value={y}>
                Năm {y}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-1">
          {MONTHS.map((m) => {
            const active = selectedMonths.includes(m);
            return (
              <button
                key={m}
                type="button"
                onClick={() => toggleMonth(m)}
                className={`rounded-md px-2 py-1 text-xs font-semibold transition ${
                  active
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                T{parseInt(m, 10)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={resetAll}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Đặt lại bộ lọc
        </button>

        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-0.5">
          <Globe className="ml-1.5 h-3.5 w-3.5 text-slate-400" />
          {(['vi', 'en', 'ko'] as const).map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => changeAppLanguage(lang)}
              className={`rounded px-2 py-0.5 text-[11px] font-bold uppercase ${
                currentLang === lang ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {lang}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
