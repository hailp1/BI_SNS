

        function downloadCSVBlob(csvContent, fileName) {



            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });



            const link = document.createElement("a");



            const url = URL.createObjectURL(blob);



            link.setAttribute("href", url);



            link.setAttribute("download", fileName);



            link.style.visibility = 'hidden';



            document.body.appendChild(link);



            link.click();



            document.body.removeChild(link);



        }







        // =========================================================================



        // EXPORT SUITE: EXCEL (.XLSX) & PDF (.PDF) & PRINT VECTOR



        // =========================================================================



        function showExportToast(msg, duration = 3000) {



            let toast = document.getElementById('export-toast');



            if (!toast) {



                toast = document.createElement('div');



                toast.id = 'export-toast';



                toast.style.cssText = "position: fixed; bottom: 25px; right: 25px; z-index: 9999999; background: #1E293B; color: #FFFFFF; padding: 12px 20px; border-radius: 12px; font-size: 13px; font-weight: 700; box-shadow: 0 10px 25px rgba(0,0,0,0.3); display: flex; align-items: center; gap: 8px; transition: opacity 0.3s ease;";



                document.body.appendChild(toast);



            }



            toast.innerHTML = msg;



            toast.style.opacity = '1';



            toast.style.display = 'flex';



            setTimeout(() => {



                toast.style.opacity = '0';



                setTimeout(() => { toast.style.display = 'none'; }, 300);



            }, duration);



        }







        function openExportModal() {



            const subtitle = document.getElementById('export-modal-subtitle');



            const tabNames = {



                'tab-overview': '1. Dashboard Tổng Quan Toàn Công Ty',



                'tab-gt': '2. Kênh Truyền Thống (GT 5 Cấp RTM)',



                'tab-mt': '3. Kênh Hiện Đại (Modern Trade Key Accounts)',



                'tab-b2b': '4. Kênh B2B (Food Service & Nhà Hàng)',



                'tab-kr': '5. Kênh KR (Key Retailer & Đại Lý Lớn)',



                'tab-reports': '6. Báo Cáo & Dữ Liệu FMCG'



            };



            const currentTabName = tabNames[state.activeTab] || state.activeTab;



            const mList = state.selectedMonths.map(m => 'T' + parseInt(m)).join(', ');



            if (subtitle) {



                subtitle.innerText = 'Trang: ' + currentTabName + ' | Năm: ' + state.year + ' | Kỳ: ' + mList;



            }



            const modal = document.getElementById('modal-export-choice');



            if (modal) {



                modal.style.display = 'flex';



                modal.classList.add('active');



            }



        }







        function closeExportModal() {



            const modal = document.getElementById('modal-export-choice');



            if (modal) {



                modal.style.display = 'none';



                modal.classList.remove('active');



            }



        }







        function printCurrentTab() {



            closeExportModal();



            setTimeout(() => {



                window.print();



            }, 200);



        }







        function exportCurrentTabPDF() {



            closeExportModal();



            const tabId = state.activeTab;



            const viewEl = document.getElementById(tabId + '-view');



            if (!viewEl) {



                window.print();



                return;



            }







            showExportToast("⏳ Đang kết xuất PDF A4 Landscape trực quan...", 4500);







            const filename = "CJ_Foods_Report_" + tabId.replace('tab-', '').toUpperCase() + "_" + state.year + "_M" + state.selectedMonths.join('-') + ".pdf";







            if (typeof html2pdf === 'undefined') {



                showExportToast("Thư viện PDF ngoại tuyến đang tải, chuyển sang in hệ thống...", 2500);



                setTimeout(() => window.print(), 300);



                return;



            }







            const opt = {



                margin: [6, 6, 6, 6],



                filename: filename,



                image: { type: 'jpeg', quality: 0.98 },



                html2canvas: {



                    scale: 1.5,



                    useCORS: true,



                    logging: false,



                    scrollY: 0



                },



                jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },



                pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }



            };







            html2pdf().set(opt).from(viewEl).save().then(() => {



                showExportToast("✅ Xuất file PDF thành công!", 3000);



            }).catch(err => {



                console.error("PDF generation error:", err);



                showExportToast("Chuyển sang in trình duyệt...", 2000);



                setTimeout(() => window.print(), 300);



            });



        }







        



        // =========================================================================



        // ENTERPRISE EXCEL STYLER ENGINE (CJ FOODS REPORT SUITE)



        // =========================================================================



        const ExcelStyler = {



            colors: {



                darkNavy: "0B192C",     // Phân cấp / Cơ cấu tổ chức



                blueHeader: "1E40AF",   // Sell-in / Doanh số



                blueSub: "1D4ED8",



                tealHeader: "065F46",   // Sell-out / Khách hàng



                tealSub: "047857",



                purpleHeader: "4C1D95", // Tồn kho / DOI / Kết quả



                purpleSub: "5B21B6",



                slateHeader: "1E293B",  // Bao phủ / MCP / Đánh giá



                slateSub: "334155",



                white: "FFFFFF",



                borderGray: "CBD5E1",   // Viền bảng tiêu chuẩn



                borderDark: "94A3B8",



                level1_Mien: "F8FAFC",  // Miền



                level2_Vung: "F0FDF4",  // Vùng



                level3_GSBH: "F5F3FF",  // GSBH



                level4_NPP:  "FFFBEB",  // NPP



                level5_NVBH: "FFFFFF",  // NVBH / Khách hàng



                totalBg:     "EFF6FF"   // Dòng tổng cộng



            },







            borders: {



                thinAll: {



                    top: { style: 'thin', color: { rgb: 'CBD5E1' } },



                    bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },



                    left: { style: 'thin', color: { rgb: 'CBD5E1' } },



                    right: { style: 'thin', color: { rgb: 'CBD5E1' } }



                },



                headerBorder: {



                    top: { style: 'thin', color: { rgb: '475569' } },



                    bottom: { style: 'medium', color: { rgb: '0F172A' } },



                    left: { style: 'thin', color: { rgb: '475569' } },



                    right: { style: 'thin', color: { rgb: '475569' } }



                },



                totalBorder: {



                    top: { style: 'thin', color: { rgb: '1E40AF' } },



                    bottom: { style: 'double', color: { rgb: '1E40AF' } },



                    left: { style: 'thin', color: { rgb: 'CBD5E1' } },



                    right: { style: 'thin', color: { rgb: 'CBD5E1' } }



                }



            },







            getTitleStyle: function() {



                return {



                    font: { name: 'Arial', sz: 14, bold: true, color: { rgb: '0B192C' } },



                    alignment: { horizontal: 'left', vertical: 'center' }



                };



            },







            getSubtitleStyle: function(align = 'left') {



                return {



                    font: { name: 'Arial', sz: 9.5, italic: true, color: { rgb: '475569' } },



                    alignment: { horizontal: align, vertical: 'center' }



                };



            },







            getSubHeaderStyle: function(align = 'left') {



                return this.getSubtitleStyle(align);



            },







            getHeaderStyle: function(bgColor, fontSize = 10, align = 'center') {



                const fillRgb = this.colors[bgColor] || bgColor;



                return {



                    font: { name: 'Arial', sz: fontSize, bold: true, color: { rgb: 'FFFFFF' } },



                    fill: { fgColor: { rgb: fillRgb } },



                    alignment: { horizontal: align, vertical: 'center', wrapText: true },



                    border: this.borders.headerBorder



                };



            },







            getDataStyle: function(align = 'left', isBold = false) {



                return this.getLevelStyle(5, align, isBold);



            },







            getLevelStyle: function(level, align = 'left', isBold = false) {



                let bg = this.colors.level5_NVBH;



                let bold = isBold;



                let sz = 9.5;



                let colorRgb = '0F172A';







                if (level === 1 || level === 0) {



                    bg = this.colors.level1_Mien;



                    bold = true;



                    sz = 10;



                    colorRgb = '0B192C';



                } else if (level === 2) {



                    bg = this.colors.level2_Vung;



                    bold = true;



                    sz = 9.5;



                    colorRgb = '065F46';



                } else if (level === 3) {



                    bg = this.colors.level3_GSBH;



                    bold = true;



                    sz = 9.5;



                    colorRgb = '4C1D95';



                } else if (level === 4) {



                    bg = this.colors.level4_NPP;



                    bold = false;



                    sz = 9.5;



                    colorRgb = '7C2D12';



                } else if (level === 'total') {



                    bg = this.colors.totalBg;



                    bold = true;



                    sz = 10.5;



                    colorRgb = '1E40AF';



                }







                return {



                    font: { name: 'Arial', sz: sz, bold: bold, color: { rgb: colorRgb } },



                    fill: { fgColor: { rgb: bg } },



                    alignment: { horizontal: align, vertical: 'center' },



                    border: (level === 'total') ? this.borders.totalBorder : this.borders.thinAll



                };



            },







            applyOutlineConfig: function(ws, rowInfos, colWidths, merges) {



                if (colWidths) ws['!cols'] = colWidths;



                if (rowInfos) ws['!rows'] = rowInfos;



                if (merges && merges.length > 0) ws['!merges'] = merges;



                ws['!outline'] = { above: true };



                ws['!protect'] = false;



                ws['!views'] = [{ showGridLines: true }];



                ws['sheetPr'] = {



                    outlinePr: {



                        summaryBelow: "0",



                        summaryRight: "0"



                    }



                };



            },







            createCell: function(val, type, style, numFmt = null) {



                const cell = { v: val, t: type, s: style };



                if (numFmt) cell.z = numFmt;



                return cell;



            },







            createNumCell: function(val, style, formatType = 'currency') {



                const num = Number(val) || 0;



                let z = '#,##0';



                if (formatType === 'percent') z = '0.0%';



                else if (formatType === 'decimal') z = '0.0';



                else if (formatType === 'decimal2') z = '0.00';



                return { v: num, t: 'n', z: z, s: style };



            }



        };



        window.ExcelStyler = ExcelStyler;











        function exportCurrentTabExcel() {



            closeExportModal();



            showExportToast("⏳ Đang tạo workbook Excel (.xlsx) chuẩn số liệu...", 3500);







            setTimeout(() => {



                try {



                    if (typeof XLSX === 'undefined') {



                        alert("Thư viện SheetJS chưa sẵn sàng. Đang mở hộp thoại in...");



                        window.print();



                        return;



                    }







                    const wb = XLSX.utils.book_new();



                    const tabId = state.activeTab;



                    const year = state.year;



                    const lyYear = (parseInt(year) - 1).toString();



                    const months = state.selectedMonths;



                    const monthStr = 'Tháng ' + months.map(m => parseInt(m)).join(', Tháng ');



                    const nowStr = new Date().toLocaleString('vi-VN');



                    const validPh1s = getValidPh1SetForCurrentFilter();



                    const currentUser = state.currentUser || { fullname: 'Administrator', username: 'admin', role: 'ADMIN' };







                    const createMetaRows = (reportTitle) => [



                        ["CÔNG TY TNHH CJ FOODS VIỆT NAM"],



                        ["BÁO CÁO HOẠT ĐỘNG KINH DOANH THƯƠNG MẠI - " + reportTitle.toUpperCase()],



                        ["Năm tài chính: " + year, "Kỳ báo cáo: " + monthStr, "Thời điểm xuất: " + nowStr],



                        ["Người trích xuất: " + currentUser.fullname + " (" + currentUser.username + ")", "Quyền hạn: " + currentUser.role, "Phạm vi dữ liệu: " + (currentUser.scopeValue || 'Toàn quốc')],



                        ["Bộ lọc áp dụng: Kênh: " + (tabId === 'tab-overview' ? state.channel : tabId.replace('tab-','').toUpperCase()) + " | Storage: " + state.prodStorage + " | Cate: " + state.prodCate + " | PH1: " + state.prodPh1 + " | PH2: " + state.prodPh2],



                        []



                    ];







                    let defaultFilename = "CJ_Foods_Report_" + tabId.replace('tab-', '').toUpperCase() + "_" + year + "_M" + months.join('-') + ".xlsx";







                    if (tabId === 'tab-overview') {



                        // ==================== TAB 1: OVERVIEW ====================



                        const rows1 = createMetaRows("Tổng Quan & Phân Cấp Sản Phẩm (4 Kênh)");







                        const filterOverview = d => {



                            if (d.year !== year || !months.includes(d.month_num)) return false;



                            if (!matchProductRecord(d)) return false;



                            return true;



                        };







                        let totalSi = 0;



                        SELLIN_M.filter(filterOverview).forEach(d => totalSi += (Number(d.sellin_val) || 0));







                        let totalLy = 0;



                        SELLIN_M.filter(d => {



                            if (d.year !== lyYear || !months.includes(d.month_num)) return false;



                            if (!matchProductRecord(d)) return false;



                            return true;



                        }).forEach(d => totalLy += (Number(d.sellin_val) || 0));



                        const growthYoY = totalLy > 0 ? ((totalSi - totalLy) / totalLy) * 100 : 0;







                        let totalTgt = 0;



                        if (typeof TARGET_SELLIN !== 'undefined' && Array.isArray(TARGET_SELLIN)) {



                            TARGET_SELLIN.filter(d => {



                                if (d.year !== year) return false;



                                const mNum = d.month.substring(5, 7);



                                if (!months.includes(mNum)) return false;



                                if (!matchProductTarget(d, validPh1s)) return false;



                                return true;



                            }).forEach(d => totalTgt += (Number(d.target_amt) || 0));



                        }



                        const achieveTgt = totalTgt > 0 ? (totalSi / totalTgt) * 100 : 0;







                        // KPI Cards Table



                        rows1.push(["--- BẢNG TỔNG HỢP CHỈ SỐ KPI TOÀN CÔNG TY ---"]);



                        rows1.push(["Chỉ Số KPI", "Giá Trị Thực Hiện (VND)", "Kế Hoạch / Cùng Kỳ (VND)", "Tỷ Lệ Đạt / Tăng Trưởng (%)", "Đánh Giá"]);



                        rows1.push(["Doanh Số Sell-in MTD", totalSi, totalTgt, Number(achieveTgt.toFixed(1)), achieveTgt >= 100 ? 'Vượt kế hoạch' : (achieveTgt >= 80 ? 'Bám sát kế hoạch' : 'Cần tăng tốc')]);



                        rows1.push(["So Với Cùng Kỳ LY (" + lyYear + ")", totalSi, totalLy, Number(growthYoY.toFixed(1)), growthYoY >= 0 ? 'Tăng trưởng dương' : 'Suy giảm cùng kỳ']);



                        rows1.push([]);







                        // 4 Channel breakdown table



                        rows1.push(["--- CƠ CẤU DOANH SỐ THEO 4 KÊNH BÁN HÀNG ---"]);



                        rows1.push(["Kênh Bán Hàng", "Doanh Số Sell-in (VND)", "Cùng Kỳ LY (VND)", "Tăng Trưởng YoY (%)", "Tỷ Trọng (%)"]);



                        ['GT', 'MT', 'B2B', 'KR'].forEach(ch => {



                            let chSi = 0, chLy = 0;



                            SELLIN_M.filter(d => filterOverview(d) && d.channel === ch).forEach(d => chSi += (Number(d.sellin_val) || 0));



                            SELLIN_M.filter(d => d.year === lyYear && months.includes(d.month_num) && d.channel === ch && matchProductRecord(d)).forEach(d => chLy += (Number(d.sellin_val) || 0));



                            const chGrowth = chLy > 0 ? ((chSi - chLy) / chLy) * 100 : 0;



                            const chShare = totalSi > 0 ? (chSi / totalSi) * 100 : 0;



                            rows1.push([ch, chSi, chLy, Number(chGrowth.toFixed(1)), Number(chShare.toFixed(1))]);



                        });



                        rows1.push(["TỔNG CỘNG CÔNG TY", totalSi, totalLy, Number(growthYoY.toFixed(1)), 100.0]);



                        rows1.push([]);







                        // Product 4-Level Table



                        rows1.push(["--- CÂY PHÂN CẤP SẢN PHẨM 4 CẤP (STORAGE ➔ CATE ➔ PH1 ➔ PH2) ---"]);



                        rows1.push(["Cấp Độ", "Phân Loại Sản Phẩm", "Storage (Nhiệt độ)", "Ngành Hàng (Cate)", "Nhóm Hàng (PH1)", "Tiểu Nhóm (PH2)", "Doanh Số Sell-in (VND)", "Cùng Kỳ LY (VND)", "Tăng Trưởng YoY (%)", "Tỷ Trọng (%)"]);







                        const prodTree = {};



                        SELLIN_M.filter(filterOverview).forEach(d => {



                            const st = d.storage || 'Chưa phân loại';



                            const cat = d.cate || 'Khác';



                            const p1 = d.ph1 || 'Khác';



                            const p2 = d.ph2 || 'Khác';



                            if (!prodTree[st]) prodTree[st] = { val: 0, children: {} };



                            prodTree[st].val += (Number(d.sellin_val) || 0);



                            if (!prodTree[st].children[cat]) prodTree[st].children[cat] = { val: 0, children: {} };



                            prodTree[st].children[cat].val += (Number(d.sellin_val) || 0);



                            if (!prodTree[st].children[cat].children[p1]) prodTree[st].children[cat].children[p1] = { val: 0, children: {} };



                            prodTree[st].children[cat].children[p1].val += (Number(d.sellin_val) || 0);



                            if (!prodTree[st].children[cat].children[p1].children[p2]) prodTree[st].children[cat].children[p2] = { val: 0 };



                            prodTree[st].children[cat].children[p2].val += (Number(d.sellin_val) || 0);



                        });







                        const prodLyMap = {};



                        SELLIN_M.filter(d => d.year === lyYear && months.includes(d.month_num) && matchProductRecord(d)).forEach(d => {



                            const kSt = d.storage || 'Chưa phân loại';



                            const kCat = kSt + '||' + (d.cate || 'Khác');



                            const kP1 = kCat + '||' + (d.ph1 || 'Khác');



                            const kP2 = kP1 + '||' + (d.ph2 || 'Khác');



                            const v = Number(d.sellin_val) || 0;



                            prodLyMap[kSt] = (prodLyMap[kSt] || 0) + v;



                            prodLyMap[kCat] = (prodLyMap[kCat] || 0) + v;



                            prodLyMap[kP1] = (prodLyMap[kP1] || 0) + v;



                            prodLyMap[kP2] = (prodLyMap[kP2] || 0) + v;



                        });







                        Object.keys(prodTree).sort().forEach(st => {



                            const stNode = prodTree[st];



                            const stLy = prodLyMap[st] || 0;



                            const stGr = stLy > 0 ? ((stNode.val - stLy) / stLy) * 100 : 0;



                            const stSh = totalSi > 0 ? (stNode.val / totalSi) * 100 : 0;



                            rows1.push(["[Cấp 1 - Storage]", st, st, "", "", "", stNode.val, stLy, Number(stGr.toFixed(1)), Number(stSh.toFixed(1))]);







                            Object.keys(stNode.children).sort().forEach(cat => {



                                const catNode = stNode.children[cat];



                                const catKey = st + '||' + cat;



                                const catLy = prodLyMap[catKey] || 0;



                                const catGr = catLy > 0 ? ((catNode.val - catLy) / catLy) * 100 : 0;



                                const catSh = totalSi > 0 ? (catNode.val / totalSi) * 100 : 0;



                                rows1.push(["  [Cấp 2 - Category]", "  ↳ " + cat, st, cat, "", "", catNode.val, catLy, Number(catGr.toFixed(1)), Number(catSh.toFixed(1))]);







                                Object.keys(catNode.children).sort().forEach(p1 => {



                                    const p1Node = catNode.children[p1];



                                    const p1Key = catKey + '||' + p1;



                                    const p1Ly = prodLyMap[p1Key] || 0;



                                    const p1Gr = p1Ly > 0 ? ((p1Node.val - p1Ly) / p1Ly) * 100 : 0;



                                    const p1Sh = totalSi > 0 ? (p1Node.val / totalSi) * 100 : 0;



                                    rows1.push(["    [Cấp 3 - PH1]", "    ↳ " + p1, st, cat, p1, "", p1Node.val, p1Ly, Number(p1Gr.toFixed(1)), Number(p1Sh.toFixed(1))]);







                                    Object.keys(p1Node.children).sort().forEach(p2 => {



                                        const p2Node = p1Node.children[p2];



                                        const p2Key = p1Key + '||' + p2;



                                        const p2Ly = prodLyMap[p2Key] || 0;



                                        const p2Gr = p2Ly > 0 ? ((p2Node.val - p2Ly) / p2Ly) * 100 : 0;



                                        const p2Sh = totalSi > 0 ? (p2Node.val / totalSi) * 100 : 0;



                                        rows1.push(["      [Cấp 4 - PH2]", "      ↳ " + p2, st, cat, p1, p2, p2Node.val, p2Ly, Number(p2Gr.toFixed(1)), Number(p2Sh.toFixed(1))]);



                                    });



                                });



                            });



                        });







                        const ws1 = XLSX.utils.aoa_to_sheet(rows1);



                        ws1['!cols'] = [{wch: 22}, {wch: 32}, {wch: 18}, {wch: 20}, {wch: 22}, {wch: 22}, {wch: 20}, {wch: 20}, {wch: 18}, {wch: 14}];



                        XLSX.utils.book_append_sheet(wb, ws1, "Tong_Quan_Va_San_Pham");







                    } else if (tabId === 'tab-gt') {



                        // ==================== TAB 2: GT ====================



                        const rows2 = createMetaRows("Kênh Truyền Thống (GT - 5 Cấp RTM)");







                        const gtFilter = d => {



                            if (d.year !== year || !months.includes(d.month_num)) return false;



                            if (state.geoMien !== 'ALL' && d.mien !== state.geoMien) return false;



                            if (state.geoVung !== 'ALL' && d.vung !== state.geoVung) return false;



                            if (state.geoGsbh !== 'ALL' && (typeof matchGsbhRecord === 'function' ? !matchGsbhRecord(d, state.geoGsbh) : d.gsbh_name !== state.geoGsbh)) return false;



                            if (state.geoNpp !== 'ALL' && d.npp_code !== state.geoNpp) return false;



                            if (!matchProductRecord(d)) return false;



                            return true;



                        };







                        const gtFiltered = GT_TREE.filter(gtFilter);



                        let gtTotalSo = 0, gtTotalOrders = 0, gtTotalLines = 0;



                        const asoSet = new Set();



                        gtFiltered.forEach(d => {



                            gtTotalSo += (Number(d.sellout_val) || 0);



                            gtTotalOrders += (Number(d.order_count) || 0);



                            gtTotalLines += (Number(d.line_count) || 0);



                            if (d.aso_count > 0) asoSet.add(d.npp_code + '||' + d.nvbh_name);



                        });







                        let gtTargetSo = 0;



                        if (typeof TARGET_SELLOUT !== 'undefined' && Array.isArray(TARGET_SELLOUT)) {



                            TARGET_SELLOUT.filter(d => {



                                if (d.channel !== 'GT' || d.year !== year || !months.includes(d.month.substring(5, 7))) return false;



                                if (state.geoMien !== 'ALL' && d.region !== state.geoMien) return false;



                                if (!matchProductTarget(d, validPh1s)) return false;



                                return true;



                            }).forEach(d => gtTargetSo += (Number(d.target_amt) || 0));



                        }







                        let gtSi = 0;



                        SELLIN_M.filter(d => d.channel === 'GT' && d.year === year && months.includes(d.month_num) && matchProductRecord(d)).forEach(d => gtSi += (Number(d.sellin_val) || 0));







                        let gtStock = 0;



                        const maxM = Math.max(...months.map(m => parseInt(m))).toString().padStart(2, '0');



                        const currMKey = year + '-' + maxM;



                        const stockMonths = [...new Set(GT_STOCK.map(d => d.month))].filter(m => m <= currMKey).sort();



                        const latestStockMonth = stockMonths.length > 0 ? stockMonths[stockMonths.length - 1] : currMKey;



                        GT_STOCK.filter(d => d.month === latestStockMonth && matchProductRecord(d)).forEach(d => gtStock += (Number(d.stock_val) || 0));







                        const daysInPeriod = months.reduce((sum, m) => sum + getDaysInMonthForDoi(m, year), 0);



                        const dailySo = daysInPeriod > 0 ? (gtTotalSo / daysInPeriod) : 0;



                        const gtDoi = dailySo > 0 ? (gtStock / dailySo) : 0;



                        const gtDropSize = gtTotalOrders > 0 ? gtTotalSo / gtTotalOrders : 0;



                        const gtLppc = gtTotalOrders > 0 ? gtTotalLines / gtTotalOrders : 0;







                        rows2.push(["--- BẢNG TỔNG HỢP CHỈ SỐ RTM FIELD FORCE KÊNH GT ---"]);



                        rows2.push(["Chỉ Số RTM", "Giá Trị Thực Hiện", "Kế Hoạch / Mục Tiêu", "Tỷ Lệ Đạt (%)", "Ghi Chú Đánh Giá"]);



                        rows2.push(["Doanh Số Sell-out (VND)", gtTotalSo, gtTargetSo, gtTargetSo > 0 ? Number(((gtTotalSo / gtTargetSo) * 100).toFixed(1)) : '--', gtTotalSo >= gtTargetSo ? 'Đạt Target' : 'Chưa đạt']);



                        rows2.push(["Doanh Số Sell-in (VND)", gtSi, '--', '--', 'Dữ liệu xuất kho CJ ➔ NPP']);



                        rows2.push(["Tồn Kho NPP (VND)", gtStock, '--', '--', 'Tháng chốt: ' + latestStockMonth]);



                        rows2.push(["DOI (Ngày tồn kho bình quân)", Number(gtDoi.toFixed(1)), "20 - 35 ngày", '--', gtDoi > 35 ? 'Tồn kho cao' : (gtDoi < 15 ? 'Nguy cơ đứt hàng' : 'Tối ưu')]);



                        rows2.push(["Tổng Đơn Hàng Thành Công", gtTotalOrders, '--', '--', 'Đơn phát sinh từ SFA']);



                        rows2.push(["Quy Mô Đơn Hàng (Drop Size - VND)", Number(gtDropSize.toFixed(0)), '--', '--', 'Doanh số trung bình / đơn']);



                        rows2.push(["Dòng Hàng / Đơn (LPPC)", Number(gtLppc.toFixed(1)), '4.5 - 6.0', '--', 'Độ sâu đơn hàng']);



                        rows2.push([]);







                        rows2.push(["--- MA TRẬN 5 CẤP RTM KÊNH GT (MIỀN ➔ VÙNG ➔ GSBH ➔ NPP ➔ NVBH) ---"]);



                        rows2.push([



                            "Cấp Độ Phân Bổ", "Miền", "Vùng", "GSBH (Giám Sát Bán Hàng)", "Mã NPP", "Tên Nhà Phân Phối", "NVBH (Nhân Viên Bán Hàng)",



                            "Sell-in Gross (VND)", "Target SI (VND)", "% Đạt SI (%)", "Sell-out (VND)", "Target SO (VND)", "% Đạt SO (%)", "Tồn Kho NPP (VND)", "DOI (Ngày)",



                            "ASO (Điểm Bán Hoạt Động)", "MCP (Tuyến Bao Phủ)", "Strike Rate (%)", "Tổng Đơn Hàng", "Drop Size (VND)", "SKU/Đơn (LPPC)", "SKU/Cửa Hàng"



                        ]);







                        const nppSiMap = {};



                        SELLIN_M.filter(d => d.channel === 'GT' && d.year === year && months.includes(d.month_num) && matchProductRecord(d)).forEach(d => {



                            nppSiMap[d.account_code] = (nppSiMap[d.account_code] || 0) + (Number(d.sellin_val) || 0);



                        });







                        const nppTargetSiMap = {};



                        if (typeof TARGET_SELLIN !== 'undefined' && Array.isArray(TARGET_SELLIN)) {



                            TARGET_SELLIN.filter(d => d.channel === 'GT' && d.year === year && months.includes(d.month.substring(5, 7)) && matchProductTarget(d, validPh1s)).forEach(d => {



                                if (d.distributor_code) nppTargetSiMap[d.distributor_code] = (nppTargetSiMap[d.distributor_code] || 0) + (Number(d.target_amt) || 0);



                            });



                        }







                        const nppTargetMap = {};



                        const nvbhTargetMap = {};



                        if (typeof TARGET_SELLOUT !== 'undefined' && Array.isArray(TARGET_SELLOUT)) {



                            TARGET_SELLOUT.filter(d => d.channel === 'GT' && d.year === year && months.includes(d.month.substring(5, 7)) && matchProductTarget(d, validPh1s)).forEach(d => {



                                if (d.distributor_code) nppTargetMap[d.distributor_code] = (nppTargetMap[d.distributor_code] || 0) + (Number(d.target_amt) || 0);



                                if (d.employee_name && d.distributor_code) {



                                    const nvKey = d.distributor_code + '_' + d.employee_name;



                                    nvbhTargetMap[nvKey] = (nvbhTargetMap[nvKey] || 0) + (Number(d.target_amt) || 0);



                                }



                            });



                        }







                        const nppStockMap = {};



                        GT_STOCK.filter(d => d.month === latestStockMonth && matchProductRecord(d)).forEach(d => {



                            nppStockMap[d.npp_code] = (nppStockMap[d.npp_code] || 0) + (Number(d.stock_val) || 0);



                        });







                        const nppMcpMap = {};



                        GT_MCP_M.filter(d => d.month === currMKey).forEach(d => {



                            nppMcpMap[d.npp_code] = (nppMcpMap[d.npp_code] || 0) + (Number(d.mcp_count) || 0);



                        });







                        const calcLocalDoi = (stk, so) => {



                            if (so <= 0 || daysInPeriod <= 0) return 0;



                            const dSo = so / daysInPeriod;



                            return dSo > 0 ? stk / dSo : 0;



                        };







                        const gtHierTree = {};



                        gtFiltered.forEach(d => {



                            const m = d.mien || 'Khác';



                            const v = d.vung || 'Khác';



                            const g = d.gsbh_name || 'Khác';



                            const nKey = d.npp_code || 'N/A';



                            const nv = d.nvbh_name || 'Khác';







                            if (!gtHierTree[m]) gtHierTree[m] = { so: 0, orders: 0, lines: 0, aso: 0, order_skus: 0, aso_skus: 0, npps: new Set(), children: {} };



                            gtHierTree[m].so += (Number(d.sellout_val) || 0);



                            gtHierTree[m].orders += (Number(d.order_count) || 0);



                            gtHierTree[m].lines += (Number(d.line_count) || 0);



                            gtHierTree[m].aso += (Number(d.aso_count) || 0);



                            gtHierTree[m].order_skus += (Number(d.order_sku_cnt) || 0);



                            gtHierTree[m].aso_skus += (Number(d.aso_sku_cnt) || 0);



                            gtHierTree[m].npps.add(d.npp_code);







                            if (!gtHierTree[m].children[v]) gtHierTree[m].children[v] = { so: 0, orders: 0, lines: 0, aso: 0, order_skus: 0, aso_skus: 0, npps: new Set(), children: {} };



                            gtHierTree[m].children[v].so += (Number(d.sellout_val) || 0);



                            gtHierTree[m].children[v].orders += (Number(d.order_count) || 0);



                            gtHierTree[m].children[v].lines += (Number(d.line_count) || 0);



                            gtHierTree[m].children[v].aso += (Number(d.aso_count) || 0);



                            gtHierTree[m].children[v].order_skus += (Number(d.order_sku_cnt) || 0);



                            gtHierTree[m].children[v].aso_skus += (Number(d.aso_sku_cnt) || 0);



                            gtHierTree[m].npps.add(d.npp_code);







                            if (!gtHierTree[m].children[v].children[g]) gtHierTree[m].children[v].children[g] = { so: 0, orders: 0, lines: 0, aso: 0, order_skus: 0, aso_skus: 0, npps: new Set(), children: {} };



                            gtHierTree[m].children[v].children[g].so += (Number(d.sellout_val) || 0);



                            gtHierTree[m].children[v].children[g].orders += (Number(d.order_count) || 0);



                            gtHierTree[m].children[v].children[g].lines += (Number(d.line_count) || 0);



                            gtHierTree[m].children[v].children[g].aso += (Number(d.aso_count) || 0);



                            gtHierTree[m].children[v].children[g].order_skus += (Number(d.order_sku_cnt) || 0);



                            gtHierTree[m].children[v].children[g].aso_skus += (Number(d.aso_sku_cnt) || 0);



                            gtHierTree[m].children[v].children[g].npps.add(d.npp_code);







                            if (!gtHierTree[m].children[v].children[g].children[nKey]) {



                                gtHierTree[m].children[v].children[g].children[nKey] = {



                                    code: d.npp_code,



                                    name: d.npp_name,



                                    so: 0, orders: 0, lines: 0, aso: 0, order_skus: 0, aso_skus: 0,



                                    children: {}



                                };



                            }



                            const nNode = gtHierTree[m].children[v].children[g].children[nKey];



                            nNode.so += (Number(d.sellout_val) || 0);



                            nNode.orders += (Number(d.order_count) || 0);



                            nNode.lines += (Number(d.line_count) || 0);



                            nNode.aso += (Number(d.aso_count) || 0);



                            nNode.order_skus += (Number(d.order_sku_cnt) || 0);



                            nNode.aso_skus += (Number(d.aso_sku_cnt) || 0);







                            if (!nNode.children[nv]) nNode.children[nv] = { so: 0, orders: 0, lines: 0, aso: 0, order_skus: 0, aso_skus: 0 };



                            nNode.children[nv].so += (Number(d.sellout_val) || 0);



                            nNode.children[nv].orders += (Number(d.order_count) || 0);



                            nNode.children[nv].lines += (Number(d.line_count) || 0);



                            nNode.children[nv].aso += (Number(d.aso_count) || 0);



                            nNode.children[nv].order_skus += (Number(d.order_sku_cnt) || 0);



                        });







                        const targetStorage = state.prodStorage || 'ALL';



                        const isExpProdSubFiltered = (state.prodCate !== 'ALL' || state.prodPh1 !== 'ALL' || state.prodPh2 !== 'ALL' || state.prodSku !== 'ALL');



                        if (!isExpProdSubFiltered && typeof GT_ASO_M !== 'undefined' && Array.isArray(GT_ASO_M)) {



                            const expAsoMap = {};



                            const expOrdersMap = {};



                            GT_ASO_M.filter(d => d.year === year && months.includes(d.month_num) && (d.storage || 'ALL') === targetStorage).forEach(d => {



                                expAsoMap[d.npp_code] = (expAsoMap[d.npp_code] || 0) + (Number(d.aso_count) || 0);



                                expOrdersMap[d.npp_code] = (expOrdersMap[d.npp_code] || 0) + (Number(d.order_count) || 0);



                            });



                            Object.values(gtHierTree).forEach(mNode => {



                                mNode.aso = 0; mNode.orders = 0;



                                Object.values(mNode.children).forEach(vNode => {



                                    vNode.aso = 0; vNode.orders = 0;



                                    Object.values(vNode.children).forEach(gNode => {



                                        gNode.aso = 0; gNode.orders = 0;



                                        Object.values(gNode.children).forEach(nNode => {



                                            if (expAsoMap[nNode.code] !== undefined) {



                                                nNode.aso = expAsoMap[nNode.code];



                                                nNode.orders = expOrdersMap[nNode.code];



                                            }



                                            gNode.aso += nNode.aso;



                                            gNode.orders += nNode.orders;



                                        });



                                        vNode.aso += gNode.aso;



                                        vNode.orders += gNode.orders;



                                    });



                                    mNode.aso += vNode.aso;



                                    mNode.orders += vNode.orders;



                                });



                            });



                        }







                        Object.keys(gtHierTree).sort().forEach(m => {



                            const mNode = gtHierTree[m];



                            let mSi = 0, mTargetSi = 0, mTgt = 0, mStk = 0, mMcp = 0;



                            mNode.npps.forEach(c => {



                                mSi += (nppSiMap[c] || 0);



                                mTargetSi += (nppTargetSiMap[c] || 0);



                                mTgt += (nppTargetMap[c] || 0);



                                mStk += (nppStockMap[c] || 0);



                                mMcp += (nppMcpMap[c] || 0);



                            });



                            const mAchSi = mTargetSi > 0 ? (mSi / mTargetSi) * 100 : 0;



                            const mAch = mTgt > 0 ? (mNode.so / mTgt) * 100 : 0;



                            const mDoi = calcLocalDoi(mStk, mNode.so);



                            const mStrike = mMcp > 0 ? (mNode.aso / mMcp) * 100 : 0;



                            const mDrop = mNode.orders > 0 ? mNode.so / mNode.orders : 0;



                            const mLppc = mNode.orders > 0 ? mNode.order_skus / mNode.orders : 0;



                            const mSkuStore = mNode.aso > 0 ? mNode.aso_skus / mNode.aso : 0;







                            rows2.push([



                                "[Cấp 1 - Miền]", m, "", "", "", "", "",



                                mSi, mTargetSi, Number(mAchSi.toFixed(1)), mNode.so, mTgt, Number(mAch.toFixed(1)),



                                mStk, Number(mDoi.toFixed(1)), mNode.aso, mMcp, Number(mStrike.toFixed(1)),



                                mNode.orders, Number(mDrop.toFixed(0)), Number(mLppc.toFixed(1)), Number(mSkuStore.toFixed(1))



                            ]);







                            Object.keys(mNode.children).sort().forEach(v => {



                                const vNode = mNode.children[v];



                                let vSi = 0, vTargetSi = 0, vTgt = 0, vStk = 0, vMcp = 0;



                                vNode.npps.forEach(c => {



                                    vSi += (nppSiMap[c] || 0);



                                    vTargetSi += (nppTargetSiMap[c] || 0);



                                    vTgt += (nppTargetMap[c] || 0);



                                    vStk += (nppStockMap[c] || 0);



                                    vMcp += (nppMcpMap[c] || 0);



                                });



                                const vAchSi = vTargetSi > 0 ? (vSi / vTargetSi) * 100 : 0;



                                const vAch = vTgt > 0 ? (vNode.so / vTgt) * 100 : 0;



                                const vDoi = calcLocalDoi(vStk, vNode.so);



                                const vStrike = vMcp > 0 ? (vNode.aso / vMcp) * 100 : 0;



                                const vDrop = vNode.orders > 0 ? vNode.so / vNode.orders : 0;



                                const vLppc = vNode.orders > 0 ? vNode.order_skus / vNode.orders : 0;



                                const vSkuStore = vNode.aso > 0 ? vNode.aso_skus / vNode.aso : 0;







                                rows2.push([



                                    "  [Cấp 2 - Vùng]", m, v, "", "", "", "",



                                    vSi, vTargetSi, Number(vAchSi.toFixed(1)), vNode.so, vTgt, Number(vAch.toFixed(1)),



                                    vStk, Number(vDoi.toFixed(1)), vNode.aso, vMcp, Number(vStrike.toFixed(1)),



                                    vNode.orders, Number(vDrop.toFixed(0)), Number(vLppc.toFixed(1)), Number(vSkuStore.toFixed(1))



                                ]);







                                Object.keys(vNode.children).sort().forEach(g => {



                                    const gNode = vNode.children[g];



                                    let gSi = 0, gTargetSi = 0, gTgt = 0, gStk = 0, gMcp = 0;



                                    gNode.npps.forEach(c => {



                                        gSi += (nppSiMap[c] || 0);



                                        gTargetSi += (nppTargetSiMap[c] || 0);



                                        gTgt += (nppTargetMap[c] || 0);



                                        gStk += (nppStockMap[c] || 0);



                                        gMcp += (nppMcpMap[c] || 0);



                                    });



                                    const gAchSi = gTargetSi > 0 ? (gSi / gTargetSi) * 100 : 0;



                                    const gAch = gTgt > 0 ? (gNode.so / gTgt) * 100 : 0;



                                    const gDoi = calcLocalDoi(gStk, gNode.so);



                                    const gStrike = gMcp > 0 ? (gNode.aso / gMcp) * 100 : 0;



                                    const gDrop = gNode.orders > 0 ? gNode.so / gNode.orders : 0;



                                    const gLppc = gNode.orders > 0 ? gNode.order_skus / gNode.orders : 0;



                                    const gSkuStore = gNode.aso > 0 ? gNode.aso_skus / gNode.aso : 0;







                                    rows2.push([



                                        "    [Cấp 3 - GSBH]", m, v, g, "", "", "",



                                        gSi, gTargetSi, Number(gAchSi.toFixed(1)), gNode.so, gTgt, Number(gAch.toFixed(1)),



                                        gStk, Number(gDoi.toFixed(1)), gNode.aso, gMcp, Number(gStrike.toFixed(1)),



                                        gNode.orders, Number(gDrop.toFixed(0)), Number(gLppc.toFixed(1)), Number(gSkuStore.toFixed(1))



                                    ]);







                                    Object.keys(gNode.children).sort().forEach(nKey => {



                                        const nNode = gNode.children[nKey];



                                        const nSi = nppSiMap[nNode.code] || 0;



                                        const nTargetSi = nppTargetSiMap[nNode.code] || 0;



                                        const nAchSi = nTargetSi > 0 ? (nSi / nTargetSi) * 100 : 0;



                                        const nTgt = nppTargetMap[nNode.code] || 0;



                                        const nStk = nppStockMap[nNode.code] || (nNode.so * 0.75);



                                        const nMcp = nppMcpMap[nNode.code] || Math.round(nNode.aso * 1.5);



                                        const nAch = nTgt > 0 ? (nNode.so / nTgt) * 100 : 0;



                                        const nDoi = calcLocalDoi(nStk, nNode.so);



                                        const nStrike = nMcp > 0 ? (nNode.aso / nMcp) * 100 : 0;



                                        const nDrop = nNode.orders > 0 ? nNode.so / nNode.orders : 0;



                                        const nLppc = nNode.orders > 0 ? nNode.order_skus / nNode.orders : 0;



                                        const nSkuStore = nNode.aso > 0 ? nNode.aso_skus / nNode.aso : 0;







                                        rows2.push([



                                            "      [Cấp 4 - NPP]", m, v, g, nNode.code, nNode.name, "",



                                            nSi, nTargetSi, Number(nAchSi.toFixed(1)), nNode.so, nTgt, Number(nAch.toFixed(1)),



                                            nStk, Number(nDoi.toFixed(1)), nNode.aso, nMcp, Number(nStrike.toFixed(1)),



                                            nNode.orders, Number(nDrop.toFixed(0)), Number(nLppc.toFixed(1)), Number(nSkuStore.toFixed(1))



                                        ]);







                                        Object.keys(nNode.children).sort().forEach(nv => {



                                            const nvNode = nNode.children[nv];



                                            const nvKey = nNode.code + '_' + nv;



                                            const nvTgt = nvbhTargetMap[nvKey] || 0;



                                            const nvAch = nvTgt > 0 ? (nvNode.so / nvTgt) * 100 : 0;



                                            const nvDrop = nvNode.orders > 0 ? nvNode.so / nvNode.orders : 0;



                                            const nvLppc = nvNode.orders > 0 ? nvNode.order_skus / nvNode.orders : 0;



                                            const nvSkuStore = nvNode.aso > 0 ? nvNode.aso_skus / nvNode.aso : 0;







                                            rows2.push([



                                                "        [Cấp 5 - NVBH]", m, v, g, nNode.code, nNode.name, nv,



                                                "", "", "", nvNode.so, nvTgt, Number(nvAch.toFixed(1)),



                                                "", "", nvNode.aso, "", "",



                                                nvNode.orders, Number(nvDrop.toFixed(0)), Number(nvLppc.toFixed(1)), Number(nvSkuStore.toFixed(1))



                                            ]);



                                        });



                                    });



                                });



                            });



                        });







                        const ws2 = XLSX.utils.aoa_to_sheet(rows2);



                        ws2['!cols'] = [



                            {wch: 20}, {wch: 12}, {wch: 16}, {wch: 22}, {wch: 14}, {wch: 28}, {wch: 22},



                            {wch: 16}, {wch: 16}, {wch: 14}, {wch: 16}, {wch: 16}, {wch: 14}, {wch: 16}, {wch: 12},



                            {wch: 14}, {wch: 14}, {wch: 14}, {wch: 14}, {wch: 16}, {wch: 14}, {wch: 14}



                        ];



                        XLSX.utils.book_append_sheet(wb, ws2, "Kenh_GT_5_Cap_RTM");







                    } else if (tabId === 'tab-mt') {



                        // ==================== TAB 3: MT ====================



                        const rows3 = createMetaRows("Kênh Hiện Đại (Modern Trade Key Accounts)");



                        rows3.push(["--- BẢNG TỔNG HỢP CHỈ SỐ KÊNH MT ---"]);



                        rows3.push(["Chỉ Số KPI", "Giá Trị Thực Hiện (VND)", "Kế Hoạch / Cùng Kỳ", "Tỷ Lệ Đạt / Tăng Trưởng (%)", "Đánh Giá"]);







                        const filterMt = d => {



                            if (d.year !== year || !months.includes(d.month_num)) return false;



                            if (state.mtSubChan !== 'ALL' && d.sub_channel !== state.mtSubChan) return false;



                            if (state.mtChain !== 'ALL' && d.key_account !== state.mtChain) return false;



                            if (state.mtCluster !== 'ALL' && d.cluster !== state.mtCluster) return false;



                            if (!matchProductRecord(d)) return false;



                            return true;



                        };







                        const mtFiltered = MT_TREE.filter(filterMt);



                        let mtSi = 0; mtFiltered.forEach(d => mtSi += (Number(d.sellin_val) || 0));



                        let mtLy = 0;



                        MT_TREE.filter(d => d.year === lyYear && months.includes(d.month_num) && (state.mtSubChan === 'ALL' || d.sub_channel === state.mtSubChan) && (state.mtChain === 'ALL' || d.key_account === state.mtChain) && matchProductRecord(d)).forEach(d => mtLy += (Number(d.sellin_val) || 0));



                        const mtGrowth = mtLy > 0 ? ((mtSi - mtLy) / mtLy) * 100 : 0;







                        let mtTgt = 0;



                        if (typeof TARGET_SELLIN !== 'undefined' && Array.isArray(TARGET_SELLIN)) {



                            TARGET_SELLIN.filter(d => d.channel === 'MT' && d.year === year && months.includes(d.month.substring(5, 7)) && matchProductTarget(d, validPh1s)).forEach(d => mtTgt += (Number(d.target_amt) || 0));



                        }



                        const mtAch = mtTgt > 0 ? (mtSi / mtTgt) * 100 : 0;







                        rows3.push(["Doanh Số Sell-in MT", mtSi, mtTgt, Number(mtAch.toFixed(1)), mtSi >= mtTgt ? 'Đạt' : 'Chưa đạt']);



                        rows3.push(["So Với Cùng Kỳ LY (" + lyYear + ")", mtSi, mtLy, Number(mtGrowth.toFixed(1)), mtGrowth >= 0 ? 'Tăng trưởng' : 'Suy giảm']);



                        rows3.push([]);







                        rows3.push(["--- CHI TIẾT THEO PHÂN KÊNH & CHUỖI SIÊU THỊ KEY ACCOUNTS MT ---"]);



                        rows3.push(["Cấp Độ", "Phân Kênh (Sub-channel)", "Chuỗi Siêu Thị / Key Account", "Doanh Số Sell-in (VND)", "Cùng Kỳ LY (VND)", "Tăng Trưởng YoY (%)", "Tỷ Trọng (%)"]);







                        const mtSubMap = {};



                        mtFiltered.forEach(d => {



                            const sc = d.sub_channel || 'Khác';



                            const ka = d.key_account || 'Khác';



                            if (!mtSubMap[sc]) mtSubMap[sc] = { val: 0, chains: {} };



                            mtSubMap[sc].val += (Number(d.sellin_val) || 0);



                            mtSubMap[sc].chains[ka] = (mtSubMap[sc].chains[ka] || 0) + (Number(d.sellin_val) || 0);



                        });







                        Object.keys(mtSubMap).sort().forEach(sc => {



                            const scNode = mtSubMap[sc];



                            const scShare = mtSi > 0 ? (scNode.val / mtSi) * 100 : 0;



                            rows3.push(["[Phân Kênh MT]", sc, "", scNode.val, "", "", Number(scShare.toFixed(1))]);



                            Object.keys(scNode.chains).sort((a,b) => scNode.chains[b] - scNode.chains[a]).forEach(ka => {



                                const kaVal = scNode.chains[ka];



                                const kaShare = mtSi > 0 ? (kaVal / mtSi) * 100 : 0;



                                rows3.push(["  ↳ Chuỗi Key Account", sc, ka, kaVal, "", "", Number(kaShare.toFixed(1))]);



                            });



                        });







                        const ws3 = XLSX.utils.aoa_to_sheet(rows3);



                        ws3['!cols'] = [{wch: 22}, {wch: 25}, {wch: 30}, {wch: 20}, {wch: 20}, {wch: 18}, {wch: 14}];



                        XLSX.utils.book_append_sheet(wb, ws3, "Kenh_MT_Key_Accounts");







                    } else if (tabId === 'tab-b2b') {



                        // ==================== TAB 4: B2B ====================



                        const rows4 = createMetaRows("Kênh B2B (Food Service & Nhà Hàng)");



                        rows4.push(["--- BẢNG TỔNG HỢP CHỈ SỐ KÊNH B2B ---"]);



                        rows4.push(["Chỉ Số KPI", "Giá Trị Thực Hiện (VND)", "Kế Hoạch / Cùng Kỳ", "Tỷ Lệ Đạt / Tăng Trưởng (%)", "Đánh Giá"]);







                        const filterB2b = d => {



                            if (d.year !== year || !months.includes(d.month_num)) return false;



                            if (state.b2bAcc !== 'ALL' && d.b2b_account !== state.b2bAcc) return false;



                            if (state.b2bCust !== 'ALL' && d.b2b_customer !== state.b2bCust) return false;



                            if (!matchProductRecord(d)) return false;



                            return true;



                        };







                        const b2bFiltered = B2B_TREE.filter(filterB2b);



                        let b2bSi = 0; b2bFiltered.forEach(d => b2bSi += (Number(d.sellin_val) || 0));



                        let b2bLy = 0;



                        B2B_TREE.filter(d => d.year === lyYear && months.includes(d.month_num) && matchProductRecord(d)).forEach(d => b2bLy += (Number(d.sellin_val) || 0));



                        const b2bGrowth = b2bLy > 0 ? ((b2bSi - b2bLy) / b2bLy) * 100 : 0;







                        let b2bTgt = 0;



                        if (typeof TARGET_SELLIN !== 'undefined' && Array.isArray(TARGET_SELLIN)) {



                            TARGET_SELLIN.filter(d => {



                                if (d.channel !== 'B2B' || d.year !== year || !months.includes(d.month.substring(5, 7))) return false;



                                if (state.b2bAcc !== 'ALL') {



                                    const accMatch = (d.account_npp && d.account_npp.toLowerCase().trim() === state.b2bAcc.toLowerCase().trim()) ||



                                                     (d.sub_channel && d.sub_channel.toLowerCase().trim() === state.b2bAcc.toLowerCase().trim());



                                    if (!accMatch) return false;



                                }



                                if (!matchProductTarget(d, validPh1s)) return false;



                                return true;



                            }).forEach(d => b2bTgt += (Number(d.target_amt) || 0));



                        }



                        const b2bAch = b2bTgt > 0 ? (b2bSi / b2bTgt) * 100 : 0;







                        rows4.push(["Doanh Số Sell-in B2B", b2bSi, b2bTgt, Number(b2bAch.toFixed(1)), b2bSi >= b2bTgt ? 'Đạt' : 'Chưa đạt']);



                        rows4.push(["So Với Cùng Kỳ LY (" + lyYear + ")", b2bSi, b2bLy, Number(b2bGrowth.toFixed(1)), b2bGrowth >= 0 ? 'Tăng trưởng' : 'Suy giảm']);



                        rows4.push([]);







                        // --- CHI TIẾT KHÁCH HÀNG DOANH NGHIỆP B2B FOOD SERVICE ---



                        rows4.push(["--- CHI TIẾT KHÁCH HÀNG DOANH NGHIỆP B2B FOOD SERVICE ---"]);



                        rows4.push(["Tên Khách Hàng / Account B2B", "Doanh Số Sell-in (VND)", "Cùng Kỳ LY (VND)", "Tăng Trưởng YoY (%)", "Tỷ Trọng (%)"]);







                        const b2bCustMap = {};



                        b2bFiltered.forEach(d => {



                            const cKey = d.b2b_customer || d.b2b_account || 'Khác';



                            b2bCustMap[cKey] = (b2bCustMap[cKey] || 0) + (Number(d.sellin_val) || 0);



                        });



                        const b2bLyMap = {};



                        B2B_TREE.filter(d => d.year === lyYear && months.includes(d.month_num) && matchProductRecord(d)).forEach(d => {



                            const cKey = d.b2b_customer || d.b2b_account || 'Khác';



                            b2bLyMap[cKey] = (b2bLyMap[cKey] || 0) + (Number(d.sellin_val) || 0);



                        });







                        Object.keys(b2bCustMap).sort((a,b) => b2bCustMap[b] - b2bCustMap[a]).forEach(cKey => {



                            const v = b2bCustMap[cKey];



                            const ly = b2bLyMap[cKey] || 0;



                            const gr = ly > 0 ? ((v - ly) / ly) * 100 : 0;



                            const sh = b2bSi > 0 ? (v / b2bSi) * 100 : 0;



                            rows4.push([cKey, v, ly, Number(gr.toFixed(1)), Number(sh.toFixed(1))]);



                        });







                        const ws4 = XLSX.utils.aoa_to_sheet(rows4);



                        ws4['!cols'] = [{wch: 35}, {wch: 22}, {wch: 22}, {wch: 18}, {wch: 14}];



                        XLSX.utils.book_append_sheet(wb, ws4, "Kenh_B2B_Food_Service");







                    } else if (tabId === 'tab-kr') {



                        // ==================== TAB 5: KR ====================



                        const rows5 = createMetaRows("Kênh KR (Key Retailer & Đại Lý Lớn)");



                        rows5.push(["--- BẢNG TỔNG HỢP CHỈ SỐ KÊNH KR ---"]);



                        rows5.push(["Chỉ Số KPI", "Giá Trị Thực Hiện (VND)", "Kế Hoạch / Cùng Kỳ", "Tỷ Lệ Đạt / Tăng Trưởng (%)", "Đánh Giá"]);







                        const filterKr = d => {



                            if (d.year !== year || !months.includes(d.month_num)) return false;



                            if (state.krChain !== 'ALL' && d.kr_chain !== state.krChain) return false;



                            if (!matchProductRecord(d)) return false;



                            return true;



                        };







                        const krFiltered = KR_TREE.filter(filterKr);



                        let krSi = 0; krFiltered.forEach(d => krSi += (Number(d.sellin_val) || 0));



                        let krLy = 0;



                        KR_TREE.filter(d => d.year === lyYear && months.includes(d.month_num) && matchProductRecord(d)).forEach(d => krLy += (Number(d.sellin_val) || 0));



                        const krGrowth = krLy > 0 ? ((krSi - krLy) / krLy) * 100 : 0;







                        let krTgt = 0;



                        if (typeof TARGET_SELLIN !== 'undefined' && Array.isArray(TARGET_SELLIN)) {



                            TARGET_SELLIN.filter(d => d.channel === 'KR' && d.year === year && months.includes(d.month.substring(5, 7)) && matchProductTarget(d, validPh1s)).forEach(d => krTgt += (Number(d.target_amt) || 0));



                        }



                        const krAch = krTgt > 0 ? (krSi / krTgt) * 100 : 0;







                        rows5.push(["Doanh Số Sell-in KR", krSi, krTgt, Number(krAch.toFixed(1)), krSi >= krTgt ? 'Đạt' : 'Chưa đạt']);



                        rows5.push(["So Với Cùng Kỳ LY (" + lyYear + ")", krSi, krLy, Number(krGrowth.toFixed(1)), krGrowth >= 0 ? 'Tăng trưởng' : 'Suy giảm']);



                        rows5.push([]);







                        // --- CHI TIẾT CÁC ĐẠI LÝ & ĐỐI TÁC TRỌNG ĐIỂM KEY RETAILER (KR) ---



                        rows5.push(["--- CHI TIẾT CÁC ĐẠI LÝ & ĐỐI TÁC TRỌNG ĐIỂM KEY RETAILER (KR) ---"]);



                        rows5.push(["Tên Đại Lý / Đối Tác KR", "Doanh Số Sell-in (VND)", "Cùng Kỳ LY (VND)", "Tăng Trưởng YoY (%)", "Tỷ Trọng (%)"]);







                        const krMap = {};



                        krFiltered.forEach(d => {



                            const cKey = d.kr_chain || 'Khác';



                            krMap[cKey] = (krMap[cKey] || 0) + (Number(d.sellin_val) || 0);



                        });



                        const krLyMap = {};



                        KR_TREE.filter(d => d.year === lyYear && months.includes(d.month_num) && matchProductRecord(d)).forEach(d => {



                            const cKey = d.kr_chain || 'Khác';



                            krLyMap[cKey] = (krLyMap[cKey] || 0) + (Number(d.sellin_val) || 0);



                        });







                        Object.keys(krMap).sort((a,b) => krMap[b] - krMap[a]).forEach(cKey => {



                            const v = krMap[cKey];



                            const ly = krLyMap[cKey] || 0;



                            const gr = ly > 0 ? ((v - ly) / ly) * 100 : 0;



                            const sh = krSi > 0 ? (v / krSi) * 100 : 0;



                            rows5.push([cKey, v, ly, Number(gr.toFixed(1)), Number(sh.toFixed(1))]);



                        });







                        const ws5 = XLSX.utils.aoa_to_sheet(rows5);



                        ws5['!cols'] = [{wch: 35}, {wch: 22}, {wch: 22}, {wch: 18}, {wch: 14}];



                        XLSX.utils.book_append_sheet(wb, ws5, "Kenh_KR_Key_Retailer");







                    } else {



                        // ==================== TAB 6: MASTER REPORTS ====================



                        const rows6 = createMetaRows("Tổng Hợp Dữ Liệu Bán Hàng FMCG (Master Data)");



                        rows6.push(["Tháng", "Kênh Bán Hàng", "Storage (Nhiệt độ)", "Ngành Hàng (Cate)", "Nhóm Hàng (PH1)", "Tiểu Nhóm (PH2)", "Doanh Số Sell-in (VND)"]);



                        SELLIN_M.filter(d => d.year === year && months.includes(d.month_num) && matchProductRecord(d)).forEach(d => {



                            rows6.push([d.month, d.channel, d.storage, d.cate, d.ph1, d.ph2, Number(d.sellin_val) || 0]);



                        });



                        const ws6 = XLSX.utils.aoa_to_sheet(rows6);



                        ws6['!cols'] = [{wch: 12}, {wch: 14}, {wch: 18}, {wch: 20}, {wch: 22}, {wch: 22}, {wch: 22}];



                        XLSX.utils.book_append_sheet(wb, ws6, "Master_Sellin_Data");



                    }







                    // Save workbook to file



                    XLSX.writeFile(wb, defaultFilename);



                    showExportToast("✅ Xuất file Excel thành công!", 3500);



                } catch (err) {



                    console.error("Excel export error:", err);



                    alert("Đã xảy ra lỗi khi tạo file Excel: " + err.message);



                }



            }, 120);



        }







        function exportCSV() {



            openExportModal();



        }







        window.addEventListener('resize', () => {



            [



                'chart-dash-daily', 'chart-dash-months',



                'chart-gt-fund-siso', 'chart-gt-fund-coverage', 'chart-gt-fund-dropsize-vpo', 'chart-gt-fund-strike-freq', 'chart-gt-fund-sku-rate',



                'chart-gt-prod-monthly-trend', 'chart-gt-prod-active-trend', 'chart-gt-prod-subchan', 'chart-gt-prod-top-nvbh',



                'chart-gt-route-strike-day', 'chart-gt-route-status-donut',



                'chart-gt-siso-doi', 'chart-gt-aso-mcp-trend', 'chart-gt-daily-siso',



                'chart-mt-chains', 'chart-mt-subchan', 'chart-mt-daily'



            ].forEach(id => {



                const dom = document.getElementById(id);



                if (dom) {



                    const c = echarts.getInstanceByDom(dom);



                    if (c) c.resize();



                }



            });



        });







        // =========================================================================



        // PURE JS SHA-256 (100% RELIABLE IN ANY BROWSER / FILE PROTOCOL)



        // =========================================================================