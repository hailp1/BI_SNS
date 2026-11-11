
        // TAB 4: KÊNH B2B & TAB 5: KÊNH KR



        // =========================================================================



        







        // =========================================================================



        // TAB 4: KÊNH B2B & TAB 5: KÊNH KR



        // =========================================================================



        function renderTabB2b() {



            try {



                const validPh1s = getValidPh1SetForCurrentFilter();



                const filterB2b = (d, yearVal, monthsArr) => {



                    if (d.year !== yearVal || !monthsArr.includes(d.month_num)) return false;



                    if (state.b2bAcc !== 'ALL' && d.b2b_account !== state.b2bAcc) return false;



                    if (state.b2bCust !== 'ALL' && d.b2b_customer !== state.b2bCust) return false;



                    if (!matchProductRecord(d)) return false;



                    return true;



                };







                const data = B2B_TREE.filter(d => filterB2b(d, state.year, state.selectedMonths));



                let total = 0; data.forEach(d => total += (Number(d.sellin_val) || 0));







                const lyYear = (parseInt(state.year) - 1).toString();



                let lyB2b = 0;



                B2B_TREE.filter(d => filterB2b(d, lyYear, state.selectedMonths)).forEach(d => lyB2b += (Number(d.sellin_val) || 0));



                const yoy = lyB2b > 0 ? ((total - lyB2b) / lyB2b) * 100 : 0;







                // YTD



                const ytdMonths = getYtdMonths();



                let ytdB2b2026 = 0;



                B2B_TREE.filter(d => filterB2b(d, state.year, ytdMonths)).forEach(d => ytdB2b2026 += (Number(d.sellin_val) || 0));







                let ytdB2b2025 = 0;



                B2B_TREE.filter(d => filterB2b(d, lyYear, ytdMonths)).forEach(d => ytdB2b2025 += (Number(d.sellin_val) || 0));







                const ytdGrowth = ytdB2b2025 > 0 ? ((ytdB2b2026 - ytdB2b2025) / ytdB2b2025) * 100 : 0;







                // Target B2B



                let b2bTarget = 0;



                if (typeof TARGET_SELLIN !== 'undefined' && Array.isArray(TARGET_SELLIN)) {



                    TARGET_SELLIN.filter(d => {



                        if (d.year !== state.year) return false;



                        const mNum = d.month.substring(5, 7);



                        if (!state.selectedMonths.includes(mNum)) return false;



                        if (d.channel !== 'B2B') return false;



                        if (state.b2bAcc !== 'ALL') {



                            const accMatch = (d.account_npp && d.account_npp.toLowerCase().trim() === state.b2bAcc.toLowerCase().trim()) ||



                                             (d.sub_channel && d.sub_channel.toLowerCase().trim() === state.b2bAcc.toLowerCase().trim());



                            if (!accMatch) return false;



                        }



                        if (!matchProductTarget(d, validPh1s)) return false;



                        return true;



                    }).forEach(d => b2bTarget += (Number(d.target_amt) || 0));



                }



                const b2bGap = total - b2bTarget;



                const b2bAchieve = b2bTarget > 0 ? (total / b2bTarget) * 100 : 0;







                // Active B2B Accounts



                const activeB2bSet = new Set();



                data.forEach(d => {



                    const custKey = d.b2b_customer || d.b2b_account;



                    if (Number(d.sellin_val) > 0 && custKey) activeB2bSet.add(custKey);



                });



                const activeB2b = activeB2bSet.size;



                const vpoB2b = activeB2b > 0 ? total / activeB2b : 0;







                // Total Company Sellin & Share (with product filter)



                let totalAllCompany = 0;



                SELLIN_M.filter(d => {



                    if (d.year !== state.year || !state.selectedMonths.includes(d.month_num)) return false;



                    if (!matchProductRecord(d)) return false;



                    return true;



                }).forEach(d => {



                    totalAllCompany += (Number(d.sellin_val) || 0);



                });



                const b2bShare = totalAllCompany > 0 ? (total / totalAllCompany * 100) : 0;







                // MoM / PoP



                const minMonth = Math.min(...state.selectedMonths.map(m => parseInt(m)));



                const countMonths = state.selectedMonths.length;



                const popMonths = [];



                for (let i = 1; i <= countMonths; i++) {



                    const targetM = minMonth - i;



                    if (targetM >= 1) popMonths.push(targetM.toString().padStart(2, '0'));



                }



                let popB2b = 0;



                B2B_TREE.filter(d => filterB2b(d, state.year, popMonths)).forEach(d => popB2b += (Number(d.sellin_val) || 0));



                const popGrowth = popB2b > 0 ? ((total - popB2b) / popB2b) * 100 : 0;







                // Update UI



                const lblScope = document.getElementById('lbl-b2b-scope');



                if (lblScope) {



                    if (state.b2bCust !== 'ALL') lblScope.innerText = t('lbl_cust_prefix') + state.b2bCust;



                    else if (state.b2bAcc !== 'ALL') lblScope.innerText = t('lbl_subgroup_prefix') + state.b2bAcc;



                    else lblScope.innerText = t('opt_all_cust_b2b');



                }







                // Card 1



                const kpiSi = document.getElementById('b2b-kpi-sellin');



                if (kpiSi) {



                    kpiSi.innerText = formatBnVn(total);



                    kpiSi.title = formatExactVND(total);



                }



                const kpiYoy = document.getElementById('b2b-kpi-yoy');



                if (kpiYoy) {



                    kpiYoy.innerText = (yoy >= 0 ? '+' : '') + yoy.toFixed(1) + '%';



                    kpiYoy.className = yoy >= 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold';



                }



                const kpiLy = document.getElementById('b2b-kpi-ly-bn');



                if (kpiLy) {



                    kpiLy.innerText = getLyBenchmarkText(lyB2b);



                    kpiLy.title = getLyBenchmarkTitle(lyB2b);



                }



                const kpiYtd = document.getElementById('b2b-kpi-ytd');



                if (kpiYtd) {



                    kpiYtd.innerText = (ytdGrowth >= 0 ? '+' : '') + ytdGrowth.toFixed(1) + '%';



                    kpiYtd.className = ytdGrowth >= 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold';



                }



                const kpiYtdVal = document.getElementById('b2b-kpi-ytd-val');



                if (kpiYtdVal) {



                    kpiYtdVal.innerText = getYtdBenchmarkText(ytdB2b2026);



                    kpiYtdVal.title = getYtdBenchmarkTitle(ytdB2b2026);



                }







                // MoM MTD cho Card 1 (Sell-in B2B)



                renderMoMElement('b2b-kpi-si-mom', 'b2b-kpi-si-lmmtd', calculateMoMMtdForChannel('B2B'));







                // Card 2



                const kpiTarget = document.getElementById('b2b-kpi-target');



                if (kpiTarget) {



                    kpiTarget.innerText = b2bTarget > 0 ? formatBnVn(b2bTarget) : 'N/A';



                    if (b2bTarget > 0) kpiTarget.title = formatExactVND(b2bTarget);



                }



                const kpiTargetGap = document.getElementById('b2b-kpi-target-gap');



                if (kpiTargetGap) {



                    if (b2bTarget > 0) {



                        kpiTargetGap.innerText = (b2bGap >= 0 ? '+' : '') + formatBnVn(b2bGap);



                        kpiTargetGap.className = b2bGap >= 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold';



                    } else {



                        kpiTargetGap.innerText = '--';



                        kpiTargetGap.className = 'text-slate-400 font-bold';



                    }



                }



                const kpiTargetSub = document.getElementById('b2b-kpi-target-sub');



                if (kpiTargetSub) {



                    kpiTargetSub.innerText = b2bTarget > 0 ? (t('lbl_plan_mtd') + ' ' + (state.selectedMonths.length === 1 ? (state.currentLang === 'ko' ? (parseInt(state.selectedMonths[0]) + '월') : ('T' + parseInt(state.selectedMonths[0]))) : '')) : t('lbl_no_target');



                }







                // Card 3: % Target B2B (Chuẩn 26 ngày làm việc)



                const b2bWorkProgress = getWorkdayProgressPct();



                const isB2bOnTrack = b2bAchieve >= b2bWorkProgress;



                const kpiAchieve = document.getElementById('b2b-kpi-achieve');



                if (kpiAchieve) {



                    if (b2bTarget > 0) {



                        kpiAchieve.innerText = b2bAchieve.toFixed(1) + '%';



                        kpiAchieve.className = 'text-2xl font-black font-mono-num mt-1 mb-1 tracking-tight ' + (isB2bOnTrack ? 'text-green-700' : 'text-red-600');



                        kpiAchieve.style.color = isB2bOnTrack ? '#15803d' : '#dc2626';



                    } else {



                        kpiAchieve.innerText = '--%';



                        kpiAchieve.className = 'text-2xl font-black font-mono-num mt-1 mb-1 tracking-tight text-slate-400';



                        kpiAchieve.style.color = '';



                    }



                }



                const kpiAchieveStatus = document.getElementById('b2b-kpi-achieve-status');



                if (kpiAchieveStatus) {



                    if (b2bTarget > 0) {



                        const statusTxt = isB2bOnTrack ? (t('lbl_on_track') + ' (' + t('lbl_standard_26d') + b2bWorkProgress.toFixed(1) + '%)') : (t('lbl_behind_track') + ' (' + t('lbl_standard_26d') + b2bWorkProgress.toFixed(1) + '%)');



                        kpiAchieveStatus.innerText = statusTxt;



                        kpiAchieveStatus.className = isB2bOnTrack ? 'text-green-700 font-bold' : 'text-red-600 font-bold';



                        kpiAchieveStatus.style.color = isB2bOnTrack ? '#15803d' : '#dc2626';



                    } else {



                        kpiAchieveStatus.innerText = t('lbl_monitoring');



                        kpiAchieveStatus.className = 'text-slate-400';



                        kpiAchieveStatus.style.color = '';



                    }



                }







                // Card 4



                const kpiLyVal = document.getElementById('b2b-kpi-ly');



                if (kpiLyVal) {



                    kpiLyVal.innerText = formatBnVn(lyB2b);



                    kpiLyVal.title = formatExactVND(lyB2b);



                }



                const diffLy = total - lyB2b;



                const kpiLyGrowth = document.getElementById('b2b-kpi-ly-growth');



                if (kpiLyGrowth) {



                    kpiLyGrowth.innerText = (diffLy >= 0 ? '+' : '') + formatBnVn(diffLy);



                    kpiLyGrowth.className = diffLy >= 0 ? 'text-green-700 font-bold' : 'text-red-600 font-bold';



                    kpiLyGrowth.style.color = diffLy >= 0 ? '#15803d' : '#dc2626';



                }







                // Card 5



                const kpiAcc = document.getElementById('b2b-kpi-accounts');



                if (kpiAcc) kpiAcc.innerText = formatNumVn(activeB2b) + ' ' + t('lbl_active_enterprises');



                const kpiVpo = document.getElementById('b2b-kpi-vpo');



                if (kpiVpo) kpiVpo.innerText = vpoB2b >= 1e9 ? formatBnVn(vpoB2b) : formatMnVn(vpoB2b);







                // Row 2



                const kpiRow2Vpo = document.getElementById('b2b-kpi-row2-vpo');



                if (kpiRow2Vpo) kpiRow2Vpo.innerText = vpoB2b >= 1e9 ? formatBnVn(vpoB2b) : formatMnVn(vpoB2b);



                const kpiShare = document.getElementById('b2b-kpi-share');



                if (kpiShare) kpiShare.innerText = b2bShare.toFixed(1) + '%';



                const kpiMom = document.getElementById('b2b-kpi-mom');



                if (kpiMom) {



                    kpiMom.innerText = (popGrowth >= 0 ? '+' : '') + popGrowth.toFixed(1) + '%';



                    kpiMom.className = 'text-2xl font-black font-mono-num my-0.5 ' + (popGrowth >= 0 ? 'text-slate-800' : 'text-rose-600');



                }



                const kpiLm = document.getElementById('b2b-kpi-lm-bn');



                if (kpiLm) kpiLm.innerText = t('lbl_period_adjacent') + ': ' + formatBnVn(popB2b);







                const tbody = document.getElementById('tbody-tree-b2b');



                if (!tbody) return;







                const custMap = {};



                data.forEach(d => {



                    const custKey = d.b2b_customer || d.b2b_account;



                    custMap[custKey] = (custMap[custKey] || 0) + (Number(d.sellin_val) || 0);



                });







                const lyCustMap = {};



                B2B_TREE.filter(d => filterB2b(d, lyYear, state.selectedMonths)).forEach(d => {



                    const custKey = d.b2b_customer || d.b2b_account;



                    lyCustMap[custKey] = (lyCustMap[custKey] || 0) + (Number(d.sellin_val) || 0);



                });







                const b2bTargetMap = {};



                if (typeof TARGET_SELLIN !== 'undefined' && Array.isArray(TARGET_SELLIN)) {



                    TARGET_SELLIN.filter(d => {



                        if (d.year !== state.year) return false;



                        const mNum = d.month.substring(5, 7);



                        if (!state.selectedMonths.includes(mNum)) return false;



                        if (d.channel !== 'B2B') return false;



                        if (!matchProductTarget(d, validPh1s)) return false;



                        return true;



                    }).forEach(d => {



                        const tgt = Number(d.target_amt) || 0;



                        const k = d.account_npp || d.sub_channel || d.distributor_code;



                        if (k) {



                            b2bTargetMap[k] = (b2bTargetMap[k] || 0) + tgt;



                            b2bTargetMap[k.toLowerCase().trim()] = (b2bTargetMap[k.toLowerCase().trim()] || 0) + tgt;



                        }



                    });



                }







                // Tổng hợp doanh số thực tế và LY theo Account (Direct / Indirect)



                const accValMap = {};



                data.forEach(d => {



                    const aKey = d.b2b_account || 'Direct';



                    accValMap[aKey] = (accValMap[aKey] || 0) + (Number(d.sellin_val) || 0);



                });



                const accLyMap = {};



                B2B_TREE.filter(d => filterB2b(d, lyYear, state.selectedMonths)).forEach(d => {



                    const aKey = d.b2b_account || 'Direct';



                    accLyMap[aKey] = (accLyMap[aKey] || 0) + (Number(d.sellin_val) || 0);



                });







                const b2bRows = [];







                // 1. Hiển thị hàng Phân nhóm Account (Direct & Indirect) có Target & % Đạt



                const accountsToShow = state.b2bAcc === 'ALL' ? ['Direct', 'Indirect'] : [state.b2bAcc];



                accountsToShow.forEach(acc => {



                    const aVal = accValMap[acc] || 0;



                    const aLy = accLyMap[acc] || 0;



                    const aTgt = b2bTargetMap[acc] || b2bTargetMap[acc.toLowerCase()] || 0;



                    const aShare = total > 0 ? (aVal / total) * 100 : 0;



                    const aYoyHtml = formatTreeYoy(aVal, aLy);



                    const aTgtHtml = aTgt > 0 ? formatVND(aTgt) : '<span class="text-slate-400 font-mono-num">--</span>';



                    const aAchHtml = aTgt > 0 ? formatAchieveBadge(aVal, aTgt) : '<span class="text-slate-400 font-mono-num text-[10px]">--</span>';







                    b2bRows.push('<tr class="tree-row-total tree-row-b2b-acc bg-purple-100/95 font-black border-y-2 border-purple-400 text-purple-950 hover:bg-purple-200/80 transition-colors shadow-2xs" data-level="0">' +



                        '<td class="font-black text-purple-950 py-2.5 text-xs" title="' + escapeAttr(acc) + '"><div class="flex items-center min-w-0 w-full"><span class="inline-block w-3 h-3 rounded bg-purple-700 mr-2 flex-shrink-0"></span><span class="truncate block min-w-0 flex-1 uppercase tracking-wider font-black">PHÂN NHÓM: ' + acc + '</span></div></td>' +



                        '<td class="text-right font-mono-num font-black text-purple-950 py-2.5 text-xs">' + formatVND(aVal) + '</td>' +



                        '<td class="text-right font-mono-num font-black text-purple-900 py-2.5 text-xs">' + aTgtHtml + '</td>' +



                        '<td class="text-center font-mono-num py-2.5">' + aAchHtml + '</td>' +



                        '<td class="text-right font-mono-num text-purple-950 font-black py-2.5">' + aShare.toFixed(1) + '%</td>' +



                        '<td class="text-right font-mono-num font-bold py-2.5">' + aYoyHtml + '</td>' +



                    '</tr>');



                });







                // Header phân tách cho Top khách hàng



                b2bRows.push('<tr class="bg-slate-100/80 border-y border-slate-200"><td colspan="6" class="py-1 px-3 text-[10px] font-black uppercase text-slate-500 tracking-wider">Top Khách Hàng Doanh Nghiệp (Thực Đạt)</td></tr>');







                // 2. Hiển thị Top 15 Khách hàng



                Object.keys(custMap).sort((a,b) => custMap[b] - custMap[a]).slice(0, 15).forEach(cust => {



                    const val = custMap[cust];



                    const share = total > 0 ? (val / total) * 100 : 0;



                    const lyVal = lyCustMap[cust] || 0;



                    const yoyHtml = formatTreeYoy(val, lyVal);







                    b2bRows.push('<tr class="border-b border-slate-100 hover:bg-slate-50"><td class="font-medium text-slate-800" title="' + escapeAttr(cust) + '"><div class="flex items-center min-w-0 w-full"><span class="inline-block w-1.5 h-1.5 rounded-full bg-sky-500 mr-2 flex-shrink-0"></span><span class="truncate block min-w-0 flex-1">' + cust + '</span></div></td><td class="text-right font-mono-num font-semibold text-sky-800">' + formatVND(val) + '</td><td class="text-right font-mono-num text-slate-400 font-mono-num">--</td><td class="text-right font-mono-num text-slate-400 text-[10px]">--</td><td class="text-right font-mono-num text-slate-600">' + share.toFixed(1) + '%</td><td class="text-right font-mono-num">' + yoyHtml + '</td></tr>');



                });



                tbody.innerHTML = b2bRows.join('');



                renderChannelProductTree('B2B', 'tbody-tree-prod-b2b');



                if (typeof TableCustomizer !== 'undefined') {



                    TableCustomizer.init('table-tree-prod-b2b');



                    TableCustomizer.init('table-tree-b2b');



                }



            } catch (e) {



                console.error("Error in renderTabB2b:", e);



            }



        }







        function renderTabKr() {



            try {



                const validPh1s = getValidPh1SetForCurrentFilter();



                const filterKr = (d, yearVal, monthsArr) => {



                    if (d.year !== yearVal || !monthsArr.includes(d.month_num)) return false;



                    if (state.krSubChan !== 'ALL' && d.sub_channel !== state.krSubChan) return false;



                    if (state.krChain !== 'ALL' && d.kr_chain !== state.krChain) return false;



                    if (!matchProductRecord(d)) return false;



                    return true;



                };







                const data = KR_TREE.filter(d => filterKr(d, state.year, state.selectedMonths));



                let total = 0; data.forEach(d => total += (Number(d.sellin_val) || 0));







                const lyYear = (parseInt(state.year) - 1).toString();



                let lyKr = 0;



                KR_TREE.filter(d => filterKr(d, lyYear, state.selectedMonths)).forEach(d => lyKr += (Number(d.sellin_val) || 0));



                const yoy = lyKr > 0 ? ((total - lyKr) / lyKr) * 100 : 0;







                // YTD



                const ytdMonths = getYtdMonths();



                let ytdKr2026 = 0;



                KR_TREE.filter(d => filterKr(d, state.year, ytdMonths)).forEach(d => ytdKr2026 += (Number(d.sellin_val) || 0));







                let ytdKr2025 = 0;



                KR_TREE.filter(d => filterKr(d, lyYear, ytdMonths)).forEach(d => ytdKr2025 += (Number(d.sellin_val) || 0));







                const ytdGrowth = ytdKr2025 > 0 ? ((ytdKr2026 - ytdKr2025) / ytdKr2025) * 100 : 0;







                // Target KR



                let krTarget = 0;



                if (typeof TARGET_SELLIN !== 'undefined' && Array.isArray(TARGET_SELLIN)) {



                    TARGET_SELLIN.filter(d => {



                        if (d.year !== state.year) return false;



                        const mNum = d.month.substring(5, 7);



                        if (!state.selectedMonths.includes(mNum)) return false;



                        if (d.channel !== 'KR') return false;



                        if (state.krSubChan !== 'ALL' && d.sub_channel && d.sub_channel !== state.krSubChan) return false;



                        if (state.krChain !== 'ALL' && d.account_npp && d.account_npp !== state.krChain) return false;



                        if (!matchProductTarget(d, validPh1s)) return false;



                        return true;



                    }).forEach(d => krTarget += (Number(d.target_amt) || 0));



                }



                const krGap = total - krTarget;



                const krAchieve = krTarget > 0 ? (total / krTarget) * 100 : 0;







                // Active KR Accounts



                const activeKrSet = new Set();



                data.forEach(d => {



                    if (Number(d.sellin_val) > 0 && d.kr_chain) activeKrSet.add(d.kr_chain);



                });



                const activeKr = activeKrSet.size;



                const vpoKr = activeKr > 0 ? total / activeKr : 0;







                // Total Company Sellin & Share (with product filter)



                let totalAllCompany = 0;



                SELLIN_M.filter(d => {



                    if (d.year !== state.year || !state.selectedMonths.includes(d.month_num)) return false;



                    if (!matchProductRecord(d)) return false;



                    return true;



                }).forEach(d => {



                    totalAllCompany += (Number(d.sellin_val) || 0);



                });



                const krShare = totalAllCompany > 0 ? (total / totalAllCompany * 100) : 0;







                // MoM / PoP



                const minMonth = Math.min(...state.selectedMonths.map(m => parseInt(m)));



                const countMonths = state.selectedMonths.length;



                const popMonths = [];



                for (let i = 1; i <= countMonths; i++) {



                    const targetM = minMonth - i;



                    if (targetM >= 1) popMonths.push(targetM.toString().padStart(2, '0'));



                }



                let popKr = 0;



                KR_TREE.filter(d => filterKr(d, state.year, popMonths)).forEach(d => popKr += (Number(d.sellin_val) || 0));



                const popGrowth = popKr > 0 ? ((total - popKr) / popKr) * 100 : 0;







                // Update UI



                const lblScope = document.getElementById('lbl-kr-scope');



                if (lblScope) {



                    if (state.krChain !== 'ALL') lblScope.innerText = t('lbl_chain_prefix') + state.krChain;



                    else if (state.krSubChan !== 'ALL') lblScope.innerText = t('lbl_segment_prefix') + state.krSubChan;



                    else lblScope.innerText = t('lbl_kr_retail_chains');



                }







                // Card 1



                const kpiSi = document.getElementById('kr-kpi-sellin');



                if (kpiSi) {



                    kpiSi.innerText = formatBnVn(total);



                    kpiSi.title = formatExactVND(total);



                }



                const kpiYoy = document.getElementById('kr-kpi-yoy');



                if (kpiYoy) {



                    kpiYoy.innerText = (yoy >= 0 ? '+' : '') + yoy.toFixed(1) + '%';



                    kpiYoy.className = yoy >= 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold';



                }



                const kpiLy = document.getElementById('kr-kpi-ly-bn');



                if (kpiLy) {



                    kpiLy.innerText = getLyBenchmarkText(lyKr);



                    kpiLy.title = getLyBenchmarkTitle(lyKr);



                }



                const kpiYtd = document.getElementById('kr-kpi-ytd');



                if (kpiYtd) {



                    kpiYtd.innerText = (ytdGrowth >= 0 ? '+' : '') + ytdGrowth.toFixed(1) + '%';



                    kpiYtd.className = ytdGrowth >= 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold';



                }



                const kpiYtdVal = document.getElementById('kr-kpi-ytd-val');



                if (kpiYtdVal) {



                    kpiYtdVal.innerText = getYtdBenchmarkText(ytdKr2026);



                    kpiYtdVal.title = getYtdBenchmarkTitle(ytdKr2026);



                }







                // MoM MTD cho Card 1 (Sell-in KR)



                renderMoMElement('kr-kpi-si-mom', 'kr-kpi-si-lmmtd', calculateMoMMtdForChannel('KR'));







                // Card 2



                const kpiTarget = document.getElementById('kr-kpi-target');



                if (kpiTarget) {



                    kpiTarget.innerText = krTarget > 0 ? formatBnVn(krTarget) : 'N/A';



                    if (krTarget > 0) kpiTarget.title = formatExactVND(krTarget);



                }



                const kpiTargetGap = document.getElementById('kr-kpi-target-gap');



                if (kpiTargetGap) {



                    if (krTarget > 0) {



                        kpiTargetGap.innerText = (krGap >= 0 ? '+' : '') + formatBnVn(krGap);



                        kpiTargetGap.className = krGap >= 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold';



                    } else {



                        kpiTargetGap.innerText = '--';



                        kpiTargetGap.className = 'text-slate-400 font-bold';



                    }



                }



                const kpiTargetSub = document.getElementById('kr-kpi-target-sub');



                if (kpiTargetSub) {



                    kpiTargetSub.innerText = krTarget > 0 ? (t('lbl_plan_mtd') + ' ' + (state.selectedMonths.length === 1 ? (state.currentLang === 'ko' ? (parseInt(state.selectedMonths[0]) + '월') : ('T' + parseInt(state.selectedMonths[0]))) : '')) : t('lbl_no_target');



                }







                // Card 3: % Target KR (Chuẩn 26 ngày làm việc)



                const krWorkProgress = getWorkdayProgressPct();



                const isKrOnTrack = krAchieve >= krWorkProgress;



                const kpiAchieve = document.getElementById('kr-kpi-achieve');



                if (kpiAchieve) {



                    if (krTarget > 0) {



                        kpiAchieve.innerText = krAchieve.toFixed(1) + '%';



                        kpiAchieve.className = 'text-2xl font-black font-mono-num mt-1 mb-1 tracking-tight ' + (isKrOnTrack ? 'text-green-700' : 'text-red-600');



                        kpiAchieve.style.color = isKrOnTrack ? '#15803d' : '#dc2626';



                    } else {



                        kpiAchieve.innerText = '--%';



                        kpiAchieve.className = 'text-2xl font-black font-mono-num mt-1 mb-1 tracking-tight text-slate-400';



                        kpiAchieve.style.color = '';



                    }



                }



                const kpiAchieveStatus = document.getElementById('kr-kpi-achieve-status');



                if (kpiAchieveStatus) {



                    if (krTarget > 0) {



                        const statusTxt = isKrOnTrack ? (t('lbl_on_track') + ' (' + t('lbl_standard_26d') + krWorkProgress.toFixed(1) + '%)') : (t('lbl_behind_track') + ' (' + t('lbl_standard_26d') + krWorkProgress.toFixed(1) + '%)');



                        kpiAchieveStatus.innerText = statusTxt;



                        kpiAchieveStatus.className = isKrOnTrack ? 'text-green-700 font-bold' : 'text-red-600 font-bold';



                        kpiAchieveStatus.style.color = isKrOnTrack ? '#15803d' : '#dc2626';



                    } else {



                        kpiAchieveStatus.innerText = t('lbl_monitoring');



                        kpiAchieveStatus.className = 'text-slate-400';



                        kpiAchieveStatus.style.color = '';



                    }



                }







                // Card 4



                const kpiLyVal = document.getElementById('kr-kpi-ly');



                if (kpiLyVal) {



                    kpiLyVal.innerText = formatBnVn(lyKr);



                    kpiLyVal.title = formatExactVND(lyKr);



                }



                const diffLy = total - lyKr;



                const kpiLyGrowth = document.getElementById('kr-kpi-ly-growth');



                if (kpiLyGrowth) {



                    kpiLyGrowth.innerText = (diffLy >= 0 ? '+' : '') + formatBnVn(diffLy);



                    kpiLyGrowth.className = diffLy >= 0 ? 'text-green-700 font-bold' : 'text-red-600 font-bold';



                    kpiLyGrowth.style.color = diffLy >= 0 ? '#15803d' : '#dc2626';



                }







                // Card 5



                const kpiAcc = document.getElementById('kr-kpi-accounts');



                if (kpiAcc) kpiAcc.innerText = formatNumVn(activeKr) + ' ' + t('lbl_active_agencies');



                const kpiVpo = document.getElementById('kr-kpi-vpo');



                if (kpiVpo) kpiVpo.innerText = vpoKr >= 1e9 ? formatBnVn(vpoKr) : formatMnVn(vpoKr);







                // Row 2



                const kpiRow2Vpo = document.getElementById('kr-kpi-row2-vpo');



                if (kpiRow2Vpo) kpiRow2Vpo.innerText = vpoKr >= 1e9 ? formatBnVn(vpoKr) : formatMnVn(vpoKr);



                const kpiShare = document.getElementById('kr-kpi-share');



                if (kpiShare) kpiShare.innerText = krShare.toFixed(1) + '%';



                const kpiMom = document.getElementById('kr-kpi-mom');



                if (kpiMom) {



                    kpiMom.innerText = (popGrowth >= 0 ? '+' : '') + popGrowth.toFixed(1) + '%';



                    kpiMom.className = 'text-2xl font-black font-mono-num my-0.5 ' + (popGrowth >= 0 ? 'text-slate-800' : 'text-rose-600');



                }



                const kpiLm = document.getElementById('kr-kpi-lm-bn');



                if (kpiLm) kpiLm.innerText = t('lbl_period_adjacent') + ': ' + formatBnVn(popKr);







                const tbody = document.getElementById('tbody-tree-kr');



                if (!tbody) return;







                const chainMap = {};



                data.forEach(d => chainMap[d.kr_chain] = (chainMap[d.kr_chain] || 0) + (Number(d.sellin_val) || 0));







                const lyChainMap = {};



                KR_TREE.filter(d => filterKr(d, lyYear, state.selectedMonths)).forEach(d => {



                    lyChainMap[d.kr_chain] = (lyChainMap[d.kr_chain] || 0) + (Number(d.sellin_val) || 0);



                });







                const krTargetMap = {};



                if (typeof TARGET_SELLIN !== 'undefined' && Array.isArray(TARGET_SELLIN)) {



                    TARGET_SELLIN.filter(d => {



                        if (d.year !== state.year) return false;



                        const mNum = d.month.substring(5, 7);



                        if (!state.selectedMonths.includes(mNum)) return false;



                        if (d.channel !== 'KR') return false;



                        if (!matchProductTarget(d, validPh1s)) return false;



                        return true;



                    }).forEach(d => {



                        const k = d.account_npp || d.distributor_code;



                        if (k) krTargetMap[k] = (krTargetMap[k] || 0) + (Number(d.target_amt) || 0);



                    });



                }







                const krRows = [];



                Object.keys(chainMap).sort((a,b) => chainMap[b] - chainMap[a]).slice(0, 15).forEach(chain => {



                    const val = chainMap[chain];



                    const share = total > 0 ? (val / total) * 100 : 0;



                    const tgt = krTargetMap[chain] || 0;



                    const lyVal = lyChainMap[chain] || 0;



                    const yoyHtml = formatTreeYoy(val, lyVal);



                    const tgtHtml = tgt > 0 ? formatVND(tgt) : '<span class="text-slate-400 font-mono-num">--</span>';



                    const achHtml = tgt > 0 ? formatAchieveBadge(val, tgt) : '<span class="text-slate-400 font-mono-num text-[10px]">--</span>';







                    krRows.push('<tr class="border-b border-slate-100 hover:bg-slate-50"><td class="font-medium text-slate-800" title="' + escapeAttr(chain) + '"><div class="flex items-center min-w-0 w-full"><span class="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 mr-2 flex-shrink-0"></span><span class="truncate block min-w-0 flex-1">' + chain + '</span></div></td><td class="text-right font-mono-num font-semibold text-amber-800">' + formatVND(val) + '</td><td class="text-right font-mono-num text-purple-700">' + tgtHtml + '</td><td class="text-right font-mono-num">' + achHtml + '</td><td class="text-right font-mono-num text-slate-600">' + share.toFixed(1) + '%</td><td class="text-right font-mono-num">' + yoyHtml + '</td></tr>');



                });



                tbody.innerHTML = krRows.join('');



                renderChannelProductTree('KR', 'tbody-tree-prod-kr');



                if (typeof TableCustomizer !== 'undefined') {



                    TableCustomizer.init('table-tree-prod-kr');



                    TableCustomizer.init('table-tree-kr');



                }



            } catch (e) {



                console.error("Error in renderTabKr:", e);



            }



        }




