export function formatBillion(val: number | undefined | null): string {
  const num = Number(val) || 0;
  return `${num.toFixed(2)} B`;
}

export function formatCurrencyVnd(val: number | undefined | null): string {
  const num = Number(val) || 0;
  if (Math.abs(num) >= 1e9) return `${(num / 1e9).toFixed(2)} tỷ`;
  if (Math.abs(num) >= 1e6) return `${(num / 1e6).toFixed(1)} tr`;
  return num.toLocaleString('vi-VN');
}

export function formatPercent(val: number | undefined | null, showPlus = false): string {
  const num = Number(val) || 0;
  const sign = showPlus && num > 0 ? '+' : '';
  return `${sign}${num.toFixed(1)}%`;
}

export function getAchievementBadgeColor(rate: number): string {
  if (rate >= 100) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
  if (rate >= 85) return 'text-amber-700 bg-amber-50 border-amber-200';
  return 'text-red-700 bg-red-50 border-red-200';
}
