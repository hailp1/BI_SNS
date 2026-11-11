import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Search } from 'lucide-react';

export interface ColumnDef<T> {
  key: string;
  header: string;
  align?: 'left' | 'right' | 'center';
  sortValue?: (row: T) => string | number;
  render: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  searchPlaceholder?: string;
  searchFilter?: (row: T, query: string) => boolean;
  pageSize?: number;
  emptyMessage?: string;
  headerActions?: React.ReactNode;
}

export function DataTable<T>({
  data,
  columns,
  searchPlaceholder = 'Tìm kiếm...',
  searchFilter,
  pageSize = 15,
  emptyMessage = 'Không có dữ liệu phù hợp',
  headerActions,
}: DataTableProps<T>) {
  const [query, setQuery] = useState('');
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = q && searchFilter ? data.filter((r) => searchFilter(r, q)) : data;

    if (sortCol) {
      const colDef = columns.find((c) => c.key === sortCol);
      if (colDef?.sortValue) {
        const getter = colDef.sortValue;
        rows = [...rows].sort((a, b) => {
          const va = getter(a);
          const vb = getter(b);
          if (typeof va === 'number' && typeof vb === 'number') {
            return sortAsc ? va - vb : vb - va;
          }
          return sortAsc ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
        });
      }
    }
    return rows;
  }, [data, query, searchFilter, sortCol, sortAsc, columns]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const slice = useMemo(
    () => filtered.slice((safePage - 1) * pageSize, safePage * pageSize),
    [filtered, safePage, pageSize],
  );

  const handleSort = (key: string) => {
    if (sortCol === key) {
      setSortAsc((prev) => !prev);
    } else {
      setSortCol(key);
      setSortAsc(false);
    }
    setPage(1);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      {(searchFilter || headerActions) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
          {searchFilter ? (
            <div className="relative w-full max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder={searchPlaceholder}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-sm text-slate-800 outline-none focus:border-red-500 focus:bg-white"
              />
            </div>
          ) : (
            <div />
          )}
          {headerActions}
        </div>
      )}

      <div className="overflow-x-auto cj-scrollbar">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => col.sortValue && handleSort(col.key)}
                  className={`px-4 py-3 ${
                    col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                  } ${col.sortValue ? 'cursor-pointer select-none hover:bg-slate-100' : ''}`}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    {sortCol === col.key &&
                      (sortAsc ? <ArrowUp className="h-3 w-3 text-red-600" /> : <ArrowDown className="h-3 w-3 text-red-600" />)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {slice.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-sm text-slate-400">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              slice.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/70">
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`whitespace-nowrap px-4 py-2.5 text-slate-700 ${
                        col.align === 'right' ? 'text-right tabular-nums' : col.align === 'center' ? 'text-center' : 'text-left'
                      }`}
                    >
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
        <span>
          Hiển thị {filtered.length === 0 ? 0 : (safePage - 1) * pageSize + 1}–
          {Math.min(safePage * pageSize, filtered.length)} / {filtered.length} dòng
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={safePage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded border border-slate-200 p-1 hover:bg-slate-50 disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="px-2 font-medium text-slate-700">
            {safePage} / {totalPages}
          </span>
          <button
            type="button"
            disabled={safePage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="rounded border border-slate-200 p-1 hover:bg-slate-50 disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
