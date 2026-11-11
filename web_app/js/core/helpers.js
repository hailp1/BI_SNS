
                // Central GSBH Office Code <-> Person Name Bidirectional Resolver
        const STATIC_GSBH_MAP = {
            'An Giang': 'Tô Bá Vinh',
            'B. Duong': 'Lê Đặng Bá Nhật',
            'B.Ninh 1': 'Trần Thị Linh Li',
            'B.Ninh 2': 'Nguyễn Phương Ngọc',
            'B.Thuan': 'Nguyễn Xuân Sáu',
            'BRVT': 'Võ Văn Hoàng',
            'Ben Tre': 'Nguyễn Hoài Phương',
            'Bình Định': 'Lê Hoàng Y Ron',
            'C. Thơ': 'Nguyễn Hồng Đạt',
            'C.Mau': 'Lưu Minh Tâm',
            'D.Nang': 'Nguyễn Văn Lúa',
            'Dlak': 'Lê Quốc Cường',
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
            'Hue': 'Trương Phước Cao',
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
            'Đ.Nai 2': 'Nguyễn Doãn Nghĩa Hiển'
        };
        const STATIC_GSBH_REVERSE_MAP = {};
        Object.keys(STATIC_GSBH_MAP).forEach(k => {
            STATIC_GSBH_REVERSE_MAP[STATIC_GSBH_MAP[k]] = k;
        });

        window._officeToGsbhMap = { ...STATIC_GSBH_MAP };
        window._gsbhToOfficeMap = { ...STATIC_GSBH_REVERSE_MAP };

        let _gsbhMapsDone = false;
        function initGsbhMaps() {
            if (_gsbhMapsDone) return;
            _gsbhMapsDone = true;
            if (typeof GT_TREE !== 'undefined' && Array.isArray(GT_TREE)) {
                for (let i = 0, len = GT_TREE.length; i < len; i++) {
                    const t = GT_TREE[i];
                    if (t.office && t.gsbh_name) {
                        const off = t.office.trim();
                        const gsbh = t.gsbh_name.trim();
                        window._officeToGsbhMap[off] = gsbh;
                        window._gsbhToOfficeMap[gsbh] = off;
                    }
                }
            }
            if (typeof SELLIN_M !== 'undefined' && Array.isArray(SELLIN_M)) {
                for (let i = 0, len = SELLIN_M.length; i < len; i++) {
                    const t = SELLIN_M[i];
                    if (t.office && t.gsbh) {
                        const off = t.office.trim();
                        const gsbh = t.gsbh.trim();
                        window._officeToGsbhMap[off] = gsbh;
                        window._gsbhToOfficeMap[gsbh] = off;
                    }
                }
            }
        }

        window.getGsbhPersonName = function(officeCode) {
            if (!officeCode || officeCode === 'ALL') return null;
            if (officeCode in STATIC_GSBH_MAP) return STATIC_GSBH_MAP[officeCode];
            initGsbhMaps();
            const res = (window._officeToGsbhMap && window._officeToGsbhMap[officeCode]) || null;
            STATIC_GSBH_MAP[officeCode] = res;
            return res;
        };

        window.getOfficeByGsbhPersonName = function(personName) {
            if (!personName || personName === 'ALL') return null;
            if (personName in STATIC_GSBH_REVERSE_MAP) return STATIC_GSBH_REVERSE_MAP[personName];
            initGsbhMaps();
            const res = (window._gsbhToOfficeMap && window._gsbhToOfficeMap[personName]) || null;
            STATIC_GSBH_REVERSE_MAP[personName] = res;
            return res;
        };

        const STATIC_OFFICE_GEO_MAP = window.STATIC_OFFICE_GEO_MAP = {
        "H.Noi 1": {
                "vung": "Hà Nội",
                "mien": "MIỀN BẮC",
                "area": "Hà Nội"
        },
        "H.Noi 2": {
                "vung": "Hà Nội",
                "mien": "MIỀN BẮC",
                "area": "Hà Nội"
        },
        "H.Noi 3": {
                "vung": "Hà Nội",
                "mien": "MIỀN BẮC",
                "area": "Hà Nội"
        },
        "H.Noi 4": {
                "vung": "Hà Nội",
                "mien": "MIỀN BẮC",
                "area": "Hà Nội"
        },
        "H.Noi 5": {
                "vung": "Hà Nội",
                "mien": "MIỀN BẮC",
                "area": "Hà Nội"
        },
        "H.Noi 6": {
                "vung": "Hà Nội",
                "mien": "MIỀN BẮC",
                "area": "Hà Nội"
        },
        "P.Tho 1": {
                "vung": "Hà Nội",
                "mien": "MIỀN BẮC",
                "area": "Tây Bắc"
        },
        "P.Tho 2": {
                "vung": "Hà Nội",
                "mien": "MIỀN BẮC",
                "area": "Tây Bắc"
        },
        "Son La": {
                "vung": "Hà Nội",
                "mien": "MIỀN BẮC",
                "area": "Hà Nội"
        },
        "T. Nguyen": {
                "vung": "Hà Nội",
                "mien": "MIỀN BẮC",
                "area": "Tây Bắc"
        },
        "T.Quang": {
                "vung": "Hà Nội",
                "mien": "MIỀN BẮC",
                "area": "Tây Bắc"
        },
        "B.Ninh 1": {
                "vung": "Hải Phòng",
                "mien": "MIỀN BẮC",
                "area": "Hải Phòng"
        },
        "B.Ninh 2": {
                "vung": "Hải Phòng",
                "mien": "MIỀN BẮC",
                "area": "Hải Phòng"
        },
        "H.Phong 1": {
                "vung": "Hải Phòng",
                "mien": "MIỀN BẮC",
                "area": "Hải Phòng"
        },
        "H.Phong 2": {
                "vung": "Hải Phòng",
                "mien": "MIỀN BẮC",
                "area": "Hải Phòng"
        },
        "H.Phong 3": {
                "vung": "Hải Phòng",
                "mien": "MIỀN BẮC",
                "area": "Hải Phòng"
        },
        "H.Yen": {
                "vung": "Hải Phòng",
                "mien": "MIỀN BẮC",
                "area": "DH & BMT"
        },
        "N.An": {
                "vung": "Hải Phòng",
                "mien": "MIỀN BẮC",
                "area": "DH & BMT"
        },
        "N.Binh 1": {
                "vung": "Hải Phòng",
                "mien": "MIỀN BẮC",
                "area": "DH & BMT"
        },
        "N.Binh 2": {
                "vung": "Hải Phòng",
                "mien": "MIỀN BẮC",
                "area": "DH & BMT"
        },
        "Q.Ninh": {
                "vung": "Hải Phòng",
                "mien": "MIỀN BẮC",
                "area": "Hải Phòng"
        },
        "T.Hoa": {
                "vung": "Hải Phòng",
                "mien": "MIỀN BẮC",
                "area": "DH & BMT"
        },
        "Bình Định": {
                "vung": "Đà Nẵng",
                "mien": "MIỀN BẮC",
                "area": "Đà Nẵng 2"
        },
        "D.Nang": {
                "vung": "Đà Nẵng",
                "mien": "MIỀN BẮC",
                "area": "Đà Nẵng 1"
        },
        "Hue": {
                "vung": "Đà Nẵng",
                "mien": "MIỀN BẮC",
                "area": "Đà Nẵng 2"
        },
        "Q.Ngai": {
                "vung": "Đà Nẵng",
                "mien": "MIỀN BẮC",
                "area": "Đà Nẵng 1"
        },
        "An Giang": {
                "vung": "Cần Thơ",
                "mien": "MIỀN NAM",
                "area": "Cần Thơ"
        },
        "Ben Tre": {
                "vung": "Cần Thơ",
                "mien": "MIỀN NAM",
                "area": "Tiền Giang"
        },
        "C. Thơ": {
                "vung": "Cần Thơ",
                "mien": "MIỀN NAM",
                "area": "Cần Thơ"
        },
        "C.Mau": {
                "vung": "Cần Thơ",
                "mien": "MIỀN NAM",
                "area": "Cần Thơ"
        },
        "Long An": {
                "vung": "Cần Thơ",
                "mien": "MIỀN NAM",
                "area": "Tiền Giang"
        },
        "T.Giang": {
                "vung": "Cần Thơ",
                "mien": "MIỀN NAM",
                "area": "Tiền Giang"
        },
        "V.Long": {
                "vung": "Cần Thơ",
                "mien": "MIỀN NAM",
                "area": "Tiền Giang"
        },
        "BRVT": {
                "vung": "HCM",
                "mien": "MIỀN NAM",
                "area": "HCM"
        },
        "HCM 1": {
                "vung": "HCM",
                "mien": "MIỀN NAM",
                "area": "HCM"
        },
        "HCM 2": {
                "vung": "HCM",
                "mien": "MIỀN NAM",
                "area": "HCM"
        },
        "HCM 3": {
                "vung": "HCM",
                "mien": "MIỀN NAM",
                "area": "HCM"
        },
        "HCM 4": {
                "vung": "HCM",
                "mien": "MIỀN NAM",
                "area": "HCM"
        },
        "HCM 5": {
                "vung": "HCM",
                "mien": "MIỀN NAM",
                "area": "HCM"
        },
        "B. Duong": {
                "vung": "Nha Trang",
                "mien": "MIỀN NAM",
                "area": "Đông Nam Bộ"
        },
        "B.Thuan": {
                "vung": "Nha Trang",
                "mien": "MIỀN NAM",
                "area": "Nha Trang"
        },
        "Dlak": {
                "vung": "Nha Trang",
                "mien": "MIỀN NAM",
                "area": "Nha Trang"
        },
        "K.Hoa": {
                "vung": "Nha Trang",
                "mien": "MIỀN NAM",
                "area": "Nha Trang"
        },
        "L.Dong": {
                "vung": "Nha Trang",
                "mien": "MIỀN NAM",
                "area": "Nha Trang"
        },
        "P.Yen": {
                "vung": "Nha Trang",
                "mien": "MIỀN NAM",
                "area": "Nha Trang"
        },
        "TÂY NINH": {
                "vung": "Nha Trang",
                "mien": "MIỀN NAM",
                "area": "Đông Nam Bộ"
        },
        "Đ.Nai 1": {
                "vung": "Nha Trang",
                "mien": "MIỀN NAM",
                "area": "Đông Nam Bộ"
        },
        "Đ.Nai 2": {
                "vung": "Nha Trang",
                "mien": "MIỀN NAM",
                "area": "Đông Nam Bộ"
        }
};

        const STATIC_AREAS = window.STATIC_AREAS = ["Cần Thơ","DH & BMT","Đà Nẵng 1","Đà Nẵng 2","Đông Nam Bộ","Hà Nội","Hải Phòng","HCM","Khác","Nha Trang","Tây Bắc","Tiền Giang"];

        window.getGeoByOffice = function(officeName) {
            if (!officeName || officeName === 'ALL') return null;
            const clean = officeName.trim();
            if (STATIC_OFFICE_GEO_MAP[clean]) return STATIC_OFFICE_GEO_MAP[clean];
            const matchKey = Object.keys(STATIC_OFFICE_GEO_MAP).find(k => k.toLowerCase() === clean.toLowerCase());
            if (matchKey) return STATIC_OFFICE_GEO_MAP[matchKey];
            return null;
        };

        const _gsbhMatchTargetsCache = {};
        window.getGsbhMatchTargets = function(targetGsbh) {
            if (!targetGsbh || targetGsbh === 'ALL') return null;
            if (_gsbhMatchTargetsCache[targetGsbh]) return _gsbhMatchTargetsCache[targetGsbh];
            const targets = new Set([targetGsbh]);
            const person = (typeof window.getGsbhPersonName === 'function') ? window.getGsbhPersonName(targetGsbh) : null;
            if (person) targets.add(person);
            const off = (typeof window.getOfficeByGsbhPersonName === 'function') ? window.getOfficeByGsbhPersonName(targetGsbh) : null;
            if (off) targets.add(off);
            _gsbhMatchTargetsCache[targetGsbh] = targets;
            return targets;
        };

        window.matchGsbhRecord = function(d, targetGsbh) {
            if (!targetGsbh || targetGsbh === 'ALL') return true;
            if (!d) return false;
            const gsbh = d.gsbh || '';
            const gsbhName = d.gsbh_name || '';
            const office = d.office || '';
            if (gsbh === targetGsbh || gsbhName === targetGsbh || office === targetGsbh) return true;
            const targets = window.getGsbhMatchTargets(targetGsbh);
            if (targets) {
                if (gsbh && targets.has(gsbh)) return true;
                if (gsbhName && targets.has(gsbhName)) return true;
                if (office && targets.has(office)) return true;
            }
            return false;
        };

        const _areaMatchTargetsCache = {};
        window.getAreaMatchData = function(targetArea) {
            if (!targetArea || targetArea === 'ALL') return null;
            if (_areaMatchTargetsCache[targetArea]) return _areaMatchTargetsCache[targetArea];
            const matchingOffices = new Set();
            const matchingNpps = new Set();
            const matchingNppNames = new Set();
            const targetLower = String(targetArea).trim().toLowerCase();

            if (typeof STATIC_OFFICE_GEO_MAP !== 'undefined') {
                for (const off in STATIC_OFFICE_GEO_MAP) {
                    const geo = STATIC_OFFICE_GEO_MAP[off];
                    if (geo && geo.area && geo.area.trim().toLowerCase() === targetLower) {
                        matchingOffices.add(off);
                        const person = (typeof window.getGsbhPersonName === 'function') ? window.getGsbhPersonName(off) : null;
                        if (person) matchingOffices.add(person);
                    }
                }
            }

            if (typeof DIM_GEO_HIER !== 'undefined' && Array.isArray(DIM_GEO_HIER)) {
                for (let i = 0; i < DIM_GEO_HIER.length; i++) {
                    const h = DIM_GEO_HIER[i];
                    if (h && h.area && h.area.trim().toLowerCase() === targetLower) {
                        if (h.gsbh) {
                            matchingOffices.add(h.gsbh);
                            const person = (typeof window.getGsbhPersonName === 'function') ? window.getGsbhPersonName(h.gsbh) : null;
                            if (person) matchingOffices.add(person);
                        }
                        if (h.npp_code) matchingNpps.add(String(h.npp_code).trim());
                        if (h.npp_name) matchingNppNames.add(String(h.npp_name).trim());
                    }
                }
            }

            const res = { offices: matchingOffices, npps: matchingNpps, nppNames: matchingNppNames };
            _areaMatchTargetsCache[targetArea] = res;
            return res;
        };

        window.getAreaMatchOffices = function(targetArea) {
            const data = window.getAreaMatchData(targetArea);
            return data ? data.offices : null;
        };

        window.matchAreaRecord = function(d, targetArea) {
            if (!targetArea || targetArea === 'ALL') return true;
            if (!d) return false;
            // 1. Direct match on area property
            if (d.area && (d.area === targetArea || String(d.area).trim().toLowerCase() === String(targetArea).trim().toLowerCase())) return true;
            // 2. Pre-computed office / gsbh / npp_code Set lookup (O(1))
            const info = window.getAreaMatchData(targetArea);
            if (info) {
                if (d.office && info.offices.has(d.office)) return true;
                if (d.gsbh && info.offices.has(d.gsbh)) return true;
                if (d.gsbh_name && info.offices.has(d.gsbh_name)) return true;
                const npp = d.npp_code || d.account_code || d.distributor_code || d.account_npp;
                if (npp) {
                    const strNpp = String(npp).trim();
                    if (info.npps.has(strNpp) || info.nppNames.has(strNpp)) return true;
                }
                const nppNm = d.npp_name || d.account_name;
                if (nppNm && info.nppNames.has(String(nppNm).trim())) return true;
            }
            return false;
        };

        window.getAllowedGtNpps = function() {
            if (typeof DIM_GEO_HIER === 'undefined' || !Array.isArray(DIM_GEO_HIER)) return null;
            const allowed = new Set();
            const targetMien = (typeof state !== 'undefined' && state.geoMien) ? state.geoMien : 'ALL';
            const targetVung = (typeof state !== 'undefined' && state.geoVung) ? state.geoVung : 'ALL';
            const targetArea = (typeof state !== 'undefined' && state.geoArea) ? state.geoArea : 'ALL';
            const targetGsbh = (typeof state !== 'undefined' && state.geoGsbh) ? state.geoGsbh : 'ALL';
            const targetNpp = (typeof state !== 'undefined' && state.geoNpp) ? state.geoNpp : 'ALL';

            for (let i = 0; i < DIM_GEO_HIER.length; i++) {
                const d = DIM_GEO_HIER[i];
                if (targetMien && targetMien !== 'ALL' && d.mien !== targetMien) continue;
                if (targetVung && targetVung !== 'ALL' && d.vung !== targetVung) continue;
                if (targetArea && targetArea !== 'ALL' && !window.matchAreaRecord(d, targetArea)) continue;
                if (targetGsbh && targetGsbh !== 'ALL' && !window.matchGsbhRecord(d, targetGsbh)) continue;
                if (targetNpp && targetNpp !== 'ALL' && d.npp_code !== targetNpp) continue;
                if (d.npp_code) allowed.add(String(d.npp_code));
            }
            return allowed;
        };

                function getGtL3mAso(monthKey, targetStorage, geoMien, geoVung, geoGsbh, geoNpp, geoArea) {
            if (typeof GT_L3M === 'undefined' || !Array.isArray(GT_L3M)) return 0;
            const st = targetStorage || 'ALL';
            const effectiveArea = (geoArea !== undefined) ? geoArea : (typeof state !== 'undefined' ? state.geoArea : 'ALL');

            if (geoNpp && geoNpp !== 'ALL') {
                const item = GT_L3M.find(d => d.month === monthKey && (d.storage || 'ALL') === st && d.npp_code === geoNpp);
                if (item) return Number(item.l3m_aso) || 0;
                let sum = 0;
                GT_L3M.filter(d => d.month === monthKey && (d.storage || 'ALL') === st && d.npp_code === geoNpp).forEach(d => sum += (Number(d.l3m_aso) || 0));
                return sum;
            }

            if (geoGsbh && geoGsbh !== 'ALL') {
                const item = GT_L3M.find(d => d.month === monthKey && (d.storage || 'ALL') === st && d.npp_code === 'ALL' && (d.gsbh === geoGsbh || d.gsbh_name === geoGsbh || ((typeof getGsbhPersonName === 'function') && (d.gsbh === getGsbhPersonName(geoGsbh) || d.gsbh_name === getGsbhPersonName(geoGsbh)))));
                if (item) return Number(item.l3m_aso) || 0;
                let sum = 0;
                GT_L3M.filter(d => d.month === monthKey && (d.storage || 'ALL') === st && d.npp_code !== 'ALL' && (d.gsbh === geoGsbh || d.gsbh_name === geoGsbh || ((typeof getGsbhPersonName === 'function') && (d.gsbh === getGsbhPersonName(geoGsbh) || d.gsbh_name === getGsbhPersonName(geoGsbh))))).forEach(d => sum += (Number(d.l3m_aso) || 0));
                if (sum > 0) return sum;
            }

            if (effectiveArea && effectiveArea !== 'ALL') {
                const areaInfo = window.getAreaMatchData ? window.getAreaMatchData(effectiveArea) : null;
                if (areaInfo && areaInfo.npps.size > 0) {
                    let sum = 0;
                    GT_L3M.forEach(d => {
                        if (d.month === monthKey && (d.storage || 'ALL') === st && d.npp_code !== 'ALL' && areaInfo.npps.has(String(d.npp_code))) {
                            sum += (Number(d.l3m_aso) || 0);
                        }
                    });
                    return sum;
                }
            }

            if (geoVung && geoVung !== 'ALL') {
                const item = GT_L3M.find(d => d.month === monthKey && (d.storage || 'ALL') === st && d.npp_code === 'ALL' && d.gsbh === 'ALL' && d.vung === geoVung);
                if (item) return Number(item.l3m_aso) || 0;
            }

            if (geoMien && geoMien !== 'ALL') {
                const item = GT_L3M.find(d => d.month === monthKey && (d.storage || 'ALL') === st && d.npp_code === 'ALL' && d.vung === 'ALL' && d.mien === geoMien);
                if (item) return Number(item.l3m_aso) || 0;
            }

            const nat = GT_L3M.find(d => d.month === monthKey && (d.storage || 'ALL') === st && d.npp_code === 'ALL' && d.mien === 'ALL');
            if (nat) return Number(nat.l3m_aso) || 0;

            let sum = 0;
            GT_L3M.filter(d => {
                if (d.month !== monthKey) return false;
                if ((d.storage || 'ALL') !== st) return false;
                if (geoMien && geoMien !== 'ALL' && d.mien !== geoMien) return false;
                if (geoVung && geoVung !== 'ALL' && d.vung !== geoVung) return false;
                if (effectiveArea && effectiveArea !== 'ALL' && !window.matchAreaRecord(d, effectiveArea)) return false;
                if (geoGsbh && geoGsbh !== 'ALL' && (d.gsbh !== geoGsbh && d.gsbh_name !== geoGsbh && (!((typeof getGsbhPersonName === 'function') && (d.gsbh === getGsbhPersonName(geoGsbh) || d.gsbh_name === getGsbhPersonName(geoGsbh)))))) return false;
                if (geoNpp && geoNpp !== 'ALL' && d.npp_code !== geoNpp) return false;
                return d.npp_code !== 'ALL';
            }).forEach(d => sum += (Number(d.l3m_aso) || 0));
            return sum;
        }
        window.getGtL3mAso = getGtL3mAso;

        // Helper hàm lấy ASO Active 1 Tháng chính xác theo cấp phân cấp địa lý
        function getGtAsoActive(monthKey, targetStorage, geoMien, geoVung, geoGsbh, geoNpp, geoArea) {
            if (typeof GT_ASO_M === 'undefined' || !Array.isArray(GT_ASO_M)) return 0;
            const st = targetStorage || 'ALL';
            const effectiveArea = (geoArea !== undefined) ? geoArea : (typeof state !== 'undefined' ? state.geoArea : 'ALL');

            if (geoNpp && geoNpp !== 'ALL') {
                const item = GT_ASO_M.find(d => d.month === monthKey && (d.storage || 'ALL') === st && d.npp_code === geoNpp);
                if (item) return Number(item.aso_count) || 0;
                let sum = 0;
                GT_ASO_M.filter(d => d.month === monthKey && (d.storage || 'ALL') === st && d.npp_code === geoNpp).forEach(d => sum += (Number(d.aso_count) || 0));
                return sum;
            }

            if (geoGsbh && geoGsbh !== 'ALL') {
                const item = GT_ASO_M.find(d => d.month === monthKey && (d.storage || 'ALL') === st && d.npp_code === 'ALL' && (d.gsbh === geoGsbh || d.gsbh_name === geoGsbh || ((typeof getGsbhPersonName === 'function') && (d.gsbh === getGsbhPersonName(geoGsbh) || d.gsbh_name === getGsbhPersonName(geoGsbh)))));
                if (item) return Number(item.aso_count) || 0;
                let sum = 0;
                GT_ASO_M.filter(d => d.month === monthKey && (d.storage || 'ALL') === st && d.npp_code !== 'ALL' && (d.gsbh === geoGsbh || d.gsbh_name === geoGsbh || ((typeof getGsbhPersonName === 'function') && (d.gsbh === getGsbhPersonName(geoGsbh) || d.gsbh_name === getGsbhPersonName(geoGsbh))))).forEach(d => sum += (Number(d.aso_count) || 0));
                if (sum > 0) return sum;
            }

            if (effectiveArea && effectiveArea !== 'ALL') {
                const areaInfo = window.getAreaMatchData ? window.getAreaMatchData(effectiveArea) : null;
                if (areaInfo && areaInfo.npps.size > 0) {
                    let sum = 0;
                    GT_ASO_M.forEach(d => {
                        if (d.month === monthKey && (d.storage || 'ALL') === st && d.npp_code !== 'ALL' && areaInfo.npps.has(String(d.npp_code))) {
                            sum += (Number(d.aso_count) || 0);
                        }
                    });
                    return sum;
                }
            }

            if (geoVung && geoVung !== 'ALL') {
                const item = GT_ASO_M.find(d => d.month === monthKey && (d.storage || 'ALL') === st && d.npp_code === 'ALL' && d.gsbh === 'ALL' && d.vung === geoVung);
                if (item) return Number(item.aso_count) || 0;
            }

            if (geoMien && geoMien !== 'ALL') {
                const item = GT_ASO_M.find(d => d.month === monthKey && (d.storage || 'ALL') === st && d.npp_code === 'ALL' && d.vung === 'ALL' && d.mien === geoMien);
                if (item) return Number(item.aso_count) || 0;
            }

            const nat = GT_ASO_M.find(d => d.month === monthKey && (d.storage || 'ALL') === st && d.npp_code === 'ALL' && d.mien === 'ALL');
            if (nat) return Number(nat.aso_count) || 0;

            let sum = 0;
            GT_ASO_M.filter(d => {
                if (d.month !== monthKey) return false;
                if ((d.storage || 'ALL') !== st) return false;
                if (geoMien && geoMien !== 'ALL' && d.mien !== geoMien) return false;
                if (geoVung && geoVung !== 'ALL' && d.vung !== geoVung) return false;
                if (effectiveArea && effectiveArea !== 'ALL' && !window.matchAreaRecord(d, effectiveArea)) return false;
                if (geoGsbh && geoGsbh !== 'ALL' && (d.gsbh !== geoGsbh && d.gsbh_name !== geoGsbh && (!((typeof getGsbhPersonName === 'function') && (d.gsbh === getGsbhPersonName(geoGsbh) || d.gsbh_name === getGsbhPersonName(geoGsbh)))))) return false;
                if (geoNpp && geoNpp !== 'ALL' && d.npp_code !== geoNpp) return false;
                return d.npp_code !== 'ALL';
            }).forEach(d => sum += (Number(d.aso_count) || 0));
            return sum;
        }
        window.getGtAsoActive = getGtAsoActive;

var BASE_APP_USERS = window.BASE_APP_USERS || [];



        const CLOUD_CONFIG = { enabled: false, webhook_url: "", sheet_name: "", description: "" };



        let currentUser = null;







        function getDefaultCurrentMonth() {
            try {
                if (typeof SELLIN_M !== 'undefined' && Array.isArray(SELLIN_M) && SELLIN_M.length > 0) {
                    const yr = (typeof state !== 'undefined' && state.year) ? state.year : '2026';
                    const availableMonths = [...new Set(SELLIN_M
                        .filter(d => (d.year === yr || String(d.year) === yr) && d.month_num && (Number(d.sellin_val) > 0 || Number(d.val_sellin) > 0 || Number(d.val_ty_mtd) > 0))
                        .map(d => String(d.month_num).padStart(2, '0')))].sort();
                    if (availableMonths.length > 0) {
                        return availableMonths[availableMonths.length - 1];
                    }
                }
            } catch (e) {
                console.warn("Error getting default month:", e);
            }
            return '10'; // Enterprise Fallback: latest closed period in dataset (October 2026)
        }
