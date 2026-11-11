import type { AuthUser } from '../types/auth';

export const STATIC_GSBH_MAP: Record<string, string> = {
  'An Giang': 'Tô Bá Vinh',
  'B. Duong': 'Lê Đặng Bá Nhật',
  'B.Ninh 1': 'Trần Thị Linh Li',
  'B.Ninh 2': 'Nguyễn Phương Ngọc',
  'B.Thuan': 'Nguyễn Xuân Sáu',
  BRVT: 'Võ Văn Hoàng',
  'Ben Tre': 'Nguyễn Hoài Phương',
  'Bình Định': 'Lê Hoàng Y Ron',
  'C. Thơ': 'Nguyễn Hồng Đạt',
  'C.Mau': 'Lưu Minh Tâm',
  'D.Nang': 'Nguyễn Văn Lúa',
  Dlak: 'Lê Quốc Cường',
  'GSBH Nguyễn Văn Lúa': 'GSBH Đà Nẵng 1 (Nguyễn Văn Lúa)',
  'H.Noi 1': 'Nguyễn Quang Sơn',
  'H.Noi 2': 'Đàm Thị Thu Hằng',
  'H.Noi 3': 'Nguyễn Đức Triệu',
  'H.Noi 4': 'Nguyễn Khắc Dũng',
  'H.Noi 5': 'Vũ Thị Huệ',
  'H.Noi 6': 'Nguyễn Thị Phương Anh',
  'H.Phong 1': 'Bùi Thị Luyến',
  'H.Phong 2': 'Nguyễn Thị Thùy Ninh',
  'H.Phong 3': 'Phạm Phái',
  'H.Yen': 'Nguyễn Văn Ngọc',
  'HCM 1': 'Hồ Ngọc Hải',
  'HCM 2': 'Nguyễn Huy Vũ',
  'HCM 3': 'Hà Minh Long',
  'HCM 4': 'Huỳnh Hưng Long',
  'HCM 5': 'Nguyễn Khắc Lợi',
  Hue: 'Trương Phước Cao',
  'K.Hoa': 'Lê Quang Tuyên',
  'L.Dong': 'Trần Hoàng Chí',
  'Long An': 'Trần Thị Diêng',
  'N.An': 'Lê Văn Bảo',
  'N.Binh 1': 'Vũ Văn Khắc',
  'N.Binh 2': 'Phạm Văn Sơn',
  'P.Tho 1': 'Bùi Hữu Sơn',
  'P.Tho 2': 'Đặng Văn Cương',
  'P.Yen': 'Trần Văn Hội',
  'Q.Ngai': 'Đặng Minh Thịnh',
  'Q.Ninh': 'Nguyễn Văn Điều',
  'Son La': 'NEW_SUP_SONLA1',
  'T. Nguyen': 'Vũ Thị Hoài',
  'T.Giang': 'Lê Thành Nam',
  'T.Hoa': 'Phạm Văn Thắng',
  'T.Quang': 'Lê Thanh Trà',
  'TÂY NINH': 'Nguyễn Tôn Hoàn',
  'V.Long': 'Phạm Thành Nhân',
  'Đ.Nai 1': 'Nguyễn Văn Hoàng',
  'Đ.Nai 2': 'Nguyễn Doãn Nghĩa Hiển',
};

