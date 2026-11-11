import ExcelJS from 'exceljs';
import { Download } from 'lucide-react';
import { useState } from 'react';

interface ExportColumn<T> {
  header: string;
  key: keyof T | ((row: T) => string | number);
  width?: number;
}

interface ExportExcelButtonProps<T> {
  filename: string;
  sheetName?: string;
  rows: T[];
  columns: ExportColumn<T>[];
  label?: string;
}

export function ExportExcelButton<T>({
  filename,
  sheetName = 'Report',
  rows,
  columns,
  label = 'Xuất Excel',
}: ExportExcelButtonProps<T>) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (rows.length === 0 || exporting) return;
    setExporting(true);
    try {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet(sheetName);
      sheet.columns = columns.map((c, idx) => ({
        header: c.header,
        key: `col_${idx}`,
        width: c.width || 20,
      }));

      sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      sheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFDC2626' },
      };

      for (const item of rows) {
        const record: Record<string, string | number> = {};
        columns.forEach((c, idx) => {
          record[`col_${idx}`] = typeof c.key === 'function' ? c.key(item) : ((item[c.key] as string | number) ?? '');
        });
        sheet.addRow(record);
      }

      const buf = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buf], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={rows.length === 0 || exporting}
      className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
    >
      <Download className="h-3.5 w-3.5" />
      {exporting ? 'Đang xuất...' : label}
    </button>
  );
}
