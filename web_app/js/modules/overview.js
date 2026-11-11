
        // TAB 1: OVERVIEW DASHBOARD (DYNAMIC SYNCHRONIZED BY CHANNEL/ACCOUNT/PROD)



        // =========================================================================



        function renderTabOverview() {



            try {



                // Filter SELLIN_M by Tab 1 Commercial hierarchy and Product hierarchy



                const filterItem = (d, yearVal, monthsArr) => {



                    if (d.year !== yearVal) return false;



                    if (!monthsArr.includes(d.month_num)) return false;



                    



                    // Commercial hierarchy



                    if (state.dashChannel !== 'ALL' && d.channel !== state.dashChannel) return false;



                    if (state.dashSubChannel !== 'ALL' && d.sub_channel !== state.dashSubChannel) return false;



                    if (state.dashAccount !== 'ALL' && d.account_name !== state.dashAccount && d.account_code !== state.dashAccount) return false;







                    // Geographic hierarchy (Miền, Vùng, GSBH, NPP) for scoped users



                    if (state.geoMien !== 'ALL' && d.mien && d.mien !== state.geoMien) return false;



                    if (state.geoVung !== 'ALL' && (d.cluster || d.vung) && (d.cluster !== state.geoVung && d.vung !== state.geoVung)) return false;
                    if (state.geoArea && state.geoArea !== 'ALL' && (typeof matchAreaRecord === 'function' ? !matchAreaRecord(d, state.geoArea) : false)) return false;



                    if (state.geoGsbh !== 'ALL' && (typeof matchGsbhRecord === 'function' ? !matchGsbhRecord(d, state.geoGsbh) : (d.gsbh && d.gsbh !== state.geoGsbh))) return false;



                    if (state.geoNpp !== 'ALL' && (d.account_code !== state.geoNpp && d.account_name !== state.geoNpp)) return false;







                    // Product hierarchy



                    if (state.prodStorage !== 'ALL' && d.storage !== state.prodStorage) return false;



                    if (state.prodCate !== 'ALL' && d.cate !== state.prodCate) return false;



                    if (state.prodPh1 !== 'ALL' && d.ph1 !== state.prodPh1) return false;



                    if (state.prodPh2 !== 'ALL' && d.ph2 !== state.prodPh2) return false;
                    if (state.prodSku !== 'ALL' && (d.sku_name || d.sku) && (d.sku_name || d.sku) !== state.prodSku) return false;



                    return true;



                };







                const lyYear = (parseInt(state.year) - 1).toString();
                const isOvProdOrGeoFiltered = (
                    state.prodStorage !== 'ALL' || state.prodCate !== 'ALL' || state.prodPh1 !== 'ALL' || state.prodPh2 !== 'ALL' || state.prodSku !== 'ALL' ||
                    state.geoMien !== 'ALL' || state.geoVung !== 'ALL' || (state.geoArea && state.geoArea !== 'ALL') || state.geoGsbh !== 'ALL' || state.geoNpp !== 'ALL'
                );
                const ovSellinSource = (!isOvProdOrGeoFiltered && Array.isArray(_payloadCache['CHAN_TREE']))
                    ? CHAN_TREE
                    : SELLIN_M;

                const data2026 = ovSellinSource.filter(d => filterItem(d, state.year, state.selectedMonths));
                const data2025 = ovSellinSource.filter(d => filterItem(d, lyYear, state.selectedMonths));

                // YTD Months: bounded by available data in current year
                const ytdMonths = getYtdMonths();

                const ytdData2026 = ovSellinSource.filter(d => filterItem(d, state.year, ytdMonths));
                const ytdData2025 = ovSellinSource.filter(d => filterItem(d, lyYear, ytdMonths));







                let totalSellin2026 = 0; data2026.forEach(d => totalSellin2026 += (Number(d.sellin_val) || 0));



                let totalSellin2025 = 0; data2025.forEach(d => totalSellin2025 += (Number(d.sellin_val) || 0));



                let ytdSellin2026 = 0; ytdData2026.forEach(d => ytdSellin2026 += (Number(d.sellin_val) || 0));



                let ytdSellin2025 = 0; ytdData2025.forEach(d => ytdSellin2025 += (Number(d.sellin_val) || 0));







                const siYoY = totalSellin2025 > 0 ? ((totalSellin2026 - totalSellin2025) / totalSellin2025) * 100 : 0;



                const siYtd = ytdSellin2025 > 0 ? ((ytdSellin2026 - ytdSellin2025) / ytdSellin2025) * 100 : 0;







                // TARGET SELL-IN



                let totalTarget = 0;



                if (typeof TARGET_SELLIN !== 'undefined' && Array.isArray(TARGET_SELLIN)) {



                    const validPh1s = getValidPh1SetForCurrentFilter();



                    TARGET_SELLIN.filter(d => {



                        if (d.year !== state.year) return false;



                        const mNum = d.month.substring(5, 7);



                        if (!state.selectedMonths.includes(mNum)) return false;



                        if (state.dashChannel !== 'ALL' && d.channel !== state.dashChannel) return false;



                        if (state.dashSubChannel !== 'ALL' && d.sub_channel && d.sub_channel !== state.dashSubChannel) return false;



                        if (state.dashAccount !== 'ALL' && d.account_npp !== state.dashAccount && d.distributor_code !== state.dashAccount) return false;



                        if (!matchProductTarget(d, validPh1s)) return false;



                        return true;



                    }).forEach(d => totalTarget += (Number(d.target_amt) || 0));



                }







                const targetGap = totalSellin2026 - totalTarget;



                const achieveRate = totalTarget > 0 ? (totalSellin2026 / totalTarget) * 100 : 0;







                // ACTIVE ACCOUNTS (Khách hàng / NPP có phát sinh Sell-in)



                const activeAccountsSet = new Set();



                data2026.forEach(d => {



                    if (Number(d.sellin_val) > 0 && d.account_name) {



                        activeAccountsSet.add(d.account_name);



                    }



                });



                const activeAccounts = activeAccountsSet.size;



                const vpoSellin = activeAccounts > 0 ? (totalSellin2026 / activeAccounts) : 0;







                // ==========================================



                // TÍNH TOÁN CHỈ SỐ MTD SO VỚI THÁNG TRƯỚC (MoM MTD)



                // ==========================================



                let siMomMtdPct = null;



                let totalCurMtd = 0;



                let totalPriorMtd = 0;



                let priorMonthLabel = '';







                let gtMomMtdPct = null, gtPriorMtd = 0;



                let mtMomMtdPct = null, mtPriorMtd = 0;



                let b2bMomMtdPct = null, b2bPriorMtd = 0;



                let krMomMtdPct = null, krPriorMtd = 0;



                let maxDayInMonth = 0;







                if (typeof DAILY_DATA !== 'undefined' && Array.isArray(DAILY_DATA) && state.selectedMonths.length === 1) {



                    const selM = state.selectedMonths[0]; // e.g. "09"



                    const curYearNum = parseInt(state.year, 10);



                    const curMonthNum = parseInt(selM, 10);



                    const curMonthPrefix = state.year + '-' + selM;







                    // Tìm ngày lớn nhất có phát sinh Sell-in trong tháng được chọn



                    DAILY_DATA.forEach(d => {



                        const dt = String(d.date_val || '');



                        if (dt.startsWith(curMonthPrefix) && (Number(d.daily_sellin) || 0) > 0) {



                            const dayNum = parseInt(dt.substring(8, 10), 10);



                            if (dayNum > maxDayInMonth) maxDayInMonth = dayNum;



                        }



                    });







                    if (maxDayInMonth > 0) {



                        const priorMonthNum = curMonthNum === 1 ? 12 : curMonthNum - 1;



                        const priorYearNum = curMonthNum === 1 ? curYearNum - 1 : curYearNum;



                        const priorMonthPrefix = priorYearNum + '-' + String(priorMonthNum).padStart(2, '0');



                        priorMonthLabel = 'T' + priorMonthNum;







                        let curMtdGT = 0, curMtdMT = 0, curMtdB2B = 0, curMtdKR = 0;







                        DAILY_DATA.forEach(d => {



                            const dt = String(d.date_val || '');



                            const v = Number(d.daily_sellin) || 0;



                            if (v === 0) return;







                            if (state.dashChannel !== 'ALL' && d.channel !== state.dashChannel) return;



                            if (!matchProductRecord(d)) return;







                            const dayNum = parseInt(dt.substring(8, 10), 10);



                            if (dayNum > maxDayInMonth) return;







                            if (dt.startsWith(curMonthPrefix)) {



                                totalCurMtd += v;



                                if (d.channel === 'GT') curMtdGT += v;



                                else if (d.channel === 'MT') curMtdMT += v;



                                else if (d.channel === 'B2B') curMtdB2B += v;



                                else if (d.channel === 'KR') curMtdKR += v;



                            } else if (dt.startsWith(priorMonthPrefix)) {



                                totalPriorMtd += v;



                                if (d.channel === 'GT') gtPriorMtd += v;



                                else if (d.channel === 'MT') mtPriorMtd += v;



                                else if (d.channel === 'B2B') b2bPriorMtd += v;



                                else if (d.channel === 'KR') krPriorMtd += v;



                            }



                        });







                        if (totalPriorMtd > 0) {



                            siMomMtdPct = ((totalCurMtd - totalPriorMtd) / totalPriorMtd) * 100;



                        }



                        if (gtPriorMtd > 0) {



                            gtMomMtdPct = ((curMtdGT - gtPriorMtd) / gtPriorMtd) * 100;



                        }



                        if (mtPriorMtd > 0) {



                            mtMomMtdPct = ((curMtdMT - mtPriorMtd) / mtPriorMtd) * 100;



                        }



                        if (b2bPriorMtd > 0) {



                            b2bMomMtdPct = ((curMtdB2B - b2bPriorMtd) / b2bPriorMtd) * 100;



                        }



                        if (krPriorMtd > 0) {



                            krMomMtdPct = ((curMtdKR - krPriorMtd) / krPriorMtd) * 100;



                        }



                    }



                }







                // 1. DOANH SỐ SELL-IN



                const elSi = document.getElementById('dash-kpi-sellin');



                if (elSi) {



                    elSi.innerText = formatBnVn(totalSellin2026);



                    elSi.title = formatExactVND(totalSellin2026);



                }



                const elSiYoy = document.getElementById('dash-kpi-si-yoy');



                if (elSiYoy) {



                    elSiYoy.innerText = (siYoY >= 0 ? '+' : '') + siYoY.toFixed(1) + '%';



                    elSiYoy.className = siYoY >= 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold';



                }



                const elSiLy = document.getElementById('dash-kpi-si-ly');



                if (elSiLy) {



                    elSiLy.innerText = getLyBenchmarkText(totalSellin2025);



                    elSiLy.title = getLyBenchmarkTitle(totalSellin2025);



                }



                const elSiYtd = document.getElementById('dash-kpi-si-ytd');



                if (elSiYtd) {



                    elSiYtd.innerText = (siYtd >= 0 ? '+' : '') + siYtd.toFixed(1) + '%';



                    elSiYtd.className = siYtd >= 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold';



                }



                const elSiYtdVal = document.getElementById('dash-kpi-si-ytd-val');



                if (elSiYtdVal) {



                    elSiYtdVal.innerText = getYtdBenchmarkText(ytdSellin2026);



                    elSiYtdVal.title = getYtdBenchmarkTitle(ytdSellin2026);



                }







                // MoM MTD cho Card 1



                const elSiMom = document.getElementById('dash-kpi-si-mom');



                const elSiLmMtd = document.getElementById('dash-kpi-si-lmmtd');



                if (elSiMom && elSiLmMtd) {



                    if (siMomMtdPct !== null) {



                        elSiMom.innerText = (siMomMtdPct >= 0 ? '+' : '') + siMomMtdPct.toFixed(1) + '%';



                        elSiMom.className = (siMomMtdPct >= 0 ? 'text-emerald-600' : 'text-rose-600') + ' font-bold';



                        elSiLmMtd.innerText = '(vs MTD ' + priorMonthLabel + ': ' + formatBnVn(totalPriorMtd) + ')';



                        elSiLmMtd.title = 'So sánh lũy kế từ ngày 1 đến ngày ' + maxDayInMonth + ' của ' + priorMonthLabel;



                    } else {



                        elSiMom.innerText = '--%';



                        elSiMom.className = 'text-slate-400 font-bold';



                        elSiLmMtd.innerText = '(N/A)';



                    }



                }







                // 2. CHỈ TIÊU BÁN HÀNG (TARGET)



                const elTarget = document.getElementById('dash-kpi-target');



                if (elTarget) {



                    elTarget.innerText = totalTarget > 0 ? formatBnVn(totalTarget) : 'N/A';



                    if (totalTarget > 0) elTarget.title = formatExactVND(totalTarget);



                }



                const elGap = document.getElementById('dash-kpi-target-gap');



                if (elGap) {



                    if (totalTarget > 0) {



                        elGap.innerText = (targetGap >= 0 ? '+' : '') + formatBnVn(targetGap);



                        elGap.className = targetGap >= 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold';



                    } else {



                        elGap.innerText = '--';



                        elGap.className = 'text-slate-400 font-bold';



                    }



                }



                const elTargetSub = document.getElementById('dash-kpi-target-sub');



                if (elTargetSub) {



                    elTargetSub.innerText = totalTarget > 0 ? (t('lbl_plan_mtd') + ' ' + (state.selectedMonths.length === 1 ? (state.currentLang === 'ko' ? (parseInt(state.selectedMonths[0]) + '월') : ('T' + parseInt(state.selectedMonths[0]))) : '')) : t('lbl_no_target');



                }







                // 3. TỶ LỆ ĐẠT CHỈ TIÊU (% TARGET - CHUẨN 26 NGÀY LÀM VIỆC)



                const workProgress = getWorkdayProgressPct();



                const isOverallOnTrack = achieveRate >= workProgress;



                const elAchieve = document.getElementById('dash-kpi-achieve');



                if (elAchieve) {



                    if (totalTarget > 0) {



                        elAchieve.innerText = achieveRate.toFixed(1) + '%';



                        elAchieve.className = 'text-2xl font-black font-mono-num mt-1 mb-1 tracking-tight ' + (isOverallOnTrack ? 'text-green-700' : 'text-red-600');



                        elAchieve.style.color = isOverallOnTrack ? '#15803d' : '#dc2626';



                    } else {



                        elAchieve.innerText = '--%';



                        elAchieve.className = 'text-2xl font-black font-mono-num mt-1 mb-1 tracking-tight text-slate-400';



                        elAchieve.style.color = '';



                    }



                }



                const elAchieveStatus = document.getElementById('dash-kpi-achieve-status');



                if (elAchieveStatus) {



                    if (totalTarget > 0) {



                        const statusTxt = isOverallOnTrack ? (t('lbl_on_track') + ' (' + t('lbl_standard_26d') + workProgress.toFixed(1) + '%)') : (t('lbl_behind_track') + ' (' + t('lbl_standard_26d') + workProgress.toFixed(1) + '%)');



                        elAchieveStatus.innerText = statusTxt;



                        elAchieveStatus.className = isOverallOnTrack ? 'text-green-700 font-bold' : 'text-red-600 font-bold';



                        elAchieveStatus.style.color = isOverallOnTrack ? '#15803d' : '#dc2626';



                    } else {



                        elAchieveStatus.innerText = t('lbl_monitoring');



                        elAchieveStatus.className = 'text-slate-400';



                        elAchieveStatus.style.color = '';



                    }



                }







                // 4. CÙNG KỲ NĂM TRƯỚC (LY)



                const elLy = document.getElementById('dash-kpi-ly');



                if (elLy) {



                    elLy.innerText = formatBnVn(totalSellin2025);



                    elLy.title = formatExactVND(totalSellin2025);



                }



                const diffLy = totalSellin2026 - totalSellin2025;



                const elLyGrowth = document.getElementById('dash-kpi-ly-growth');



                if (elLyGrowth) {



                    elLyGrowth.innerText = (diffLy >= 0 ? '+' : '') + formatBnVn(diffLy);



                    elLyGrowth.className = diffLy >= 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold';



                }



                const elLyYtd = document.getElementById('dash-kpi-ly-ytd');



                if (elLyYtd) {



                    elLyYtd.innerText = t('lbl_ly_ytd_accum') + ': ' + formatBnVn(ytdSellin2025);



                }







                // 5. KHÁCH HÀNG GIAO DỊCH (ACTIVE ACCOUNTS)



                const elAcc = document.getElementById('dash-kpi-accounts');



                if (elAcc) elAcc.innerText = formatNumVn(activeAccounts) + ' ' + t('lbl_active_accounts');



                const elVpo = document.getElementById('dash-kpi-vpo');



                if (elVpo) elVpo.innerText = vpoSellin >= 1e9 ? formatBnVn(vpoSellin) : formatMnVn(vpoSellin);







                // ROW 2: 4 CHANNEL CONTRIBUTION CARDS



                let gtSellin = 0, mtSellin = 0, b2bSellin = 0, krSellin = 0;



                data2026.forEach(d => {



                    const v = Number(d.sellin_val) || 0;



                    if (d.channel === 'GT') gtSellin += v;



                    else if (d.channel === 'MT') mtSellin += v;



                    else if (d.channel === 'B2B') b2bSellin += v;



                    else if (d.channel === 'KR') krSellin += v;



                });







                const gtShare = totalSellin2026 > 0 ? (gtSellin / totalSellin2026 * 100) : 0;



                const mtShare = totalSellin2026 > 0 ? (mtSellin / totalSellin2026 * 100) : 0;



                const b2bShare = totalSellin2026 > 0 ? (b2bSellin / totalSellin2026 * 100) : 0;



                const krShare = totalSellin2026 > 0 ? (krSellin / totalSellin2026 * 100) : 0;







                // Channel targets with active product & subchannel filters



                let gtTarget = 0, mtTarget = 0, b2bTarget = 0, krTarget = 0;



                if (typeof TARGET_SELLIN !== 'undefined' && Array.isArray(TARGET_SELLIN)) {



                    TARGET_SELLIN.filter(d => {



                        if (d.year !== state.year) return false;



                        const mNum = d.month.substring(5, 7);



                        if (!state.selectedMonths.includes(mNum)) return false;



                        if (state.prodStorage !== 'ALL' && d.storage && d.storage !== state.prodStorage) return false;



                        if (state.prodPh1 !== 'ALL' && d.ph1 && d.ph1 !== state.prodPh1) return false;



                        return true;



                    }).forEach(d => {



                        const amt = Number(d.target_amt) || 0;



                        if (d.channel === 'GT') gtTarget += amt;



                        else if (d.channel === 'MT') mtTarget += amt;



                        else if (d.channel === 'B2B') b2bTarget += amt;



                        else if (d.channel === 'KR') krTarget += amt;



                    });



                }







                // Channel Sell-in LY (2025)



                let gtSellinLY = 0, mtSellinLY = 0, b2bSellinLY = 0, krSellinLY = 0;



                data2025.forEach(d => {



                    const v = Number(d.sellin_val) || 0;



                    if (d.channel === 'GT') gtSellinLY += v;



                    else if (d.channel === 'MT') mtSellinLY += v;



                    else if (d.channel === 'B2B') b2bSellinLY += v;



                    else if (d.channel === 'KR') krSellinLY += v;



                });







                // Channel Sell-in YTD 2026



                let gtYtd26 = 0, mtYtd26 = 0, b2bYtd26 = 0, krYtd26 = 0;



                ytdData2026.forEach(d => {



                    const v = Number(d.sellin_val) || 0;



                    if (d.channel === 'GT') gtYtd26 += v;



                    else if (d.channel === 'MT') mtYtd26 += v;



                    else if (d.channel === 'B2B') b2bYtd26 += v;



                    else if (d.channel === 'KR') krYtd26 += v;



                });







                // Channel Sell-in YTD 2025 (LY)



                let gtYtd25 = 0, mtYtd25 = 0, b2bYtd25 = 0, krYtd25 = 0;



                ytdData2025.forEach(d => {



                    const v = Number(d.sellin_val) || 0;



                    if (d.channel === 'GT') gtYtd25 += v;



                    else if (d.channel === 'MT') mtYtd25 += v;



                    else if (d.channel === 'B2B') b2bYtd25 += v;



                    else if (d.channel === 'KR') krYtd25 += v;



                });







                // Helper to render YoY and YTD growth



                const setChanGrowth = (prefix, curVal, lyVal, ytdCur, ytdLy) => {



                    const elYoy = document.getElementById(prefix + '-yoy');



                    const elLy = document.getElementById(prefix + '-ly');



                    if (elYoy) {



                        if (lyVal > 0) {



                            const diff = curVal - lyVal;



                            const pct = (diff / lyVal * 100);



                            const sign = pct >= 0 ? '+' : '';



                            elYoy.innerText = sign + pct.toFixed(1) + '%';



                            elYoy.className = (pct >= 0 ? 'text-green-700' : 'text-red-600') + ' font-bold';



                            elYoy.style.color = pct >= 0 ? '#15803d' : '#dc2626';



                        } else {



                            elYoy.innerText = '--%';



                            elYoy.className = 'text-slate-400 font-bold';



                            elYoy.style.color = '';



                        }



                    }



                    if (elLy) {



                        elLy.innerText = getLyBenchmarkText(lyVal);



                        elLy.title = getLyBenchmarkTitle(lyVal);



                    }







                    const elYtd = document.getElementById(prefix + '-ytd');



                    const elYtdVal = document.getElementById(prefix + '-ytd-val');



                    if (elYtd) {



                        if (ytdLy > 0) {



                            const diffY = ytdCur - ytdLy;



                            const pctY = (diffY / ytdLy * 100);



                            const signY = pctY >= 0 ? '+' : '';



                            elYtd.innerText = signY + pctY.toFixed(1) + '%';



                            elYtd.className = (pctY >= 0 ? 'text-green-700' : 'text-red-600') + ' font-bold';



                            elYtd.style.color = pctY >= 0 ? '#15803d' : '#dc2626';



                        } else {



                            elYtd.innerText = '--%';



                            elYtd.className = 'text-slate-400 font-bold';



                            elYtd.style.color = '';



                        }



                    }



                    if (elYtdVal) {



                        elYtdVal.innerText = getYtdBenchmarkText(ytdCur);



                        elYtdVal.title = getYtdBenchmarkTitle(ytdCur);



                    }



                };







                // Helper to render MoM MTD for channels



                const setChanMom = (prefix, pct, priorVal) => {



                    const elMom = document.getElementById(prefix + '-mom');



                    const elLm = document.getElementById(prefix + '-lmmtd');



                    if (elMom && elLm) {



                        if (pct !== null) {



                            elMom.innerText = (pct >= 0 ? '+' : '') + pct.toFixed(1) + '%';



                            elMom.className = (pct >= 0 ? 'text-green-700' : 'text-red-600') + ' font-bold';



                            elMom.style.color = pct >= 0 ? '#15803d' : '#dc2626';



                            elLm.innerText = '(vs ' + priorMonthLabel + ': ' + formatBnVn(priorVal) + ')';



                            elLm.title = 'So sánh cùng kỳ từ ngày 1 đến ngày ' + maxDayInMonth + ' của ' + priorMonthLabel;



                        } else {



                            elMom.innerText = '--%';



                            elMom.className = 'text-slate-400 font-bold';



                            elMom.style.color = '';



                            elLm.innerText = '(N/A)';



                        }



                    }



                };







                // Card 5: GT
                const elChanGt = document.getElementById('dash-kpi-chan-gt');
                if (elChanGt) elChanGt.innerText = formatBnVn(gtSellin);
                const elChanGtShare = document.getElementById('dash-kpi-chan-gt-share');
                if (elChanGtShare) elChanGtShare.innerText = t('lbl_share') + ': ' + gtShare.toFixed(1) + '%';
                const elChanGtTarget = document.getElementById('dash-kpi-chan-gt-target');
                if (elChanGtTarget) {
                    if (gtTarget > 0) {
                        const achVal = (gtSellin / gtTarget * 100);
                        const achStyle = getTargetColorStyle(achVal);
                        elChanGtTarget.innerHTML = t('lbl_target') + ': ' + formatBnVn(gtTarget) + ' (<span style="' + achStyle + '">' + t('lbl_achv') + ' ' + achVal.toFixed(1) + '%</span>)';
                    } else {
                        elChanGtTarget.innerText = 'Target: N/A';
                    }
                }
                setChanGrowth('dash-kpi-chan-gt', gtSellin, gtSellinLY, gtYtd26, gtYtd25);
                setChanMom('dash-kpi-chan-gt', gtMomMtdPct, gtPriorMtd);

                // Card 6: MT
                const elChanMt = document.getElementById('dash-kpi-chan-mt');
                if (elChanMt) elChanMt.innerText = formatBnVn(mtSellin);
                const elChanMtShare = document.getElementById('dash-kpi-chan-mt-share');
                if (elChanMtShare) elChanMtShare.innerText = t('lbl_share') + ': ' + mtShare.toFixed(1) + '%';
                const elChanMtTarget = document.getElementById('dash-kpi-chan-mt-target');
                if (elChanMtTarget) {
                    if (mtTarget > 0) {
                        const achVal = (mtSellin / mtTarget * 100);
                        const achStyle = getTargetColorStyle(achVal);
                        elChanMtTarget.innerHTML = t('lbl_target') + ': ' + formatBnVn(mtTarget) + ' (<span style="' + achStyle + '">' + t('lbl_achv') + ' ' + achVal.toFixed(1) + '%</span>)';
                    } else {
                        elChanMtTarget.innerText = 'Target: N/A';
                    }
                }
                setChanGrowth('dash-kpi-chan-mt', mtSellin, mtSellinLY, mtYtd26, mtYtd25);
                setChanMom('dash-kpi-chan-mt', mtMomMtdPct, mtPriorMtd);

                // Card 7: B2B
                const elChanB2b = document.getElementById('dash-kpi-chan-b2b');
                if (elChanB2b) elChanB2b.innerText = formatBnVn(b2bSellin);
                const elChanB2bShare = document.getElementById('dash-kpi-chan-b2b-share');
                if (elChanB2bShare) elChanB2bShare.innerText = t('lbl_share') + ': ' + b2bShare.toFixed(1) + '%';
                const elChanB2bTarget = document.getElementById('dash-kpi-chan-b2b-target');
                if (elChanB2bTarget) {
                    if (b2bTarget > 0) {
                        const achVal = (b2bSellin / b2bTarget * 100);
                        const achStyle = getTargetColorStyle(achVal);
                        elChanB2bTarget.innerHTML = t('lbl_target') + ': ' + formatBnVn(b2bTarget) + ' (<span style="' + achStyle + '">' + t('lbl_achv') + ' ' + achVal.toFixed(1) + '%</span>)';
                    } else {
                        elChanB2bTarget.innerText = 'Target: N/A';
                    }
                }
                setChanGrowth('dash-kpi-chan-b2b', b2bSellin, b2bSellinLY, b2bYtd26, b2bYtd25);
                setChanMom('dash-kpi-chan-b2b', b2bMomMtdPct, b2bPriorMtd);

                // Card 8: KR
                const elChanKr = document.getElementById('dash-kpi-chan-kr');
                if (elChanKr) elChanKr.innerText = formatBnVn(krSellin);
                const elChanKrShare = document.getElementById('dash-kpi-chan-kr-share');
                if (elChanKrShare) elChanKrShare.innerText = t('lbl_share') + ': ' + krShare.toFixed(1) + '%';
                const elChanKrTarget = document.getElementById('dash-kpi-chan-kr-target');
                if (elChanKrTarget) {
                    if (krTarget > 0) {
                        const achVal = (krSellin / krTarget * 100);
                        const achStyle = getTargetColorStyle(achVal);
                        elChanKrTarget.innerHTML = t('lbl_target') + ': ' + formatBnVn(krTarget) + ' (<span style="' + achStyle + '">' + t('lbl_achv') + ' ' + achVal.toFixed(1) + '%</span>)';
                    } else {
                        elChanKrTarget.innerText = 'Target: N/A';
                    }
                }
                setChanGrowth('dash-kpi-chan-kr', krSellin, krSellinLY, krYtd26, krYtd25);
                setChanMom('dash-kpi-chan-kr', krMomMtdPct, krPriorMtd);

                renderDashDailyChart();



                renderDash12MonthsChart();







                renderProductTree(totalSellin2026);



                renderChannelTree(totalSellin2026);



                if (typeof TableCustomizer !== 'undefined') {



                    TableCustomizer.init('table-tree-prod');



                    TableCustomizer.init('table-tree-chan');



                }



            } catch (e) {



                console.error("Error in renderTabOverview:", e);



            }



        }







        function renderDashDailyChart() {



            try {



                const myChart = getOrInitChart('chart-dash-daily');



                if (!myChart) return;







                                const dailyList = (typeof DAILY_DATA !== 'undefined' && Array.isArray(DAILY_DATA))
                    ? DAILY_DATA
                    : (window.DAILY_DATA || (typeof _payloadCache !== 'undefined' && _payloadCache['DAILY_DATA']) || []);
                if (!Array.isArray(dailyList) || dailyList.length === 0) return;

                const daysMap = {};
                dailyList.filter(d => {



                    const dtStr = String(d.date_val || '');



                    if (!dtStr.startsWith(state.year)) return false;



                    const m = dtStr.substring(5, 7);



                    if (!state.selectedMonths.includes(m)) return false;



                    if (state.dashChannel !== 'ALL' && d.channel !== state.dashChannel) return false;



                    if (!matchProductRecord(d)) return false;



                    return true;



                }).forEach(d => {



                    const dt = String(d.date_val);



                    daysMap[dt] = (daysMap[dt] || 0) + (Number(d.daily_sellin) || 0);



                });







                const sortedDays = Object.keys(daysMap).sort();



                const dayLabels = sortedDays.map(d => d.substring(5));



                const vals = sortedDays.map(d => parseFloat(((daysMap[d] || 0) / 1e9).toFixed(2)));







                const channelLabel = state.dashChannel === 'ALL' ? (state.currentLang === 'ko' ? '4대 채널' : (state.currentLang === 'en' ? '4 Channels' : '4 Kênh')) : state.dashChannel;







                const option = {



                    legend: {



                        data: [t('chart_legend_daily_si') + ' (' + channelLabel + ') (B ₫)'],



                        top: 0,



                        textStyle: { color: '#FFFFFF', fontSize: 11.5, fontWeight: 'bold' }



                    },



                    dataZoom: getCommonChartZoom(3, 14),



                    grid: { top: 32, right: 25, bottom: 28, left: 52 },



                    tooltip: { 



                        trigger: 'axis',



                        formatter: function(params) {



                            const p = params[0];



                            return '<strong>Ngày: ' + p.name + '</strong><br/>Doanh số (' + channelLabel + '): <strong>' + p.value + ' B ₫</strong>';



                        }



                    },



                    xAxis: {



                        type: 'category',



                        data: dayLabels.length > 0 ? dayLabels : ['01','05','10','15','20','25','30'],



                        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.4)', width: 1.5 } },



                        axisLabel: { color: '#FFFFFF', fontSize: 9.5, fontWeight: 'bold' }



                    },



                    yAxis: {



                        type: 'value',



                        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.18)', type: 'dashed' } },



                        axisLabel: { color: '#FFFFFF', fontSize: 9.5, fontWeight: 'bold', formatter: '{value}B' }



                    },



                    series: [{



                        name: t('chart_legend_daily_si') + ' (' + channelLabel + ') (B ₫)',



                        data: vals.length > 0 ? vals : [1.2, 2.5, 1.8, 3.2, 2.1, 4.0, 3.5],



                        type: 'line',



                        smooth: true,



                        lineStyle: { width: 3, color: '#38BDF8' },



                        itemStyle: { color: '#FFFFFF', borderColor: '#38BDF8', borderWidth: 2 },



                        label: {



                            show: true,



                            position: 'top',



                            color: '#FFFFFF',



                            fontSize: 10,



                            fontWeight: 'bold',



                            textBorderColor: '#0F172A',



                            textBorderWidth: 3,



                            formatter: function(p) { return p.value > 0 ? p.value + 'B' : ''; }



                        },



                        areaStyle: {



                            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [



                                { offset: 0, color: 'rgba(56, 189, 248, 0.45)' },



                                { offset: 1, color: 'rgba(56, 189, 248, 0.02)' }



                            ])



                        }



                    }]



                };



                myChart.setOption(option);



                myChart.resize();



            } catch (e) { console.error("Error in renderDashDailyChart:", e); }



        }







        



        function getMonthLabels() {



            return Array.from({length: 12}, (_, i) => {



                const m = i + 1;



                if (state.currentLang === 'ko') return m + '월';



                if (state.currentLang === 'en') return 'M' + m;



                return 'T' + m;



            });



        }







        function renderDash12MonthsChart() {



            try {



                const myChart = getOrInitChart('chart-dash-months');



                if (!myChart) return;







                const months = getMonthLabels();



                



                const filter12M = (d, yearVal, mNum) => {



                    if (d.year !== yearVal || d.month_num !== mNum) return false;



                    if (state.dashChannel !== 'ALL' && d.channel !== state.dashChannel) return false;



                    if (state.dashSubChannel !== 'ALL' && d.sub_channel !== state.dashSubChannel) return false;



                    if (state.dashAccount !== 'ALL' && d.account_name !== state.dashAccount && d.account_code !== state.dashAccount) return false;



                    if (state.prodStorage !== 'ALL' && d.storage !== state.prodStorage) return false;



                    if (state.prodCate !== 'ALL' && d.cate !== state.prodCate) return false;



                    if (state.prodPh1 !== 'ALL' && d.ph1 !== state.prodPh1) return false;



                    if (state.prodPh2 !== 'ALL' && d.ph2 !== state.prodPh2) return false;
                    if (state.prodSku !== 'ALL' && (d.sku_name || d.sku) && (d.sku_name || d.sku) !== state.prodSku) return false;



                    return true;



                };







                const sellinList = (typeof SELLIN_M !== 'undefined' && Array.isArray(SELLIN_M))
                    ? SELLIN_M
                    : (window.SELLIN_M || (typeof _payloadCache !== 'undefined' && _payloadCache['SELLIN_M']) || []);
                const chanTreeList = (typeof CHAN_TREE !== 'undefined' && Array.isArray(CHAN_TREE))
                    ? CHAN_TREE
                    : (window.CHAN_TREE || (typeof _payloadCache !== 'undefined' && _payloadCache['CHAN_TREE']) || []);
                const is12mProdFiltered = (state.prodStorage !== 'ALL' || state.prodCate !== 'ALL' || state.prodPh1 !== 'ALL' || state.prodPh2 !== 'ALL' || state.prodSku !== 'ALL');
                const sellin12mSource = (!is12mProdFiltered && chanTreeList.length > 0) ? chanTreeList : sellinList;

                const data2025 = months.map((m, idx) => {
                    const mNum = (idx + 1).toString().padStart(2, '0');
                    const items = sellin12mSource.filter(d => filter12M(d, '2025', mNum));
                    let s = 0; items.forEach(i => s += (Number(i.sellin_val) || 0));
                    return parseFloat((s / 1e9).toFixed(2));
                });

                const data2026 = months.map((m, idx) => {
                    const mNum = (idx + 1).toString().padStart(2, '0');
                    const items = sellin12mSource.filter(d => filter12M(d, '2026', mNum));



                    let s = 0; items.forEach(i => s += (Number(i.sellin_val) || 0));



                    return s > 0 ? parseFloat((s / 1e9).toFixed(2)) : '-';



                });







                const option = {



                    legend: {



                        data: [t('chart_legend_2025'), t('chart_legend_2026')],



                        top: 0,



                        textStyle: { color: '#FFFFFF', fontSize: 11.5, fontWeight: 'bold' }



                    },



                    dataZoom: getCommonChartZoom(3, 14),



                    tooltip: { trigger: 'axis' },



                    grid: { top: 35, right: 20, bottom: 28, left: 52 },



                    xAxis: {



                        type: 'category',



                        data: months,



                        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.4)', width: 1.5 } },



                        axisLabel: { color: '#FFFFFF', fontSize: 10, fontWeight: 'bold' }



                    },



                    yAxis: {



                        type: 'value',



                        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.18)', type: 'dashed' } },



                        axisLabel: { color: '#FFFFFF', fontSize: 9.5, fontWeight: 'bold', formatter: '{value}B' }



                    },



                    series: [



                        {



                            name: t('chart_legend_2025'),



                            type: 'bar',



                            data: data2025,



                            barMaxWidth: 13,



                            itemStyle: { color: 'rgba(255,255,255,0.35)', borderRadius: [3, 3, 0, 0] },



                            label: {



                                show: true,



                                position: 'top',



                                color: '#E2E8F0',



                                fontSize: 9,



                                fontWeight: 'bold',



                                textBorderColor: '#0F172A',



                                textBorderWidth: 2.5,



                                formatter: function(p) { return (p.value && p.value !== '-' && p.value > 0) ? p.value + 'B' : ''; }



                            }



                        },



                        {



                            name: t('chart_legend_2026'),



                            type: 'bar',



                            data: data2026,



                            barMaxWidth: 15,



                            itemStyle: { color: '#FDE047', borderRadius: [4, 4, 0, 0] },



                            label: {



                                show: true,



                                position: 'top',



                                color: '#FFFFFF',



                                fontSize: 10.5,



                                fontWeight: 'bold',



                                textBorderColor: '#78350F',



                                textBorderWidth: 3,



                                formatter: function(p) { return (p.value && p.value !== '-' && p.value > 0) ? p.value + 'B' : ''; }



                            }



                        }



                    ]



                };



                myChart.setOption(option);



                myChart.resize();



            } catch (e) { console.error("Error in renderDash12MonthsChart:", e); }



        }







        function toggleTreeNode(rawId) {



            if (!rawId) return;



            const nodeId = decodeURIComponent(rawId);



            if (openNodes.has(nodeId)) openNodes.delete(nodeId);



            else openNodes.add(nodeId);



            



            if (state.activeTab === 'tab-overview') {



                renderProductTree();



                renderChannelTree();



            } else if (state.activeTab === 'tab-gt') {



                renderGtTree();



                renderChannelProductTree('GT', 'tbody-tree-prod-gt');



            } else if (state.activeTab === 'tab-mt') {



                renderMtTree();



                renderChannelProductTree('MT', 'tbody-tree-prod-mt');



            } else if (state.activeTab === 'tab-b2b') {



                renderTabB2b();



                renderChannelProductTree('B2B', 'tbody-tree-prod-b2b');



            } else if (state.activeTab === 'tab-kr') {



                renderTabKr();



                renderChannelProductTree('KR', 'tbody-tree-prod-kr');



            }



        }







        function toggleAllChannelProductNodes(channel, tbodyId) {



            const prefix = 'prod_' + channel.toLowerCase() + '_';



            let anyOpen = false;



            openNodes.forEach(id => {



                if (id.startsWith(prefix) && id.includes('_', prefix.length)) anyOpen = true;



            });







            if (anyOpen) {



                openNodes.forEach(id => {



                    if (id.startsWith(prefix)) openNodes.delete(id);



                });



                [prefix + 'Ambient', prefix + 'Chilled', prefix + 'Frozen'].forEach(id => openNodes.add(id));



            } else {



                if (typeof SELLIN_M !== 'undefined' && Array.isArray(SELLIN_M)) {



                    SELLIN_M.filter(d => d.channel === channel).forEach(d => {



                        const sId = prefix + (d.storage || 'Ambient');



                        const cId = sId + '_' + (d.cate || 'Other Category');



                        const p1Id = cId + '_' + (d.ph1 || 'Other PH1');



                        openNodes.add(sId);



                        openNodes.add(cId);



                        openNodes.add(p1Id);



                    });



                }



            }



            renderChannelProductTree(channel, tbodyId);



        }







        function toggleAllProductGtNodes() { toggleAllChannelProductNodes('GT', 'tbody-tree-prod-gt'); }



        function toggleAllProductMtNodes() { toggleAllChannelProductNodes('MT', 'tbody-tree-prod-mt'); }



        function toggleAllProductB2bNodes() { toggleAllChannelProductNodes('B2B', 'tbody-tree-prod-b2b'); }



        function toggleAllProductKrNodes() { toggleAllChannelProductNodes('KR', 'tbody-tree-prod-kr'); }







        function renderChannelProductTree(channel, tbodyId, inputTotalSellin) {



            try {



                const tbody = document.getElementById(tbodyId);



                if (!tbody) return;







                const allowedNppCodes = new Set();



                if (channel === 'GT' && typeof DIM_GEO_HIER !== 'undefined' && Array.isArray(DIM_GEO_HIER)) {



                    DIM_GEO_HIER.forEach(g => {



                        if (state.geoMien !== 'ALL' && g.mien !== state.geoMien) return;



                        if (state.geoVung !== 'ALL' && g.vung !== state.geoVung) return;
                        if (state.geoArea && state.geoArea !== 'ALL' && (typeof matchAreaRecord === 'function' ? !matchAreaRecord(g, state.geoArea) : g.area !== state.geoArea)) return;



                        if (state.geoGsbh !== 'ALL' && (typeof matchGsbhRecord === 'function' ? !matchGsbhRecord(g, state.geoGsbh) : g.gsbh !== state.geoGsbh)) return;



                        if (state.geoNpp !== 'ALL' && g.npp_code !== state.geoNpp) return;



                        if (g.npp_code) allowedNppCodes.add(g.npp_code);



                    });



                }







                const validPh1s = getValidPh1SetForCurrentFilter();



                const data = SELLIN_M.filter(d => {



                    if (d.channel !== channel) return false;



                    if (d.year !== state.year) return false;



                    if (!state.selectedMonths.includes(d.month_num)) return false;



                    if (channel === 'GT') {



                        if (state.geoNpp !== 'ALL') {



                            if (d.account_code !== state.geoNpp) return false;



                        } else if (state.geoGsbh !== 'ALL' || (state.geoArea && state.geoArea !== 'ALL') || state.geoVung !== 'ALL' || state.geoMien !== 'ALL') {



                            if (state.geoMien !== 'ALL' && d.mien !== state.geoMien && !allowedNppCodes.has(d.account_code)) return false;



                            if (state.geoVung !== 'ALL' && d.cluster !== state.geoVung && !allowedNppCodes.has(d.account_code)) return false;



                            if (state.geoGsbh !== 'ALL' && (typeof matchGsbhRecord === 'function' ? !matchGsbhRecord(d, state.geoGsbh) : d.gsbh !== state.geoGsbh) && !allowedNppCodes.has(d.account_code)) return false;



                        }



                    } else if (channel === 'MT') {



                        if (state.mtSubChan !== 'ALL' && d.sub_channel !== state.mtSubChan) return false;



                        if (state.mtChain !== 'ALL' && d.account_name !== state.mtChain) return false;



                    } else if (channel === 'B2B') {



                        if (state.b2bAcc !== 'ALL' && d.account_code !== state.b2bAcc) return false;



                        if (state.b2bCust !== 'ALL' && d.account_name !== state.b2bCust) return false;



                    } else if (channel === 'KR') {



                        if (state.krSubChan !== 'ALL' && d.sub_channel !== state.krSubChan) return false;



                        if (state.krChain !== 'ALL' && d.account_name !== state.krChain) return false;



                    }



                    if (!matchProductRecord(d)) return false;



                    return true;



                });







                let totalSellin = inputTotalSellin;



                if (!totalSellin || totalSellin <= 0) {



                    totalSellin = 0;



                    data.forEach(d => totalSellin += (Number(d.sellin_val) || 0));



                }







                // Dữ liệu cùng kỳ năm ngoái (LY) để tính YoY



                const lyDataMap = {};



                SELLIN_M.filter(d => {



                    if (d.channel !== channel) return false;



                    if (d.year !== (parseInt(state.year) - 1).toString()) return false;



                    if (!state.selectedMonths.includes(d.month_num)) return false;



                    if (state.prodStorage !== 'ALL' && d.storage !== state.prodStorage) return false;



                    if (state.prodCate !== 'ALL' && d.cate !== state.prodCate) return false;



                    if (state.prodPh1 !== 'ALL' && d.ph1 !== state.prodPh1) return false;



                    if (state.prodPh2 !== 'ALL' && d.ph2 !== state.prodPh2) return false;
                    if (state.prodSku !== 'ALL' && (d.sku_name || d.sku) && (d.sku_name || d.sku) !== state.prodSku) return false;



                    return true;



                }).forEach(d => {



                    const s = d.storage || 'Ambient';



                    const c = d.cate || 'Other Category';



                    const p1 = d.ph1 || 'Other PH1';



                    const p2 = d.ph2 || 'Other PH2';



                    const v = Number(d.sellin_val) || 0;



                    lyDataMap[s] = (lyDataMap[s] || 0) + v;



                    lyDataMap[s + '_' + c] = (lyDataMap[s + '_' + c] || 0) + v;



                    lyDataMap[s + '_' + c + '_' + p1] = (lyDataMap[s + '_' + c + '_' + p1] || 0) + v;



                    lyDataMap[s + '_' + c + '_' + p1 + '_' + p2] = (lyDataMap[s + '_' + c + '_' + p1 + '_' + p2] || 0) + v;



                });







                // Bản đồ ph1 -> cate



                const ph1ToCateMap = {};



                if (typeof DIM_PROD_HIER !== 'undefined' && Array.isArray(DIM_PROD_HIER)) {



                    DIM_PROD_HIER.forEach(p => {



                        if (p.ph1) {



                            const kSp = ((p.storage || '') + '_' + p.ph1).trim().toLowerCase();



                            const kP = p.ph1.trim().toLowerCase();



                            if (p.cate) {



                                ph1ToCateMap[kSp] = p.cate;



                                if (!ph1ToCateMap[kP]) ph1ToCateMap[kP] = p.cate;



                            }



                        }



                    });



                }



                if (typeof SELLIN_M !== 'undefined' && Array.isArray(SELLIN_M)) {



                    SELLIN_M.forEach(p => {



                        if (p.ph1 && p.cate) {



                            const kSp = ((p.storage || '') + '_' + p.ph1).trim().toLowerCase();



                            const kP = p.ph1.trim().toLowerCase();



                            if (!ph1ToCateMap[kSp]) ph1ToCateMap[kSp] = p.cate;



                            if (!ph1ToCateMap[kP]) ph1ToCateMap[kP] = p.cate;



                        }



                    });



                }







                const tree = {};



                data.forEach(d => {



                    const s = d.storage || 'Ambient';



                    const c = d.cate || 'Other Category';



                    const p1 = d.ph1 || 'Other PH1';



                    const p2 = d.ph2 || 'Other PH2';



                    const v = Number(d.sellin_val) || 0;







                    if (!tree[s]) tree[s] = { val: 0, children: {} };



                    tree[s].val += v;







                    if (!tree[s].children[c]) tree[s].children[c] = { val: 0, children: {} };



                    tree[s].children[c].val += v;







                    if (!tree[s].children[c].children[p1]) tree[s].children[c].children[p1] = { val: 0, children: {} };



                    tree[s].children[c].children[p1].val += v;







                    if (!tree[s].children[c].children[p1].children[p2]) tree[s].children[c].children[p1].children[p2] = { val: 0 };



                    tree[s].children[c].children[p1].children[p2].val += v;



                });







                // Map Sell-out theo cấp Sản phẩm cho Kênh GT



                const gtSoMap = {};



                if (channel === 'GT' && typeof GT_TREE !== 'undefined' && Array.isArray(GT_TREE)) {



                    GT_TREE.filter(d => {



                        if (d.year !== state.year) return false;



                        if (!state.selectedMonths.includes(d.month_num)) return false;



                        if (state.geoMien !== 'ALL' && d.mien !== state.geoMien) return false;



                        if (state.geoVung !== 'ALL' && d.vung !== state.geoVung) return false;



                        if (state.geoArea && state.geoArea !== 'ALL' && (typeof matchAreaRecord === 'function' ? !matchAreaRecord(d, state.geoArea) : false)) return false;
                        if (state.geoGsbh !== 'ALL' && (typeof matchGsbhRecord === 'function' ? !matchGsbhRecord(d, state.geoGsbh) : (d.office || d.gsbh_name) !== state.geoGsbh)) return false;



                        if (state.geoNpp !== 'ALL' && d.npp_code !== state.geoNpp) return false;



                        if (state.prodStorage !== 'ALL' && d.storage !== state.prodStorage) return false;



                        if (state.prodCate !== 'ALL' && d.cate !== state.prodCate) return false;



                        if (state.prodPh1 !== 'ALL' && d.ph1 !== state.prodPh1) return false;



                        if (state.prodPh2 !== 'ALL' && d.ph2 !== state.prodPh2) return false;
                    if (state.prodSku !== 'ALL' && (d.sku_name || d.sku) && (d.sku_name || d.sku) !== state.prodSku) return false;



                        return true;



                    }).forEach(d => {



                        const s = d.storage || 'Ambient';



                        const c = d.cate || 'Other Category';



                        const p1 = d.ph1 || 'Other PH1';



                        const p2 = d.ph2 || 'Other PH2';



                        const so = Number(d.sellout_val) || 0;







                        gtSoMap[s] = (gtSoMap[s] || 0) + so;



                        gtSoMap[s + '_' + c] = (gtSoMap[s + '_' + c] || 0) + so;



                        gtSoMap[s + '_' + c + '_' + p1] = (gtSoMap[s + '_' + c + '_' + p1] || 0) + so;



                        gtSoMap[s + '_' + c + '_' + p1 + '_' + p2] = (gtSoMap[s + '_' + c + '_' + p1 + '_' + p2] || 0) + so;



                    });



                }







                // Map Sell-in YTD & Sell-out YTD cho Kênh GT



                const siYtd2026Map = {};



                const siYtd2025Map = {};



                const soYtd2026Map = {};



                const soYtd2025Map = {};







                if (channel === 'GT') {



                    const ytdMonths = getYtdMonths();



                    const lyYear = (parseInt(state.year) - 1).toString();







                    SELLIN_M.filter(d => {



                        if (d.channel !== 'GT') return false;



                        if (!ytdMonths.includes(d.month_num)) return false;



                        if (d.year !== state.year && d.year !== lyYear) return false;



                        if (state.geoNpp !== 'ALL') {



                            if (d.account_code !== state.geoNpp) return false;



                        } else if (state.geoGsbh !== 'ALL' || (state.geoArea && state.geoArea !== 'ALL') || state.geoVung !== 'ALL' || state.geoMien !== 'ALL') {



                            if (state.geoMien !== 'ALL' && d.mien !== state.geoMien && !allowedNppCodes.has(d.account_code)) return false;



                            if (state.geoVung !== 'ALL' && d.cluster !== state.geoVung && !allowedNppCodes.has(d.account_code)) return false;



                            if (state.geoGsbh !== 'ALL' && (typeof matchGsbhRecord === 'function' ? !matchGsbhRecord(d, state.geoGsbh) : d.gsbh !== state.geoGsbh) && !allowedNppCodes.has(d.account_code)) return false;



                        }



                        if (!matchProductRecord(d)) return false;



                        return true;



                    }).forEach(d => {



                        const s = d.storage || 'Ambient';



                        const c = d.cate || 'Other Category';



                        const p1 = d.ph1 || 'Other PH1';



                        const p2 = d.ph2 || 'Other PH2';



                        const v = Number(d.sellin_val) || 0;



                        const trg = (d.year === state.year) ? siYtd2026Map : siYtd2025Map;







                        trg[s] = (trg[s] || 0) + v;



                        trg[s + '_' + c] = (trg[s + '_' + c] || 0) + v;



                        trg[s + '_' + c + '_' + p1] = (trg[s + '_' + c + '_' + p1] || 0) + v;



                        trg[s + '_' + c + '_' + p1 + '_' + p2] = (trg[s + '_' + c + '_' + p1 + '_' + p2] || 0) + v;



                    });







                    if (typeof GT_TREE !== 'undefined' && Array.isArray(GT_TREE)) {



                        GT_TREE.filter(d => {



                            if (!ytdMonths.includes(d.month_num)) return false;



                            if (d.year !== state.year && d.year !== lyYear) return false;



                            if (state.geoMien !== 'ALL' && d.mien !== state.geoMien) return false;



                            if (state.geoVung !== 'ALL' && d.vung !== state.geoVung) return false;



                            if (state.geoArea && state.geoArea !== 'ALL' && (typeof matchAreaRecord === 'function' ? !matchAreaRecord(d, state.geoArea) : false)) return false;
                        if (state.geoGsbh !== 'ALL' && (typeof matchGsbhRecord === 'function' ? !matchGsbhRecord(d, state.geoGsbh) : d.gsbh_name !== state.geoGsbh)) return false;



                            if (state.geoNpp !== 'ALL' && d.npp_code !== state.geoNpp) return false;



                            if (state.prodStorage !== 'ALL' && d.storage !== state.prodStorage) return false;



                            if (state.prodCate !== 'ALL' && d.cate !== state.prodCate) return false;



                            if (state.prodPh1 !== 'ALL' && d.ph1 !== state.prodPh1) return false;



                            if (state.prodPh2 !== 'ALL' && d.ph2 !== state.prodPh2) return false;
                    if (state.prodSku !== 'ALL' && (d.sku_name || d.sku) && (d.sku_name || d.sku) !== state.prodSku) return false;



                            return true;



                        }).forEach(d => {



                            const s = d.storage || 'Ambient';



                            const c = d.cate || 'Other Category';



                            const p1 = d.ph1 || 'Other PH1';



                            const p2 = d.ph2 || 'Other PH2';



                            const so = Number(d.sellout_val) || 0;



                            const trg = (d.year === state.year) ? soYtd2026Map : soYtd2025Map;







                            trg[s] = (trg[s] || 0) + so;



                            trg[s + '_' + c] = (trg[s + '_' + c] || 0) + so;



                            trg[s + '_' + c + '_' + p1] = (trg[s + '_' + c + '_' + p1] || 0) + so;



                            trg[s + '_' + c + '_' + p1 + '_' + p2] = (trg[s + '_' + c + '_' + p1 + '_' + p2] || 0) + so;



                        });



                    }



                }







                // Target Sell-in Map cho kênh đang xem



                const prodStorageTargetMap = {};



                const prodCateTargetMap = {};



                const prodPh1TargetMap = {};







                if (typeof TARGET_SELLIN !== 'undefined' && Array.isArray(TARGET_SELLIN)) {



                    TARGET_SELLIN.filter(d => {



                        if (d.channel !== channel) return false;



                        if (d.year !== state.year || !state.selectedMonths.includes(d.month.substring(5, 7))) return false;



                        if (!matchProductTarget(d, validPh1s)) return false;



                        if (channel === 'GT') {



                            if (state.geoNpp !== 'ALL' && d.distributor_code !== state.geoNpp && d.account_npp !== state.geoNpp) return false;



                        } else if (channel === 'MT') {



                            if (state.mtSubChan !== 'ALL' && d.sub_channel && d.sub_channel !== state.mtSubChan) return false;



                            if (state.mtChain !== 'ALL' && d.account_npp && d.account_npp !== state.mtChain) return false;



                        } else if (channel === 'B2B') {



                            if (state.b2bAcc !== 'ALL') {



                                const accMatch = (d.account_npp && d.account_npp.toLowerCase().trim() === state.b2bAcc.toLowerCase().trim()) ||



                                                 (d.sub_channel && d.sub_channel.toLowerCase().trim() === state.b2bAcc.toLowerCase().trim()) ||



                                                 (d.distributor_code && d.distributor_code.toLowerCase().trim() === state.b2bAcc.toLowerCase().trim());



                                if (!accMatch) return false;



                            }



                        } else if (channel === 'KR') {



                            if (state.krChain !== 'ALL' && d.account_npp && d.account_npp !== state.krChain) return false;



                        }



                        return true;



                    }).forEach(d => {



                        const s = d.storage || 'Ambient';



                        const p1 = d.ph1 || 'Other PH1';



                        const c = ph1ToCateMap[((s + '_' + p1).toLowerCase())] || ph1ToCateMap[p1.toLowerCase()] || 'Other Category';



                        const tgt = Number(d.target_amt) || 0;







                        if (!tree[s]) tree[s] = { val: 0, children: {} };



                        if (!tree[s].children[c]) tree[s].children[c] = { val: 0, children: {} };



                        if (!tree[s].children[c].children[p1]) tree[s].children[c].children[p1] = { val: 0, children: {} };







                        prodStorageTargetMap[s] = (prodStorageTargetMap[s] || 0) + tgt;



                        prodCateTargetMap[s + '_' + c] = (prodCateTargetMap[s + '_' + c] || 0) + tgt;



                        prodPh1TargetMap[s + '_' + c + '_' + p1] = (prodPh1TargetMap[s + '_' + c + '_' + p1] || 0) + tgt;



                        prodPh1TargetMap[s + '_' + p1] = (prodPh1TargetMap[s + '_' + p1] || 0) + tgt;



                    });



                }







                const prefix = 'prod_' + channel.toLowerCase() + '_';



                const htmlRows = [];







                Object.keys(tree).sort().forEach(storage => {



                    const sId = prefix + storage;



                    const sOpen = openNodes.has(sId);



                    const sVal = tree[storage].val;



                    const sTarget = prodStorageTargetMap[storage] || 0;



                    const sShare = totalSellin > 0 ? (sVal / totalSellin) * 100 : 0;



                    const sLy = lyDataMap[storage] || 0;







                    let storageRowClass = 'tree-row-total tree-row-storage-other bg-slate-200/90 text-slate-950 border-y-2 border-slate-400 font-black hover:bg-slate-300 transition-colors shadow-2xs';



                    let toggleBtnClass = 'bg-slate-600 text-white font-black';



                    let storageBadge = '📦';



                    let numColor = 'text-slate-950 font-black';







                    if (storage === 'Ambient') {



                        storageRowClass = 'tree-row-total tree-row-ambient bg-amber-100/95 text-amber-950 border-y-2 border-amber-400 font-black hover:bg-amber-200/80 transition-colors shadow-2xs';



                        toggleBtnClass = 'bg-amber-600 text-white font-black';



                        storageBadge = '🌾';



                        numColor = 'text-amber-950 font-black';



                    } else if (storage === 'Chilled') {



                        storageRowClass = 'tree-row-total tree-row-chilled bg-cyan-100/95 text-cyan-950 border-y-2 border-cyan-400 font-black hover:bg-cyan-200/80 transition-colors shadow-2xs';



                        toggleBtnClass = 'bg-cyan-600 text-white font-black';



                        storageBadge = '🥗';



                        numColor = 'text-cyan-950 font-black';



                    } else if (storage === 'Frozen') {



                        storageRowClass = 'tree-row-total tree-row-frozen bg-blue-100/95 text-blue-950 border-y-2 border-blue-400 font-black hover:bg-blue-200/80 transition-colors shadow-2xs';



                        toggleBtnClass = 'bg-blue-600 text-white font-black';



                        storageBadge = '❄️';



                        numColor = 'text-blue-950 font-black';



                    }







                    let rowHtml = '<tr class="' + storageRowClass + '" data-level="0">';



                    rowHtml += '<td class="tree-lvl-1 cursor-pointer select-none py-2" onclick="toggleTreeNode(&quot;' + encodeURIComponent(sId) + '&quot;)" title="' + escapeAttr(storage) + '"><div class="flex items-center min-w-0 w-full"><span class="tree-toggle ' + toggleBtnClass + ' flex-shrink-0 mr-1.5 shadow-2xs">' + (sOpen ? '−' : '+') + '</span><span class="mr-1 text-[11px]">' + storageBadge + '</span><span class="text-xs font-black uppercase tracking-wide truncate block min-w-0 flex-1">' + storage + '</span></div></td>';



                    rowHtml += '<td class="text-right font-mono-num font-black ' + numColor + ' text-xs" title="' + formatExactVND(sVal) + '">' + formatVND(sVal) + '</td>';



                    rowHtml += '<td class="text-right font-mono-num font-black ' + numColor + ' text-xs" title="' + formatExactVND(sTarget) + '">' + (sTarget > 0 ? formatVND(sTarget) : '-') + '</td>';



                    const sSo = gtSoMap[storage] || 0;



                    const sSiYtd = siYtd2026Map[storage] || 0;



                    const sSiLyYtd = siYtd2025Map[storage] || 0;



                    const sSoYtd = soYtd2026Map[storage] || 0;



                    const sSoLyYtd = soYtd2025Map[storage] || 0;



                    rowHtml += '<td class="text-right font-mono-num">' + formatAchieveBadge(sVal, sTarget) + '</td>';



                    if (channel === 'GT') {



                        rowHtml += '<td class="text-right font-mono-num font-black text-sky-900 text-xs" title="' + formatExactVND(sSiYtd) + '">' + (sSiYtd > 0 ? formatVND(sSiYtd) : '-') + '</td>';



                        rowHtml += '<td class="text-right font-mono-num font-bold">' + formatTreeYoy(sSiYtd, sSiLyYtd) + '</td>';



                        rowHtml += '<td class="text-right font-mono-num font-black text-emerald-900 text-xs" title="' + formatExactVND(sSo) + '">' + (sSo > 0 ? formatVND(sSo) : '-') + '</td>';



                        rowHtml += '<td class="text-right font-mono-num font-black text-emerald-950 text-xs" title="' + formatExactVND(sSoYtd) + '">' + (sSoYtd > 0 ? formatVND(sSoYtd) : '-') + '</td>';



                        rowHtml += '<td class="text-right font-mono-num font-bold">' + formatTreeYoy(sSoYtd, sSoLyYtd) + '</td>';



                    }



                    rowHtml += '<td class="text-right font-mono-num font-black ' + numColor + ' text-xs">' + sShare.toFixed(1) + '%</td>';



                    rowHtml += '<td class="text-right font-mono-num font-black text-xs">' + formatTreeYoy(sVal, sLy) + '</td>';



                    rowHtml += '</tr>';



                    htmlRows.push(rowHtml);







                    if (sOpen) {



                        const cateObj = (tree[storage] && tree[storage].children) || {};



                        Object.keys(cateObj).sort().forEach(cate => {



                            const cId = sId + '_' + cate;



                            const cOpen = openNodes.has(cId);



                            const cVal = cateObj[cate].val;



                            const cTarget = prodCateTargetMap[storage + '_' + cate] || 0;



                            const cShare = totalSellin > 0 ? (cVal / totalSellin) * 100 : 0;



                            const cLy = lyDataMap[storage + '_' + cate] || 0;







                            let cRow = '<tr class="bg-slate-100/90 font-bold border-b border-slate-200 text-slate-800 hover:bg-slate-200/70 transition-colors" data-level="1">';



                            cRow += '<td class="tree-lvl-2 cursor-pointer select-none" onclick="toggleTreeNode(&quot;' + encodeURIComponent(cId) + '&quot;)" title="' + escapeAttr(cate) + '"><div class="flex items-center min-w-0 w-full"><span class="tree-toggle font-bold flex-shrink-0 mr-1.5">' + (cOpen ? '−' : '+') + '</span><span class="text-slate-800 font-bold truncate block min-w-0 flex-1">' + cate + '</span></div></td>';



                            cRow += '<td class="text-right font-mono-num font-bold text-slate-700" title="' + formatExactVND(cVal) + '">' + formatVND(cVal) + '</td>';



                            cRow += '<td class="text-right font-mono-num font-bold text-slate-700" title="' + formatExactVND(cTarget) + '">' + (cTarget > 0 ? formatVND(cTarget) : '-') + '</td>';



                            const cSo = gtSoMap[storage + '_' + cate] || 0;



                            const cSiYtd = siYtd2026Map[storage + '_' + cate] || 0;



                            const cSiLyYtd = siYtd2025Map[storage + '_' + cate] || 0;



                            const cSoYtd = soYtd2026Map[storage + '_' + cate] || 0;



                            const cSoLyYtd = soYtd2025Map[storage + '_' + cate] || 0;



                            cRow += '<td class="text-right font-mono-num">' + formatAchieveBadge(cVal, cTarget) + '</td>';



                            if (channel === 'GT') {



                                cRow += '<td class="text-right font-mono-num font-bold text-sky-800" title="' + formatExactVND(cSiYtd) + '">' + (cSiYtd > 0 ? formatVND(cSiYtd) : '-') + '</td>';



                                cRow += '<td class="text-right font-mono-num">' + formatTreeYoy(cSiYtd, cSiLyYtd) + '</td>';



                                cRow += '<td class="text-right font-mono-num font-bold text-emerald-700" title="' + formatExactVND(cSo) + '">' + (cSo > 0 ? formatVND(cSo) : '-') + '</td>';



                                cRow += '<td class="text-right font-mono-num font-bold text-emerald-800" title="' + formatExactVND(cSoYtd) + '">' + (cSoYtd > 0 ? formatVND(cSoYtd) : '-') + '</td>';



                                cRow += '<td class="text-right font-mono-num">' + formatTreeYoy(cSoYtd, cSoLyYtd) + '</td>';



                            }



                            cRow += '<td class="text-right font-mono-num text-slate-600">' + cShare.toFixed(1) + '%</td>';



                            cRow += '<td class="text-right font-mono-num">' + formatTreeYoy(cVal, cLy) + '</td>';



                            cRow += '</tr>';



                            htmlRows.push(cRow);







                            if (cOpen) {



                                const ph1Obj = (cateObj[cate] && cateObj[cate].children) || {};



                                Object.keys(ph1Obj).sort().forEach(ph1 => {



                                    const p1Id = cId + '_' + ph1;



                                    const p1Open = openNodes.has(p1Id);



                                    const p1Val = ph1Obj[ph1].val;



                                    const p1Target = prodPh1TargetMap[storage + '_' + cate + '_' + ph1] || prodPh1TargetMap[storage + '_' + ph1] || 0;



                                    const p1Share = totalSellin > 0 ? (p1Val / totalSellin) * 100 : 0;



                                    const p1Ly = lyDataMap[storage + '_' + cate + '_' + ph1] || 0;







                                    let p1Row = '<tr class="bg-white hover:bg-slate-50 border-b border-slate-100 transition-colors" data-level="2">';



                                    p1Row += '<td class="tree-lvl-3 cursor-pointer select-none" onclick="toggleTreeNode(&quot;' + encodeURIComponent(p1Id) + '&quot;)" title="' + escapeAttr(ph1) + '"><div class="flex items-center min-w-0 w-full"><span class="tree-toggle font-bold flex-shrink-0 mr-1.5">' + (p1Open ? '−' : '+') + '</span><span class="text-slate-700 font-medium truncate block min-w-0 flex-1">' + ph1 + '</span></div></td>';



                                    p1Row += '<td class="text-right font-mono-num text-slate-700" title="' + formatExactVND(p1Val) + '">' + formatVND(p1Val) + '</td>';



                                    p1Row += '<td class="text-right font-mono-num font-bold text-slate-700" title="' + formatExactVND(p1Target) + '">' + (p1Target > 0 ? formatVND(p1Target) : '-') + '</td>';



                                    const p1So = gtSoMap[storage + '_' + cate + '_' + ph1] || 0;



                                    const p1SiYtd = siYtd2026Map[storage + '_' + cate + '_' + ph1] || 0;



                                    const p1SiLyYtd = siYtd2025Map[storage + '_' + cate + '_' + ph1] || 0;



                                    const p1SoYtd = soYtd2026Map[storage + '_' + cate + '_' + ph1] || 0;



                                    const p1SoLyYtd = soYtd2025Map[storage + '_' + cate + '_' + ph1] || 0;



                                    p1Row += '<td class="text-right font-mono-num">' + formatAchieveBadge(p1Val, p1Target) + '</td>';



                                    if (channel === 'GT') {



                                        p1Row += '<td class="text-right font-mono-num font-bold text-sky-800" title="' + formatExactVND(p1SiYtd) + '">' + (p1SiYtd > 0 ? formatVND(p1SiYtd) : '-') + '</td>';



                                        p1Row += '<td class="text-right font-mono-num">' + formatTreeYoy(p1SiYtd, p1SiLyYtd) + '</td>';



                                        p1Row += '<td class="text-right font-mono-num font-bold text-emerald-700" title="' + formatExactVND(p1So) + '">' + (p1So > 0 ? formatVND(p1So) : '-') + '</td>';



                                        p1Row += '<td class="text-right font-mono-num font-bold text-emerald-800" title="' + formatExactVND(p1SoYtd) + '">' + (p1SoYtd > 0 ? formatVND(p1SoYtd) : '-') + '</td>';



                                        p1Row += '<td class="text-right font-mono-num">' + formatTreeYoy(p1SoYtd, p1SoLyYtd) + '</td>';



                                    }



                                    p1Row += '<td class="text-right font-mono-num text-slate-500">' + p1Share.toFixed(1) + '%</td>';



                                    p1Row += '<td class="text-right font-mono-num">' + formatTreeYoy(p1Val, p1Ly) + '</td>';



                                    p1Row += '</tr>';



                                    htmlRows.push(p1Row);







                                    if (p1Open) {



                                        const ph2Obj = (ph1Obj[ph1] && ph1Obj[ph1].children) || {};



                                        Object.keys(ph2Obj).sort().forEach(ph2 => {



                                            const p2Val = ph2Obj[ph2].val;



                                            const p2Share = totalSellin > 0 ? (p2Val / totalSellin) * 100 : 0;



                                            const p2Ly = lyDataMap[storage + '_' + cate + '_' + ph1 + '_' + ph2] || 0;







                                            let p2Row = '<tr class="text-slate-600 text-xs bg-slate-50/40 hover:bg-slate-100/60 border-b border-slate-100" data-level="3">';



                                            p2Row += '<td class="tree-lvl-4 select-none" title="' + escapeAttr(ph2) + '"><div class="flex items-center min-w-0 w-full"><span class="inline-block w-1.5 h-1.5 rounded-full bg-purple-500 mr-2 flex-shrink-0"></span><span class="truncate block min-w-0 flex-1">' + ph2 + '</span></div></td>';



                                            p2Row += '<td class="text-right font-mono-num font-semibold text-slate-700" title="' + formatExactVND(p2Val) + '">' + formatVND(p2Val) + '</td>';



                                            p2Row += '<td class="text-right font-mono-num text-slate-400">-</td>';



                                            const p2So = gtSoMap[storage + '_' + cate + '_' + ph1 + '_' + ph2] || 0;



                                            const p2SiYtd = siYtd2026Map[storage + '_' + cate + '_' + ph1 + '_' + ph2] || 0;



                                            const p2SiLyYtd = siYtd2025Map[storage + '_' + cate + '_' + ph1 + '_' + ph2] || 0;



                                            const p2SoYtd = soYtd2026Map[storage + '_' + cate + '_' + ph1 + '_' + ph2] || 0;



                                            const p2SoLyYtd = soYtd2025Map[storage + '_' + cate + '_' + ph1 + '_' + ph2] || 0;



                                            p2Row += '<td class="text-right font-mono-num"><span class="text-slate-400 font-normal">-</span></td>';



                                            if (channel === 'GT') {



                                                p2Row += '<td class="text-right font-mono-num font-semibold text-sky-800" title="' + formatExactVND(p2SiYtd) + '">' + (p2SiYtd > 0 ? formatVND(p2SiYtd) : '-') + '</td>';



                                                p2Row += '<td class="text-right font-mono-num">' + formatTreeYoy(p2SiYtd, p2SiLyYtd) + '</td>';



                                                p2Row += '<td class="text-right font-mono-num font-semibold text-emerald-700" title="' + formatExactVND(p2So) + '">' + (p2So > 0 ? formatVND(p2So) : '-') + '</td>';



                                                p2Row += '<td class="text-right font-mono-num font-semibold text-emerald-800" title="' + formatExactVND(p2SoYtd) + '">' + (p2SoYtd > 0 ? formatVND(p2SoYtd) : '-') + '</td>';



                                                p2Row += '<td class="text-right font-mono-num">' + formatTreeYoy(p2SoYtd, p2SoLyYtd) + '</td>';



                                            }



                                            p2Row += '<td class="text-right font-mono-num text-slate-500">' + p2Share.toFixed(1) + '%</td>';



                                            p2Row += '<td class="text-right font-mono-num">' + formatTreeYoy(p2Val, p2Ly) + '</td>';



                                            p2Row += '</tr>';



                                            htmlRows.push(p2Row);



                                        });



                                    }



                                });



                            }



                        });



                    }



                });



                tbody.innerHTML = htmlRows.join('');



            } catch (e) { console.error("Error in renderChannelProductTree:", e); }



        }







        let isAllProdOpen = false;



        function toggleAllProductNodes() {



            isAllProdOpen = !isAllProdOpen;



            if (isAllProdOpen) {



                if (typeof SELLIN_M !== 'undefined' && Array.isArray(SELLIN_M)) {



                    SELLIN_M.forEach(d => {



                        const sId = 'prod_' + (d.storage || 'Ambient');



                        const cId = sId + '_' + (d.cate || 'Other Category');



                        const p1Id = cId + '_' + (d.ph1 || 'Other PH1');



                        openNodes.add(sId);



                        openNodes.add(cId);



                        openNodes.add(p1Id);



                    });



                }



                if (typeof PROD_TREE !== 'undefined' && Array.isArray(PROD_TREE)) {



                    PROD_TREE.forEach(d => {



                        const sId = 'prod_' + (d.storage || 'Ambient');



                        const cId = sId + '_' + (d.cate || 'Other Category');



                        const p1Id = cId + '_' + (d.ph1 || 'Other PH1');



                        openNodes.add(sId);



                        openNodes.add(cId);



                        openNodes.add(p1Id);



                    });



                }



            } else {



                openNodes.forEach(id => {



                    if (id.startsWith('prod_')) openNodes.delete(id);



                });



                ['prod_Ambient', 'prod_Chilled', 'prod_Frozen'].forEach(id => openNodes.add(id));



            }



            renderProductTree();



        }







        let isAllChanOpen = false;



        function toggleAllChannelNodes() {



            isAllChanOpen = !isAllChanOpen;



            if (isAllChanOpen) {



                if (typeof SELLIN_M !== 'undefined' && Array.isArray(SELLIN_M)) {



                    SELLIN_M.forEach(d => {



                        const chId = 'chan_' + (d.channel || 'Khác');



                        const scId = chId + '_' + (d.sub_channel || 'Khác');



                        openNodes.add(chId);



                        openNodes.add(scId);



                    });



                }



                if (typeof CHAN_TREE !== 'undefined' && Array.isArray(CHAN_TREE)) {



                    CHAN_TREE.forEach(d => {



                        const chId = 'chan_' + (d.channel || 'Khác');



                        const scId = chId + '_' + (d.sub_channel || 'Khác');



                        openNodes.add(chId);



                        openNodes.add(scId);



                    });



                }



            } else {



                openNodes.forEach(id => {



                    if (id.startsWith('chan_')) openNodes.delete(id);



                });



                ['chan_GT', 'chan_MT', 'chan_B2B', 'chan_KR'].forEach(id => openNodes.add(id));



            }



            renderChannelTree();



        }







        let isAllMtOpen = false;



        



        let isAllGtTreeOpen = false;



        function toggleAllGtTreeNodes() {



            isAllGtTreeOpen = !isAllGtTreeOpen;



            if (isAllGtTreeOpen) {



                if (typeof GT_TREE !== 'undefined' && Array.isArray(GT_TREE)) {



                    GT_TREE.forEach(d => {



                        const m = d.mien || 'Khác';



                        const v = d.vung || 'Khác';



                        const gsbh = d.gsbh_name || 'Chưa phân công GSBH';



                        const nppKey = d.npp_code || 'N/A';



                        const mId = 'gt_' + m;



                        const vId = mId + '_' + v;



                        const gsbhId = vId + '_' + gsbh;



                        const nppId = gsbhId + '_' + nppKey;



                        openNodes.add(mId);



                        openNodes.add(vId);



                        openNodes.add(gsbhId);



                        openNodes.add(nppId);



                    });



                }



            } else {



                openNodes.forEach(id => {



                    if (id.startsWith('gt_')) openNodes.delete(id);



                });



                ['gt_MIỀN BẮC', 'gt_MIỀN TRUNG', 'gt_MIỀN NAM'].forEach(id => openNodes.add(id));



            }



            renderGtTree();



        }







        function toggleAllMtNodes() {



            isAllMtOpen = !isAllMtOpen;



            if (isAllMtOpen) {



                if (typeof MT_TREE !== 'undefined' && Array.isArray(MT_TREE)) {



                    MT_TREE.forEach(d => {



                        const sc = d.sub_channel || 'MT)Other';



                        const acc = d.key_account || 'Other';



                        const scId = 'mt_' + sc;



                        const accId = scId + '_' + acc;



                        openNodes.add(scId);



                        openNodes.add(accId);



                    });



                }



            } else {



                openNodes.forEach(id => {



                    if (id.startsWith('mt_')) openNodes.delete(id);



                });



                ['mt_MT)CS', 'mt_MT)Hyper'].forEach(id => openNodes.add(id));



            }



            renderMtTree();



        }







        function renderProductTree(totalSellin) {
            try {
                const prodSrc = (Array.isArray(SELLIN_M) && SELLIN_M.length > 0)
                    ? SELLIN_M
                    : ((state.dashChannel === 'ALL' && state.dashSubChannel === 'ALL' && state.dashAccount === 'ALL' && typeof PROD_TREE !== 'undefined' && Array.isArray(PROD_TREE)) ? PROD_TREE : SELLIN_M);
                const data = prodSrc.filter(d => {



                    if (d.year !== state.year) return false;



                    if (!state.selectedMonths.includes(d.month_num)) return false;



                    if (state.dashChannel !== 'ALL' && d.channel !== state.dashChannel) return false;



                    if (state.dashSubChannel !== 'ALL' && d.sub_channel !== state.dashSubChannel) return false;



                    if (state.dashAccount !== 'ALL' && d.account_name !== state.dashAccount && d.account_code !== state.dashAccount) return false;



                    if (state.prodStorage !== 'ALL' && d.storage !== state.prodStorage) return false;



                    if (state.prodCate !== 'ALL' && d.cate !== state.prodCate) return false;



                    if (state.prodPh1 !== 'ALL' && d.ph1 !== state.prodPh1) return false;



                    if (state.prodPh2 !== 'ALL' && d.ph2 !== state.prodPh2) return false;
                    if (state.prodSku !== 'ALL' && (d.sku_name || d.sku) && (d.sku_name || d.sku) !== state.prodSku) return false;



                    return true;



                });







                if (!totalSellin) {



                    totalSellin = 0;



                    data.forEach(d => totalSellin += (Number(d.sellin_val) || 0));



                }







                // Xây dựng bản đồ ph1 -> cate từ DIM_PROD_HIER và SELLIN_M



                const ph1ToCateMap = {};



                if (typeof DIM_PROD_HIER !== 'undefined' && Array.isArray(DIM_PROD_HIER)) {



                    DIM_PROD_HIER.forEach(p => {



                        if (p.ph1) {



                            const kSp = ((p.storage || '') + '_' + p.ph1).trim().toLowerCase();



                            const kP = p.ph1.trim().toLowerCase();



                            if (p.cate) {



                                ph1ToCateMap[kSp] = p.cate;



                                if (!ph1ToCateMap[kP]) ph1ToCateMap[kP] = p.cate;



                            }



                        }



                    });



                }



                if (typeof SELLIN_M !== 'undefined' && Array.isArray(SELLIN_M)) {



                    SELLIN_M.forEach(p => {



                        if (p.ph1 && p.cate) {



                            const kSp = ((p.storage || '') + '_' + p.ph1).trim().toLowerCase();



                            const kP = p.ph1.trim().toLowerCase();



                            if (!ph1ToCateMap[kSp]) ph1ToCateMap[kSp] = p.cate;



                            if (!ph1ToCateMap[kP]) ph1ToCateMap[kP] = p.cate;



                        }



                    });



                }







                const tree = {};



                data.forEach(d => {



                    const s = d.storage || 'Ambient';



                    const c = d.cate || 'Other Category';



                    const p1 = d.ph1 || 'Other PH1';



                    const p2 = d.ph2 || 'Other PH2';



                    const v = Number(d.sellin_val) || 0;







                    if (!tree[s]) tree[s] = { val: 0, children: {} };



                    tree[s].val += v;







                    if (!tree[s].children[c]) tree[s].children[c] = { val: 0, children: {} };



                    tree[s].children[c].val += v;







                    if (!tree[s].children[c].children[p1]) tree[s].children[c].children[p1] = { val: 0, children: {} };



                    tree[s].children[c].children[p1].val += v;







                    if (!tree[s].children[c].children[p1].children[p2]) tree[s].children[c].children[p1].children[p2] = { val: 0 };



                    tree[s].children[c].children[p1].children[p2].val += v;



                });







                // Bổ sung các sản phẩm có Target trong kỳ vào cây phân cấp



                if (typeof TARGET_SELLIN !== 'undefined' && Array.isArray(TARGET_SELLIN)) {



                    TARGET_SELLIN.filter(d => {



                        if (d.year !== state.year || !state.selectedMonths.includes(d.month.substring(5, 7))) return false;



                        if (state.dashChannel !== 'ALL' && d.channel !== state.dashChannel) return false;



                        if (state.dashSubChannel !== 'ALL' && d.sub_channel !== state.dashSubChannel) return false;



                        if (state.dashAccount !== 'ALL' && d.account_npp !== state.dashAccount && d.distributor_code !== state.dashAccount) return false;



                        if (state.prodStorage !== 'ALL' && d.storage && d.storage !== state.prodStorage) return false;



                        if (state.prodPh1 !== 'ALL' && d.ph1 && d.ph1 !== state.prodPh1) return false;



                        return true;



                    }).forEach(d => {



                        const s = d.storage || 'Ambient';



                        const p1 = d.ph1 || 'Other PH1';



                        const c = ph1ToCateMap[((s + '_' + p1).toLowerCase())] || ph1ToCateMap[p1.toLowerCase()] || 'Other Category';



                        if (!tree[s]) tree[s] = { val: 0, children: {} };



                        if (!tree[s].children[c]) tree[s].children[c] = { val: 0, children: {} };



                        if (!tree[s].children[c].children[p1]) tree[s].children[c].children[p1] = { val: 0, children: {} };



                    });



                }







                // Map Target Sell-in cho từng cấp Sản phẩm



                const prodStorageTargetMap = {};



                const prodCateTargetMap = {};



                const prodPh1TargetMap = {};







                if (typeof TARGET_SELLIN !== 'undefined' && Array.isArray(TARGET_SELLIN)) {



                    TARGET_SELLIN.filter(d => {



                        if (d.year !== state.year || !state.selectedMonths.includes(d.month.substring(5, 7))) return false;



                        if (state.dashChannel !== 'ALL' && d.channel !== state.dashChannel) return false;



                        if (state.dashSubChannel !== 'ALL' && d.sub_channel !== state.dashSubChannel) return false;



                        if (state.dashAccount !== 'ALL' && d.account_npp !== state.dashAccount && d.distributor_code !== state.dashAccount) return false;



                        if (state.prodStorage !== 'ALL' && d.storage && d.storage !== state.prodStorage) return false;



                        if (state.prodPh1 !== 'ALL' && d.ph1 && d.ph1 !== state.prodPh1) return false;



                        return true;



                    }).forEach(d => {



                        const s = d.storage || 'Ambient';



                        const p1 = d.ph1 || 'Other PH1';



                        const c = ph1ToCateMap[((s + '_' + p1).toLowerCase())] || ph1ToCateMap[p1.toLowerCase()] || 'Other Category';



                        const tgt = Number(d.target_amt) || 0;







                        prodStorageTargetMap[s] = (prodStorageTargetMap[s] || 0) + tgt;



                        prodCateTargetMap[s + '_' + c] = (prodCateTargetMap[s + '_' + c] || 0) + tgt;



                        prodPh1TargetMap[s + '_' + c + '_' + p1] = (prodPh1TargetMap[s + '_' + c + '_' + p1] || 0) + tgt;



                        prodPh1TargetMap[s + '_' + p1] = (prodPh1TargetMap[s + '_' + p1] || 0) + tgt;



                    });



                }







                // Map Sell-in cùng kỳ năm trước (LY) để tính YoY cho Product Tree



                const lyYear = (parseInt(state.year) - 1).toString();



                const lyProdMap = {};



                SELLIN_M.filter(d => {



                    if (d.year !== lyYear) return false;



                    if (!state.selectedMonths.includes(d.month_num)) return false;



                    if (state.dashChannel !== 'ALL' && d.channel !== state.dashChannel) return false;



                    if (state.dashSubChannel !== 'ALL' && d.sub_channel !== state.dashSubChannel) return false;



                    if (state.dashAccount !== 'ALL' && d.account_name !== state.dashAccount && d.account_code !== state.dashAccount) return false;



                    if (state.prodStorage !== 'ALL' && d.storage !== state.prodStorage) return false;



                    if (state.prodCate !== 'ALL' && d.cate !== state.prodCate) return false;



                    if (state.prodPh1 !== 'ALL' && d.ph1 !== state.prodPh1) return false;



                    if (state.prodPh2 !== 'ALL' && d.ph2 !== state.prodPh2) return false;
                    if (state.prodSku !== 'ALL' && (d.sku_name || d.sku) && (d.sku_name || d.sku) !== state.prodSku) return false;



                    return true;



                }).forEach(d => {



                    const s = d.storage || 'Ambient';



                    const c = d.cate || 'Other Category';



                    const p1 = d.ph1 || 'Other PH1';



                    const p2 = d.ph2 || 'Other PH2';



                    const v = Number(d.sellin_val) || 0;



                    lyProdMap[s] = (lyProdMap[s] || 0) + v;



                    lyProdMap[s + '_' + c] = (lyProdMap[s + '_' + c] || 0) + v;



                    lyProdMap[s + '_' + c + '_' + p1] = (lyProdMap[s + '_' + c + '_' + p1] || 0) + v;



                    lyProdMap[s + '_' + c + '_' + p1 + '_' + p2] = (lyProdMap[s + '_' + c + '_' + p1 + '_' + p2] || 0) + v;



                });







                const tbody = document.getElementById('tbody-tree-prod');



                if (!tbody) return;



                const htmlRows = [];







                Object.keys(tree).sort().forEach(storage => {



                    const sId = 'prod_' + storage;



                    const sOpen = openNodes.has(sId);



                    const sVal = tree[storage].val;



                    const sTarget = prodStorageTargetMap[storage] || 0;



                    const sShare = totalSellin > 0 ? (sVal / totalSellin) * 100 : 0;



                    const sLy = lyProdMap[storage] || 0;







                    let storageRowClass = 'tree-row-total tree-row-storage-other bg-slate-200/90 text-slate-950 border-y-2 border-slate-400 font-black hover:bg-slate-300 transition-colors shadow-2xs';



                    let toggleBtnClass = 'bg-slate-600 text-white font-black';



                    let storageBadge = '📦';



                    let numColor = 'text-slate-950 font-black';







                    if (storage === 'Ambient') {



                        storageRowClass = 'tree-row-total tree-row-ambient bg-amber-100/95 text-amber-950 border-y-2 border-amber-400 font-black hover:bg-amber-200/80 transition-colors shadow-2xs';



                        toggleBtnClass = 'bg-amber-600 text-white font-black';



                        storageBadge = '🌾';



                        numColor = 'text-amber-950 font-black';



                    } else if (storage === 'Chilled') {



                        storageRowClass = 'tree-row-total tree-row-chilled bg-cyan-100/95 text-cyan-950 border-y-2 border-cyan-400 font-black hover:bg-cyan-200/80 transition-colors shadow-2xs';



                        toggleBtnClass = 'bg-cyan-600 text-white font-black';



                        storageBadge = '🥗';



                        numColor = 'text-cyan-950 font-black';



                    } else if (storage === 'Frozen') {



                        storageRowClass = 'tree-row-total tree-row-frozen bg-blue-100/95 text-blue-950 border-y-2 border-blue-400 font-black hover:bg-blue-200/80 transition-colors shadow-2xs';



                        toggleBtnClass = 'bg-blue-600 text-white font-black';



                        storageBadge = '❄️';



                        numColor = 'text-blue-950 font-black';



                    }







                    let rowHtml = '<tr class="' + storageRowClass + '" data-level="0">';



                    rowHtml += '<td class="tree-lvl-1 cursor-pointer select-none py-2" onclick="toggleTreeNode(&quot;' + encodeURIComponent(sId) + '&quot;)" title="' + escapeAttr(storage) + '"><div class="flex items-center min-w-0 w-full"><span class="tree-toggle ' + toggleBtnClass + ' flex-shrink-0 mr-1.5 shadow-2xs">' + (sOpen ? '−' : '+') + '</span><span class="mr-1 text-[11px]">' + storageBadge + '</span><span class="text-xs font-black uppercase tracking-wide truncate block min-w-0 flex-1">' + storage + '</span></div></td>';



                    rowHtml += '<td class="text-right font-mono-num font-black ' + numColor + ' text-xs" title="' + formatExactVND(sVal) + '">' + formatVND(sVal) + '</td>';



                    rowHtml += '<td class="text-right font-mono-num font-black ' + numColor + ' text-xs" title="' + formatExactVND(sTarget) + '">' + (sTarget > 0 ? formatVND(sTarget) : '-') + '</td>';



                    rowHtml += '<td class="text-right font-mono-num font-black text-xs">' + formatAchieveBadge(sVal, sTarget) + '</td>';



                    rowHtml += '<td class="text-right font-mono-num font-black ' + numColor + ' text-xs">' + sShare.toFixed(1) + '%</td>';



                    rowHtml += '<td class="text-right font-mono-num font-black text-xs">' + formatTreeYoy(sVal, sLy) + '</td>';



                    rowHtml += '</tr>';



                    htmlRows.push(rowHtml);







                    if (sOpen) {



                        const cateObj = (tree[storage] && tree[storage].children) || {};



                        Object.keys(cateObj).sort().forEach(cate => {



                            const cId = sId + '_' + cate;



                            const cOpen = openNodes.has(cId);



                            const cVal = cateObj[cate].val;



                            const cTarget = prodCateTargetMap[storage + '_' + cate] || 0;



                            const cShare = totalSellin > 0 ? (cVal / totalSellin) * 100 : 0;



                            const cLy = lyProdMap[storage + '_' + cate] || 0;







                            let cRow = '<tr class="bg-slate-100/90 font-bold border-b border-slate-200 text-slate-800 hover:bg-slate-200/70 transition-colors" data-level="1">';



                            cRow += '<td class="tree-lvl-2 cursor-pointer select-none" onclick="toggleTreeNode(&quot;' + encodeURIComponent(cId) + '&quot;)" title="' + escapeAttr(cate) + '"><div class="flex items-center min-w-0 w-full"><span class="tree-toggle font-bold flex-shrink-0 mr-1.5">' + (cOpen ? '−' : '+') + '</span><span class="text-slate-800 font-bold truncate block min-w-0 flex-1">' + cate + '</span></div></td>';



                            cRow += '<td class="text-right font-mono-num font-bold text-slate-700" title="' + formatExactVND(cVal) + '">' + formatVND(cVal) + '</td>';



                            cRow += '<td class="text-right font-mono-num font-bold text-slate-700" title="' + formatExactVND(cTarget) + '">' + (cTarget > 0 ? formatVND(cTarget) : '-') + '</td>';



                            cRow += '<td class="text-right font-mono-num">' + formatAchieveBadge(cVal, cTarget) + '</td>';



                            cRow += '<td class="text-right font-mono-num text-slate-600">' + cShare.toFixed(1) + '%</td>';



                            cRow += '<td class="text-right font-mono-num">' + formatTreeYoy(cVal, cLy) + '</td>';



                            cRow += '</tr>';



                            htmlRows.push(cRow);







                            if (cOpen) {



                                const ph1Obj = (cateObj[cate] && cateObj[cate].children) || {};



                                Object.keys(ph1Obj).sort().forEach(ph1 => {



                                    const p1Id = cId + '_' + ph1;



                                    const p1Open = openNodes.has(p1Id);



                                    const p1Val = ph1Obj[ph1].val;



                                    const p1Target = prodPh1TargetMap[storage + '_' + cate + '_' + ph1] || prodPh1TargetMap[storage + '_' + ph1] || 0;



                                    const p1Share = totalSellin > 0 ? (p1Val / totalSellin) * 100 : 0;



                                    const p1Ly = lyProdMap[storage + '_' + cate + '_' + ph1] || 0;







                                    let p1Row = '<tr class="bg-white hover:bg-slate-50 border-b border-slate-100 transition-colors" data-level="2">';



                                    p1Row += '<td class="tree-lvl-3 cursor-pointer select-none" onclick="toggleTreeNode(&quot;' + encodeURIComponent(p1Id) + '&quot;)" title="' + escapeAttr(ph1) + '"><div class="flex items-center min-w-0 w-full"><span class="tree-toggle font-bold flex-shrink-0 mr-1.5">' + (p1Open ? '−' : '+') + '</span><span class="text-slate-700 font-medium truncate block min-w-0 flex-1">' + ph1 + '</span></div></td>';



                                    p1Row += '<td class="text-right font-mono-num text-slate-700" title="' + formatExactVND(p1Val) + '">' + formatVND(p1Val) + '</td>';



                                    p1Row += '<td class="text-right font-mono-num font-bold text-slate-700" title="' + formatExactVND(p1Target) + '">' + (p1Target > 0 ? formatVND(p1Target) : '-') + '</td>';



                                    p1Row += '<td class="text-right font-mono-num">' + formatAchieveBadge(p1Val, p1Target) + '</td>';



                                    p1Row += '<td class="text-right font-mono-num text-slate-500">' + p1Share.toFixed(1) + '%</td>';



                                    p1Row += '<td class="text-right font-mono-num">' + formatTreeYoy(p1Val, p1Ly) + '</td>';



                                    p1Row += '</tr>';



                                    htmlRows.push(p1Row);







                                    if (p1Open) {



                                        const ph2Obj = (ph1Obj[ph1] && ph1Obj[ph1].children) || {};



                                        Object.keys(ph2Obj).sort().forEach(ph2 => {



                                            const p2Val = ph2Obj[ph2].val;



                                            const p2Share = totalSellin > 0 ? (p2Val / totalSellin) * 100 : 0;



                                            const p2Ly = lyProdMap[storage + '_' + cate + '_' + ph1 + '_' + ph2] || 0;







                                            let p2Row = '<tr class="text-slate-600 text-xs bg-slate-50/40 hover:bg-slate-100/60 border-b border-slate-100" data-level="3">';



                                            p2Row += '<td class="tree-lvl-4 select-none" title="' + escapeAttr(ph2) + '"><div class="flex items-center min-w-0 w-full"><span class="inline-block w-1.5 h-1.5 rounded-full bg-purple-500 mr-2 flex-shrink-0"></span><span class="truncate block min-w-0 flex-1">' + ph2 + '</span></div></td>';



                                            p2Row += '<td class="text-right font-mono-num font-semibold text-slate-700" title="' + formatExactVND(p2Val) + '">' + formatVND(p2Val) + '</td>';



                                            p2Row += '<td class="text-right font-mono-num text-slate-400">-</td>';



                                            p2Row += '<td class="text-right font-mono-num"><span class="text-slate-400 font-normal">-</span></td>';



                                            p2Row += '<td class="text-right font-mono-num text-slate-500">' + p2Share.toFixed(1) + '%</td>';



                                            p2Row += '<td class="text-right font-mono-num">' + formatTreeYoy(p2Val, p2Ly) + '</td>';



                                            p2Row += '</tr>';



                                            htmlRows.push(p2Row);



                                        });



                                    }



                                });



                            }



                        });



                    }



                });



                tbody.innerHTML = htmlRows.join('');



            } catch (e) { console.error("Error in renderProductTree:", e); }



        }







        function renderChannelTree(totalSellin) {
            try {
                const chanSrc = (Array.isArray(SELLIN_M) && SELLIN_M.length > 0)
                    ? SELLIN_M
                    : ((state.prodStorage === 'ALL' && state.prodCate === 'ALL' && state.prodPh1 === 'ALL' && state.prodPh2 === 'ALL' && state.prodSku === 'ALL' && typeof CHAN_TREE !== 'undefined' && Array.isArray(CHAN_TREE)) ? CHAN_TREE : SELLIN_M);
                const data = chanSrc.filter(d => {



                    if (d.year !== state.year) return false;



                    if (!state.selectedMonths.includes(d.month_num)) return false;



                    if (state.dashChannel !== 'ALL' && d.channel !== state.dashChannel) return false;



                    if (state.dashSubChannel !== 'ALL' && d.sub_channel !== state.dashSubChannel) return false;



                    if (state.dashAccount !== 'ALL' && d.account_name !== state.dashAccount && d.account_code !== state.dashAccount) return false;



                    if (state.prodStorage !== 'ALL' && d.storage !== state.prodStorage) return false;



                    if (state.prodCate !== 'ALL' && d.cate !== state.prodCate) return false;



                    if (state.prodPh1 !== 'ALL' && d.ph1 !== state.prodPh1) return false;



                    if (state.prodPh2 !== 'ALL' && d.ph2 !== state.prodPh2) return false;
                    if (state.prodSku !== 'ALL' && (d.sku_name || d.sku) && (d.sku_name || d.sku) !== state.prodSku) return false;



                    return true;



                });







                if (!totalSellin) {



                    totalSellin = 0;



                    data.forEach(d => totalSellin += (Number(d.sellin_val) || 0));



                }







                const tree = {};



                data.forEach(d => {



                    const ch = d.channel || 'Khác';



                    const sc = d.sub_channel || 'Khác';



                    const acc = d.account_name || d.account_code;



                    const v = Number(d.sellin_val) || 0;







                    if (!tree[ch]) tree[ch] = { val: 0, children: {} };



                    tree[ch].val += v;







                    if (!tree[ch].children[sc]) tree[ch].children[sc] = { val: 0, children: {} };



                    tree[ch].children[sc].val += v;







                    if (!tree[ch].children[sc].children[acc]) {



                        tree[ch].children[sc].children[acc] = { val: 0, code: d.account_code, name: d.account_name };



                    }



                    tree[ch].children[sc].children[acc].val += v;



                });







                // Bổ sung các NPP/Account có Target trong kỳ vào cây phân cấp để hiển thị đầy đủ



                if (typeof TARGET_SELLIN !== 'undefined' && Array.isArray(TARGET_SELLIN)) {



                    const validPh1s = getValidPh1SetForCurrentFilter();



                    TARGET_SELLIN.filter(d => {



                        if (d.year !== state.year || !state.selectedMonths.includes(d.month.substring(5, 7))) return false;



                        if (state.dashChannel !== 'ALL' && d.channel !== state.dashChannel) return false;



                        if (state.dashSubChannel !== 'ALL' && d.sub_channel !== state.dashSubChannel) return false;



                        if (!matchProductTarget(d, validPh1s)) return false;



                        return true;



                    }).forEach(d => {



                        const ch = d.channel || 'Khác';



                        const sc = d.sub_channel || 'Khác';



                        const accName = d.account_npp || d.distributor_code;



                        if (ch && sc && accName) {



                            if (!tree[ch]) tree[ch] = { val: 0, children: {} };



                            if (!tree[ch].children[sc]) tree[ch].children[sc] = { val: 0, children: {} };



                            // Tránh trùng lặp do sai khác chữ hoa/thường



                            const existingKey = Object.keys(tree[ch].children[sc].children).find(k => k.toLowerCase().trim() === String(accName).toLowerCase().trim());



                            if (!existingKey) {



                                tree[ch].children[sc].children[accName] = { val: 0, code: d.distributor_code, name: d.account_npp };



                            }



                        }



                    });



                }







                // Map Target Sell-in



                const chanTargetMap = {};



                const chanScTargetMap = {};



                const chanAccTargetMap = {};



                if (typeof TARGET_SELLIN !== 'undefined' && Array.isArray(TARGET_SELLIN)) {



                    const validPh1s = getValidPh1SetForCurrentFilter();



                    TARGET_SELLIN.filter(d => {



                        if (d.year !== state.year || !state.selectedMonths.includes(d.month.substring(5, 7))) return false;



                        if (!matchProductTarget(d, validPh1s)) return false;



                        return true;



                    }).forEach(d => {



                        const ch = d.channel || 'Khác';



                        const sc = d.sub_channel || 'Khác';



                        const tgt = Number(d.target_amt) || 0;



                        chanTargetMap[ch] = (chanTargetMap[ch] || 0) + tgt;



                        chanScTargetMap[ch + '_' + sc] = (chanScTargetMap[ch + '_' + sc] || 0) + tgt;



                        chanScTargetMap[sc] = (chanScTargetMap[sc] || 0) + tgt;



                        if (d.distributor_code) {



                            chanAccTargetMap[d.distributor_code] = (chanAccTargetMap[d.distributor_code] || 0) + tgt;



                            chanAccTargetMap[ch + '_' + sc + '_' + d.distributor_code] = (chanAccTargetMap[ch + '_' + sc + '_' + d.distributor_code] || 0) + tgt;



                        }



                        if (d.account_npp) {



                            const accClean = d.account_npp.toLowerCase().trim();



                            chanAccTargetMap[d.account_npp] = (chanAccTargetMap[d.account_npp] || 0) + tgt;



                            chanAccTargetMap[accClean] = (chanAccTargetMap[accClean] || 0) + tgt;



                            chanAccTargetMap[ch + '_' + sc + '_' + d.account_npp] = (chanAccTargetMap[ch + '_' + sc + '_' + d.account_npp] || 0) + tgt;



                            chanAccTargetMap[ch + '_' + sc + '_' + accClean] = (chanAccTargetMap[ch + '_' + sc + '_' + accClean] || 0) + tgt;



                        }



                    });



                }







                // Map Sell-in cùng kỳ năm trước (LY) để tính YoY cho Channel Tree



                const lyYear = (parseInt(state.year) - 1).toString();



                const lyChanMap = {};



                SELLIN_M.filter(d => {



                    if (d.year !== lyYear) return false;



                    if (!state.selectedMonths.includes(d.month_num)) return false;



                    if (state.dashChannel !== 'ALL' && d.channel !== state.dashChannel) return false;



                    if (state.dashSubChannel !== 'ALL' && d.sub_channel !== state.dashSubChannel) return false;



                    if (state.dashAccount !== 'ALL' && d.account_name !== state.dashAccount && d.account_code !== state.dashAccount) return false;



                    if (state.prodStorage !== 'ALL' && d.storage !== state.prodStorage) return false;



                    if (state.prodCate !== 'ALL' && d.cate !== state.prodCate) return false;



                    if (state.prodPh1 !== 'ALL' && d.ph1 !== state.prodPh1) return false;



                    if (state.prodPh2 !== 'ALL' && d.ph2 !== state.prodPh2) return false;
                    if (state.prodSku !== 'ALL' && (d.sku_name || d.sku) && (d.sku_name || d.sku) !== state.prodSku) return false;



                    return true;



                }).forEach(d => {



                    const ch = d.channel || 'Khác';



                    const sc = d.sub_channel || 'Khác';



                    const accName = d.account_name;



                    const accCode = d.account_code;



                    const v = Number(d.sellin_val) || 0;







                    lyChanMap[ch] = (lyChanMap[ch] || 0) + v;



                    lyChanMap[ch + '_' + sc] = (lyChanMap[ch + '_' + sc] || 0) + v;



                    if (accName) {



                        lyChanMap[ch + '_' + sc + '_' + accName] = (lyChanMap[ch + '_' + sc + '_' + accName] || 0) + v;



                    }



                    if (accCode) {



                        lyChanMap[ch + '_' + sc + '_' + accCode] = (lyChanMap[ch + '_' + sc + '_' + accCode] || 0) + v;



                    }



                });







                const tbody = document.getElementById('tbody-tree-chan');



                if (!tbody) return;



                const htmlRows = [];







                Object.keys(tree).sort().forEach(ch => {



                    const chId = 'chan_' + ch;



                    const chOpen = openNodes.has(chId);



                    const chVal = tree[ch].val;



                    const chTarget = chanTargetMap[ch] || 0;



                    const chShare = totalSellin > 0 ? (chVal / totalSellin) * 100 : 0;



                    const chLy = lyChanMap[ch] || 0;







                    let chRow = '<tr class="tree-row-total tree-row-channel bg-indigo-100/90 font-black border-y-2 border-indigo-400 text-indigo-950 hover:bg-indigo-200/80 transition-colors shadow-2xs" data-level="0">';



                    chRow += '<td class="tree-lvl-1 cursor-pointer select-none py-2" onclick="toggleTreeNode(&quot;' + encodeURIComponent(chId) + '&quot;)" title="' + escapeAttr(ch) + '"><div class="flex items-center min-w-0 w-full"><span class="tree-toggle bg-indigo-600 text-white font-black flex-shrink-0 mr-1.5 shadow-2xs">' + (chOpen ? '−' : '+') + '</span><span class="mr-1 text-[11px]">🏢</span><span class="text-xs font-black uppercase tracking-wider text-indigo-950 truncate block min-w-0 flex-1">' + ch + '</span></div></td>';



                    chRow += '<td class="text-right font-mono-num font-black text-sky-950 text-xs" title="' + formatExactVND(chVal) + '">' + formatVND(chVal) + '</td>';



                    chRow += '<td class="text-right font-mono-num font-black text-indigo-950 text-xs" title="' + formatExactVND(chTarget) + '">' + (chTarget > 0 ? formatVND(chTarget) : '-') + '</td>';



                    chRow += '<td class="text-right font-mono-num font-black text-xs">' + formatAchieveBadge(chVal, chTarget) + '</td>';



                    chRow += '<td class="text-right font-mono-num font-black text-indigo-950 text-xs">' + chShare.toFixed(1) + '%</td>';



                    chRow += '<td class="text-right font-mono-num font-black text-xs">' + formatTreeYoy(chVal, chLy) + '</td>';



                    chRow += '</tr>';



                    htmlRows.push(chRow);







                    if (chOpen) {



                        const scObj = (tree[ch] && tree[ch].children) || {};



                        Object.keys(scObj).sort().forEach(sc => {



                            const scId = chId + '_' + sc;



                            const scOpen = openNodes.has(scId);



                            const scVal = scObj[sc].val;



                            const scTarget = chanScTargetMap[ch + '_' + sc] || chanScTargetMap[sc] || 0;



                            const scShare = totalSellin > 0 ? (scVal / totalSellin) * 100 : 0;



                            const scLy = lyChanMap[ch + '_' + sc] || 0;







                            let scRow = '<tr class="bg-slate-100/90 font-bold border-b border-slate-200 text-slate-800 hover:bg-slate-200/70 transition-colors" data-level="1">';



                            scRow += '<td class="tree-lvl-2 cursor-pointer select-none" onclick="toggleTreeNode(&quot;' + encodeURIComponent(scId) + '&quot;)" title="' + escapeAttr(sc) + '"><div class="flex items-center min-w-0 w-full"><span class="tree-toggle font-bold flex-shrink-0 mr-1.5">' + (scOpen ? '−' : '+') + '</span><span class="text-slate-800 font-bold truncate block min-w-0 flex-1">' + sc + '</span></div></td>';



                            scRow += '<td class="text-right font-mono-num font-bold text-slate-700" title="' + formatExactVND(scVal) + '">' + formatVND(scVal) + '</td>';



                            scRow += '<td class="text-right font-mono-num font-semibold text-slate-600" title="' + formatExactVND(scTarget) + '">' + (scTarget > 0 ? formatVND(scTarget) : '-') + '</td>';



                            scRow += '<td class="text-right font-mono-num">' + formatAchieveBadge(scVal, scTarget) + '</td>';



                            scRow += '<td class="text-right font-mono-num text-slate-600">' + scShare.toFixed(1) + '%</td>';



                            scRow += '<td class="text-right font-mono-num">' + formatTreeYoy(scVal, scLy) + '</td>';



                            scRow += '</tr>';



                            htmlRows.push(scRow);







                            if (scOpen) {



                                const accObj = (scObj[sc] && scObj[sc].children) || {};



                                Object.keys(accObj).sort().forEach(acc => {



                                    const accVal = accObj[acc].val;



                                    const accNode = accObj[acc] || {};



                                    const accClean = (accNode.name || acc || '').toLowerCase().trim();



                                    const accTarget = (accNode.code && chanAccTargetMap[ch + '_' + sc + '_' + accNode.code]) ||



                                                      (accClean && chanAccTargetMap[ch + '_' + sc + '_' + accClean]) ||



                                                      (accNode.name && chanAccTargetMap[ch + '_' + sc + '_' + accNode.name]) ||



                                                      (accNode.code && chanAccTargetMap[accNode.code]) ||



                                                      (accClean && chanAccTargetMap[accClean]) ||



                                                      (accNode.name && chanAccTargetMap[accNode.name]) ||



                                                      chanAccTargetMap[acc] || 0;



                                    const accShare = totalSellin > 0 ? (accVal / totalSellin) * 100 : 0;



                                    const accLy = (accNode.name && lyChanMap[ch + '_' + sc + '_' + accNode.name]) || (accNode.code && lyChanMap[ch + '_' + sc + '_' + accNode.code]) || lyChanMap[ch + '_' + sc + '_' + acc] || 0;







                                    let accRow = '<tr class="text-slate-600 text-xs bg-white hover:bg-slate-50 border-b border-slate-100">';



                                    accRow += '<td class="tree-lvl-3 select-none" title="' + escapeAttr(acc) + '"><div class="flex items-center min-w-0 w-full"><span class="inline-block w-1.5 h-1.5 rounded-full bg-sky-500 mr-2 flex-shrink-0"></span><span class="truncate block min-w-0 flex-1">' + acc + '</span></div></td>';



                                    accRow += '<td class="text-right font-mono-num font-semibold text-slate-800" title="' + formatExactVND(accVal) + '">' + formatVND(accVal) + '</td>';



                                    accRow += '<td class="text-right font-mono-num text-slate-600" title="' + formatExactVND(accTarget) + '">' + (accTarget > 0 ? formatVND(accTarget) : '-') + '</td>';



                                    accRow += '<td class="text-right font-mono-num">' + formatAchieveBadge(accVal, accTarget) + '</td>';



                                    accRow += '<td class="text-right font-mono-num text-slate-500">' + accShare.toFixed(1) + '%</td>';



                                    accRow += '<td class="text-right font-mono-num">' + formatTreeYoy(accVal, accLy) + '</td>';



                                    accRow += '</tr>';



                                    htmlRows.push(accRow);



                                });



                            }



                        });



                    }



                });



                tbody.innerHTML = htmlRows.join('');



            } catch (e) { console.error("Error in renderChannelTree:", e); }



        }







        // =========================================================================



        // TAB 2: KÊNH GT (RTM FIELD FORCE)



        // =========================================================================



                // =========================================================================


