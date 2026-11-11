
        var state = window.state = {



            currentLang: localStorage.getItem("cj_lang") || "vi",



            activeTab: 'tab-overview',



            year: '2026',



            selectedMonths: [getDefaultCurrentMonth()],



            



            // Tab 1 (Dashboard) Filters



            dashChannel: 'ALL',



            dashSubChannel: 'ALL',



            dashAccount: 'ALL',







            // Tab 2 (GT) Filters



            geoMien: 'ALL',



            geoVung: 'ALL',
            geoArea: 'ALL',



            geoGsbh: 'ALL',



            geoNpp: 'ALL',



            geoNvbh: 'ALL',



            gtSubTab: 'gt-sub-overview',







            // Tab 3 (MT) Filters



            mtSubChan: 'ALL',



            mtChain: 'ALL',



            mtCluster: 'ALL',



            mtStore: 'ALL',







            // Tab 4 (B2B) Filters



            b2bAcc: 'ALL',



            b2bCust: 'ALL',







            // Tab 5 (KR) Filters



            krSubChan: 'ALL',



            krChain: 'ALL',







            // Tab 6 (Reports) Filters



            repChannel: 'ALL',







            // Persistent Product Filters



            prodStorage: 'ALL',



            prodCate: 'ALL',



            prodPh1: 'ALL',



            prodPh2: 'ALL',



            prodSku: 'ALL'



        };







        const openNodes = window.openNodes = window.openNodes || new Set([



            'prod_Ambient', 'prod_Chilled', 'prod_Frozen',



            'prod_gt_Ambient', 'prod_gt_Chilled', 'prod_gt_Frozen',



            'prod_mt_Ambient', 'prod_mt_Chilled', 'prod_mt_Frozen',



            'prod_b2b_Ambient', 'prod_b2b_Chilled', 'prod_b2b_Frozen',



            'prod_kr_Ambient', 'prod_kr_Chilled', 'prod_kr_Frozen',



            'chan_GT', 'chan_MT', 'chan_B2B', 'chan_KR',



            'gt_MIỀN BẮC', 'gt_MIỀN TRUNG', 'gt_MIỀN NAM',



            'mt_MT)CS', 'mt_MT)Hyper'



        ]);







        function formatExactVND(val) {



            val = Number(val) || 0;



            return Math.round(val).toLocaleString('vi-VN') + ' ₫';



        }







        function formatVND(val) {



            val = Number(val) || 0;



            const abs = Math.abs(val);



            if (abs === 0) return '0';



            if (abs >= 1e9) {



                return (val / 1e9).toFixed(2) + ' B';



            } else if (abs >= 1e6) {



                return (val / 1e6).toFixed(1) + ' M';



            } else if (abs >= 1e3) {



                return (val / 1e3).toFixed(1) + ' K';



            } else {



                return Math.round(val).toLocaleString('vi-VN');



            }



        }







        function formatVnMoney(val) {



            return formatVND(val);



        }







        function formatBn(val) {



            val = Number(val) || 0;



            return (val / 1e9).toFixed(2);



        }







        function formatBnVn(val) {



            val = Number(val) || 0;



            return (val / 1e9).toFixed(2) + ' B';



        }







        function formatMnVn(val) {



            val = Number(val) || 0;



            return (val / 1e6).toFixed(1) + ' M';



        }







        function formatVnCurrencyShort(val) {



            val = Number(val) || 0;



            if (val >= 1e9) return (val / 1e9).toFixed(2) + ' B';



            if (val >= 1e6) return (val / 1e6).toFixed(1) + ' M';



            if (val >= 1e3) return (val / 1e3).toFixed(1) + ' K';



            return Math.round(val).toLocaleString('vi-VN') + ' ₫';



        }







        function getYtdMonths() {



            const maxAvailableMonth = (state.year === '2026') ? 10 : 12;



            const maxSelMonth = (state.selectedMonths && state.selectedMonths.length > 0)



                ? Math.max(...state.selectedMonths.map(m => parseInt(m)))



                : maxAvailableMonth;



            const effectiveMax = Math.min(maxSelMonth, maxAvailableMonth);



            const months = [];



            for (let i = 1; i <= effectiveMax; i++) {



                months.push(i.toString().padStart(2, '0'));



            }



            return months;



        }







        function formatNumVn(val) {



            val = Number(val) || 0;



            return Math.round(val).toLocaleString('vi-VN');



        }







        function getLyBenchmarkText(lyVal) {



            const isCurrentMtd = (state.year === '2026' && state.selectedMonths && state.selectedMonths.length === 1 && state.selectedMonths[0] === getDefaultCurrentMonth());



            if (isCurrentMtd) {



                const mSel = state.selectedMonths[0];



                const lyYearShort = String((parseInt(state.year) || 2026) - 1).slice(-2);



                return '(CK T' + parseInt(mSel) + '/' + lyYearShort + ': ' + formatBnVn(lyVal) + ')';



            }



            return '(' + t('lbl_same_period') + ': ' + formatBnVn(lyVal) + ')';



        }







        function getLyBenchmarkTitle(lyVal) {



            const isCurrentMtd = (state.year === '2026' && state.selectedMonths && state.selectedMonths.length === 1 && state.selectedMonths[0] === getDefaultCurrentMonth());



            if (isCurrentMtd) {



                const mSel = state.selectedMonths[0];



                const lyYear = (parseInt(state.year) || 2026) - 1;



                return 'YoY so với Cùng kỳ T' + parseInt(mSel) + '/' + lyYear + ' (' + formatExactVND(lyVal) + ').';



            }



            return 'YoY so với Cùng kỳ: ' + formatExactVND(lyVal);



        }







        function getYtdBenchmarkText(ytdVal) {



            return '(' + t('lbl_ytd_accum') + ': ' + formatBnVn(ytdVal) + ')';



        }







        function getYtdBenchmarkTitle(ytdVal) {



            return 'Lũy kế YTD: ' + formatExactVND(ytdVal);



        }







        // ==========================================



        // PERSISTENT PRODUCT FILTER MATCHERS



        // ==========================================



        function matchProductRecord(d) {



            if (!d) return false;



            if (state.prodStorage !== 'ALL' && d.storage && d.storage !== state.prodStorage) return false;



            if (state.prodCate !== 'ALL' && d.cate && d.cate !== state.prodCate) return false;



            if (state.prodPh1 !== 'ALL' && d.ph1 && d.ph1 !== state.prodPh1) return false;



            if (state.prodPh2 !== 'ALL' && d.ph2 && d.ph2 !== state.prodPh2) return false;



            if (state.prodSku !== 'ALL' && (d.sku_name || d.sku || d.product_name) && (d.sku_name || d.sku || d.product_name) !== state.prodSku) return false;



            return true;



        }







        function getValidPh1SetForCurrentFilter() {



            if (state.prodPh1 !== 'ALL') return null;



            if (state.prodCate === 'ALL' && state.prodPh2 === 'ALL' && state.prodSku === 'ALL') return null;



            const validPh1s = new Set();



            if (typeof DIM_PROD_HIER !== 'undefined' && Array.isArray(DIM_PROD_HIER)) {



                DIM_PROD_HIER.forEach(p => {



                    if (state.prodStorage !== 'ALL' && p.storage !== state.prodStorage) return;



                    if (state.prodCate !== 'ALL' && p.cate !== state.prodCate) return;



                    if (state.prodPh2 !== 'ALL' && p.ph2 !== state.prodPh2) return;



                    if (state.prodSku !== 'ALL' && p.sku_name !== state.prodSku) return;



                    if (p.ph1) validPh1s.add(p.ph1);



                });



            }



            return validPh1s;



        }







        function matchProductTarget(d, validPh1s) {



            if (!d) return false;



            if (state.prodStorage !== 'ALL' && d.storage && d.storage !== state.prodStorage) return false;



            if (state.prodPh1 !== 'ALL') {



                return (d.ph1 === state.prodPh1);



            }



            if (validPh1s && validPh1s.size > 0) {



                return d.ph1 ? validPh1s.has(d.ph1) : false;



            }



            return true;



        }







        



        // TÍNH TIẾN ĐỘ LÀM VIỆC CHUẨN 26 NGÀY / THÁNG



        function getWorkdayProgressPct() {



            try {



                const workingDaysInMonth = 26;



                let maxDay = (typeof maxDayInMonth !== 'undefined' && maxDayInMonth > 0) ? maxDayInMonth : 0;



                const selM = (state.selectedMonths && state.selectedMonths.length === 1) ? state.selectedMonths[0] : '09';



                const curPrefix = (state.year || '2026') + '-' + selM;



                if (maxDay === 0 && typeof DAILY_DATA !== 'undefined' && Array.isArray(DAILY_DATA)) {



                    DAILY_DATA.forEach(d => {



                        const dt = String(d.date_val || '');



                        if (dt.startsWith(curPrefix) && (Number(d.daily_sellin) || 0) > 0) {



                            const dayNum = parseInt(dt.substring(8, 10), 10);



                            if (dayNum > maxDay) maxDay = dayNum;



                        }



                    });



                }



                if (maxDay === 0 && typeof GT_DAILY_SO !== 'undefined' && Array.isArray(GT_DAILY_SO)) {



                    GT_DAILY_SO.forEach(d => {



                        const dt = String(d.date_val || '');



                        if (dt.startsWith(curPrefix) && (Number(d.daily_so) || 0) > 0) {



                            const dayNum = parseInt(dt.substring(8, 10), 10);



                            if (dayNum > maxDay) maxDay = dayNum;



                        }



                    });



                }



                if (maxDay === 0) {



                    maxDay = (state.year === '2026' && selM === '09') ? 22 : 30;



                }



                



                const curYearNum = parseInt(state.year, 10) || 2026;



                const curMonthNum = parseInt(selM, 10) || 9;



                



                let passedWorkDays = 0;



                for (let d = 1; d <= maxDay; d++) {



                    const dt = new Date(curYearNum, curMonthNum - 1, d);



                    if (dt.getDay() !== 0) passedWorkDays++; // Loại trừ Chủ Nhật



                }



                return Math.min(100, (passedWorkDays / workingDaysInMonth) * 100);



            } catch (e) {



                return 61.5; // Dự phòng ~16/26 ngày



            }



        }







        function getTargetColorClass(pct) {



            const prog = getWorkdayProgressPct();



            return pct >= prog ? 'text-green-700 font-bold' : 'text-red-600 font-bold';



        }







        function getTargetColorStyle(pct) {



            const prog = getWorkdayProgressPct();



            return pct >= prog ? 'color: #15803d !important; font-weight: bold;' : 'color: #dc2626 !important; font-weight: bold;';



        }







        function getGrowthColorClass(growth) {



            if (growth === null || growth === undefined || isNaN(growth)) return 'text-slate-400 font-bold';



            return growth >= 0 ? 'text-green-700 font-bold' : 'text-red-600 font-bold';



        }







        function getGrowthColorStyle(growth) {



            if (growth === null || growth === undefined || isNaN(growth)) return 'color: #94a3b8; font-weight: bold;';



            return growth >= 0 ? 'color: #15803d !important; font-weight: bold;' : 'color: #dc2626 !important; font-weight: bold;';



        }







        function escapeAttr(str) {



            if (!str) return '';



            return String(str).split('&').join('&amp;').split('"').join('&quot;').split('<').join('&lt;').split('>').join('&gt;');



        }







        function formatAchieveBadge(val, tgt) {



            if (!tgt || tgt <= 0) return '<span class="text-slate-400 font-normal whitespace-nowrap">-</span>';



            const pct = (val / tgt) * 100;



            const prog = getWorkdayProgressPct();



            const isGood = pct >= prog;



            const color = isGood ? '#15803d' : '#dc2626';



            return '<span class="whitespace-nowrap" style="color: ' + color + ' !important; font-weight: bold;">' + pct.toFixed(1) + '%</span>';



        }







        function formatTreeYoy(val, lyVal) {



            const v = Number(val) || 0;



            const ly = Number(lyVal) || 0;



            const titleAttr = ' title="Năm nay: ' + formatExactVND(v) + ' | Cùng kỳ: ' + formatExactVND(ly) + '"';



            if (ly <= 0 && v <= 0) {



                return '<span class="text-slate-400 font-normal whitespace-nowrap"' + titleAttr + '>-</span>';



            }



            if (ly <= 0 && v > 0) {



                return '<span class="text-emerald-600 font-bold font-mono-num whitespace-nowrap"' + titleAttr + '>+100.0%</span>';



            }



            const yoy = ((v - ly) / ly) * 100;



            const isPos = yoy >= 0;



            const cls = isPos ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold';



            const sign = yoy > 0 ? '+' : '';



            return '<span class="' + cls + ' font-mono-num whitespace-nowrap"' + titleAttr + '>' + sign + yoy.toFixed(1) + '%</span>';



        }







        let _cjChartResizeObserver = null;
        function observeChartDom(dom) {
            if (!dom || dom.__cjObserved || typeof ResizeObserver === 'undefined' || typeof echarts === 'undefined') return;
            if (!_cjChartResizeObserver) {
                _cjChartResizeObserver = new ResizeObserver((entries) => {
                    for (const entry of entries) {
                        if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
                            const inst = echarts.getInstanceByDom(entry.target);
                            if (inst) requestAnimationFrame(() => inst.resize());
                        }
                    }
                });
            }
            dom.__cjObserved = true;
            _cjChartResizeObserver.observe(dom);
        }

        if (typeof echarts !== 'undefined' && !echarts.__cjInitWrapped) {
            const _origEchartsInit = echarts.init.bind(echarts);
            echarts.init = function(dom, theme, opts) {
                const inst = _origEchartsInit(dom, theme, opts);
                observeChartDom(dom);
                return inst;
            };
            echarts.__cjInitWrapped = true;
        }

        function getOrInitChart(domId) {



            const dom = document.getElementById(domId);



            if (!dom || typeof echarts === 'undefined') return null;



            let chart = echarts.getInstanceByDom(dom);



            if (!chart) {



                chart = echarts.init(dom);



            } else {



                observeChartDom(dom);



            }



            if (chart && !chart._mobileOptimized) {



                chart._mobileOptimized = true;



                const origSetOption = chart.setOption.bind(chart);



                chart.setOption = function(opt, notMerge, lazyUpdate) {



                    if (opt && typeof opt === 'object') {



                        const isMobile = window.innerWidth <= 768 || document.body.classList.contains('mobile-mode');







                        // 1. Tooltip confine in chart container so it never overflows screen on mobile



                        if (!opt.tooltip) opt.tooltip = {};



                        if (opt.tooltip.confine === undefined) {



                            opt.tooltip.confine = true;



                        }







                        // 2. Grid containLabel ensures axis numbers/labels are not cut off



                        if (opt.grid) {



                            const grids = Array.isArray(opt.grid) ? opt.grid : [opt.grid];



                            grids.forEach(g => {



                                if (g && typeof g === 'object') {



                                    if (g.containLabel === undefined) g.containLabel = true;



                                    if (isMobile) {



                                        if (g.left === undefined) g.left = '3%';



                                        if (g.right === undefined) g.right = '4%';



                                    }



                                }



                            });



                        }







                        // 3. Legend: make scrollable on mobile to prevent overlapping charts



                        if (opt.legend) {



                            const legends = Array.isArray(opt.legend) ? opt.legend : [opt.legend];



                            legends.forEach(leg => {



                                if (leg && typeof leg === 'object') {



                                    if (isMobile) {



                                        if (!leg.type || leg.type === 'plain') leg.type = 'scroll';



                                        if (leg.itemGap === undefined) leg.itemGap = 8;



                                        if (!leg.textStyle) leg.textStyle = {};



                                        if (leg.textStyle.fontSize === undefined) leg.textStyle.fontSize = 10;



                                    }



                                }



                            });



                        }







                        // 4. Category X-axis: rotate label if > 5 items on mobile to avoid overlapping



                        if (isMobile && opt.xAxis) {



                            const xAxes = Array.isArray(opt.xAxis) ? opt.xAxis : [opt.xAxis];



                            xAxes.forEach(ax => {



                                if (ax && ax.type === 'category' && Array.isArray(ax.data) && ax.data.length > 5) {



                                    if (!ax.axisLabel) ax.axisLabel = {};



                                    if (ax.axisLabel.rotate === undefined) ax.axisLabel.rotate = 28;



                                    if (ax.axisLabel.fontSize === undefined) ax.axisLabel.fontSize = 9.5;



                                    if (ax.axisLabel.interval === undefined) ax.axisLabel.interval = 0;



                                }



                            });



                        }



                    }



                    return origSetOption(opt, notMerge, lazyUpdate);



                };



            }



            return chart;



        }







        // Common DataZoom helper matching Fundamental charts (inside wheel/pan + bottom slider)



        function getCommonChartZoom(customBottom, customHeight, isLight) {



            const bot = (customBottom !== undefined) ? customBottom : 3;



            const h = (customHeight !== undefined) ? customHeight : 14;



            const bg = isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.08)';



            const filler = isLight ? 'rgba(99, 102, 241, 0.22)' : 'rgba(255,255,255,0.22)';



            const handleColor = isLight ? '#6366F1' : '#FFFFFF';



            const handleBorder = isLight ? '#4338CA' : '#94A3B8';



            const textColor = isLight ? '#475569' : '#CBD5E1';



            return [



                {



                    type: 'inside',



                    xAxisIndex: [0],



                    zoomOnMouseWheel: true,



                    moveOnMouseMove: true,



                    moveOnMouseWheel: false,



                    zoomOnTouch: true,



                    moveOnTouch: true



                },



                {



                    type: 'slider',



                    xAxisIndex: [0],



                    height: h,



                    bottom: bot,



                    borderColor: 'transparent',



                    backgroundColor: bg,



                    fillerColor: filler,



                    handleStyle: { color: handleColor, borderColor: handleBorder, borderWidth: 1, shadowBlur: 2, shadowColor: 'rgba(0,0,0,0.25)' },



                    textStyle: { color: textColor, fontSize: 9 },



                    showDetail: false,



                    brushSelect: false



                }



            ];



        }







        function getCommonVerticalChartZoom(customRight, customWidth, isLight) {



            const r = (customRight !== undefined) ? customRight : 6;



            const w = (customWidth !== undefined) ? customWidth : 12;



            const bg = isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.08)';



            const filler = isLight ? 'rgba(99, 102, 241, 0.22)' : 'rgba(255,255,255,0.22)';



            const handleColor = isLight ? '#6366F1' : '#FFFFFF';



            const handleBorder = isLight ? '#4338CA' : '#94A3B8';



            const textColor = isLight ? '#475569' : '#CBD5E1';



            return [



                {



                    type: 'inside',



                    yAxisIndex: [0],



                    zoomOnMouseWheel: true,



                    moveOnMouseMove: true,



                    moveOnMouseWheel: false,



                    zoomOnTouch: true,



                    moveOnTouch: true



                },



                {



                    type: 'slider',



                    yAxisIndex: [0],



                    width: w,



                    right: r,



                    borderColor: 'transparent',



                    backgroundColor: bg,



                    fillerColor: filler,



                    handleStyle: { color: handleColor, borderColor: handleBorder, borderWidth: 1, shadowBlur: 2, shadowColor: 'rgba(0,0,0,0.25)' },



                    textStyle: { color: textColor, fontSize: 9 },



                    showDetail: false,



                    brushSelect: false



                }



            ];



        }







        // =========================================================================



window.openNodes = openNodes;
window.state = state;
