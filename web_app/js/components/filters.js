
        // DYNAMIC FILTER BARS INITIALIZATION & CASCADES



        // =========================================================================



        function initDropdowns() {



            // Tab 1: Commercial (Channel -> Sub-channel -> Account)



            updateYearDropdown();



            populateDashChannel();



            populateDashSubChannel();



            populateDashAccount();







            // Tab 2: Geo (Mien -> Vung -> GSBH -> NPP)



            populateGeoMien();



            populateGeoVung();



            populateGeoArea();



            populateGeoGsbh();



            populateGeoNpp();







            // Tab 3, 4, 5: Only populate upfront if already cached in RAM (otherwise populated on tab switch)
            if (_payloadCache['MT_TREE'] && _payloadCache['MT_STORE_DATA']) populateMtFilters();
            if (_payloadCache['B2B_TREE']) populateB2bFilters();
            if (_payloadCache['KR_TREE']) populateKrFilters();



            populateRepChannel();







            // Persistent Product



            populateProdStorage();



            populateProdCate();



            populateProdPh1();



            populateProdPh2();



            populateProdSku();



        }







        // --- TAB 1 (COMMERCIAL HIERARCHY CASCADES) ---



        function updateYearDropdown() {



            const sel = document.getElementById('sel-year');



            if (sel) {



                const cur = sel.value || state.year || '2026';



                sel.innerHTML = '<option value="2026">' + t('year_2026') + '</option>' +



                                '<option value="2025">' + t('year_2025') + '</option>';



                sel.value = cur;



            }



        }







        function populateDashChannel() {



            const sel = document.getElementById('sel-dash-channel');



            if (sel) {



                const cur = state.dashChannel || 'ALL';



                sel.innerHTML = '<option value="ALL">' + t('opt_all_channels') + '</option>' +



                                '<option value="GT">' + t('nav_gt') + '</option>' +



                                '<option value="MT">' + t('nav_mt') + '</option>' +



                                '<option value="B2B">' + t('nav_b2b') + '</option>' +



                                '<option value="KR">' + t('nav_kr') + '</option>';



                sel.value = cur;



            }



        }







        function populateRepChannel() {



            const sel = document.getElementById('sel-rep-channel');



            if (sel) {



                const cur = state.repChannel || 'ALL';



                sel.innerHTML = '<option value="ALL">' + t('opt_all_channels') + '</option>' +



                                '<option value="GT">' + t('nav_gt') + '</option>' +



                                '<option value="MT">' + t('nav_mt') + '</option>' +



                                '<option value="B2B">' + t('nav_b2b') + '</option>' +



                                '<option value="KR">' + t('nav_kr') + '</option>';



                sel.value = cur;



            }



        }







        function populateDashSubChannel() {



            const sel = document.getElementById('sel-dash-subchannel');



            if (!sel) return;



            const set = new Set();



            DIM_COMM_HIER.forEach(d => {



                if (state.dashChannel === 'ALL' || d.channel === state.dashChannel) {



                    if (d.sub_channel && d.sub_channel !== 'Khác') set.add(d.sub_channel);



                }



            });



            sel.innerHTML = '<option value="ALL">' + t('opt_all_subchannel') + '</option>' + Array.from(set).sort().map(sc => '<option value="' + sc + '">' + sc + '</option>').join('');



            if (!set.has(state.dashSubChannel)) state.dashSubChannel = 'ALL';



            sel.value = state.dashSubChannel;



        }







        function populateDashAccount() {



            const sel = document.getElementById('sel-dash-account');



            if (!sel) return;



            const set = new Set();



            DIM_COMM_HIER.forEach(d => {



                if (state.dashChannel !== 'ALL' && d.channel !== state.dashChannel) return;



                if (state.dashSubChannel !== 'ALL' && d.sub_channel !== state.dashSubChannel) return;



                if (d.account_name) set.add(d.account_name);



            });



            sel.innerHTML = '<option value="ALL">' + t('opt_all_account') + '</option>' + Array.from(set).sort().map(acc => '<option value="' + acc + '">' + acc + '</option>').join('');



            if (!set.has(state.dashAccount)) state.dashAccount = 'ALL';



            sel.value = state.dashAccount;



        }







        function onDashChannelChange() {



            state.dashChannel = document.getElementById('sel-dash-channel')?.value || 'ALL';



            state.dashSubChannel = 'ALL';



            state.dashAccount = 'ALL';



            populateDashSubChannel();



            populateDashAccount();



            onFilterChange();



        }







        function onDashSubChannelChange() {



            state.dashSubChannel = document.getElementById('sel-dash-subchannel')?.value || 'ALL';



            state.dashAccount = 'ALL';



            populateDashAccount();



            onFilterChange();



        }







        // --- TAB 2 (GEO GT CASCADES) ---



        function populateGeoMien() {



            const sel = document.getElementById('sel-geo-mien');



            if (!sel) return;



            const c = (typeof window !== 'undefined' && window.userScopeConstraint) ? window.userScopeConstraint : null;



            if (c && c.mien) {



                sel.innerHTML = `<option value="${c.mien}">${c.mien}</option>`;



                sel.value = c.mien;



                sel.disabled = true;



                state.geoMien = c.mien;



                return;



            }



            const set = new Set();



            DIM_GEO_HIER.forEach(d => { if (d.mien) set.add(d.mien); });



            sel.innerHTML = '<option value="ALL">' + t('opt_all_mien') + '</option>' + Array.from(set).sort().map(m => '<option value="' + m + '">' + m + '</option>').join('');



            sel.disabled = false;



            sel.value = state.geoMien || 'ALL';



        }







        function populateGeoVung() {



            const sel = document.getElementById('sel-geo-vung');



            if (!sel) return;



            const c = (typeof window !== 'undefined' && window.userScopeConstraint) ? window.userScopeConstraint : null;



            if (c && c.vung) {



                sel.innerHTML = `<option value="${c.vung}">${c.vung}</option>`;



                sel.value = c.vung;



                sel.disabled = true;



                state.geoVung = c.vung;



                return;



            }



            const set = new Set();



            const activeMien = (c && c.mien) ? c.mien : state.geoMien;



            DIM_GEO_HIER.forEach(d => {



                if (activeMien === 'ALL' || d.mien === activeMien) {



                    if (d.vung) set.add(d.vung);



                }



            });



            const sortedVungs = Array.from(set).sort((a,b) => a.localeCompare(b, 'vi'));



            const allLabel = (c && c.mien) ? `Tất cả Vùng (${c.mien})` : t('opt_all_vung');



            sel.innerHTML = `<option value="ALL">${allLabel}</option>` + sortedVungs.map(v => `<option value="${v}">${v}</option>`).join('');



            sel.disabled = false;



            if (!set.has(state.geoVung)) state.geoVung = 'ALL';



            sel.value = state.geoVung;



        }







        function populateGeoArea() {
            const sel = document.getElementById('sel-geo-area');
            if (!sel) return;

            const c = (typeof window !== 'undefined' && window.userScopeConstraint) ? window.userScopeConstraint : null;
            if (c && c.area) {
                sel.innerHTML = `<option value="${c.area}">${c.area}</option>`;
                sel.value = c.area;
                sel.disabled = true;
                state.geoArea = c.area;
                return;
            }

            const set = new Set();
            const activeMien = (c && c.mien) ? c.mien : state.geoMien;
            const activeVung = (c && c.vung) ? c.vung : state.geoVung;

            const geoList = (typeof DIM_GEO_HIER !== 'undefined' && Array.isArray(DIM_GEO_HIER) && DIM_GEO_HIER.length > 0) ? DIM_GEO_HIER : [];
            geoList.forEach(d => {
                if (activeMien !== 'ALL' && d.mien !== activeMien) return;
                if (activeVung !== 'ALL' && d.vung !== activeVung) return;
                if (d.area) set.add(d.area);
            });

            if (set.size === 0 && typeof STATIC_OFFICE_GEO_MAP !== 'undefined') {
                Object.values(STATIC_OFFICE_GEO_MAP).forEach(d => {
                    if (activeMien !== 'ALL' && d.mien !== activeMien) return;
                    if (activeVung !== 'ALL' && d.vung !== activeVung) return;
                    if (d.area) set.add(d.area);
                });
            }

            const sortedAreas = Array.from(set).sort((a,b) => a.localeCompare(b, 'vi'));
            const allLabel = (activeVung !== 'ALL') ? `Tất cả Area (${activeVung})` : ((activeMien !== 'ALL') ? `Tất cả Area (${activeMien})` : 'Tất cả Area');
            sel.innerHTML = `<option value="ALL">${allLabel}</option>` + sortedAreas.map(a => `<option value="${a}">${a}</option>`).join('');
            sel.disabled = false;

            if (!set.has(state.geoArea)) state.geoArea = 'ALL';
            sel.value = state.geoArea;
        }

        function populateGeoGsbh() {



            const sel = document.getElementById('sel-geo-gsbh');



            if (!sel) return;



            const c = (typeof window !== 'undefined' && window.userScopeConstraint) ? window.userScopeConstraint : null;



            if (c && c.gsbh) {



                sel.innerHTML = `<option value="${c.gsbh}">${c.gsbh}</option>`;



                sel.value = c.gsbh;



                sel.disabled = true;



                state.geoGsbh = c.gsbh;



                return;



            }



            const set = new Set();



            const activeMien = (c && c.mien) ? c.mien : state.geoMien;



            const activeVung = (c && c.vung) ? c.vung : state.geoVung;



            const activeArea = (c && c.area) ? c.area : state.geoArea;



            const geoListGsbh = (typeof DIM_GEO_HIER !== 'undefined' && Array.isArray(DIM_GEO_HIER) && DIM_GEO_HIER.length > 0) ? DIM_GEO_HIER : [];
            geoListGsbh.forEach(d => {
                if (activeMien !== 'ALL' && d.mien !== activeMien) return;
                if (activeVung !== 'ALL' && d.vung !== activeVung) return;
                if (activeArea !== 'ALL' && (typeof matchAreaRecord === 'function' ? !matchAreaRecord(d, activeArea) : d.area !== activeArea)) return;
                if (d.gsbh) set.add(d.gsbh);
            });

            if (set.size === 0 && typeof STATIC_OFFICE_GEO_MAP !== 'undefined') {
                Object.keys(STATIC_OFFICE_GEO_MAP).forEach(officeName => {
                    const d = STATIC_OFFICE_GEO_MAP[officeName];
                    if (activeMien !== 'ALL' && d.mien !== activeMien) return;
                    if (activeVung !== 'ALL' && d.vung !== activeVung) return;
                    if (activeArea !== 'ALL' && d.area !== activeArea) return;
                    set.add(officeName);
                });
            }

            const sortedGsbh = Array.from(set).sort((a,b) => a.localeCompare(b, 'vi'));



            const allLabel = (activeVung !== 'ALL') ? `Tất cả Office (${activeVung})` : ((activeMien !== 'ALL') ? `Tất cả Office (${activeMien})` : (t('opt_all_gsbh') || 'Tất cả Office'));



            sel.innerHTML = `<option value="ALL">${allLabel}</option>` + sortedGsbh.map(g => `<option value="${g}">${g}</option>`).join('');



            sel.disabled = false;



            if (!set.has(state.geoGsbh)) state.geoGsbh = 'ALL';



            sel.value = state.geoGsbh;



        }







        function populateGeoNpp() {



            const sel = document.getElementById('sel-geo-npp');



            if (!sel) return;



            const c = (typeof window !== 'undefined' && window.userScopeConstraint) ? window.userScopeConstraint : null;



            if (c && (c.nppCode || c.nppName)) {



                const nppVal = c.nppCode || c.nppName;



                const nppLbl = c.nppCode ? `${c.nppCode} - ${c.nppName || c.nppCode}` : c.nppName;



                sel.innerHTML = `<option value="${nppVal}">${nppLbl}</option>`;



                sel.value = nppVal;



                sel.disabled = true;



                state.geoNpp = nppVal;



                return;



            }



            const nppMap = {};



            const activeMien = (c && c.mien) ? c.mien : state.geoMien;



            const activeVung = (c && c.vung) ? c.vung : state.geoVung;



            const activeArea = (c && c.area) ? c.area : state.geoArea;



            const activeGsbh = (c && c.gsbh) ? c.gsbh : state.geoGsbh;



            DIM_GEO_HIER.forEach(d => {



                if (activeMien !== 'ALL' && d.mien !== activeMien) return;



                if (activeVung !== 'ALL' && d.vung !== activeVung) return;



                if (activeArea !== 'ALL' && d.area !== activeArea) return;



                if (activeGsbh !== 'ALL' && (typeof matchGsbhRecord === 'function' ? !matchGsbhRecord(d, activeGsbh) : d.gsbh !== activeGsbh)) return;



                if (d.npp_code) nppMap[d.npp_code] = d.npp_name ? `${d.npp_code} - ${d.npp_name}` : d.npp_code;



            });



            const sortedCodes = Object.keys(nppMap).sort((a,b) => (nppMap[a] || '').localeCompare(nppMap[b] || '', 'vi'));



            const allLabel = (activeGsbh !== 'ALL') ? `Tất cả NPP (${activeGsbh})` : ((activeVung !== 'ALL') ? `Tất cả NPP (${activeVung})` : t('opt_all_npp'));



            sel.innerHTML = `<option value="ALL">${allLabel}</option>` + sortedCodes.map(code => `<option value="${code}">${nppMap[code]}</option>`).join('');



            sel.disabled = false;



            if (!nppMap[state.geoNpp]) state.geoNpp = 'ALL';



            sel.value = state.geoNpp;



        }







        function populateGeoNvbh() {



            const sel = document.getElementById('sel-geo-nvbh');



            if (!sel) return;



            const c = (typeof window !== 'undefined' && window.userScopeConstraint) ? window.userScopeConstraint : null;



            const activeMien = (c && c.mien) ? c.mien : state.geoMien;



            const activeVung = (c && c.vung) ? c.vung : state.geoVung;



            const activeGsbh = (c && c.gsbh) ? c.gsbh : state.geoGsbh;



            const activeNpp = (c && (c.nppCode || c.nppName)) ? (c.nppCode || c.nppName) : state.geoNpp;







            const nvbhSet = new Set();



            if (typeof GT_TREE !== 'undefined' && Array.isArray(GT_TREE)) {



                GT_TREE.forEach(d => {



                    if (activeMien !== 'ALL' && d.mien !== activeMien) return;



                    if (activeVung !== 'ALL' && d.vung !== activeVung) return;



                    if (activeGsbh !== 'ALL' && (typeof matchGsbhRecord === 'function' ? !matchGsbhRecord(d, activeGsbh) : (d.gsbh_name !== activeGsbh && d.gsbh !== activeGsbh))) return;



                    if (activeNpp !== 'ALL' && d.npp_code !== activeNpp) return;



                    if (d.nvbh_name && d.nvbh_name !== 'Chưa phân công NVBH' && d.nvbh_name.trim() !== '') {



                        nvbhSet.add(d.nvbh_name.trim());



                    }



                });



            }



            const sortedNvbh = Array.from(nvbhSet).sort((a,b) => a.localeCompare(b, 'vi'));



            let opts = '<option value="ALL">' + (sortedNvbh.length > 0 ? ('Tất cả NVBH (' + sortedNvbh.length + ')') : 'Tất cả NVBH') + '</option>';



            sortedNvbh.forEach(n => {



                opts += '<option value="' + n + '">' + n + '</option>';



            });



            sel.innerHTML = opts;



            if (!nvbhSet.has(state.geoNvbh)) state.geoNvbh = 'ALL';



            sel.value = state.geoNvbh;



        }







        function onGeoMienChange() {



            const c = (typeof window !== 'undefined' && window.userScopeConstraint) ? window.userScopeConstraint : null;



            state.geoMien = (c && c.mien) ? c.mien : (document.getElementById('sel-geo-mien')?.value || 'ALL');



            if (!c || !c.vung) state.geoVung = 'ALL';



            if (!c || !c.area) state.geoArea = 'ALL';



            if (!c || !c.gsbh) state.geoGsbh = 'ALL';



            if (!c || (!c.nppCode && !c.nppName)) state.geoNpp = 'ALL';



            state.geoNvbh = 'ALL';



            populateGeoVung();



            populateGeoArea();



            populateGeoGsbh();



            populateGeoNpp();



            populateGeoNvbh();



            onFilterChange();



        }







        function onGeoVungChange() {



            const c = (typeof window !== 'undefined' && window.userScopeConstraint) ? window.userScopeConstraint : null;



            if (c && c.mien) state.geoMien = c.mien;



            state.geoVung = (c && c.vung) ? c.vung : (document.getElementById('sel-geo-vung')?.value || 'ALL');



            if (!c || !c.area) state.geoArea = 'ALL';



            if (!c || !c.gsbh) state.geoGsbh = 'ALL';



            if (!c || (!c.nppCode && !c.nppName)) state.geoNpp = 'ALL';



            state.geoNvbh = 'ALL';



            populateGeoArea();



            populateGeoGsbh();



            populateGeoNpp();



            populateGeoNvbh();



            onFilterChange();



        }







        function onGeoAreaChange() {



            const c = (typeof window !== 'undefined' && window.userScopeConstraint) ? window.userScopeConstraint : null;



            if (c && c.mien) state.geoMien = c.mien;



            if (c && c.vung) state.geoVung = c.vung;



            state.geoArea = (c && c.area) ? c.area : (document.getElementById('sel-geo-area')?.value || 'ALL');



            if (!c || !c.gsbh) state.geoGsbh = 'ALL';



            if (!c || (!c.nppCode && !c.nppName)) state.geoNpp = 'ALL';



            state.geoNvbh = 'ALL';



            populateGeoGsbh();



            populateGeoNpp();



            populateGeoNvbh();



            onFilterChange();



        }







        function onGeoGsbhChange() {



            const c = (typeof window !== 'undefined' && window.userScopeConstraint) ? window.userScopeConstraint : null;



            if (c && c.mien) state.geoMien = c.mien;



            if (c && c.vung) state.geoVung = c.vung;



            if (c && c.area) state.geoArea = c.area;



            state.geoGsbh = (c && c.gsbh) ? c.gsbh : (document.getElementById('sel-geo-gsbh')?.value || 'ALL');



            if (!c || (!c.nppCode && !c.nppName)) state.geoNpp = 'ALL';



            state.geoNvbh = 'ALL';



            populateGeoNpp();



            populateGeoNvbh();



            onFilterChange();



        }







        function onGeoNppChange() {



            const c = (typeof window !== 'undefined' && window.userScopeConstraint) ? window.userScopeConstraint : null;



            if (c && c.mien) state.geoMien = c.mien;



            if (c && c.vung) state.geoVung = c.vung;



            if (c && c.gsbh) state.geoGsbh = c.gsbh;



            state.geoNpp = (c && (c.nppCode || c.nppName)) ? (c.nppCode || c.nppName) : (document.getElementById('sel-geo-npp')?.value || 'ALL');



            state.geoNvbh = 'ALL';



            populateGeoNvbh();



            onFilterChange();



        }







        function onGeoNvbhChange() {



            state.geoNvbh = document.getElementById('sel-geo-nvbh')?.value || 'ALL';



            onFilterChange();



        }







        // --- TAB 3 (MT CASCADES) ---



        // =========================================================================



        // GLOBAL MT STORE SEARCHABLE COMBOBOX & ROBUST MATCHING ENGINE



        // =========================================================================



        let currentGlobalMtStores = [];







        function isStoreMatch(d, target) {



            if (!target || target === 'ALL') return true;



            const t = String(target).trim().toLowerCase();



            const idStr = String(d.id || '').trim().toLowerCase();



            const nameStr = String(d.name || '').trim().toLowerCase();



            return idStr === t || nameStr === t;



        }







        function getMtStoreNameById(id) {



            if (!id || id === 'ALL') return '';



            if (typeof MT_STORE_DATA !== 'undefined' && Array.isArray(MT_STORE_DATA)) {



                const found = MT_STORE_DATA.find(d => isStoreMatch(d, id));



                if (found && found.name) return found.name;



            }



            return id;



        }







        function populateGlobalMtStoreList() {



            if (typeof MT_STORE_DATA === 'undefined' || !Array.isArray(MT_STORE_DATA)) return;







            const storeMap = new Map();



            MT_STORE_DATA.forEach(d => {



                if (!d.name && !d.id) return;



                if (state.mtSubChan !== 'ALL' && d.sc !== state.mtSubChan) return;



                if (state.mtChain !== 'ALL' && d.acc !== state.mtChain) return;



                if (state.mtCluster !== 'ALL' && d.cl !== state.mtCluster) return;







                const key = String(d.id || d.name);



                if (!storeMap.has(key)) {



                    storeMap.set(key, {



                        id: String(d.id || ''),



                        name: String(d.name || d.id || ''),



                        acc: d.acc || 'Other Chain',



                        sc: d.sc || 'MT',



                        cl: d.cl || ''



                    });



                }



            });







            currentGlobalMtStores = Array.from(storeMap.values()).sort((a, b) => (a.name || '').localeCompare(b.name || '', 'vi'));







            // Check if selected store exists in current subset



            if (state.mtStore && state.mtStore !== 'ALL') {



                const exists = currentGlobalMtStores.some(s => isStoreMatch(s, state.mtStore));



                if (!exists) {



                    state.mtStore = 'ALL';



                    const inp = document.getElementById('inp-mt-store');



                    if (inp) inp.value = '';



                }



            }







            updateGlobalMtStoreUI();



        }







        function updateGlobalMtStoreUI() {



            const inp = document.getElementById('inp-mt-store');



            const btnClear = document.getElementById('btn-clear-global-mt-store');



            const iconArrow = document.getElementById('icon-mt-store-arrow');







            const hasSelection = !!(state.mtStore && state.mtStore !== 'ALL');







            if (inp) {



                if (hasSelection) {



                    const st = currentGlobalMtStores.find(s => isStoreMatch(s, state.mtStore));



                    inp.value = st ? st.name : getMtStoreNameById(state.mtStore);



                    inp.classList.add('bg-sky-50', 'border-sky-400', 'text-sky-900', 'font-bold');



                    inp.classList.remove('bg-white', 'border-slate-300');



                    inp.title = "Đang lọc: " + inp.value;



                } else {



                    if (document.activeElement !== inp) {



                        inp.value = '';



                        inp.placeholder = currentGlobalMtStores.length > 0 ? `-- Tất cả Siêu Thị (${currentGlobalMtStores.length}) --` : '-- Tất cả Siêu Thị --';



                    }



                    inp.classList.remove('bg-sky-50', 'border-sky-400', 'text-sky-900', 'font-bold');



                    inp.classList.add('bg-white', 'border-slate-300');



                    inp.title = "Chọn hoặc nhập tìm kiếm tên/mã siêu thị";



                }



            }







            if (btnClear && iconArrow) {



                if (hasSelection || (inp && inp.value.trim().length > 0)) {



                    btnClear.classList.remove('hidden');



                    btnClear.classList.add('flex');



                    iconArrow.classList.add('hidden');



                } else {



                    btnClear.classList.add('hidden');



                    btnClear.classList.remove('flex');



                    iconArrow.classList.remove('hidden');



                }



            }



        }







        function positionMtStoreDropdown() {



            const dd = document.getElementById('dropdown-global-mt-store');



            const inp = document.getElementById('inp-mt-store');



            if (!dd || !inp || dd.classList.contains('hidden')) return;







            const rect = inp.getBoundingClientRect();



            dd.style.position = 'fixed';



            dd.style.top = (rect.bottom + 4) + 'px';



            dd.style.left = Math.min(rect.left, window.innerWidth - 350) + 'px';



            dd.style.width = Math.max(rect.width, 340) + 'px';



            dd.style.zIndex = '99999';



        }







        function openMtStoreDropdown() {



            const dd = document.getElementById('dropdown-global-mt-store');



            const inp = document.getElementById('inp-mt-store');



            if (!dd || !inp) return;







            // Ensure dd is in document.body so overflow:hidden on parents never clips it



            if (dd.parentElement !== document.body) {



                document.body.appendChild(dd);



            }







            positionMtStoreDropdown();



            renderMtStoreDropdownItems(inp.value);



            dd.classList.remove('hidden');



        }







        function closeMtStoreDropdown() {



            const dd = document.getElementById('dropdown-global-mt-store');



            if (dd) dd.classList.add('hidden');



        }







        function renderMtStoreDropdownItems(query) {



            const dd = document.getElementById('dropdown-global-mt-store');



            if (!dd) return;







            const q = (query || '').toLowerCase().trim();



            let filtered = currentGlobalMtStores;



            if (q && !q.startsWith('--')) {



                filtered = currentGlobalMtStores.filter(s => 



                    (s.name || '').toLowerCase().includes(q) ||



                    (s.id || '').toLowerCase().includes(q) ||



                    (s.acc || '').toLowerCase().includes(q) ||



                    (s.cl || '').toLowerCase().includes(q)



                );



            }







            let html = '';



            const isAllSelected = (!state.mtStore || state.mtStore === 'ALL');



            html += `<div class="px-3 py-2 hover:bg-sky-50 cursor-pointer font-bold flex items-center justify-between transition-colors border-b border-slate-100 ${isAllSelected ? 'bg-sky-50 text-sky-800' : 'text-slate-700'}" onclick="selectGlobalMtStore('ALL', '-- Tất cả Siêu Thị --')">



                <span>-- Tất cả Siêu Thị (${currentGlobalMtStores.length}) --</span>



                ${isAllSelected ? '<span class="text-sky-600 font-bold">✓</span>' : ''}



            </div>`;







            if (filtered.length === 0) {



                html += '<div class="px-3 py-4 text-slate-400 italic text-center">Không tìm thấy siêu thị phù hợp với từ khóa "' + escapeAttr(q) + '"</div>';



            } else {



                filtered.slice(0, 100).forEach(s => {



                    const isSelected = isStoreMatch(s, state.mtStore);



                    html += `<div class="px-3 py-2 hover:bg-sky-50 cursor-pointer transition-colors border-b border-slate-50 ${isSelected ? 'bg-sky-50 border-l-4 border-sky-500' : ''}" onclick="selectGlobalMtStore('${escapeAttr(s.id)}', '${escapeAttr(s.name)}')">



                        <div class="font-semibold text-slate-800 leading-snug line-clamp-1 ${isSelected ? 'text-sky-900 font-bold' : ''}">${escapeAttr(s.name)}</div>



                        <div class="text-[10.5px] text-slate-400 font-mono mt-0.5 flex items-center justify-between">



                            <span>Mã: <strong class="text-slate-600">${escapeAttr(s.id)}</strong></span>



                            <span class="text-sky-700 font-sans font-medium">${escapeAttr(s.acc || '')} • ${escapeAttr(s.cl || '')}</span>



                        </div>



                    </div>`;



                });



                if (filtered.length > 100) {



                    html += `<div class="px-2 py-1.5 text-[10.5px] text-slate-400 text-center bg-slate-50 font-medium">Hiển thị 100 / ${filtered.length} siêu thị (nhập thêm từ khóa để lọc nhanh)</div>`;



                }



            }







            dd.innerHTML = html;



        }







        function handleMtStoreInput(val) {



            openMtStoreDropdown();



            renderMtStoreDropdownItems(val);



            updateGlobalMtStoreUI();



        }







        function handleMtStoreKeydown(e) {



            if (e.key === 'Enter') {



                const inp = document.getElementById('inp-mt-store');



                const q = (inp ? inp.value : '').toLowerCase().trim();



                const matches = currentGlobalMtStores.filter(s => 



                    (s.name || '').toLowerCase().includes(q) ||



                    (s.id || '').toLowerCase().includes(q)



                );



                if (matches.length > 0) {



                    selectGlobalMtStore(matches[0].id, matches[0].name);



                } else if (!q) {



                    selectGlobalMtStore('ALL', '-- Tất cả Siêu Thị --');



                }



                closeMtStoreDropdown();



            } else if (e.key === 'Escape') {



                closeMtStoreDropdown();



            }



        }







        function selectGlobalMtStore(storeId, storeName) {



            state.mtStore = String(storeId);



            closeMtStoreDropdown();







            // Auto-align upstream filters to the selected store



            if (storeId !== 'ALL' && typeof MT_STORE_DATA !== 'undefined' && Array.isArray(MT_STORE_DATA)) {



                const st = MT_STORE_DATA.find(d => isStoreMatch(d, storeId));



                if (st) {



                    if (st.acc && state.mtChain === 'ALL') {



                        state.mtChain = st.acc;



                        const selCh = document.getElementById('sel-mt-chain');



                        if (selCh) selCh.value = st.acc;



                    }



                    if (st.sc && state.mtSubChan === 'ALL') {



                        state.mtSubChan = st.sc;



                        const selSub = document.getElementById('sel-mt-subchan');



                        if (selSub) selSub.value = st.sc;



                    }



                }



            }







            updateGlobalMtStoreUI();



            onFilterChange();



        }







        function clearGlobalMtStore(e) {



            if (e) {



                e.stopPropagation();



                e.preventDefault();



            }



            state.mtStore = 'ALL';



            const inp = document.getElementById('inp-mt-store');



            if (inp) inp.value = '';



            closeMtStoreDropdown();



            updateGlobalMtStoreUI();



            onFilterChange();



        }







        // Reposition dropdown on scroll/resize



        window.addEventListener('scroll', positionMtStoreDropdown, true);



        window.addEventListener('resize', positionMtStoreDropdown);







        // Click outside listener



        document.addEventListener('click', function(e) {



            const wrap = document.getElementById('wrap-global-mt-store');



            const dd = document.getElementById('dropdown-global-mt-store');



            const inp = document.getElementById('inp-mt-store');



            if (wrap && dd && !wrap.contains(e.target) && !dd.contains(e.target)) {



                closeMtStoreDropdown();



                if (inp && state.mtStore === 'ALL' && inp.value.trim().length > 0) {



                    inp.value = '';



                    updateGlobalMtStoreUI();



                }



            }



        });







                







        function populateMtFilters() {



            const selSub = document.getElementById('sel-mt-subchan');



            const selChain = document.getElementById('sel-mt-chain');



            const selCluster = document.getElementById('sel-mt-cluster');



            if (!selSub || !selChain) return;







            const c = (typeof window !== 'undefined' && window.userScopeConstraint) ? window.userScopeConstraint : null;







            const scSet = new Set();



            const chSet = new Set();



            const clSet = new Set();







            MT_TREE.forEach(d => {



                if (d.sub_channel) scSet.add(d.sub_channel);



                const matchSub = (state.mtSubChan === 'ALL' || d.sub_channel === state.mtSubChan);







                // Chains that match Subchannel



                if (matchSub && d.key_account && d.key_account !== 'Other Chain') {



                    chSet.add(d.key_account);



                }



            });







            // Extract Clusters from MT_STORE_DATA



            if (typeof MT_STORE_DATA !== 'undefined' && Array.isArray(MT_STORE_DATA)) {



                MT_STORE_DATA.forEach(d => {



                    const matchSub = (state.mtSubChan === 'ALL' || d.sc === state.mtSubChan);



                    const matchChain = (state.mtChain === 'ALL' || d.acc === state.mtChain);



                    if (matchSub && matchChain && d.cl && d.cl !== 'Khác') {



                        clSet.add(d.cl);



                    }



                });



            }







            // Subchannel options



            if (c && c.mtSubChan) {



                selSub.innerHTML = `<option value="${c.mtSubChan}">${c.mtSubChan}</option>`;



                selSub.value = c.mtSubChan;



                selSub.disabled = true;



                state.mtSubChan = c.mtSubChan;



            } else {



                selSub.innerHTML = '<option value="ALL">' + (t('opt_all_subchannel') || 'Tất cả Phân Khúc') + '</option>' + Array.from(scSet).sort().map(sc => '<option value="' + sc + '">' + sc + '</option>').join('');



                selSub.disabled = false;



                selSub.value = state.mtSubChan;



            }







            // Chain options



            if (c && c.mtChain) {



                selChain.innerHTML = `<option value="${c.mtChain}">${c.mtChain}</option>`;



                selChain.value = c.mtChain;



                selChain.disabled = true;



                state.mtChain = c.mtChain;



            } else {



                selChain.innerHTML = '<option value="ALL">' + (t('opt_all_chains_mt') || 'Tất cả Chuỗi MT') + '</option>' + Array.from(chSet).sort().map(ch => '<option value="' + ch + '">' + ch + '</option>').join('');



                selChain.disabled = false;



                if (chSet.has(state.mtChain)) {



                    selChain.value = state.mtChain;



                } else {



                    state.mtChain = 'ALL';



                    selChain.value = 'ALL';



                }



            }







            // Cluster options



            if (selCluster) {



                selCluster.innerHTML = '<option value="ALL">' + (t('opt_all_clusters_mt') || 'Tất cả Khu Vực') + '</option>' + Array.from(clSet).sort().map(cl => '<option value="' + cl + '">' + cl + '</option>').join('');



                if (clSet.has(state.mtCluster)) {



                    selCluster.value = state.mtCluster;



                } else {



                    state.mtCluster = 'ALL';



                    selCluster.value = 'ALL';



                }



            }







            populateGlobalMtStoreList();



        }







                function onMtSubchanChange() {



            const c = (typeof window !== 'undefined' && window.userScopeConstraint) ? window.userScopeConstraint : null;



            state.mtSubChan = (c && c.mtSubChan) ? c.mtSubChan : (document.getElementById('sel-mt-subchan')?.value || 'ALL');



            state.mtStore = 'ALL';



            populateMtFilters();



            onFilterChange();



        }







        function onMtClusterChange() {



            state.mtCluster = document.getElementById('sel-mt-cluster')?.value || 'ALL';



            state.mtStore = 'ALL';



            populateMtFilters();



            onFilterChange();



        }







        function onMtChainChange() {



            const c = (typeof window !== 'undefined' && window.userScopeConstraint) ? window.userScopeConstraint : null;



            state.mtChain = (c && c.mtChain) ? c.mtChain : (document.getElementById('sel-mt-chain')?.value || 'ALL');



            state.mtStore = 'ALL';



            populateMtFilters();



            onFilterChange();



        }







        // --- TAB 4 (B2B CASCADES) ---



        function populateB2bFilters() {



            const selAcc = document.getElementById('sel-b2b-acc');



            const selCust = document.getElementById('sel-b2b-cust');



            if (!selAcc || !selCust) return;







            const c = (typeof window !== 'undefined' && window.userScopeConstraint) ? window.userScopeConstraint : null;







            const accSet = new Set();



            const custSet = new Set();



            B2B_TREE.forEach(d => {



                if (d.b2b_account) accSet.add(d.b2b_account);



                const activeAcc = (c && c.b2bAcc) ? c.b2bAcc : state.b2bAcc;



                if (activeAcc === 'ALL' || d.b2b_account === activeAcc) {



                    const custName = d.b2b_customer || d.b2b_account;



                    if (custName) custSet.add(custName);



                }



            });







            if (c && c.b2bAcc) {



                selAcc.innerHTML = `<option value="${c.b2bAcc}">${c.b2bAcc}</option>`;



                selAcc.value = c.b2bAcc;



                selAcc.disabled = true;



                state.b2bAcc = c.b2bAcc;



            } else {



                selAcc.innerHTML = '<option value="ALL">' + t('opt_all_subgroup_b2b') + '</option>' + Array.from(accSet).sort().map(a => '<option value="' + a + '">' + a + '</option>').join('');



                selAcc.disabled = false;



                selAcc.value = state.b2bAcc;



            }







            if (c && c.b2bCust) {



                selCust.innerHTML = `<option value="${c.b2bCust}">${c.b2bCust}</option>`;



                selCust.value = c.b2bCust;



                selCust.disabled = true;



                state.b2bCust = c.b2bCust;



            } else {



                selCust.innerHTML = '<option value="ALL">' + t('opt_all_cust_b2b') + '</option>' + Array.from(custSet).sort().map(c => '<option value="' + c + '">' + c + '</option>').join('');



                selCust.disabled = false;



                selCust.value = state.b2bCust;



            }



        }







        function onB2bAccChange() {



            const c = (typeof window !== 'undefined' && window.userScopeConstraint) ? window.userScopeConstraint : null;



            state.b2bAcc = (c && c.b2bAcc) ? c.b2bAcc : (document.getElementById('sel-b2b-acc')?.value || 'ALL');



            if (!c || !c.b2bCust) state.b2bCust = 'ALL';



            populateB2bFilters();



            onFilterChange();



        }







        // --- TAB 5 (KR CASCADES) ---



        function populateKrFilters() {



            const selSub = document.getElementById('sel-kr-subchan');



            const selChain = document.getElementById('sel-kr-chain');



            if (!selSub || !selChain) return;







            const c = (typeof window !== 'undefined' && window.userScopeConstraint) ? window.userScopeConstraint : null;







            const subSet = new Set();



            const chainSet = new Set();



            KR_TREE.forEach(d => {



                if (d.sub_channel) subSet.add(d.sub_channel);



                const activeSub = (c && c.krSubChan) ? c.krSubChan : state.krSubChan;



                if (activeSub === 'ALL' || d.sub_channel === activeSub) {



                    if (d.kr_chain) chainSet.add(d.kr_chain);



                }



            });







            if (c && c.krSubChan) {



                selSub.innerHTML = `<option value="${c.krSubChan}">${c.krSubChan}</option>`;



                selSub.value = c.krSubChan;



                selSub.disabled = true;



                state.krSubChan = c.krSubChan;



            } else {



                selSub.innerHTML = '<option value="ALL">' + t('opt_all_subchannel') + '</option>' + Array.from(subSet).sort().map(s => '<option value="' + s + '">' + s + '</option>').join('');



                selSub.disabled = false;



                selSub.value = state.krSubChan;



            }







            if (c && c.krChain) {



                selChain.innerHTML = `<option value="${c.krChain}">${c.krChain}</option>`;



                selChain.value = c.krChain;



                selChain.disabled = true;



                state.krChain = c.krChain;



            } else {



                selChain.innerHTML = '<option value="ALL">' + t('opt_all_chains_kr') + '</option>' + Array.from(chainSet).sort().map(c => '<option value="' + c + '">' + c + '</option>').join('');



                selChain.disabled = false;



                selChain.value = state.krChain;



            }



        }







        function onKrSubchanChange() {



            const c = (typeof window !== 'undefined' && window.userScopeConstraint) ? window.userScopeConstraint : null;



            state.krSubChan = (c && c.krSubChan) ? c.krSubChan : (document.getElementById('sel-kr-subchan')?.value || 'ALL');



            if (!c || !c.krChain) state.krChain = 'ALL';



            populateKrFilters();



            populateRepChannel();



            onFilterChange();



        }







        // --- PERSISTENT PRODUCT CASCADES ---



        function populateProdStorage() {



            const sel = document.getElementById('sel-prod-storage');



            if (!sel) return;



            const set = new Set();



            DIM_PROD_HIER.forEach(d => { if (d.storage) set.add(d.storage); });



            sel.innerHTML = '<option value="ALL">' + t('opt_all_storage') + '</option>' + Array.from(set).sort().map(s => '<option value="' + s + '">' + s + '</option>').join('');



            sel.value = state.prodStorage;



        }







        function populateProdCate() {



            const sel = document.getElementById('sel-prod-cate');



            if (!sel) return;



            const set = new Set();



            DIM_PROD_HIER.forEach(d => {



                if (state.prodStorage === 'ALL' || d.storage === state.prodStorage) {



                    if (d.cate) set.add(d.cate);



                }



            });



            sel.innerHTML = '<option value="ALL">' + t('opt_all_cate') + '</option>' + Array.from(set).sort().map(c => '<option value="' + c + '">' + c + '</option>').join('');



            if (!set.has(state.prodCate)) state.prodCate = 'ALL';



            sel.value = state.prodCate;



        }







        function populateProdPh1() {



            const sel = document.getElementById('sel-prod-ph1');



            if (!sel) return;



            const set = new Set();



            DIM_PROD_HIER.forEach(d => {



                if (state.prodStorage !== 'ALL' && d.storage !== state.prodStorage) return;



                if (state.prodCate !== 'ALL' && d.cate !== state.prodCate) return;



                if (d.ph1) set.add(d.ph1);



            });



            sel.innerHTML = '<option value="ALL">' + t('opt_all_ph1') + '</option>' + Array.from(set).sort().map(p => '<option value="' + p + '">' + p + '</option>').join('');



            if (!set.has(state.prodPh1)) state.prodPh1 = 'ALL';



            sel.value = state.prodPh1;



        }







        function populateProdPh2() {



            const sel = document.getElementById('sel-prod-ph2');



            if (!sel) return;



            const set = new Set();



            DIM_PROD_HIER.forEach(d => {



                if (state.prodStorage !== 'ALL' && d.storage !== state.prodStorage) return;



                if (state.prodCate !== 'ALL' && d.cate !== state.prodCate) return;



                if (state.prodPh1 !== 'ALL' && d.ph1 !== state.prodPh1) return;



                if (d.ph2) set.add(d.ph2);



            });



            sel.innerHTML = '<option value="ALL">' + t('opt_all_ph2') + '</option>' + Array.from(set).sort().map(p => '<option value="' + p + '">' + p + '</option>').join('');



            if (!set.has(state.prodPh2)) state.prodPh2 = 'ALL';



            sel.value = state.prodPh2;



        }







        function populateProdSku() {



            const sel = document.getElementById('sel-prod-sku');



            if (!sel) return;



            const set = new Set();



            if (typeof DIM_PROD_HIER !== 'undefined' && Array.isArray(DIM_PROD_HIER)) {



                DIM_PROD_HIER.forEach(d => {



                    if (state.prodStorage !== 'ALL' && d.storage !== state.prodStorage) return;



                    if (state.prodCate !== 'ALL' && d.cate !== state.prodCate) return;



                    if (state.prodPh1 !== 'ALL' && d.ph1 !== state.prodPh1) return;



                    if (state.prodPh2 !== 'ALL' && d.ph2 !== state.prodPh2) return;



                    if (d.sku_name) set.add(d.sku_name);



                });



            }



            sel.innerHTML = '<option value="ALL">' + (t('opt_all_sku') || 'Tất cả Sku name') + '</option>' + Array.from(set).sort().map(p => '<option value="' + escapeAttr(p) + '">' + p + '</option>').join('');



            if (!set.has(state.prodSku)) state.prodSku = 'ALL';



            sel.value = state.prodSku;



        }







        function onProdStorageChange() {



            state.prodStorage = document.getElementById('sel-prod-storage')?.value || 'ALL';



            state.prodCate = 'ALL';



            state.prodPh1 = 'ALL';



            state.prodPh2 = 'ALL';



            state.prodSku = 'ALL';



            populateProdCate();



            populateProdPh1();



            populateProdPh2();



            populateProdSku();



            onFilterChange();



        }







        function onProdCateChange() {



            state.prodCate = document.getElementById('sel-prod-cate')?.value || 'ALL';



            state.prodPh1 = 'ALL';



            state.prodPh2 = 'ALL';



            state.prodSku = 'ALL';



            populateProdPh1();



            populateProdPh2();



            populateProdSku();



            onFilterChange();



        }







        function onProdPh1Change() {



            state.prodPh1 = document.getElementById('sel-prod-ph1')?.value || 'ALL';



            state.prodPh2 = 'ALL';



            state.prodSku = 'ALL';



            populateProdPh2();



            populateProdSku();



            onFilterChange();



        }







        function onProdPh2Change() {



            state.prodPh2 = document.getElementById('sel-prod-ph2')?.value || 'ALL';



            state.prodSku = document.getElementById('sel-prod-sku')?.value || 'ALL';



            state.prodSku = 'ALL';



            populateProdSku();



            onFilterChange();



        }







        function onProdSkuChange() {



            state.prodSku = document.getElementById('sel-prod-sku')?.value || 'ALL';



            onFilterChange();



        }







        function onYearChange() {



            state.year = document.getElementById('sel-year')?.value || '2026';



            onFilterChange();



        }







        function toggleMonth(mNum) {



            state.lastToggledMonth = mNum;



            const idx = state.selectedMonths.indexOf(mNum);



            if (idx > -1) {



                if (state.selectedMonths.length > 1) {



                    state.selectedMonths.splice(idx, 1);



                }



            } else {



                state.selectedMonths.push(mNum);



            }



            state.selectedMonths.sort();



            if (typeof gtRouteActiveMonth !== 'undefined') {



                if (state.selectedMonths.length === 1) {



                    gtRouteActiveMonth = (state.year || '2026') + '-' + state.selectedMonths[0];



                } else if (state.selectedMonths.includes(mNum)) {



                    gtRouteActiveMonth = (state.year || '2026') + '-' + mNum;



                } else if (state.selectedMonths.length > 0) {



                    gtRouteActiveMonth = (state.year || '2026') + '-' + state.selectedMonths[state.selectedMonths.length - 1];



                }



            }



            updateMonthChipsUI();



            updatePeriodNote();



            renderActiveTab();



        }







        function selectAllMonths() {



            state.selectedMonths = ['01','02','03','04','05','06','07','08','09','10','11','12'];



            updateMonthChipsUI();



            updatePeriodNote();



            renderActiveTab();



        }







        function resetMonthSelection() {



            const defM = getDefaultCurrentMonth();



            state.selectedMonths = [defM];



            state.lastToggledMonth = defM;



            if (typeof gtRouteActiveMonth !== 'undefined') {



                gtRouteActiveMonth = (state.year || '2026') + '-' + defM;



            }



            updateMonthChipsUI();



            updatePeriodNote();



            renderActiveTab();



        }







        function updateMonthChipsUI() {



            for (let i = 1; i <= 12; i++) {



                const mNum = i.toString().padStart(2, '0');



                const btn = document.getElementById('mbtn-' + mNum);



                if (btn) {



                    btn.innerText = state.currentLang === 'ko' ? (i + '월') : (state.currentLang === 'en' ? ('M' + i) : ('T' + i));



                    if (state.selectedMonths.includes(mNum)) {



                        btn.className = 'month-chip active';



                    } else {



                        btn.className = 'month-chip';



                    }



                }



            }



            const defM = getDefaultCurrentMonth();



            const resetBtn = document.getElementById('btn-reset-month');



            if (resetBtn) {



                const rText = state.currentLang === 'ko' ? ('초기화 (' + parseInt(defM) + '월)') : (state.currentLang === 'en' ? ('Reset (M' + parseInt(defM) + ')') : ('Reset (T' + parseInt(defM) + ')'));



                resetBtn.innerText = rText;



            }



            updatePeriodNote();



        }







        function updatePeriodNote() {



            const mLabels = state.selectedMonths.map(m => (state.currentLang === 'ko' ? (parseInt(m) + '월') : ('T' + parseInt(m)))).join(', ');



            const noteDom = document.getElementById('filter-period-note');



            if (noteDom) {



                let scopeStr = (state.currentLang === 'ko' ? '4대 채널 (GT, MT, B2B, KR)' : (state.currentLang === 'en' ? '4 Channels (GT, MT, B2B, KR)' : '4 Kênh (GT, MT, B2B, KR)'));



                if (state.activeTab === 'tab-overview' && state.dashChannel !== 'ALL') {



                    scopeStr = state.dashChannel + ' Channel';



                    if (state.dashAccount !== 'ALL') scopeStr += ' - ' + state.dashAccount;



                } else if (state.activeTab === 'tab-gt') {



                    scopeStr = (state.currentLang === 'ko' ? 'GT 채널 (RTM)' : (state.currentLang === 'en' ? 'GT Channel (RTM)' : 'Kênh GT RTM'));



                } else if (state.activeTab === 'tab-mt') {



                    scopeStr = 'MT Channel' + (state.mtChain !== 'ALL' ? ' (' + state.mtChain + ')' : '');



                } else if (state.activeTab === 'tab-b2b') {



                    scopeStr = 'B2B Channel' + (state.b2bAcc !== 'ALL' ? ' (' + state.b2bAcc + ')' : '');



                } else if (state.activeTab === 'tab-kr') {



                    scopeStr = 'KR Channel' + (state.krChain !== 'ALL' ? ' (' + state.krChain + ')' : '');



                }







                let textStr = '';



                if (state.selectedMonths.length === 12) {



                    textStr = t('viewing_prefix') + t('all_12_months') + state.year + ' (' + scopeStr + ')';



                } else {



                    textStr = t('viewing_prefix') + t('month_prefix') + mLabels + '/' + state.year + ' (' + scopeStr + ')';



                }



                noteDom.innerHTML = '<span>⏱️</span> <span>' + textStr + '</span>';



            }



        }







        function onFilterChange() {



            state.year = document.getElementById('sel-year')?.value || '2026';



            



            const c = (typeof window !== 'undefined' && window.userScopeConstraint) ? window.userScopeConstraint : null;







            // Tab 1 filters



            if (c && c.channel && c.channel !== 'ALL') {



                state.dashChannel = c.channel;



            } else {



                state.dashChannel = document.getElementById('sel-dash-channel')?.value || 'ALL';



            }



            state.dashSubChannel = document.getElementById('sel-dash-subchannel')?.value || 'ALL';



            state.dashAccount = document.getElementById('sel-dash-account')?.value || 'ALL';







            // Tab 2 filters



            state.geoMien = (c && c.mien) ? c.mien : (document.getElementById('sel-geo-mien')?.value || 'ALL');



            state.geoVung = (c && c.vung) ? c.vung : (document.getElementById('sel-geo-vung')?.value || 'ALL');



            state.geoArea = (c && c.area) ? c.area : (document.getElementById('sel-geo-area')?.value || 'ALL');



            state.geoGsbh = (c && c.gsbh) ? c.gsbh : (document.getElementById('sel-geo-gsbh')?.value || 'ALL');



            state.geoNpp = (c && (c.nppCode || c.nppName)) ? (c.nppCode || c.nppName) : (document.getElementById('sel-geo-npp')?.value || 'ALL');



            state.geoNvbh = document.getElementById('sel-geo-nvbh')?.value || 'ALL';







            // Tab 3 filters



            state.mtSubChan = (c && c.mtSubChan) ? c.mtSubChan : (document.getElementById('sel-mt-subchan')?.value || 'ALL');



            state.mtChain = (c && c.mtChain) ? c.mtChain : (document.getElementById('sel-mt-chain')?.value || 'ALL');



            state.mtCluster = document.getElementById('sel-mt-cluster')?.value || 'ALL';







            // Tab 4 filters



            state.b2bAcc = (c && c.b2bAcc) ? c.b2bAcc : (document.getElementById('sel-b2b-acc')?.value || 'ALL');



            state.b2bCust = (c && c.b2bCust) ? c.b2bCust : (document.getElementById('sel-b2b-cust')?.value || 'ALL');







            // Tab 5 filters



            state.krSubChan = (c && c.krSubChan) ? c.krSubChan : (document.getElementById('sel-kr-subchan')?.value || 'ALL');



            state.krChain = (c && c.krChain) ? c.krChain : (document.getElementById('sel-kr-chain')?.value || 'ALL');







            // Tab 6 filters



            state.repChannel = document.getElementById('sel-rep-channel')?.value || 'ALL';







            // Product filters



            state.prodStorage = document.getElementById('sel-prod-storage')?.value || 'ALL';



            state.prodCate = document.getElementById('sel-prod-cate')?.value || 'ALL';



            state.prodPh1 = document.getElementById('sel-prod-ph1')?.value || 'ALL';



            state.prodPh2 = document.getElementById('sel-prod-ph2')?.value || 'ALL';







            updatePeriodNote();



            renderActiveTab();



        }







        function switchTab(tabId) {



            if (typeof isTabAllowedForUser === 'function' && !isTabAllowedForUser(tabId, currentUser)) {



                const allowed = (typeof getAllowedTabsForUser === 'function') ? getAllowedTabsForUser(currentUser) : ['tab-gt'];



                tabId = allowed[0] || 'tab-gt';



            }



            state.activeTab = tabId;



            try {



                if (window.history && window.history.replaceState) {



                    window.history.replaceState(null, '', '#' + tabId);



                }



            } catch (e) {}







            // 1. Hide all tab view containers



            ['tab-overview-view', 'tab-gt-view', 'tab-mt-view', 'tab-b2b-view', 'tab-kr-view', 'tab-reports-view'].forEach(id => {



                const el = document.getElementById(id);



                if (el) el.classList.add('hidden');



            });







            // 2. Deactivate sidebar items



            ['nav-tab-overview', 'nav-tab-gt', 'nav-tab-mt', 'nav-tab-b2b', 'nav-tab-kr', 'nav-tab-reports'].forEach(id => {



                const el = document.getElementById(id);



                if (el) el.classList.remove('active');



            });











            // 2c. Deactivate & activate mobile drawer navigation items



            ['m-nav-tab-overview', 'm-nav-tab-gt', 'm-nav-tab-mt', 'm-nav-tab-b2b', 'm-nav-tab-kr', 'm-nav-tab-reports'].forEach(id => {



                const el = document.getElementById(id);



                if (el) el.classList.remove('active');



            });



            const mNavBtn = document.getElementById('m-nav-' + tabId);



            if (mNavBtn) mNavBtn.classList.add('active');







            // 3. Show active tab container



            const target = document.getElementById(tabId + '-view');



            if (target) target.classList.remove('hidden');







            const navBtn = document.getElementById('nav-' + tabId);



            if (navBtn) navBtn.classList.add('active');







            // GT Sidebar Tree Menu Auto Expand / Collapse (Desktop)



            const gtTree = document.getElementById('nav-gt-tree');



            const gtChevron = document.getElementById('nav-gt-chevron');



            if (tabId === 'tab-gt') {



                if (gtTree) gtTree.classList.remove('hidden');



                if (gtChevron) gtChevron.classList.add('rotate-180');



                if (typeof updateGtTreeSubMenuUI === 'function') updateGtTreeSubMenuUI();



            } else {



                if (gtTree) gtTree.classList.add('hidden');



                if (gtChevron) gtChevron.classList.remove('rotate-180');



            }







            // GT Mobile Drawer Tree Menu Auto Expand / Collapse (Mobile)



            const mGtTree = document.getElementById('m-nav-gt-tree');



            const mGtChevron = document.getElementById('m-nav-gt-chevron');



            if (tabId === 'tab-gt') {



                if (mGtTree) mGtTree.classList.remove('hidden');



                if (mGtChevron) mGtChevron.classList.add('rotate-180');



            } else {



                if (mGtTree) mGtTree.classList.add('hidden');



                if (mGtChevron) mGtChevron.classList.remove('rotate-180');



            }







            // 4. DYNAMIC FILTER BAR SWAP: Show appropriate filter cluster on Top Bar



            ['filter-cluster-tab1', 'filter-cluster-tab2', 'filter-cluster-tab3', 'filter-cluster-tab4', 'filter-cluster-tab5', 'filter-cluster-tab6'].forEach(fcId => {



                const fc = document.getElementById(fcId);



                if (fc) fc.classList.add('hidden');



            });







            if (tabId === 'tab-overview') document.getElementById('filter-cluster-tab1')?.classList.remove('hidden');



            else if (tabId === 'tab-gt') document.getElementById('filter-cluster-tab2')?.classList.remove('hidden');



            else if (tabId === 'tab-mt') {



                document.getElementById('filter-cluster-tab3')?.classList.remove('hidden');



                if (_payloadCache['MT_TREE'] && _payloadCache['MT_STORE_DATA']) {
                    if (typeof populateMtFilters === 'function') populateMtFilters();
                    if (typeof updateGlobalMtStoreUI === 'function') updateGlobalMtStoreUI();
                }



            }



            else if (tabId === 'tab-b2b') document.getElementById('filter-cluster-tab4')?.classList.remove('hidden');



            else if (tabId === 'tab-kr') document.getElementById('filter-cluster-tab5')?.classList.remove('hidden');



            else if (tabId === 'tab-reports') document.getElementById('filter-cluster-tab6')?.classList.remove('hidden');







            if (tabId !== 'tab-gt') {



                const topFilter = document.getElementById('top-header-filter') || document.querySelector('.top-header-filter');



                if (topFilter) topFilter.classList.remove('hidden');



                const gtBreadcrumb = document.getElementById('gt-header-breadcrumb-row');



                if (gtBreadcrumb) gtBreadcrumb.classList.remove('hidden');



                const tabGtView = document.getElementById('tab-gt-view');



                if (tabGtView) {



                    tabGtView.classList.remove('space-y-2', 'pt-1.5', 'px-2', 'lg:px-3');



                    tabGtView.classList.add('space-y-5', 'pt-3', 'px-4', 'lg:px-8');



                }



            }







            updateHeaderTitles();







            updatePeriodNote();



            renderActiveTab();



            setTimeout(resizeAllCharts, 60);
            setTimeout(resizeAllCharts, 280);



            if (typeof TableCustomizer !== 'undefined') {



                setTimeout(() => TableCustomizer.initAll(), 120);



            }



            setTimeout(() => {



                const monthStrip = document.getElementById('month-strip');



                const activeM = document.querySelector('.month-chip.active');



                if (monthStrip && activeM) {



                    const scrollPos = activeM.offsetLeft - (monthStrip.clientWidth / 2) + (activeM.clientWidth / 2);



                    monthStrip.scrollTo({ left: Math.max(0, scrollPos), behavior: 'smooth' });



                }



            }, 300);



        }







        let _renderingTabPromise = null;
        let _renderTabSeq = 0;

        function _executeActiveTabRenderNow() {
            if (state.activeTab === 'tab-gt' && typeof populateGeoNvbh === 'function' && _payloadCache['GT_TREE']) {
                const nvbhSel = document.getElementById('sel-geo-nvbh');
                if (!nvbhSel || nvbhSel.options.length <= 1) populateGeoNvbh();
            } else if (state.activeTab === 'tab-mt' && typeof populateMtFilters === 'function') {
                if (typeof window.refreshDeferredScopeConstraints === 'function' && typeof currentUser !== 'undefined' && currentUser) {
                    window.refreshDeferredScopeConstraints(currentUser);
                }
                const mtSel = document.getElementById('sel-mt-subchan');
                const constrainedMtChain = window.userScopeConstraint && window.userScopeConstraint.mtChain;
                if (!mtSel || mtSel.options.length <= 1 || (constrainedMtChain && state.mtChain !== constrainedMtChain)) {
                    populateMtFilters();
                    if (typeof updateGlobalMtStoreUI === 'function') updateGlobalMtStoreUI();
                }
            } else if (state.activeTab === 'tab-b2b' && typeof populateB2bFilters === 'function') {
                const b2bSel = document.getElementById('sel-b2b-acc');
                if (!b2bSel || b2bSel.options.length <= 1) populateB2bFilters();
            } else if (state.activeTab === 'tab-kr' && typeof populateKrFilters === 'function') {
                if (typeof window.refreshDeferredScopeConstraints === 'function' && typeof currentUser !== 'undefined' && currentUser) {
                    window.refreshDeferredScopeConstraints(currentUser);
                }
                const krSel = document.getElementById('sel-kr-subchan');
                const constrainedKrChain = window.userScopeConstraint && window.userScopeConstraint.krChain;
                if (!krSel || krSel.options.length <= 1 || (constrainedKrChain && state.krChain !== constrainedKrChain)) {
                    populateKrFilters();
                }
            }

            if (state.activeTab === 'tab-overview') renderTabOverview();
            else if (state.activeTab === 'tab-gt') renderTabGt();
            else if (state.activeTab === 'tab-mt') renderTabMt();
            else if (state.activeTab === 'tab-b2b') renderTabB2b();
            else if (state.activeTab === 'tab-kr') renderTabKr();

            if (typeof window._saveInstantUiSnapshot === 'function') {
                setTimeout(() => window._saveInstantUiSnapshot(), 10);
            }
            if (!window._isStage1Render) {
                if (typeof TableCustomizer !== 'undefined') {
                    setTimeout(() => TableCustomizer.initAll(), 80);
                }
                if (typeof window.startEnterpriseBackgroundPreload === 'function') {
                    setTimeout(() => window.startEnterpriseBackgroundPreload(), 2500);
                }
            }
        }

        function renderActiveTab() {
            const seq = ++_renderTabSeq;
            const tabId = state.activeTab || 'tab-gt';
            const stage1Base = (typeof TAB_STAGE1_PAYLOADS !== 'undefined' && TAB_STAGE1_PAYLOADS[tabId]) ? TAB_STAGE1_PAYLOADS[tabId] : [];
            const subTabExtra = (tabId === 'tab-gt' && typeof GT_SUBTAB_PAYLOADS !== 'undefined' && GT_SUBTAB_PAYLOADS[state.gtSubTab])
                ? GT_SUBTAB_PAYLOADS[state.gtSubTab]
                : [];
            const stage1Payloads = Array.from(new Set([...stage1Base, ...subTabExtra]));
            const stage2Payloads = (typeof TAB_STAGE2_PAYLOADS !== 'undefined' && TAB_STAGE2_PAYLOADS[tabId]) ? TAB_STAGE2_PAYLOADS[tabId] : [];

            const missingStage1 = stage1Payloads.filter(p => !_payloadCache[p]);
            const missingStage2 = stage2Payloads.filter(p => !_payloadCache[p]);

            if (missingStage1.length === 0 && missingStage2.length === 0) {
                window._isStage1Render = false;
                _executeActiveTabRenderNow();
                return;
            }

            // Restore cached KPI snapshot immediately (0.01s) if available
            if (typeof window._restoreInstantUiSnapshot === 'function') {
                window._restoreInstantUiSnapshot();
            }

            (async () => {
                // STAGE 1: Load lightweight summary cubes (~180ms) with high priority (concurrency=6)
                if (missingStage1.length > 0 && typeof window.preloadPayloadsParallel === 'function') {
                    _showFastLoader(15);
                    await window.preloadPayloadsParallel(stage1Payloads, (pct) => _showFastLoader(Math.round(pct * 0.6)), 6, () => seq !== _renderTabSeq);
                }
                if (seq !== _renderTabSeq) return;

                if (!window._dropdownsInitialized && _payloadCache['DIM_COMM_HIER'] && _payloadCache['DIM_PROD_HIER'] && _payloadCache['DIM_GEO_HIER']) {
                    window._dropdownsInitialized = true;
                    try {
                        if (typeof window.refreshDeferredScopeConstraints === 'function' && typeof currentUser !== 'undefined' && currentUser) {
                            window.refreshDeferredScopeConstraints(currentUser);
                        }
                        initDropdowns();
                        applyUrlParams();
                    } catch (_) {}
                }

                const stillMissingStage2 = stage2Payloads.filter(p => !_payloadCache[p]);
                if (stillMissingStage2.length > 0) {
                    window._isStage1Render = true;
                    try {
                        _executeActiveTabRenderNow();
                        setTimeout(resizeAllCharts, 50);
                    } finally {
                        window._isStage1Render = false;
                    }
                    _hideFastLoader();

                    // STAGE 2: Load deep daily/SKU cubes using only 2 connections so 4 connections stay free for instant tab switching!
                    if (typeof window.preloadPayloadsParallel === 'function') {
                        await window.preloadPayloadsParallel(stage2Payloads, null, 2, () => seq !== _renderTabSeq);
                    }
                    if (seq !== _renderTabSeq) return;
                    window._isStage1Render = false;
                    _executeActiveTabRenderNow();
                    setTimeout(resizeAllCharts, 60);
            setTimeout(resizeAllCharts, 280);
                } else {
                    _hideFastLoader();
                    window._isStage1Render = false;
                    _executeActiveTabRenderNow();
                    setTimeout(resizeAllCharts, 60);
            setTimeout(resizeAllCharts, 280);
                }
            })();
        }

        // =========================================================================
        // SHARED MoM MTD CALCULATION & RENDERING HELPERS



        // =========================================================================



        function calculateMoMMtdForChannel(channelName) {



            let curMtd = 0, priorMtd = 0, momPct = null, priorLabel = '', maxDay = 0;



            if (typeof DAILY_DATA === 'undefined' || !Array.isArray(DAILY_DATA) || state.selectedMonths.length !== 1) {



                return { momPct: null, curMtd: 0, priorMtd: 0, priorLabel: '', maxDay: 0 };



            }



            const selM = state.selectedMonths[0];



            const curYearNum = parseInt(state.year, 10);



            const curMonthNum = parseInt(selM, 10);



            const curMonthPrefix = state.year + '-' + selM;







            DAILY_DATA.forEach(d => {



                const dt = String(d.date_val || '');



                if (dt.startsWith(curMonthPrefix) && (Number(d.daily_sellin) || 0) > 0) {



                    const dayNum = parseInt(dt.substring(8, 10), 10);



                    if (dayNum > maxDay) maxDay = dayNum;



                }



            });







            if (maxDay === 0) return { momPct: null, curMtd: 0, priorMtd: 0, priorLabel: '', maxDay: 0 };







            const priorMonthNum = curMonthNum === 1 ? 12 : curMonthNum - 1;



            const priorYearNum = curMonthNum === 1 ? curYearNum - 1 : curYearNum;



            const priorMonthPrefix = priorYearNum + '-' + String(priorMonthNum).padStart(2, '0');



            priorLabel = 'T' + priorMonthNum;







            DAILY_DATA.forEach(d => {



                if (channelName && channelName !== 'ALL' && d.channel !== channelName) return;



                const dt = String(d.date_val || '');



                const v = Number(d.daily_sellin) || 0;



                if (v === 0) return;



                if (!matchProductRecord(d)) return;







                const dayNum = parseInt(dt.substring(8, 10), 10);



                if (dayNum > maxDay) return;







                if (dt.startsWith(curMonthPrefix)) {



                    curMtd += v;



                } else if (dt.startsWith(priorMonthPrefix)) {



                    priorMtd += v;



                }



            });







            if (priorMtd > 0) {



                momPct = ((curMtd - priorMtd) / priorMtd) * 100;



            }



            return { momPct, curMtd, priorMtd, priorLabel, maxDay };



        }







        function calculateMoMMtdForGtSellout() {



            let curMtd = 0, priorMtd = 0, momPct = null, priorLabel = '', maxDay = 0;



            if (typeof GT_DAILY_SO === 'undefined' || !Array.isArray(GT_DAILY_SO) || state.selectedMonths.length !== 1) {



                return { momPct: null, curMtd: 0, priorMtd: 0, priorLabel: '', maxDay: 0 };



            }



            const selM = state.selectedMonths[0];



            const curYearNum = parseInt(state.year, 10);



            const curMonthNum = parseInt(selM, 10);



            const curMonthPrefix = state.year + '-' + selM;







            GT_DAILY_SO.forEach(d => {



                const dt = String(d.date_val || '');



                if (dt.startsWith(curMonthPrefix) && (Number(d.daily_so) || 0) > 0) {



                    const dayNum = parseInt(dt.substring(8, 10), 10);



                    if (dayNum > maxDay) maxDay = dayNum;



                }



            });







            if (maxDay === 0) return { momPct: null, curMtd: 0, priorMtd: 0, priorLabel: '', maxDay: 0 };







            const priorMonthNum = curMonthNum === 1 ? 12 : curMonthNum - 1;



            const priorYearNum = curMonthNum === 1 ? curYearNum - 1 : curYearNum;



            const priorMonthPrefix = priorYearNum + '-' + String(priorMonthNum).padStart(2, '0');



            priorLabel = 'T' + priorMonthNum;







            GT_DAILY_SO.forEach(d => {



                const dt = String(d.date_val || '');



                const v = Number(d.daily_so) || 0;



                if (v === 0) return;



                if (!matchProductRecord(d)) return;



                if (state.geoNpp !== 'ALL' && d.npp_code !== state.geoNpp) return;







                const dayNum = parseInt(dt.substring(8, 10), 10);



                if (dayNum > maxDay) return;







                if (dt.startsWith(curMonthPrefix)) {



                    curMtd += v;



                } else if (dt.startsWith(priorMonthPrefix)) {



                    priorMtd += v;



                }



            });







            if (priorMtd > 0) {



                momPct = ((curMtd - priorMtd) / priorMtd) * 100;



            }



            return { momPct, curMtd, priorMtd, priorLabel, maxDay };



        }







        function renderMoMElement(momElId, lmElId, momData) {



            const elMom = document.getElementById(momElId);



            const elLm = document.getElementById(lmElId);



            if (!elMom || !elLm) return;



            if (momData && momData.momPct !== null) {



                const pct = momData.momPct;



                elMom.innerText = (pct >= 0 ? '+' : '') + pct.toFixed(1) + '%';



                elMom.className = (pct >= 0 ? 'text-green-700' : 'text-red-600') + ' font-bold';



                elMom.style.color = pct >= 0 ? '#15803d' : '#dc2626';



                elLm.innerText = '(vs MTD ' + momData.priorLabel + ': ' + formatBnVn(momData.priorMtd) + ')';



                elLm.title = 'So sánh lũy kế từ ngày 1 đến ngày ' + momData.maxDay + ' của ' + momData.priorLabel;



            } else {



                elMom.innerText = '--%';



                elMom.className = 'text-slate-400 font-bold';



                elMom.style.color = '';



                elLm.innerText = '(N/A)';



                elLm.title = '';



            }



        }







        function getMaxAvailableDayForMonth(mNum, yearVal) {



            const y = yearVal || state.year || '2026';



            const m = mNum.toString().padStart(2, '0');



            const ymPrefix = y + '-' + m;



            let maxD = 0;



            if (typeof GT_DAILY_SO !== 'undefined' && Array.isArray(GT_DAILY_SO)) {



                GT_DAILY_SO.forEach(d => {



                    const dt = String(d.date_val || '');



                    if (dt.startsWith(ymPrefix) && (Number(d.daily_so) || 0) > 0) {



                        const dayNum = parseInt(dt.substring(8, 10), 10);



                        if (dayNum > maxD) maxD = dayNum;



                    }



                });



            }



            if (maxD === 0 && typeof DAILY_DATA !== 'undefined' && Array.isArray(DAILY_DATA)) {



                DAILY_DATA.forEach(d => {



                    const dt = String(d.date_val || '');



                    if (dt.startsWith(ymPrefix) && (Number(d.daily_sellin) || 0) > 0) {



                        const dayNum = parseInt(dt.substring(8, 10), 10);



                        if (dayNum > maxD) maxD = dayNum;



                    }



                });



            }



            return maxD;



        }







        function getDaysInMonthForDoi(mNum, yearVal) {



            const y = yearVal || state.year || '2026';



            const m = mNum.toString().padStart(2, '0');



            if (y === '2026' && (m === '10' || m === '09')) {



                const maxD = getMaxAvailableDayForMonth(m, y);



                return maxD > 0 ? maxD : (m === '10' ? 7 : 30);



            }



            return 30;



        }







        // =========================================================================


