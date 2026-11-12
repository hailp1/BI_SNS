
        function initApp() {
            try {
                window._appBooted = false;
                const hash = (window.location.hash || '').replace('#', '');
                const validTabs = ['tab-overview', 'tab-gt', 'tab-mt', 'tab-b2b', 'tab-kr', 'tab-reports'];
                if (hash && validTabs.includes(hash)) {
                    state.activeTab = hash;
                }

                const savedLang = localStorage.getItem('cj_lang') || 'vi';
                setLanguage(savedLang);
                updateMonthChipsUI();

                let savedUserJson = localStorage.getItem('cj_current_user') || sessionStorage.getItem('cj_current_user');
                const sessionValid = typeof window._isSessionExpired !== 'function' || !window._isSessionExpired();
                const hasSavedSession = Boolean(savedUserJson && sessionValid && !localStorage.getItem('cj_logged_out'));

                if (!hasSavedSession) {
                    if (typeof window._clearAuthStorage === 'function') {
                        window._clearAuthStorage();
                    } else {
                        try {
                            ['cj_access_token', 'cj_payload_key', 'cj_current_user', 'cj_session_exp'].forEach(k => {
                                localStorage.removeItem(k);
                                sessionStorage.removeItem(k);
                            });
                        } catch (_) {}
                    }
                    window._appBooted = true;
                    initAuth();
                    return;
                }

                // User has a saved session (F5 reload): show authenticated dashboard & restore cached KPIs at 0ms!
                window._appBooted = true;
                const savedMode = localStorage.getItem('preferredViewMode');
                if (savedMode === 'mobile') {
                    toggleViewMode('mobile');
                }
                window._isStage1Render = true;
                try {
                    initAuth();
                } finally {
                    window._isStage1Render = false;
                }
                if (typeof window._restoreInstantUiSnapshot === 'function') {
                    window._restoreInstantUiSnapshot();
                }
            } catch (e) {
                console.error("Critical error in initApp:", e);
            }
        }

        async function syncDbRefreshMetadata() {
            try {
                const res = await fetch('/api/v1/dashboard/meta', { credentials: 'same-origin' });
                if (!res.ok) return null;
                const meta = await res.json();
                window.__DB_META__ = meta;
                if (meta && meta.data_refresh_date) {
                    try {
                        sessionStorage.setItem('cj_db_refresh_date', meta.data_refresh_date);
                        localStorage.setItem('cj_db_refresh_date', meta.data_refresh_date);
                    } catch (_) {}
                    const hdr = document.getElementById('header-data-refresh-date');
                    if (hdr) hdr.textContent = meta.data_refresh_date;
                    const lgn = document.getElementById('login-data-refresh-date');
                    if (lgn) lgn.textContent = 'Dữ liệu: ' + meta.data_refresh_date;
                }
                if (typeof window._pruneStaleCache === 'function') {
                    window._pruneStaleCache();
                }
                return meta;
            } catch (_) {
                return null;
            }
        }

        (async function bootApplication() {
            try {
                await Promise.race([
                    syncDbRefreshMetadata(),
                    new Promise(resolve => setTimeout(resolve, 1500))
                ]);
            } catch (_) {}
            initApp();
        })();

        window.addEventListener('hashchange', () => {
            const hash = (window.location.hash || '').replace('#', '');
            const validTabs = ['tab-overview', 'tab-gt', 'tab-mt', 'tab-b2b', 'tab-kr', 'tab-reports'];
            if (hash && validTabs.includes(hash) && (typeof state !== 'undefined') && state.activeTab !== hash) {
                if (typeof switchTab === 'function') {
                    switchTab(hash);
                }
            }
        });