export function normStr(s: unknown): string {
  if (!s) return '';
  return String(s)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

export function isMatch(s1: unknown, s2: unknown): boolean {
  if (!s1 || !s2) return false;
  const n1 = normStr(s1);
  const n2 = normStr(s2);
  if (!n1 || !n2) return false;
  return n1 === n2 || n1.includes(n2) || n2.includes(n1);
}

const SKIP_RLS_PAYLOADS = new Set([
  'PROD_TREE',
  'DIM_PROD_HIER',
  'DIM_COMM_HIER',
  'CHAN_TREE',
  'DIM_GEO_HIER',
]);

export function applyEnterpriseRls<T>(
  propName: string,
  rawData: T[],
  user: AuthUser | null,
  dimGeoHier: Record<string, unknown>[] = [],
): T[] {
  if (!user || !Array.isArray(rawData) || rawData.length === 0) return rawData;
  if (SKIP_RLS_PAYLOADS.has(propName)) return rawData;

  const role = (user.role || '').toLowerCase();
  const scopeLvl = (user.scopeLevel || 'all').toLowerCase();
  const scopeVal = (user.scopeValue || 'all').trim();
  const userChan = (user.channel || 'all').toUpperCase().trim();

  if (
    role === 'admin' ||
    role === 'director' ||
    role === 'bod' ||
    (scopeLvl === 'all' && scopeVal.toLowerCase() === 'all' && userChan === 'ALL')
  ) {
    return rawData;
  }

  const targetMien = scopeLvl === 'mien' || scopeLvl === 'region' ? scopeVal : null;
  const targetVung = scopeLvl === 'vung' ? scopeVal : null;
  const targetArea = scopeLvl === 'area' ? scopeVal : null;
  const targetGsbh = scopeLvl === 'office' || scopeLvl === 'gsbh' || role === 'gsbh' ? scopeVal : null;
  const targetNpp = scopeLvl === 'npp' ? scopeVal : null;

  const allowedNpps = new Set<string>();
  if ((targetVung || targetMien || targetArea || targetGsbh || targetNpp) && Array.isArray(dimGeoHier)) {
    for (const g of dimGeoHier) {
      let ok = true;
      if (targetVung && !isMatch(g.vung, targetVung)) ok = false;
      if (targetMien && !isMatch(g.mien, targetMien)) ok = false;
      if (targetArea && !isMatch(g.area, targetArea)) ok = false;
      if (targetGsbh && !isMatch(g.gsbh, targetGsbh)) ok = false;
      if (targetNpp && !isMatch(String(g.npp_code || ''), targetNpp) && !isMatch(g.npp_name, targetNpp)) ok = false;
      if (ok && g.npp_code) allowedNpps.add(String(g.npp_code).trim());
    }
  }

  const firstRow = rawData[0];
  if (Array.isArray(firstRow)) {
    if (propName === 'GT_CUST_ROUTES') {
      return rawData.filter((row) => {
        const r = row as unknown[];
        if (allowedNpps.size > 0) return allowedNpps.has(String(r[7] ?? '').trim());
        if (targetVung && !isMatch(r[9], targetVung)) return false;
        if (targetMien && !isMatch(r[10], targetMien)) return false;
        return true;
      });
    }
    if (propName === 'GT_VISIT_MTD' || propName === 'GT_VISIT_DAILY') {
      const nppIdx = propName === 'GT_VISIT_MTD' ? 1 : 2;
      return rawData.filter((row) => {
        const r = row as unknown[];
        if (allowedNpps.size > 0) return allowedNpps.has(String(r[nppIdx] ?? '').trim());
        if (targetVung && !isMatch(r[11], targetVung)) return false;
        if (targetMien && !isMatch(r[10], targetMien)) return false;
        return true;
      });
    }
    return rawData;
  }

  return rawData.filter((item) => {
    const r = item as Record<string, unknown>;
    if (propName === 'GT_FREEZER_DATA' || propName === 'GT_STANDEE_DATA') {
      if (userChan !== 'ALL' && userChan !== 'GT') return false;
    } else if (userChan !== 'ALL' && r.channel) {
      const ch = String(r.channel).toUpperCase();
      if (ch !== userChan && ch !== 'ALL') return false;
    }

    if (!targetVung && !targetMien && !targetArea && !targetGsbh && !targetNpp) {
      return true;
    }

    const nCode = String(r.npp_code || r.account_npp || r.distributor_code || r.account_code || '').trim();

    if (targetGsbh) {
      const g = String(r.office || r.gsbh || r.gsbh_name || '');
      const personName = STATIC_GSBH_MAP[targetGsbh] || null;
      if (g && (isMatch(g, targetGsbh) || (personName && isMatch(g, personName)))) return true;
      return Boolean(allowedNpps.size > 0 && nCode && allowedNpps.has(nCode));
    }

    if (targetArea) {
      if (r.area && isMatch(r.area, targetArea)) return true;
      return Boolean(allowedNpps.size > 0 && nCode && allowedNpps.has(nCode));
    }

    if (targetNpp) {
      const nName = r.npp_name || r.account_name || '';
      return isMatch(nCode, targetNpp) || isMatch(nName, targetNpp);
    }

    if (targetVung) {
      const v = r.vung || r.cluster || '';
      if (v && isMatch(v, targetVung)) return true;
      if (r.sub_channel && isMatch(r.sub_channel, targetVung)) return true;
      return Boolean(allowedNpps.size > 0 && nCode && allowedNpps.has(nCode));
    }

    if (targetMien) {
      if (r.mien && isMatch(r.mien, targetMien)) return true;
      return Boolean(allowedNpps.size > 0 && nCode && allowedNpps.has(nCode));
    }

    const hasAnyGeoCol =
      'vung' in r ||
      'cluster' in r ||
      'mien' in r ||
      'gsbh' in r ||
      'gsbh_name' in r ||
      'npp_code' in r ||
      'account_npp' in r ||
      'distributor_code' in r;
    return !hasAnyGeoCol;
  });
}
