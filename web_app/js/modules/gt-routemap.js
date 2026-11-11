/**
 * CJ FOODS VIETNAM - GT ROUTEMAP & GOLDEN STORE NATIVE MODULE
 * Enterprise Zero-Trust & Row-Level Security (RLS) Integrated
 */
window.GtRoutemapModule = (function() {
    let isInitialized = false;
    let isLoadingData = false;

    // Helper: Dynamic script loader
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

    
    // State
    let map = null;
    let cjClusterGroup = null;
    let gsClusterGroup = null;
    let plainCJGroup = null;
    let plainGSGroup = null;
    let myLocationMarker = null;
    let currentFilteredCJ = [];
    let currentFilteredGS = [];
    let activeDay = '';
    let currentCustType = 'all'; // 'all' | 'cj' | 'gs'

    // Set Customer Type Mode (All / CJ Only / GS Only)
    function setCustomerType(type) {
      currentCustType = type;

      // 1. Update Sidebar Radio Group
      const radio = document.querySelector(`input[name="custType"][value="${type}"]`);
      if (radio) radio.checked = true;

      // 2. Update Mobile Customer Mode Segment Buttons
      document.querySelectorAll('.m-cust-btn').forEach(btn => {
        if (btn.getAttribute('data-type') === type) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });

      // 3. Toggle Visibility of Golden Store Radius Options
      const boxGSRange = document.getElementById('boxGSRange');
      if (boxGSRange) boxGSRange.style.display = (type === 'cj') ? 'none' : 'block';

      // 4. Update Map Legend Item Opacity
      const legCJ = document.getElementById('legendItemCJ');
      const legGS = document.getElementById('legendItemGS');
      if (legCJ) legCJ.style.opacity = (type === 'gs') ? '0.35' : '1';
      if (legGS) legGS.style.opacity = (type === 'cj') ? '0.35' : '1';

      applyFilters();
    }

    // Initialize Map with 100% Free Google & OpenStreetMap Layers
    function initMap() {
      const googleRoadmap = L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
        maxZoom: 21,
        attribution: '&copy; Google Maps'
      });

      const googleSatellite = L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
        maxZoom: 21,
        attribution: '&copy; Google Maps'
      });

      const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap'
      });

      map = L.map('mapView', {
        center: [16.0544, 107.5],
        zoom: 6,
        preferCanvas: true,
        zoomControl: false,
        layers: [googleRoadmap]
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      const baseMaps = {
        "Bản đồ Google": googleRoadmap,
        "Google Vệ tinh": googleSatellite,
        "OpenStreetMap": osmLayer
      };
      L.control.layers(baseMaps, null, { position: 'topright' }).addTo(map);

      // 1. BRANDED CJ CLUSTER (Deep Navy Blue #0A2E50)
      cjClusterGroup = L.markerClusterGroup({
        chunkedLoading: true,
        maxClusterRadius: 40,
        disableClusteringAtZoom: 14,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        iconCreateFunction: function(cluster) {
          const count = cluster.getChildCount();
          const size = count < 100 ? 36 : (count < 1000 ? 44 : 52);
          const txt = count >= 1000 ? (Math.round(count / 100) / 10) + 'k' : count;
          return L.divIcon({
            html: `<div class="cj-cluster-circle" style="width:${size}px; height:${size}px;">
                     <span>${txt}</span>
                     <small>CJ</small>
                   </div>`,
            className: 'custom-cluster-icon',
            iconSize: [size, size]
          });
        }
      });

      // 2. BRANDED GOLDEN STORE CLUSTER (Rich Dark Orange #D35400 with Gold border)
      gsClusterGroup = L.markerClusterGroup({
        chunkedLoading: true,
        maxClusterRadius: 40,
        disableClusteringAtZoom: 14,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        iconCreateFunction: function(cluster) {
          const count = cluster.getChildCount();
          const size = count < 100 ? 36 : (count < 1000 ? 44 : 52);
          const txt = count >= 1000 ? (Math.round(count / 100) / 10) + 'k' : count;
          return L.divIcon({
            html: `<div class="gs-cluster-circle" style="width:${size}px; height:${size}px;">
                     <span>${txt}</span>
                     <small>GS</small>
                   </div>`,
            className: 'custom-cluster-icon',
            iconSize: [size, size]
          });
        }
      });

      // Plain Layers (when clustering is disabled)
      plainCJGroup = L.featureGroup();
      plainGSGroup = L.featureGroup();

      map.addLayer(gsClusterGroup);
      map.addLayer(cjClusterGroup);
    }

    // Normalize Unicode helper
    function norm(str) {
      return (str || '').normalize('NFC').trim();
    }

    // Populate Filters
    function populateFilters(cascade = false) {
      if (!window.DMS_RAW_DATA || !window.DMS_RAW_DATA.cj) {
        console.warn("Dữ liệu dms_data.js đang được nạp hoặc chưa sẵn sàng.");
        return;
      }

      const cj = window.DMS_RAW_DATA.cj;
      const curArea = norm(document.getElementById('filterArea').value);
      const curSup = norm(document.getElementById('filterSup').value);
      const curDist = norm(document.getElementById('filterDistributor').value);
      const curSm = norm(document.getElementById('filterSalesman').value);

      let pool = cj;
      if (curArea) pool = pool.filter(r => norm(r[9]) === curArea);
      if (curSup) pool = pool.filter(r => norm(r[10]) === curSup);
      if (curDist) pool = pool.filter(r => norm(r[6]) === curDist);

      if (!cascade) {
        const areas = [...new Set(cj.map(r => norm(r[9])).filter(Boolean))].sort();
        document.getElementById('filterArea').innerHTML = '<option value="">-- Tất cả Vùng --</option>' + 
          areas.map(a => `<option value="${a}">${a}</option>`).join('');

        const freqs = [...new Set(cj.map(r => norm(r[11])).filter(Boolean))].sort();
        document.getElementById('filterFrequency').innerHTML = '<option value="">-- Tất cả --</option>' + 
          freqs.map(f => `<option value="${f}">${f}</option>`).join('');

        const weeks = [...new Set(cj.map(r => norm(r[12])).filter(Boolean))].sort();
        document.getElementById('filterVisitWeek').innerHTML = '<option value="">-- Tất cả --</option>' + 
          weeks.map(w => `<option value="${w}">${w}</option>`).join('');
      }

      // Offices (Master Office)
      const sups = [...new Set(pool.map(r => norm(r[10])).filter(Boolean))].sort((a,b) => a.localeCompare(b, 'vi'));
      document.getElementById('filterSup').innerHTML = '<option value="">-- Tất cả Office --</option>' + 
        sups.map(s => `<option value="${s}" ${s === curSup ? 'selected' : ''}>${s}</option>`).join('');

      // Distributors
      const dists = [...new Set(pool.map(r => norm(r[6])).filter(Boolean))].sort();
      document.getElementById('filterDistributor').innerHTML = '<option value="">-- Tất cả Nhà Phân Phối --</option>' + 
        dists.map(d => `<option value="${d}" ${d === curDist ? 'selected' : ''}>${d}</option>`).join('');

      // Salesmen
      const smPool = curDist ? pool.filter(r => norm(r[6]) === curDist) : pool;
      const salesmen = [...new Set(smPool.map(r => norm(r[5])).filter(Boolean))].sort();
      document.getElementById('filterSalesman').innerHTML = '<option value="">-- Tất cả Nhân Viên --</option>' + 
        salesmen.map(s => `<option value="${s}" ${s === curSm ? 'selected' : ''}>${s}</option>`).join('');
    }

    // Apply Filters Client-Side
    function applyFilters() {
      if (!window.DMS_RAW_DATA) return;

      const cj = window.DMS_RAW_DATA.cj;
      const pot = window.DMS_RAW_DATA.pot || [];

      const area = norm(document.getElementById('filterArea').value);
      const sup = norm(document.getElementById('filterSup').value);
      const dist = norm(document.getElementById('filterDistributor').value);
      const sm = norm(document.getElementById('filterSalesman').value);
      const freq = norm(document.getElementById('filterFrequency').value);
      const week = norm(document.getElementById('filterVisitWeek').value);
      const search = norm(document.getElementById('searchKeyword').value).toLowerCase();
      const showCJ = (currentCustType === 'all' || currentCustType === 'cj');
      const showGS = (currentCustType === 'all' || currentCustType === 'gs');

      // 1. Filter CJ Outlets
      let filteredCJ = [];
      if (showCJ) {
        filteredCJ = cj.filter(r => {
          if (area && norm(r[9]) !== area) return false;
          if (sup && norm(r[10]) !== sup) return false;
          if (dist && norm(r[6]) !== dist) return false;
          if (sm && norm(r[5]) !== sm) return false;
          if (freq && norm(r[11]) !== freq) return false;
          if (week && norm(r[12]) !== week) return false;

          if (activeDay) {
            if (activeDay === 't2' && !r[13]) return false;
            if (activeDay === 't3' && !r[14]) return false;
            if (activeDay === 't4' && !r[15]) return false;
            if (activeDay === 't5' && !r[16]) return false;
            if (activeDay === 't6' && !r[17]) return false;
            if (activeDay === 't7' && !r[18]) return false;
            if (activeDay === 'cn' && !r[19]) return false;
          }

          if (search) {
            const matchCode = norm(r[1]).toLowerCase().includes(search);
            const matchName = norm(r[2]).toLowerCase().includes(search);
            const matchAddr = norm(r[20]).toLowerCase().includes(search);
            const matchPhone = norm(r[21]).toLowerCase().includes(search);
            if (!matchCode && !matchName && !matchAddr && !matchPhone) return false;
          }

          return true;
        });
      }

      // 2. Filter Golden Store (Loại A)
      let filteredGS = [];
      if (showGS) {
        const gsRange = document.getElementById('filterGSRange') ? document.getElementById('filterGSRange').value : '1km';
        let maxDistKm = 1.0;
        let checkRadius = true;
        if (gsRange === '1km') maxDistKm = 1.0;
        else if (gsRange === '1.5km') maxDistKm = 1.5;
        else if (gsRange === '2km') maxDistKm = 2.0;
        else if (gsRange === '3km') maxDistKm = 3.0;
        else if (gsRange === '5km') maxDistKm = 5.0;
        else if (gsRange === 'territory') checkRadius = false;

        // Reference CJ pool (Dùng làm mốc đo bán kính và khoanh vùng)
        const refPool = showCJ ? filteredCJ : (
          (dist || sm || sup || freq || week || activeDay) ? 
            cj.filter(r => {
              if (area && norm(r[9]) !== area) return false;
              if (sup && norm(r[10]) !== sup) return false;
              if (dist && norm(r[6]) !== dist) return false;
              if (sm && norm(r[5]) !== sm) return false;
              if (freq && norm(r[11]) !== freq) return false;
              if (week && norm(r[12]) !== week) return false;
              if (activeDay) {
                if (activeDay === 't2' && !r[13]) return false;
                if (activeDay === 't3' && !r[14]) return false;
                if (activeDay === 't4' && !r[15]) return false;
                if (activeDay === 't5' && !r[16]) return false;
                if (activeDay === 't6' && !r[17]) return false;
                if (activeDay === 't7' && !r[18]) return false;
                if (activeDay === 'cn' && !r[19]) return false;
              }
              return true;
            }) :
            (area ? cj.filter(r => norm(r[9]) === area) : cj)
        );

        // Xây dựng Spatial Grid siêu tốc trên các điểm Shop CJ (~4.4km mỗi ô)
        const CELL_SIZE = 0.04;
        const cjGrid = new Map();
        let hasCJRef = false;
        let minLat = 999, maxLat = -999, minLon = 999, maxLon = -999;
        const cjProvinces = new Set();

        refPool.forEach(r => {
          const lat = r[3];
          const lon = r[4];
          if (lat && lon && lat !== 0 && lon !== 0) {
            hasCJRef = true;
            if (lat < minLat) minLat = lat;
            if (lat > maxLat) maxLat = lat;
            if (lon < minLon) minLon = lon;
            if (lon > maxLon) maxLon = lon;
            if (r[21]) cjProvinces.add(norm(r[21]));

            const gx = Math.floor(lat / CELL_SIZE);
            const gy = Math.floor(lon / CELL_SIZE);
            const k = gx + '_' + gy;
            let cell = cjGrid.get(k);
            if (!cell) { cell = []; cjGrid.set(k, cell); }
            cell.push([lat, lon]);
          }
        });

        const maxDistSq = maxDistKm * maxDistKm;
        const margin = 0.05;

        filteredGS = pot.filter(p => {
          // p: [id, code, name, lat, lon, sm, dist, prov, addr, sellout, area_name]
          const pLat = p[3];
          const pLon = p[4];
          if (!pLat || !pLon || pLat === 0 || pLon === 0) return false;

          const pProv = norm(p[7]);
          const pArea = norm(p[10]);

          // 1. Lọc theo Vùng (Area)
          if (area) {
            if (pArea !== area && !pProv.includes(area)) return false;
          }

          // 2. Tìm kiếm từ khóa
          if (search) {
            const matchCode = norm(p[1]).toLowerCase().includes(search);
            const matchName = norm(p[2]).toLowerCase().includes(search);
            const matchAddr = norm(p[8]).toLowerCase().includes(search);
            if (!matchCode && !matchName && !matchAddr) return false;
          }

          // 3. Lọc bán kính (3km hoặc 5km so với điểm bán CJ)
          if (checkRadius) {
            if (!hasCJRef) return false;

            const gx = Math.floor(pLat / CELL_SIZE);
            const gy = Math.floor(pLon / CELL_SIZE);
            let withinRadius = false;
            const cosLat = Math.cos(pLat * 0.0174532925);

            for (let dx = -1; dx <= 1 && !withinRadius; dx++) {
              for (let dy = -1; dy <= 1 && !withinRadius; dy++) {
                const cell = cjGrid.get((gx + dx) + '_' + (gy + dy));
                if (!cell) continue;
                for (let i = 0; i < cell.length; i++) {
                  const cLat = cell[i][0];
                  const cLon = cell[i][1];
                  const dLat = (pLat - cLat) * 111.0;
                  const dLon = (pLon - cLon) * 111.0 * cosLat;
                  if (dLat * dLat + dLon * dLon <= maxDistSq) {
                    withinRadius = true;
                    break;
                  }
                }
              }
            }
            if (!withinRadius) return false;
          } else if (hasCJRef && (dist || sm || sup)) {
            // Trường hợp 'territory' không giới hạn km
            const inBox = (pLat >= minLat - margin && pLat <= maxLat + margin &&
                           pLon >= minLon - margin && pLon <= maxLon + margin);
            const inProv = cjProvinces.size > 0 && cjProvinces.has(pProv);
            if (!inBox && !inProv) return false;
          }

          return true;
        });
      }

      currentFilteredCJ = filteredCJ;
      currentFilteredGS = filteredGS;

      // Update Day Counts in Top Bar
      let poolForDayCount = cj.filter(r => {
        if (area && norm(r[9]) !== area) return false;
        if (sup && norm(r[10]) !== sup) return false;
        if (dist && norm(r[6]) !== dist) return false;
        if (sm && norm(r[5]) !== sm) return false;
        return true;
      });

      let cnt = { t2: 0, t3: 0, t4: 0, t5: 0, t6: 0, t7: 0, cn: 0 };
      poolForDayCount.forEach(r => {
        if (r[13]) cnt.t2++;
        if (r[14]) cnt.t3++;
        if (r[15]) cnt.t4++;
        if (r[16]) cnt.t5++;
        if (r[17]) cnt.t6++;
        if (r[18]) cnt.t7++;
        if (r[19]) cnt.cn++;
      });
      document.getElementById('cnt_t2').innerText = cnt.t2.toLocaleString();
      document.getElementById('cnt_t3').innerText = cnt.t3.toLocaleString();
      document.getElementById('cnt_t4').innerText = cnt.t4.toLocaleString();
      document.getElementById('cnt_t5').innerText = cnt.t5.toLocaleString();
      document.getElementById('cnt_t6').innerText = cnt.t6.toLocaleString();
      document.getElementById('cnt_t7').innerText = cnt.t7.toLocaleString();
      document.getElementById('cnt_cn').innerText = cnt.cn.toLocaleString();

      // Update KPIs
      const totalAll = filteredCJ.length + filteredGS.length;
      const cjGPS = filteredCJ.filter(r => r[3] && r[4] && r[3] !== 0).length;
      const gpsPct = filteredCJ.length > 0 ? Math.round((cjGPS / filteredCJ.length) * 100) : 0;

      document.getElementById('kpiTotalAll').innerText = totalAll.toLocaleString();
      document.getElementById('kpiCJ').innerText = filteredCJ.length.toLocaleString();
      document.getElementById('kpiGS').innerText = filteredGS.length.toLocaleString();
      document.getElementById('kpiGPS').innerText = `${gpsPct}%`;

      // Update Mobile KPIs
      const mTotal = document.getElementById('mKpiTotal');
      const mCJ = document.getElementById('mKpiCJ');
      const mGS = document.getElementById('mKpiGS');
      const mGPS = document.getElementById('mKpiGPS');
      if (mTotal) mTotal.innerText = totalAll.toLocaleString();
      if (mCJ) mCJ.innerText = filteredCJ.length.toLocaleString();
      if (mGS) mGS.innerText = filteredGS.length.toLocaleString();
      if (mGPS) mGPS.innerText = `${gpsPct}%`;

      // Render Map & Table (WITHOUT ANY SLICING - SHOW ALL!)
      renderMap(filteredCJ, filteredGS);
      renderTable(filteredCJ, filteredGS);
    }

    // Render Markers on Leaflet Map
    function renderMap(cjList, gsList) {
      cjClusterGroup.clearLayers();
      gsClusterGroup.clearLayers();
      plainCJGroup.clearLayers();
      plainGSGroup.clearLayers();

      const useCluster = document.getElementById('chkCluster').checked;
      const showLabels = document.getElementById('chkShowLabels') ? document.getElementById('chkShowLabels').checked : true;

      // Handle layer attachments (GS first, CJ on top)
      if (useCluster) {
        if (!map.hasLayer(gsClusterGroup)) map.addLayer(gsClusterGroup);
        if (!map.hasLayer(cjClusterGroup)) map.addLayer(cjClusterGroup);
        if (map.hasLayer(plainGSGroup)) map.removeLayer(plainGSGroup);
        if (map.hasLayer(plainCJGroup)) map.removeLayer(plainCJGroup);
      } else {
        if (map.hasLayer(gsClusterGroup)) map.removeLayer(gsClusterGroup);
        if (map.hasLayer(cjClusterGroup)) map.removeLayer(cjClusterGroup);
        if (!map.hasLayer(plainGSGroup)) map.addLayer(plainGSGroup);
        if (!map.hasLayer(plainCJGroup)) map.addLayer(plainCJGroup);
      }

      const cjMarkers = [];
      const gsMarkers = [];
      const latlngs = [];

      // 1. Render ALL CJ Outlets (Teardrop Pins - 26px x 35px with CJ - Priority zIndex 1000)
      cjList.forEach(r => {
        const lat = r[3];
        const lon = r[4];
        if (!lat || !lon || lat === 0 || lon === 0) return;

        latlngs.push([lat, lon]);

        const icon = L.divIcon({
          className: 'custom-marker',
          html: `<div class="marker-pin marker-pin-cj" style="width:26px; height:35px;">
                   <svg width="26" height="35" viewBox="0 0 26 35" fill="none" xmlns="http://www.w3.org/2000/svg">
                     <path d="M13 1C6.37 1 1 6.37 1 13C1 22.2 11.5 33.2 12.35 34.1C12.7 34.5 13.3 34.5 13.65 34.1C14.5 33.2 25 22.2 25 13C25 6.37 19.63 1 13 1Z" fill="#0A2E50" stroke="#FFFFFF" stroke-width="2"/>
                     <circle cx="13" cy="13" r="6.5" fill="#FFFFFF"/>
                     <text x="13" y="16.2" text-anchor="middle" font-size="8.5" font-weight="900" fill="#0A2E50" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">CJ</text>
                   </svg>
                 </div>`,
          iconSize: [26, 35],
          iconAnchor: [13, 35],
          popupAnchor: [0, -35]
        });

        const days = [];
        if (r[13]) days.push("T2");
        if (r[14]) days.push("T3");
        if (r[15]) days.push("T4");
        if (r[16]) days.push("T5");
        if (r[17]) days.push("T6");
        if (r[18]) days.push("T7");
        if (r[19]) days.push("CN");

        const popup = `
          <div class="popup-content">
            <span class="popup-badge popup-badge-cj"><i class="fa-solid fa-check-circle me-1"></i>SHOP CJ (MCP)</span>
            <div class="popup-title">${r[2]}</div>
            <div class="popup-row"><strong>Mã KH:</strong> ${r[1]}</div>
            <div class="popup-row"><i class="fa-solid fa-phone text-primary me-1"></i>${r[21] ? `<a href="tel:${r[21]}" class="fw-bold">${r[21]}</a>` : 'Chưa có SĐT'}</div>
            <div class="popup-row"><i class="fa-solid fa-location-dot text-danger me-1"></i>${r[20] || ''}</div>
            <hr class="my-1">
            <div class="popup-row"><strong>NVBH:</strong> ${r[5] || 'N/A'}</div>
            <div class="popup-row"><strong>NPP:</strong> ${r[6] || 'N/A'}</div>
            <div class="popup-row"><strong>Office:</strong> <span class="badge bg-secondary">${r[10] || 'N/A'}</span></div>
            <div class="popup-row"><strong>Lịch đi:</strong> <span class="badge bg-primary">${r[11] || ''}</span> <span class="badge bg-secondary">${r[12] || ''}</span> (${days.join(', ') || 'Chưa xếp ngày'})</div>
            <div class="mt-2 d-flex flex-column gap-1">
              <button type="button" class="btn btn-sm btn-direct-route btn-direct-route-cj w-100 py-1" onclick="startDirectRoute(${lat}, ${lon}, '${encodeURIComponent(r[2] || '')}', '${encodeURIComponent(r[1] || '')}', '${encodeURIComponent(r[20] || '')}', 'cj')" style="font-size:0.78rem;">
                <i class="fa-solid fa-route me-1"></i> Xem đường đi tại đây (Không rời trang)
              </button>
              <a href="https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}" target="_blank" class="btn-gmaps-link btn-cj-gmaps w-100 text-center">
                <i class="fa-solid fa-arrow-up-right-from-square me-1"></i> Mở Google Maps ngoài
              </a>
            </div>
          </div>
        `;

        const m = L.marker([lat, lon], { icon, zIndexOffset: 1000 }).bindPopup(popup);

        if (showLabels && r[2]) {
          m.bindTooltip(r[2], {
            permanent: true,
            direction: 'top',
            offset: [0, -36],
            className: 'point-label point-label-cj'
          });
          m.on('tooltipopen', function(e) {
            if (e.tooltip && e.tooltip._container) {
              e.tooltip._container.onclick = function(ev) {
                ev.stopPropagation();
                m.openPopup();
              };
            }
          });
        }

        cjMarkers.push(m);
      });

      // 2. Render ALL Golden Stores (Teardrop Pins - 26px x 35px with GS)
      gsList.forEach(p => {
        const lat = p[3];
        const lon = p[4];
        if (!lat || !lon) return;

        latlngs.push([lat, lon]);

        const icon = L.divIcon({
          className: 'custom-marker',
          html: `<div class="marker-pin marker-pin-gs" style="width:26px; height:35px;">
                   <svg width="26" height="35" viewBox="0 0 26 35" fill="none" xmlns="http://www.w3.org/2000/svg">
                     <path d="M13 1C6.37 1 1 6.37 1 13C1 22.2 11.5 33.2 12.35 34.1C12.7 34.5 13.3 34.5 13.65 34.1C14.5 33.2 25 22.2 25 13C25 6.37 19.63 1 13 1Z" fill="#D35400" stroke="#FFE082" stroke-width="2"/>
                     <circle cx="13" cy="13" r="6.5" fill="#FFF7ED"/>
                     <text x="13" y="16.2" text-anchor="middle" font-size="8.5" font-weight="900" fill="#D35400" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">GS</text>
                   </svg>
                 </div>`,
          iconSize: [26, 35],
          iconAnchor: [13, 35],
          popupAnchor: [0, -35]
        });

        const popup = `
          <div class="popup-content">
            <span class="popup-badge popup-badge-gs"><i class="fa-solid fa-star me-1"></i>GOLDEN STORE (LOẠI A)</span>
            <div class="popup-title">${p[2]}</div>
            <div class="popup-row"><strong>Mã KH:</strong> <span class="text-danger fw-bold">${p[1]}</span></div>
            <div class="popup-row"><i class="fa-solid fa-location-dot text-danger me-1"></i>${p[8] || ''}</div>
            <div class="popup-row"><strong>Khu vực:</strong> ${p[7] || ''}</div>
            <div class="popup-row"><strong>Ước tính Sellout/Tháng:</strong> <span class="text-danger fw-bold">${Number(p[9] || 0).toLocaleString()} VNĐ</span></div>
            <div class="mt-2 d-flex flex-column gap-1">
              <button type="button" class="btn btn-sm btn-direct-route btn-direct-route-gs w-100 py-1" onclick="startDirectRoute(${lat}, ${lon}, '${encodeURIComponent(p[2] || '')}', '${encodeURIComponent(p[1] || '')}', '${encodeURIComponent(p[8] || '')}', 'gs')" style="font-size:0.78rem;">
                <i class="fa-solid fa-route me-1"></i> Xem đường đi tại đây (Không rời trang)
              </button>
              <a href="https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}" target="_blank" class="btn-gmaps-link btn-gs-gmaps w-100 text-center">
                <i class="fa-solid fa-arrow-up-right-from-square me-1"></i> Mở Google Maps ngoài
              </a>
            </div>
          </div>
        `;

        const m = L.marker([lat, lon], { icon, zIndexOffset: 0 }).bindPopup(popup);

        if (showLabels && p[2]) {
          m.bindTooltip(p[2], {
            permanent: true,
            direction: 'top',
            offset: [0, -36],
            className: 'point-label point-label-gs'
          });
          m.on('tooltipopen', function(e) {
            if (e.tooltip && e.tooltip._container) {
              e.tooltip._container.onclick = function(ev) {
                ev.stopPropagation();
                m.openPopup();
              };
            }
          });
        }

        gsMarkers.push(m);
      });

      // Add to corresponding layers (GS first, CJ on top)
      if (useCluster) {
        gsClusterGroup.addLayers(gsMarkers);
        cjClusterGroup.addLayers(cjMarkers);
      } else {
        gsMarkers.forEach(m => plainGSGroup.addLayer(m));
        cjMarkers.forEach(m => plainCJGroup.addLayer(m));
      }

      // Auto fit map bounds if points exist
      if (latlngs.length > 0) {
        map.fitBounds(L.latLngBounds(latlngs), { padding: [40, 40], maxZoom: 16 });
      }
    }

    // Render Data Table
    function renderTable(cjList, gsList) {
      const tbody = document.getElementById('tableBody');
      const rows = [];

      cjList.slice(0, 1000).forEach(r => {
        const days = [];
        if (r[13]) days.push("T2");
        if (r[14]) days.push("T3");
        if (r[15]) days.push("T4");
        if (r[16]) days.push("T5");
        if (r[17]) days.push("T6");
        if (r[18]) days.push("T7");
        if (r[19]) days.push("CN");

        rows.push(`
          <tr>
            <td><span class="badge" style="background:#0A2E50; color:white;">Shop CJ</span></td>
            <td><strong>${r[1]}</strong></td>
            <td class="fw-semibold">${r[2]}</td>
            <td style="max-width:220px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${r[20]}">${r[20]}</td>
            <td>${r[21] ? `<a href="tel:${r[21]}">${r[21]}</a>` : '-'}</td>
            <td>${r[5] || '-'}</td>
            <td>${r[6] || '-'}</td>
            <td>${r[11] || '-'} (${days.join(', ') || '-'})</td>
            <td>
              ${r[3] && r[4] ? `
                <div class="d-flex gap-1">
                  <button class="btn btn-xs btn-outline-primary py-0 px-2" onclick="flyToPoint(${r[3]}, ${r[4]})">
                    <i class="fa-solid fa-map-pin me-1"></i>Map
                  </button>
                  <button class="btn btn-xs btn-primary py-0 px-2" onclick="startDirectRoute(${r[3]}, ${r[4]}, '${encodeURIComponent(r[2] || '')}', '${encodeURIComponent(r[1] || '')}', '${encodeURIComponent(r[20] || '')}', 'cj')" title="Chỉ đường ngay tại đây">
                    <i class="fa-solid fa-route"></i>
                  </button>
                </div>
              ` : '<span class="text-muted small">No GPS</span>'}
            </td>
          </tr>
        `);
      });

      gsList.slice(0, 1000).forEach(p => {
        rows.push(`
          <tr>
            <td><span class="badge" style="background:#D35400; color:white;">Golden Store</span></td>
            <td><strong class="text-danger">${p[1]}</strong></td>
            <td class="fw-semibold">${p[2]}</td>
            <td style="max-width:220px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${p[8]}">${p[8]}</td>
            <td>-</td>
            <td>${p[5] || '-'}</td>
            <td>${p[6] || '-'}</td>
            <td><span class="badge bg-warning text-dark">Loại A</span></td>
            <td>
              ${p[3] && p[4] ? `
                <div class="d-flex gap-1">
                  <button class="btn btn-xs btn-outline-warning text-dark py-0 px-2" onclick="flyToPoint(${p[3]}, ${p[4]})">
                    <i class="fa-solid fa-map-pin me-1"></i>Map
                  </button>
                  <button class="btn btn-xs btn-warning text-dark py-0 px-2" onclick="startDirectRoute(${p[3]}, ${p[4]}, '${encodeURIComponent(p[2] || '')}', '${encodeURIComponent(p[1] || '')}', '${encodeURIComponent(p[8] || '')}', 'gs')" title="Chỉ đường ngay tại đây">
                    <i class="fa-solid fa-route"></i>
                  </button>
                </div>
              ` : '<span class="text-muted small">No GPS</span>'}
            </td>
          </tr>
        `);
      });

      if (rows.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center py-4 text-muted">Không tìm thấy khách hàng nào phù hợp với bộ lọc.</td></tr>';
      } else {
        tbody.innerHTML = rows.join('');
      }
    }

    // Fly to Point (Supports both Shop CJ and Golden Store)
    window.flyToPoint = function(lat, lon) {
      document.getElementById('tabMapBtn').click();
      setTimeout(() => {
        map.setView([lat, lon], 17);
        const useCluster = document.getElementById('chkCluster').checked;
        const searchLayers = useCluster ? [cjClusterGroup, gsClusterGroup] : [plainCJGroup, plainGSGroup];
        searchLayers.forEach(layerGroup => {
          if (!layerGroup) return;
          layerGroup.eachLayer(layer => {
            const pos = layer.getLatLng();
            if (Math.abs(pos.lat - lat) < 0.0001 && Math.abs(pos.lng - lon) < 0.0001) {
              layer.openPopup();
            }
          });
        });
      }, 200);
    };

    let activeNavLayer = null;
    let activeDestMarker = null;
    let userCurrentGPS = null;

    // My Location GPS Tracker
    function trackMyLocation() {
      if (!navigator.geolocation) {
        alert("Thiết bị hoặc trình duyệt không hỗ trợ định vị GPS.");
        return;
      }

      navigator.geolocation.getCurrentPosition(
        pos => {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          userCurrentGPS = { lat, lon };

          if (myLocationMarker) map.removeLayer(myLocationMarker);

          const myIcon = L.divIcon({
            className: 'my-loc-icon',
            html: `<div style="width:20px;height:20px;border-radius:50%;background:#00E676;border:3px solid white;box-shadow:0 0 12px rgba(0,230,118,0.9);"></div>`,
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          });

          myLocationMarker = L.marker([lat, lon], { icon: myIcon }).addTo(map);
          myLocationMarker.bindPopup("<strong>Vị trí hiện tại của bạn</strong>").openPopup();
          map.setView([lat, lon], 16);
        },
        err => {
          alert("Không thể lấy vị trí GPS. Vui lòng cho phép quyền truy cập vị trí trên trình duyệt.");
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }

    // Start in-app direct route (Seamless In-Page Directions)
    window.startDirectRoute = function(destLat, destLon, encodedName, encodedCode, encodedAddr, type) {
      if (map) map.closePopup();

      const shopName = decodeURIComponent(encodedName || '');
      const shopCode = decodeURIComponent(encodedCode || '');
      const shopAddr = decodeURIComponent(encodedAddr || '');

      // Show Nav Card in loading state
      const navCard = document.getElementById('navRouteCard');
      document.getElementById('navShopName').innerText = (shopCode ? `[${shopCode}] ` : '') + (shopName || 'Khách hàng');
      document.getElementById('navShopAddr').innerText = shopAddr || 'Chưa có địa chỉ chi tiết';
      document.getElementById('navDist').innerText = 'Đang tính...';
      document.getElementById('navTime').innerText = '...';
      document.getElementById('navRoutingStatus').innerText = '(Đang lấy vị trí GPS & dò đường...)';
      document.getElementById('navGmapsBtn').href = `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLon}`;
      
      const badge = document.getElementById('navBadgeType');
      if (type === 'gs') {
        badge.className = 'badge px-2 py-1';
        badge.style.background = '#D35400';
        badge.innerHTML = '<i class="fa-solid fa-star me-1"></i>Golden Store';
      } else {
        badge.className = 'badge px-2 py-1';
        badge.style.background = '#0A2E50';
        badge.innerHTML = '<i class="fa-solid fa-store me-1"></i>Shop CJ (MCP)';
      }

      navCard.style.display = 'block';

      // Ensure we are in map view
      const mapView = document.getElementById('mapView');
      if (mapView && mapView.style.display === 'none') {
        document.getElementById('tabMapBtn').click();
      }

      // Check or fetch GPS location
      if (userCurrentGPS && userCurrentGPS.lat && userCurrentGPS.lon) {
        calculateAndDrawRoute(userCurrentGPS.lat, userCurrentGPS.lon, destLat, destLon);
      } else {
        if (!navigator.geolocation) {
          fallbackStraightRoute(null, null, destLat, destLon);
          return;
        }

        navigator.geolocation.getCurrentPosition(
          pos => {
            const uLat = pos.coords.latitude;
            const uLon = pos.coords.longitude;
            userCurrentGPS = { lat: uLat, lon: uLon };
            
            // Update GPS marker
            if (myLocationMarker) map.removeLayer(myLocationMarker);
            const myIcon = L.divIcon({
              className: 'my-loc-icon',
              html: `<div style="width:20px;height:20px;border-radius:50%;background:#00E676;border:3px solid white;box-shadow:0 0 12px rgba(0,230,118,0.9);"></div>`,
              iconSize: [20, 20],
              iconAnchor: [10, 10]
            });
            myLocationMarker = L.marker([uLat, uLon], { icon: myIcon }).addTo(map);

            calculateAndDrawRoute(uLat, uLon, destLat, destLon);
          },
          err => {
            document.getElementById('navRoutingStatus').innerText = '(Chưa bật định vị GPS)';
            document.getElementById('navDist').innerText = 'Chưa có GPS';
            document.getElementById('navTime').innerText = '-';
            alert("Để ứng dụng vẽ đường đi trên bản đồ, vui lòng cho phép quyền truy cập vị trí (GPS) trên điện thoại của bạn.");
          },
          { enableHighAccuracy: true, timeout: 10000 }
        );
      }
    };

    function calculateAndDrawRoute(uLat, uLon, destLat, destLon) {
      document.getElementById('navRoutingStatus').innerText = '';

      // Call OSRM Driving API (100% free, fast, works in Vietnam)
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${uLon},${uLat};${destLon},${destLat}?overview=full&geometries=geojson`;

      fetch(osrmUrl)
        .then(res => res.json())
        .then(data => {
          if (data && data.routes && data.routes.length > 0) {
            const route = data.routes[0];
            const distMeters = route.distance;
            const durSeconds = route.duration;

            const distStr = distMeters >= 1000 ? (distMeters / 1000).toFixed(1) + ' km' : Math.round(distMeters) + ' m';
            const minutes = Math.max(1, Math.round(durSeconds / 60));
            const timeStr = `~${minutes} phút (xe máy)`;

            document.getElementById('navDist').innerText = distStr;
            document.getElementById('navTime').innerText = timeStr;

            if (activeNavLayer) map.removeLayer(activeNavLayer);
            if (activeDestMarker) map.removeLayer(activeDestMarker);

            // Draw route line
            const geojsonLayer = L.geoJSON(route.geometry, {
              style: {
                color: '#2563EB',
                weight: 6,
                opacity: 0.88,
                lineCap: 'round',
                lineJoin: 'round'
              }
            });

            activeNavLayer = geojsonLayer.addTo(map);

            // Add destination pin
            const destIcon = L.divIcon({
              className: 'dest-flag-icon',
              html: `<div style="background:#EF4444;color:white;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 3px 8px rgba(0,0,0,0.3);font-size:13px;"><i class="fa-solid fa-flag-checkered"></i></div>`,
              iconSize: [28, 28],
              iconAnchor: [14, 28]
            });
            activeDestMarker = L.marker([destLat, destLon], { icon: destIcon }).addTo(map);

            map.fitBounds(activeNavLayer.getBounds(), { padding: [60, 60] });
          } else {
            fallbackStraightRoute(uLat, uLon, destLat, destLon);
          }
        })
        .catch(err => {
          console.warn("OSRM error, fallback to direct line:", err);
          fallbackStraightRoute(uLat, uLon, destLat, destLon);
        });
    }

    function fallbackStraightRoute(uLat, uLon, destLat, destLon) {
      if (activeNavLayer) map.removeLayer(activeNavLayer);
      if (activeDestMarker) map.removeLayer(activeDestMarker);

      if (uLat && uLon) {
        const straightDist = L.latLng(uLat, uLon).distanceTo(L.latLng(destLat, destLon));
        const distStr = straightDist >= 1000 ? (straightDist / 1000).toFixed(1) + ' km' : Math.round(straightDist) + ' m';
        const minutes = Math.max(1, Math.round((straightDist / 1000) / 25 * 60));

        document.getElementById('navDist').innerText = distStr + ' (đường thẳng)';
        document.getElementById('navTime').innerText = `~${minutes} phút`;

        activeNavLayer = L.polyline([[uLat, uLon], [destLat, destLon]], {
          color: '#2563EB',
          weight: 4,
          dashArray: '6, 8',
          opacity: 0.85
        }).addTo(map);

        map.fitBounds(activeNavLayer.getBounds(), { padding: [60, 60] });
      }
    }

    // Clear and close in-app direct route
    window.clearDirectRoute = function() {
      if (activeNavLayer) {
        map.removeLayer(activeNavLayer);
        activeNavLayer = null;
      }
      if (activeDestMarker) {
        map.removeLayer(activeDestMarker);
        activeDestMarker = null;
      }
      const navCard = document.getElementById('navRouteCard');
      if (navCard) navCard.style.display = 'none';
    };

    // Client-side Excel Exporter (Directly in Browser)
    function exportToExcel() {
      const hasCJ = currentFilteredCJ && currentFilteredCJ.length > 0;
      const hasGS = currentFilteredGS && currentFilteredGS.length > 0;

      if (!hasCJ && !hasGS) {
        alert("Không có dữ liệu nào để xuất!");
        return;
      }

      const wb = XLSX.utils.book_new();

      if (hasCJ) {
        const cjRows = [
          ["Mã KH", "Tên Khách Hàng", "Địa Chỉ", "Số Điện Thoại", "Vùng", "Office", "Nhà Phân Phối", "NVBH", "Mã Tuyến", "Tên Tuyến", "Tần Suất", "Tuần Đi", "Vĩ Độ (Lat)", "Kinh Độ (Lon)"]
        ];
        currentFilteredCJ.forEach(r => {
          cjRows.push([
            r[1], r[2], r[20], r[21], r[9], r[10], r[6], r[5], r[7], r[8], r[11], r[12], r[3], r[4]
          ]);
        });
        const wsCJ = XLSX.utils.aoa_to_sheet(cjRows);
        XLSX.utils.book_append_sheet(wb, wsCJ, "Tuyen_CJ");
      }

      if (hasGS) {
        const gsRows = [
          ["Mã Golden Store", "Tên Khách Hàng", "Địa Chỉ", "Tỉnh / Khu Vực", "Nhà Phân Phối", "NV Phụ Trách", "Loại Shop", "Sellout/Tháng (ước tính)", "Vĩ Độ", "Kinh Độ"]
        ];
        currentFilteredGS.forEach(p => {
          gsRows.push([
            p[1], p[2], p[8], p[7], p[6], p[5], 'A', p[9], p[3], p[4]
          ]);
        });
        const wsGS = XLSX.utils.aoa_to_sheet(gsRows);
        XLSX.utils.book_append_sheet(wb, wsGS, "Golden_Store_Loai_A");
      }

      const filterTarget = document.getElementById('filterSalesman').value || 
                           document.getElementById('filterDistributor').value || 
                           document.getElementById('filterArea').value || 'Toan_Quoc';
      const modeTag = currentCustType === 'cj' ? 'ShopCJ' : (currentCustType === 'gs' ? 'GoldenStore' : 'CJ_va_Golden');
      XLSX.writeFile(wb, `Danh_Sach_${modeTag}_${filterTarget.replace(/[\s\/\\]+/g, '_')}.xlsx`);
    }

    // Desktop & Mobile Sidebar Controls
    function openMobileSidebar() {
      document.getElementById('sidebar').classList.add('open');
      document.getElementById('sidebarBackdrop').classList.add('open');
    }
    function closeMobileSidebar() {
      document.getElementById('sidebar').classList.remove('open');
      document.getElementById('sidebarBackdrop').classList.remove('open');
    }
    function toggleDesktopSidebar(forceExpand) {
      const sidebar = document.getElementById('sidebar');
      const expandBtn = document.getElementById('btnExpandSidebarDesktop');
      if (!sidebar) return;

      const isCurrentlyCollapsed = sidebar.classList.contains('desktop-collapsed');
      const shouldCollapse = (typeof forceExpand === 'boolean') ? !forceExpand : !isCurrentlyCollapsed;

      if (shouldCollapse) {
        sidebar.classList.add('desktop-collapsed');
        if (expandBtn) expandBtn.classList.remove('d-none');
      } else {
        sidebar.classList.remove('desktop-collapsed');
        if (expandBtn) expandBtn.classList.add('d-none');
      }
      setTimeout(() => {
        if (typeof map !== 'undefined' && map) {
          map.invalidateSize();
        }
      }, 320);
    }

    // Event Listeners Setup (Only called when module is initialized)
    function setupEventListeners() {

      // Sidebar Toggles (Unified Desktop & Mobile)
      const btnToggle = document.getElementById('btnToggleSidebar') || document.getElementById('btnToggleMobileSidebar');
      if (btnToggle) {
        btnToggle.addEventListener('click', () => {
          if (window.innerWidth <= 768) {
            openMobileSidebar();
          } else {
            toggleDesktopSidebar();
          }
        });
      }
      const btnCollapse = document.getElementById('btnCollapseSidebar');
      if (btnCollapse) {
        btnCollapse.addEventListener('click', () => toggleDesktopSidebar(false));
      }
      const btnExpand = document.getElementById('btnExpandSidebarDesktop');
      if (btnExpand) {
        btnExpand.addEventListener('click', () => toggleDesktopSidebar(true));
      }
      document.getElementById('fabOpenFilter').addEventListener('click', openMobileSidebar);
      document.getElementById('btnCloseMobileSidebar').addEventListener('click', closeMobileSidebar);
      document.getElementById('sidebarBackdrop').addEventListener('click', closeMobileSidebar);

      // Cascading Select Listeners (Auto-apply on dropdown selection)
      ['filterArea', 'filterSup', 'filterDistributor', 'filterSalesman'].forEach(id => {
        document.getElementById(id).addEventListener('change', () => {
          populateFilters(true);
          applyFilters();
        });
      });

      // Frequency and Week Filters (Auto-apply)
      ['filterFrequency', 'filterVisitWeek'].forEach(id => {
        document.getElementById(id).addEventListener('change', () => {
          applyFilters();
        });
      });

      // Apply Filter
      document.getElementById('btnApplyFilter').addEventListener('click', () => {
        closeMobileSidebar();
        applyFilters();
      });
      document.getElementById('btnSearch').addEventListener('click', () => {
        closeMobileSidebar();
        applyFilters();
      });
      document.getElementById('searchKeyword').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          closeMobileSidebar();
          applyFilters();
        }
      });

      // Quick Day Chips Click
      document.querySelectorAll('.day-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          document.querySelectorAll('.day-chip').forEach(c => c.classList.remove('active'));
          chip.classList.add('active');
          activeDay = chip.getAttribute('data-day');
          applyFilters();
        });
      });

      // Customer Type Mode Handlers (Sidebar Radio Group)
      document.querySelectorAll('input[name="custType"]').forEach(r => {
        r.addEventListener('change', (e) => {
          setCustomerType(e.target.value);
        });
      });

      // Customer Type Mode Handlers (Mobile Top Segment Buttons)
      document.querySelectorAll('.m-cust-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          setCustomerType(btn.getAttribute('data-type'));
        });
      });

      // Layer Toggles
      document.getElementById('filterGSRange').addEventListener('change', applyFilters);
      document.getElementById('chkShowLabels').addEventListener('change', () => {
        renderMap(currentFilteredCJ, currentFilteredGS);
      });
      document.getElementById('chkCluster').addEventListener('change', () => {
        renderMap(currentFilteredCJ, currentFilteredGS);
      });

      // Reset Filters
      document.getElementById('btnResetFilters').addEventListener('click', () => {
        document.getElementById('filterArea').value = '';
        document.getElementById('filterSup').value = '';
        document.getElementById('filterDistributor').value = '';
        document.getElementById('filterSalesman').value = '';
        document.getElementById('filterFrequency').value = '';
        document.getElementById('filterVisitWeek').value = '';
        document.getElementById('searchKeyword').value = '';
        document.getElementById('filterGSRange').value = '1km';
        document.getElementById('chkShowLabels').checked = true;
        activeDay = '';
        document.querySelectorAll('.day-chip').forEach(c => c.classList.remove('active'));
        document.querySelector('.day-chip[data-day=""]').classList.add('active');
        setCustomerType('all');
        populateFilters(false);
        applyFilters();
      });

      // Tab Switching
      document.getElementById('tabMapBtn').addEventListener('click', () => {
        document.getElementById('tabMapBtn').classList.add('active');
        document.getElementById('tabTableBtn').classList.remove('active');
        document.getElementById('mapView').style.display = 'block';
        document.getElementById('tableView').style.display = 'none';
        map.invalidateSize();
      });

      document.getElementById('tabTableBtn').addEventListener('click', () => {
        document.getElementById('tabTableBtn').classList.add('active');
        document.getElementById('tabMapBtn').classList.remove('active');
        document.getElementById('mapView').style.display = 'none';
        document.getElementById('tableView').style.display = 'block';
      });

      // Recenter Map
      document.getElementById('btnRecenterMap').addEventListener('click', () => {
        const all = [...currentFilteredCJ, ...currentFilteredGS];
        if (all.length > 0) {
          const latlngs = all.filter(r => r[3] && r[4]).map(r => [r[3], r[4]]);
          if (latlngs.length > 0) map.fitBounds(L.latLngBounds(latlngs), { padding: [40, 40] });
        }
      });

      // My Location GPS
      document.getElementById('btnMyLocation').addEventListener('click', trackMyLocation);

      // Export Excel (Pure Client-side)
      document.getElementById('btnExportExcel').addEventListener('click', exportToExcel);
    }
  

    function applyRLS() {
        if (!window.state || !window.state.currentUser) return;
        const user = window.state.currentUser;
        if (user.role === 'ASM' && user.scope_value && user.scope_value !== 'Toàn Quốc') {
            const selVung = document.getElementById('filterVung');
            if (selVung) {
                for (let i = 0; i < selVung.options.length; i++) {
                    if (selVung.options[i].value.toLowerCase().includes(user.scope_value.toLowerCase())) {
                        selVung.selectedIndex = i;
                        selVung.disabled = true;
                        break;
                    }
                }
                applyFilters();
            }
        }
    }

    async function init() {
        if (isInitialized) {
            if (map) {
                setTimeout(() => map.invalidateSize(), 200);
            }
            return;
        }

        if (isLoadingData) return;
        isLoadingData = true;

        const container = document.getElementById('gt-subview-routemap');
        if (container) {
            let loader = document.getElementById('routemap-loader');
            if (!loader) {
                loader = document.createElement('div');
                loader.id = 'routemap-loader';
                loader.className = 'absolute inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex flex-col items-center justify-center text-white space-y-3';
                loader.innerHTML = `
                    <div class="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                    <div class="font-bold text-sm tracking-wide">ĐANG TẢI DỮ LIỆU BẢN ĐỒ SỐ 100.909 ĐIỂM BÁN (MCP & GOLDEN STORE)...</div>
                    <div class="text-xs text-slate-300">Chuẩn bị bộ nhớ nhị phân GPS Client-side</div>
                `;
                container.appendChild(loader);
            }
        }

        try {
            if (!window.DMS_RAW_DATA) {
                await loadScript('data/modules/dms_data.js');
            }

            setupEventListeners();
            // Init Map and Events
            initMap();
            populateFilters();
            applyFilters();
            applyRLS();

            // Bind toolbar events
            const btnRecenter = document.getElementById('btnRecenterMap');
            if (btnRecenter) btnRecenter.onclick = () => {
                const all = [...currentFilteredCJ, ...currentFilteredGS];
                if (all.length > 0) {
                    const latlngs = all.filter(r => r[3] && r[4]).map(r => [r[3], r[4]]);
                    if (latlngs.length > 0) map.fitBounds(L.latLngBounds(latlngs), { padding: [40, 40] });
                }
            };

            const btnLoc = document.getElementById('btnMyLocation');
            if (btnLoc) btnLoc.onclick = trackMyLocation;

            const btnExp = document.getElementById('btnExportExcel');
            if (btnExp) btnExp.onclick = exportToExcel;

            const tabMap = document.getElementById('tabMapBtn');
            const tabTbl = document.getElementById('tabTableBtn');
            if (tabMap && tabTbl) {
                tabMap.onclick = () => {
                    tabMap.classList.add('active');
                    tabTbl.classList.remove('active');
                    document.getElementById('mapView').style.display = 'block';
                    document.getElementById('tableView').style.display = 'none';
                    map.invalidateSize();
                };
                tabTbl.onclick = () => {
                    tabTbl.classList.add('active');
                    tabMap.classList.remove('active');
                    document.getElementById('mapView').style.display = 'none';
                    document.getElementById('tableView').style.display = 'block';
                };
            }

            isInitialized = true;
            setTimeout(() => { if (map) map.invalidateSize(); }, 300);
        } catch (err) {
            console.error('Lỗi khởi tạo Route Map:', err);
        } finally {
            isLoadingData = false;
            const loader = document.getElementById('routemap-loader');
            if (loader) loader.remove();
        }
    }

    return {
        init: init,
        recenter: () => { if (map) map.invalidateSize(); }
    };
})();
