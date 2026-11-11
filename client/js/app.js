// ============================================================================
// CJ FOODS ENTERPRISE CLIENT SCRIPT (INTERNATIONAL STANDARD)
// Architecture: RESTful Dynamic Ingestion via HttpOnly Secure Cookies
// ============================================================================

const API_BASE = '/api/v1';

document.addEventListener('DOMContentLoaded', async () => {
    initApp();
});

async function initApp() {
    // 1. Kiểm tra trạng thái đăng nhập qua HttpOnly Cookie an toàn
    try {
        const res = await fetch(`${API_BASE}/auth/me`, { credentials: 'include' });
        const data = await res.json();

        if (data.authenticated && data.user) {
            showDashboard(data.user);
        } else {
            showLoginModal();
        }
    } catch (e) {
        showLoginModal();
    }

    // 2. Bắt sự kiện Form Login
    const formLogin = document.getElementById('form-login');
    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();
            await handleLogin();
        });
    }

    // 3. Bắt sự kiện Logout
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', async () => {
            await handleLogout();
        });
    }

    // 4. Bắt sự kiện đổi tháng
    const selMonth = document.getElementById('sel-month');
    if (selMonth) {
        selMonth.addEventListener('change', async (e) => {
            await loadDashboardData(e.target.value);
        });
    }
}

async function handleLogin() {
    const errBox = document.getElementById('login-error');
    const btnSubmit = document.getElementById('btn-submit');
    const username = document.getElementById('inp-username').value.trim();
    const password = document.getElementById('inp-password').value;

    errBox.classList.add('hidden');
    btnSubmit.disabled = true;
    btnSubmit.innerText = 'Đang xác thực an toàn...';

    try {
        const res = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include', // Bắt buộc để nhận HttpOnly Cookie
            body: JSON.stringify({ username, password })
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.message || 'Đăng nhập thất bại');
        }

        if (data.require2fa) {
            alert('Tài khoản yêu cầu xác thực 2 bước (2FA): ' + data.message);
            // Quy trình 2FA sẽ đi tiếp ở đây
            return;
        }

        // Đăng nhập thành công, hiển thị dashboard
        showDashboard(data.user);
    } catch (err) {
        errBox.innerText = err.message;
        errBox.classList.remove('hidden');
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.innerText = 'ĐĂNG NHẬP HỆ THỐNG';
    }
}

async function handleLogout() {
    try {
        await fetch(`${API_BASE}/auth/logout`, {
            method: 'POST',
            credentials: 'include'
        });
    } catch (_) {}

    showLoginModal();
}

function showDashboard(user) {
    document.getElementById('login-modal').classList.add('hidden');
    document.getElementById('app-wrapper').classList.remove('hidden');

    if (user) {
        document.getElementById('user-display-name').innerText = user.fullName || user.username;
        document.getElementById('user-display-role').innerText = `${user.role || 'USER'} | ${user.scopeValue || 'TOÀN QUỐC'}`;
    }

    // Tải dữ liệu Dashboard từ PostgreSQL Data Mart qua REST API
    loadDashboardData('2026-10');
}

function showLoginModal() {
    document.getElementById('login-modal').classList.remove('hidden');
    document.getElementById('app-wrapper').classList.add('hidden');
    document.getElementById('inp-password').value = '';
}

async function loadDashboardData(month) {
    try {
        const res = await fetch(`${API_BASE}/dashboard/overview?month=${month}`, {
            credentials: 'include'
        });

        if (!res.ok) {
            if (res.status === 401) {
                showLoginModal();
                return;
            }
            throw new Error('Không thể tải số liệu từ Data Mart');
        }

        const data = await res.json();
        renderMetrics(data);
    } catch (err) {
        console.error('Lỗi nạp dữ liệu dashboard:', err);
    }
}

function renderMetrics(data) {
    const overall = data.overall || {};
    const channels = data.channels || {};

    // 1. Render Row 1: KPI Tổng
    document.getElementById('kpi-sellin').innerText = formatBn(overall.sellin_revenue);
    document.getElementById('kpi-target').innerText = formatBn(overall.target_sellin);
    document.getElementById('kpi-achievement').innerText = (overall.achievement_rate || 0).toFixed(1) + '%';
    document.getElementById('kpi-ly').innerText = formatBn(overall.ly_sellin);

    document.getElementById('kpi-yoy').innerText = '+' + (overall.yoy_growth_rate || 0).toFixed(1) + '%';
    document.getElementById('kpi-mom').innerText = '+' + (overall.mom_mtd_rate || 0).toFixed(1) + '%';
    document.getElementById('kpi-gap').innerText = formatBn(overall.gap_sellin);
    document.getElementById('kpi-yoy-amt').innerText = '+' + formatBn(overall.yoy_growth_amt);

    // 2. Render Row 2: 4 Channel Cards
    renderChanCard('gt', channels['GT']);
    renderChanCard('mt', channels['MT']);
    renderChanCard('b2b', channels['B2B']);
    renderChanCard('kr', channels['KR']);
}

function renderChanCard(prefix, item) {
    if (!item) return;

    const elSellin = document.getElementById(`${prefix}-sellin`);
    const elTarget = document.getElementById(`${prefix}-target`);
    const elShare = document.getElementById(`${prefix}-share`);
    const elYoy = document.getElementById(`${prefix}-yoy`);
    const elMom = document.getElementById(`${prefix}-mom`);

    if (elSellin) elSellin.innerText = formatBn(item.sellin_revenue);
    if (elShare) elShare.innerText = `Tỷ trọng: ${(item.channel_share || 0).toFixed(1)}%`;
    
    if (elTarget) {
        const ach = (item.achievement_rate || 0).toFixed(1);
        const achColor = item.achievement_rate >= 100 ? '#15803d' : '#dc2626';
        elTarget.innerHTML = `Mục tiêu: ${formatBn(item.target_sellin)} (<span style="color:${achColor}; font-weight:bold;">Đạt ${ach}%</span>)`;
    }

    if (elYoy) elYoy.innerText = (item.yoy_growth_rate >= 0 ? '+' : '') + (item.yoy_growth_rate || 0).toFixed(1) + '%';
    if (elMom) elMom.innerText = (item.mom_mtd_rate >= 0 ? '+' : '') + (item.mom_mtd_rate || 0).toFixed(1) + '%';
}

function formatBn(val) {
    return (val || 0).toFixed(2) + ' B';
}
