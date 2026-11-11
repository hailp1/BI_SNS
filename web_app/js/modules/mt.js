
        // TAB 3: KÊNH MT



        // =========================================================================



        if (typeof state.treeOpen === 'undefined') state.treeOpen = {};



        if (typeof state.mtStore === 'undefined') state.mtStore = 'ALL';







        let mtStoreState = {



            searchQuery: '',



            filterSubChan: 'ALL',



            filterCluster: 'ALL',



            filterChain: 'ALL',



            sortCol: 'val',



            sortAsc: false,



            currentPage: 1,



            pageSize: 25



        };







        function renderTabMt() {



            try {



                const validPh1s = getValidPh1SetForCurrentFilter();



                const isSingleStore = !!(state.mtStore && state.mtStore !== 'ALL');



                const selMonthNums = state.selectedMonths.map(m => parseInt(m, 10));



                const ytdMonths = getYtdMonths();



                const ytdMonthNums = ytdMonths.map(m => parseInt(m, 10));



                const lyYear = (parseInt(state.year) - 1).toString();







                const filterMt = (d, yearVal, monthsArr) => {



                    if (d.year !== yearVal) return false;



                    if (!monthsArr.includes(d.month_num)) return false;



                    if (state.mtSubChan !== 'ALL' && d.sub_channel !== state.mtSubChan) return false;



                    if (state.mtChain !== 'ALL' && d.key_account !== state.mtChain) return false;



                    if (!matchProductRecord(d)) return false;



                    return true;



                };







                let totalSellinMT = 0;



                let lyMT = 0;



                let ytdMT2026 = 0;



                let ytdMT2025 = 0;







                if (isSingleStore) {



                    if (typeof MT_STORE_DATA !== 'undefined' && Array.isArray(MT_STORE_DATA)) {



                        const stRecs = MT_STORE_DATA.filter(d => isStoreMatch(d, state.mtStore));



                        stRecs.forEach(r => {



                            if (selMonthNums.length === 0 || selMonthNums.includes(r.m)) {



                                totalSellinMT += (r.val || 0);



                                lyMT += (r.ly || 0);



                            }



                            if (ytdMonthNums.includes(r.m)) {



                                ytdMT2026 += (r.val || 0);



                                ytdMT2025 += (r.ly || 0);



                            }



                        });



                    }



                } else {



                    const data = MT_TREE.filter(d => filterMt(d, state.year, state.selectedMonths));



                    data.forEach(d => totalSellinMT += (Number(d.sellin_val) || 0));







                    MT_TREE.filter(d => filterMt(d, lyYear, state.selectedMonths)).forEach(d => lyMT += (Number(d.sellin_val) || 0));



                    MT_TREE.filter(d => filterMt(d, state.year, ytdMonths)).forEach(d => ytdMT2026 += (Number(d.sellin_val) || 0));



                    MT_TREE.filter(d => filterMt(d, lyYear, ytdMonths)).forEach(d => ytdMT2025 += (Number(d.sellin_val) || 0));



                }







                const yoyGrowth = lyMT > 0 ? ((totalSellinMT - lyMT) / lyMT) * 100 : 0;



                const ytdGrowth = ytdMT2025 > 0 ? ((ytdMT2026 - ytdMT2025) / ytdMT2025) * 100 : 0;







                // Target MT: store level doesn't have corporate targets in TARGET_SELLIN



                let mtTarget = 0;



                if (!isSingleStore && typeof TARGET_SELLIN !== 'undefined' && Array.isArray(TARGET_SELLIN)) {



                    TARGET_SELLIN.filter(d => {



                        if (d.year !== state.year) return false;



                        const mNum = d.month.substring(5, 7);



                        if (!state.selectedMonths.includes(mNum)) return false;



                        if (d.channel !== 'MT') return false;



                        if (state.mtSubChan !== 'ALL' && d.sub_channel && d.sub_channel !== state.mtSubChan) return false;



                        if (state.mtChain !== 'ALL' && d.account_npp && d.account_npp !== state.mtChain) return false;



                        if (!matchProductTarget(d, validPh1s)) return false;



                        return true;



                    }).forEach(d => mtTarget += (Number(d.target_amt) || 0));



                }







                const mtGap = isSingleStore ? 0 : (totalSellinMT - mtTarget);



                const mtAchieve = mtTarget > 0 ? (totalSellinMT / mtTarget) * 100 : 0;







                // Active Stores & Store Productivity from MT_STORE_DATA



                let activeStoresCount = 0;



                let activeStoresPrevCount = 0;







                if (isSingleStore) {



                    activeStoresCount = totalSellinMT > 0 ? 1 : 0;



                    activeStoresPrevCount = lyMT > 0 ? 1 : 0;



                } else if (typeof MT_STORE_DATA !== 'undefined' && Array.isArray(MT_STORE_DATA)) {



                    const selMonthNum = state.selectedMonths.length === 1 ? parseInt(state.selectedMonths[0], 10) : null;



                    MT_STORE_DATA.forEach(d => {



                        if (selMonthNum !== null && d.m !== selMonthNum) return;



                        if (state.mtSubChan !== 'ALL' && d.sc !== state.mtSubChan) return;



                        if (state.mtChain !== 'ALL' && d.acc !== state.mtChain) return;



                        if (d.val > 0) activeStoresCount++;



                        if (d.lm > 0) activeStoresPrevCount++;



                    });



                }







                const vpoMT = activeStoresCount > 0 ? totalSellinMT / activeStoresCount : 0;







                // Active SKUs for MT



                let systemSkuCount = 0;



                let systemSkuLm = 0;



                let systemSkuLy = 0;



                if (isSingleStore) {



                    const selMonthNum = state.selectedMonths.length === 1 ? parseInt(state.selectedMonths[0], 10) : 10;



                    const stRec = (typeof MT_STORE_DATA !== 'undefined' && Array.isArray(MT_STORE_DATA))



                        ? MT_STORE_DATA.find(d => (d.m === selMonthNum) && isStoreMatch(d, state.mtStore))



                        : null;



                    if (stRec) {



                        systemSkuCount = stRec.sku || 0;



                        systemSkuLm = stRec.lm_sku || 0;



                    }



                } else if (typeof MT_SYS_SKUS !== 'undefined') {



                    const curMKey = state.year + '-' + (state.selectedMonths.length === 1 ? state.selectedMonths[0] : '10');



                    const curMNum = parseInt(curMKey.substring(5, 7), 10);



                    const lmMKey = curMNum === 1 ? (parseInt(state.year)-1) + '-12' : state.year + '-' + String(curMNum - 1).padStart(2, '0');



                    const lyMKey = (parseInt(state.year) - 1) + '-' + curMKey.substring(5, 7);







                    systemSkuCount = MT_SYS_SKUS[curMKey] || 0;



                    systemSkuLm = MT_SYS_SKUS[lmMKey] || 0;



                    systemSkuLy = MT_SYS_SKUS[lyMKey] || 0;



                }







                // MoM MTD Calculation (matching exact day range e.g. Oct 1..20 vs Sep 1..20)



                let momResult = calculateMoMMtdForChannel('MT');



                if (isSingleStore) {



                    const selMonthNum = state.selectedMonths.length === 1 ? parseInt(state.selectedMonths[0], 10) : 10;



                    const stRec = (typeof MT_STORE_DATA !== 'undefined' && Array.isArray(MT_STORE_DATA))



                        ? MT_STORE_DATA.find(d => (d.m === selMonthNum) && isStoreMatch(d, state.mtStore))



                        : null;



                    if (stRec) {



                        momResult.priorMtd = stRec.lm || 0;



                        momResult.currentMtd = totalSellinMT;



                        momResult.growthPct = (stRec.lm > 0) ? ((totalSellinMT - stRec.lm) / stRec.lm * 100) : 0;



                    }



                }







                // DOM Updates: KPI Card 1: Doanh số Sell-in MT



                const kpiSi = document.getElementById('mt-kpi-sellin');



                if (kpiSi) {



                    kpiSi.innerText = formatBnVn(totalSellinMT);



                    kpiSi.title = formatExactVND(totalSellinMT);



                }



                const kpiYoy = document.getElementById('mt-kpi-yoy') || document.getElementById('mt-kpi-growth');



                if (kpiYoy) {



                    kpiYoy.innerText = (yoyGrowth >= 0 ? '+' : '') + yoyGrowth.toFixed(1) + '%';



                    kpiYoy.className = (yoyGrowth >= 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold') + ' font-mono-num';



                }



                const kpiLy = document.getElementById('mt-kpi-ly-bn') || document.getElementById('mt-kpi-ly-val1');



                if (kpiLy) {



                    kpiLy.innerText = typeof getLyBenchmarkText === 'function' ? getLyBenchmarkText(lyMT) : `(vs cùng kỳ: ${formatBnVn(lyMT)})`;



                    if (typeof getLyBenchmarkTitle === 'function') kpiLy.title = getLyBenchmarkTitle(lyMT);



                }



                const kpiYtd = document.getElementById('mt-kpi-ytd') || document.getElementById('mt-kpi-ytd-growth');



                if (kpiYtd) {



                    kpiYtd.innerText = (ytdGrowth >= 0 ? '+' : '') + ytdGrowth.toFixed(1) + '%';



                    kpiYtd.className = (ytdGrowth >= 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold') + ' font-mono-num';



                }



                const kpiYtdVal = document.getElementById('mt-kpi-ytd-val');



                if (kpiYtdVal) {



                    kpiYtdVal.innerText = typeof getYtdBenchmarkText === 'function' ? getYtdBenchmarkText(ytdMT2026) : `(Lũy kế: ${formatBnVn(ytdMT2026)})`;



                    if (typeof getYtdBenchmarkTitle === 'function') kpiYtdVal.title = getYtdBenchmarkTitle(ytdMT2026);



                }







                // MoM MTD cho Card 1 (Sell-in MT)



                if (typeof renderMoMElement === 'function' && typeof calculateMoMMtdForChannel === 'function') {



                    renderMoMElement('mt-kpi-si-mom', 'mt-kpi-si-lmmtd', calculateMoMMtdForChannel('MT'));



                } else {



                    const kpiMom = document.getElementById('mt-kpi-si-mom') || document.getElementById('mt-kpi-mom');



                    if (kpiMom) {



                        kpiMom.innerText = (momResult.growthPct >= 0 ? '+' : '') + momResult.growthPct.toFixed(1) + '%';



                        kpiMom.className = (momResult.growthPct >= 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold') + ' font-mono-num';



                    }



                    const kpiLmMtd = document.getElementById('mt-kpi-si-lmmtd') || document.getElementById('mt-kpi-lm-mtd-val1');



                    if (kpiLmMtd) {



                        kpiLmMtd.innerText = `(vs MTD: ${formatBnVn(momResult.priorMtd || 0)})`;



                    }



                }







                // Update KPI Card 2: Kế hoạch Target MT



                const kpiTarget = document.getElementById('mt-kpi-target');



                const kpiTargetGap = document.getElementById('mt-kpi-target-gap');



                if (kpiTarget) {



                    if (isSingleStore) {



                        kpiTarget.innerText = '-';



                        kpiTarget.title = 'Chưa phân bổ chỉ tiêu riêng cho từng điểm bán';



                    } else {



                        kpiTarget.innerText = formatBnVn(mtTarget);



                        kpiTarget.title = formatExactVND(mtTarget);



                    }



                }



                if (kpiTargetGap) {



                    if (isSingleStore) {



                        kpiTargetGap.innerText = '-';



                        kpiTargetGap.className = 'text-slate-400 font-medium font-mono-num';



                        kpiTargetGap.style.color = '';



                    } else {



                        kpiTargetGap.innerText = (mtGap >= 0 ? '+' : '') + formatBnVn(mtGap);



                        kpiTargetGap.className = (mtGap >= 0 ? 'text-emerald-700' : 'text-rose-600') + ' font-bold font-mono-num';



                        kpiTargetGap.style.color = mtGap >= 0 ? '#047857' : '#e11d48';



                    }



                }







                // Update KPI Card 3: % Đạt Target



                const kpiAchieve = document.getElementById('mt-kpi-achieve');



                const kpiAchieveStatus = document.getElementById('mt-kpi-achieve-status');



                const mtWorkProgress = getWorkdayProgressPct();



                const isMtOnTrack = mtAchieve >= mtWorkProgress;







                if (kpiAchieve) {



                    if (isSingleStore) {



                        kpiAchieve.innerText = '-';



                        kpiAchieve.className = 'text-2xl font-black font-mono-num mt-1 mb-1 tracking-tight text-slate-400';



                        kpiAchieve.style.color = '';



                    } else {



                        kpiAchieve.innerText = mtAchieve.toFixed(1) + '%';



                        kpiAchieve.className = 'text-2xl font-black font-mono-num mt-1 mb-1 tracking-tight ' + (isMtOnTrack ? 'text-emerald-700' : 'text-rose-600');



                        kpiAchieve.style.color = isMtOnTrack ? '#047857' : '#e11d48';



                    }



                }







                if (kpiAchieveStatus) {



                    if (isSingleStore) {



                        kpiAchieveStatus.innerText = 'Theo dõi theo Doanh số & YoY';



                        kpiAchieveStatus.className = 'text-slate-500 font-medium';



                        kpiAchieveStatus.style.color = '';



                    } else if (state.selectedMonths.length === 1 && mtWorkProgress > 0) {



                        const statusTxt = (isMtOnTrack ? 'Trên tiến độ' : 'Chậm tiến độ') + ' (Chuẩn 26N: ' + mtWorkProgress.toFixed(1) + '%)';



                        kpiAchieveStatus.innerText = statusTxt;



                        kpiAchieveStatus.className = isMtOnTrack ? 'text-emerald-700 font-bold' : 'text-rose-600 font-bold';



                        kpiAchieveStatus.style.color = isMtOnTrack ? '#047857' : '#e11d48';



                    } else {



                        kpiAchieveStatus.innerText = 'Đang theo dõi';



                        kpiAchieveStatus.className = 'text-slate-400 font-medium';



                        kpiAchieveStatus.style.color = '';



                    }



                }







                // Update KPI Card 4: LY MT & LM MTD



                const kpiLyVal = document.getElementById('mt-kpi-ly');



                if (kpiLyVal) {



                    kpiLyVal.innerText = formatBnVn(lyMT);



                    kpiLyVal.title = formatExactVND(lyMT);



                }



                const diffLy = totalSellinMT - lyMT;



                const kpiLyGrowth = document.getElementById('mt-kpi-ly-growth');



                if (kpiLyGrowth) {



                    kpiLyGrowth.innerText = (diffLy >= 0 ? '+' : '') + formatBnVn(diffLy);



                    kpiLyGrowth.className = (diffLy >= 0 ? 'text-emerald-700' : 'text-rose-600') + ' font-bold font-mono-num';



                    kpiLyGrowth.style.color = diffLy >= 0 ? '#047857' : '#e11d48';



                }



                const kpiLmVal = document.getElementById('mt-kpi-lm-val');



                if (kpiLmVal) {



                    kpiLmVal.innerText = formatBnVn(momResult.priorMtd || 0);



                    kpiLmVal.title = 'Doanh số MTD tháng trước cùng ngày: ' + formatExactVND(momResult.priorMtd || 0);



                }







                // Update KPI Card 5: Active Stores



                const kpiAcc = document.getElementById('mt-kpi-accounts');



                if (kpiAcc) kpiAcc.innerText = formatNumVn(activeStoresCount) + ' Stores';



                const kpiVpo = document.getElementById('mt-kpi-vpo');



                if (kpiVpo) kpiVpo.innerText = (vpoMT >= 1e9 ? formatBnVn(vpoMT) : (vpoMT / 1e6).toFixed(1) + ' M');



                const kpiStoresDiff = document.getElementById('mt-kpi-stores-diff-lm');



                if (kpiStoresDiff) {



                    const diffStores = activeStoresCount - activeStoresPrevCount;



                    kpiStoresDiff.innerHTML = 'vs LM MTD: <b class="' + (diffStores >= 0 ? 'text-emerald-700' : 'text-rose-600') + ' font-mono-num">' + (diffStores >= 0 ? '+' : '') + diffStores + ' stores</b>';



                }







                // Update KPI Card 6: Active SKUs



                const kpiSkus = document.getElementById('mt-kpi-skus');



                if (kpiSkus) kpiSkus.innerText = formatNumVn(systemSkuCount) + ' SKUs';



                const kpiSkusLm = document.getElementById('mt-kpi-skus-lm');



                if (kpiSkusLm) {



                    const diffSkuLm = systemSkuCount - systemSkuLm;



                    kpiSkusLm.innerText = (diffSkuLm >= 0 ? '+' : '') + diffSkuLm + ' SKUs';



                    kpiSkusLm.className = (diffSkuLm >= 0 ? 'text-emerald-700' : 'text-rose-600') + ' font-bold font-mono-num';



                }



                const kpiSkusLy = document.getElementById('mt-kpi-skus-ly');



                if (kpiSkusLy) {



                    const diffSkuLy = systemSkuCount - systemSkuLy;



                    kpiSkusLy.innerHTML = 'vs Cùng kỳ LY: <b class="' + (diffSkuLy >= 0 ? 'text-emerald-700' : 'text-rose-600') + ' font-mono-num">' + (diffSkuLy >= 0 ? '+' : '') + diffSkuLy + ' SKUs</b>';



                }







                // RENDER CHARTS & TABLES



                const currentData = isSingleStore ? [] : MT_TREE.filter(d => filterMt(d, state.year, state.selectedMonths));



                renderMtMonthlyTrendChart();



                renderMtChainsChart(currentData);



                renderMtSubchanChart(currentData);



                renderMtDailyChart();



                renderMtProductTree();



                renderMtTree();



                renderMtStoreTable();



                if (typeof TableCustomizer !== 'undefined') {



                    TableCustomizer.init('table-tree-prod-mt');



                    TableCustomizer.init('table-tree-mt');



                }







            } catch (e) {



                console.error("Error in renderTabMt:", e);



            }



        }







        // =========================================================================



        // KHỐI 2: BIỂU ĐỒ LỊCH SỬ 12 THÁNG KÊNH MT (12-MONTH HISTORICAL TREND)



        // =========================================================================



        function renderMtMonthlyTrendChart() {



            try {



                const myChart = getOrInitChart('chart-mt-monthly-trend');



                if (!myChart) return;







                const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];



                const monthLabels = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];



                const validPh1s = getValidPh1SetForCurrentFilter();







                const si2026 = new Array(12).fill(0);



                const si2025 = new Array(12).fill(0);



                const tgt2026 = new Array(12).fill(0);







                const isSingleStore = !!(state.mtStore && state.mtStore !== 'ALL');



                if (isSingleStore) {



                    if (typeof MT_STORE_DATA !== 'undefined' && Array.isArray(MT_STORE_DATA)) {



                        MT_STORE_DATA.forEach(d => {



                            if (!isStoreMatch(d, state.mtStore)) return;



                            const mIdx = d.m - 1;



                            if (mIdx >= 0 && mIdx < 12) {



                                si2026[mIdx] += (d.val || 0);



                                si2025[mIdx] += (d.ly || 0);



                            }



                        });



                    }



                    tgt2026.fill(0);



                } else {



                    if (typeof MT_TREE !== 'undefined' && Array.isArray(MT_TREE)) {



                        MT_TREE.forEach(d => {



                            if (state.mtSubChan !== 'ALL' && d.sub_channel !== state.mtSubChan) return;



                            if (state.mtChain !== 'ALL' && d.key_account !== state.mtChain) return;



                            if (!matchProductRecord(d)) return;







                            const mIdx = parseInt(d.month_num, 10) - 1;



                            if (mIdx < 0 || mIdx >= 12) return;



                            const v = Number(d.sellin_val) || 0;







                            if (d.year === state.year) {



                                si2026[mIdx] += v;



                            } else if (d.year === (parseInt(state.year) - 1).toString()) {



                                si2025[mIdx] += v;



                            }



                        });



                    }







                    if (typeof TARGET_SELLIN !== 'undefined' && Array.isArray(TARGET_SELLIN)) {



                        TARGET_SELLIN.forEach(d => {



                            if (d.channel !== 'MT' || d.year !== state.year) return;



                            if (state.mtSubChan !== 'ALL' && d.sub_channel && d.sub_channel !== state.mtSubChan) return;



                            if (state.mtChain !== 'ALL' && d.account_npp && d.account_npp !== state.mtChain) return;



                            if (!matchProductTarget(d, validPh1s)) return;







                            const mIdx = parseInt(d.month.substring(5, 7), 10) - 1;



                            if (mIdx >= 0 && mIdx < 12) {



                                tgt2026[mIdx] += (Number(d.target_amt) || 0);



                            }



                        });



                    }



                }







                const si2026Bn = si2026.map(v => parseFloat((v / 1e9).toFixed(2)));



                const si2025Bn = si2025.map(v => parseFloat((v / 1e9).toFixed(2)));



                const tgt2026Bn = tgt2026.map(v => parseFloat((v / 1e9).toFixed(2)));







                const option = {



                    tooltip: {



                        trigger: 'axis',



                        axisPointer: { type: 'cross', crossStyle: { color: '#999' } },



                        backgroundColor: 'rgba(15, 23, 42, 0.95)',



                        borderColor: '#38BDF8',



                        borderWidth: 1,



                        textStyle: { color: '#FFFFFF', fontSize: 11 },



                        formatter: function(params) {



                            if (!params || !params.length) return '';



                            let titlePrefix = isSingleStore ? 'Điểm Bán MT: ' + (document.getElementById('inp-mt-store')?.value || '') : 'Kênh MT';



                            let html = '<div class="font-bold border-b border-slate-700 pb-1 mb-1 text-sky-300">Tháng ' + params[0].name + ' (' + titlePrefix + ')</div>';



                            let actualVal = 0, tgtVal = 0, lyVal = 0;



                            params.forEach(p => {



                                const v = p.value || 0;



                                html += '<div class="flex justify-between gap-4 py-0.5"><span style="color:' + p.color + '">● ' + p.seriesName + ':</span><strong class="font-mono-num text-white">' + v.toFixed(2) + ' B ₫</strong></div>';



                                if (p.seriesName.includes('2026 Thực Tế')) actualVal = v;



                                if (p.seriesName.includes('Target')) tgtVal = v;



                                if (p.seriesName.includes('Cùng Kỳ')) lyVal = v;



                            });



                            if (tgtVal > 0) {



                                const ach = (actualVal / tgtVal * 100).toFixed(1);



                                html += '<div class="flex justify-between gap-4 py-0.5 border-t border-slate-700/80 mt-1 pt-1"><span class="text-slate-300">% Đạt Target:</span><strong class="' + (ach >= 100 ? 'text-emerald-400' : 'text-amber-400') + ' font-mono-num">' + ach + '%</strong></div>';



                            }



                            if (lyVal > 0) {



                                const yoy = (((actualVal - lyVal) / lyVal) * 100).toFixed(1);



                                html += '<div class="flex justify-between gap-4 py-0.5"><span class="text-slate-300">YoY Tăng Trưởng:</span><strong class="' + (yoy >= 0 ? 'text-emerald-400' : 'text-rose-400') + ' font-mono-num">' + (yoy >= 0 ? '+' : '') + yoy + '%</strong></div>';



                            }



                            return html;



                        }



                    },



                    legend: {



                        data: isSingleStore ? ['Cùng Kỳ 2025 (LY)', 'Sell-in 2026 Thực Tế'] : ['Cùng Kỳ 2025 (LY)', 'Sell-in 2026 Thực Tế', 'Chỉ Tiêu Target 2026'],



                        top: 4,



                        textStyle: { color: '#FFFFFF', fontSize: 11, fontWeight: 'bold' }



                    },



                    grid: { top: 48, right: 30, bottom: 25, left: 55 },



                    xAxis: {



                        type: 'category',



                        data: monthLabels,



                        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.3)' } },



                        axisLabel: { color: '#FFFFFF', fontSize: 11, fontWeight: 'bold' }



                    },



                    yAxis: {



                        type: 'value',



                        name: 'B ₫',



                        nameTextStyle: { color: '#CBD5E1', fontSize: 10 },



                        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.15)', type: 'dashed' } },



                        axisLabel: { color: '#E2E8F0', fontSize: 10, formatter: '{value}B' },



                        max: function(v) { return Math.ceil((v.max || 1) * 1.15); }



                    },



                    series: [



                        {



                            name: 'Cùng Kỳ 2025 (LY)',



                            type: 'bar',



                            data: si2025Bn,



                            barMaxWidth: 18,



                            itemStyle: {



                                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [



                                    { offset: 0, color: '#FBBF24' },



                                    { offset: 1, color: '#D97706' }



                                ]),



                                borderRadius: [4, 4, 0, 0]



                            },



                            label: {



                                show: true,



                                position: 'top',



                                color: '#FEF08A',



                                fontSize: 9.5,



                                fontWeight: 'bold',



                                textBorderColor: '#78350F',



                                textBorderWidth: 2,



                                formatter: function(p) { return p.value > 0 ? p.value.toFixed(2) : ''; }



                            }



                        },



                        {



                            name: 'Sell-in 2026 Thực Tế',



                            type: 'bar',



                            data: si2026Bn,



                            barMaxWidth: 18,



                            itemStyle: {



                                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [



                                    { offset: 0, color: '#38BDF8' },



                                    { offset: 1, color: '#0284C7' }



                                ]),



                                borderRadius: [4, 4, 0, 0]



                            },



                            label: {



                                show: true,



                                position: 'top',



                                color: '#FFFFFF',



                                fontSize: 9.5,



                                fontWeight: 'bold',



                                textBorderColor: '#0369A1',



                                textBorderWidth: 2,



                                formatter: function(p) { return p.value > 0 ? p.value.toFixed(2) : ''; }



                            }



                        },



                        {



                            name: 'Chỉ Tiêu Target 2026',



                            type: 'line',



                            data: isSingleStore ? [] : tgt2026Bn,



                            showSymbol: !isSingleStore,



                            symbolSize: 6,



                            itemStyle: { color: '#C084FC' },



                            lineStyle: { width: 3, color: '#A855F7', type: 'solid' },



                            label: {



                                show: !isSingleStore,



                                position: 'top',



                                color: '#E9D5FF',



                                fontSize: 9,



                                fontWeight: 'bold',



                                textBorderColor: '#581C87',



                                textBorderWidth: 2,



                                formatter: function(p) {



                                    const idx = p.dataIndex;



                                    const tgt = p.value || 0;



                                    const act = si2026Bn[idx] || 0;



                                    if (tgt > 0 && act > 0) {



                                        return (act / tgt * 100).toFixed(1) + '%';



                                    }



                                    return '';



                                }



                            }



                        }



                    ]



                };







                myChart.setOption(option);



                myChart.resize();







                // Click event to toggle month filter



                myChart.off('click');



                myChart.on('click', function(params) {



                    if (params && params.dataIndex !== undefined) {



                        const mNum = String(params.dataIndex + 1).padStart(2, '0');



                        selectSingleMonth(mNum);



                    }



                });







                // Render mini summary table below chart



                renderMtMonthlySummaryTable(si2026, tgt2026, si2025);







            } catch (e) {



                console.error("Error in renderMtMonthlyTrendChart:", e);



            }



        }







        function renderMtMonthlySummaryTable(si2026, tgt2026, si2025) {



            const tbody = document.getElementById('tbody-mt-monthly-summary');



            if (!tbody) return;







            const isSingleStore = !!(state.mtStore && state.mtStore !== 'ALL');



            const formatCell = (v) => {



                if (!v || v <= 0) return '-';



                return (v / 1e9).toFixed(2);



            };







            let html = '';



            // Row 1: Sell-in 2026



            html += '<tr class="border-b border-slate-100 hover:bg-slate-50">';



            html += '<td class="p-1.5 font-bold text-slate-800 text-left">Sell-in 2026 (B)</td>';



            for (let i = 0; i < 12; i++) {



                html += '<td class="p-1.5 text-right font-mono-num font-bold text-sky-700">' + formatCell(si2026[i]) + '</td>';



            }



            html += '</tr>';







            // Row 2: Target 2026



            html += '<tr class="border-b border-slate-100 hover:bg-slate-50">';



            html += '<td class="p-1.5 font-semibold text-slate-600 text-left">Target 2026 (B)</td>';



            for (let i = 0; i < 12; i++) {



                const val = tgt2026[i];



                html += '<td class="p-1.5 text-right font-mono-num text-purple-700">' + (isSingleStore ? '-' : formatCell(val)) + '</td>';



            }



            html += '</tr>';







            // Row 3: % Đạt Target



            html += '<tr class="border-b border-slate-100 hover:bg-slate-50">';



            html += '<td class="p-1.5 font-semibold text-slate-600 text-left">% Đạt Target</td>';



            for (let i = 0; i < 12; i++) {



                if (!isSingleStore && tgt2026[i] > 0 && si2026[i] > 0) {



                    const ach = (si2026[i] / tgt2026[i] * 100);



                    const isGreen = ach >= 100;



                    html += '<td class="p-1.5 text-right font-mono-num font-bold ' + (isGreen ? 'text-emerald-700' : 'text-rose-600') + '">' + ach.toFixed(1) + '%</td>';



                } else {



                    html += '<td class="p-1.5 text-right text-slate-400">-</td>';



                }



            }



            html += '</tr>';







            // Row 4: Cùng kỳ 2025



            html += '<tr class="border-b border-slate-100 hover:bg-slate-50">';



            html += '<td class="p-1.5 font-semibold text-slate-600 text-left">Cùng Kỳ 2025 (B)</td>';



            for (let i = 0; i < 12; i++) {



                html += '<td class="p-1.5 text-right font-mono-num text-amber-700">' + formatCell(si2025[i]) + '</td>';



            }



            html += '</tr>';







            // Row 5: YoY Growth %



            html += '<tr class="border-b border-slate-100 hover:bg-slate-50">';



            html += '<td class="p-1.5 font-semibold text-slate-600 text-left">Tăng Trưởng YoY</td>';



            for (let i = 0; i < 12; i++) {



                if (si2025[i] > 0 && si2026[i] > 0) {



                    const yoy = ((si2026[i] - si2025[i]) / si2025[i] * 100);



                    const isGreen = yoy >= 0;



                    html += '<td class="p-1.5 text-right font-mono-num font-bold ' + (isGreen ? 'text-emerald-700' : 'text-rose-600') + '">' + (isGreen ? '+' : '') + yoy.toFixed(1) + '%</td>';



                } else {



                    html += '<td class="p-1.5 text-right text-slate-400">-</td>';



                }



            }



            html += '</tr>';







            // Row 6: Số SKU Active



            html += '<tr class="hover:bg-slate-50 bg-slate-50/50 font-medium">';



            html += '<td class="p-1.5 font-semibold text-slate-600 text-left">Số SKU Active</td>';



            const storeSkuMap = {};



            if (isSingleStore && typeof MT_STORE_DATA !== 'undefined' && Array.isArray(MT_STORE_DATA)) {



                MT_STORE_DATA.forEach(d => {



                    if (isStoreMatch(d, state.mtStore)) {



                        storeSkuMap[d.m] = d.sku || 0;



                    }



                });



            }



            for (let i = 0; i < 12; i++) {



                const mKey = state.year + '-' + String(i + 1).padStart(2, '0');



                const skus = isSingleStore ? (storeSkuMap[i + 1] || 0) : ((typeof MT_SYS_SKUS !== 'undefined') ? (MT_SYS_SKUS[mKey] || 0) : 0);



                html += '<td class="p-1.5 text-right font-mono-num text-cyan-700 font-bold">' + (skus > 0 ? skus : '-') + '</td>';



            }



            html += '</tr>';







            tbody.innerHTML = html;



                if (typeof TableCustomizer !== 'undefined') TableCustomizer.init('table-mt-monthly-summary');



        }







        function renderMtChainsChart(data) {



            try {



                const myChart = getOrInitChart('chart-mt-chains');



                if (!myChart) return;







                const accMap = {};



                const isSingleStore = !!(state.mtStore && state.mtStore !== 'ALL');



                if (isSingleStore && typeof MT_STORE_DATA !== 'undefined' && Array.isArray(MT_STORE_DATA)) {



                    const selMonthNums = state.selectedMonths.map(m => parseInt(m, 10));



                    MT_STORE_DATA.forEach(d => {



                        if (!isStoreMatch(d, state.mtStore)) return;



                        if (selMonthNums.length > 0 && !selMonthNums.includes(d.m)) return;



                        const label = (d.acc || 'MT') + ' (' + (d.name || d.id) + ')';



                        accMap[label] = (accMap[label] || 0) + (d.val || 0);



                    });



                } else {



                    data.forEach(d => {



                        const a = d.key_account;



                        if (a && a !== 'Other Chain') accMap[a] = (accMap[a] || 0) + (Number(d.sellin_val) || 0);



                    });



                }







                const sorted = Object.keys(accMap).map(k => ({ name: k, val: parseFloat((accMap[k] / 1e9).toFixed(2)) })).sort((a,b) => b.val - a.val).slice(0, 10);







                const option = {



                    tooltip: {



                        trigger: 'axis',



                        axisPointer: { type: 'shadow' },



                        backgroundColor: 'rgba(15, 23, 42, 0.95)',



                        borderColor: '#38BDF8',



                        borderWidth: 1,



                        textStyle: { color: '#FFFFFF', fontSize: 11 },



                        formatter: function(params) {



                            if (!params || !params.length) return '';



                            const p = params[0];



                            return '<div class="font-bold border-b border-slate-700 pb-1 mb-1 text-sky-300">' + p.name + '</div>' +



                                   '<div class="flex justify-between gap-4 py-0.5"><span>' + p.seriesName + ':</span><strong class="font-mono-num text-white">' + p.value + ' B ₫</strong></div>';



                        }



                    },



                    legend: {



                        data: ['Sell-in Chuỗi MT'],



                        top: 0,



                        textStyle: { color: '#FFFFFF', fontSize: 11, fontWeight: 'bold' }



                    },



                    grid: { top: 28, right: 65, bottom: 15, left: 105 },



                    dataZoom: getCommonVerticalChartZoom(8, 12),



                    xAxis: {



                        type: 'value',



                        max: function(v) { return Math.ceil((v.max || 1) * 1.15); },



                        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.18)', type: 'dashed' } },



                        axisLabel: { color: '#E2E8F0', fontSize: 9.5, fontWeight: '500' }



                    },



                    yAxis: {



                        type: 'category',



                        data: sorted.map(d => d.name).reverse(),



                        axisLine: { show: false },



                        axisTick: { show: false },



                        axisLabel: { color: '#FFFFFF', fontSize: 10, fontWeight: 'bold' }



                    },



                    series: [{



                        name: 'Sell-in Chuỗi MT',



                        data: sorted.map(d => d.val).reverse(),



                        type: 'bar',



                        barMaxWidth: 14,



                        itemStyle: { color: '#38BDF8', borderRadius: [0, 4, 4, 0] },



                        label: {



                            show: true,



                            position: 'right',



                            color: '#FFFFFF',



                            fontSize: 10,



                            fontWeight: 'bold',



                            textBorderColor: '#0369A1',



                            textBorderWidth: 3,



                            formatter: function(p) { return p.value > 0 ? p.value.toFixed(2) + 'B' : ''; }



                        }



                    }]



                };



                myChart.setOption(option);



                myChart.resize();



            } catch (e) { console.error("Error in renderMtChainsChart:", e); }



        }







        function renderMtSubchanChart(data) {



            try {



                const myChart = getOrInitChart('chart-mt-subchan');



                if (!myChart) return;







                const scMap = { 'Hyper': 0, 'CS': 0, 'CVS': 0, 'Others': 0 };



                const isSingleStore = !!(state.mtStore && state.mtStore !== 'ALL');



                if (isSingleStore && typeof MT_STORE_DATA !== 'undefined' && Array.isArray(MT_STORE_DATA)) {



                    const selMonthNums = state.selectedMonths.map(m => parseInt(m, 10));



                    MT_STORE_DATA.forEach(d => {



                        if (!isStoreMatch(d, state.mtStore)) return;



                        if (selMonthNums.length > 0 && !selMonthNums.includes(d.m)) return;



                        const scRaw = String(d.sc || '').toUpperCase();



                        let k = 'Others';



                        if (scRaw.includes('HYPER')) k = 'Hyper';



                        else if (scRaw.includes('CS') || scRaw.includes('SUPER') || scRaw.includes('MIDDLE')) k = 'CS';



                        else if (scRaw.includes('CVS') || scRaw.includes('MINI')) k = 'CVS';



                        scMap[k] = (scMap[k] || 0) + (d.val || 0);



                    });



                } else {



                    data.forEach(d => {



                        const scRaw = String(d.sub_channel || '').toUpperCase();



                        let k = 'Others';



                        if (scRaw.includes('HYPER')) k = 'Hyper';



                        else if (scRaw.includes('CS') || scRaw.includes('SUPER') || scRaw.includes('MIDDLE')) k = 'CS';



                        else if (scRaw.includes('CVS') || scRaw.includes('MINI')) k = 'CVS';



                        scMap[k] = (scMap[k] || 0) + (Number(d.sellin_val) || 0);



                    });



                }







                const barData = [



                    { name: 'CS', val: parseFloat(((scMap['CS']||0)/1e9).toFixed(2)) },



                    { name: 'Hyper', val: parseFloat(((scMap['Hyper']||0)/1e9).toFixed(2)) },



                    { name: 'Others', val: parseFloat(((scMap['Others']||0)/1e9).toFixed(2)) },



                    { name: 'CVS', val: parseFloat(((scMap['CVS']||0)/1e9).toFixed(2)) }



                ];



                barData.sort((a, b) => b.val - a.val);







                const option = {



                    tooltip: {



                        trigger: 'axis',



                        axisPointer: { type: 'shadow' },



                        backgroundColor: 'rgba(15, 23, 42, 0.95)',



                        borderColor: '#C084FC',



                        borderWidth: 1,



                        textStyle: { color: '#FFFFFF', fontSize: 11 },



                        formatter: function(params) {



                            if (!params || !params.length) return '';



                            const p = params[0];



                            return '<div class="font-bold border-b border-slate-700 pb-1 mb-1 text-purple-300">' + p.name + '</div>' +



                                   '<div class="flex justify-between gap-4 py-0.5"><span>' + p.seriesName + ':</span><strong class="font-mono-num text-white">' + p.value + ' B ₫</strong></div>';



                        }



                    },



                    legend: {



                        data: ['Cơ Cấu Sub-channel'],



                        top: 0,



                        textStyle: { color: '#FFFFFF', fontSize: 11, fontWeight: 'bold' }



                    },



                    grid: { top: 28, right: 65, bottom: 15, left: 75 },



                    dataZoom: getCommonVerticalChartZoom(8, 12),



                    xAxis: {



                        type: 'value',



                        max: function(v) { return Math.ceil((v.max || 1) * 1.15); },



                        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.18)', type: 'dashed' } },



                        axisLabel: { color: '#E2E8F0', fontSize: 9.5, fontWeight: '500' }



                    },



                    yAxis: {



                        type: 'category',



                        data: barData.map(d => d.name).reverse(),



                        axisLine: { show: false },



                        axisTick: { show: false },



                        axisLabel: { color: '#FFFFFF', fontSize: 11, fontWeight: 'bold' }



                    },



                    series: [{



                        name: 'Cơ Cấu Sub-channel',



                        data: barData.map(d => d.val).reverse(),



                        type: 'bar',



                        barMaxWidth: 16,



                        itemStyle: { color: '#C084FC', borderRadius: [0, 4, 4, 0] },



                        label: {



                            show: true,



                            position: 'right',



                            color: '#FFFFFF',



                            fontSize: 10,



                            fontWeight: 'bold',



                            textBorderColor: '#7E22CE',



                            textBorderWidth: 3,



                            formatter: function(p) { return p.value > 0 ? p.value.toFixed(2) + 'B' : ''; }



                        }



                    }]



                };



                myChart.setOption(option);



                myChart.resize();



            } catch (e) { console.error("Error in renderMtSubchanChart:", e); }



        }







        function renderMtDailyChart() {



            try {



                const myChart = getOrInitChart('chart-mt-daily');



                if (!myChart) return;







                const isSingleStore = !!(state.mtStore && state.mtStore !== 'ALL');



                const selMonthNums = state.selectedMonths.map(m => parseInt(m, 10));



                const daysMap = {};







                const hasMtDaily = (typeof MT_DAILY_DATA !== 'undefined' && Array.isArray(MT_DAILY_DATA) && MT_DAILY_DATA.length > 0);







                if (hasMtDaily) {



                    if (isSingleStore && typeof MT_STORE_DATA !== 'undefined' && Array.isArray(MT_STORE_DATA)) {



                        const stRecs = MT_STORE_DATA.filter(d => isStoreMatch(d, state.mtStore));



                        let stCurVal = 0;



                        stRecs.forEach(r => {



                            if (selMonthNums.length === 0 || selMonthNums.includes(r.m)) {



                                stCurVal += (r.val || 0);



                            }



                        });







                        const stAcc = stRecs[0]?.acc || state.mtChain;



                        const stSubChan = stRecs[0]?.sc || state.mtSubChan;







                        let chainDaily = {};



                        let chainTotal = 0;



                        MT_DAILY_DATA.filter(d => {



                            const dtStr = String(d.date_val || '');



                            if (!dtStr.startsWith(state.year)) return false;



                            const m = dtStr.substring(5, 7);



                            if (!state.selectedMonths.includes(m)) return false;



                            if (stAcc && stAcc !== 'ALL' && d.key_account === stAcc) return true;



                            if (stSubChan && stSubChan !== 'ALL' && d.sub_channel === stSubChan) return true;



                            return false;



                        }).forEach(d => {



                            const dt = String(d.date_val);



                            const v = Number(d.val) || 0;



                            chainDaily[dt] = (chainDaily[dt] || 0) + v;



                            chainTotal += v;



                        });







                        if (chainTotal === 0 && typeof DAILY_DATA !== 'undefined' && Array.isArray(DAILY_DATA)) {



                            DAILY_DATA.filter(d => {



                                const dtStr = String(d.date_val || '');



                                if (!dtStr.startsWith(state.year)) return false;



                                const m = dtStr.substring(5, 7);



                                if (!state.selectedMonths.includes(m)) return false;



                                return d.channel === 'MT';



                            }).forEach(d => {



                                const dt = String(d.date_val);



                                const v = Number(d.daily_sellin) || 0;



                                chainDaily[dt] = (chainDaily[dt] || 0) + v;



                                chainTotal += v;



                            });



                        }







                        const scale = chainTotal > 0 ? (stCurVal / chainTotal) : 0;



                        Object.keys(chainDaily).forEach(dt => {



                            daysMap[dt] = chainDaily[dt] * scale;



                        });







                    } else {



                        MT_DAILY_DATA.filter(d => {



                            const dtStr = String(d.date_val || '');



                            if (!dtStr.startsWith(state.year)) return false;



                            const m = dtStr.substring(5, 7);



                            if (!state.selectedMonths.includes(m)) return false;



                            if (state.mtSubChan !== 'ALL' && d.sub_channel !== state.mtSubChan) return false;



                            if (state.mtChain !== 'ALL' && d.key_account !== state.mtChain) return false;



                            return true;



                        }).forEach(d => {



                            const dt = String(d.date_val);



                            daysMap[dt] = (daysMap[dt] || 0) + (Number(d.val) || 0);



                        });



                    }







                    // Apply persistent Product Filters (Storage, Cate, PH1, PH2) if active



                    const hasProdFilter = (state.prodStorage !== 'ALL' || state.prodCate !== 'ALL' || state.prodPh1 !== 'ALL' || state.prodPh2 !== 'ALL' || state.prodSku !== 'ALL' || state.prodSku !== 'ALL');



                    if (hasProdFilter && typeof DAILY_DATA !== 'undefined' && Array.isArray(DAILY_DATA)) {



                        const prodDayTotal = {};



                        const allMtDayTotal = {};



                        DAILY_DATA.filter(d => {



                            const dtStr = String(d.date_val || '');



                            if (!dtStr.startsWith(state.year)) return false;



                            const m = dtStr.substring(5, 7);



                            if (!state.selectedMonths.includes(m)) return false;



                            return d.channel === 'MT';



                        }).forEach(d => {



                            const dt = String(d.date_val);



                            const v = Number(d.daily_sellin) || 0;



                            allMtDayTotal[dt] = (allMtDayTotal[dt] || 0) + v;



                            if (matchProductRecord(d)) {



                                prodDayTotal[dt] = (prodDayTotal[dt] || 0) + v;



                            }



                        });







                        Object.keys(daysMap).forEach(dt => {



                            const allV = allMtDayTotal[dt] || 0;



                            const prodV = prodDayTotal[dt] || 0;



                            const r = allV > 0 ? (prodV / allV) : 0;



                            daysMap[dt] = (daysMap[dt] || 0) * r;



                        });



                    }







                } else {



                    // Fallback to DAILY_DATA



                    let filterTotal = 0;



                    if (isSingleStore && typeof MT_STORE_DATA !== 'undefined' && Array.isArray(MT_STORE_DATA)) {



                        const stRecs = MT_STORE_DATA.filter(d => isStoreMatch(d, state.mtStore));



                        stRecs.forEach(r => {



                            if (selMonthNums.length === 0 || selMonthNums.includes(r.m)) {



                                filterTotal += (r.val || 0);



                            }



                        });



                    } else if (typeof MT_TREE !== 'undefined' && Array.isArray(MT_TREE)) {



                        MT_TREE.filter(d => {



                            if (d.year !== state.year || !state.selectedMonths.includes(d.month_num)) return false;



                            if (state.mtSubChan !== 'ALL' && d.sub_channel !== state.mtSubChan) return false;



                            if (state.mtChain !== 'ALL' && d.key_account !== state.mtChain) return false;



                            if (!matchProductRecord(d)) return false;



                            return true;



                        }).forEach(d => filterTotal += (Number(d.sellin_val) || 0));



                    }







                    let allMtMonthTotal = 0;



                    if (typeof MT_TREE !== 'undefined' && Array.isArray(MT_TREE)) {



                        MT_TREE.filter(d => d.year === state.year && state.selectedMonths.includes(d.month_num))



                            .forEach(d => allMtMonthTotal += (Number(d.sellin_val) || 0));



                    }







                    const scale = (allMtMonthTotal > 0 && filterTotal > 0) ? (filterTotal / allMtMonthTotal) : 1;







                    if (typeof DAILY_DATA !== 'undefined' && Array.isArray(DAILY_DATA)) {



                        DAILY_DATA.filter(d => {



                            const dtStr = String(d.date_val || '');



                            if (!dtStr.startsWith(state.year)) return false;



                            const m = dtStr.substring(5, 7);



                            if (!state.selectedMonths.includes(m)) return false;



                            if (d.channel !== 'MT') return false;



                            if (!matchProductRecord(d)) return false;



                            return true;



                        }).forEach(d => {



                            const dt = String(d.date_val);



                            daysMap[dt] = (daysMap[dt] || 0) + (Number(d.daily_sellin) || 0) * scale;



                        });



                    }



                }







                const sortedDays = Object.keys(daysMap).sort();



                const dayLabels = sortedDays.map(d => d.substring(5));







                let maxVal = 0;



                sortedDays.forEach(d => {



                    const v = daysMap[d] || 0;



                    if (v > maxVal) maxVal = v;



                });







                const useMillions = maxVal < 1e9 && maxVal > 0;



                const divisor = useMillions ? 1e6 : 1e9;



                const unitLabel = useMillions ? 'M' : 'B';



                const vals = sortedDays.map(d => {



                    const rawVal = daysMap[d] || 0;



                    return {



                        value: parseFloat((rawVal / divisor).toFixed(2)),



                        rawVal: rawVal



                    };



                });







                const option = {



                    tooltip: {



                        trigger: 'axis',



                        axisPointer: { type: 'line', lineStyle: { color: 'rgba(255,255,255,0.4)', width: 1, type: 'dashed' } },



                        formatter: function(params) {



                            if (!params || !params.length) return '';



                            const p = params[0];



                            const unitText = useMillions ? ' M ₫' : ' B ₫';



                            const raw = p.data && p.data.rawVal !== undefined ? p.data.rawVal : (Number(p.value) * divisor);



                            return '<div class="font-sans text-xs p-1"><b>Ngày ' + p.name + '</b><br/>' +



                                   '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#34D399;margin-right:5px;"></span>' +



                                   'Sell-in Ngày: <b>' + p.value + unitText + '</b><br/>' +



                                   '<span class="text-slate-300 text-[10px]">' + formatExactVND(raw) + '</span></div>';



                        }



                    },



                    legend: {



                        data: ['Sell-in Ngày'],



                        top: 4,



                        textStyle: { color: '#FFFFFF', fontSize: 11, fontWeight: 'bold' }



                    },



                    grid: { top: 38, right: 30, bottom: 28, left: 48 },



                    dataZoom: getCommonChartZoom(3, 14),



                    xAxis: {



                        type: 'category',



                        data: dayLabels,



                        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.25)' } },



                        axisLabel: { color: '#E2E8F0', fontSize: 10, fontWeight: '500' }



                    },



                    yAxis: {



                        type: 'value',



                        max: function(v) { return Math.ceil(v.max * 1.18); },



                        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.12)', type: 'dashed' } },



                        axisLabel: { color: '#E2E8F0', fontSize: 9.5, formatter: '{value}' + unitLabel }



                    },



                    series: [{



                        name: 'Sell-in Ngày',



                        data: vals,



                        type: 'line',



                        smooth: 0.35,



                        showSymbol: true,



                        symbolSize: 6,



                        itemStyle: { color: '#34D399', borderColor: '#FFFFFF', borderWidth: 1.5 },



                        lineStyle: { width: 2.5, color: '#34D399' },



                        areaStyle: {



                            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [



                                { offset: 0, color: 'rgba(52, 211, 153, 0.45)' },



                                { offset: 1, color: 'rgba(52, 211, 153, 0.02)' }



                            ])



                        },



                        label: {



                            show: true,



                            position: 'top',



                            color: '#FFFFFF',



                            fontSize: 9,



                            fontWeight: 'bold',



                            textBorderColor: '#065F46',



                            textBorderWidth: 2.5,



                            formatter: function(p) { return p.value > 0 ? (useMillions ? p.value.toFixed(1) : p.value.toFixed(2)) : ''; }



                        }



                    }]



                };



                myChart.setOption(option);



                myChart.resize();



            } catch (e) { console.error("Error in renderMtDailyChart:", e); }



        }







        // =========================================================================



        // KHỐI 4: PHÂN CẤP SẢN PHẨM & KÊNH MT (VỚI LM MTD, YTD, YoY YTD %, SKU, STORES)



        // =========================================================================



        function renderMtProductTree() {



            try {



                if (!state.treeOpen) state.treeOpen = {};



                const tbody = document.getElementById('tbody-tree-prod-mt');



                if (!tbody) return;







                const validPh1s = getValidPh1SetForCurrentFilter();



                const dataCur = MT_TREE.filter(d => {



                    if (d.year !== state.year || !state.selectedMonths.includes(d.month_num)) return false;



                    if (state.mtSubChan !== 'ALL' && d.sub_channel !== state.mtSubChan) return false;



                    if (state.mtChain !== 'ALL' && d.key_account !== state.mtChain) return false;



                    if (state.mtCluster !== 'ALL' && d.cluster !== state.mtCluster) return false;



                    if (!matchProductRecord(d)) return false;



                    return true;



                });







                let totalCur = 0;



                dataCur.forEach(d => totalCur += (Number(d.sellin_val) || 0));







                // Prior Year LY (Same Months)



                const lyYear = (parseInt(state.year) - 1).toString();



                const lyMap = {};



                MT_TREE.filter(d => {



                    if (d.year !== lyYear || !state.selectedMonths.includes(d.month_num)) return false;



                    if (state.mtSubChan !== 'ALL' && d.sub_channel !== state.mtSubChan) return false;



                    if (state.mtChain !== 'ALL' && d.key_account !== state.mtChain) return false;



                    if (state.mtCluster !== 'ALL' && d.cluster !== state.mtCluster) return false;



                    if (!matchProductRecord(d)) return false;



                    return true;



                }).forEach(d => {



                    const st = d.storage || 'Ambient';



                    const cat = d.cate || 'Other Category';



                    const p1 = d.ph1 || 'Other PH1';



                    const p2 = d.ph2 || 'Other PH2';



                    const v = Number(d.sellin_val) || 0;



                    lyMap[st] = (lyMap[st] || 0) + v;



                    lyMap[st + '_' + cat] = (lyMap[st + '_' + cat] || 0) + v;



                    lyMap[st + '_' + cat + '_' + p1] = (lyMap[st + '_' + cat + '_' + p1] || 0) + v;



                    lyMap[st + '_' + cat + '_' + p1 + '_' + p2] = (lyMap[st + '_' + cat + '_' + p1 + '_' + p2] || 0) + v;



                });







                // YTD 2026 & YTD LY 2025 (1 to max selected month)



                const ytdMonths = getYtdMonths();



                const ytdProd2026 = {};



                const ytdProd2025 = {};



                MT_TREE.filter(d => {



                    if (state.mtSubChan !== 'ALL' && d.sub_channel !== state.mtSubChan) return false;



                    if (state.mtChain !== 'ALL' && d.key_account !== state.mtChain) return false;



                    if (state.mtCluster !== 'ALL' && d.cluster !== state.mtCluster) return false;



                    if (!matchProductRecord(d)) return false;



                    if (!ytdMonths.includes(d.month_num)) return false;



                    return d.year === state.year || d.year === lyYear;



                }).forEach(d => {



                    const st = d.storage || 'Ambient';



                    const cat = d.cate || 'Other Category';



                    const p1 = d.ph1 || 'Other PH1';



                    const p2 = d.ph2 || 'Other PH2';



                    const v = Number(d.sellin_val) || 0;



                    const map = (d.year === state.year) ? ytdProd2026 : ytdProd2025;







                    map[st] = (map[st] || 0) + v;



                    map[st + '_' + cat] = (map[st + '_' + cat] || 0) + v;



                    map[st + '_' + cat + '_' + p1] = (map[st + '_' + cat + '_' + p1] || 0) + v;



                    map[st + '_' + cat + '_' + p1 + '_' + p2] = (map[st + '_' + cat + '_' + p1 + '_' + p2] || 0) + v;



                });







                // Targets for MT Product



                const tgtMap = {};



                if (typeof TARGET_SELLIN !== 'undefined' && Array.isArray(TARGET_SELLIN)) {



                    TARGET_SELLIN.filter(d => {



                        if (d.channel !== 'MT' || d.year !== state.year || !state.selectedMonths.includes(d.month.substring(5, 7))) return false;



                        if (state.mtSubChan !== 'ALL' && d.sub_channel && d.sub_channel !== state.mtSubChan) return false;



                        if (state.mtChain !== 'ALL' && d.account_npp && d.account_npp !== state.mtChain) return false;



                        if (!matchProductTarget(d, validPh1s)) return false;



                        return true;



                    }).forEach(d => {



                        const st = d.storage || 'Ambient';



                        const p1 = d.ph1 || 'Other PH1';



                        const v = Number(d.target_amt) || 0;



                        tgtMap[st] = (tgtMap[st] || 0) + v;



                        tgtMap[st + '_' + p1] = (tgtMap[st + '_' + p1] || 0) + v;



                    });



                }







                // Daily MTD for Product Tree



                const curMonthPrefix = state.year + '-' + (state.selectedMonths.length === 1 ? state.selectedMonths[0] : '10');



                const curMonthNum = parseInt(curMonthPrefix.substring(5, 7), 10);



                const priorMonthNum = curMonthNum === 1 ? 12 : curMonthNum - 1;



                const priorYearNum = curMonthNum === 1 ? parseInt(state.year, 10) - 1 : parseInt(state.year, 10);



                const priorMonthPrefix = priorYearNum + '-' + String(priorMonthNum).padStart(2, '0');







                let maxDay = 0;



                if (typeof DAILY_DATA !== 'undefined' && Array.isArray(DAILY_DATA)) {



                    DAILY_DATA.forEach(d => {



                        const dt = String(d.date_val || '');



                        if (dt.startsWith(curMonthPrefix) && (Number(d.daily_sellin) || 0) > 0) {



                            const dn = parseInt(dt.substring(8, 10), 10);



                            if (dn > maxDay) maxDay = dn;



                        }



                    });



                }



                if (maxDay === 0) maxDay = 31;







                const lmMtdMap = {};



                if (typeof DAILY_DATA !== 'undefined' && Array.isArray(DAILY_DATA)) {



                    DAILY_DATA.forEach(d => {



                        if (d.channel !== 'MT') return;



                        const dt = String(d.date_val || '');



                        const v = Number(d.daily_sellin) || 0;



                        if (v === 0) return;



                        const dn = parseInt(dt.substring(8, 10), 10);



                        if (dn > maxDay) return;







                        if (dt.startsWith(priorMonthPrefix)) {



                            const st = d.storage || 'Ambient';



                            const cat = d.cate || 'Other Category';



                            const p1 = d.ph1 || 'Other PH1';



                            const p2 = d.ph2 || 'Other PH2';



                            lmMtdMap[st] = (lmMtdMap[st] || 0) + v;



                            lmMtdMap[st + '_' + cat] = (lmMtdMap[st + '_' + cat] || 0) + v;



                            lmMtdMap[st + '_' + cat + '_' + p1] = (lmMtdMap[st + '_' + cat + '_' + p1] || 0) + v;



                            lmMtdMap[st + '_' + cat + '_' + p1 + '_' + p2] = (lmMtdMap[st + '_' + cat + '_' + p1 + '_' + p2] || 0) + v;



                        }



                    });



                }







                // Build hierarchy



                const tree = {};



                dataCur.forEach(d => {



                    const st = d.storage || 'Ambient';



                    const cat = d.cate || 'Other Category';



                    const p1 = d.ph1 || 'Other PH1';



                    const p2 = d.ph2 || 'Other PH2';



                    const v = Number(d.sellin_val) || 0;







                    if (!tree[st]) tree[st] = { val: 0, children: {} };



                    tree[st].val += v;







                    if (!tree[st].children[cat]) tree[st].children[cat] = { val: 0, children: {} };



                    tree[st].children[cat].val += v;







                    if (!tree[st].children[cat].children[p1]) tree[st].children[cat].children[p1] = { val: 0, children: {} };



                    tree[st].children[cat].children[p1].val += v;







                    if (!tree[st].children[cat].children[p1].children[p2]) tree[st].children[cat].children[p1].children[p2] = { val: 0 };



                    tree[st].children[cat].children[p1].children[p2].val += v;



                });







                const htmlRows = [];



                Object.keys(tree).sort().forEach(st => {



                    const stVal = tree[st].val;



                    const stTgt = tgtMap[st] || 0;



                    const stLy = lyMap[st] || 0;



                    const stLm = lmMtdMap[st] || 0;



                    const stMom = stLm > 0 ? ((stVal - stLm) / stLm * 100) : null;



                    const stYtd = ytdProd2026[st] || 0;



                    const stYtdLy = ytdProd2025[st] || 0;



                    const stOpen = state.treeOpen['mt_prod_' + st] !== false;







                                        const stTotalStyle = 'background-color: #E0F2FE !important; color: #0369A1 !important; font-weight: 800 !important; border-top: 2px solid #38BDF8 !important; border-bottom: 2px solid #38BDF8 !important;';



                    const stTotalStyleFirstCol = 'background-color: #E0F2FE !important; color: #0369A1 !important; font-weight: 800 !important; border-top: 2px solid #38BDF8 !important; border-bottom: 2px solid #38BDF8 !important; position: sticky; left: 0; z-index: 5;';







                    let r = '<tr class="total-row-prod font-bold text-slate-900 text-xs shadow-2xs" style="' + stTotalStyle + '" data-level="0">';



                    r += '<td class="th-first-col tree-lvl-0 select-none cursor-pointer py-2 px-2" style="' + stTotalStyleFirstCol + '" onclick="toggleTreeProdMtNode(&quot;mt_prod_' + st + '&quot;)"><div class="flex items-center min-w-0 w-full"><span class="tree-toggle flex-shrink-0 mr-1.5 px-1 py-0.2 rounded text-[10px]" style="background-color: #0284C7; color: #ffffff; font-weight: 900;">' + (stOpen ? '▼' : '▶') + '</span><strong style="color: #0C4A6E; font-weight: 900; font-size: 11px; letter-spacing: 0.5px; text-transform: uppercase;">' + st + '</strong><span style="font-size: 9.5px; font-weight: 800; color: #0369A1; background-color: #BAE6FD; padding: 2px 6px; border-radius: 4px; margin-left: 6px;">TỔNG</span></div></td>';



                    r += '<td class="text-right font-mono-num py-2" style="' + stTotalStyle + ' color: #0369A1; font-weight: 900;">' + formatVND(stVal) + '</td>';



                    r += '<td class="text-right font-mono-num py-2" style="' + stTotalStyle + ' color: #334155; font-weight: 700;">' + (stTgt > 0 ? formatVND(stTgt) : '-') + '</td>';



                    r += '<td class="text-right font-mono-num py-2" style="' + stTotalStyle + '">' + formatAchieveBadge(stVal, stTgt) + '</td>';



                    r += '<td class="text-right font-mono-num py-2" style="' + stTotalStyle + ' color: #334155; font-weight: 700;">' + (stLm > 0 ? formatVND(stLm) : '-') + '</td>';



                    r += '<td class="text-right font-mono-num py-2" style="' + stTotalStyle + '">' + (stMom !== null ? '<span class="' + (stMom >= 0 ? 'text-emerald-700 font-bold' : 'text-rose-600 font-bold') + '">' + (stMom >= 0 ? '+' : '') + stMom.toFixed(1) + '%</span>' : '-') + '</td>';



                    r += '<td class="text-right font-mono-num py-2" style="' + stTotalStyle + ' font-weight: 800;">' + formatTreeYoy(stVal, stLy) + '</td>';



                    r += '<td class="text-right font-mono-num py-2" style="' + stTotalStyle + ' color: #312E81; font-weight: 900;">' + formatVND(stYtd) + '</td>';



                    r += '<td class="text-right font-mono-num py-2" style="' + stTotalStyle + ' color: #334155; font-weight: 700;">' + (stYtdLy > 0 ? formatVND(stYtdLy) : '-') + '</td>';



                    r += '<td class="text-right font-mono-num py-2" style="' + stTotalStyle + ' font-weight: 900;">' + formatTreeYoy(stYtd, stYtdLy) + '</td>';



                    r += '<td class="text-right font-mono-num py-2" style="' + stTotalStyle + ' color: #0891B2; font-weight: 800;">-</td>';



                    r += '</tr>';



                    htmlRows.push(r);







                    if (stOpen) {



                        const cats = tree[st].children;



                        Object.keys(cats).sort().forEach(cat => {



                            const catVal = cats[cat].val;



                            const catLy = lyMap[st + '_' + cat] || 0;



                            const catLm = lmMtdMap[st + '_' + cat] || 0;



                            const catMom = catLm > 0 ? ((catVal - catLm) / catLm * 100) : null;



                            const catYtd = ytdProd2026[st + '_' + cat] || 0;



                            const catYtdLy = ytdProd2025[st + '_' + cat] || 0;



                            const catOpen = state.treeOpen['mt_prod_' + st + '_' + cat] === true;







                            let cr = '<tr class="font-semibold text-slate-700 text-xs bg-white hover:bg-slate-50 border-b border-slate-100">';



                            cr += '<td class="th-first-col tree-lvl-1 select-none cursor-pointer" onclick="toggleTreeProdMtNode(&quot;mt_prod_' + st + '_' + cat + '&quot;)"><span class="tree-toggle mr-1 font-mono text-slate-400">' + (catOpen ? '▼' : '▶') + '</span> ' + cat + '</td>';



                            cr += '<td class="text-right font-mono-num">' + formatVND(catVal) + '</td>';



                            cr += '<td class="text-right font-mono-num text-slate-400">-</td>';



                            cr += '<td class="text-right font-mono-num text-slate-400">-</td>';



                            cr += '<td class="text-right font-mono-num text-slate-500">' + (catLm > 0 ? formatVND(catLm) : '-') + '</td>';



                            cr += '<td class="text-right font-mono-num">' + (catMom !== null ? '<span class="' + (catMom >= 0 ? 'text-emerald-700' : 'text-rose-600') + '">' + (catMom >= 0 ? '+' : '') + catMom.toFixed(1) + '%</span>' : '-') + '</td>';



                            cr += '<td class="text-right font-mono-num">' + formatTreeYoy(catVal, catLy) + '</td>';



                            cr += '<td class="text-right font-mono-num font-semibold text-indigo-700">' + formatVND(catYtd) + '</td>';



                            cr += '<td class="text-right font-mono-num text-slate-500">' + (catYtdLy > 0 ? formatVND(catYtdLy) : '-') + '</td>';



                            cr += '<td class="text-right font-mono-num">' + formatTreeYoy(catYtd, catYtdLy) + '</td>';



                            cr += '<td class="text-right font-mono-num text-cyan-700 font-bold">-</td>';



                            cr += '</tr>';



                            htmlRows.push(cr);







                            if (catOpen) {



                                const p1s = cats[cat].children;



                                Object.keys(p1s).sort().forEach(p1 => {



                                    const p1Val = p1s[p1].val;



                                    const p1Tgt = tgtMap[st + '_' + p1] || 0;



                                    const p1Ly = lyMap[st + '_' + cat + '_' + p1] || 0;



                                    const p1Lm = lmMtdMap[st + '_' + cat + '_' + p1] || 0;



                                    const p1Mom = p1Lm > 0 ? ((p1Val - p1Lm) / p1Lm * 100) : null;



                                    const p1Ytd = ytdProd2026[st + '_' + cat + '_' + p1] || 0;



                                    const p1YtdLy = ytdProd2025[st + '_' + cat + '_' + p1] || 0;







                                    let p1r = '<tr class="text-slate-600 text-xs bg-slate-50/40 hover:bg-slate-50 border-b border-slate-100">';



                                    p1r += '<td class="th-first-col tree-lvl-2 select-none"><span class="inline-block w-1.5 h-1.5 rounded-full bg-sky-400 mr-2 flex-shrink-0"></span> ' + p1 + '</td>';



                                    p1r += '<td class="text-right font-mono-num">' + formatVND(p1Val) + '</td>';



                                    p1r += '<td class="text-right font-mono-num font-semibold text-slate-600">' + (p1Tgt > 0 ? formatVND(p1Tgt) : '-') + '</td>';



                                    p1r += '<td class="text-right font-mono-num">' + formatAchieveBadge(p1Val, p1Tgt) + '</td>';



                                    p1r += '<td class="text-right font-mono-num text-slate-500">' + (p1Lm > 0 ? formatVND(p1Lm) : '-') + '</td>';



                                    p1r += '<td class="text-right font-mono-num">' + (p1Mom !== null ? '<span class="' + (p1Mom >= 0 ? 'text-emerald-700' : 'text-rose-600') + '">' + (p1Mom >= 0 ? '+' : '') + p1Mom.toFixed(1) + '%</span>' : '-') + '</td>';



                                    p1r += '<td class="text-right font-mono-num">' + formatTreeYoy(p1Val, p1Ly) + '</td>';



                                    p1r += '<td class="text-right font-mono-num text-indigo-700">' + formatVND(p1Ytd) + '</td>';



                                    p1r += '<td class="text-right font-mono-num text-slate-500">' + (p1YtdLy > 0 ? formatVND(p1YtdLy) : '-') + '</td>';



                                    p1r += '<td class="text-right font-mono-num">' + formatTreeYoy(p1Ytd, p1YtdLy) + '</td>';



                                    p1r += '<td class="text-right font-mono-num text-cyan-700 font-bold">-</td>';



                                    p1r += '</tr>';



                                    htmlRows.push(p1r);



                                });



                            }



                        });



                    }



                });







                tbody.innerHTML = htmlRows.join('');



            } catch (e) {



                console.error("Error in renderMtProductTree:", e);



            }



        }







        function toggleTreeProdMtNode(key) {



            state.treeOpen[key] = !state.treeOpen[key];



            renderMtProductTree();



        }







        function toggleAllProductMtNodes() {



            const keys = Object.keys(state.treeOpen).filter(k => k.startsWith('mt_prod_'));



            const anyOpen = keys.some(k => state.treeOpen[k] === true);



            keys.forEach(k => state.treeOpen[k] = !anyOpen);



            renderMtProductTree();



        }







        function toggleTreeMtNode(key) {



            state.treeOpen[key] = !state.treeOpen[key];



            renderMtTree();



        }







        function toggleAllMtNodes() {



            const anyOpen = Object.keys(state.treeOpen).some(k => k.startsWith('mt_') && !k.startsWith('mt_prod_') && state.treeOpen[k] === true);



            if (anyOpen) {



                Object.keys(state.treeOpen).forEach(k => {



                    if (k.startsWith('mt_') && !k.startsWith('mt_prod_')) state.treeOpen[k] = false;



                });



            } else {



                ['MT)CS', 'MT)CVS', 'MT)Hyper', 'MT)Middle', 'MT)Other'].forEach(sc => {



                    state.treeOpen['mt_' + sc] = true;



                });



                if (typeof MT_TREE !== 'undefined' && Array.isArray(MT_TREE)) {



                    MT_TREE.forEach(d => {



                        const sc = d.sub_channel || 'MT)Other';



                        state.treeOpen['mt_' + sc] = true;



                    });



                }



            }



            renderMtTree();



        }







        function renderMtTree() {



            try {



                if (!state.treeOpen) state.treeOpen = {};



                const tbody = document.getElementById('tbody-tree-mt');



                if (!tbody) return;







                const validPh1s = getValidPh1SetForCurrentFilter();



                const isSingleStore = !!(state.mtStore && state.mtStore !== 'ALL');



                const selMonthNums = state.selectedMonths.map(m => parseInt(m, 10));



                const ytdMonths = getYtdMonths();



                const ytdMonthNums = ytdMonths.map(m => parseInt(m, 10));







                let data = [];



                if (isSingleStore && typeof MT_STORE_DATA !== 'undefined' && Array.isArray(MT_STORE_DATA)) {



                    const stRecs = MT_STORE_DATA.filter(d => isStoreMatch(d, state.mtStore));



                    data = stRecs.filter(d => selMonthNums.length === 0 || selMonthNums.includes(d.m)).map(d => ({



                        sub_channel: d.sc || 'MT)Other',



                        key_account: d.acc || 'Other Chain',



                        cluster: d.cl || 'Khác',



                        sellin_val: d.val || 0



                    }));



                } else {



                    data = MT_TREE.filter(d => {



                        if (d.year !== state.year || !state.selectedMonths.includes(d.month_num)) return false;



                        if (state.mtSubChan !== 'ALL' && d.sub_channel !== state.mtSubChan) return false;



                        if (state.mtChain !== 'ALL' && d.key_account !== state.mtChain) return false;



                        if (!matchProductRecord(d)) return false;



                        return true;



                    });



                }







                let total = 0; data.forEach(d => total += (Number(d.sellin_val) || 0));







                const mtTargetMap = {};



                const scTargetMap = {};



                if (!isSingleStore && typeof TARGET_SELLIN !== 'undefined' && Array.isArray(TARGET_SELLIN)) {



                    TARGET_SELLIN.filter(d => {



                        if (d.channel !== 'MT') return false;



                        if (d.year !== state.year || !state.selectedMonths.includes(d.month.substring(5, 7))) return false;



                        if (state.mtSubChan !== 'ALL' && d.sub_channel && d.sub_channel !== state.mtSubChan) return false;



                        if (state.mtChain !== 'ALL' && d.account_npp && d.account_npp !== state.mtChain) return false;



                        if (!matchProductTarget(d, validPh1s)) return false;



                        return true;



                    }).forEach(d => {



                        const tgt = Number(d.target_amt) || 0;



                        if (d.account_npp) {



                            const accClean = d.account_npp.toLowerCase().trim();



                            mtTargetMap[d.account_npp] = (mtTargetMap[d.account_npp] || 0) + tgt;



                            mtTargetMap[accClean] = (mtTargetMap[accClean] || 0) + tgt;



                            if (d.sub_channel) {



                                mtTargetMap[d.sub_channel + '_' + d.account_npp] = (mtTargetMap[d.sub_channel + '_' + d.account_npp] || 0) + tgt;



                                mtTargetMap[d.sub_channel + '_' + accClean] = (mtTargetMap[d.sub_channel + '_' + accClean] || 0) + tgt;



                            }



                        }



                        if (d.sub_channel) {



                            scTargetMap[d.sub_channel] = (scTargetMap[d.sub_channel] || 0) + tgt;



                        }



                    });



                }







                // LY Map (Same Months)



                const lyYear = (parseInt(state.year) - 1).toString();



                const lyMtMap = {};



                if (isSingleStore && typeof MT_STORE_DATA !== 'undefined' && Array.isArray(MT_STORE_DATA)) {



                    MT_STORE_DATA.filter(d => isStoreMatch(d, state.mtStore) && (selMonthNums.length === 0 || selMonthNums.includes(d.m))).forEach(d => {



                        const sc = d.sc || 'MT)Other';



                        const acc = d.acc || 'Other Chain';



                        const c = d.cl || 'Khác';



                        const val = Number(d.ly) || 0;



                        lyMtMap[sc] = (lyMtMap[sc] || 0) + val;



                        lyMtMap[sc + '_' + acc] = (lyMtMap[sc + '_' + acc] || 0) + val;



                        lyMtMap[sc + '_' + acc + '_' + c] = (lyMtMap[sc + '_' + acc + '_' + c] || 0) + val;



                    });



                } else {



                    MT_TREE.filter(d => {



                        if (d.year !== lyYear || !state.selectedMonths.includes(d.month_num)) return false;



                        if (state.mtSubChan !== 'ALL' && d.sub_channel !== state.mtSubChan) return false;



                        if (state.mtChain !== 'ALL' && d.key_account !== state.mtChain) return false;



                        if (!matchProductRecord(d)) return false;



                        return true;



                    }).forEach(d => {



                        const sc = d.sub_channel || 'MT)Other';



                        const acc = d.key_account || 'Other Chain';



                        const c = d.cluster || 'Khác';



                        const val = Number(d.sellin_val) || 0;



                        lyMtMap[sc] = (lyMtMap[sc] || 0) + val;



                        lyMtMap[sc + '_' + acc] = (lyMtMap[sc + '_' + acc] || 0) + val;



                        lyMtMap[sc + '_' + acc + '_' + c] = (lyMtMap[sc + '_' + acc + '_' + c] || 0) + val;



                    });



                }







                // YTD 2026 & YTD LY 2025 for Channel Tree



                const ytdChan2026 = {};



                const ytdChan2025 = {};



                if (isSingleStore && typeof MT_STORE_DATA !== 'undefined' && Array.isArray(MT_STORE_DATA)) {



                    MT_STORE_DATA.filter(d => isStoreMatch(d, state.mtStore) && ytdMonthNums.includes(d.m)).forEach(d => {



                        const sc = d.sc || 'MT)Other';



                        const acc = d.acc || 'Other Chain';



                        const c = d.cl || 'Khác';



                        const v26 = Number(d.val) || 0;



                        const v25 = Number(d.ly) || 0;







                        [sc, sc + '_' + acc, sc + '_' + acc + '_' + c].forEach(k => {



                            ytdChan2026[k] = (ytdChan2026[k] || 0) + v26;



                            ytdChan2025[k] = (ytdChan2025[k] || 0) + v25;



                        });



                    });



                } else {



                    MT_TREE.filter(d => {



                        if (state.mtSubChan !== 'ALL' && d.sub_channel !== state.mtSubChan) return false;



                        if (state.mtChain !== 'ALL' && d.key_account !== state.mtChain) return false;



                        if (!matchProductRecord(d)) return false;



                        if (!ytdMonths.includes(d.month_num)) return false;



                        return d.year === state.year || d.year === lyYear;



                    }).forEach(d => {



                        const sc = d.sub_channel || 'MT)Other';



                        const acc = d.key_account || 'Other Chain';



                        const c = d.cluster || 'Khác';



                        const v = Number(d.sellin_val) || 0;



                        const map = (d.year === state.year) ? ytdChan2026 : ytdChan2025;







                        map[sc] = (map[sc] || 0) + v;



                        map[sc + '_' + acc] = (map[sc + '_' + acc] || 0) + v;



                        map[sc + '_' + acc + '_' + c] = (map[sc + '_' + acc + '_' + c] || 0) + v;



                    });



                }







                // Extract LM MTD & Store Counts from MT_STORE_DATA



                const storeStatsMap = {};



                const selMonthNum = state.selectedMonths.length === 1 ? parseInt(state.selectedMonths[0], 10) : null;



                if (typeof MT_STORE_DATA !== 'undefined' && Array.isArray(MT_STORE_DATA)) {



                    MT_STORE_DATA.forEach(d => {



                        if (selMonthNum !== null && d.m !== selMonthNum) return;



                        if (isSingleStore && !isStoreMatch(d, state.mtStore)) return;



                        const sc = d.sc || 'MT)Other';



                        const acc = d.acc || 'Other Chain';



                        const cl = d.cl || 'Khác';







                        [sc, sc + '_' + acc, sc + '_' + acc + '_' + cl].forEach(k => {



                            if (!storeStatsMap[k]) storeStatsMap[k] = { lm: 0, stores: 0, skus: 0 };



                            storeStatsMap[k].lm += (d.lm || 0);



                            if (d.val > 0) storeStatsMap[k].stores++;



                        });



                    });



                }







                // Build Chain Hierarchy



                const tree = {};



                data.forEach(d => {



                    const sc = d.sub_channel || 'MT)Other';



                    const acc = d.key_account || 'Other Chain';



                    const c = d.cluster || 'Khác';



                    const val = Number(d.sellin_val) || 0;







                    if (!tree[sc]) tree[sc] = { val: 0, children: {} };



                    tree[sc].val += val;







                    if (!tree[sc].children[acc]) tree[sc].children[acc] = { val: 0, children: {} };



                    tree[sc].children[acc].val += val;







                    if (!tree[sc].children[acc].children[c]) tree[sc].children[acc].children[c] = { val: 0 };



                    tree[sc].children[acc].children[c].val += val;



                });







                const curMKey = state.year + '-' + (state.selectedMonths.length === 1 ? state.selectedMonths[0] : '10');



                const htmlRows = [];







                Object.keys(tree).sort().forEach(sc => {



                    const scVal = tree[sc].val;



                    const scTarget = scTargetMap[sc] || 0;



                    const scLy = lyMtMap[sc] || 0;



                    const scStats = storeStatsMap[sc] || { lm: 0, stores: 0 };



                    const scLm = scStats.lm;



                    const scMom = scLm > 0 ? ((scVal - scLm) / scLm * 100) : null;



                    const scYtd = ytdChan2026[sc] || 0;



                    const scYtdLy = ytdChan2025[sc] || 0;



                    const scOpen = state.treeOpen['mt_' + sc] === true;







                                        const scTotalStyle = 'background-color: #EEF2FF !important; color: #312E81 !important; font-weight: 800 !important; border-top: 2px solid #818CF8 !important; border-bottom: 2px solid #818CF8 !important;';



                    const scTotalStyleFirstCol = 'background-color: #EEF2FF !important; color: #312E81 !important; font-weight: 800 !important; border-top: 2px solid #818CF8 !important; border-bottom: 2px solid #818CF8 !important; position: sticky; left: 0; z-index: 5;';







                    let scRow = '<tr class="total-row-chan font-bold text-slate-900 text-xs shadow-2xs" style="' + scTotalStyle + '" data-level="0">';



                    scRow += '<td class="th-first-col tree-lvl-0 select-none cursor-pointer py-2 px-2" style="' + scTotalStyleFirstCol + '" onclick="toggleTreeMtNode(&quot;mt_' + sc + '&quot;)"><div class="flex items-center min-w-0 w-full"><span class="tree-toggle flex-shrink-0 mr-1.5 px-1 py-0.2 rounded text-[10px]" style="background-color: #4F46E5; color: #ffffff; font-weight: 900;">' + (scOpen ? '▼' : '▶') + '</span><strong style="color: #1E1B4B; font-weight: 900; font-size: 11px; letter-spacing: 0.5px; text-transform: uppercase;">' + sc + '</strong><span style="font-size: 9.5px; font-weight: 800; color: #312E81; background-color: #C7D2FE; padding: 2px 6px; border-radius: 4px; margin-left: 6px;">TỔNG</span></div></td>';



                    scRow += '<td class="text-right font-mono-num py-2" style="' + scTotalStyle + ' color: #312E81; font-weight: 900;">' + formatVND(scVal) + '</td>';



                    scRow += '<td class="text-right font-mono-num py-2" style="' + scTotalStyle + ' color: #334155; font-weight: 700;">' + (scTarget > 0 ? formatVND(scTarget) : '-') + '</td>';



                    scRow += '<td class="text-right font-mono-num py-2" style="' + scTotalStyle + '">' + (isSingleStore ? '-' : formatAchieveBadge(scVal, scTarget)) + '</td>';



                    scRow += '<td class="text-right font-mono-num py-2" style="' + scTotalStyle + ' color: #334155; font-weight: 700;">' + (scLm > 0 ? formatVND(scLm) : '-') + '</td>';



                    scRow += '<td class="text-right font-mono-num py-2" style="' + scTotalStyle + '">' + (scMom !== null ? '<span class="' + (scMom >= 0 ? 'text-emerald-700 font-bold' : 'text-rose-600 font-bold') + '">' + (scMom >= 0 ? '+' : '') + scMom.toFixed(1) + '%</span>' : '-') + '</td>';



                    scRow += '<td class="text-right font-mono-num py-2" style="' + scTotalStyle + ' font-weight: 800;">' + formatTreeYoy(scVal, scLy) + '</td>';



                    scRow += '<td class="text-right font-mono-num py-2" style="' + scTotalStyle + ' color: #312E81; font-weight: 900;">' + formatVND(scYtd) + '</td>';



                    scRow += '<td class="text-right font-mono-num py-2" style="' + scTotalStyle + ' color: #334155; font-weight: 700;">' + (scYtdLy > 0 ? formatVND(scYtdLy) : '-') + '</td>';



                    scRow += '<td class="text-right font-mono-num py-2" style="' + scTotalStyle + ' font-weight: 900;">' + formatTreeYoy(scYtd, scYtdLy) + '</td>';



                    scRow += '<td class="text-center font-mono-num py-2" style="' + scTotalStyle + ' color: #0891B2; font-weight: 800;">-</td>';



                    scRow += '<td class="text-center font-mono-num py-2" style="' + scTotalStyle + ' color: #1E1B4B; font-weight: 900;">' + scStats.stores + '</td>';



                    scRow += '</tr>';



                    htmlRows.push(scRow);







                    if (scOpen) {



                        const accObj = tree[sc].children;



                        Object.keys(accObj).sort().forEach(acc => {



                            const accVal = accObj[acc].val;



                            const accTarget = mtTargetMap[sc + '_' + acc] || mtTargetMap[acc] || 0;



                            const accLy = lyMtMap[sc + '_' + acc] || 0;



                            const accStats = storeStatsMap[sc + '_' + acc] || { lm: 0, stores: 0 };



                            const accLm = accStats.lm;



                            const accMom = accLm > 0 ? ((accVal - accLm) / accLm * 100) : null;



                            const accYtd = ytdChan2026[sc + '_' + acc] || 0;



                            const accYtdLy = ytdChan2025[sc + '_' + acc] || 0;



                            const accKey = curMKey + '_' + acc;



                            const accSku = isSingleStore ? (storeStatsMap[sc + '_' + acc]?.skus || 0) : ((typeof MT_CHAIN_SKUS !== 'undefined') ? (MT_CHAIN_SKUS[accKey] || 0) : 0);



                            const accOpen = state.treeOpen['mt_' + sc + '_' + acc] === true;







                            let accRow = '<tr class="font-semibold text-slate-700 text-xs bg-white hover:bg-slate-50 border-b border-slate-100">';



                            accRow += '<td class="th-first-col tree-lvl-1 select-none cursor-pointer" onclick="toggleTreeMtNode(&quot;mt_' + sc + '_' + acc + '&quot;)"><span class="tree-toggle mr-1 font-mono">' + (accOpen ? '▼' : '▶') + '</span> ' + acc + '</td>';



                            accRow += '<td class="text-right font-mono-num">' + formatVND(accVal) + '</td>';



                            accRow += '<td class="text-right font-mono-num font-semibold text-slate-600">' + (accTarget > 0 ? formatVND(accTarget) : '-') + '</td>';



                            accRow += '<td class="text-right font-mono-num">' + (isSingleStore ? '-' : formatAchieveBadge(accVal, accTarget)) + '</td>';



                            accRow += '<td class="text-right font-mono-num text-slate-500">' + (accLm > 0 ? formatVND(accLm) : '-') + '</td>';



                            accRow += '<td class="text-right font-mono-num">' + (accMom !== null ? '<span class="' + (accMom >= 0 ? 'text-emerald-700' : 'text-rose-600') + '">' + (accMom >= 0 ? '+' : '') + accMom.toFixed(1) + '%</span>' : '-') + '</td>';



                            accRow += '<td class="text-right font-mono-num">' + formatTreeYoy(accVal, accLy) + '</td>';



                            accRow += '<td class="text-right font-mono-num font-semibold text-indigo-700">' + formatVND(accYtd) + '</td>';



                            accRow += '<td class="text-right font-mono-num text-slate-500">' + (accYtdLy > 0 ? formatVND(accYtdLy) : '-') + '</td>';



                            accRow += '<td class="text-right font-mono-num">' + formatTreeYoy(accYtd, accYtdLy) + '</td>';



                            accRow += '<td class="text-right font-mono-num text-cyan-700 font-bold">' + (accSku > 0 ? accSku : '-') + '</td>';



                            accRow += '<td class="text-center font-mono-num text-slate-600">' + accStats.stores + '</td>';



                            accRow += '</tr>';



                            htmlRows.push(accRow);







                            if (accOpen) {



                                const cluObj = accObj[acc].children;



                                Object.keys(cluObj).sort().forEach(c => {



                                    const cVal = cluObj[c].val;



                                    const cLy = lyMtMap[sc + '_' + acc + '_' + c] || 0;



                                    const cStats = storeStatsMap[sc + '_' + acc + '_' + c] || { lm: 0, stores: 0 };



                                    const cLm = cStats.lm;



                                    const cMom = cLm > 0 ? ((cVal - cLm) / cLm * 100) : null;



                                    const cYtd = ytdChan2026[sc + '_' + acc + '_' + c] || 0;



                                    const cYtdLy = ytdChan2025[sc + '_' + acc + '_' + c] || 0;







                                    let cRow = '<tr class="text-slate-500 text-xs bg-slate-50/40 hover:bg-slate-50 border-b border-slate-100">';



                                    cRow += '<td class="tree-lvl-2 select-none"><span class="inline-block w-1.5 h-1.5 rounded-full bg-purple-500 mr-2 flex-shrink-0"></span> ' + c + '</td>';



                                    cRow += '<td class="text-right font-mono-num">' + formatVND(cVal) + '</td>';



                                    cRow += '<td class="text-right font-mono-num text-slate-400">-</td>';



                                    cRow += '<td class="text-center font-mono-num text-slate-400">-</td>';



                                    cRow += '<td class="text-right font-mono-num text-slate-500">' + (cLm > 0 ? formatVND(cLm) : '-') + '</td>';



                                    cRow += '<td class="text-right font-mono-num">' + (cMom !== null ? '<span class="' + (cMom >= 0 ? 'text-emerald-700' : 'text-rose-600') + '">' + (cMom >= 0 ? '+' : '') + cMom.toFixed(1) + '%</span>' : '-') + '</td>';



                                    cRow += '<td class="text-right font-mono-num">' + formatTreeYoy(cVal, cLy) + '</td>';



                                    cRow += '<td class="text-right font-mono-num text-indigo-700">' + formatVND(cYtd) + '</td>';



                                    cRow += '<td class="text-right font-mono-num text-slate-500">' + (cYtdLy > 0 ? formatVND(cYtdLy) : '-') + '</td>';



                                    cRow += '<td class="text-right font-mono-num">' + formatTreeYoy(cYtd, cYtdLy) + '</td>';



                                    cRow += '<td class="text-center font-mono-num text-slate-400">-</td>';



                                    cRow += '<td class="text-center font-mono-num text-slate-500">' + cStats.stores + '</td>';



                                    cRow += '</tr>';



                                    htmlRows.push(cRow);



                                });



                            }



                        });



                    }



                });







                tbody.innerHTML = htmlRows.join('');



            } catch (e) {



                console.error("Error in renderMtTree:", e);



            }



        }







        // =========================================================================



        // KHỐI 5: BẢNG CHI TIẾT TỪNG STORE// =========================================================================



        // KHỐI 5: BẢNG CHI TIẾT TỪNG STORE / ĐIỂM BÁN KÊNH MT (STORE DIRECTORY)



        // =========================================================================



        function renderMtStoreTable() {



            try {



                const tbody = document.getElementById('tbody-mt-stores');



                if (!tbody) return;







                if (typeof MT_STORE_DATA === 'undefined' || !Array.isArray(MT_STORE_DATA)) {



                    tbody.innerHTML = '<tr><td colspan="14" class="text-center py-6 text-slate-400 font-medium">Đang tải dữ liệu cửa hàng MT...</td></tr>';



                    return;



                }







                const selMonthNum = state.selectedMonths.length === 1 ? parseInt(state.selectedMonths[0], 10) : null;



                



                // Populate cascading filter options: Sub-channel -> Vùng -> Account



                populateMtStoreFilterOptions();







                // Update clear buttons visibility



                updateMtStoreClearButtonVisibility();







                // 1. Filter dataset



                let list = MT_STORE_DATA.filter(d => {



                    if (selMonthNum !== null && d.m !== selMonthNum) return false;



                    if (state.mtSubChan !== 'ALL' && d.sc !== state.mtSubChan) return false;



                    if (state.mtChain !== 'ALL' && d.acc !== state.mtChain) return false;



                    if (state.mtCluster !== 'ALL' && d.cl !== state.mtCluster) return false;







                    // Local store cascading filters



                    if (mtStoreState.filterSubChan !== 'ALL' && d.sc !== mtStoreState.filterSubChan) return false;



                    if (mtStoreState.filterCluster !== 'ALL' && d.cl !== mtStoreState.filterCluster) return false;



                    if (mtStoreState.filterChain !== 'ALL' && d.acc !== mtStoreState.filterChain) return false;



                    if (state.mtStore && state.mtStore !== 'ALL' && !isStoreMatch(d, state.mtStore)) return false;







                    // Search query



                    if (mtStoreState.searchQuery) {



                        const q = mtStoreState.searchQuery.toLowerCase();



                        const matchName = String(d.name || '').toLowerCase().includes(q);



                        const matchId = String(d.id || '').toLowerCase().includes(q);



                        const matchAddr = String(d.addr || '').toLowerCase().includes(q);



                        if (!matchName && !matchId && !matchAddr) return false;



                    }







                    return true;



                });







                // Update badge count



                const badge = document.getElementById('lbl-mt-store-count');



                if (badge) badge.innerText = formatNumVn(list.length) + ' Stores';







                // Calculate chain totals for % contribution



                const chainTotals = {};



                list.forEach(d => {



                    chainTotals[d.acc] = (chainTotals[d.acc] || 0) + (d.val || 0);



                });







                // 2. Sort dataset



                list.sort((a, b) => {



                    let vA = 0, vB = 0;



                    if (mtStoreState.sortCol === 'val') { vA = a.val || 0; vB = b.val || 0; }



                    else if (mtStoreState.sortCol === 'lm') { vA = a.lm || 0; vB = b.lm || 0; }



                    else if (mtStoreState.sortCol === 'ly') { vA = a.ly || 0; vB = b.ly || 0; }



                    else if (mtStoreState.sortCol === 'sku') { vA = a.sku || 0; vB = b.sku || 0; }



                    else if (mtStoreState.sortCol === 'mom') {



                        vA = a.lm > 0 ? ((a.val - a.lm) / a.lm) : -999;



                        vB = b.lm > 0 ? ((b.val - b.lm) / b.lm) : -999;



                    } else if (mtStoreState.sortCol === 'yoy') {



                        vA = a.ly > 0 ? ((a.val - a.ly) / a.ly) : -999;



                        vB = b.ly > 0 ? ((b.val - b.ly) / b.ly) : -999;



                    } else if (mtStoreState.sortCol === 'share') {



                        const totA = chainTotals[a.acc] || 1;



                        const totB = chainTotals[b.acc] || 1;



                        vA = (a.val || 0) / totA;



                        vB = (b.val || 0) / totB;



                    }



                    return mtStoreState.sortAsc ? (vA - vB) : (vB - vA);



                });







                // 3. Paginate



                const totalStores = list.length;



                const totalPages = Math.ceil(totalStores / mtStoreState.pageSize) || 1;



                if (mtStoreState.currentPage > totalPages) mtStoreState.currentPage = totalPages;



                if (mtStoreState.currentPage < 1) mtStoreState.currentPage = 1;







                const startIdx = (mtStoreState.currentPage - 1) * mtStoreState.pageSize;



                const endIdx = Math.min(startIdx + mtStoreState.pageSize, totalStores);



                const pageList = list.slice(startIdx, endIdx);







                if (pageList.length === 0) {



                    tbody.innerHTML = '<tr><td colspan="14" class="text-center py-6 text-slate-400 font-medium">Không tìm thấy cửa hàng nào phù hợp với điều kiện lọc.</td></tr>';



                    renderMtStorePaginationControls(0, 0, 0, 1);



                    return;



                }







                // Render rows with compact column widths and title tooltips



                                // Calculate grand totals across the entire filtered dataset



                let totVal = 0, totLm = 0, totLy = 0, totSkuSum = 0;



                list.forEach(d => {



                    totVal += (Number(d.val) || 0);



                    totLm += (Number(d.lm) || 0);



                    totLy += (Number(d.ly) || 0);



                    totSkuSum += (Number(d.sku) || 0);



                });



                const totMom = totLm > 0 ? ((totVal - totLm) / totLm * 100) : null;



                const totYoy = totLy > 0 ? ((totVal - totLy) / totLy * 100) : null;



                const avgSku = list.length > 0 ? Math.round(totSkuSum / list.length) : 0;







                const storeTotStyle = 'background-color: #FEF3C7 !important; color: #92400E !important; font-weight: 900 !important; border-top: 2px solid #F59E0B !important; border-bottom: 2px solid #F59E0B !important;';



                let totRow = '<tr class="total-row-store shadow-2xs" style="' + storeTotStyle + '">';



                totRow += '<td class="text-center font-mono-num py-1.5 px-1" style="' + storeTotStyle + ' font-size: 11px;">Σ</td>';



                totRow += '<td class="font-mono-num py-1.5 px-1 text-center" style="' + storeTotStyle + ' font-size: 9.5px;"><span style="background-color: #FDE68A; color: #92400E; padding: 1px 5px; border-radius: 3px; font-weight: 900;">ALL</span></td>';



                totRow += '<td class="py-1.5 px-2 align-middle overflow-hidden" style="' + storeTotStyle + '"><div class="truncate uppercase" style="font-size: 10px; font-weight: 900; letter-spacing: 0.3px;" title="Tổng cộng ' + formatNumVn(list.length) + ' cửa hàng MT">TỔNG CỘNG (' + formatNumVn(list.length) + ' CỬA HÀNG)</div></td>';



                totRow += '<td class="py-1.5 px-1 text-left" style="' + storeTotStyle + '"><span class="inline-block px-1.5 py-0.2 rounded text-[9px] font-bold" style="background-color: #FDE68A; color: #78350F; border: 1px solid #F59E0B;">' + escapeAttr(state.mtChain !== 'ALL' ? state.mtChain : 'Tất cả') + '</span></td>';



                totRow += '<td class="py-1.5 px-1 text-center text-[9.5px]" style="' + storeTotStyle + '">' + escapeAttr(state.mtSubChan !== 'ALL' ? state.mtSubChan.replace('MT)', '').trim() : 'Tất cả') + '</td>';



                totRow += '<td class="py-1.5 px-1 text-center text-[9.5px]" style="' + storeTotStyle + '">' + escapeAttr(state.mtCluster !== 'ALL' ? state.mtCluster : 'Tất cả') + '</td>';



                totRow += '<td class="py-1.5 px-2 align-middle overflow-hidden" style="' + storeTotStyle + '"><div class="truncate italic" style="font-size: 9px; color: #78350F;">Toàn bộ danh sách cửa hàng theo bộ lọc</div></td>';



                totRow += '<td class="text-right font-mono-num py-1.5 px-1.5 text-[10px]" style="' + storeTotStyle + '">' + formatVND(totVal) + '</td>';



                totRow += '<td class="text-right font-mono-num py-1.5 px-1 text-[10px]" style="' + storeTotStyle + '">' + (totLm > 0 ? formatVND(totLm) : '-') + '</td>';



                totRow += '<td class="text-right font-mono-num py-1.5 px-1 text-[9.5px]" style="' + storeTotStyle + '">' + (totMom !== null ? '<span style="color: ' + (totMom >= 0 ? '#065F46' : '#991B1B') + '; font-weight: 900;">' + (totMom >= 0 ? '+' : '') + totMom.toFixed(1) + '%</span>' : '-') + '</td>';



                totRow += '<td class="text-right font-mono-num py-1.5 px-1 text-[10px]" style="' + storeTotStyle + '">' + (totLy > 0 ? formatVND(totLy) : '-') + '</td>';



                totRow += '<td class="text-right font-mono-num py-1.5 px-1 text-[9.5px]" style="' + storeTotStyle + '">' + (totYoy !== null ? '<span style="color: ' + (totYoy >= 0 ? '#065F46' : '#991B1B') + '; font-weight: 900;">' + (totYoy >= 0 ? '+' : '') + totYoy.toFixed(1) + '%</span>' : '-') + '</td>';



                totRow += '<td class="text-right font-mono-num py-1.5 px-0.5 text-[9.5px]" style="' + storeTotStyle + '">' + (avgSku > 0 ? avgSku : '-') + '</td>';



                totRow += '<td class="text-right font-mono-num py-1.5 px-1.5 text-[9.5px]" style="' + storeTotStyle + '">100.0%</td>';



                totRow += '</tr>';







                // Render rows with compact column widths and title tooltips



                const rows = [totRow];



                pageList.forEach((d, idx) => {



                    const rowIdx = startIdx + idx + 1;



                    const mom = d.lm > 0 ? ((d.val - d.lm) / d.lm * 100) : null;



                    const yoy = d.ly > 0 ? ((d.val - d.ly) / d.ly * 100) : null;



                    const chainTot = chainTotals[d.acc] || 0;



                    const share = chainTot > 0 ? ((d.val / chainTot) * 100) : 0;







                                        let r = '<tr class="odd:bg-white even:bg-slate-50/60 hover:bg-sky-50/70 border-b border-slate-100 transition-colors text-slate-700 text-[10px]">';



                    r += '<td class="text-center font-mono-num text-slate-400 py-1.5 px-1 text-[9.5px]">' + rowIdx + '</td>';



                    r += '<td class="font-mono-num text-slate-600 py-1.5 px-1 text-[10px] whitespace-nowrap" title="' + escapeAttr(d.id) + '">' + escapeAttr(d.id) + '</td>';



                    r += '<td class="py-1.5 px-2 align-middle overflow-hidden"><div class="font-medium text-slate-800 text-[10px] truncate" title="' + escapeAttr(d.name) + '">' + escapeAttr(d.name) + '</div></td>';



                    r += '<td class="py-1.5 px-1 whitespace-nowrap"><span class="inline-block px-1.5 py-0.2 rounded text-[9px] font-bold text-sky-800 bg-sky-50 border border-sky-200/60 truncate max-w-full" title="' + escapeAttr(d.acc) + '">' + escapeAttr(d.acc) + '</span></td>';



                    r += '<td class="py-1.5 px-1 text-center text-slate-500 text-[9.5px] whitespace-nowrap">' + escapeAttr(d.sc.replace('MT)', '').replace('(MT', '').trim()) + '</td>';



                    r += '<td class="py-1.5 px-1 text-center text-slate-500 text-[9.5px] whitespace-nowrap" title="' + escapeAttr(d.cl) + '">' + escapeAttr(d.cl) + '</td>';



                    r += '<td class="py-1.5 px-2 align-middle overflow-hidden"><div class="text-slate-500 text-[9px] truncate" title="' + escapeAttr(d.addr || '-') + '">' + escapeAttr(d.addr || '-') + '</div></td>';



                    r += '<td class="text-right font-mono-num font-semibold text-slate-800 py-1.5 px-1.5 text-[10px] whitespace-nowrap">' + formatVND(d.val) + '</td>';



                    r += '<td class="text-right font-mono-num text-slate-600 py-1.5 px-1 text-[10px] whitespace-nowrap">' + (d.lm > 0 ? formatVND(d.lm) : '-') + '</td>';



                    r += '<td class="text-right font-mono-num py-1.5 px-1 text-[9.5px] whitespace-nowrap">' + (mom !== null ? '<span class="' + (mom >= 0 ? 'text-emerald-700 font-semibold' : 'text-rose-600 font-semibold') + '">' + (mom >= 0 ? '+' : '') + mom.toFixed(1) + '%</span>' : '<span class="text-slate-400">-</span>') + '</td>';



                    r += '<td class="text-right font-mono-num text-slate-500 py-1.5 px-1 text-[10px] whitespace-nowrap">' + (d.ly > 0 ? formatVND(d.ly) : '-') + '</td>';



                    r += '<td class="text-right font-mono-num py-1.5 px-1 text-[9.5px] whitespace-nowrap">' + (yoy !== null ? '<span class="' + (yoy >= 0 ? 'text-emerald-700 font-semibold' : 'text-rose-600 font-semibold') + '">' + (yoy >= 0 ? '+' : '') + yoy.toFixed(1) + '%</span>' : '<span class="text-slate-400">-</span>') + '</td>';



                    r += '<td class="text-right font-mono-num font-semibold text-sky-700 py-1.5 px-0.5 text-[9.5px] whitespace-nowrap">' + (d.sku > 0 ? d.sku : '-') + '</td>';



                    r += '<td class="text-right font-mono-num text-slate-600 py-1.5 px-1.5 text-[9.5px] whitespace-nowrap">' + share.toFixed(1) + '%</td>';



                    r += '</tr>';



                    rows.push(r);



                });







                tbody.innerHTML = rows.join('');



                if (typeof TableCustomizer !== 'undefined') TableCustomizer.init('table-mt-stores');



                renderMtStorePaginationControls(startIdx + 1, endIdx, totalStores, totalPages);







            } catch (e) {



                console.error("Error in renderMtStoreTable:", e);



            }



        }







                // POPULATE CASCADING FILTER OPTIONS: Sub-channel -> Vùng -> Account



        function populateMtStoreFilterOptions() {



            if (typeof MT_STORE_DATA === 'undefined' || !Array.isArray(MT_STORE_DATA)) return;



            const selSub = document.getElementById('mt-store-filter-subchan');



            const selCluster = document.getElementById('mt-store-filter-cluster');



            const selChain = document.getElementById('mt-store-filter-chain');



            if (!selSub || !selCluster || !selChain) return;







            // 1. Populate Sub-channel if not yet initialized



            if (selSub.options.length <= 1) {



                const subSet = new Set();



                MT_STORE_DATA.forEach(d => {



                    if (d.sc) subSet.add(d.sc);



                });



                selSub.innerHTML = '<option value="ALL">-- Tất cả Sub-channel --</option>';



                Array.from(subSet).sort().forEach(sc => {



                    const opt = document.createElement('option');



                    opt.value = sc;



                    opt.innerText = sc.replace('MT)', '');



                    selSub.appendChild(opt);



                });



            }



            selSub.value = mtStoreState.filterSubChan || 'ALL';







            // 2. Populate Vùng / Khu Vực based on selected Sub-channel



            const clSet = new Set();



            MT_STORE_DATA.forEach(d => {



                if (mtStoreState.filterSubChan === 'ALL' || d.sc === mtStoreState.filterSubChan) {



                    if (d.cl && d.cl !== 'Khác') clSet.add(d.cl);



                }



            });



            const curCl = mtStoreState.filterCluster;



            selCluster.innerHTML = '<option value="ALL">-- Tất cả Vùng / Khu Vực --</option>';



            Array.from(clSet).sort().forEach(cl => {



                const opt = document.createElement('option');



                opt.value = cl;



                opt.innerText = cl;



                selCluster.appendChild(opt);



            });



            if (clSet.has(curCl)) {



                selCluster.value = curCl;



                mtStoreState.filterCluster = curCl;



            } else {



                selCluster.value = 'ALL';



                mtStoreState.filterCluster = 'ALL';



            }







            // 3. Populate Account / Chuỗi MT based on Sub-channel AND Vùng



            const chSet = new Set();



            MT_STORE_DATA.forEach(d => {



                const matchSub = (mtStoreState.filterSubChan === 'ALL' || d.sc === mtStoreState.filterSubChan);



                const matchCl = (mtStoreState.filterCluster === 'ALL' || d.cl === mtStoreState.filterCluster);



                if (matchSub && matchCl) {



                    if (d.acc && d.acc !== 'Other Chain') chSet.add(d.acc);



                }



            });



            const curCh = mtStoreState.filterChain;



            selChain.innerHTML = '<option value="ALL">-- Tất cả Account / Chuỗi MT --</option>';



            Array.from(chSet).sort().forEach(ch => {



                const opt = document.createElement('option');



                opt.value = ch;



                opt.innerText = ch;



                selChain.appendChild(opt);



            });



            if (chSet.has(curCh)) {



                selChain.value = curCh;



                mtStoreState.filterChain = curCh;



            } else {



                selChain.value = 'ALL';



                mtStoreState.filterChain = 'ALL';



            }



        }







        // VISIBILITY TOGGLE & STYLING FOR CLEAR (X) BUTTONS



        function updateMtStoreClearButtonVisibility() {



            const btnSearch = document.getElementById('btn-clear-mt-store-search');



            const btnSub = document.getElementById('btn-clear-mt-subchan');



            const btnCl = document.getElementById('btn-clear-mt-cluster');



            const btnCh = document.getElementById('btn-clear-mt-chain');



            const btnResetAll = document.getElementById('btn-reset-mt-store-filters');







            const wrapSub = document.getElementById('wrap-filter-subchan');



            const wrapCl = document.getElementById('wrap-filter-cluster');



            const wrapCh = document.getElementById('wrap-filter-chain');







            const hasSearch = !!(mtStoreState.searchQuery && mtStoreState.searchQuery.trim().length > 0);



            const hasSub = mtStoreState.filterSubChan !== 'ALL';



            const hasCl = mtStoreState.filterCluster !== 'ALL';



            const hasCh = mtStoreState.filterChain !== 'ALL';







            if (btnSearch) {



                if (hasSearch) {



                    btnSearch.classList.remove('hidden');



                    btnSearch.classList.add('flex');



                } else {



                    btnSearch.classList.add('hidden');



                    btnSearch.classList.remove('flex');



                }



            }



            if (btnSub) {



                if (hasSub) {



                    btnSub.classList.remove('hidden');



                    btnSub.classList.add('flex');



                } else {



                    btnSub.classList.add('hidden');



                    btnSub.classList.remove('flex');



                }



            }



            if (btnCl) {



                if (hasCl) {



                    btnCl.classList.remove('hidden');



                    btnCl.classList.add('flex');



                } else {



                    btnCl.classList.add('hidden');



                    btnCl.classList.remove('flex');



                }



            }



            if (btnCh) {



                if (hasCh) {



                    btnCh.classList.remove('hidden');



                    btnCh.classList.add('flex');



                } else {



                    btnCh.classList.add('hidden');



                    btnCh.classList.remove('flex');



                }



            }







            // Highlighting active filter groups



            if (wrapSub) {



                if (hasSub) {



                    wrapSub.classList.add('bg-sky-50', 'border-sky-400', 'text-sky-900', 'font-semibold');



                    wrapSub.classList.remove('border-slate-300', 'bg-white');



                } else {



                    wrapSub.classList.remove('bg-sky-50', 'border-sky-400', 'text-sky-900', 'font-semibold');



                    wrapSub.classList.add('border-slate-300', 'bg-white');



                }



            }



            if (wrapCl) {



                if (hasCl) {



                    wrapCl.classList.add('bg-sky-50', 'border-sky-400', 'text-sky-900', 'font-semibold');



                    wrapCl.classList.remove('border-slate-300', 'bg-white');



                } else {



                    wrapCl.classList.remove('bg-sky-50', 'border-sky-400', 'text-sky-900', 'font-semibold');



                    wrapCl.classList.add('border-slate-300', 'bg-white');



                }



            }



            if (wrapCh) {



                if (hasCh) {



                    wrapCh.classList.add('bg-sky-50', 'border-sky-400', 'text-sky-900', 'font-semibold');



                    wrapCh.classList.remove('border-slate-300', 'bg-white');



                } else {



                    wrapCh.classList.remove('bg-sky-50', 'border-sky-400', 'text-sky-900', 'font-semibold');



                    wrapCh.classList.add('border-slate-300', 'bg-white');



                }



            }







            const anyActive = hasSearch || hasSub || hasCl || hasCh;



            if (btnResetAll) {



                if (anyActive) {



                    btnResetAll.classList.remove('hidden');



                    btnResetAll.classList.add('inline-flex');



                } else {



                    btnResetAll.classList.add('hidden');



                    btnResetAll.classList.remove('inline-flex');



                }



            }



        }







        // QUICK CLEAR (X) HANDLERS & INPUT HANDLERS



        function clearMtStoreSearch(e) {



            if (e) {



                e.preventDefault();



                e.stopPropagation();



            }



            const inp = document.getElementById('mt-store-search');



            if (inp) inp.value = '';



            handleMtStoreSearch('');



        }







        function clearMtStoreSubchan(e) {



            if (e) {



                e.preventDefault();



                e.stopPropagation();



            }



            handleMtStoreSubchanChange('ALL');



        }







        function clearMtStoreCluster(e) {



            if (e) {



                e.preventDefault();



                e.stopPropagation();



            }



            handleMtStoreClusterChange('ALL');



        }







        function clearMtStoreChain(e) {



            if (e) {



                e.preventDefault();



                e.stopPropagation();



            }



            handleMtStoreChainChange('ALL');



        }







        function resetAllMtStoreFilters(e) {



            if (e) {



                e.preventDefault();



                e.stopPropagation();



            }



            const inp = document.getElementById('mt-store-search');



            if (inp) inp.value = '';



            mtStoreState.searchQuery = '';



            mtStoreState.filterSubChan = 'ALL';



            mtStoreState.filterCluster = 'ALL';



            mtStoreState.filterChain = 'ALL';



            mtStoreState.currentPage = 1;



            const selSub = document.getElementById('mt-store-filter-subchan');



            if (selSub) selSub.value = 'ALL';



            const selCl = document.getElementById('mt-store-filter-cluster');



            if (selCl) selCl.value = 'ALL';



            const selCh = document.getElementById('mt-store-filter-chain');



            if (selCh) selCh.value = 'ALL';



            populateMtStoreFilterOptions();



            renderMtStoreTable();



        }







        function handleMtStoreSubchanChange(val) {



            mtStoreState.filterSubChan = val || 'ALL';



            mtStoreState.filterCluster = 'ALL';



            mtStoreState.filterChain = 'ALL';



            mtStoreState.currentPage = 1;



            const selSub = document.getElementById('mt-store-filter-subchan');



            if (selSub && selSub.value !== mtStoreState.filterSubChan) {



                selSub.value = mtStoreState.filterSubChan;



            }



            populateMtStoreFilterOptions();



            renderMtStoreTable();



        }







        function handleMtStoreClusterChange(val) {



            mtStoreState.filterCluster = val || 'ALL';



            mtStoreState.filterChain = 'ALL';



            mtStoreState.currentPage = 1;



            const selCl = document.getElementById('mt-store-filter-cluster');



            if (selCl && selCl.value !== mtStoreState.filterCluster) {



                selCl.value = mtStoreState.filterCluster;



            }



            populateMtStoreFilterOptions();



            renderMtStoreTable();



        }







        function handleMtStoreChainChange(val) {



            mtStoreState.filterChain = val || 'ALL';



            mtStoreState.currentPage = 1;



            const selCh = document.getElementById('mt-store-filter-chain');



            if (selCh && selCh.value !== mtStoreState.filterChain) {



                selCh.value = mtStoreState.filterChain;



            }



            renderMtStoreTable();



        }







        function handleMtStoreSearch(val) {



            mtStoreState.searchQuery = (val || '').trim();



            mtStoreState.currentPage = 1;



            renderMtStoreTable();



        }







        function sortMtStores(col) {



            if (mtStoreState.sortCol === col) {



                mtStoreState.sortAsc = !mtStoreState.sortAsc;



            } else {



                mtStoreState.sortCol = col;



                mtStoreState.sortAsc = false;



            }



            renderMtStoreTable();



        }







        function renderMtStorePaginationControls(start, end, total, totalPages) {



            const info = document.getElementById('mt-store-pagination-info');



            if (info) {



                info.innerText = 'Đang hiển thị ' + start + ' - ' + end + ' trong tổng số ' + formatNumVn(total) + ' cửa hàng MT';



            }







            const controls = document.getElementById('mt-store-pagination-controls');



            if (!controls) return;







            let html = '';



            html += '<button type="button" class="px-2 py-1 border border-slate-200 rounded bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer select-none" ' + (mtStoreState.currentPage <= 1 ? 'disabled' : '') + ' onclick="changeMtStorePage(' + (mtStoreState.currentPage - 1) + ')">◀</button>';



            



            const cur = mtStoreState.currentPage;



            const maxP = totalPages;



            const pagesToShow = [];



            pagesToShow.push(1);



            if (cur > 3) pagesToShow.push('...');



            for (let p = Math.max(2, cur - 1); p <= Math.min(maxP - 1, cur + 1); p++) {



                pagesToShow.push(p);



            }



            if (cur < maxP - 2) pagesToShow.push('...');



            if (maxP > 1) pagesToShow.push(maxP);







            pagesToShow.forEach(p => {



                if (p === '...') {



                    html += '<span class="px-1.5 py-1 text-slate-400">...</span>';



                } else {



                    const isSel = p === cur;



                    html += '<button type="button" class="px-2.5 py-1 border rounded font-mono-num cursor-pointer select-none ' + (isSel ? 'bg-sky-600 text-white font-bold border-sky-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50') + '" onclick="changeMtStorePage(' + p + ')">' + p + '</button>';



                }



            });







            html += '<button type="button" class="px-2 py-1 border border-slate-200 rounded bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer select-none" ' + (mtStoreState.currentPage >= totalPages ? 'disabled' : '') + ' onclick="changeMtStorePage(' + (mtStoreState.currentPage + 1) + ')">▶</button>';



            controls.innerHTML = html;



        }







        function changeMtStorePage(page) {



            mtStoreState.currentPage = page;



            renderMtStoreTable();



        }







        function exportMtStoreTableToExcel() {



            try {



                if (typeof XLSX === 'undefined') {



                    alert('Thư viện Excel đang được tải, vui lòng thử lại sau 2 giây.');



                    return;



                }







                if (typeof MT_STORE_DATA === 'undefined' || !Array.isArray(MT_STORE_DATA)) {



                    alert('Chưa có dữ liệu cửa hàng MT để xuất.');



                    return;



                }







                const selMonthNum = state.selectedMonths.length === 1 ? parseInt(state.selectedMonths[0], 10) : null;



                const exportData = [];







                MT_STORE_DATA.forEach(d => {



                    if (selMonthNum !== null && d.m !== selMonthNum) return;



                    if (state.mtSubChan !== 'ALL' && d.sc !== state.mtSubChan) return;



                    if (state.mtChain !== 'ALL' && d.acc !== state.mtChain) return;



                    if (state.mtCluster !== 'ALL' && d.cl !== state.mtCluster) return;



                        if (state.mtStore && state.mtStore !== 'ALL' && !isStoreMatch(d, state.mtStore)) return;







                    if (mtStoreState.filterSubChan !== 'ALL' && d.sc !== mtStoreState.filterSubChan) return;



                    if (mtStoreState.filterCluster !== 'ALL' && d.cl !== mtStoreState.filterCluster) return;



                    if (mtStoreState.filterChain !== 'ALL' && d.acc !== mtStoreState.filterChain) return;







                    const mom = d.lm > 0 ? (((d.val - d.lm) / d.lm) * 100).toFixed(1) + '%' : '-';



                    const yoy = d.ly > 0 ? (((d.val - d.ly) / d.ly) * 100).toFixed(1) + '%' : '-';







                    exportData.push({



                        'Tháng': 'T' + d.m + '/' + state.year,



                        'Mã Cửa Hàng': d.id,



                        'Tên Siêu Thị / Cửa Hàng': d.name,



                        'Chuỗi MT': d.acc,



                        'Phân Khúc': d.sc,



                        'Khu Vực': d.cl,



                        'Địa Chỉ': d.addr,



                        'Doanh Số Kỳ Này (VNĐ)': d.val,



                        'Doanh Số LM MTD (VNĐ)': d.lm,



                        'Tăng Trưởng MoM (%)': mom,



                        'Doanh Số Cùng Kỳ LY (VNĐ)': d.ly,



                        'Tăng Trưởng YoY (%)': yoy,



                        'Số SKU Active': d.sku



                    });



                });







                const ws = XLSX.utils.json_to_sheet(exportData);



                const wb = XLSX.utils.book_new();



                XLSX.utils.book_append_sheet(wb, ws, "MT_Stores");



                XLSX.writeFile(wb, "Danh_Sach_Cua_Hang_MT_" + state.year + ".xlsx");



            } catch (e) {



                console.error("Error exporting MT store table:", e);



                alert("Lỗi khi xuất Excel cửa hàng: " + e.message);



            }



        }











        // =========================================================================

