/**
 * CJ FOODS VIETNAM - GT CTKM (PROMOTION TRACKING) NATIVE MODULE
 * Enterprise Zero-Trust & Row-Level Security (RLS) Integrated
 */
window.GtCtkmModule = (function() {
    let isInitialized = false;
    let isLoadingData = false;

    function loadScript(src) {
        return new Promise((resolve, reject) => {
            if (document.querySelector(`script[src="${src}"]`)) return resolve();
            const s = document.createElement('script');
            s.src = src;
            s.onload = () => resolve();
            s.onerror = (e) => reject(e);
            document.head.appendChild(s);
        });
    }

    

        // --- 1. DECOMPRESSION & INITIALIZATION ---

        let RAW_DATA = null;

        let METADATA = {};

        let TIEN_DATA = [];

        let HANG_DATA = [];

        let FILTERED_TIEN = [];

        let FILTERED_HANG = [];



        // Filter state (Cấu trúc phân cấp chuẩn Database: Miền -> Vùng -> Office -> NPP)

        let currentRole = 'director';

        let filterThang = 'ALL';

        let filterMien = 'ALL';

        let filterVung = 'ALL';

        let filterOffice = 'ALL';

        let filterNPP = 'ALL';

        let filterKhuVuc = 'ALL';

        let filterGSBH = 'ALL';

        let filterLyDo = 'ALL';

        let filterSearch = '';

        let quickTienDoc = 'ALL';

        let quickHangReason = 'ALL';



        // Pagination

        let pageTien = 1;

        const pageSizeTien = 20;

        let pageHang = 1;

        const pageSizeHang = 20;



        // Sorting

        let sortTienCol = 'amount';

        let sortTienDir = 'desc';

        let sortHangCol = 'ea';

        let sortHangDir = 'desc';



        // Selected NPP in Dossier

        let selectedNppCode = null;



        // Charts

        let chartReasonsInstance = null;

        let chartMonthlyInstance = null;

        let chartRegionsInstance = null;

        let chartStorageInstance = null;

        let chartReasonMetric = 'EA'; // 'EA': theo Số Lượng (EA), 'TIEN': theo Số Tiền (VNĐ)



        function setChartReasonMetric(metric) {

            chartReasonMetric = metric;

            const btnEA = document.getElementById("btnReasonMetric-EA");

            const btnTIEN = document.getElementById("btnReasonMetric-TIEN");

            if (btnEA && btnTIEN) {

                if (metric === 'EA') {

                    btnEA.className = "px-2.5 py-1 rounded text-xs font-bold bg-white text-blue-700 shadow-2xs transition";

                    btnTIEN.className = "px-2.5 py-1 rounded text-xs font-medium text-slate-600 hover:text-slate-900 transition";

                } else {

                    btnTIEN.className = "px-2.5 py-1 rounded text-xs font-bold bg-white text-red-700 shadow-2xs transition";

                    btnEA.className = "px-2.5 py-1 rounded text-xs font-medium text-slate-600 hover:text-slate-900 transition";

                }

            }

            updateCharts();

        }



        function initApp() {

            try {

                if (!COMPRESSED_DATA || COMPRESSED_DATA.startsWith("__")) {

                    console.error("Payload chưa được biên dịch.");

                    return;

                }



                // Decompress via Pako

                const binStr = atob(COMPRESSED_DATA);

                const bytes = new Uint8Array(binStr.length);

                for (let i = 0; i < binStr.length; i++) {

                    bytes[i] = binStr.charCodeAt(i);

                }

                const decompressed = pako.inflate(bytes);

                const jsonStr = (typeof TextDecoder !== 'undefined')

                    ? new TextDecoder('utf-8').decode(decompressed)

                    : decodeURIComponent(escape(String.fromCharCode.apply(null, decompressed)));



                RAW_DATA = JSON.parse(jsonStr);

                METADATA = RAW_DATA.metadata || {};

                TIEN_DATA = RAW_DATA.tien_data || [];

                HANG_DATA = RAW_DATA.hang_data || [];



                console.log(`Đã nạp: ${TIEN_DATA.length} khoản tiền, ${HANG_DATA.length} mục hàng.`);



                populateFilterControls();



                // Đồng bộ trạng thái nút cột tháng trên mobile

                if (!treeMonthColumnsExpanded) {

                    const activeMonths = getTreeActiveMonths();

                    const countStr = activeMonths.length > 0 ? `${activeMonths.length} ` : '';

                    const btnText = document.getElementById("btnToggleMonthColsText");

                    const btnIcon = document.getElementById("btnToggleMonthColsIcon");

                    if (btnText && btnIcon) {

                        btnText.innerText = `Bung ${countStr}Cột Tháng`;

                        btnIcon.innerText = "⊞";

                    }

                }



                applyFilters();

                initCharts();

            } catch (err) {

                console.error("Lỗi giải nén dữ liệu:", err);

                alert("Lỗi nạp dữ liệu: " + err.message);

            }

        }



        // --- 2. POPULATE FILTER CONTROLS ---

        function populateFilterControls() {

            const meta = RAW_DATA.metadata || {};



            // Tháng (Dynamic timeline from metadata)

            const selThang = document.getElementById("selThang");

            const mList = meta.months || [];

            if (mList.length > 0) {

                const minM = mList[0].month;

                const maxM = mList[mList.length - 1].month;

                const maxYear = mList[mList.length - 1].year;

                const isMultiYear = meta.is_multi_year || (new Set(mList.map(x => x.year)).size > 1);

                const rangeLabel = isMultiYear 

                    ? `Tất cả các kỳ (T${minM}/${mList[0].year} - T${maxM}/${maxYear})`

                    : `Tất cả các kỳ (T${minM} - T${maxM}/${maxYear})`;

                selThang.innerHTML = `<option value="ALL">${rangeLabel}</option>`;

                mList.forEach(m => {

                    selThang.innerHTML += `<option value="${m.key || m.month}">${m.label || ('Tháng ' + m.month)} (${m.year})</option>`;

                });

            } else {

                selThang.innerHTML = '<option value="ALL">Tất cả các kỳ</option>';

            }



            // Khởi tạo các cấp bộ lọc địa lý chuẩn Database

            populateVungDropdown();

            populateOfficeDropdown();

            populateNppDropdown();

        }



        // --- CASCADING GEO FILTER ENGINE (CHUẨN DATABASE: MIỀN -> VÙNG -> OFFICE -> NPP) ---

        function populateVungDropdown() {

            const selVung = document.getElementById("selVung");

            if (!selVung) return;

            const currentMien = filterMien;

            const vungSet = new Set();

            const hier = (RAW_DATA.metadata && RAW_DATA.metadata.geo_hier) || [];

            hier.forEach(h => {

                if (currentMien === 'ALL' || h.mien === currentMien) {

                    if (h.vung) vungSet.add(h.vung);

                }

            });

            const sorted = Array.from(vungSet).sort((a,b) => a.localeCompare(b, 'vi'));

            const allLabel = currentMien !== 'ALL' ? `Tất cả Vùng (${currentMien === 'North' ? 'Bắc' : 'Nam'})` : 'Tất cả Vùng';

            selVung.innerHTML = `<option value="ALL">${allLabel}</option>` + sorted.map(v => `<option value="${v}">${v}</option>`).join('');

            if (!vungSet.has(filterVung)) filterVung = 'ALL';

            selVung.value = filterVung;

        }



        function populateOfficeDropdown() {

            const selOffice = document.getElementById("selOffice");

            if (!selOffice) return;

            const currentMien = filterMien;

            const currentVung = filterVung;

            const officeSet = new Set();

            const hier = (RAW_DATA.metadata && RAW_DATA.metadata.geo_hier) || [];

            hier.forEach(h => {

                if (currentMien !== 'ALL' && h.mien !== currentMien) return;

                if (currentVung !== 'ALL' && h.vung !== currentVung) return;

                if (h.office) officeSet.add(h.office);

            });

            const sorted = Array.from(officeSet).sort((a,b) => a.localeCompare(b, 'vi'));

            const allLabel = currentVung !== 'ALL' ? `Tất cả Office (${currentVung})` : 'Tất cả Office';

            selOffice.innerHTML = `<option value="ALL">${allLabel}</option>` + sorted.map(o => `<option value="${o}">${o}</option>`).join('');

            if (!officeSet.has(filterOffice)) filterOffice = 'ALL';

            selOffice.value = filterOffice;

        }



        function populateNppDropdown() {

            const selNPP = document.getElementById("selNPP");

            if (!selNPP) return;

            const currentMien = filterMien;

            const currentVung = filterVung;

            const currentOffice = filterOffice;

            const nppMap = new Map();

            const hier = (RAW_DATA.metadata && RAW_DATA.metadata.geo_hier) || [];

            hier.forEach(h => {

                if (currentMien !== 'ALL' && h.mien !== currentMien) return;

                if (currentVung !== 'ALL' && h.vung !== currentVung) return;

                if (currentOffice !== 'ALL' && h.office !== currentOffice) return;

                if (h.code_npp) {

                    nppMap.set(h.code_npp, h.ten_npp ? `${h.code_npp} - ${h.ten_npp}` : h.code_npp);

                }

            });

            const sorted = Array.from(nppMap.entries()).sort((a,b) => a[1].localeCompare(b[1], 'vi'));

            const countLabel = sorted.length > 0 ? ` (${sorted.length})` : '';

            selNPP.innerHTML = `<option value="ALL">Tất cả NPP${countLabel}</option>` + sorted.map(([k, v]) => `<option value="${k}">${v}</option>`).join('');

            if (!nppMap.has(filterNPP)) filterNPP = 'ALL';

            selNPP.value = filterNPP;

        }



        function onMienChange() {

            filterMien = document.getElementById("selMien").value;

            filterVung = 'ALL';

            filterOffice = 'ALL';

            filterNPP = 'ALL';

            populateVungDropdown();

            populateOfficeDropdown();

            populateNppDropdown();

            applyFilters();

        }



        function onVungChange() {

            filterVung = document.getElementById("selVung").value;

            filterOffice = 'ALL';

            filterNPP = 'ALL';

            populateOfficeDropdown();

            populateNppDropdown();

            applyFilters();

        }



        function onOfficeChange() {

            filterOffice = document.getElementById("selOffice").value;

            filterNPP = 'ALL';

            populateNppDropdown();

            applyFilters();

        }



        // --- 3. FILTER LOGIC (CHUẨN DATABASE GEO 4 CẤP: MIỀN -> VÙNG -> OFFICE -> NPP) ---

        function applyFilters() {

            filterThang = document.getElementById("selThang") ? document.getElementById("selThang").value : 'ALL';

            filterMien = document.getElementById("selMien") ? document.getElementById("selMien").value : 'ALL';

            filterVung = document.getElementById("selVung") ? document.getElementById("selVung").value : 'ALL';

            filterOffice = document.getElementById("selOffice") ? document.getElementById("selOffice").value : 'ALL';

            filterNPP = document.getElementById("selNPP") ? document.getElementById("selNPP").value : 'ALL';

            filterLyDo = document.getElementById("selLyDo") ? document.getElementById("selLyDo").value : 'ALL';

            filterSearch = (document.getElementById("txtSearch") ? document.getElementById("txtSearch").value : "").trim().toLowerCase();



            // Filter Tiền

            FILTERED_TIEN = TIEN_DATA.filter(item => {

                // Role Filter

                if (currentRole === 'rsm_north' && item.mien !== 'North') return false;

                if (currentRole === 'rsm_south' && item.mien !== 'South') return false;



                if (filterThang !== 'ALL') {

                    const itemKey = `${item.nam}_${item.thang}`;

                    if (filterThang != item.thang && filterThang !== itemKey) return false;

                }

                if (filterMien !== 'ALL' && item.mien !== filterMien) return false;

                if (filterVung !== 'ALL' && item.vung !== filterVung && item.khu_vuc !== filterVung) return false;

                if (filterOffice !== 'ALL' && item.office !== filterOffice) return false;

                if (filterNPP !== 'ALL' && item.code_npp !== filterNPP) return false;

                if (filterLyDo !== 'ALL' && item.reason !== filterLyDo) return false;



                if (filterSearch) {

                    const match = (item.ten_npp && item.ten_npp.toLowerCase().includes(filterSearch)) ||

                                  (item.code_npp && item.code_npp.toLowerCase().includes(filterSearch)) ||

                                  (item.ten_ct && item.ten_ct.toLowerCase().includes(filterSearch)) ||

                                  (item.office && item.office.toLowerCase().includes(filterSearch)) ||

                                  (item.vung && item.vung.toLowerCase().includes(filterSearch)) ||

                                  (item.ten_gsbh && item.ten_gsbh.toLowerCase().includes(filterSearch));

                    if (!match) return false;

                }

                return true;

            });



            // Filter Hàng

            FILTERED_HANG = HANG_DATA.filter(item => {

                if (currentRole === 'rsm_north' && item.mien !== 'North') return false;

                if (currentRole === 'rsm_south' && item.mien !== 'South') return false;



                if (filterThang !== 'ALL') {

                    const itemKey = `${item.nam}_${item.thang}`;

                    if (filterThang != item.thang && filterThang !== itemKey) return false;

                }

                if (filterMien !== 'ALL' && item.mien !== filterMien) return false;

                if (filterVung !== 'ALL' && item.vung !== filterVung && item.khu_vuc !== filterVung) return false;

                if (filterOffice !== 'ALL' && item.office !== filterOffice) return false;

                if (filterNPP !== 'ALL' && item.code_npp !== filterNPP) return false;

                if (filterLyDo !== 'ALL' && item.reason !== filterLyDo) return false;



                if (filterSearch) {

                    const match = (item.ten_npp && item.ten_npp.toLowerCase().includes(filterSearch)) ||

                                  (item.code_npp && item.code_npp.toLowerCase().includes(filterSearch)) ||

                                  (item.ten_ct && item.ten_ct.toLowerCase().includes(filterSearch)) ||

                                  (item.office && item.office.toLowerCase().includes(filterSearch)) ||

                                  (item.vung && item.vung.toLowerCase().includes(filterSearch)) ||

                                  (item.ten_sp && item.ten_sp.toLowerCase().includes(filterSearch)) ||

                                  (item.ma_sp && item.ma_sp.toLowerCase().includes(filterSearch)) ||

                                  (item.ten_gsbh && item.ten_gsbh.toLowerCase().includes(filterSearch));

                    if (!match) return false;

                }

                return true;

            });





            // Update UI

            updateHeaderBadges();

            updateTab1KPIs();

            updateQuickPillCounts();

            renderTienTable();

            renderHangTable();

            renderNppList();

            renderGsbhTable();

            updateCharts();

            buildAndRenderTree();

        }



        function resetFilters() {

            if (document.getElementById("selThang")) document.getElementById("selThang").value = "ALL";

            if (document.getElementById("selMien")) document.getElementById("selMien").value = "ALL";

            filterMien = "ALL";

            filterVung = "ALL";

            filterOffice = "ALL";

            filterNPP = "ALL";

            populateVungDropdown();

            populateOfficeDropdown();

            populateNppDropdown();

            if (document.getElementById("selLyDo")) document.getElementById("selLyDo").value = "ALL";

            if (document.getElementById("txtSearch")) document.getElementById("txtSearch").value = "";

            setTienDocFilter('ALL');

            setHangReasonFilter('ALL');

            applyFilters();

        }



        // --- 4. FORMATTERS (COMPACT: BIL, MIL, K & EXACT TOOLTIPS) ---

        function formatExactMoney(val) {

            val = Number(val) || 0;

            return Math.round(val).toLocaleString('vi-VN') + " ₫";

        }



        function formatExactNumber(val) {

            val = Number(val) || 0;

            return Math.round(val).toLocaleString('vi-VN');

        }



        function formatMoney(val) {

            val = Number(val) || 0;

            const abs = Math.abs(val);

            if (abs === 0) return "0 ₫";

            if (abs >= 1e9) {

                let s = (val / 1e9).toFixed(2);

                if (s.endsWith('.00')) s = s.slice(0, -3);

                else if (s.endsWith('0')) s = s.slice(0, -1);

                return s + " Bil";

            } else if (abs >= 1e6) {

                let s = (val / 1e6).toFixed(2);

                if (s.endsWith('.00')) s = s.slice(0, -3);

                else if (s.endsWith('0')) s = s.slice(0, -1);

                return s + " Mil";

            } else if (abs >= 1e3) {

                let s = (val / 1e3).toFixed(1);

                if (s.endsWith('.0')) s = s.slice(0, -2);

                return s + " K";

            } else {

                return Math.round(val).toLocaleString('vi-VN') + " ₫";

            }

        }



        function formatNumber(val) {

            val = Number(val) || 0;

            const abs = Math.abs(val);

            if (abs === 0) return "0";

            if (abs >= 1e6) {

                let s = (val / 1e6).toFixed(2);

                if (s.endsWith('.00')) s = s.slice(0, -3);

                else if (s.endsWith('0')) s = s.slice(0, -1);

                return s + " Mil";

            } else if (abs >= 1e3) {

                let s = (val / 1e3).toFixed(1);

                if (s.endsWith('.0')) s = s.slice(0, -2);

                return s + " K";

            } else {

                return Math.round(val).toLocaleString('vi-VN');

            }

        }



        // --- 5. UPDATE HEADER BADGES & KPIS ---

        function updateHeaderBadges() {

            const sumTien = FILTERED_TIEN.reduce((acc, x) => acc + (x.amount || 0), 0);

            const sumHang = FILTERED_HANG.reduce((acc, x) => acc + (x.ea || 0), 0);

            const sumHangTien = FILTERED_HANG.reduce((acc, x) => acc + (x.amount || 0), 0);

            

            const nppSet = new Set();

            FILTERED_TIEN.forEach(x => { if (x.code_npp) nppSet.add(x.code_npp); });

            FILTERED_HANG.forEach(x => { if (x.code_npp) nppSet.add(x.code_npp); });



            const elBadgeTien = document.getElementById("badgeFilteredTien");

            if (elBadgeTien) {

                elBadgeTien.innerText = `${formatMoney(sumTien)} (${FILTERED_TIEN.length} khoản)`;

                elBadgeTien.title = `${formatExactMoney(sumTien)} (${FILTERED_TIEN.length} khoản)`;

            }



            const elBadgeHang = document.getElementById("badgeFilteredHang");

            if (elBadgeHang) {

                const hangTienStr = sumHangTien > 0 ? ` (${formatMoney(sumHangTien)})` : '';

                elBadgeHang.innerText = `${formatNumber(sumHang)} EA${hangTienStr}`;

                elBadgeHang.title = `${formatExactNumber(sumHang)} EA • ${formatExactMoney(sumHangTien)} (Tạm tính theo giá mua NPP) • ${FILTERED_HANG.length} dòng`;

            }



            const elBadgeNpp = document.getElementById("badgeFilteredNPP");

            if (elBadgeNpp) {

                elBadgeNpp.innerText = `${nppSet.size} NPP liên quan`;

            }

        }



        function updateTab1KPIs() {

            const sumTien = FILTERED_TIEN.reduce((acc, x) => acc + (x.amount || 0), 0);

            const sumHang = FILTERED_HANG.reduce((acc, x) => acc + (x.ea || 0), 0);

            const sumHangTien = FILTERED_HANG.reduce((acc, x) => acc + (x.amount || 0), 0);

            const sumTotalVal = sumTien + sumHangTien;

            

            const nppSet = new Set();

            FILTERED_TIEN.forEach(x => { if (x.code_npp) nppSet.add(x.code_npp); });

            FILTERED_HANG.forEach(x => { if (x.code_npp) nppSet.add(x.code_npp); });



            // Tiền quá hạn >60 ngày (T1-T6)

            const sumAgingHigh = FILTERED_TIEN.filter(x => x.thang <= 6).reduce((acc, x) => acc + (x.amount || 0), 0);



            const elKpiTien = document.getElementById("kpiTien");

            if (elKpiTien) {

                elKpiTien.innerText = formatMoney(sumTien);

                elKpiTien.title = formatExactMoney(sumTien);

            }

            const elKpiTienCount = document.getElementById("kpiTienCount");

            if (elKpiTienCount) elKpiTienCount.innerText = `${FILTERED_TIEN.length} khoản tiền`;

            

            const elKpiHang = document.getElementById("kpiHang");

            if (elKpiHang) {

                const hangTienSpan = sumHangTien > 0 ? `<span class="text-sm font-bold text-slate-500 whitespace-nowrap">(${formatMoney(sumHangTien)})</span>` : '';

                elKpiHang.innerHTML = `<span class="whitespace-nowrap">${formatNumber(sumHang)} EA</span> ${hangTienSpan}`;

                elKpiHang.title = `${formatExactNumber(sumHang)} EA • ${formatExactMoney(sumHangTien)} (Tạm tính theo giá mua NPP Layer 1)`;

            }

            const elKpiHangCount = document.getElementById("kpiHangCount");

            if (elKpiHangCount) elKpiHangCount.innerText = `${FILTERED_HANG.length} dòng sản phẩm`;



            const elKpiTotalValue = document.getElementById("kpiTotalValue");

            if (elKpiTotalValue) {

                elKpiTotalValue.innerText = formatMoney(sumTotalVal);

                elKpiTotalValue.title = `${formatExactMoney(sumTotalVal)} (Gồm Tiền: ${formatExactMoney(sumTien)} + Hàng tạm tính theo giá mua NPP: ${formatExactMoney(sumHangTien)})`;

            }



            const elKpiAging = document.getElementById("kpiAgingHigh");

            if (elKpiAging) {

                elKpiAging.innerText = formatMoney(sumAgingHigh);

                elKpiAging.title = formatExactMoney(sumAgingHigh);

            }



            const elKpiNpp = document.getElementById("kpiNPP");

            if (elKpiNpp) elKpiNpp.innerText = `${nppSet.size} NPP`;

        }



        // --- 5.1 QUICK PILL COUNTS (SYNCHRONIZED WITH GLOBAL FILTERS) ---

        function updateQuickPillCounts() {

            // Tiền pill counts

            const cntTienAll = FILTERED_TIEN.length;

            let cntTienBxn = 0, cntTienHd = 0, cntTienBb = 0, cntTienBxntb = 0, cntTienAging = 0;

            FILTERED_TIEN.forEach(x => {

                const docs = x.missing_docs || [];

                if (docs.includes('BXN')) cntTienBxn++;

                if (docs.includes('HĐ')) cntTienHd++;

                if (docs.includes('BB')) cntTienBb++;

                if (docs.includes('BXNTB')) cntTienBxntb++;

                if (x.aging && (x.aging.includes('Quá hạn') || x.aging.includes('Cảnh báo'))) cntTienAging++;

            });



            const setElText = (id, txt) => {

                const el = document.getElementById(id);

                if (el) el.innerText = txt;

            };



            setElText('cnt-tien-all', cntTienAll);

            setElText('cnt-tien-bxn', cntTienBxn);

            setElText('cnt-tien-hd', cntTienHd);

            setElText('cnt-tien-bb', cntTienBb);

            setElText('cnt-tien-bxntb', cntTienBxntb);

            setElText('cnt-tien-aging', cntTienAging);



            // Hàng pill counts

            const cntHangAll = FILTERED_HANG.length;

            let cntHangKey = 0, cntHangSales = 0, cntHangDoc = 0, cntHangTon = 0, cntHangLiquid = 0;

            FILTERED_HANG.forEach(x => {

                const r = x.reason || '';

                if (r === 'Chờ Key đơn trả NPP' || r.includes('key')) cntHangKey++;

                else if (r.includes('YC sales') || r.includes('sales')) cntHangSales++;

                else if (r.includes('Chưa gửi') || r.includes('thiếu (BXN') || r === 'Thiếu chứng từ') cntHangDoc++;

                else if (r.includes('Thiếu Tồn')) cntHangTon++;

                else if (r.includes('Thanh Lý') || r.includes('thanh lý')) cntHangLiquid++;

            });



            setElText('cnt-hang-all', cntHangAll);

            setElText('cnt-hang-key', cntHangKey);

            setElText('cnt-hang-sales', cntHangSales);

            setElText('cnt-hang-doc', cntHangDoc);

            setElText('cnt-hang-ton', cntHangTon);

            setElText('cnt-hang-liquid', cntHangLiquid);

        }



        // --- 6. TAB 2: TABLE TRẢ KM TIỀN ---

        const TIEN_DOC_MAP = {

            'ALL': 'all',

            'BXN': 'bxn',

            'HĐ': 'hd',

            'BB': 'bb',

            'BXNTB': 'bxntb',

            'AGING': 'aging'

        };



        function getTabTienRows() {

            if (quickTienDoc === 'ALL') return FILTERED_TIEN;

            return FILTERED_TIEN.filter(item => {

                if (quickTienDoc === 'AGING') {

                    return item.aging && (item.aging.includes('Quá hạn') || item.aging.includes('Cảnh báo'));

                }

                return item.missing_docs && item.missing_docs.includes(quickTienDoc);

            });

        }



        function setTienDocFilter(doc) {

            quickTienDoc = doc;

            Object.entries(TIEN_DOC_MAP).forEach(([key, idSuffix]) => {

                const el = document.getElementById(`pill-tien-${idSuffix}`);

                if (el) {

                    if (key === doc) {

                        el.classList.add('active');

                    } else {

                        el.classList.remove('active');

                    }

                }

            });

            pageTien = 1;

            renderTienTable();

        }



        function sortTien(col) {

            if (sortTienCol === col) {

                sortTienDir = (sortTienDir === 'asc') ? 'desc' : 'asc';

            } else {

                sortTienCol = col;

                sortTienDir = 'desc';

            }

            renderTienTable();

        }



        function renderTienTable() {

            const currentRows = getTabTienRows();

            const sorted = [...currentRows].sort((a, b) => {

                let vA = a[sortTienCol];

                let vB = b[sortTienCol];

                if (typeof vA === 'string') vA = vA.toLowerCase();

                if (typeof vB === 'string') vB = vB.toLowerCase();

                if (vA < vB) return sortTienDir === 'asc' ? -1 : 1;

                if (vA > vB) return sortTienDir === 'asc' ? 1 : -1;

                return 0;

            });



            const total = sorted.length;

            const start = (pageTien - 1) * pageSizeTien;

            const end = Math.min(start + pageSizeTien, total);

            const paged = sorted.slice(start, end);



            const tbody = document.getElementById("tblTienBody");

            const tfoot = document.getElementById("tblTienFoot");



            // Calculate footer totals for all matching filtered rows

            const sumTien = currentRows.reduce((acc, r) => acc + (Number(r.amount) || 0), 0);

            const distinctNpp = new Set(currentRows.map(r => r.code_npp)).size;



            if (tfoot) {

                if (total === 0) {

                    tfoot.innerHTML = "";

                } else {

                    tfoot.innerHTML = `

                        <tr class="bg-slate-100 border-t-2 border-slate-300 font-bold text-slate-800">

                            <td class="td-rank-col text-center font-mono text-slate-500">∑</td>

                            <td class="sticky-col-2 text-left">

                                <div class="font-black text-slate-900 text-xs">TỔNG CỘNG (${distinctNpp} NPP)</div>

                                <div class="text-[10px] text-slate-500 font-normal">Theo bộ lọc hiện tại</div>

                            </td>

                            <td class="p-3 text-center text-slate-400">-</td>

                            <td class="p-3 text-left text-slate-400">-</td>

                            <td class="p-3 text-left text-slate-400">-</td>

                            <td class="p-3 text-left text-slate-700 font-semibold">${formatExactNumber(total)} khoản khuyến mãi</td>

                            <td class="p-3 text-right font-black text-red-600 text-xs sm:text-sm tabular-nums whitespace-nowrap" title="${formatExactMoney(sumTien)}">

                                ${formatMoney(sumTien)}

                                <div class="text-[10px] text-slate-500 font-semibold mt-0.5">${formatExactMoney(sumTien)}</div>

                            </td>

                            <td class="p-3 text-center text-slate-400">-</td>

                            <td class="p-3 text-center text-slate-400">-</td>

                        </tr>

                    `;

                }

            }



            if (paged.length === 0) {

                tbody.innerHTML = `<tr><td colspan="9" class="p-8 text-center text-slate-400 font-medium">Không có dữ liệu thỏa mãn bộ lọc hiện tại</td></tr>`;

            } else {

                tbody.innerHTML = paged.map((r, idx) => {

                    // Doc badges

                    let docBadges = (r.missing_docs || []).map(d => {

                        let color = "bg-amber-100 text-amber-800";

                        if (d === 'HĐ') color = "bg-red-100 text-red-800";

                        if (d === 'BB') color = "bg-blue-100 text-blue-800";

                        if (d === 'BXNTB') color = "bg-purple-100 text-purple-800";

                        return `<span class="inline-block px-1.5 py-0.5 text-[10px] font-bold rounded ${color}">${d}</span>`;

                    }).join(' ');



                    // Aging badge

                    let agingColor = "bg-emerald-100 text-emerald-800";

                    if (r.aging.includes('Quá hạn')) agingColor = "bg-rose-100 text-rose-800 font-bold";

                    else if (r.aging.includes('Cảnh báo')) agingColor = "bg-amber-100 text-amber-800 font-bold";



                    return `

                        <tr class="hover:bg-slate-50 transition border-b border-slate-100">

                            <td class="td-rank-col text-center text-slate-400 font-mono">${start + idx + 1}</td>

                            <td class="sticky-col-2 text-left">

                                <div class="font-bold text-slate-900 cursor-pointer hover:text-red-600 truncate leading-snug" onclick="selectNppInDossier('${r.code_npp}')" title="${r.ten_npp}">${r.ten_npp}</div>

                                <div class="text-[11px] font-mono text-slate-500 font-medium">${r.code_npp}</div>

                            </td>

                            <td class="p-3 text-center font-bold text-slate-700 whitespace-nowrap">T${r.thang}</td>

                            <td class="p-3 text-left whitespace-nowrap">

                                <div class="font-semibold text-slate-800">${r.vung || r.khu_vuc}</div>

                                <div class="text-[10px] text-slate-400 font-medium">${r.mien === 'North' ? 'Miền Bắc' : 'Miền Nam'}</div>

                            </td>

                            <td class="p-3 text-left whitespace-nowrap">

                                <div class="font-bold text-indigo-700">${r.office || 'Chưa rõ'}</div>

                                <div class="text-[10px] text-slate-400">${r.ten_gsbh || ''}</div>

                            </td>

                            <td class="p-3 text-left max-w-[320px] break-words text-slate-800 leading-snug" title="${r.ten_ct}">

                                ${r.ten_ct}

                            </td>

                            <td class="p-3 text-right font-black text-red-600 tabular-nums whitespace-nowrap" title="${formatExactMoney(r.amount)}">${formatMoney(r.amount)}</td>

                            <td class="p-3 text-center">

                                <div class="flex items-center justify-center gap-1.5 flex-wrap">

                                    <span class="inline-block px-2 py-0.5 text-[10px] font-bold rounded bg-red-100 text-red-800 whitespace-nowrap">Thiếu chứng từ</span>

                                    <div class="space-x-1" title="${r.reason_detail || ''}">${docBadges}</div>

                                </div>

                            </td>

                            <td class="p-3 text-center whitespace-nowrap">

                                <span class="px-2 py-0.5 rounded text-[10px] font-bold ${agingColor}">${r.aging}</span>

                            </td>

                        </tr>

                    `;

                }).join('');

            }



            document.getElementById("lblTienRange").innerText = total > 0 ? `${start + 1} - ${end}` : "0 - 0";

            document.getElementById("lblTienTotal").innerText = total;

            document.getElementById("lblTienPage").innerText = pageTien;

        }



        function prevTienPage() { if (pageTien > 1) { pageTien--; renderTienTable(); } }

        function nextTienPage() {

            if (pageTien * pageSizeTien < getTabTienRows().length) {

                pageTien++; renderTienTable();

            }

        }



        // --- 7. TAB 3: TABLE TRẢ KM HÀNG ---

        const HANG_REASON_MAP = {

            'ALL': 'all',

            'Chờ Key đơn trả NPP': 'key',

            'Pending (YC sales)': 'sales',

            'Chưa gửi/thiếu (BXN,HĐ,BB)': 'doc',

            'Thiếu chứng từ': 'doc',

            'Pending (Thiếu Tồn)': 'ton',

            'NPP Đang Thanh Lý': 'liquid'

        };



        function getTabHangRows() {

            if (quickHangReason === 'ALL') return FILTERED_HANG;

            return FILTERED_HANG.filter(item => {

                const r = item.reason || '';

                if (quickHangReason === 'Chờ Key đơn trả NPP') return r === 'Chờ Key đơn trả NPP' || r.includes('key');

                if (quickHangReason === 'Pending (YC sales)') return r.includes('YC sales') || r.includes('sales');

                if (quickHangReason === 'Chưa gửi/thiếu (BXN,HĐ,BB)' || quickHangReason === 'Thiếu chứng từ') {

                    return r.includes('Chưa gửi') || r.includes('thiếu (BXN') || r === 'Thiếu chứng từ';

                }

                if (quickHangReason === 'Pending (Thiếu Tồn)') return r.includes('Thiếu Tồn');

                if (quickHangReason === 'NPP Đang Thanh Lý') return r.includes('Thanh Lý') || r.includes('thanh lý');

                return r === quickHangReason;

            });

        }



        function setHangReasonFilter(reason) {

            quickHangReason = reason;

            Object.entries(HANG_REASON_MAP).forEach(([key, idSuffix]) => {

                const el = document.getElementById(`pill-hang-${idSuffix}`);

                if (el) {

                    if (key === reason) {

                        el.classList.add('active');

                    } else {

                        el.classList.remove('active');

                    }

                }

            });

            pageHang = 1;

            renderHangTable();

        }



        function sortHang(col) {

            if (sortHangCol === col) {

                sortHangDir = (sortHangDir === 'asc') ? 'desc' : 'asc';

            } else {

                sortHangCol = col;

                sortHangDir = 'desc';

            }

            renderHangTable();

        }



        function renderHangTable() {

            const currentRows = getTabHangRows();

            const sorted = [...currentRows].sort((a, b) => {

                let vA = a[sortHangCol];

                let vB = b[sortHangCol];

                if (typeof vA === 'string') vA = vA.toLowerCase();

                if (typeof vB === 'string') vB = vB.toLowerCase();

                if (vA < vB) return sortHangDir === 'asc' ? -1 : 1;

                if (vA > vB) return sortHangDir === 'asc' ? 1 : -1;

                return 0;

            });



            const total = sorted.length;

            const start = (pageHang - 1) * pageSizeHang;

            const end = Math.min(start + pageSizeHang, total);

            const paged = sorted.slice(start, end);



            const tbody = document.getElementById("tblHangBody");

            const tfoot = document.getElementById("tblHangFoot");



            // Calculate footer totals for all matching filtered rows

            const sumEA = currentRows.reduce((acc, r) => acc + (Number(r.ea) || 0), 0);

            const sumTien = currentRows.reduce((acc, r) => acc + (Number(r.amount) || 0), 0);

            const distinctNpp = new Set(currentRows.map(r => r.code_npp)).size;



            if (tfoot) {

                if (total === 0) {

                    tfoot.innerHTML = "";

                } else {

                    tfoot.innerHTML = `

                        <tr class="bg-slate-100 border-t-2 border-slate-300 font-bold text-slate-800">

                            <td class="td-rank-col text-center font-mono text-slate-500">∑</td>

                            <td class="sticky-col-2 text-left">

                                <div class="font-black text-slate-900 text-xs">TỔNG CỘNG (${distinctNpp} NPP)</div>

                                <div class="text-[10px] text-slate-500 font-normal">Theo bộ lọc hiện tại</div>

                            </td>

                            <td class="p-3 text-center text-slate-400">-</td>

                            <td class="p-3 text-left text-slate-400">-</td>

                            <td class="p-3 text-left text-slate-400">-</td>

                            <td class="p-3 text-left text-slate-700 font-semibold">${formatExactNumber(total)} dòng sản phẩm</td>

                            <td class="p-3 text-left text-slate-400">-</td>

                            <td class="p-3 text-center text-slate-400">-</td>

                            <td class="p-3 text-right tabular-nums whitespace-nowrap">

                                <div class="font-black text-blue-600 text-xs sm:text-sm leading-tight" title="${formatExactNumber(sumEA)} EA">

                                    ${formatNumber(sumEA)} EA ${sumTien > 0 ? `<span class="text-emerald-700 font-bold text-xs ml-1">(${formatMoney(sumTien)})</span>` : ''}

                                </div>

                                ${sumTien > 0 ? `<div class="text-[10px] text-slate-500 font-semibold mt-0.5" title="${formatExactMoney(sumTien)}">${formatExactMoney(sumTien)} <span class="font-bold text-red-600 italic">(*tạm tính giá mua NPP)</span></div>` : ''}

                            </td>

                            <td class="p-3 text-center text-slate-400">-</td>

                            <td class="p-3 text-left text-slate-400">-</td>

                            <td class="p-3 text-center text-slate-400">-</td>

                        </tr>

                    `;

                }

            }



            if (paged.length === 0) {

                tbody.innerHTML = `<tr><td colspan="12" class="p-8 text-center text-slate-400 font-medium">Không có dữ liệu thỏa mãn bộ lọc hiện tại</td></tr>`;

            } else {

                tbody.innerHTML = paged.map((r, idx) => {

                    // Storage Badge

                    let stColor = "bg-amber-100 text-amber-800";

                    if (r.storage === 'Chilled') stColor = "bg-blue-100 text-blue-800";

                    if (r.storage === 'Frozen') stColor = "bg-cyan-100 text-cyan-800";



                    // Aging badge

                    let agingColor = "bg-emerald-100 text-emerald-800";

                    if (r.aging.includes('Quá hạn')) agingColor = "bg-rose-100 text-rose-800 font-bold";

                    else if (r.aging.includes('Cảnh báo')) agingColor = "bg-amber-100 text-amber-800 font-bold";



                    // Reason badge

                    let rBadge = "bg-slate-100 text-slate-700 font-semibold";

                    const rs = (r.reason || '').toLowerCase();

                    if (rs.includes('chờ key') || rs.includes('key')) rBadge = "bg-purple-100 text-purple-800 font-bold border border-purple-200";

                    else if (rs.includes('yc sales') || rs.includes('sales')) rBadge = "bg-sky-100 text-sky-800 font-bold border border-sky-200";

                    else if (rs.includes('chưa gửi') || (rs.includes('thiếu') && !rs.includes('tồn'))) rBadge = "bg-rose-100 text-rose-800 font-bold border border-rose-200";

                    else if (rs.includes('thiếu tồn') || rs.includes('tồn')) rBadge = "bg-amber-100 text-amber-800 font-bold border border-amber-200";

                    else if (rs.includes('thanh lý')) rBadge = "bg-orange-100 text-orange-800 font-bold border border-orange-200";

                    else if (rs.includes('đủ chứng từ')) rBadge = "bg-blue-100 text-blue-800 font-bold border border-blue-200";

                    else if (rs.includes('đã xử lý') || rs.includes('đã trả')) rBadge = "bg-emerald-100 text-emerald-800 font-bold border border-emerald-200";

                    else if (rs.includes('thanh toán')) rBadge = "bg-teal-100 text-teal-800 font-bold border border-teal-200";



                    return `

                        <tr class="hover:bg-slate-50 transition border-b border-slate-100">

                            <td class="td-rank-col text-center text-slate-400 font-mono">${start + idx + 1}</td>

                            <td class="sticky-col-2 text-left">

                                <div class="font-bold text-slate-900 cursor-pointer hover:text-blue-600 truncate leading-snug" onclick="selectNppInDossier('${r.code_npp}')" title="${r.ten_npp}">${r.ten_npp}</div>

                                <div class="text-[11px] font-mono text-slate-500 font-medium">${r.code_npp}</div>

                            </td>

                            <td class="p-3 text-center font-bold text-slate-700 whitespace-nowrap">T${r.thang}</td>

                            <td class="p-3 text-left whitespace-nowrap font-medium text-slate-800">

                                <div>${r.vung || r.khu_vuc}</div>

                                <div class="text-[10px] text-slate-400 font-medium">${r.mien === 'North' ? 'Miền Bắc' : 'Miền Nam'}</div>

                            </td>

                            <td class="p-3 text-left whitespace-nowrap">

                                <div class="font-bold text-indigo-700">${r.office || 'Chưa rõ'}</div>

                                <div class="text-[10px] text-slate-400">${r.ten_gsbh || ''}</div>

                            </td>

                            <td class="p-3 text-left max-w-[260px] break-words text-slate-800 leading-snug" title="${r.ten_ct}">${r.ten_ct}</td>

                            <td class="p-3 text-left max-w-[280px]">

                                <div class="font-semibold text-slate-900 break-words leading-snug" title="${r.ten_sp}">${r.ten_sp}</div>

                                <div class="text-[11px] font-mono text-slate-500">${r.ma_sp}</div>

                            </td>

                            <td class="p-3 text-center whitespace-nowrap">

                                <span class="px-2 py-0.5 rounded text-[10px] font-bold ${stColor}">${r.storage}</span>

                            </td>

                            <td class="p-3 text-right tabular-nums whitespace-nowrap">

                                <div class="font-black text-blue-600 leading-tight" title="${formatExactNumber(r.ea)} EA${r.amount > 0 ? ' • ' + formatExactMoney(r.amount) : ''}">

                                    ${formatNumber(r.ea)} EA ${r.amount > 0 ? `<span class="text-emerald-700 font-bold text-xs ml-1">(${formatMoney(r.amount)})</span>` : ''}

                                </div>

                                ${r.amount > 0 ? `<div class="text-[10px] text-slate-400 font-medium leading-tight mt-0.5" title="${formatExactMoney(r.amount)}">${formatExactMoney(r.amount)}</div>` : ''}

                            </td>

                            <td class="p-3 text-center whitespace-nowrap">

                                <span class="px-2 py-0.5 rounded text-[10px] font-bold ${rBadge}">${r.reason}</span>

                            </td>

                            <td class="p-3 text-left max-w-[260px]">

                                <span class="text-slate-600 text-xs break-words block leading-snug" title="${r.reason_detail}">${r.reason_detail || '-'}</span>

                            </td>

                            <td class="p-3 text-center whitespace-nowrap">

                                <span class="px-2 py-0.5 rounded text-[10px] font-bold ${agingColor}">${r.aging}</span>

                            </td>

                        </tr>

                    `;

                }).join('');

            }



            document.getElementById("lblHangRange").innerText = total > 0 ? `${start + 1} - ${end}` : "0 - 0";

            document.getElementById("lblHangTotal").innerText = total;

            document.getElementById("lblHangPage").innerText = pageHang;

        }



        function prevHangPage() { if (pageHang > 1) { pageHang--; renderHangTable(); } }

        function nextHangPage() {

            if (pageHang * pageSizeHang < getTabHangRows().length) {

                pageHang++; renderHangTable();

            }

        }



        // --- 8. TAB 4: SỔ TAY CHỨNG TỪ NPP (DOSSIER 360°) ---

        function renderNppList() {

            const txt = (document.getElementById("txtNppSearch").value || "").trim().toLowerCase();



            // Tổng hợp dữ liệu theo NPP từ FILTERED_TIEN & FILTERED_HANG

            const nppMap = {};

            FILTERED_TIEN.forEach(x => {

                if (!x.code_npp) return;

                if (!nppMap[x.code_npp]) {

                    nppMap[x.code_npp] = { code: x.code_npp, name: x.ten_npp, full_name: x.full_name_npp || x.ten_npp, khu_vuc: x.khu_vuc, mien: x.mien, gsbh: x.ten_gsbh, asm: x.asm, tien: 0, hang_ea: 0, hang_tien: 0, count_tien: 0, count_hang: 0, docs: new Set() };

                }

                nppMap[x.code_npp].tien += (x.amount || 0);

                nppMap[x.code_npp].count_tien++;

                (x.missing_docs || []).forEach(d => nppMap[x.code_npp].docs.add(d));

            });



            FILTERED_HANG.forEach(x => {

                if (!x.code_npp) return;

                if (!nppMap[x.code_npp]) {

                    nppMap[x.code_npp] = { code: x.code_npp, name: x.ten_npp, full_name: x.full_name_npp || x.ten_npp, khu_vuc: x.khu_vuc, mien: x.mien, gsbh: x.ten_gsbh, asm: x.asm, tien: 0, hang_ea: 0, hang_tien: 0, count_tien: 0, count_hang: 0, docs: new Set() };

                }

                nppMap[x.code_npp].hang_ea += (x.ea || 0);

                nppMap[x.code_npp].hang_tien += (x.amount || 0);

                nppMap[x.code_npp].count_hang++;

                (x.missing_docs || []).forEach(d => nppMap[x.code_npp].docs.add(d));

            });



            let list = Object.values(nppMap);

            if (txt) {

                list = list.filter(n => n.name.toLowerCase().includes(txt) || (n.full_name && n.full_name.toLowerCase().includes(txt)) || n.code.toLowerCase().includes(txt));

            }



            // Sắp xếp theo tổng tiền giảm dần

            list.sort((a, b) => b.tien - a.tien);



            document.getElementById("lblNppCountBadge").innerText = `${list.length} NPP`;



            const container = document.getElementById("nppListContainer");

            if (list.length === 0) {

                container.innerHTML = `<div class="p-4 text-center text-slate-400 text-xs">Không tìm thấy NPP nào</div>`;

                return;

            }



            container.innerHTML = list.map(n => {

                const isActive = (n.code === selectedNppCode);

                const hangSub = n.hang_tien > 0 ? ` • ${formatMoney(n.hang_tien)}` : '';

                return `

                    <div onclick="selectNppInDossier('${n.code}')" class="p-3 rounded-lg border cursor-pointer transition ${isActive ? 'bg-red-50/70 border-red-500 shadow-sm' : 'bg-white border-slate-200 hover:border-slate-300'}">

                        <div class="flex items-center justify-between">

                            <span class="font-mono text-[11px] font-bold text-slate-600">${n.code}</span>

                            <span class="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">${n.khu_vuc}</span>

                        </div>

                        <div class="font-bold text-xs text-slate-900 mt-1 line-clamp-1" title="${n.full_name || n.name}">${n.name}</div>

                        <div class="flex items-center justify-between mt-2 pt-1 border-t border-slate-100 text-[11px]">

                            <span class="text-red-600 font-bold" title="${formatExactMoney(n.tien)}">${formatMoney(n.tien)}</span>

                            <span class="text-blue-600 font-semibold" title="${formatExactNumber(n.hang_ea)} EA">${formatNumber(n.hang_ea)} EA${hangSub}</span>

                        </div>

                    </div>

                `;

            }).join('');

        }



        function selectNppInDossier(code) {

            selectedNppCode = code;

            switchTab('tab-npp');

            renderNppList();



            // Lấy danh sách chương trình của NPP này

            const tienList = TIEN_DATA.filter(x => x.code_npp === code);

            const hangList = HANG_DATA.filter(x => x.code_npp === code);



            if (tienList.length === 0 && hangList.length === 0) {

                document.getElementById("nppDetailPlaceholder").classList.remove("hidden");

                document.getElementById("nppDetailContent").classList.add("hidden");

                return;

            }



            document.getElementById("nppDetailPlaceholder").classList.add("hidden");

            document.getElementById("nppDetailContent").classList.remove("hidden");



            const ref = tienList[0] || hangList[0];

            document.getElementById("d_nppCode").innerText = ref.code_npp;

            document.getElementById("d_nppName").innerText = ref.full_name_npp || ref.ten_npp;

            document.getElementById("d_nppKhuVuc").innerText = ref.khu_vuc || "Chưa rõ";

            document.getElementById("d_nppMien").innerText = ref.mien === 'North' ? "Miền Bắc" : "Miền Nam";

            if (document.getElementById("d_nppOffice")) document.getElementById("d_nppOffice").innerText = ref.office || "Chưa phân bổ";

            document.getElementById("d_nppGSBH").innerText = ref.ten_gsbh || "Chưa phân bổ";

            document.getElementById("d_nppASM").innerText = ref.asm || "Chưa phân bổ";



            const sumT = tienList.reduce((acc, x) => acc + (x.amount || 0), 0);

            const sumH = hangList.reduce((acc, x) => acc + (x.ea || 0), 0);

            const sumHTien = hangList.reduce((acc, x) => acc + (x.amount || 0), 0);



            const elStatTien = document.getElementById("d_statTien");

            if (elStatTien) {

                elStatTien.innerText = formatMoney(sumT);

                elStatTien.title = formatExactMoney(sumT);

            }

            document.getElementById("d_statTienCount").innerText = `${tienList.length} chương trình`;



            const elStatHang = document.getElementById("d_statHang");

            if (elStatHang) {

                elStatHang.innerText = `${formatNumber(sumH)} EA ${sumHTien > 0 ? '• ' + formatMoney(sumHTien) : ''}`;

                elStatHang.title = `${formatExactNumber(sumH)} EA ${sumHTien > 0 ? '• ' + formatExactMoney(sumHTien) + ' (Tạm tính theo giá mua NPP Layer 1)' : ''}`;

            }

            document.getElementById("d_statHangCount").innerText = `${hangList.length} sản phẩm`;



            // Checklist

            const allDocs = new Set();

            tienList.forEach(x => (x.missing_docs || []).forEach(d => allDocs.add(d)));

            hangList.forEach(x => (x.missing_docs || []).forEach(d => allDocs.add(d)));



            const setChk = (id, has) => {

                const el = document.getElementById(id);

                if (has) {

                    el.className = "p-2.5 rounded-lg border border-red-300 bg-red-50 flex items-center space-x-2";

                } else {

                    el.className = "p-2.5 rounded-lg border border-emerald-300 bg-emerald-50 flex items-center space-x-2 opacity-60";

                }

            };

            setChk("chk_bxn", allDocs.has("BXN"));

            setChk("chk_hd", allDocs.has("HĐ"));

            setChk("chk_bb", allDocs.has("BB"));

            setChk("chk_bxntb", allDocs.has("BXNTB"));



            // Table programs

            const tbody = document.getElementById("tblNppProgramsBody");

            let html = "";

            tienList.forEach(t => {

                html += `

                    <tr class="hover:bg-slate-50 border-b border-slate-100 transition">

                        <td class="p-2.5 text-center font-bold text-slate-700 whitespace-nowrap">T${t.thang}</td>

                        <td class="p-2.5 text-center whitespace-nowrap"><span class="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800">Tiền (₫)</span></td>

                        <td class="p-2.5 text-left font-medium text-slate-900 break-words leading-snug" title="${t.ten_ct}">${t.ten_ct}</td>

                        <td class="p-2.5 text-right font-black text-red-600 tabular-nums whitespace-nowrap" title="${formatExactMoney(t.amount)}">${formatMoney(t.amount)}</td>

                        <td class="p-2.5 text-left">

                            <div class="flex items-center gap-1.5 flex-wrap">

                                <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 whitespace-nowrap">Thiếu CT</span>

                                <span class="text-xs text-slate-600 break-words">${t.reason_detail || ''}</span>

                            </div>

                        </td>

                    </tr>

                `;

            });

            hangList.forEach(h => {

                let rBadge = "bg-slate-100 text-slate-700 font-semibold";

                const hs = (h.reason || '').toLowerCase();

                if (hs.includes('chờ key') || hs.includes('key')) rBadge = "bg-purple-100 text-purple-800 font-bold border border-purple-200";

                else if (hs.includes('yc sales') || hs.includes('sales')) rBadge = "bg-sky-100 text-sky-800 font-bold border border-sky-200";

                else if (hs.includes('chưa gửi') || (hs.includes('thiếu') && !hs.includes('tồn'))) rBadge = "bg-rose-100 text-rose-800 font-bold border border-rose-200";

                else if (hs.includes('thiếu tồn') || hs.includes('tồn')) rBadge = "bg-amber-100 text-amber-800 font-bold border border-amber-200";

                else if (hs.includes('thanh lý')) rBadge = "bg-orange-100 text-orange-800 font-bold border border-orange-200";

                else if (hs.includes('đủ chứng từ')) rBadge = "bg-blue-100 text-blue-800 font-bold border border-blue-200";

                else if (hs.includes('đã xử lý') || hs.includes('đã trả')) rBadge = "bg-emerald-100 text-emerald-800 font-bold border border-emerald-200";

                else if (hs.includes('thanh toán')) rBadge = "bg-teal-100 text-teal-800 font-bold border border-teal-200";



                html += `

                    <tr class="hover:bg-slate-50 border-b border-slate-100 transition">

                        <td class="p-2.5 text-center font-bold text-slate-700 whitespace-nowrap">T${h.thang}</td>

                        <td class="p-2.5 text-center whitespace-nowrap"><span class="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">Hàng (EA)</span></td>

                        <td class="p-2.5 text-left">

                            <div class="font-medium text-slate-900 break-words leading-snug">${h.ten_sp}</div>

                            <div class="text-[11px] text-slate-400 break-words leading-snug">${h.ten_ct}</div>

                        </td>

                        <td class="p-2.5 text-right tabular-nums whitespace-nowrap" title="${formatExactNumber(h.ea)} EA${h.amount > 0 ? ' • ' + formatExactMoney(h.amount) : ''}">

                            <div class="font-black text-blue-600 leading-tight">${formatNumber(h.ea)} EA ${h.amount > 0 ? `<span class="text-emerald-700 font-bold text-xs ml-1">(${formatMoney(h.amount)})</span>` : ''}</div>

                            ${h.amount > 0 ? `<div class="text-[10px] text-slate-400 font-medium leading-tight mt-0.5">${formatExactMoney(h.amount)}</div>` : ''}

                        </td>

                        <td class="p-2.5 text-left">

                            <div class="flex items-center gap-1.5 flex-wrap">

                                <span class="px-2 py-0.5 rounded text-[10px] font-bold ${rBadge} whitespace-nowrap">${h.reason}</span>

                                <span class="text-xs text-slate-600 break-words">${h.reason_detail || ''}</span>

                            </div>

                        </td>

                    </tr>

                `;

            });

            tbody.innerHTML = html || `<tr><td colspan="5" class="p-6 text-center text-slate-400 font-medium">Không có chương trình nào đang treo</td></tr>`;



            // Mobile: Tự động cuộn xuống phần Dossier chi tiết khi người dùng chọn 1 NPP

            if (typeof window !== 'undefined' && window.innerWidth <= 768) {

                setTimeout(() => {

                    const dossierEl = document.getElementById("nppDetailContent");

                    if (dossierEl) {

                        dossierEl.scrollIntoView({ behavior: 'smooth', block: 'start' });

                    }

                }, 80);

            }

        }



        // --- 9. TAB 5: BÁO CÁO GSBH ---

        function renderGsbhTable() {

            const officeMap = {};

            FILTERED_TIEN.forEach(x => {

                const o = x.office || "Chưa rõ Office";

                if (!officeMap[o]) officeMap[o] = { name: o, vung: x.vung || x.khu_vuc || "Khác", mien: x.mien || "South", tien: 0, hang_ea: 0, hang_tien: 0, npps: new Set(), aging_high: 0 };

                officeMap[o].tien += (x.amount || 0);

                if (x.code_npp) officeMap[o].npps.add(x.code_npp);

                if (x.thang <= 6) officeMap[o].aging_high += (x.amount || 0);

            });



            FILTERED_HANG.forEach(x => {

                const o = x.office || "Chưa rõ Office";

                if (!officeMap[o]) officeMap[o] = { name: o, vung: x.vung || x.khu_vuc || "Khác", mien: x.mien || "South", tien: 0, hang_ea: 0, hang_tien: 0, npps: new Set(), aging_high: 0 };

                officeMap[o].hang_ea += (x.ea || 0);

                officeMap[o].hang_tien += (x.amount || 0);

                if (x.code_npp) officeMap[o].npps.add(x.code_npp);

            });



            const list = Object.values(officeMap);

            list.sort((a, b) => b.tien - a.tien);



            const tbody = document.getElementById("tblGsbhBody");

            const tfoot = document.getElementById("tblGsbhFoot");



            if (tfoot) {

                if (list.length === 0) {

                    tfoot.innerHTML = "";

                } else {

                    const totalTien = list.reduce((acc, g) => acc + (g.tien || 0), 0);

                    const totalHangEa = list.reduce((acc, g) => acc + (g.hang_ea || 0), 0);

                    const totalHangTien = list.reduce((acc, g) => acc + (g.hang_tien || 0), 0);

                    const totalAging = list.reduce((acc, g) => acc + (g.aging_high || 0), 0);

                    const allNpps = new Set();

                    list.forEach(g => (g.npps || []).forEach(n => allNpps.add(n)));



                    tfoot.innerHTML = `

                        <tr class="bg-slate-100 border-t-2 border-slate-300 font-bold text-slate-800">

                            <td class="td-rank-col text-center font-mono text-slate-500">∑</td>

                            <td class="sticky-col-2 text-left">

                                <div class="font-black text-slate-900 text-xs">TỔNG CỘNG (${list.length} Office)</div>

                                <div class="text-[10px] text-slate-500 font-normal">Toàn bộ danh sách</div>

                            </td>

                            <td class="p-3 text-center text-slate-400">-</td>

                            <td class="p-3 text-left text-slate-400">-</td>

                            <td class="p-3 text-center font-bold text-slate-800 whitespace-nowrap">${allNpps.size} NPP</td>

                            <td class="p-3 text-right font-black text-red-600 text-xs sm:text-sm tabular-nums whitespace-nowrap" title="${formatExactMoney(totalTien)}">

                                ${formatMoney(totalTien)}

                                <div class="text-[10px] text-slate-500 font-semibold mt-0.5">${formatExactMoney(totalTien)}</div>

                            </td>

                            <td class="p-3 text-right tabular-nums whitespace-nowrap">

                                <div class="font-black text-blue-600 text-xs sm:text-sm leading-tight">

                                    ${formatNumber(totalHangEa)} EA ${totalHangTien > 0 ? `<span class="text-emerald-700 font-bold text-xs ml-1">(${formatMoney(totalHangTien)})</span>` : ''}

                                </div>

                                ${totalHangTien > 0 ? `<div class="text-[10px] text-slate-500 font-semibold mt-0.5">${formatExactMoney(totalHangTien)}</div>` : ''}

                            </td>

                            <td class="p-3 text-right font-bold text-rose-600 text-xs sm:text-sm tabular-nums whitespace-nowrap" title="${formatExactMoney(totalAging)}">

                                ${formatMoney(totalAging)}

                            </td>

                            <td class="p-3 text-center text-slate-400">-</td>

                        </tr>

                    `;

                }

            }



            if (list.length === 0) {

                tbody.innerHTML = `<tr><td colspan="9" class="p-8 text-center text-slate-400">Không có dữ liệu GSBH thỏa mãn bộ lọc</td></tr>`;

                return;

            }



            tbody.innerHTML = list.map((g, idx) => {

                let statusBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 whitespace-nowrap">Cần Đôn Đốc</span>`;

                if (g.aging_high > 50000000) {

                    statusBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 animate-pulse whitespace-nowrap">Khẩn Cấp (>90 ngày)</span>`;

                } else if (g.tien === 0) {

                    statusBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 whitespace-nowrap">Đã Hoàn Tất Tiền</span>`;

                }



                const mienLabel = g.mien === 'North' ? 'Miền Bắc' : 'Miền Nam';

                return `

                    <tr class="hover:bg-slate-50 transition border-b border-slate-100">

                        <td class="td-rank-col text-center font-bold text-slate-500 font-mono">${idx + 1}</td>

                        <td class="sticky-col-2 text-left font-bold text-indigo-900 whitespace-nowrap">${g.name}</td>

                        <td class="p-3 text-left font-medium text-slate-700 whitespace-nowrap">${g.vung || '-'}</td>

                        <td class="p-3 text-center whitespace-nowrap font-medium text-slate-700">${mienLabel}</td>

                        <td class="p-3 text-center font-semibold text-slate-800 whitespace-nowrap">${g.npps.size} NPP</td>

                        <td class="p-3 text-right font-black text-red-600 tabular-nums whitespace-nowrap" title="${formatExactMoney(g.tien)}">${formatMoney(g.tien)}</td>

                        <td class="p-3 text-right tabular-nums whitespace-nowrap" title="${formatExactNumber(g.hang_ea)} EA${g.hang_tien > 0 ? ' • ' + formatExactMoney(g.hang_tien) : ''}">

                            <div class="font-black text-blue-600 leading-tight">${formatNumber(g.hang_ea)} EA</div>

                            ${g.hang_tien > 0 ? `<div class="text-[10px] text-slate-500 font-normal">${formatMoney(g.hang_tien)}</div>` : ''}

                        </td>

                        <td class="p-3 text-right font-bold text-rose-600 tabular-nums whitespace-nowrap">${formatMoney(g.aging_high)}</td>

                        <td class="p-3 text-center whitespace-nowrap">

                            <span class="inline-block px-2.5 py-1 text-[11px] font-bold rounded-full ${g.aging_high > 0 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}">

                                ${g.aging_high > 0 ? '🚨 Cần đôn đốc' : '✅ Tốt'}

                            </span>

                        </td>

                    </tr>`;

            }).join('');

        }



        // --- 10. ECHARTS DATA VISUALIZATION ---

        function initCharts() {

            if (typeof echarts === 'undefined') return;



            const elReasons = document.getElementById("chartReasons");

            const elMonthly = document.getElementById("chartMonthly");

            const elRegions = document.getElementById("chartRegions");

            const elStorage = document.getElementById("chartStorage");



            if (elReasons) chartReasonsInstance = echarts.init(elReasons);

            if (elMonthly) chartMonthlyInstance = echarts.init(elMonthly);

            if (elRegions) chartRegionsInstance = echarts.init(elRegions);

            if (elStorage) chartStorageInstance = echarts.init(elStorage);



            window.addEventListener('resize', () => {

                if (chartReasonsInstance) chartReasonsInstance.resize();

                if (chartMonthlyInstance) chartMonthlyInstance.resize();

                if (chartRegionsInstance) chartRegionsInstance.resize();

                if (chartStorageInstance) chartStorageInstance.resize();

            });



            updateCharts();

        }



        function updateCharts() {

            if (!chartReasonsInstance || !chartMonthlyInstance || !chartRegionsInstance || !chartStorageInstance) return;



            // 1. Chart Reasons

            const reasonStats = {};



            FILTERED_TIEN.forEach(x => {

                const r = x.reason || 'Thiếu chứng từ';

                if (!reasonStats[r]) reasonStats[r] = { name: r, count: 0, ea: 0, tien: 0 };

                reasonStats[r].count += 1;

                reasonStats[r].tien += (Number(x.amount) || 0);

            });



            FILTERED_HANG.forEach(x => {

                const r = x.reason || 'Khác';

                if (!reasonStats[r]) reasonStats[r] = { name: r, count: 0, ea: 0, tien: 0 };

                reasonStats[r].count += 1;

                reasonStats[r].ea += (Number(x.ea) || 0);

                reasonStats[r].tien += (Number(x.amount) || 0);

            });



            const isEA = (chartReasonMetric === 'EA');

            const reasonColors = {

                // 1. Chờ Key đơn trả NPP (Tím Violet - Chờ xử lý đơn)

                'Chờ Key đơn trả NPP': '#8b5cf6',

                'Chờ key trả hàng': '#8b5cf6',



                // 2. Pending (YC sales) (Xanh lam tươi / Sky blue sáng - Nghiệp vụ Sales)

                'Pending (YC sales)': '#0284c7',



                // 3. Chưa gửi/thiếu (BXN,HĐ,BB) / Thiếu chứng từ (Đỏ tươi / Rose Red - Cảnh báo chứng từ)

                'Chưa gửi/thiếu (BXN,HĐ,BB)': '#ef4444',

                'Thiếu chứng từ': '#ef4444',



                // 4. Pending (Thiếu Tồn) (Vàng hổ phách / Amber ấm - Cảnh báo tồn kho)

                'Pending (Thiếu Tồn)': '#f59e0b',



                // 5. NPP Đang Thanh Lý (Cam đậm / Coral orange - Thanh lý)

                'NPP Đang Thanh Lý': '#ea580c',

                'Đang thanh lý': '#ea580c',



                // 6. Chưa đến kỳ thanh toán (Xanh mòng két / Teal)

                'Chưa đến kỳ thanh toán': '#0d9488',



                // 7. Nhóm hợp lệ / hoàn tất

                'Pending (đủ chứng từ)': '#2563eb',

                'Đã xử lý / Đã trả': '#10b981'

            };



            const fallbackPalette = [

                '#8b5cf6', // Tím

                '#0284c7', // Xanh lam

                '#ef4444', // Đỏ

                '#f59e0b', // Vàng hổ phách

                '#ea580c', // Cam đậm

                '#10b981', // Xanh lá

                '#0d9488', // Teal

                '#d946ef', // Fuchsia

                '#6366f1', // Indigo

                '#84cc16'  // Lime

            ];



            const reasonData = Object.keys(reasonStats)

                .map((k, idx) => {

                    const st = reasonStats[k];

                    const val = isEA ? st.ea : st.tien;

                    const assignedColor = reasonColors[k] || fallbackPalette[idx % fallbackPalette.length];

                    return {

                        name: k,

                        value: val,

                        ea: st.ea,

                        tien: st.tien,

                        count: st.count,

                        itemStyle: { color: assignedColor }

                    };

                })

                .filter(d => d.value > 0)

                .sort((a, b) => b.value - a.value);



            chartReasonsInstance.setOption({

                tooltip: { 

                    trigger: 'item', 

                    formatter: params => {

                        const d = params.data || {};

                        const pct = params.percent != null ? params.percent.toFixed(1) : '0';

                        const dot = `<span style="display:inline-block;margin-right:6px;border-radius:50%;width:8px;height:8px;background-color:${params.color};"></span>`;

                        return `

                            <div style="font-size:12px; line-height:1.5; min-width:190px;">

                                <div style="font-weight:700; margin-bottom:5px; color:#1e293b; border-bottom:1px solid #f1f5f9; padding-bottom:3px;">

                                    ${dot}${params.name}

                                </div>

                                <div style="display:flex; justify-content:space-between; gap:12px; margin-bottom:2px;">

                                    <span style="color:#64748b;">📦 Số lượng:</span>

                                    <b style="color:#2563eb;">${formatExactNumber(d.ea)} EA</b>

                                </div>

                                <div style="display:flex; justify-content:space-between; gap:12px; margin-bottom:2px;">

                                    <span style="color:#64748b;">💵 Số tiền:</span>

                                    <b style="color:#dc2626;">${formatExactMoney(d.tien)}</b>

                                </div>

                                <div style="display:flex; justify-content:space-between; gap:12px; margin-bottom:2px;">

                                    <span style="color:#64748b;">📊 Tỷ trọng (${isEA ? 'SL' : 'Tiền'}):</span>

                                    <b style="color:#0f172a;">${pct}%</b>

                                </div>

                                <div style="display:flex; justify-content:space-between; gap:12px; font-size:11px; color:#94a3b8; border-top:1px dashed #e2e8f0; padding-top:3px; margin-top:3px;">

                                    <span>📑 Dòng dữ liệu:</span>

                                    <span>${formatExactNumber(d.count)} dòng</span>

                                </div>

                            </div>

                        `;

                    }

                },

                legend: { 

                    bottom: 0, 

                    textStyle: { fontSize: 10, color: '#334155', fontWeight: '500' },

                    itemWidth: 11,

                    itemHeight: 11,

                    itemGap: 10

                },

                series: [{

                    name: isEA ? 'Số Lượng (EA)' : 'Số Tiền (₫)',

                    type: 'pie',

                    radius: ['36%', '60%'],

                    center: ['50%', '45%'],

                    avoidLabelOverlap: true,

                    itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },

                    label: {

                        show: true,

                        position: 'outside',

                        formatter: params => {

                            const d = params.data || {};

                            const pct = params.percent != null ? params.percent.toFixed(0) : '0';

                            const valStr = isEA 

                                ? `${formatNumber(d.ea)} EA${d.tien > 0 ? ' • ' + formatMoney(d.tien) : ''}` 

                                : formatMoney(d.tien);

                            return `{b|${params.name}}\n{sub|${pct}% (${valStr})}`;

                        },

                        rich: {

                            b: {

                                fontSize: 10.5,

                                fontWeight: 700,

                                color: '#1e293b',

                                lineHeight: 15

                            },

                            sub: {

                                fontSize: 9.5,

                                fontWeight: 600,

                                color: '#475569',

                                lineHeight: 14

                            }

                        }

                    },

                    labelLine: {

                        show: true,

                        length: 10,

                        length2: 12,

                        smooth: true,

                        lineStyle: {

                            width: 1.5,

                            color: '#94a3b8'

                        }

                    },

                    data: reasonData

                }]

            }, true);



            // 2. Chart Monthly (Dynamic Timeline)

            const activeMonths = (METADATA && METADATA.months && METADATA.months.length > 0)

                ? METADATA.months

                : Array.from({length: 8}, (_, i) => ({ year: 2026, month: i + 1, key: `2026_${i + 1}`, label: `Tháng ${i + 1}`, short_label: `T${i + 1}` }));



            const chartTitleEl = document.getElementById("lblChartMonthlyTitle");

            if (chartTitleEl && activeMonths.length > 0) {

                const minM = activeMonths[0].month;

                const maxM = activeMonths[activeMonths.length - 1].month;

                const maxYear = activeMonths[activeMonths.length - 1].year;

                const isMultiYear = METADATA && METADATA.is_multi_year;

                const rangeStr = isMultiYear ? `T${minM}/${activeMonths[0].year} - T${maxM}/${maxYear}` : `T${minM} - T${maxM}/${maxYear}`;

                chartTitleEl.innerText = `Xu Hướng Pending Theo Kỳ (${rangeStr})`;

            }



            const monthMap = {};

            activeMonths.forEach(mObj => {

                monthMap[mObj.key] = {

                    label: mObj.label,

                    short_label: mObj.short_label,

                    year: mObj.year,

                    month: mObj.month,

                    tien: 0,

                    hang: 0,

                    hang_tien: 0

                };

            });



            FILTERED_TIEN.forEach(x => {

                const k = `${x.nam || 2026}_${x.thang}`;

                if (monthMap[k]) {

                    monthMap[k].tien += ((x.amount || 0) / 1000000); // triệu đ = Mil

                } else if (monthMap[x.thang]) {

                    monthMap[x.thang].tien += ((x.amount || 0) / 1000000);

                }

            });

            FILTERED_HANG.forEach(x => {

                const k = `${x.nam || 2026}_${x.thang}`;

                if (monthMap[k]) {

                    monthMap[k].hang += (x.ea || 0);

                    monthMap[k].hang_tien += ((x.amount || 0) / 1000000);

                } else if (monthMap[x.thang]) {

                    monthMap[x.thang].hang += (x.ea || 0);

                    monthMap[x.thang].hang_tien += ((x.amount || 0) / 1000000);

                }

            });



            const mMonths = Object.values(monthMap).map(v => v.label);

            const mTien = Object.values(monthMap).map(v => Math.round(v.tien));

            const mHang = Object.values(monthMap).map(v => Math.round(v.hang));



            chartMonthlyInstance.setOption({

                tooltip: { 

                    trigger: 'axis', 

                    axisPointer: { type: 'cross' },

                    formatter: params => {

                        let res = `<div class="font-bold mb-1">${params[0].axisValue}</div>`;

                        params.forEach(p => {

                            const color = p.color;

                            if (p.seriesName.includes('Tiền')) {

                                const valTr = p.value || 0;

                                const fullVnd = (valTr * 1e6).toLocaleString('vi-VN') + ' ₫';

                                const shortMoney = valTr >= 1000 ? (valTr / 1000).toFixed(2) + ' Bil' : valTr.toFixed(1) + ' Mil';

                                res += `<div class="text-xs" style="color:${color}">● ${p.seriesName}: <b>${shortMoney}</b> (${fullVnd})</div>`;

                            } else {

                                const valEa = p.value || 0;

                                const shortEa = valEa >= 1000 ? (valEa / 1000).toFixed(1) + ' K EA' : valEa + ' EA';

                                const mObj = Object.values(monthMap)[p.dataIndex] || {};

                                const hangTien = mObj.hang_tien || 0;

                                const hangTienStr = hangTien > 0 ? ` • <b>${hangTien >= 1000 ? (hangTien / 1000).toFixed(2) + ' Bil' : hangTien.toFixed(1) + ' Mil'}</b> (${(hangTien * 1e6).toLocaleString('vi-VN')} ₫ - <span class="text-rose-400 font-bold">tạm tính giá mua NPP</span>)` : '';

                                res += `<div class="text-xs" style="color:${color}">● ${p.seriesName}: <b>${shortEa}</b> (${valEa.toLocaleString('vi-VN')} EA)${hangTienStr}</div>`;

                            }

                        });

                        return res;

                    }

                },

                legend: { data: ['Tiền KM (Mil VNĐ)', 'Hàng KM (EA)'], bottom: 0, textStyle: { fontSize: 10 } },

                grid: { top: 35, left: 55, right: 60, bottom: 40 },

                xAxis: { type: 'category', data: mMonths, axisLabel: { fontSize: 10 } },

                yAxis: [

                    { type: 'value', name: 'Mil VNĐ', axisLabel: { fontSize: 10 } },

                    { type: 'value', name: 'EA', axisLabel: { fontSize: 10 } }

                ],

                series: [

                    { 

                        name: 'Tiền KM (Mil VNĐ)', 

                        type: 'bar', 

                        data: mTien, 

                        itemStyle: { color: '#d32f2f', borderRadius: [4, 4, 0, 0] },

                        barMaxWidth: 32,

                        label: {

                            show: true,

                            position: 'top',

                            distance: 4,

                            fontSize: 10,

                            fontWeight: 'bold',

                            color: '#b91c1c',

                            formatter: params => {

                                const v = params.value;

                                if (!v || v === 0) return '';

                                if (v >= 1000) return (v / 1000).toFixed(1).replace(/\.0$/, '') + ' Bil';

                                return Math.round(v) + ' Mil';

                            }

                        }

                    },

                    { 

                        name: 'Hàng KM (EA)', 

                        type: 'line', 

                        yAxisIndex: 1, 

                        data: mHang, 

                        itemStyle: { color: '#2563eb' },

                        lineStyle: { width: 2.5 },

                        symbol: 'circle',

                        symbolSize: 6,

                        label: {

                            show: true,

                            position: 'top',

                            distance: 6,

                            fontSize: 10,

                            fontWeight: 'bold',

                            color: '#1d4ed8',

                            formatter: params => {

                                const v = params.value;

                                if (!v || v === 0) return '';

                                const eaStr = v >= 1000 ? (v / 1000).toFixed(1).replace(/\.0$/, '') + ' K' : v;

                                const mObj = Object.values(monthMap)[params.dataIndex] || {};

                                const ht = mObj.hang_tien || 0;

                                if (ht > 0) {

                                    const htStr = ht >= 1000 ? (ht / 1000).toFixed(1).replace(/\.0$/, '') + ' Bil' : Math.round(ht) + ' Mil';

                                    return `${eaStr} (${htStr})`;

                                }

                                return eaStr;

                            }

                        }

                    }

                ]

            });



            // Danh mục khu vực chuẩn theo thứ tự cố định: Hà Nội, Hải Phòng, Đà Nẵng, Nha Trang, HCM, Cần Thơ

            const FIXED_REGIONS = ['Hà Nội', 'Hải Phòng', 'Đà Nẵng', 'Nha Trang', 'HCM', 'Cần Thơ'];

            function normalizeRegionName(regName) {

                if (!regName) return 'Khác';

                const s = regName.normalize('NFC').trim().toLowerCase();

                if (s.includes('hà nội') || s.includes('ha noi') || s.includes('hanoi')) return 'Hà Nội';

                if (s.includes('hải phòng') || s.includes('hai phong') || s.includes('haiphong')) return 'Hải Phòng';

                if (s.includes('đà nẵng') || s.includes('da nang') || s.includes('danang')) return 'Đà Nẵng';

                if (s.includes('nha trang') || s.includes('nhatrang')) return 'Nha Trang';

                if (s.includes('hcm') || s.includes('hồ chí minh') || s.includes('ho chi minh')) return 'HCM';

                if (s.includes('cần thơ') || s.includes('can tho') || s.includes('cantho')) return 'Cần Thơ';

                return regName.normalize('NFC').trim();

            }



            // 3. Chart Regions (Pending Tiền Theo Khu Vực)

            const regTienMap = {};

            FIXED_REGIONS.forEach(k => { regTienMap[k] = { name: k, tien: 0, count: 0 }; });

            FILTERED_TIEN.forEach(x => {

                const k = normalizeRegionName(x.khu_vuc);

                if (!regTienMap[k]) regTienMap[k] = { name: k, tien: 0, count: 0 };

                regTienMap[k].tien += (Number(x.amount) || 0);

                regTienMap[k].count += 1;

            });



            // Lọc danh sách hiển thị theo bộ lọc đang chọn nhưng luôn giữ đúng thứ tự cố định

            let rTienNames = FIXED_REGIONS.filter(k => {

                if (filterVung !== 'ALL') return normalizeRegionName(filterVung) === k;

                if (filterMien === 'North') return ['Hà Nội', 'Hải Phòng', 'Đà Nẵng'].includes(k);

                if (filterMien === 'South') return ['Nha Trang', 'HCM', 'Cần Thơ'].includes(k);

                return true;

            });

            Object.keys(regTienMap).forEach(k => {

                if (!FIXED_REGIONS.includes(k) && regTienMap[k].tien > 0 && !rTienNames.includes(k)) {

                    rTienNames.push(k);

                }

            });



            const rTienVals = rTienNames.map(k => Math.round((regTienMap[k]?.tien || 0) / 1000000));



            chartRegionsInstance.setOption({

                tooltip: { 

                    trigger: 'axis', 

                    axisPointer: { type: 'shadow' },

                    formatter: params => {

                        const p = params[0];

                        const item = regTienMap[p.name] || {};

                        const valTr = p.value || 0;

                        const fullVnd = formatExactMoney(item.tien || (valTr * 1e6));

                        const shortMoney = formatMoney(item.tien || (valTr * 1e6));

                        return `

                            <div style="font-size:12px; line-height:1.5; min-width:170px;">

                                <div style="font-weight:700; margin-bottom:4px; color:#1e293b; border-bottom:1px solid #f1f5f9; padding-bottom:2px;">

                                    📍 ${p.name}

                                </div>

                                <div style="display:flex; justify-content:space-between; gap:12px; margin-bottom:2px;">

                                    <span style="color:#64748b;">💵 Pending Tiền:</span>

                                    <b style="color:#dc2626;">${shortMoney}</b>

                                </div>

                                <div style="font-size:11px; color:#94a3b8; margin-top:2px;">

                                    Chi tiết: ${fullVnd}

                                </div>

                            </div>

                        `;

                    }

                },

                grid: { top: 20, left: 80, right: 65, bottom: 20 },

                xAxis: { type: 'value', name: 'Mil VNĐ', axisLabel: { fontSize: 10 } },

                yAxis: { type: 'category', data: rTienNames, inverse: true, axisLabel: { fontSize: 10, fontWeight: 'bold' } },

                series: [{

                    type: 'bar',

                    data: rTienVals,

                    barMaxWidth: 22,

                    itemStyle: { color: '#e11d48', borderRadius: [0, 4, 4, 0] },

                    label: {

                        show: true,

                        position: 'right',

                        distance: 6,

                        fontSize: 10,

                        fontWeight: 'bold',

                        color: '#be123c',

                        formatter: params => {

                            const v = params.value;

                            if (!v || v === 0) return '0 Mil';

                            if (v >= 1000) return (v / 1000).toFixed(1).replace(/\.0$/, '') + ' Bil';

                            return Math.round(v) + ' Mil';

                        }

                    }

                }]

            }, true);



            // 4. Chart Regions Hang (Pending Hàng Theo Khu Vực - thứ tự cố định đồng bộ)

            const regHangMap = {};

            let totalHangEA = 0;

            FIXED_REGIONS.forEach(k => { regHangMap[k] = { name: k, ea: 0, tien: 0, count: 0, npps: new Set() }; });

            FILTERED_HANG.forEach(x => {

                const k = normalizeRegionName(x.khu_vuc);

                if (!regHangMap[k]) regHangMap[k] = { name: k, ea: 0, tien: 0, count: 0, npps: new Set() };

                const ea = Number(x.ea) || 0;

                const tien = Number(x.amount) || 0;

                regHangMap[k].ea += ea;

                regHangMap[k].tien += tien;

                regHangMap[k].count += 1;

                if (x.code_npp) regHangMap[k].npps.add(x.code_npp);

                totalHangEA += ea;

            });



            let rHangNames = FIXED_REGIONS.filter(k => {

                if (filterVung !== 'ALL') return normalizeRegionName(filterVung) === k;

                if (filterMien === 'North') return ['Hà Nội', 'Hải Phòng', 'Đà Nẵng'].includes(k);

                if (filterMien === 'South') return ['Nha Trang', 'HCM', 'Cần Thơ'].includes(k);

                return true;

            });

            Object.keys(regHangMap).forEach(k => {

                if (!FIXED_REGIONS.includes(k) && regHangMap[k].ea > 0 && !rHangNames.includes(k)) {

                    rHangNames.push(k);

                }

            });



            const rHangVals = rHangNames.map(k => regHangMap[k]?.ea || 0);



            chartStorageInstance.setOption({

                tooltip: { 

                    trigger: 'axis', 

                    axisPointer: { type: 'shadow' },

                    formatter: params => {

                        const p = params[0];

                        const item = regHangMap[p.name] || {};

                        const ea = item.ea || p.value || 0;

                        const tien = item.tien || 0;

                        const pct = totalHangEA > 0 ? (ea / totalHangEA * 100).toFixed(1) : '0';

                        const nppCount = item.npps ? item.npps.size : 0;

                        

                        let tienHtml = '';

                        if (tien > 0) {

                            tienHtml = `

                                <div style="display:flex; justify-content:space-between; gap:12px; margin-bottom:2px;">

                                    <span style="color:#64748b;">💵 Thành tiền:</span>

                                    <b style="color:#dc2626;">${formatMoney(tien)}</b>

                                </div>

                                <div style="font-size:11px; color:#94a3b8; margin-bottom:2px;">

                                    Chi tiết: ${formatExactMoney(tien)}

                                </div>

                            `;

                        } else {

                            tienHtml = `

                                <div style="display:flex; justify-content:space-between; gap:12px; margin-bottom:2px;">

                                    <span style="color:#64748b;">💵 Thành tiền:</span>

                                    <span style="color:#94a3b8; font-style:italic;">Chờ cập nhật giá</span>

                                </div>

                            `;

                        }



                        return `

                            <div style="font-size:12px; line-height:1.5; min-width:180px;">

                                <div style="font-weight:700; margin-bottom:5px; color:#1e293b; border-bottom:1px solid #f1f5f9; padding-bottom:3px;">

                                    📦 ${p.name}

                                </div>

                                <div style="display:flex; justify-content:space-between; gap:12px; margin-bottom:2px;">

                                    <span style="color:#64748b;">📦 Số lượng:</span>

                                    <b style="color:#2563eb;">${formatExactNumber(ea)} EA</b> (${formatNumber(ea)} EA)

                                </div>

                                ${tienHtml}

                                <div style="display:flex; justify-content:space-between; gap:12px; margin-bottom:2px;">

                                    <span style="color:#64748b;">📊 Tỷ trọng toàn quốc:</span>

                                    <b style="color:#0f172a;">${pct}%</b>

                                </div>

                                ${nppCount > 0 ? `

                                <div style="display:flex; justify-content:space-between; gap:12px; font-size:11px; color:#64748b; border-top:1px dashed #e2e8f0; padding-top:3px; margin-top:3px;">

                                    <span>🏬 Số NPP pending:</span>

                                    <b>${nppCount} NPP</b>

                                </div>` : ''}

                            </div>

                        `;

                    }

                },

                grid: { top: 20, left: 80, right: 110, bottom: 20 },

                xAxis: { 

                    type: 'value', 

                    name: 'EA', 

                    axisLabel: { 

                        fontSize: 10,

                        formatter: v => v >= 1000 ? (v / 1000).toFixed(0) + ' K' : v

                    } 

                },

                yAxis: { 

                    type: 'category', 

                    data: rHangNames, 

                    inverse: true, 

                    axisLabel: { fontSize: 10, fontWeight: 'bold' } 

                },

                series: [{

                    type: 'bar',

                    data: rHangVals,

                    barMaxWidth: 22,

                    itemStyle: { color: '#2563eb', borderRadius: [0, 4, 4, 0] },

                    label: {

                        show: true,

                        position: 'right',

                        distance: 6,

                        fontSize: 10,

                        fontWeight: 'bold',

                        color: '#1d4ed8',

                        formatter: params => {

                            const item = regHangMap[params.name] || {};

                            const ea = params.value || item.ea || 0;

                            const eaStr = `${formatNumber(ea)} EA`;

                            if (item.tien && item.tien > 0) {

                                return `${eaStr} (${formatMoney(item.tien)})`;

                            }

                            return eaStr;

                        }

                    }

                }]

            }, true);

        }



        // --- 11. TAB SWITCHING ---

        function switchTab(tabId) {

            document.querySelectorAll(".tab-content").forEach(el => el.classList.add("hidden"));

            document.querySelectorAll(".tab-btn, .nav-tab-btn").forEach(el => el.classList.remove("active"));



            const target = document.getElementById(tabId);

            if (target) target.classList.remove("hidden");



            const btn = document.getElementById(`btn-${tabId}`);

            if (btn) btn.classList.add("active");



            if (tabId === 'tab-overview') {

                setTimeout(() => {

                    if (chartReasonsInstance) chartReasonsInstance.resize();

                    if (chartMonthlyInstance) chartMonthlyInstance.resize();

                    if (chartRegionsInstance) chartRegionsInstance.resize();

                    if (chartStorageInstance) chartStorageInstance.resize();

                }, 100);

            }

        }



        // --- 12. EXCEL EXPORTS (SHEETJS) ---

        function exportTienToExcel() {

            if (typeof XLSX === 'undefined') {

                alert("Thư viện Excel chưa được tải.");

                return;

            }



            const rows = getTabTienRows().map((r, i) => ({

                "STT": i + 1,

                "Năm": r.nam,

                "Tháng": r.thang,

                "Miền": r.mien,

                "Khu Vực": r.khu_vuc,

                "GSBH": r.ten_gsbh,

                "Mã NPP": r.code_npp,

                "Tên Nhà Phân Phối": r.ten_npp,

                "Tên Chương Trình KM": r.ten_ct,

                "Nhóm CT": r.group_ct,

                "Số Tiền Pending (VNĐ)": r.amount,

                "Lý Do Pending": r.reason,

                "Chứng Từ Thiếu": (r.missing_docs || []).join(", "),

                "Tuổi Nợ": r.aging

            }));



            const ws = XLSX.utils.json_to_sheet(rows);

            const wb = XLSX.utils.book_new();

            XLSX.utils.book_append_sheet(wb, ws, "Pending_Tien");

            XLSX.writeFile(wb, `CJFoods_Tracking_TienKM_${new Date().toISOString().slice(0,10)}.xlsx`);

        }



        function exportHangToExcel() {

            if (typeof XLSX === 'undefined') {

                alert("Thư viện Excel chưa được tải.");

                return;

            }



            const rows = getTabHangRows().map((r, i) => ({

                "STT": i + 1,

                "Năm": r.nam,

                "Tháng": r.thang,

                "Miền": r.mien,

                "Khu Vực": r.khu_vuc,

                "GSBH": r.ten_gsbh,

                "Mã NPP": r.code_npp,

                "Tên Nhà Phân Phối": r.ten_npp,

                "Tên Chương Trình": r.ten_ct,

                "Mã Sản Phẩm": r.ma_sp,

                "Tên Sản Phẩm": r.ten_sp,

                "Bảo Quản": r.storage,

                "Số Lượng KM (EA)": r.ea,

                "Đơn Giá Mua NPP": r.gia_npp || 0,

                "Thành Tiền (VNĐ - Tạm tính giá mua NPP)": r.amount || 0,

                "Lý Do Pending": r.reason,

                "Chi Tiết Pending": r.reason_detail,

                "Tuổi Nợ": r.aging

            }));



            const ws = XLSX.utils.json_to_sheet(rows);

            const wb = XLSX.utils.book_new();

            XLSX.utils.book_append_sheet(wb, ws, "Pending_Hang");

            XLSX.writeFile(wb, `CJFoods_Tracking_HangKM_${new Date().toISOString().slice(0,10)}.xlsx`);

        }



        function exportCurrentNppDossier() {

            if (!selectedNppCode) return;

            const tienList = TIEN_DATA.filter(x => x.code_npp === selectedNppCode);

            const hangList = HANG_DATA.filter(x => x.code_npp === selectedNppCode);



            const wb = XLSX.utils.book_new();



            if (tienList.length > 0) {

                const wsT = XLSX.utils.json_to_sheet(tienList.map((r, i) => ({

                    "STT": i + 1, "Tháng": r.thang, "Chương Trình": r.ten_ct, "Số Tiền (VNĐ)": r.amount, "Chứng Từ Thiếu": (r.missing_docs||[]).join(', '), "Tuổi Nợ": r.aging

                })));

                XLSX.utils.book_append_sheet(wb, wsT, "Tien_KM");

            }



            if (hangList.length > 0) {

                const wsH = XLSX.utils.json_to_sheet(hangList.map((r, i) => ({

                    "STT": i + 1, "Tháng": r.thang, "Chương Trình": r.ten_ct, "Mã SP": r.ma_sp, "Tên Sản Phẩm": r.ten_sp, "Số Lượng KM (EA)": r.ea, "Thành Tiền (VNĐ)": r.amount || 0, "Lý Do": r.reason, "Chi Tiết": r.reason_detail

                })));

                XLSX.utils.book_append_sheet(wb, wsH, "Hang_KM");

            }



            XLSX.writeFile(wb, `CJFoods_DoiSoat_NPP_${selectedNppCode}_${new Date().toISOString().slice(0,10)}.xlsx`);

        }



        function exportAllToExcel() {

            if (typeof XLSX === 'undefined') {

                alert("Thư viện Excel chưa được tải.");

                return;

            }

            const wb = XLSX.utils.book_new();



            // Sheet 1: Tiền

            const rowsTien = getTabTienRows().map((r, i) => ({

                "STT": i + 1,

                "Năm": r.nam,

                "Tháng": r.thang,

                "Miền": r.mien,

                "Khu Vực": r.khu_vuc,

                "GSBH": r.ten_gsbh,

                "Mã NPP": r.code_npp,

                "Tên Nhà Phân Phối": r.ten_npp,

                "Tên Chương Trình KM": r.ten_ct,

                "Nhóm CT": r.group_ct,

                "Số Tiền Pending (VNĐ)": r.amount,

                "Lý Do Pending": r.reason,

                "Chứng Từ Thiếu": (r.missing_docs || []).join(", "),

                "Tuổi Nợ": r.aging

            }));

            const wsT = XLSX.utils.json_to_sheet(rowsTien);

            XLSX.utils.book_append_sheet(wb, wsT, "KM_Tien");



            // Sheet 2: Hàng

            const rowsHang = getTabHangRows().map((r, i) => ({

                "STT": i + 1,

                "Năm": r.nam,

                "Tháng": r.thang,

                "Miền": r.mien,

                "Khu Vực": r.khu_vuc,

                "GSBH": r.ten_gsbh,

                "Mã NPP": r.code_npp,

                "Tên Nhà Phân Phối": r.ten_npp,

                "Tên Chương Trình": r.ten_ct,

                "Mã Sản Phẩm": r.ma_sp,

                "Tên Sản Phẩm": r.ten_sp,

                "Bảo Quản": r.storage,

                "Số Lượng KM (EA)": r.ea,

                "Đơn Giá Mua NPP": r.gia_npp || 0,

                "Thành Tiền (VNĐ - Tạm tính giá mua NPP)": r.amount || 0,

                "Lý Do Pending": r.reason,

                "Chi Tiết Pending": r.reason_detail,

                "Tuổi Nợ": r.aging

            }));

            const wsH = XLSX.utils.json_to_sheet(rowsHang);

            XLSX.utils.book_append_sheet(wb, wsH, "KM_Hang");



            XLSX.writeFile(wb, `CJFoods_Tracking_CTKM_TongHop_${new Date().toISOString().slice(0,10)}.xlsx`);

        }



        function openExportChoiceModal() {

            const m = document.getElementById("ctkm-modal-export-choice");

            if (m) m.classList.remove("hidden");

        }



        function closeExportChoiceModal() {

            const m = document.getElementById("ctkm-modal-export-choice");

            if (m) m.classList.add("hidden");

        }



        function exportGsbhToExcel() {

            const officeMap = {};

            FILTERED_TIEN.forEach(x => {

                const o = x.office || "Chưa rõ Office";

                if (!officeMap[o]) officeMap[o] = { name: o, vung: x.vung || "Khác", mien: x.mien || "South", tien: 0, hang_ea: 0, hang_tien: 0, npps: new Set(), aging_high: 0 };

                officeMap[o].tien += (x.amount || 0);

                if (x.code_npp) officeMap[o].npps.add(x.code_npp);

                if (x.thang <= 6) officeMap[o].aging_high += (x.amount || 0);

            });



            FILTERED_HANG.forEach(x => {

                const o = x.office || "Chưa rõ Office";

                if (!officeMap[o]) officeMap[o] = { name: o, vung: x.vung || "Khác", mien: x.mien || "South", tien: 0, hang_ea: 0, hang_tien: 0, npps: new Set(), aging_high: 0 };

                officeMap[o].hang_ea += (x.ea || 0);

                officeMap[o].hang_tien += (x.amount || 0);

                if (x.code_npp) officeMap[o].npps.add(x.code_npp);

            });



            const rows = Object.values(officeMap).sort((a,b)=>b.tien - a.tien).map((g, i) => ({

                "Xếp Hạng": i + 1,

                "Văn Phòng (Office)": g.name,

                "Vùng Phụ Trách": g.vung,

                "Miền": g.mien === 'North' ? 'Miền Bắc' : 'Miền Nam',

                "Số NPP Nợ KM": g.npps.size,

                "Tổng Tiền Nợ (VNĐ)": g.tien,

                "Tổng Hàng Nợ (EA)": g.hang_ea,

                "Tổng Hàng Thành Tiền (VNĐ)": g.hang_tien,

                "Nợ Quá Hạn >60 Ngày (VNĐ)": g.aging_high,

                "Trạng Thái": g.aging_high > 0 ? "Cần đôn đốc khẩn" : "Bình thường"

            }));



            const ws = XLSX.utils.json_to_sheet(rows);

            const wb = XLSX.utils.book_new();

            XLSX.utils.book_append_sheet(wb, ws, "KeHoach_DonDoc_Office");

            XLSX.writeFile(wb, `CJFoods_DonDoc_Office_${new Date().toISOString().slice(0,10)}.xlsx`);

        }



        // --- 13. USER MODAL & RBAC SWITCHER ---

        function openUserModal() {

            document.getElementById("modalUser").classList.remove("hidden");

        }

        function closeUserModal() {

            document.getElementById("modalUser").classList.add("hidden");

        }

        function switchRole(role, label) {

            currentRole = role;

            const elRole = document.getElementById("lblUserRole");

            if (elRole) elRole.innerText = label;

            closeUserModal();

            applyFilters();

        }



        // =========================================================================

        // --- 14. TREE TABLE HIERARCHY (CẤU TRÚC DIM_CHANNEL) ---

        // =========================================================================

        let currentTreeSearch = '';

        let treeOpenNodes = new Set(['root', 'mien-North', 'mien-South']);

        let TREE_NODES = [];

        let treeMonthColumnsExpanded = (typeof window !== 'undefined' && window.innerWidth <= 768) ? false : true; // Mobile mặc định thu gọn cột tháng để dễ xem tổng & pending

        let treeMetricMode = 'ALL'; // 'ALL': Toàn diện (Tiền & Hàng), 'TIEN': Chỉ tiền, 'HANG': Chỉ hàng, 'DOC': Nợ chứng từ



        function getTreeActiveMonths() {

            return (METADATA && METADATA.months && METADATA.months.length > 0)

                ? METADATA.months

                : Array.from({length: 8}, (_, i) => ({ year: 2026, month: i + 1, key: `2026_${i + 1}`, label: `Tháng ${i + 1}`, short_label: `T${i + 1}` }));

        }



        function toggleMonthColumns() {

            treeMonthColumnsExpanded = !treeMonthColumnsExpanded;

            const activeMonths = getTreeActiveMonths();

            const countStr = activeMonths.length > 0 ? `${activeMonths.length} ` : '';

            const btnText = document.getElementById("btnToggleMonthColsText");

            const btnIcon = document.getElementById("btnToggleMonthColsIcon");

            if (btnText && btnIcon) {

                btnText.innerText = treeMonthColumnsExpanded ? "Thu Gọn Cột Tháng" : `Bung ${countStr}Cột Tháng`;

                btnIcon.innerText = treeMonthColumnsExpanded ? "⊟" : "⊞";

            }

            renderTreeHeader();

            renderTreeTable();

        }



        function setTreeMetric(metric) {

            treeMetricMode = metric;

            ['ALL', 'TIEN', 'HANG', 'DOC'].forEach(m => {

                const btn = document.getElementById(`metricBtn-${m}`);

                if (btn) {

                    if (m === metric) {

                        btn.className = "px-2.5 py-1 rounded text-xs font-bold bg-slate-800 text-white transition";

                    } else {

                        btn.className = "px-2.5 py-1 rounded text-xs font-medium text-slate-600 hover:bg-slate-100 transition";

                    }

                }

            });

            if (!treeMonthColumnsExpanded) {

                treeMonthColumnsExpanded = true;

                const btnText = document.getElementById("btnToggleMonthColsText");

                const btnIcon = document.getElementById("btnToggleMonthColsIcon");

                if (btnText && btnIcon) {

                    btnText.innerText = "Thu Gọn Cột Tháng";

                    btnIcon.innerText = "⊟";

                }

                renderTreeHeader();

            }

            renderTreeTable();

        }



        function scrollTableHoriz(containerId, delta) {

            const el = document.getElementById(containerId);

            if (el) {

                el.scrollBy({ left: delta, behavior: 'smooth' });

            }

        }



        function scrollTreeHoriz(delta) {

            scrollTableHoriz('treeScrollContainer', delta);

        }



        function onTreeSearch() {

            currentTreeSearch = (document.getElementById("txtTreeSearch")?.value || "").trim().toLowerCase();

            if (currentTreeSearch) {

                TREE_NODES.forEach(n => {

                    if (n.name.toLowerCase().includes(currentTreeSearch) || (n.code && n.code.toLowerCase().includes(currentTreeSearch))) {

                        let cur = n;

                        while (cur && cur.parentId) {

                            treeOpenNodes.add(cur.parentId);

                            cur = TREE_NODES.find(x => x.id === cur.parentId);

                        }

                    }

                });

            }

            renderTreeTable();

        }



        function toggleTreeNode(nodeId) {

            if (treeOpenNodes.has(nodeId)) {

                treeOpenNodes.delete(nodeId);

            } else {

                treeOpenNodes.add(nodeId);

            }

            renderTreeTable();

        }



        function expandTreeToLevel(lvl) {

            treeOpenNodes.clear();

            TREE_NODES.forEach(n => {

                if (n.level < lvl) {

                    treeOpenNodes.add(n.id);

                }

            });

            renderTreeTable();

        }



        function expandAllTree() {

            TREE_NODES.forEach(n => treeOpenNodes.add(n.id));

            renderTreeTable();

        }



        function collapseAllTree() {

            treeOpenNodes.clear();

            treeOpenNodes.add('root');

            renderTreeTable();

        }



        function createTreeNode(id, level, parentId, label, name, code, fullName = '') {

            const node = {

                id, level, parentId, label, name, code, fullName,

                tien: 0, tien_paid: 0, tien_doc: 0, tien_other: 0,

                hang_ea: 0, hang_tien: 0, hang_paid_ea: 0, hang_paid_tien: 0,

                hang_doc_ea: 0, hang_doc_tien: 0, hang_other_ea: 0, hang_other_tien: 0,

                count_ct: new Set(), docs: new Set(), npp_set: new Set(), children: [],

                months: {}

            };



            const activeMonths = getTreeActiveMonths();

            activeMonths.forEach(mObj => {

                const k = mObj.key || `${mObj.year}_${mObj.month}`;

                node.months[k] = {

                    year: mObj.year,

                    month: mObj.month,

                    key: k,

                    label: mObj.label,

                    short_label: mObj.short_label,

                    tien: 0, tien_paid: 0, tien_doc: 0, tien_other: 0,

                    hang_ea: 0, hang_tien: 0, hang_paid_ea: 0, hang_paid_tien: 0,

                    hang_doc_ea: 0, hang_doc_tien: 0, hang_other_ea: 0, hang_other_tien: 0,

                    count_ct: new Set(), docs: new Set()

                };

            });

            return node;

        }



        // Helper format Line 2 (Trả bằng hàng: hiển thị số lượng EA và thành tiền VNĐ sau khi có giá)

        function formatHangCell(ea, tien, isRoot = false, customColor = null) {

            if (ea === 0 && (!tien || tien === 0)) {

                return `<div class="text-[10px] tabular-nums ${isRoot ? 'tree-val-hang-zero font-mono' : 'text-slate-300 font-mono'}">-</div>`;

            }

            const eaFormatted = formatNumber(ea) + ' EA';

            const hasPrice = (tien && tien > 0);

            const tienFormatted = hasPrice ? formatMoney(tien) : '';

            

            let cls = isRoot 

                ? (customColor || 'tree-val-hang') 

                : (customColor || 'tree-val-hang');

                

            let content = hasPrice 

                ? `<span class="whitespace-nowrap">${eaFormatted}</span> <span class="opacity-70 font-normal">•</span> <span class="whitespace-nowrap font-bold">${tienFormatted}</span>`

                : `<span class="whitespace-nowrap">${eaFormatted}</span>`;

                

            let tooltip = hasPrice 

                ? `${formatExactNumber(ea)} EA = ${formatExactMoney(tien)}` 

                : `${formatExactNumber(ea)} EA (Chờ cập nhật đơn giá)`;



            return `<div class="text-[10px] sm:text-[11px] tabular-nums whitespace-nowrap leading-tight mt-0.5 ${cls}" title="${tooltip}">${content}</div>`;

        }



        function buildAndRenderTree() {

            let tList = FILTERED_TIEN;

            let hList = FILTERED_HANG;



            const rootNode = createTreeNode('root', 0, null, 'TOÀN QUỐC (KÊNH GT)', 'TOÀN QUỐC (KÊNH GT)', 'ALL');

            const nodeMap = { 'root': rootNode };



            const processRecord = (r, isTien) => {

                const mien = r.mien || 'South';

                const vung = r.vung || r.khu_vuc || 'Khác';

                const office = r.office || 'Chưa phân bổ Office';

                const gsbh = r.ten_gsbh || 'Chưa phân bổ';

                const nppCode = r.code_npp || 'UNKNOWN';

                const nppName = r.ten_npp || nppCode;

                const nppFullName = r.full_name_npp || nppName;

                const mKey = `${r.nam || 2026}_${r.thang}`;



                const mienId = `mien-${mien}`;

                const vungId = `vung-${mien}-${vung}`;

                const officeId = `office-${mien}-${vung}-${office}`;

                const nppId = `npp-${nppCode}`;



                // Init Mien

                if (!nodeMap[mienId]) {

                    const mName = mien === 'North' ? 'Miền Bắc' : (mien === 'South' ? 'Miền Nam' : mien);

                    nodeMap[mienId] = createTreeNode(mienId, 1, 'root', mName, mName, mien);

                    rootNode.children.push(mienId);

                }



                // Init Vung

                if (!nodeMap[vungId]) {

                    nodeMap[vungId] = createTreeNode(vungId, 2, mienId, `Vùng ${vung}`, vung, vung);

                    nodeMap[mienId].children.push(vungId);

                }



                // Init Office (Thay thế cấp tên GSBH bằng cấp Office)

                if (!nodeMap[officeId]) {

                    nodeMap[officeId] = createTreeNode(officeId, 3, vungId, `Office: ${office}`, office, office);

                    nodeMap[vungId].children.push(officeId);

                }



                // Init NPP (sử dụng tên ngắn Sold-to Name từ dim_office và lưu tên pháp lý đầy đủ)

                if (!nodeMap[nppId]) {

                    nodeMap[nppId] = createTreeNode(nppId, 4, officeId, `${nppCode} - ${nppName}`, nppName, nppCode, nppFullName);

                    nodeMap[officeId].children.push(nppId);

                }



                // Aggregate values to all 4 levels + root

                const nodes = [rootNode, nodeMap[mienId], nodeMap[vungId], nodeMap[officeId], nodeMap[nppId]];

                nodes.forEach(n => {

                    n.npp_set.add(nppCode);

                    if (r.ten_ct) n.count_ct.add(r.ten_ct);

                    (r.missing_docs || []).forEach(d => n.docs.add(d));



                    if (isTien) {

                        const amt = (r.amount || 0);

                        n.tien += amt;

                        if (r.reason === 'Thiếu chứng từ') {

                            n.tien_doc += amt;

                        } else if (r.reason === 'Đã xử lý / Đã trả') {

                            n.tien_paid += amt;

                        } else {

                            n.tien_other += amt;

                        }

                    } else {

                        const ea = (r.ea || 0);

                        const amt = (r.amount || 0);

                        n.hang_ea += ea;

                        n.hang_tien += amt;

                        if (r.reason === 'Thiếu chứng từ') {

                            n.hang_doc_ea += ea;

                            n.hang_doc_tien += amt;

                        } else if (r.reason === 'Đã xử lý / Đã trả') {

                            n.hang_paid_ea += ea;

                            n.hang_paid_tien += amt;

                        } else {

                            n.hang_other_ea += ea;

                            n.hang_other_tien += amt;

                        }

                    }



                    // Month-specific dynamic aggregation

                    if (n.months) {

                        const mData = n.months[mKey] || n.months[r.thang];

                        if (mData) {

                            if (r.ten_ct) mData.count_ct.add(r.ten_ct);

                            (r.missing_docs || []).forEach(d => mData.docs.add(d));



                            if (isTien) {

                                const amt = (r.amount || 0);

                                mData.tien += amt;

                                if (r.reason === 'Thiếu chứng từ') {

                                    mData.tien_doc += amt;

                                } else if (r.reason === 'Đã xử lý / Đã trả') {

                                    mData.tien_paid += amt;

                                } else {

                                    mData.tien_other += amt;

                                }

                            } else {

                                const ea = (r.ea || 0);

                                const amt = (r.amount || 0);

                                mData.hang_ea += ea;

                                mData.hang_tien += amt;

                                if (r.reason === 'Thiếu chứng từ') {

                                    mData.hang_doc_ea += ea;

                                    mData.hang_doc_tien += amt;

                                } else if (r.reason === 'Đã xử lý / Đã trả') {

                                    mData.hang_paid_ea += ea;

                                    mData.hang_paid_tien += amt;

                                } else {

                                    mData.hang_other_ea += ea;

                                    mData.hang_other_tien += amt;

                                }

                            }

                        }

                    }

                });

            };



            tList.forEach(r => processRecord(r, true));

            hList.forEach(r => processRecord(r, false));



            TREE_NODES = [];

            const traverse = (nodeId) => {

                const node = nodeMap[nodeId];

                if (!node) return;

                TREE_NODES.push(node);

                node.children.sort((a, b) => {

                    const nA = nodeMap[a];

                    const nB = nodeMap[b];

                    return (nB.tien + nB.hang_ea) - (nA.tien + nA.hang_ea);

                });

                node.children.forEach(cId => traverse(cId));

            };

            traverse('root');



            renderTreeHeader();

            renderTreeTable();

        }



        function renderTreeHeader() {

            const thead = document.getElementById("km-tree-thead");

            if (!thead) return;



            const activeMonths = getTreeActiveMonths();



            if (treeMonthColumnsExpanded) {

                let monthThs = activeMonths.map((mObj, idx) => {

                    const borderCls = (idx === activeMonths.length - 1) ? 'border-r-2 border-slate-300' : 'border-r border-slate-200';

                    return `

                        <th class="text-center min-w-[110px] ${borderCls}">

                            <div>${mObj.label}</div>

                            <div class="text-[9px] font-normal text-slate-500 font-mono">Tiền • Hàng (Bil/Mil)</div>

                        </th>

                    `;

                }).join('');



                thead.innerHTML = `

                    <tr>

                        <th class="th-tree-col text-left">

                            <div>Phân Cấp Quản Trị GT</div>

                            <div class="text-[9px] font-normal text-slate-500 font-mono">Miền ➔ Vùng ➔ Office ➔ NPP</div>

                        </th>

                        ${monthThs}

                        <th class="text-center min-w-[65px]">Số CT</th>

                        <th class="text-right min-w-[145px] bg-red-50 text-red-800 font-black">

                            <div>TỔNG CẢ NĂM</div>

                            <div class="text-[9px] font-semibold text-red-600 font-mono">Tiền (Bil/Mil) • Hàng (EA)</div>

                        </th>

                        <th class="text-right min-w-[110px] text-emerald-700">

                            <div>Đã Trả / Xong</div>

                            <div class="text-[9px] font-normal text-emerald-600 font-mono">Tiền • Hàng (Bil/Mil)</div>

                        </th>

                        <th class="text-right min-w-[130px] text-red-600 font-black">

                            <div>Pending</div>

                            <div class="text-[9px] font-normal text-red-500 font-mono">Tiền • Hàng (Bil/Mil)</div>

                        </th>

                        <th class="text-center min-w-[85px]">Chứng Từ</th>

                        <th class="text-center min-w-[95px]">% Nợ CT</th>

                    </tr>

                `;

            } else {

                thead.innerHTML = `

                    <tr>

                        <th class="th-tree-col text-left">

                            <div>Phân Cấp Quản Trị GT</div>

                            <div class="text-[9px] font-normal text-slate-500 font-mono">Miền ➔ Vùng ➔ Office ➔ NPP</div>

                        </th>

                        <th class="text-center min-w-[120px] bg-slate-200 hover:bg-slate-300 cursor-pointer text-slate-800 transition" onclick="toggleMonthColumns()" title="Bấm để bung ${activeMonths.length} cột tháng">

                            <span class="inline-flex items-center gap-1 font-bold">⊞ Bung ${activeMonths.length} Tháng</span>

                        </th>

                        <th class="text-center min-w-[65px]">Số CT</th>

                        <th class="text-right min-w-[145px] bg-red-50 text-red-800 font-black">

                            <div>TỔNG CẢ NĂM</div>

                            <div class="text-[9px] font-semibold text-red-600 font-mono">Tiền (Bil/Mil) • Hàng (EA)</div>

                        </th>

                        <th class="text-right min-w-[110px] text-emerald-700">

                            <div>Đã Trả / Xong</div>

                            <div class="text-[9px] font-normal text-emerald-600 font-mono">Tiền • Hàng (Bil/Mil)</div>

                        </th>

                        <th class="text-right min-w-[130px] text-red-600 font-black">

                            <div>Pending</div>

                            <div class="text-[9px] font-normal text-red-500 font-mono">Tiền • Hàng (Bil/Mil)</div>

                        </th>

                        <th class="text-right min-w-[130px] text-amber-700">

                            <div>Pending Chứng Từ</div>

                            <div class="text-[9px] font-normal text-amber-600 font-mono">Tiền • Hàng (Bil/Mil)</div>

                        </th>

                        <th class="text-right min-w-[115px] text-blue-700">

                            <div>Pending Vận Hành</div>

                            <div class="text-[9px] font-normal text-blue-500 font-mono">Hàng EA</div>

                        </th>

                        <th class="text-center min-w-[85px]">Chứng Từ Thiếu</th>

                        <th class="text-center min-w-[95px]">% Nợ CT</th>

                    </tr>

                `;

            }

        }



        function renderTreeTable() {

            const tbody = document.getElementById("km-tree-tbody");

            if (!tbody) return;



            const activeMonths = getTreeActiveMonths();



            const tbl = document.getElementById("table-km-rtm-tree");

            if (tbl) {

                const baseWidth = 980;

                const dynamicWidth = treeMonthColumnsExpanded ? (baseWidth + activeMonths.length * 115) : 1200;

                tbl.style.minWidth = `${dynamicWidth}px`;

            }



            if (TREE_NODES.length === 0) {

                tbody.innerHTML = `<tr><td colspan="15" class="p-8 text-center text-slate-400 font-medium">Không có dữ liệu phù hợp với bộ lọc</td></tr>`;

                return;

            }



            const root = TREE_NODES[0];

            const summaryEl = document.getElementById("treeSummaryStats");

            if (summaryEl) {

                const hangValStr = root.hang_tien > 0 ? ` (${formatMoney(root.hang_tien)})` : '';

                summaryEl.innerText = `Toàn Quốc • Tiền: ${formatMoney(root.tien)} • Hàng: ${formatNumber(root.hang_ea)} EA${hangValStr} • ${root.npp_set.size} NPP`;

                const hangExactStr = root.hang_tien > 0 ? ` (${formatExactMoney(root.hang_tien)})` : '';

                summaryEl.title = `Toàn Quốc • Tiền: ${formatExactMoney(root.tien)} • Hàng: ${formatExactNumber(root.hang_ea)} EA${hangExactStr} • ${root.npp_set.size} NPP`;

            }



            let html = "";



            TREE_NODES.forEach(node => {

                if (node.level > 0) {

                    let parent = TREE_NODES.find(x => x.id === node.parentId);

                    let shouldShow = true;

                    while (parent) {

                        if (!treeOpenNodes.has(parent.id)) {

                            shouldShow = false;

                            break;

                        }

                        parent = TREE_NODES.find(x => x.id === parent.parentId);

                    }

                    if (!shouldShow && !currentTreeSearch) return;

                }



                if (currentTreeSearch) {

                    const matchSelf = node.name.toLowerCase().includes(currentTreeSearch) || (node.code && node.code.toLowerCase().includes(currentTreeSearch));

                    if (!matchSelf) return;

                }



                const isOpen = treeOpenNodes.has(node.id);

                const hasChildren = node.children && node.children.length > 0;



                let indentPx = node.level * 16;

                let rowBg = "bg-white hover:bg-slate-50";

                let fontClass = "font-normal text-slate-700";

                let badgeClass = "bg-slate-100 text-slate-600";



                if (node.level === 0) {

                    rowBg = "bg-slate-900 text-white font-black hover:bg-slate-950 border-b-2 border-slate-700 shadow-sm";

                    fontClass = "font-black text-white text-xs";

                    badgeClass = "bg-red-600 text-white";

                } else if (node.level === 1) {

                    rowBg = "bg-slate-100 font-bold text-slate-900 hover:bg-slate-200 border-t-2 border-slate-300";

                    fontClass = "font-bold text-slate-900 text-xs";

                    badgeClass = "bg-slate-200 text-slate-800";

                } else if (node.level === 2) {

                    rowBg = "bg-slate-50 font-semibold text-slate-800 hover:bg-slate-100";

                    fontClass = "font-semibold text-slate-800 text-xs";

                    badgeClass = "bg-blue-100 text-blue-800";

                } else if (node.level === 3) {

                    rowBg = "bg-white font-medium text-slate-700 hover:bg-slate-50";

                    fontClass = "font-medium text-slate-700 text-xs";

                    badgeClass = "bg-amber-100 text-amber-800";

                } else if (node.level === 4) {

                    rowBg = "bg-white hover:bg-red-50/40 border-b border-slate-100";

                    fontClass = "text-slate-800 text-xs";

                    badgeClass = "bg-slate-100 text-slate-500";

                }



                const docBadges = Array.from(node.docs).sort().map(d => {

                    let c = "bg-amber-100 text-amber-800";

                    if (d === 'HĐ') c = "bg-red-100 text-red-800";

                    if (d === 'BB') c = "bg-blue-100 text-blue-800";

                    if (d === 'BXNTB') c = "bg-purple-100 text-purple-800";

                    return `<span class="px-1 py-0.2 rounded text-[9px] font-bold ${c}">${d}</span>`;

                }).join(' ') || '<span class="text-slate-300">-</span>';



                const remainingTien = Math.max(0, node.tien - node.tien_paid);

                const remainingHangEA = Math.max(0, node.hang_ea - node.hang_paid_ea);

                const remainingHangTien = Math.max(0, node.hang_tien - node.hang_paid_tien);

                

                const totalPendingQty = node.tien + node.hang_ea;

                const totalDocQty = node.tien_doc + node.hang_doc_ea;

                const pctDoc = totalPendingQty > 0 ? Math.round((totalDocQty / totalPendingQty) * 100) : 0;

                let pctColor = "bg-emerald-500";

                if (pctDoc >= 75) pctColor = "bg-rose-500";

                else if (pctDoc >= 40) pctColor = "bg-amber-500";



                const expanderIcon = hasChildren 

                    ? `<span onclick="toggleTreeNode('${node.id}')" class="inline-flex items-center justify-center w-4 h-4 rounded hover:bg-black/10 cursor-pointer mr-1.5 font-mono text-[11px] select-none transition ${node.level === 0 ? 'text-white hover:bg-white/20' : ''}">${isOpen ? '▼' : '▶'}</span>`

                    : `<span class="inline-block w-4 mr-1.5 text-center text-slate-300 text-[10px]">•</span>`;



                let cellsHtml = "";



                if (treeMonthColumnsExpanded) {

                    // Render dynamic month columns

                    activeMonths.forEach((mObj, idx) => {

                        const k = mObj.key || `${mObj.year}_${mObj.month}`;

                        const mData = (node.months && (node.months[k] || node.months[mObj.month])) ? (node.months[k] || node.months[mObj.month]) : { tien: 0, hang_ea: 0, hang_tien: 0, tien_doc: 0, hang_doc_ea: 0, hang_doc_tien: 0, hang_paid_ea: 0, hang_paid_tien: 0 };

                        const hasVal = mData.tien > 0 || mData.hang_ea > 0;

                        const borderCls = (idx === activeMonths.length - 1) ? "border-r-2 border-slate-300" : "border-r border-slate-100";



                        if (!hasVal) {

                            cellsHtml += `<td class="p-2 text-center text-slate-300 font-mono text-xs ${borderCls}">-</td>`;

                        } else {

                            if (treeMetricMode === 'ALL') {

                                const tienCls = node.level === 0 

                                    ? (mData.tien > 0 ? 'tree-val-tien text-xs sm:text-[13px]' : 'tree-val-tien-zero text-xs')

                                    : (mData.tien > 0 ? 'tree-val-tien text-xs' : 'tree-val-tien-zero text-xs');

                                const tienText = mData.tien > 0 ? formatMoney(mData.tien) : '0 ₫';

                                cellsHtml += `

                                    <td class="p-2 text-right ${borderCls}">

                                        <div class="tabular-nums whitespace-nowrap leading-tight ${tienCls}" title="${formatExactMoney(mData.tien)}">${tienText}</div>

                                        ${formatHangCell(mData.hang_ea, mData.hang_tien, node.level === 0)}

                                    </td>

                                `;

                            } else if (treeMetricMode === 'TIEN') {

                                const tienCls = node.level === 0 

                                    ? (mData.tien > 0 ? 'tree-val-tien text-xs sm:text-[13px]' : 'tree-val-tien-zero text-xs')

                                    : (mData.tien > 0 ? 'text-red-600 font-bold text-xs' : 'text-slate-300 text-xs');

                                cellsHtml += `

                                    <td class="p-2 text-right ${borderCls} tabular-nums whitespace-nowrap ${tienCls}" title="${formatExactMoney(mData.tien)}">

                                        ${mData.tien > 0 ? formatMoney(mData.tien) : (node.level === 0 ? '0 ₫' : '-')}

                                    </td>

                                `;

                            } else if (treeMetricMode === 'HANG') {

                                cellsHtml += `

                                    <td class="p-2 text-right ${borderCls} tabular-nums whitespace-nowrap">

                                        ${formatHangCell(mData.hang_ea, mData.hang_tien, node.level === 0, node.level === 0 ? 'tree-val-hang text-xs' : 'text-blue-600 font-bold text-xs')}

                                    </td>

                                `;

                            } else if (treeMetricMode === 'DOC') {

                                const tienCls = node.level === 0 ? 'text-amber-300 font-black text-xs' : (mData.tien_doc > 0 ? 'text-amber-700 font-bold text-xs' : 'text-slate-400 text-xs');

                                cellsHtml += `

                                    <td class="p-2 text-right ${borderCls}">

                                        <div class="tabular-nums whitespace-nowrap leading-tight ${tienCls}" title="${formatExactMoney(mData.tien_doc)}">${mData.tien_doc > 0 ? formatMoney(mData.tien_doc) : '0 ₫'}</div>

                                        ${formatHangCell(mData.hang_doc_ea, mData.hang_doc_tien, node.level === 0, node.level === 0 ? 'tree-val-paid-hang text-[11px]' : 'text-amber-600 font-medium text-[10px]')}

                                    </td>

                                `;

                            }

                        }

                    });



                    // Số CT Column

                    cellsHtml += `<td class="p-2 text-center font-bold font-mono text-[11px] border-r border-slate-200 ${node.level === 0 ? 'text-white font-black text-xs sm:text-sm' : 'text-slate-700'}">${node.count_ct.size}</td>`;



                    // Total Cả Năm + Summary Columns

                    const colTotalCls = node.level === 0 ? 'tree-col-summary-total' : 'bg-red-50/50 border-r border-red-100';

                    const colPaidCls = node.level === 0 ? 'tree-col-summary-paid border-r border-slate-700' : 'border-r border-slate-100';

                    const colPendingCls = node.level === 0 ? 'tree-col-summary-pending border-r border-slate-700' : 'border-r border-slate-100';



                    cellsHtml += `

                        <td class="p-2 text-right font-medium ${colTotalCls}">

                            <div class="tabular-nums whitespace-nowrap leading-tight ${node.level === 0 ? 'tree-val-tien text-sm' : 'text-slate-900 font-black text-xs'}" title="${formatExactMoney(node.tien)}">${formatMoney(node.tien)}</div>

                            ${formatHangCell(node.hang_ea, node.hang_tien, node.level === 0, node.level === 0 ? 'tree-val-hang text-xs' : 'text-sky-700 font-bold text-[11px]')}

                        </td>

                        <td class="p-2 text-right font-medium ${colPaidCls}">

                            <div class="tabular-nums whitespace-nowrap leading-tight ${node.level === 0 ? 'tree-val-paid-tien text-xs' : 'text-emerald-600 font-medium text-xs'}" title="${formatExactMoney(node.tien_paid)}">${formatMoney(node.tien_paid)}</div>

                            ${formatHangCell(node.hang_paid_ea, node.hang_paid_tien, node.level === 0, node.level === 0 ? 'tree-val-paid-hang text-[11px]' : 'text-emerald-600 font-medium text-[10px]')}

                        </td>

                        <td class="p-2 text-right font-black ${colPendingCls}">

                            <div class="tabular-nums whitespace-nowrap leading-tight ${node.level === 0 ? 'tree-val-pending-tien text-xs sm:text-[13px]' : 'text-red-600 font-bold text-xs'}" title="${formatExactMoney(remainingTien)}">${formatMoney(remainingTien)}</div>

                            ${formatHangCell(remainingHangEA, remainingHangTien, node.level === 0, node.level === 0 ? 'tree-val-hang text-[11px]' : 'text-sky-700 font-bold text-[10px]')}

                        </td>

                        <td class="p-2 text-center space-x-1 ${node.level === 0 ? 'border-r border-slate-700' : 'border-r border-slate-100'} whitespace-nowrap">${docBadges}</td>

                        <td class="p-2 text-center whitespace-nowrap">

                            <div class="flex items-center justify-center space-x-1.5">

                                <div class="w-10 ${node.level === 0 ? 'bg-slate-700' : 'bg-slate-200'} rounded-full h-1.5 overflow-hidden">

                                    <div class="${pctColor} h-1.5 rounded-full" style="width: ${pctDoc}%"></div>

                                </div>

                                <span class="font-bold text-[10px] tabular-nums ${node.level === 0 ? 'text-white font-black text-xs' : 'text-slate-700'}">${pctDoc}%</span>

                            </div>

                        </td>

                    `;

                } else {

                    // Collapsed Month Columns View

                    const colTotalCls = node.level === 0 ? 'tree-col-summary-total' : 'bg-red-50/50 border-r border-red-100';

                    const colPaidCls = node.level === 0 ? 'tree-col-summary-paid border-r border-slate-700' : 'border-r border-slate-100';

                    const colPendingCls = node.level === 0 ? 'tree-col-summary-pending border-r border-slate-700' : 'border-r border-slate-100';

                    const colDocCls = node.level === 0 ? 'tree-col-summary-doc border-r border-slate-700' : 'border-r border-slate-100';



                    cellsHtml += `

                        <td class="p-2.5 text-center cursor-pointer hover:bg-slate-200 transition" onclick="toggleMonthColumns()">

                            <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700">⊞ ${activeMonths.length} Tháng</span>

                        </td>

                        <td class="p-2.5 text-center font-bold font-mono text-[11px] border-r border-slate-200 ${node.level === 0 ? 'text-white font-black text-xs sm:text-sm' : 'text-slate-700'}">${node.count_ct.size}</td>

                        <td class="p-2.5 text-right font-medium ${colTotalCls}">

                            <div class="tabular-nums whitespace-nowrap leading-tight ${node.level === 0 ? 'tree-val-tien text-sm' : 'text-slate-900 font-black text-xs'}" title="${formatExactMoney(node.tien)}">${formatMoney(node.tien)}</div>

                            ${formatHangCell(node.hang_ea, node.hang_tien, node.level === 0, node.level === 0 ? 'tree-val-hang text-xs' : 'text-sky-700 font-bold text-[11px]')}

                        </td>

                        <td class="p-2.5 text-right font-medium ${colPaidCls}">

                            <div class="tabular-nums whitespace-nowrap leading-tight ${node.level === 0 ? 'tree-val-paid-tien text-xs' : 'text-emerald-600 font-medium text-xs'}" title="${formatExactMoney(node.tien_paid)}">${formatMoney(node.tien_paid)}</div>

                            ${formatHangCell(node.hang_paid_ea, node.hang_paid_tien, node.level === 0, node.level === 0 ? 'tree-val-paid-hang text-[11px]' : 'text-emerald-600 font-medium text-[10px]')}

                        </td>

                        <td class="p-2.5 text-right font-black ${colPendingCls}">

                            <div class="tabular-nums whitespace-nowrap leading-tight ${node.level === 0 ? 'tree-val-pending-tien text-xs sm:text-[13px]' : 'text-red-600 font-bold text-xs'}" title="${formatExactMoney(remainingTien)}">${formatMoney(remainingTien)}</div>

                            ${formatHangCell(remainingHangEA, remainingHangTien, node.level === 0, node.level === 0 ? 'tree-val-hang text-[11px]' : 'text-sky-700 font-bold text-[10px]')}

                        </td>

                        <td class="p-2.5 text-right font-semibold ${colDocCls}">

                            <div class="tabular-nums whitespace-nowrap leading-tight ${node.level === 0 ? 'text-amber-300 font-black text-xs sm:text-[13px]' : 'text-amber-700 font-bold text-xs'}" title="${formatExactMoney(node.tien_doc)}">${formatMoney(node.tien_doc)}</div>

                            ${formatHangCell(node.hang_doc_ea, node.hang_doc_tien, node.level === 0, node.level === 0 ? 'tree-val-paid-hang text-[11px]' : 'text-amber-700 font-medium text-[10px]')}

                        </td>

                        <td class="p-2.5 text-right font-medium">

                            <div class="tabular-nums whitespace-nowrap text-xs ${node.level === 0 ? 'text-slate-400' : 'text-slate-400'}">0 ₫</div>

                            ${formatHangCell(node.hang_other_ea, node.hang_other_tien, node.level === 0, node.level === 0 ? 'tree-val-hang text-[11px]' : 'text-blue-600 font-medium text-[10px]')}

                        </td>

                        <td class="p-2.5 text-center space-x-1 ${node.level === 0 ? 'border-r border-slate-700' : 'border-r border-slate-100'} whitespace-nowrap">${docBadges}</td>

                        <td class="p-2.5 text-center whitespace-nowrap">

                            <div class="flex items-center justify-center space-x-1.5">

                                <div class="w-12 ${node.level === 0 ? 'bg-slate-700' : 'bg-slate-200'} rounded-full h-1.5 overflow-hidden">

                                    <div class="${pctColor} h-1.5 rounded-full" style="width: ${pctDoc}%"></div>

                                </div>

                                <span class="font-bold text-[11px] tabular-nums ${node.level === 0 ? 'text-white font-black text-xs' : 'text-slate-700'}">${pctDoc}%</span>

                            </div>

                        </td>

                    `;

                }



                // Render sticky column Phân Cấp Quản Trị GT

                let firstColInner = "";

                if (node.level === 0) {

                    firstColInner = `

                        <div class="flex items-center justify-between">

                            <div class="flex items-center gap-2">

                                <span class="w-2.5 h-2.5 rounded-full bg-red-500 inline-block shadow-sm animate-pulse"></span>

                                <span class="font-black text-xs sm:text-[13px] text-white tracking-wider uppercase">${node.label}</span>

                            </div>

                            <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">${node.npp_set.size} NPP</span>

                        </div>

                        <div class="text-[10px] text-white font-mono mt-1 flex items-center gap-2 pl-4">

                            <span style="color: #ffffff !important; font-weight: 700;">L1: 💵 Tiền (Bil/Mil)</span>

                            <span style="color: #64748b;">•</span>

                            <span style="color: #38bdf8; font-weight: 700;">L2: 🎁 Hàng (EA & Bil/Mil)</span>

                        </div>

                    `;

                } else if (node.level === 4) {

                    // Cấp NPP: Thể hiện đầy đủ tên NPP (tên ngắn Sold-to Name chuẩn dim_channel không bị cắt ...)

                    firstColInner = `

                        <div class="flex items-center gap-1.5">

                            <span class="inline-block w-3 text-center text-slate-300 text-[10px]">•</span>

                            <span class="font-semibold text-slate-800 whitespace-nowrap cursor-pointer hover:underline hover:text-red-600 transition" 

                                  onclick="selectNppInDossier('${node.code}')" 

                                  title="Mã NPP: ${node.code}&#10;Tên NPP: ${node.name}&#10;Tên đầy đủ: ${node.fullName || node.name}">

                                ${node.code} - ${node.name}

                            </span>

                        </div>

                        <div class="text-[9px] text-slate-400 font-mono mt-0.5 flex items-center gap-1.5 pl-4">

                            <span class="text-slate-500 font-medium">L1: 💵 Tiền</span>

                            <span class="text-slate-300">•</span>

                            <span class="text-sky-600 font-medium">L2: 🎁 Hàng</span>

                        </div>

                    `;

                } else {

                    // Cấp Miền, Vùng, GSBH

                    firstColInner = `

                        <div class="flex items-center justify-between">

                            <div class="flex items-center">

                                ${expanderIcon}

                                <span class="cursor-pointer hover:underline font-bold" onclick="toggleTreeNode('${node.id}')" title="${node.label}">${node.label}</span>

                            </div>

                            <span class="ml-1.5 px-1.5 py-0.2 rounded text-[10px] font-semibold ${badgeClass}">${node.npp_set.size} NPP</span>

                        </div>

                    `;

                }



                html += `

                    <tr class="${rowBg} transition border-b border-slate-100" data-level="${node.level}">

                        <td class="th-tree-col p-2.5 ${fontClass} select-none" style="padding-left: ${indentPx + 10}px">

                            ${firstColInner}

                        </td>

                        ${cellsHtml}

                    </tr>

                `;

            });



            tbody.innerHTML = html;

        }



        function exportTreeToExcel() {

            if (typeof XLSX === 'undefined') {

                alert("Thư viện Excel chưa được tải.");

                return;

            }



            const activeMonths = getTreeActiveMonths();



            const rows = TREE_NODES.map((n, idx) => {

                const prefix = "  ".repeat(n.level);

                const r = {

                    "STT": idx + 1,

                    "Cấp Độ": `L${n.level}`,

                    "Phân Cấp Quản Trị GT": prefix + n.label,

                    "Tên Đầy Đủ NPP": n.fullName || n.name,

                    "Số NPP Con": n.npp_set.size,

                    "Số CTKM": n.count_ct.size,

                };

                activeMonths.forEach(mObj => {

                    const k = mObj.key || `${mObj.year}_${mObj.month}`;

                    const mData = n.months ? (n.months[k] || n.months[mObj.month]) : null;

                    const pfx = mObj.short_label || `T${mObj.month}`;

                    r[`${pfx} Tiền (VNĐ)`] = mData ? mData.tien : 0;

                    r[`${pfx} Hàng (EA)`] = mData ? mData.hang_ea : 0;

                    r[`${pfx} Hàng (VNĐ sau giá)`] = mData ? mData.hang_tien : 0;

                });

                r["Tổng Cả Năm Tiền (VNĐ)"] = n.tien;

                r["Tổng Cả Năm Hàng (EA)"] = n.hang_ea;

                r["Tổng Cả Năm Hàng (VNĐ sau giá)"] = n.hang_tien;

                r["Tiền Đã Trả (VNĐ)"] = n.tien_paid;

                r["Hàng Đã Trả (EA)"] = n.hang_paid_ea;

                r["Hàng Đã Trả (VNĐ sau giá)"] = n.hang_paid_tien;

                r["Tiền Còn Lại Pending (VNĐ)"] = Math.max(0, n.tien - n.tien_paid);

                r["Hàng Còn Lại Pending (EA)"] = Math.max(0, n.hang_ea - n.hang_paid_ea);

                r["Hàng Còn Lại Pending (VNĐ sau giá)"] = Math.max(0, n.hang_tien - n.hang_paid_tien);

                r["Tiền Pending Chứng Từ (VNĐ)"] = n.tien_doc;

                r["Hàng Pending Chứng Từ (EA)"] = n.hang_doc_ea;

                r["Hàng Pending Chứng Từ (VNĐ sau giá)"] = n.hang_doc_tien;

                r["Hàng Pending Vận Hành (EA)"] = n.hang_other_ea;

                r["Chứng Từ Còn Thiếu"] = Array.from(n.docs).join(", ");

                return r;

            });



            const ws = XLSX.utils.json_to_sheet(rows);

            const wb = XLSX.utils.book_new();

            XLSX.utils.book_append_sheet(wb, ws, "PhanCap_RTM_TheoThang");

            const minM = activeMonths.length > 0 ? activeMonths[0].month : 1;

            const maxM = activeMonths.length > 0 ? activeMonths[activeMonths.length - 1].month : 8;

            const yr = activeMonths.length > 0 ? activeMonths[activeMonths.length - 1].year : 2026;

            XLSX.writeFile(wb, `CJFoods_PhanCap_TheoThang_T${minM}_T${maxM}_${yr}_${new Date().toISOString().slice(0,10)}.xlsx`);

        }



        // Auto Boot

        

    function applyRLS() {
        if (!window.state || !window.state.currentUser) return;
        const user = window.state.currentUser;
        if (user.role === 'ASM' && user.scope_value && user.scope_value !== 'Toàn Quốc') {
            const vungSelect = document.getElementById('f_vung');
            if (vungSelect) {
                for (let i = 0; i < vungSelect.options.length; i++) {
                    if (vungSelect.options[i].value.toLowerCase().includes(user.scope_value.toLowerCase())) {
                        vungSelect.selectedIndex = i;
                        vungSelect.disabled = true;
                        break;
                    }
                }
                onVungChange();
                applyFilters();
            }
        }
    }

    async function init() {
        if (isInitialized) {
            // Resize charts
            try {
                if (chartReasons) chartReasons.resize();
                if (chartMonthly) chartMonthly.resize();
                if (chartRegions) chartRegions.resize();
                if (chartStorage) chartStorage.resize();
            } catch (e) {}
            return;
        }

        if (isLoadingData) return;
        isLoadingData = true;

        const container = document.getElementById('gt-subview-ctkm');
        if (container) {
            let loader = document.getElementById('ctkm-loader');
            if (!loader) {
                loader = document.createElement('div');
                loader.id = 'ctkm-loader';
                loader.className = 'absolute inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex flex-col items-center justify-center text-white space-y-3';
                loader.innerHTML = `
                    <div class="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                    <div class="font-bold text-sm tracking-wide">ĐANG GIẢI MÃ DỮ LIỆU CHỨNG TỪ & TIẾN ĐỘ CTKM GT...</div>
                    <div class="text-xs text-slate-300">Thuật toán DEFLATE Pako In-Memory</div>
                `;
                container.appendChild(loader);
            }
        }

        try {
            if (!window.CTKM_COMPRESSED_DATA) {
                await loadScript('data/modules/ctkm_data.js');
            }

            // Assign COMPRESSED_DATA from window
            if (typeof COMPRESSED_DATA === 'undefined' && window.CTKM_COMPRESSED_DATA) {
                window.COMPRESSED_DATA = window.CTKM_COMPRESSED_DATA;
            }

            initApp();
            applyRLS();
            isInitialized = true;

            setTimeout(() => {
                if (chartReasons) chartReasons.resize();
                if (chartMonthly) chartMonthly.resize();
                if (chartRegions) chartRegions.resize();
                if (chartStorage) chartStorage.resize();
            }, 300);
        } catch (err) {
            console.error('Lỗi khởi tạo CTKM Module:', err);
        } finally {
            isLoadingData = false;
            const loader = document.getElementById('ctkm-loader');
            if (loader) loader.remove();
        }
    }

    return {
        init: init,
        resize: () => {
            try {
                if (chartReasons) chartReasons.resize();
                if (chartMonthly) chartMonthly.resize();
                if (chartRegions) chartRegions.resize();
                if (chartStorage) chartStorage.resize();
            } catch (e) {}
        }
    };
})();
