
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
                const hasSavedSession = Boolean(savedUserJson && !localStorage.getItem('cj_logged_out'));

                if (!hasSavedSession) {
                    try {
                        localStorage.removeItem('cj_access_token');
                        sessionStorage.removeItem('cj_access_token');
                        localStorage.removeItem('cj_payload_key');
                        sessionStorage.removeItem('cj_payload_key');
                        localStorage.removeItem('cj_current_user');
                        sessionStorage.removeItem('cj_current_user');
                    } catch (_) {}
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

        initApp();

        window.addEventListener('hashchange', () => {
            const hash = (window.location.hash || '').replace('#', '');
            const validTabs = ['tab-overview', 'tab-gt', 'tab-mt', 'tab-b2b', 'tab-kr', 'tab-reports'];
            if (hash && validTabs.includes(hash) && (typeof state !== 'undefined') && state.activeTab !== hash) {
                if (typeof switchTab === 'function') {
                    switchTab(hash);
                }
            }
        });
