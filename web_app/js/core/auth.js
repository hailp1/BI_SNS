
// =========================================================================
// ACCOUNT LOCKOUT & UNLOCK MANAGEMENT (ADMIN)
// =========================================================================
window.adminToggleUserStatus = async function(username, makeActive) {
    if (!username) return;
    const actionText = makeActive ? 'MỞ KHÓA' : 'KHÓA';
    const confirmMsg = makeActive 
        ? `Xác nhận MỞ KHÓA cho tài khoản @${username}?\n\nSau khi mở khóa, người dùng có thể đăng nhập bình thường và số lần đăng nhập sai sẽ được reset về 0.`
        : `Xác nhận KHÓA tài khoản @${username}?\n\nTài khoản sẽ bị tạm khóa và không thể đăng nhập vào hệ thống.`;
    
    if (!confirm(confirmMsg)) return;
    
    try {
        const token = sessionStorage.getItem('cj_access_token') || localStorage.getItem('cj_access_token') || localStorage.getItem('token') || sessionStorage.getItem('token');
        const res = await fetch(`/api/v1/users/${encodeURIComponent(username)}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token ? `Bearer ${token}` : ''
            },
            body: JSON.stringify({ isActive: Boolean(makeActive) })
        });
        
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.message || `Lỗi cập nhật trạng thái (HTTP ${res.status})`);
        }
        
        // Update in-memory user
        if (typeof getAppUsers === 'function') {
            const users = getAppUsers();
            const u = users.find(x => (x.username || '').toLowerCase() === username.toLowerCase());
            if (u) {
                u.is_active = makeActive ? 1 : 0;
                if (makeActive) {
                    u.failed_attempts = 0;
                }
            }
        }
        
        if (typeof showToast === 'function') {
            showToast(`Đã ${actionText.toLowerCase()} thành công tài khoản @${username}!`, 'success');
        } else {
            alert(`Đã ${actionText.toLowerCase()} thành công tài khoản @${username}!`);
        }
        
        // Re-render user table
        if (typeof renderAdminUserTable === 'function') {
            renderAdminUserTable();
        }
        
        // Refresh modal if currently viewing this user
        if (typeof selectedDetailUser !== 'undefined' && selectedDetailUser && (selectedDetailUser.username || '').toLowerCase() === username.toLowerCase()) {
            if (typeof showUserDetail === 'function') {
                showUserDetail(username);
            }
        }
    } catch (err) {
        console.error('Lỗi khi thay đổi trạng thái user:', err);
        alert(`Không thể ${actionText.toLowerCase()} tài khoản: ` + err.message);
    }
};

window.adminToggleUserStatusFromDetail = function() {
    if (typeof selectedDetailUser === 'undefined' || !selectedDetailUser) return;
    const isLocked = (selectedDetailUser.is_active === 0 || selectedDetailUser.is_active === false || (selectedDetailUser.failed_attempts || 0) >= 5);
    adminToggleUserStatus(selectedDetailUser.username, isLocked);
};

// =========================================================================
// ZERO-TRUST LOCALSTORAGE CREDENTIAL PURGE (ISO/IEC 27001 COMPLIANT)
// =========================================================================
(function() {
    try {
        localStorage.removeItem('cj_app_users');
        localStorage.removeItem('cj_custom_passwords');
        localStorage.removeItem('cj_logged_out');
        sessionStorage.removeItem('cj_logged_out');
        localStorage.removeItem('cj_users');
        localStorage.removeItem('cj_deleted_users');
    } catch (_) {}
})();

function sha256(ascii) {

            if (!ascii && ascii !== 0) return '';

            try {

                var utf8 = unescape(encodeURIComponent(String(ascii)));

                function rightRotate(value, amount) {

                    return (value >>> amount) | (value << (32 - amount));

                }

                var mathPow = Math.pow;

                var maxWord = mathPow(2, 32);

                var lengthProperty = 'length';

                var i, j;

                var result = '';

                var words = [];

                var asciiBitLength = utf8[lengthProperty] * 8;

                

                var hash = [

                    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,

                    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19

                ];

                var k = [

                    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,

                    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,

                    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,

                    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,

                    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,

                    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,

                    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,

                    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2

                ];



                utf8 += String.fromCharCode(0x80);

                while (utf8[lengthProperty] % 64 - 56) utf8 += String.fromCharCode(0);

                for (i = 0; i < utf8[lengthProperty]; i++) {

                    j = utf8.charCodeAt(i);

                    words[i >> 2] |= j << ((3 - i) % 4) * 8;

                }

                words[words[lengthProperty]] = ((asciiBitLength / maxWord) | 0);

                words[words[lengthProperty]] = (asciiBitLength);

                for (j = 0; j < words[lengthProperty];) {

                    var w = words.slice(j, j += 16);

                    var oldHash = hash.slice(0);

                    for (i = 0; i < 64; i++) {

                        var w15 = w[i - 15], w2 = w[i - 2];

                        var a = hash[0], e = hash[4];

                        var temp1 = hash[7]

                            + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25))

                            + ((e & hash[5]) ^ ((~e) & hash[6]))

                            + k[i]

                            + (w[i] = (i < 16) ? w[i] : (

                                    w[i - 16]

                                    + (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3))

                                    + w[i - 7]

                                    + (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))

                                ) | 0

                            );

                        var temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22))

                            + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));

                        hash = [(temp1 + temp2) | 0].concat(hash.slice(0, 7));

                        hash[4] = (hash[4] + temp1) | 0;

                    }

                    for (i = 0; i < 8; i++) {

                        hash[i] = (hash[i] + oldHash[i]) | 0;

                    }

                }

                for (i = 0; i < 8; i++) {

                    for (j = 3; j + 1; j--) {

                        var b = (hash[i] >> (j * 8)) & 255;

                        result += ((b < 16) ? '0' : '') + b.toString(16);

                    }

                }

                return result.toLowerCase();

            } catch(e) {

                console.error("SHA256 calculation error:", e);

                return '';

            }

        }

        window.sha256 = sha256;



        // =========================================================================







        let _inMemoryUsers = [];

function getCustomPasswords() {
    return {};
}

function saveCustomPassword(username, newPass, newHash) {
    // Deprecated - passwords managed strictly server-side via Bcrypt in PostgreSQL
}

window.getCustomPasswords = getCustomPasswords;
window.saveCustomPassword = saveCustomPassword;

function getDeletedUsers() {
    return [];
}

const BASE_APP_USERS = [];

function getAppUsers() {
    return _inMemoryUsers;
}

function saveAppUsers(users) {
    _inMemoryUsers = users || [];
}

function getUserPassword(u) {
    return '••••••••';
}

async function syncUsersFromDatabase() {
    try {
        const token = sessionStorage.getItem('cj_access_token') || localStorage.getItem('cj_access_token');
        if (!token) return [];
        const res = await fetch('/api/v1/users', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (res.ok) {
            const json = await res.json();
            if (json && json.status === 'success' && Array.isArray(json.data)) {
                _inMemoryUsers = json.data.map(u => ({
                    id: u.id,
                    username: u.username,
                    email: u.email || '',
                    full_name: u.fullName || u.full_name || u.username,
                    role: u.role,
                    channel: u.channel,
                    scope_level: u.scopeLevel || u.scope_level || 'all',
                    scope_value: u.scopeValue || u.scope_value || 'all',
                    is_active: u.isActive !== undefined ? (u.isActive ? 1 : 0) : 1,
                    failed_attempts: u.failedLoginAttempts || 0,
                    last_login_at: u.lastLoginAt || null,
                    avatar: u.avatar || null,
                    updated_at: u.updatedAt || new Date().toISOString()
                }));
                if (typeof renderAdminUserTable === 'function') {
                    renderAdminUserTable();
                }
                return _inMemoryUsers;
            }
        }
    } catch (err) {
        console.warn('syncUsersFromDatabase warning:', err);
    }
    return _inMemoryUsers;
}














        function getCloudWebhookUrl() {







            return localStorage.getItem('cj_cloud_webhook_url') || (typeof CLOUD_CONFIG !== 'undefined' && CLOUD_CONFIG.enabled && CLOUD_CONFIG.webhook_url) || '';







        }















        function promptCloudConfig() {







            const currentUrl = getCloudWebhookUrl();







            const input = prompt(







                `CẤU HÌNH GOOGLE APPS SCRIPT WEBHOOK:















Nhập URL Webhook của Google Apps Script (bắt đầu bằng https://script.google.com/.../exec):







(Để trống nếu muốn hủy bỏ URL tùy chỉnh)`,







                currentUrl







            );







            if (input !== null) {







                const trimmed = input.trim();







                if (trimmed) {







                    localStorage.setItem('cj_cloud_webhook_url', trimmed);







                    alert("✅ Đã lưu cấu hình Cloud Webhook URL thành công! Bây giờ bạn có thể bấm 'Đồng Bộ Đám Mây'.");







                } else {







                    localStorage.removeItem('cj_cloud_webhook_url');







                    alert("Đã xóa cấu hình Cloud Webhook URL tùy chỉnh.");







                }







            }







        }















        // =========================================================================







        // TWO-WAY CLOUD SYNC: LATEST WINS (MILLI-SECOND ACCURATE)







        // =========================================================================







        // =========================================================================







        // RECONCILE CLOUD & LOCAL USERS: LATEST WINS & ANTI-REVIVAL BLACKLIST







        // =========================================================================







        function reconcileCloudUsers(cloudUsers) {







            let localUsers = getAppUsers();







            const deletedUsers = getDeletedUsers();







            const deletedMap = {};







            deletedUsers.forEach(d => { deletedMap[(d.username || '').toLowerCase().trim()] = Date.parse(d.deleted_at) || 0; });















            let pulledCount = 0;







            let pushedCount = 0;







            let pushPayload = [];















            if (!Array.isArray(cloudUsers)) return { localUsers, pulledCount: 0, pushedCount: 0, pushPayload: [] };















            // 1. Reconcile Cloud to Local







            for (const cu of cloudUsers) {







                const uName = (cu.username || '').toLowerCase().trim();







                if (!uName) continue;







                const cloudTime = Date.parse(cu.updated_at) || 0;







                const localDelTime = deletedMap[uName] || 0;















                // If user was deleted locally with a newer timestamp than cloud update -> enforce deletion on cloud







                if (localDelTime > 0 && localDelTime >= cloudTime) {







                    pushPayload.push({







                        action: 'delete_user',







                        username: uName,







                        is_active: 0,







                        updated_at: new Date(localDelTime).toISOString()







                    });







                    pushedCount++;







                    continue;







                }















                // If cloud marks user inactive (is_active === 0)







                if (cu.is_active === 0 || cu.is_active === '0') {







                    localUsers = localUsers.filter(x => (x.username || '').toLowerCase().trim() !== uName);







                    addDeletedUser(uName);







                    pulledCount++;







                    continue;







                }















                const cuHash = (cu.password_hash || '').toString().trim() || sha256('cj@2026');















                const cuAvatar = (cu.avatar !== undefined && cu.avatar !== null) ? String(cu.avatar).trim() : '';















                const existingIdx = localUsers.findIndex(x => (x.username || '').toLowerCase().trim() === uName);







                if (existingIdx === -1) {







                    // Cloud has user that local doesn't have, and not blacklisted (or cloud is newer than deletion)







                    if (localDelTime > 0 && cloudTime > localDelTime) {







                        removeDeletedUser(uName);







                    }







                    if (!deletedMap[uName] || cloudTime > localDelTime) {







                        localUsers.push({







                            username: cu.username,







                            password_hash: cuHash,







                            full_name: cu.full_name || cu.username,







                            channel: cu.channel || 'all',







                            role: cu.role || 'viewer',







                            scope_level: cu.scope_level || 'all',







                            scope_value: cu.scope_value || 'Toàn quốc',







                            is_active: 1,







                            avatar: cuAvatar,







                            updated_at: cu.updated_at || new Date().toISOString()







                        });







                        pulledCount++;







                    }







                } else {







                    // Compare timestamps (Latest Wins)







                    const localTime = Date.parse(localUsers[existingIdx].updated_at) || 0;







                    const localAvatar = (localUsers[existingIdx].avatar || '').toString().trim();







                    const finalAvatar = cuAvatar || localAvatar;















                    if (cloudTime > localTime) {







                        // Cloud is newer: update local







                        localUsers[existingIdx] = {







                            ...localUsers[existingIdx],







                            password_hash: cuHash,







                            full_name: cu.full_name || localUsers[existingIdx].full_name,







                            channel: cu.channel || localUsers[existingIdx].channel,







                            role: cu.role || localUsers[existingIdx].role,







                            scope_level: cu.scope_level || localUsers[existingIdx].scope_level,







                            scope_value: cu.scope_value || localUsers[existingIdx].scope_value,







                            is_active: 1,







                            avatar: finalAvatar,







                            updated_at: cu.updated_at







                        };







                        pulledCount++;







                    } else if (localTime > cloudTime) {







                        // Local is newer: push to cloud







                        pushPayload.push({







                            action: 'upsert_user',







                            ...localUsers[existingIdx]







                        });







                        pushedCount++;







                    } else {







                        // Timestamps equal: if local has avatar but cloud does not, push to cloud







                        if (localAvatar && !cuAvatar) {







                            pushPayload.push({







                                action: 'upsert_user',







                                ...localUsers[existingIdx]







                            });







                            pushedCount++;







                        } else if (cuAvatar && !localAvatar) {







                            localUsers[existingIdx].avatar = cuAvatar;







                            pulledCount++;







                        }







                    }







                }







            }















            // 2. Check local users not in cloud -> push to cloud







            const cloudUsernameSet = new Set(cloudUsers.map(c => (c.username || '').toLowerCase().trim()));







            for (const lu of localUsers) {







                const lName = (lu.username || '').toLowerCase().trim();







                if (lName && !cloudUsernameSet.has(lName)) {







                    pushPayload.push({







                        action: 'upsert_user',







                        ...lu







                    });







                    pushedCount++;







                }







            }















            saveAppUsers(localUsers);







            return { localUsers, pulledCount, pushedCount, pushPayload };







        }















        let isSyncingCloud = false;















        async function syncWithCloud(isManual = false) {







            if (isSyncingCloud) return;







            // BẢO MẬT: Chỉ Quản trị viên (Admin) mới có quyền đồng bộ danh bạ người dùng







            if (!currentUser || (currentUser.role || '').toLowerCase() !== 'admin') {







                if (isManual) {







                    alert("Từ chối truy cập: Chỉ Quản trị viên (Admin) mới có quyền đồng bộ danh sách tài khoản!");







                }







                return;







            }







            const webhookUrl = getCloudWebhookUrl();







            if (!webhookUrl) {







                if (isManual) {







                    if (confirm(`Chưa có Webhook URL của Google Apps Script.















Bạn có muốn nhập URL Web App ngay bây giờ để bật tính năng đồng bộ đám mây?`)) {







                        promptCloudConfig();







                    }







                }







                return;







            }















            const iconSync = document.getElementById('cloud-sync-icon');







            const textSync = document.getElementById('cloud-sync-text');















            try {







                isSyncingCloud = true;







                if (iconSync) iconSync.classList.add('animate-spin');







                if (textSync) textSync.textContent = "Đang đồng bộ...";















                let cloudUsers = [];







                try {







                    const sep = webhookUrl.includes('?') ? '&' : '?';







                    const adminU = encodeURIComponent(currentUser.username);







                    const adminH = encodeURIComponent(currentUser.password_hash || '');







                    const authSyncUrl = `${webhookUrl}${sep}action=get_users&admin_u=${adminU}&admin_h=${adminH}`;







                    const resp = await fetch(authSyncUrl, { method: 'GET' });







                    if (resp.ok) {







                        const data = await resp.json();







                        if (data && Array.isArray(data.users)) {







                            cloudUsers = data.users;







                        }







                    }







                } catch(fetchErr) {







                    console.warn("Cloud GET error (likely CORS or network offline):", fetchErr);







                }















                const { localUsers, pulledCount, pushedCount, pushPayload } = reconcileCloudUsers(cloudUsers);















                // Send updates to cloud with text/plain to prevent CORS preflight block







                if (pushPayload.length > 0) {







                    try {







                        const postBody = {







                            admin_u: currentUser.username,







                            admin_h: currentUser.password_hash || '',







                            users: pushPayload







                        };







                        await fetch(webhookUrl, {







                            method: 'POST',







                            headers: { 'Content-Type': 'text/plain;charset=utf-8' },







                            body: JSON.stringify(postBody),







                            mode: 'no-cors'







                        });







                    } catch(postErr) {







                        console.warn("Push to cloud webhook error:", postErr);







                    }







                }















                if (currentUser) {







                    const updatedCurrent = localUsers.find(u => u.username.toLowerCase() === currentUser.username.toLowerCase());







                    if (updatedCurrent) {







                        const scopeChanged = (







                            (updatedCurrent.role || '').toLowerCase() !== (currentUser.role || '').toLowerCase() ||







                            (updatedCurrent.channel || '').toUpperCase() !== (currentUser.channel || '').toUpperCase() ||







                            (updatedCurrent.scope_level || '').toLowerCase() !== (currentUser.scope_level || '').toLowerCase() ||







                            String(updatedCurrent.scope_value || '') !== String(currentUser.scope_value || '')







                        );







                        currentUser = updatedCurrent;







                        localStorage.setItem('cj_current_user', JSON.stringify(currentUser));







                        if (scopeChanged) {







                            applyUserScope(currentUser);







                        } else {







                            // Chỉ cập nhật hiển thị hồ sơ cá nhân / avatar, giữ nguyên tab và bộ lọc người dùng đang thao tác







                            if (typeof updateUserProfileUI === 'function') {







                                updateUserProfileUI(currentUser);







                            }







                        }







                    }







                }















                renderAdminUserTable();















                if (isManual) {







                    alert(







                        `✅ ĐỒNG BỘ ĐÁM MÂY THÀNH CÔNG (TWO-WAY LATEST WINS)!















• Cập nhật từ Cloud về Local: ${pulledCount} tài khoản







• Đẩy từ Local lên Cloud: ${pushedCount} tài khoản







• Tổng số tài khoản hoạt động: ${localUsers.length}















Dữ liệu đã được đồng nhất hoàn toàn!`







                    );







                }







            } catch(err) {







                console.error("Cloud sync exception:", err);







                if (isManual) {







                    alert("⚠️ Có lỗi xảy ra trong quá trình đồng bộ: " + err.message);







                }







            } finally {







                isSyncingCloud = false;







                if (iconSync) iconSync.classList.remove('animate-spin');







                if (textSync) textSync.textContent = "Đồng Bộ Đám Mây";







            }







        }















        function applyUnauthenticatedState() {







            // 1. TUYỆT ĐỐI ẨN TOÀN BỘ DASHBOARD, KHÔNG ĐỂ LỘ SỐ LIỆU KHI CHƯA ĐĂNG NHẬP







            const appContainer = document.getElementById('authenticated-app-container');







            if (appContainer) {







                appContainer.style.setProperty('display', 'none', 'important');







            }















            // 2. HIỂN THỊ MÀN HÌNH ĐĂNG NHẬP TOÀN MÀN HÌNH







            const modal = document.getElementById('login-overlay');







            if (modal) {







                modal.style.setProperty('display', 'flex', 'important');







                modal.classList.add('active');







                const closeBtn = document.getElementById('login-modal-close-btn');







                if (closeBtn) closeBtn.classList.add('hidden');







            }















            const nameEl = document.getElementById('user-display-name');







            const subEl = document.getElementById('user-display-sub');







            const adminBtn = document.getElementById('btn-user-admin');







            const pwdBtn = document.getElementById('btn-change-password');







            const logoutBtn = document.getElementById('btn-logout');















            const mNameEl = document.getElementById('mobile-drawer-user-name');







            const mRoleEl = document.getElementById('mobile-drawer-user-role');







            const mAdminBtn = document.getElementById('m-btn-admin');















            if (nameEl) nameEl.textContent = "Chưa đăng nhập";







            if (subEl) subEl.textContent = "Vui lòng đăng nhập";







            if (adminBtn) adminBtn.style.setProperty('display', 'none', 'important');

            try {

                const allCustomizerBtns = document.querySelectorAll('[id^="btn-table-customizer-"]');

                allCustomizerBtns.forEach(b => b.remove());

            } catch (e) {}







            if (pwdBtn) pwdBtn.style.setProperty('display', 'none', 'important');







            if (logoutBtn) logoutBtn.style.setProperty('display', 'none', 'important');







            const headerAvatarImg = document.getElementById('header-avatar-img');







            const headerAvatarFallback = document.getElementById('header-avatar-fallback');







            if (headerAvatarImg) { headerAvatarImg.src = ''; headerAvatarImg.classList.add('hidden'); }







            if (headerAvatarFallback) { headerAvatarFallback.classList.remove('hidden'); headerAvatarFallback.textContent = '👤'; }







            const mAvatarImg = document.getElementById('m-drawer-avatar-img');







            const mAvatarFallback = document.getElementById('m-drawer-avatar-fallback');







            if (mAvatarImg) { mAvatarImg.src = ''; mAvatarImg.classList.add('hidden'); }







            if (mAvatarFallback) { mAvatarFallback.classList.remove('hidden'); mAvatarFallback.textContent = '👤'; }















            if (mNameEl) mNameEl.textContent = "Chưa đăng nhập";







            if (mRoleEl) mRoleEl.textContent = "Vui lòng đăng nhập";







            if (mAdminBtn) mAdminBtn.classList.add('hidden');







        }















        async function initAuth() {
    let token = sessionStorage.getItem('cj_access_token') || localStorage.getItem('cj_access_token');
    if (token && typeof window._isJwtExpired === 'function' && window._isJwtExpired(token)) {
        if (typeof window._clearAuthStorage === 'function') window._clearAuthStorage();
        token = null;
    }

    // 1. Luôn xác thực phiên hiện tại với Backend (/api/v1/auth/me) qua HttpOnly Cookie hoặc Bearer Token
    const isLoggedOut = localStorage.getItem('cj_logged_out') === '1';
    let backendAuthenticated = false;
    if (!isLoggedOut) {
        try {
            const headers = token ? { 'Authorization': 'Bearer ' + token } : {};
            const meRes = await fetch('/api/v1/auth/me', {
                credentials: 'same-origin',
                headers
            });
            if (meRes.ok) {
                const meData = await meRes.json();
                if (meData && meData.authenticated && meData.user) {
                    backendAuthenticated = true;
                    const u = meData.user;
                    const safeUser = {
                        username: u.username,
                        full_name: u.fullName || u.full_name || u.username,
                        role: u.role || 'viewer',
                        channel: u.channel || 'all',
                        scope_level: u.scopeLevel || u.scope_level || 'all',
                        scope_value: u.scopeValue || u.scope_value || 'Toàn Quốc'
                    };
                    sessionStorage.setItem('cj_current_user', JSON.stringify(safeUser));
                    if (localStorage.getItem('cj_current_user')) {
                        localStorage.setItem('cj_current_user', JSON.stringify(safeUser));
                    }
                    if (meData.payload_key) {
                        sessionStorage.setItem('cj_payload_key', meData.payload_key);
                    }
                } else {
                    // Phiên backend đã hết hạn hoặc bị thu hồi -> xóa triệt để token cũ
                    if (typeof window._clearAuthStorage === 'function') window._clearAuthStorage();
                }
            } else if (meRes.status === 401 || meRes.status === 403) {
                if (typeof window._clearAuthStorage === 'function') window._clearAuthStorage();
            }
        } catch (_) {}
    }

    let savedUserJson = sessionStorage.getItem('cj_current_user') || localStorage.getItem('cj_current_user');
    token = sessionStorage.getItem('cj_access_token') || localStorage.getItem('cj_access_token');
    let user = null;

    if (savedUserJson && (backendAuthenticated || (token && (typeof window._isJwtExpired !== 'function' || !window._isJwtExpired(token))))) {
        try {
            user = JSON.parse(savedUserJson);
        } catch(e) {
            user = null;
        }
    }

    if (user) {
                window._sessionExpiryHandled = false;
                currentUser = user;
                window.currentUser = user;
                window._isStage1Render = true;
                try {
                    applyUserScope(currentUser);
                } finally {
                    window._isStage1Render = false;
                }
            } else {
                currentUser = null;
                window.currentUser = null;
                applyUnauthenticatedState();
                showLoginModal();
            }















            // Background silent cloud sync (CHỈ DÀNH CHO ADMIN ĐÃ ĐĂNG NHẬP)







            if (currentUser && (currentUser.role || '').toLowerCase() === 'admin') {







                setTimeout(() => { syncWithCloud(false); }, 1500);







            }







        }















        // =========================================================================







        // STRICT CHANNEL RBAC (ISOLATE CHANNELS: ALL, GT, MT, B2B, KR)







        // =========================================================================







        function resolveUserEffectiveChannel(user) {







            if (!user) return 'GT';







            const roleLower = (user.role || 'viewer').toLowerCase().trim();







            const rawChan = (user.channel || '').toUpperCase().trim();







            const scopeLvl = (user.scope_level || '').toLowerCase().trim();







            const scopeVal = (user.scope_value || '').toLowerCase().trim();















            // 1. Super Admin, BOD, Director with ALL scope







            if (['admin', 'bod', 'director'].includes(roleLower) && (rawChan === 'ALL' || !rawChan)) {







                return 'ALL';







            }















            // 2. Explicit single channel set







            if (['GT', 'MT', 'B2B', 'KR'].includes(rawChan)) {







                return rawChan;







            }















            // 3. Infer from role & scope level







            if (['rsm', 'asm', 'gsbh', 'npp'].includes(roleLower) || 







                ['vung', 'office', 'npp', 'gt_region'].includes(scopeLvl) || 







                scopeVal.includes('kênh gt') || scopeVal.includes('kenh gt')) {







                return 'GT';







            }







            if (roleLower === 'head_gt') return 'GT';







            if (roleLower === 'head_mt') return 'MT';







            if (roleLower === 'head_b2b' || roleLower === 'b2b_lead') return 'B2B';







            if (roleLower === 'head_kr' || roleLower === 'kr_lead') return 'KR';















            if (scopeLvl.includes('mt') || ['chain', 'store', 'mt_account', 'mt_subchannel', 'mt_all'].includes(scopeLvl) || 







                scopeVal.includes('kênh mt') || scopeVal.includes('kenh mt')) {







                return 'MT';







            }







            if (scopeLvl.includes('b2b') || ['segment', 'b2b_all'].includes(scopeLvl) || 







                scopeVal.includes('kênh b2b') || scopeVal.includes('kenh b2b')) {







                return 'B2B';







            }







            if (scopeLvl.includes('kr') || ['agent', 'kr_all'].includes(scopeLvl) || 







                scopeVal.includes('kênh kr') || scopeVal.includes('kenh kr')) {







                return 'KR';







            }















            if (roleLower === 'kam') {







                if (scopeVal.includes('cgv') || scopeVal.includes('hrc') || scopeVal.includes('horeca')) return 'B2B';







                if (scopeVal.includes('kmart') || scopeVal.includes('k-market') || scopeVal.includes('kr')) return 'KR';







                return 'MT';







            }















            if (rawChan === 'ALL' || !rawChan) {







                return 'ALL';







            }















            return 'GT';







        }















        function getAllowedTabsForUser(user) {







            if (!user) return ['tab-gt'];







            const effChan = resolveUserEffectiveChannel(user);







            if (effChan === 'ALL') {







                return ['tab-overview', 'tab-gt', 'tab-mt', 'tab-b2b', 'tab-kr', 'tab-reports'];







            }







            if (effChan === 'GT') {







                return ['tab-gt'];







            }







            if (effChan === 'MT') {







                return ['tab-mt'];







            }







            if (effChan === 'B2B') {







                return ['tab-b2b'];







            }







            if (effChan === 'KR') {







                return ['tab-kr'];







            }







            return ['tab-gt'];







        }















        function isTabAllowedForUser(tabId, user = currentUser) {







            const allowed = getAllowedTabsForUser(user);







            return allowed.includes(tabId);







        }















        function updateSidebarNavByChannel(channel) {







            const navOverview = document.getElementById('nav-tab-overview');







            const navGt = document.getElementById('nav-tab-gt');







            const navMt = document.getElementById('nav-tab-mt');







            const navB2b = document.getElementById('nav-tab-b2b');







            const navKr = document.getElementById('nav-tab-kr');







            const navReports = document.getElementById('nav-tab-reports');















            const mNavOverview = document.getElementById('m-nav-tab-overview');







            const mNavGt = document.getElementById('m-nav-tab-gt');







            const mNavMt = document.getElementById('m-nav-tab-mt');







            const mNavB2b = document.getElementById('m-nav-tab-b2b');







            const mNavKr = document.getElementById('m-nav-tab-kr');







            const mNavReports = document.getElementById('m-nav-tab-reports');















            const chan = (channel || 'ALL').toUpperCase();















            const show = (el) => { if (el) { el.style.setProperty('display', 'flex', 'important'); el.classList.remove('hidden'); } };







            const hide = (el) => { if (el) { el.style.setProperty('display', 'none', 'important'); el.classList.add('hidden'); } };















            if (chan === 'ALL') {







                show(navOverview); show(navGt); show(navMt); show(navB2b); show(navKr); show(navReports);







                show(mNavOverview); show(mNavGt); show(mNavMt); show(mNavB2b); show(mNavKr); show(mNavReports);







            } else if (chan === 'GT') {







                hide(navOverview); show(navGt); hide(navMt); hide(navB2b); hide(navKr); hide(navReports);







                hide(mNavOverview); show(mNavGt); hide(mNavMt); hide(mNavB2b); hide(mNavKr); hide(mNavReports);







            } else if (chan === 'MT') {







                hide(navOverview); hide(navGt); show(navMt); hide(navB2b); hide(navKr); hide(navReports);







                hide(mNavOverview); hide(mNavGt); show(mNavMt); hide(mNavB2b); hide(mNavKr); hide(mNavReports);







            } else if (chan === 'B2B') {







                hide(navOverview); hide(navGt); hide(navMt); show(navB2b); hide(navKr); hide(navReports);







                hide(mNavOverview); hide(mNavGt); hide(mNavMt); show(navB2b); hide(mNavKr); hide(mNavReports);







            } else if (chan === 'KR') {







                hide(navOverview); hide(navGt); hide(navMt); hide(navB2b); show(navKr); hide(navReports);







                hide(mNavOverview); hide(mNavGt); hide(mNavMt); hide(mNavB2b); show(mNavKr); hide(mNavReports);







            }







        }















        // =========================================================================







        // DATA SCOPING & STRICT RBAC ENGINE







        // =========================================================================







        function removeVietnameseTones(str) {







            if (!str) return '';







            str = String(str);







            str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");







            str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");







            str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");







            str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");







            str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");







            str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");







            str = str.replace(/đ/g, "d");







            str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");







            str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");







            str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I");







            str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O");







            str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");







            str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y");







            str = str.replace(/Đ/g, "D");







            return str;







        }















        function cleanTokenString(s) {







            if (!s) return '';







            let t = removeVietnameseTones(String(s)).toLowerCase();







            t = t.replace(/(cong ty|tnhh|tmdv|cty|dntn|npp|gsbh|vung|mien|kenh|group|mt|gt|b2b|kr)/g, ' ');







            t = t.replace(/[^a-z0-9]/g, '');







            if (t === 'vinmart') t = 'winmart';







            if (t === 'coopmart') t = 'coop';







            return t;







        }















        function normMatch(s1, s2) {







            if (!s1 || !s2) return false;







            let n1 = removeVietnameseTones(String(s1)).toLowerCase().replace(/[^a-z0-9]/g, '');







            let n2 = removeVietnameseTones(String(s2)).toLowerCase().replace(/[^a-z0-9]/g, '');







            if (n1 === 'vinmart') n1 = 'winmart';







            if (n2 === 'vinmart') n2 = 'winmart';







            if (n1 === 'coopmart') n1 = 'coop';







            if (n2 === 'coopmart') n2 = 'coop';







            if (n1 === n2 || n1.includes(n2) || n2.includes(n1)) return true;















            const c1 = cleanTokenString(s1);







            const c2 = cleanTokenString(s2);







            if (c1 && c2 && (c1 === c2 || c1.includes(c2) || c2.includes(c1))) return true;







            return false;







        }















        function updateUserProfileUI(user) {







            if (!user) return;







            const roleLower = (user.role || 'viewer').toLowerCase();







            const effChan = resolveUserEffectiveChannel(user);







            const chanUpper = effChan.toUpperCase();







            const scopeVal = user.scope_value || 'all';















            const displayName = user.full_name || user.username;







            const roleUpper = roleLower.toUpperCase();







            let scopeText = (scopeVal && scopeVal !== 'all') ? scopeVal : t('scope_all');







            if (!scopeVal || scopeVal.toLowerCase() === 'all' || scopeVal === 'Toàn Quốc' || scopeVal === 'Tất cả') {







                scopeText = t('scope_all');







            }







            const displaySub = `${chanUpper} | ${roleUpper} | ${scopeText}`;















            const nameEl = document.getElementById('user-display-name');







            const subEl = document.getElementById('user-display-sub');







            const adminBtn = document.getElementById('btn-user-admin');







            const pwdBtn = document.getElementById('btn-change-password');







            const logoutBtn = document.getElementById('btn-logout');















            const mNameEl = document.getElementById('mobile-drawer-user-name');







            const mRoleEl = document.getElementById('mobile-drawer-user-role');







            const mAdminBtn = document.getElementById('m-btn-admin');















            if (nameEl) nameEl.textContent = displayName;







            if (subEl) subEl.textContent = displaySub;







            if (mNameEl) mNameEl.textContent = displayName;







            if (mRoleEl) mRoleEl.textContent = displaySub;















            if (pwdBtn) pwdBtn.style.setProperty('display', 'inline-flex', 'important');







            if (logoutBtn) logoutBtn.style.setProperty('display', 'inline-flex', 'important');















            const isAdmin = (roleLower === 'admin');







            if (adminBtn) adminBtn.style.setProperty('display', isAdmin ? 'inline-flex' : 'none', 'important');







            if (mAdminBtn) {







                if (isAdmin) mAdminBtn.classList.remove('hidden');







                else mAdminBtn.classList.add('hidden');







            }



            try {

                const allCustomizerBtns = document.querySelectorAll('[id^="btn-table-customizer-"]');

                allCustomizerBtns.forEach(b => {

                    if (!isAdmin) b.remove();

                    else b.style.setProperty('display', 'inline-flex', 'important');

                });

                if (isAdmin && window.TableCustomizer && typeof TableCustomizer.initAll === 'function') {

                    TableCustomizer.initAll();

                }

            } catch (e) {}















            // Top Header Banner Avatar







            const headerAvatarImg = document.getElementById('header-avatar-img');







            const headerAvatarFallback = document.getElementById('header-avatar-fallback');







            if (user && user.avatar) {







                if (headerAvatarImg) {







                    headerAvatarImg.src = user.avatar;







                    headerAvatarImg.classList.remove('hidden');







                }







                if (headerAvatarFallback) headerAvatarFallback.classList.add('hidden');







            } else {







                if (headerAvatarImg) {







                    headerAvatarImg.src = '';







                    headerAvatarImg.classList.add('hidden');







                }







                if (headerAvatarFallback) {







                    headerAvatarFallback.classList.remove('hidden');







                    headerAvatarFallback.textContent = getUserInitials(user ? user.full_name : '', user ? user.username : '') || '👤';







                }







            }















            // Mobile Drawer Avatar







            const mAvatarImg = document.getElementById('m-drawer-avatar-img');







            const mAvatarFallback = document.getElementById('m-drawer-avatar-fallback');







            if (user && user.avatar) {







                if (mAvatarImg) {







                    mAvatarImg.src = user.avatar;







                    mAvatarImg.classList.remove('hidden');







                }







                if (mAvatarFallback) mAvatarFallback.classList.add('hidden');







            } else {







                if (mAvatarImg) {







                    mAvatarImg.src = '';







                    mAvatarImg.classList.add('hidden');







                }







                if (mAvatarFallback) {







                    mAvatarFallback.classList.remove('hidden');







                    mAvatarFallback.textContent = getUserInitials(user ? user.full_name : '', user ? user.username : '') || '👤';







                }







            }







        }















        function applyUserScope(user) {







            if (!user) {







                applyUnauthenticatedState();







                return;







            }















            // 1. HIỂN THỊ TOÀN BỘ DASHBOARD SAU KHI ĐĂNG NHẬP THÀNH CÔNG







            const appContainer = document.getElementById('authenticated-app-container');







            if (appContainer) {







                appContainer.style.setProperty('display', 'flex', 'important');







            }















            // 2. ẨN MÀN HÌNH ĐĂNG NHẬP







            const loginModal = document.getElementById('login-overlay');







            if (loginModal) {







                loginModal.style.setProperty('display', 'none', 'important');







                loginModal.classList.remove('active');







            }















            // 3. Resolve user effective channel







            const effChan = resolveUserEffectiveChannel(user);







            const chanUpper = effChan.toUpperCase();







            const scopeLvl = (user.scope_level || 'all').toLowerCase();







            const scopeVal = user.scope_value || 'all';















            // 4. Cập nhật Profile Header & Mobile Drawer







            updateUserProfileUI(user);















            // 5. Strict Navigation Tabs: update sidebar and mobile drawer







            updateSidebarNavByChannel(chanUpper);















            // 6. Reset userScopeConstraint object







            window.userScopeConstraint = {







                channel: chanUpper,







                level: scopeLvl,







                rawValue: scopeVal,







                mien: null,







                vung: null,







                gsbh: null,







                nppCode: null,







                nppName: null,







                mtSubChan: null,







                mtChain: null,







                b2bAcc: null,







                b2bCust: null,







                krSubChan: null,







                krChain: null







            };















            // 7. Resolve scope constraints according to channel hierarchy







            if (chanUpper === 'GT') {







                if (scopeLvl === 'region' || scopeLvl === 'mien' || scopeLvl === 'gt_region') {







                    const match = DIM_GEO_HIER.find(g => normMatch(g.mien, scopeVal));







                    const mVal = match ? match.mien : (scopeVal.toUpperCase().includes('NAM') ? 'MIỀN NAM' : 'MIỀN BẮC');







                    window.userScopeConstraint.mien = mVal;







                } else if (scopeLvl === 'area') {

                    window.userScopeConstraint.area = scopeVal;

                    let match = null;

                    if (typeof DIM_GEO_HIER !== 'undefined' && Array.isArray(DIM_GEO_HIER)) {

                        match = DIM_GEO_HIER.find(g => normMatch(g.area, scopeVal));

                    }

                    if (!match && typeof STATIC_OFFICE_GEO_MAP !== 'undefined') {

                        const entry = Object.values(STATIC_OFFICE_GEO_MAP).find(d => normMatch(d.area, scopeVal));

                        if (entry) match = entry;

                    }

                    if (match) {

                        window.userScopeConstraint.mien = match.mien;

                        window.userScopeConstraint.vung = match.vung;

                    }

                } else if (scopeLvl === 'vung') {

                    const match = DIM_GEO_HIER.find(g => normMatch(g.vung, scopeVal));

                    if (match) {

                        window.userScopeConstraint.mien = match.mien;

                        window.userScopeConstraint.vung = match.vung;

                    }

                } else if (scopeLvl === 'office' || scopeLvl === 'gsbh') {







                    let match = DIM_GEO_HIER.find(g => normMatch(g.gsbh, scopeVal));







                    if (!match && user.full_name) {







                        match = DIM_GEO_HIER.find(g => normMatch(user.full_name, g.gsbh) || normMatch(g.gsbh, user.full_name));







                    }







                    if (!match) {







                        const vMatch = DIM_GEO_HIER.find(g => normMatch(g.vung, scopeVal));







                        if (vMatch) match = vMatch;







                    }







                    if (match) {







                        window.userScopeConstraint.mien = match.mien;







                        window.userScopeConstraint.vung = match.vung;







                        window.userScopeConstraint.gsbh = match.gsbh;







                    }







                } else if (scopeLvl === 'npp') {







                    let match = DIM_GEO_HIER.find(g => (g.npp_code && String(g.npp_code) === String(scopeVal)) || normMatch(g.npp_name, scopeVal));







                    if (!match && typeof GT_TREE !== 'undefined' && Array.isArray(GT_TREE)) {







                        match = GT_TREE.find(g => (g.npp_code && String(g.npp_code) === String(scopeVal)) || normMatch(g.npp_name, scopeVal));







                    }







                    if (!match && user.full_name) {







                        match = DIM_GEO_HIER.find(g => normMatch(user.full_name, g.npp_name) || normMatch(g.npp_name, user.full_name));







                    }







                    if (match) {







                        window.userScopeConstraint.mien = match.mien;







                        window.userScopeConstraint.vung = match.vung;







                        window.userScopeConstraint.gsbh = match.gsbh || match.gsbh_name;







                        window.userScopeConstraint.nppCode = match.npp_code;







                        window.userScopeConstraint.nppName = match.npp_name;







                    }







                }







            } else if (chanUpper === 'MT') {







                if (scopeLvl === 'chain' || scopeLvl === 'mt_account') {







                    const match = MT_TREE.find(m => normMatch(m.chain, scopeVal) || normMatch(m.key_account, scopeVal)) || 







                                  DIM_COMM_HIER.find(c => c.channel === 'MT' && (normMatch(c.account_name, scopeVal) || normMatch(c.sub_channel, scopeVal)));







                    const cVal = match ? (match.key_account || match.chain || match.account_name) : scopeVal;







                    window.userScopeConstraint.mtChain = cVal;







                } else if (scopeLvl === 'subchannel' || scopeLvl === 'mt_subchannel') {







                    const match = MT_TREE.find(m => normMatch(m.sub_channel, scopeVal)) || 







                                  DIM_COMM_HIER.find(c => c.channel === 'MT' && normMatch(c.sub_channel, scopeVal));







                    const sVal = match ? match.sub_channel : scopeVal;







                    window.userScopeConstraint.mtSubChan = sVal;







                }







            } else if (chanUpper === 'B2B') {







                if (scopeLvl === 'segment') {







                    const match = B2B_TREE.find(b => normMatch(b.b2b_account, scopeVal) || normMatch(b.sub_channel, scopeVal));







                    const sVal = match ? (match.b2b_account || match.sub_channel) : scopeVal;







                    window.userScopeConstraint.b2bAcc = sVal;







                } else if (scopeLvl === 'account') {







                    const match = B2B_TREE.find(b => normMatch(b.b2b_customer, scopeVal) || normMatch(b.customer_name, scopeVal));







                    const cVal = match ? (match.b2b_customer || match.customer_name) : scopeVal;







                    window.userScopeConstraint.b2bCust = cVal;







                }







            } else if (chanUpper === 'KR') {







                if (scopeLvl === 'subchannel') {







                    const match = KR_TREE.find(k => normMatch(k.sub_channel, scopeVal));







                    const sVal = match ? match.sub_channel : scopeVal;







                    window.userScopeConstraint.krSubChan = sVal;







                } else if (scopeLvl === 'agent' || scopeLvl === 'store') {







                    const match = KR_TREE.find(k => normMatch(k.kr_chain, scopeVal) || normMatch(k.store_name, scopeVal));







                    const aVal = match ? (match.kr_chain || match.store_name) : scopeVal;







                    window.userScopeConstraint.krChain = aVal;







                }







            }















            // 8. Reset and populate cascading filters







            populateGeoMien();







            populateGeoVung();

            if (typeof populateGeoArea === 'function') populateGeoArea();







            populateGeoGsbh();







            populateGeoNpp();







            populateGeoNvbh();







            populateMtFilters();







            populateB2bFilters();







            populateKrFilters();















            // 9. Channel selector locking & Tab Navigation







            const chanSelect = document.getElementById('sel-dash-channel');







            if (chanUpper !== 'ALL') {







                if (chanSelect) {







                    chanSelect.innerHTML = `<option value="${chanUpper}">Kênh ${chanUpper}</option>`;







                    chanSelect.value = chanUpper;







                    chanSelect.disabled = true;







                }







                state.dashChannel = chanUpper;







                populateDashSubChannel();







                populateDashAccount();















                const targetTab = 'tab-' + chanUpper.toLowerCase();







                switchTab(targetTab);







            } else {







                if (chanSelect) {







                    chanSelect.innerHTML = `







                        <option value="ALL">Tất cả Kênh (4 Kênh)</option>







                        <option value="GT">Kênh GT</option>







                        <option value="MT">Kênh MT</option>







                        <option value="B2B">Kênh B2B</option>







                        <option value="KR">Kênh KR</option>







                    `;







                    const existingChan = state.dashChannel || 'ALL';







                    chanSelect.value = ['ALL', 'GT', 'MT', 'B2B', 'KR'].includes(existingChan) ? existingChan : 'ALL';







                    chanSelect.disabled = false;







                }







                if (!state.dashChannel) {







                    state.dashChannel = 'ALL';







                }







                populateDashSubChannel();







                populateDashAccount();















                                const validTabs = ['tab-overview', 'tab-gt', 'tab-mt', 'tab-b2b', 'tab-kr', 'tab-reports'];
                const targetTab = (state.activeTab && validTabs.includes(state.activeTab)) ? state.activeTab : 'tab-overview';
                switchTab(targetTab);







            }















            // 10. Re-calculate metrics







            onFilterChange();







        }















        // =========================================================================







        // LOGIN / LOGOUT CONTROLS







        // =========================================================================







        function showLoginModal() {







            const modal = document.getElementById('login-overlay');







            if (modal) {







                modal.classList.add('active');







                modal.style.setProperty('display', 'flex', 'important');







                document.getElementById('login-error-msg')?.classList.add('hidden');















                const closeBtn = document.getElementById('login-modal-close-btn');







                if (closeBtn) {







                    if (currentUser) closeBtn.classList.remove('hidden');







                    else closeBtn.classList.add('hidden');







                }







            }







        }















        function closeLoginModal() {







            const modal = document.getElementById('login-overlay');







            if (modal) {







                modal.classList.remove('active');







                modal.style.setProperty('display', 'none', 'important');







            }







        }















        function logout() {
            try { fetch('/api/v1/auth/logout', { method: 'POST' }).catch(() => {}); } catch(_) {}

            try {

                sessionStorage.removeItem('cj_access_token');

                localStorage.removeItem('cj_access_token');

                localStorage.removeItem('cj_payload_key');

                sessionStorage.removeItem('cj_payload_key');

                localStorage.removeItem('cj_current_user');

                sessionStorage.removeItem('cj_current_user');

                localStorage.setItem('cj_logged_out', '1');

                Object.keys(localStorage).forEach(k => {

                    if (k.startsWith('cj_snap_') || k.startsWith('CJ_Enterprise_Cache_')) {

                        localStorage.removeItem(k);

                    }

                });

                if (typeof _payloadCache !== 'undefined') {

                    for (const k in _payloadCache) delete _payloadCache[k];

                }

                if (typeof _rlsCache !== 'undefined') {

                    for (const k in _rlsCache) delete _rlsCache[k];

                }

                window.currentUser = null;

                if (typeof state !== 'undefined') state.currentUser = null;

            } catch (e) {

                console.warn('Logout cleanup warning:', e);

            }

            window.location.hash = '';

            window.location.href = window.location.origin + window.location.pathname;

        }

        window.logout = logout;















        async function submitLogin(e) {
    if (e) {
        try { e.preventDefault(); e.stopPropagation(); } catch(_) {}
    }
    const usernameInput = document.getElementById('login-username');
    const passInput = document.getElementById('login-password');
    const submitBtn = document.getElementById('btn-submit-login') || (e?.target ? e.target.querySelector('button[type="submit"]') : null);
    const username = (usernameInput?.value || '').trim();
    const pass = (passInput?.value || '').trim();

    const errEl = document.getElementById('login-error-msg');
    const errTxt = document.getElementById('login-error-text');
    if (errEl) errEl.classList.add('hidden');

    if (!username) {
        if (errEl && errTxt) {
            errTxt.textContent = "Vui lòng nhập Tên đăng nhập!";
            errEl.classList.remove('hidden');
        }
        return;
    }
    if (!pass) {
        if (errEl && errTxt) {
            errTxt.textContent = "Vui lòng nhập Mật khẩu!";
            errEl.classList.remove('hidden');
        }
        return;
    }

    const origBtnHtml = submitBtn ? submitBtn.innerHTML : '';
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span>🔒</span> <span>Đang xác thực an toàn...</span>`;
    }

    try {
        const res = await fetch('/api/v1/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                username, 
                password: pass, 
                network_mode: document.querySelector('input[name="network_mode"]:checked')?.value || 'auto' 
            })
        });

        const data = await res.json();

        // XỬ LÝ XÁC THỰC 2 BƯỚC QUA EMAIL CÁ NHÂN (EMAIL OTP ZERO TRUST)
        if (data.require2fa || data.require_email_otp) {
            window._pending2FaToken = data.temp_token;
            let otpBox = document.getElementById('login-2fa-box');
            if (!otpBox) {
                otpBox = document.createElement('div');
                otpBox.id = 'login-2fa-box';
                otpBox.className = 'mt-4 p-4 bg-blue-50/90 border border-blue-300 rounded-xl text-left';
                const form = document.getElementById('login-form') || document.querySelector('#login-overlay form') || document.getElementById('login-overlay');
                if (form) form.appendChild(otpBox);
            }

            const targetEmail = data.target_email || 'hòm thư cá nhân của bạn';

            otpBox.innerHTML = `
                <div style="display:flex;align-items:center;gap:8px;color:#004B91;font-weight:bold;font-size:14px;margin-bottom:8px;">
                    <span style="font-size:18px;">📧</span> XÁC THỰC QUA EMAIL CÁ NHÂN
                </div>
                <div style="background:#fff;border:1px solid #bfdbfe;border-radius:10px;padding:12px;margin-bottom:12px;font-size:12px;color:#1e3a8a;line-height:1.5;">
                    Mã xác thực OTP 6 số đã được gửi tới hòm thư cá nhân:<br>
                    <div style="font-size:14px;font-weight:bold;color:#004B91;margin-top:6px;padding:6px;background:#eff6ff;border-radius:6px;border:1px dashed #93c5fd;text-align:center;letter-spacing:0.5px;">
                        ${targetEmail}
                    </div>
                    <span style="font-size:11px;color:#64748b;display:block;margin-top:6px;">
                        ⏱️ Mã có hiệu lực trong 5 phút. Vui lòng mở hộp thư để lấy mã.
                    </span>
                </div>

                <div style="margin-bottom:12px;">
                    <input type="text" id="login-otp-input" maxlength="6" placeholder="000000" 
                           style="width:100%;padding:10px;text-align:center;font-size:24px;font-family:monospace;letter-spacing:6px;font-weight:bold;border:2px solid #3b82f6;border-radius:8px;background:#fff;outline:none;">
                </div>
                <button type="button" id="btn-submit-otp" style="width:100%;padding:10px;background:#004B91;color:#fff;font-weight:bold;border:none;border-radius:8px;cursor:pointer;font-size:14px;">
                    Xác nhận OTP & Đăng nhập
                </button>
                <div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;">
                    <button type="button" id="btn-resend-otp" style="font-size:11px;color:#0284c7;background:none;border:none;cursor:pointer;text-decoration:underline;">
                        🔄 Gửi lại mã OTP
                    </button>
                    <button type="button" id="btn-cancel-otp" style="font-size:11px;color:#64748b;background:none;border:none;cursor:pointer;text-decoration:underline;">
                        ← Quay lại nhập mật khẩu
                    </button>
                </div>
            `;

            const usernameField = document.getElementById('login-username');
            const passField = document.getElementById('login-password');
            if (usernameField && usernameField.parentElement) usernameField.parentElement.style.display = 'none';
            if (passField && passField.parentElement) passField.parentElement.style.display = 'none';
            if (submitBtn) submitBtn.style.display = 'none';
            otpBox.style.display = 'block';

            const otpInput = document.getElementById('login-otp-input');
            if (otpInput) {
                otpInput.value = '';
                otpInput.focus();
            }

            const btnResendOtp = document.getElementById('btn-resend-otp');
            if (btnResendOtp) {
                btnResendOtp.onclick = async () => {
                    btnResendOtp.disabled = true;
                    btnResendOtp.innerText = 'Đang gửi lại...';
                    try {
                        const rRes = await fetch('/api/v1/auth/email-otp/resend', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ temp_token: window._pending2FaToken })
                        });
                        const rData = await rRes.json();
                        alert(rData.message || 'Đã gửi lại mã OTP mới về email của bạn!');
                    } catch(_) {
                        alert('Lỗi kết nối máy chủ gửi mail!');
                    } finally {
                        btnResendOtp.disabled = false;
                        btnResendOtp.innerText = '🔄 Gửi lại mã OTP';
                    }
                };
            }

            const btnSubmitOtp = document.getElementById('btn-submit-otp');
            if (btnSubmitOtp) {
                btnSubmitOtp.onclick = async () => {
                    const otpInput = document.getElementById('login-otp-input');
                    const code = (otpInput ? otpInput.value : '').trim();
                    if (!code) {
                        alert('Vui lòng nhập mã xác thực OTP 6 chữ số!');
                        if (otpInput) otpInput.focus();
                        return;
                    }
                    btnSubmitOtp.disabled = true;
                    btnSubmitOtp.innerText = 'Đang kiểm tra OTP...';
                    try {
                        const otpRes = await fetch('/api/v1/auth/email-otp/verify', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ temp_token: window._pending2FaToken, code })
                        });
                        const otpData = await otpRes.json();
                        if (!otpRes.ok || otpData.status !== 'success') {
                            alert(otpData.message || 'Mã OTP không chính xác!');
                            btnSubmitOtp.disabled = false;
                            btnSubmitOtp.innerText = 'Xác nhận OTP & Đăng nhập';
                            return;
                        }
                        
                        otpBox.style.display = 'none';
                        if (usernameField && usernameField.parentElement) usernameField.parentElement.style.display = '';
                        if (passField && passField.parentElement) passField.parentElement.style.display = '';
                        if (submitBtn) submitBtn.style.display = '';

                        const safeUser = {
                            username: otpData.user.username,
                            full_name: otpData.user.fullName || otpData.user.full_name || otpData.user.username,
                            role: otpData.user.role || 'viewer',
                            channel: otpData.user.channel || 'all',
                            scope_level: otpData.user.scopeLevel || otpData.user.scope_level || 'all',
                            scope_value: otpData.user.scopeValue || otpData.user.scope_value || 'Toàn Quốc'
                        };
                        localStorage.removeItem('cj_logged_out');
                        sessionStorage.removeItem('cj_logged_out');
                        window._sessionExpiryHandled = false;
                        sessionStorage.setItem('cj_current_user', JSON.stringify(safeUser));
                        sessionStorage.setItem('cj_access_token', otpData.access_token);
                        if (otpData.payload_key) {
                            sessionStorage.setItem('cj_payload_key', otpData.payload_key);
                        }
                        currentUser = safeUser;
                        window.currentUser = safeUser;
                        if (typeof closeLoginModal === 'function') closeLoginModal();
                        const loginModal = document.getElementById('login-overlay');
                        if (loginModal) {
                            loginModal.style.setProperty('display', 'none', 'important');
                            loginModal.classList.remove('active');
                        }
                        const appContainer = document.getElementById('authenticated-app-container') || document.getElementById('main-app-container');
                        if (appContainer) {
                            appContainer.style.removeProperty('display');
                            appContainer.style.setProperty('display', 'flex', 'important');
                        }
                        window._isStage1Render = true;
                        try {
                            if (typeof applyUserScope === 'function') applyUserScope(safeUser);
                            if (typeof initApp === 'function') initApp();
                        } finally {
                            window._isStage1Render = false;
                        }
                    } catch (e) {
                        alert('Lỗi kết nối máy chủ xác thực Email OTP!');
                        btnSubmitOtp.disabled = false;
                        btnSubmitOtp.innerText = 'Xác nhận OTP & Đăng nhập';
                    }
                };
            }

            const btnCancelOtp = document.getElementById('btn-cancel-otp');
            if (btnCancelOtp) {
                btnCancelOtp.onclick = () => {
                    otpBox.style.display = 'none';
                    if (usernameField && usernameField.parentElement) usernameField.parentElement.style.display = '';
                    if (passField && passField.parentElement) passField.parentElement.style.display = '';
                    if (submitBtn) submitBtn.style.display = '';
                };
            }
            return;
        }

        if (!res.ok || data.status !== 'success') {
            const msg = data.message || data.error || "Tên đăng nhập hoặc mật khẩu không chính xác!";
            if (errEl && errTxt) {
                errTxt.textContent = msg;
                errEl.classList.remove('hidden');
            } else {
                alert(msg);
            }
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = origBtnHtml;
            }
            return;
        }

        // Login SUCCESS: Store token and user in sessionStorage (NO PASSWORDS!)
        const rememberMe = document.getElementById('login-remember')?.checked;
        const storage = rememberMe ? localStorage : sessionStorage;

        // Clean any legacy plain passwords & stale logout/expiry flags
        localStorage.removeItem('cj_app_users');
        localStorage.removeItem('cj_custom_passwords');
        localStorage.removeItem('cj_logged_out');
        sessionStorage.removeItem('cj_logged_out');
        window._sessionExpiryHandled = false;

        storage.setItem('cj_access_token', data.access_token);
        if (data.payload_key) {
            storage.setItem('cj_payload_key', data.payload_key);
        }
        const safeUser = {
            username: data.user.username,
            full_name: data.user.fullName || data.user.full_name || data.user.username,
            role: data.user.role || 'viewer',
            channel: data.user.channel || 'all',
            scope_level: data.user.scopeLevel || data.user.scope_level || 'all',
            scope_value: data.user.scopeValue || data.user.scope_value || 'Toàn Quốc'
        };
        storage.setItem('cj_current_user', JSON.stringify(safeUser));
        sessionStorage.setItem('cj_current_user', JSON.stringify(safeUser));
        sessionStorage.setItem('cj_access_token', data.access_token);
        currentUser = safeUser;
        window.currentUser = safeUser;

        // Hide login modal & apply user scope
        if (typeof closeLoginModal === 'function') {
            closeLoginModal();
        } else {
            const loginModal = document.getElementById('login-overlay');
            if (loginModal) {
                loginModal.style.setProperty('display', 'none', 'important');
                loginModal.classList.remove('active');
            }
        }

        const appContainer = document.getElementById('authenticated-app-container') || document.getElementById('main-app-container');
        if (appContainer) {
            appContainer.style.removeProperty('display');
            appContainer.style.setProperty('display', 'flex', 'important');
        }

        window._isStage1Render = true;
        try {
            if (typeof applyUserScope === 'function') {
                applyUserScope(safeUser);
            }

            if (typeof initApp === 'function') {
                initApp();
            }
        } finally {
            window._isStage1Render = false;
        }
    } catch (err) {
        console.error("Login fetch error:", err);
        if (errEl && errTxt) {
            errTxt.textContent = "Không thể kết nối đến máy chủ xác thực. Vui lòng kiểm tra kết nối mạng!";
            errEl.classList.remove('hidden');
        }
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = origBtnHtml;
        }
    }
}
window.submitLogin = submitLogin;









        function openChangePasswordModal() {







            if (!currentUser) {







                showLoginModal();







                return;







            }







            const modal = document.getElementById('change-password-modal');







            if (!modal) return;







            document.getElementById('cp-username').value = `${currentUser.full_name} (${currentUser.username})`;







            document.getElementById('cp-curr-pass').value = '';







            document.getElementById('cp-new-pass').value = '';







            document.getElementById('cp-confirm-pass').value = '';







            document.getElementById('cp-error-msg').classList.add('hidden');







            document.getElementById('cp-success-msg').classList.add('hidden');







            modal.classList.add('active');







        }















        function closeChangePasswordModal() {







            const modal = document.getElementById('change-password-modal');







            if (modal) modal.classList.remove('active');







        }















        function togglePasswordVisibility(fieldId) {







            const input = document.getElementById(fieldId);







            if (input) {







                input.type = input.type === 'password' ? 'text' : 'password';







            }







        }















        async function submitChangePassword(e) {
    if (e) {
        try { e.preventDefault(); e.stopPropagation(); } catch(_) {}
    }
    const errEl = document.getElementById('cp-error-msg');
    const errTxt = document.getElementById('cp-error-text');
    const succEl = document.getElementById('cp-success-msg');
    const submitBtn = document.getElementById('btn-submit-change-pass');
    const btnText = document.getElementById('cp-btn-text');

    if (errEl) errEl.classList.add('hidden');
    if (succEl) succEl.classList.add('hidden');

    const currPass = (document.getElementById('cp-curr-pass')?.value || '').trim();
    const newPass = (document.getElementById('cp-new-pass')?.value || '').trim();
    const confirmPass = (document.getElementById('cp-confirm-pass')?.value || '').trim();

    if (!currPass) {
        if (errTxt) errTxt.textContent = "Vui lòng nhập Mật khẩu hiện tại!";
        if (errEl) errEl.classList.remove('hidden');
        return;
    }
    if (!newPass) {
        if (errTxt) errTxt.textContent = "Vui lòng nhập Mật khẩu mới!";
        if (errEl) errEl.classList.remove('hidden');
        return;
    }
    if (newPass.length < 6) {
        if (errTxt) errTxt.textContent = "Mật khẩu mới phải có tối thiểu 6 ký tự!";
        if (errEl) errEl.classList.remove('hidden');
        return;
    }
    if (newPass !== confirmPass) {
        if (errTxt) errTxt.textContent = "Mật khẩu mới và xác nhận mật khẩu không khớp!";
        if (errEl) errEl.classList.remove('hidden');
        return;
    }

    if (submitBtn) {
        submitBtn.disabled = true;
        if (btnText) btnText.textContent = "Đang lưu & bảo mật...";
    }

    try {
        const token = sessionStorage.getItem('cj_access_token') || localStorage.getItem('cj_access_token');
        const res = await fetch('/api/v1/auth/change-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ currentPassword: currPass, newPassword: newPass })
        });

        const data = await res.json();
        if (!res.ok || data.status !== 'success') {
            const msg = data.message || "Đổi mật khẩu thất bại. Vui lòng kiểm tra lại mật khẩu hiện tại!";
            if (errTxt) errTxt.textContent = msg;
            if (errEl) errEl.classList.remove('hidden');
            return;
        }

        localStorage.removeItem('cj_custom_passwords');
        localStorage.removeItem('cj_logged_out');
        sessionStorage.removeItem('cj_logged_out');
        localStorage.removeItem('cj_app_users');

        if (succEl) succEl.classList.remove('hidden');
        setTimeout(() => {
            closeChangePassModal();
        }, 1200);
    } catch (err) {
        if (errTxt) errTxt.textContent = "Không thể kết nối đến máy chủ. Vui lòng thử lại sau!";
        if (errEl) errEl.classList.remove('hidden');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            if (btnText) btnText.textContent = "Lưu mật khẩu mới";
        }
    }
}
















        function openAvatarModal() {







            if (!currentUser) {







                showLoginModal();







                return;







            }







            const modal = document.getElementById('avatar-modal');







            if (!modal) return;















            // Fill user info in preview







            const nameEl = document.getElementById('avatar-preview-fullname');







            const uEl = document.getElementById('avatar-preview-username');







            if (nameEl) nameEl.textContent = currentUser.full_name || currentUser.username;







            if (uEl) uEl.textContent = '@' + currentUser.username;















            // Current avatar







            selectedAvatarDataUrl = currentUser.avatar || '';







            selectedAvatarId = selectedAvatarDataUrl ? 'current' : null;















            updateAvatarModalPreview(selectedAvatarDataUrl, selectedAvatarDataUrl ? 'Ảnh hiện tại' : 'Chưa có ảnh (dùng chữ cái đầu)');







            switchAvatarTab('preset');







            renderPresetAvatars();















            const statusMsg = document.getElementById('upload-status-msg');







            if (statusMsg) statusMsg.classList.add('hidden');







            const fileInput = document.getElementById('avatar-file-input');







            if (fileInput) fileInput.value = '';















            modal.classList.add('active');







        }















        function closeAvatarModal() {







            const modal = document.getElementById('avatar-modal');







            if (modal) modal.classList.remove('active');







        }















        function switchAvatarTab(tabName) {







            const tabBtnPreset = document.getElementById('tab-btn-preset-avatar');







            const tabBtnUpload = document.getElementById('tab-btn-upload-avatar');







            const tabContentPreset = document.getElementById('tab-content-preset');







            const tabContentUpload = document.getElementById('tab-content-upload');















            if (tabName === 'preset') {







                if (tabBtnPreset) { tabBtnPreset.className = "px-3.5 py-1.5 rounded-lg text-xs font-black transition-all bg-blue-600 text-white shadow-xs flex items-center gap-1.5"; }







                if (tabBtnUpload) { tabBtnUpload.className = "px-3.5 py-1.5 rounded-lg text-xs font-black transition-all bg-slate-100 text-slate-700 hover:bg-slate-200 flex items-center gap-1.5"; }







                if (tabContentPreset) tabContentPreset.classList.remove('hidden');







                if (tabContentUpload) tabContentUpload.classList.add('hidden');







            } else {







                if (tabBtnPreset) { tabBtnPreset.className = "px-3.5 py-1.5 rounded-lg text-xs font-black transition-all bg-slate-100 text-slate-700 hover:bg-slate-200 flex items-center gap-1.5"; }







                if (tabBtnUpload) { tabBtnUpload.className = "px-3.5 py-1.5 rounded-lg text-xs font-black transition-all bg-blue-600 text-white shadow-xs flex items-center gap-1.5"; }







                if (tabContentPreset) tabContentPreset.classList.add('hidden');







                if (tabContentUpload) tabContentUpload.classList.remove('hidden');







            }







        }















        function renderPresetAvatars() {







            const grid = document.getElementById('preset-avatars-grid');







            if (!grid) return;















            grid.innerHTML = CJ_PRESET_AVATARS.map((p, idx) => {







                const isSelected = (selectedAvatarId === p.id) || (selectedAvatarDataUrl === p.url);







                return `







                    <div class="avatar-preset-item flex flex-col items-center gap-1 text-center ${isSelected ? 'active' : ''}" onclick="selectPresetAvatar(${idx})" title="${p.title}">







                        <div class="w-12 h-12 rounded-full overflow-hidden shadow-xs border border-slate-200 bg-slate-50 flex items-center justify-center pointer-events-none">







                            <img src="${p.url}" alt="${p.title}" class="w-full h-full object-cover">







                        </div>







                        <span class="text-[10px] font-bold text-slate-700 truncate w-full pointer-events-none leading-tight">${p.title}</span>







                    </div>







                `;







            }).join('');







        }















        function selectPresetAvatar(index) {







            const p = CJ_PRESET_AVATARS[index];







            if (!p) return;







            selectedAvatarDataUrl = p.url;







            selectedAvatarId = p.id;







            updateAvatarModalPreview(p.url, `Ảnh mẫu: ${p.title}`);







            renderPresetAvatars();







        }















        function updateAvatarModalPreview(url, sourceText) {







            const img = document.getElementById('avatar-preview-img');







            const fallback = document.getElementById('avatar-preview-fallback');







            const srcText = document.getElementById('avatar-preview-source');















            if (url) {







                if (img) { img.src = url; img.classList.remove('hidden'); }







                if (fallback) fallback.classList.add('hidden');







            } else {







                if (img) { img.src = ''; img.classList.add('hidden'); }







                if (fallback) {







                    fallback.classList.remove('hidden');







                    fallback.textContent = getUserInitials(currentUser ? currentUser.full_name : '', currentUser ? currentUser.username : '') || '👤';







                }







            }







            if (srcText) srcText.textContent = sourceText || 'Tùy chỉnh';







        }















        function handleAvatarFileSelect(event) {







            const file = event.target.files && event.target.files[0];







            if (!file) return;















            if (!file.type.startsWith('image/')) {







                alert('Vui lòng chọn file hình ảnh hợp lệ (PNG, JPG, JPEG, WEBP, GIF).');







                return;







            }















            if (file.size > 10 * 1024 * 1024) {







                alert('Dung lượng file ảnh vượt quá 10MB. Vui lòng chọn ảnh nhỏ hơn.');







                return;







            }















            const reader = new FileReader();







            reader.onload = function(e) {







                const img = new Image();







                img.onload = function() {







                    // Compress and resize using offscreen canvas to square 128x128







                    const canvas = document.createElement('canvas');







                    const targetSize = 128;







                    canvas.width = targetSize;







                    canvas.height = targetSize;







                    const ctx = canvas.getContext('2d');















                    const minDim = Math.min(img.width, img.height);







                    const sx = (img.width - minDim) / 2;







                    const sy = (img.height - minDim) / 2;















                    ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, targetSize, targetSize);















                    // Export as JPEG 85% for super lightweight (~8-12KB)







                    const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);















                    selectedAvatarDataUrl = compressedDataUrl;







                    selectedAvatarId = 'custom_upload';







                    updateAvatarModalPreview(compressedDataUrl, `Tải từ máy tính: ${file.name}`);







                    renderPresetAvatars();















                    const statusMsg = document.getElementById('upload-status-msg');







                    if (statusMsg) {







                        statusMsg.textContent = `✅ Đã xử lý ảnh: ${file.name} (${Math.round(compressedDataUrl.length / 1024)} KB)`;







                        statusMsg.classList.remove('hidden');







                    }







                };







                img.src = e.target.result;







            };







            reader.readAsDataURL(file);







        }















        function resetAvatarToDefault() {







            selectedAvatarDataUrl = '';







            selectedAvatarId = 'default';







            updateAvatarModalPreview('', 'Chữ cái mặc định');







            renderPresetAvatars();







        }















        function saveUserAvatar() {







            if (!currentUser) {







                alert('Không tìm thấy thông tin người dùng đang đăng nhập.');







                return;







            }















            currentUser.avatar = selectedAvatarDataUrl || '';







            currentUser.updated_at = new Date().toISOString();















            // 1. Lưu vào currentUser Storage







            try {







                if (localStorage.getItem('cj_current_user')) {







                    localStorage.setItem('cj_current_user', JSON.stringify(currentUser));







                } else if (sessionStorage.getItem('cj_current_user')) {







                    sessionStorage.setItem('cj_current_user', JSON.stringify(currentUser));







                } else {







                    localStorage.setItem('cj_current_user', JSON.stringify(currentUser));







                }







            } catch(e) {







                console.error("Lỗi lưu currentUser avatar:", e);







            }















            // 2. Cập nhật trong app_users database







            try {







                let users = getAppUsers();







                const idx = users.findIndex(u => (u.username || '').toLowerCase() === (currentUser.username || '').toLowerCase());







                if (idx !== -1) {







                    users[idx].avatar = currentUser.avatar;







                    users[idx].updated_at = currentUser.updated_at;







                    saveAppUsers(users);















                    // Đồng bộ lên Cloud Webhook nếu có cấu hình (text/plain + no-cors)







                    const webhookUrl = getCloudWebhookUrl();







                    if (webhookUrl) {







                        fetch(webhookUrl, {







                            method: 'POST',







                            headers: { 'Content-Type': 'text/plain;charset=utf-8' },







                            body: JSON.stringify({







                                users: [{







                                    action: 'upsert_user',







                                    ...users[idx],







                                    user_agent: navigator.userAgent







                                }]







                            }),







                            mode: 'no-cors'







                        }).catch(err => console.warn("Sync avatar to cloud error:", err));







                    }







                }







            } catch(e) {







                console.error("Lỗi cập nhật app_users avatar:", e);







            }















            // 3. Cập nhật giao diện tức thì







            applyUserScope(currentUser);







            if (typeof renderAdminUserTable === 'function') {







                renderAdminUserTable();







            }















            // 4. Kích hoạt đồng bộ Cloud toàn diện để đảm bảo tính nhất quán 2 chiều







            setTimeout(() => {







                if (typeof syncWithCloud === 'function') {







                    syncWithCloud(false);







                }







            }, 300);















            closeAvatarModal();







            showAvatarNotification('Cập nhật ảnh đại diện thành công! ✨');







        }















        function showAvatarNotification(msg) {







            const toast = document.createElement('div');







            toast.className = 'fixed bottom-5 right-5 z-[1000020] bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-bold border border-slate-700 animate-bounce';







            toast.innerHTML = `<span>🎉</span> <span>${msg}</span>`;







            document.body.appendChild(toast);







            setTimeout(() => {







                toast.style.transition = 'opacity 0.4s ease';







                toast.style.opacity = '0';







                setTimeout(() => toast.remove(), 400);







            }, 2500);







        }















        // =========================================================================







        // ADMIN USER MANAGEMENT MODAL CONTROLS & OMNI-CHANNEL DROPDOWNS







        // =========================================================================







        let editingUsername = null;















        function openAdminModal() {

            if (typeof syncUsersFromDatabase === 'function') {

                syncUsersFromDatabase();

            }







            if (!currentUser || (currentUser.role || '').toLowerCase() !== 'admin') {







                alert("Chỉ có tài khoản Quản trị viên (Admin) mới có quyền truy cập chức năng này!");







                return;







            }







            const modal = document.getElementById('admin-modal');







            if (!modal) return;







            cancelAdminEdit();







            renderAdminUserTable();







            onAdminChannelChange();







            modal.classList.add('active');







        }















        function closeAdminModal() {







            const modal = document.getElementById('admin-modal');







            if (modal) modal.classList.remove('active');







        }















                function toggleAdminUserForm(forceOpen = null) {







            const content = document.getElementById('admin-user-form-content');







            const toggleBtn = document.getElementById('admin-form-toggle-btn');







            const titleEl = document.getElementById('admin-form-title');







            const iconEl = document.getElementById('admin-form-icon');







            if (!content) return;







            const isCurrentlyHidden = content.classList.contains('hidden');







            const shouldOpen = (forceOpen !== null) ? forceOpen : isCurrentlyHidden;







            if (shouldOpen) {







                content.classList.remove('hidden');







                if (toggleBtn) {







                    toggleBtn.textContent = 'Thu gọn ▲';







                    toggleBtn.className = 'text-xs text-slate-600 font-bold bg-slate-200 px-2.5 py-1 rounded-lg hover:bg-slate-300';







                }







            } else {







                content.classList.add('hidden');







                if (toggleBtn) {







                    toggleBtn.textContent = 'Bung mở biểu mẫu ▼';







                    toggleBtn.className = 'text-xs text-blue-700 font-bold bg-white px-2.5 py-1 rounded-lg border border-slate-300 hover:bg-blue-50 shadow-2xs';







                }







                if (!editingUsername && titleEl) {







                    titleEl.textContent = 'Thêm Người Dùng Mới';







                    if (iconEl) iconEl.textContent = '➕';







                }







            }







        }















        function toggleAdminMoreMenu(e) {







            if (e) e.stopPropagation();







            const menu = document.getElementById('admin-more-menu');







            if (menu) menu.classList.toggle('hidden');







        }















        function closeAdminMoreMenu() {







            const menu = document.getElementById('admin-more-menu');







            if (menu) menu.classList.add('hidden');







        }















        document.addEventListener('click', function(e) {







            closeAdminMoreMenu();







        });















        function resetUserFilters() {







            const searchInput = document.getElementById('user-search-input');







            const roleSelect = document.getElementById('user-filter-role');







            const chanSelect = document.getElementById('user-filter-channel');







            if (searchInput) searchInput.value = '';







            if (roleSelect) roleSelect.value = 'ALL';







            if (chanSelect) chanSelect.value = 'ALL';







            renderAdminUserTable();







        }















        function getUserInitials(name, username) {







            const raw = (name || username || 'U').trim();







            const parts = raw.split(/\s+/).filter(Boolean);







            if (parts.length >= 2) {







                return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();







            }







            return raw.substring(0, 2).toUpperCase();







        }















        function getUserAvatarGradient(username) {







            const gradients = [







                'from-blue-600 to-indigo-600',







                'from-emerald-600 to-teal-600',







                'from-purple-600 to-pink-600',







                'from-amber-600 to-orange-600',







                'from-rose-600 to-red-600',







                'from-sky-600 to-cyan-600',







                'from-violet-600 to-purple-600'







            ];







            let hash = 0;







            const str = username || 'user';







            for (let i = 0; i < str.length; i++) {







                hash = str.charCodeAt(i) + ((hash << 5) - hash);







            }







            return gradients[Math.abs(hash) % gradients.length];







        }















        function getRoleBadgeInfo(role) {







            const r = (role || 'viewer').toLowerCase();







            switch (r) {







                case 'admin':







                    return { label: 'ADMIN', badge: 'bg-purple-100 text-purple-800 border border-purple-200' };







                case 'bod':







                    return { label: 'BOD', badge: 'bg-rose-100 text-rose-800 border border-rose-200' };







                case 'head_gt':







                    return { label: 'HEAD GT', badge: 'bg-amber-100 text-amber-800 border border-amber-200' };







                case 'head_mt':







                    return { label: 'HEAD MT', badge: 'bg-emerald-100 text-emerald-800 border border-emerald-200' };







                case 'head_b2b':







                    return { label: 'HEAD B2B', badge: 'bg-cyan-100 text-cyan-800 border border-cyan-200' };







                case 'head_kr':







                    return { label: 'HEAD KR', badge: 'bg-rose-100 text-rose-800 border border-rose-200' };







                case 'head_channel':







                case 'manager':







                    return { label: 'TRƯỞNG KÊNH', badge: 'bg-blue-100 text-blue-800 border border-blue-200' };







                case 'rsm':







                    return { label: 'RSM', badge: 'bg-indigo-100 text-indigo-800 border border-indigo-200' };







                case 'asm':







                    return { label: 'ASM', badge: 'bg-sky-100 text-sky-800 border border-sky-200' };







                case 'gsbh':







                    return { label: 'GSBH', badge: 'bg-teal-100 text-teal-800 border border-teal-200' };







                case 'kam':







                    return { label: 'KAM', badge: 'bg-emerald-100 text-emerald-800 border border-emerald-200' };







                case 'npp':







                    return { label: 'NPP', badge: 'bg-amber-100 text-amber-800 border border-amber-200' };







                case 'b2b_lead':







                    return { label: 'B2B LEAD', badge: 'bg-cyan-100 text-cyan-800 border border-cyan-200' };







                case 'kr_lead':







                    return { label: 'KR LEAD', badge: 'bg-rose-100 text-rose-800 border border-rose-200' };







                default:







                    return { label: (role || 'VIEWER').toUpperCase(), badge: 'bg-slate-100 text-slate-700 border border-slate-200' };







            }







        }















        function getChannelBadgeInfo(channel) {







            const c = (channel || 'all').trim();







            const upper = c.toUpperCase();







            if (upper === 'ALL' || upper === 'ALL (4 KÊNH)') {







                return { label: 'ALL (4 KÊNH)', badge: 'bg-blue-50 text-blue-700 border border-blue-200 font-bold' };







            } else if (upper.includes('GT')) {







                return { label: c, badge: 'bg-amber-50 text-amber-800 border border-amber-200 font-bold' };







            } else if (upper.includes('MT')) {







                return { label: c, badge: 'bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold' };







            } else if (upper.includes('B2B')) {







                return { label: c, badge: 'bg-orange-50 text-orange-800 border border-orange-200 font-bold' };







            } else if (upper.includes('KR')) {







                return { label: c, badge: 'bg-rose-50 text-rose-800 border border-rose-200 font-bold' };







            }







            return { label: c, badge: 'bg-slate-100 text-slate-700 border border-slate-200' };







        }















        function getUserPassword(u) {
            return '••••••••';
        }



        function copyPasswordText(pwd, btn) {

            if (!pwd) return;

            if (navigator.clipboard && navigator.clipboard.writeText) {

                navigator.clipboard.writeText(pwd).then(() => {

                    if (btn) {

                        const orig = btn.innerHTML;

                        btn.innerHTML = '<span class="text-emerald-600 font-bold text-[10px]">✓</span>';

                        setTimeout(() => { btn.innerHTML = orig; }, 1500);

                    }

                }).catch(() => fallbackCopy(pwd));

            } else {

                fallbackCopy(pwd);

            }

        }



        function renderAdminUserTable() {







            const users = getAppUsers();







            const tbody = document.getElementById('admin-user-table-body');







            const mobileContainer = document.getElementById('admin-user-cards-mobile');







            const countBadge = document.getElementById('user-count-badge');







            const countBadgeMobile = document.getElementById('user-count-badge-mobile');







            const countBadgeHeader = document.getElementById('user-count-badge-header');















            // Calculate quick stats across entire database







            const statTotal = users.length;







            const statAdminBod = users.filter(u => ['admin', 'bod'].includes((u.role || '').toLowerCase())).length;







            const statFieldSales = users.filter(u => ['rsm', 'asm', 'gsbh', 'kam'].includes((u.role || '').toLowerCase())).length;







            const statViewers = statTotal - statAdminBod - statFieldSales;















            const elTotal = document.getElementById('stat-total-users');







            const elAdminBod = document.getElementById('stat-admin-bod');







            const elFieldSales = document.getElementById('stat-field-sales');







            const elViewers = document.getElementById('stat-viewers');
            const statLocked = users.filter(u => (u.is_active === 0 || u.is_active === false || (u.failed_attempts || 0) >= 5)).length;
            const elTotalSub = document.getElementById('stat-total-users-sub');
            if (elTotalSub) {
                if (statLocked > 0) {
                    elTotalSub.innerHTML = `<span class="inline-flex items-center gap-1 text-rose-600 font-bold cursor-pointer hover:underline" onclick="document.getElementById('user-search-input').value='khóa'; renderAdminUserTable();">🔒 ${statLocked} tài khoản bị khóa</span>`;
                } else {
                    elTotalSub.textContent = 'Đang hoạt động trên hệ thống';
                }
            }







            if (elTotal) elTotal.textContent = statTotal;







            if (elAdminBod) elAdminBod.textContent = statAdminBod;







            if (elFieldSales) elFieldSales.textContent = statFieldSales;







            if (elViewers) elViewers.textContent = statViewers;







            if (countBadgeHeader) countBadgeHeader.textContent = `${statTotal} Users`;















            // Filter criteria







            const kw = (document.getElementById('user-search-input')?.value || '').toLowerCase().trim();







            const roleFilter = document.getElementById('user-filter-role')?.value || 'ALL';







            const chanFilter = document.getElementById('user-filter-channel')?.value || 'ALL';















            const filtered = users.filter(u => {







                // Keyword match







                if (kw) {
                    const isUserLocked = (u.is_active === 0 || u.is_active === false || (u.failed_attempts || 0) >= 5);
                    const lockMatch = (kw === 'khóa' || kw === 'khoa' || kw === 'lock' || kw === 'locked') && isUserLocked;
                    const activeMatch = (kw === 'active' || kw === 'hoạt động' || kw === 'hoat dong') && !isUserLocked;
                    const matchKw = lockMatch || activeMatch || (u.username || '').toLowerCase().includes(kw) ||







                                    (u.full_name || '').toLowerCase().includes(kw) ||
                (u.email || '').toLowerCase().includes(kw) ||







                                    (u.role || '').toLowerCase().includes(kw) ||







                                    (u.channel || '').toLowerCase().includes(kw) ||







                                    (u.scope_value || '').toLowerCase().includes(kw);







                    if (!matchKw) return false;







                }







                // Role match







                if (roleFilter !== 'ALL') {







                    if ((u.role || '').toLowerCase() !== roleFilter.toLowerCase()) return false;







                }







                // Channel match







                if (chanFilter !== 'ALL') {







                    const uChan = (u.channel || 'all').toLowerCase();







                    if (chanFilter === 'ALL_CHANNELS') {







                        if (uChan !== 'all') return false;







                    } else {







                        if (!uChan.includes(chanFilter.toLowerCase()) && uChan !== 'all') return false;







                    }







                }







                return true;







            });















            if (countBadge) countBadge.textContent = filtered.length;







            if (countBadgeMobile) countBadgeMobile.textContent = filtered.length;















            // Render Desktop Table







            if (tbody) {







                if (filtered.length === 0) {







                    tbody.innerHTML = `<tr><td colspan="7" class="p-6 text-center text-slate-400 text-xs">Không tìm thấy tài khoản người dùng phù hợp với bộ lọc.</td></tr>`;







                } else {







                    tbody.innerHTML = filtered.map(u => {







                        const isAdmin = (u.username.toLowerCase() === 'admin');
const isLocked = (u.is_active === 0 || u.is_active === false || (u.failed_attempts || 0) >= 5);







                        const roleInfo = getRoleBadgeInfo(u.role);







                        const chanInfo = getChannelBadgeInfo(u.channel);







                        const initials = getUserInitials(u.full_name, u.username);







                        const grad = getUserAvatarGradient(u.username);















                        let updateTimeDisplay = 'N/A';







                        if (u.updated_at) {







                            try {







                                const d = new Date(u.updated_at);







                                updateTimeDisplay = d.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });







                            } catch(e) { updateTimeDisplay = u.updated_at.slice(0, 16); }







                        }















                        return `







                            <tr onclick="showUserDetail('${u.username}')" class="${isLocked ? 'bg-rose-50/40 hover:bg-rose-100/60 border-b border-rose-100' : 'hover:bg-blue-50/80 border-b border-slate-100'} cursor-pointer transition-colors group" title="Click để xem chi tiết & mật khẩu của ${u.username}">







                                <td class="p-2.5">







                                    <div class="flex items-center gap-2.5">







                                        ${u.avatar ? `







                                            <div class="w-8 h-8 rounded-full overflow-hidden shadow-xs flex-shrink-0 border border-slate-200">







                                                <img src="${u.avatar}" alt="${u.username}" class="w-full h-full object-cover">







                                            </div>







                                        ` : `







                                            <div class="w-8 h-8 rounded-full bg-gradient-to-br ${grad} text-white flex items-center justify-center font-black text-xs shadow-xs flex-shrink-0">







                                                ${initials}







                                            </div>







                                        `}







                                        <div>







                                            <div class="font-bold text-slate-900 group-hover:text-blue-700 leading-tight">${u.full_name || 'Chưa đặt tên'}</div>







                                            <div class="font-mono text-[11px] text-blue-600 font-medium">@${u.username}</div>
                                            <div class="text-[10.5px] text-slate-500 flex items-center gap-1 mt-0.5" title="${u.email ? 'Email nhận OTP: ' + u.email : 'Chưa thiết lập Email'}">
                                                <span class="text-blue-500 text-[10px]">✉️</span>
                                                <span class="${u.email ? 'text-slate-700 font-mono font-medium' : 'text-slate-400 italic'} truncate max-w-[190px]">${u.email || 'Chưa thiết lập'}</span>
                                            </div>







                                        </div>







                                    </div>







                                </td>







                                <td class="p-2.5" onclick="event.stopPropagation()">
    <div class="flex items-center gap-1.5">
        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Encrypted
        </span>
        <button type="button" onclick="adminPromptResetPass('${u.username}')" class="px-2 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold rounded text-[11px] transition-colors flex items-center gap-1 cursor-pointer" title="Cấp lại mật khẩu mới cho @${u.username}">
            <span>🔑</span> Reset
        </button>
    </div>
</td>







                                <td class="p-2.5">







                                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${roleInfo.badge}">${roleInfo.label}</span>







                                </td>







                                <td class="p-2.5">







                                    <span class="px-2 py-0.5 rounded-md text-[10px] ${chanInfo.badge}">${chanInfo.label}</span>







                                </td>







                                <td class="p-2.5 text-slate-600 font-mono text-[11px]">







                                    <span class="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">${u.scope_level || 'all'}</span>







                                </td>







                                <td class="p-2.5 font-bold text-emerald-800 text-xs">







                                    <span class="truncate block max-w-[200px]" title="${u.scope_value || 'Toàn quốc'}">${u.scope_value || 'Toàn quốc'}</span>







                                </td>







                                <td class="p-2.5 whitespace-nowrap">
                                    <div class="flex flex-col gap-0.5">
                                        ${isLocked ? `
                                            <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-rose-100 text-rose-700 border border-rose-300 w-fit shadow-2xs">
                                                <span>🔒</span> Đã Khóa (${u.failed_attempts || 5}/5)
                                            </span>
                                        ` : `
                                            <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 w-fit">
                                                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Hoạt Động
                                            </span>
                                        `}
                                        <span class="text-[10px] text-slate-400 font-mono pl-1" title="Cập nhật: ${u.updated_at || ''}">🕒 ${updateTimeDisplay}</span>
                                    </div>
                                </td>







                                <td class="p-2.5 text-center whitespace-nowrap" onclick="event.stopPropagation()">







                                    <button type="button" onclick="showUserDetail('${u.username}')" title="Xem chi tiết & Mật khẩu" class="px-2 py-1 rounded-md bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-[11px] font-bold mr-1 transition-all cursor-pointer">👁️ Chi Tiết</button>







                                    <button type="button" onclick="editAdminUser('${u.username}')" title="Chỉnh sửa thông tin" class="px-2 py-1 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 text-[11px] font-bold mr-1 transition-all cursor-pointer">✏️ Sửa</button>







                                    ${!isAdmin ? (isLocked ? `
                                        <button type="button" onclick="adminToggleUserStatus('${u.username}', true)" title="Mở khóa tài khoản cho ${u.username}" class="px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black mr-1 shadow-xs transition-all cursor-pointer animate-pulse">🔓 Mở Khóa</button>
                                    ` : `
                                        <button type="button" onclick="adminToggleUserStatus('${u.username}', false)" title="Khóa tài khoản ${u.username}" class="px-2 py-1 rounded-md bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-600 text-[11px] font-bold mr-1 transition-all cursor-pointer">🔒 Khóa</button>
                                    `) : ''}
                                    ${!isAdmin ? `<button type="button" onclick="deleteAdminUser('${u.username}')" title="Xóa người dùng" class="px-2 py-1 rounded-md bg-red-50 text-red-600 hover:bg-red-100 text-[11px] font-bold transition-all cursor-pointer">🗑️ Xóa</button>` : '<span class="text-slate-300 text-[10px] font-semibold px-2">Cố định</span>'}







                                </td>







                            </tr>







                        `;







                    }).join('');







                }







            }















            // Render Mobile Card View







            if (mobileContainer) {







                if (filtered.length === 0) {







                    mobileContainer.innerHTML = `<div class="p-6 text-center text-slate-400 text-xs bg-slate-50 rounded-xl border border-slate-200">Không tìm thấy tài khoản phù hợp.</div>`;







                } else {







                    mobileContainer.innerHTML = filtered.map(u => {







                        const isAdmin = (u.username.toLowerCase() === 'admin');
const isLocked = (u.is_active === 0 || u.is_active === false || (u.failed_attempts || 0) >= 5);







                        const roleInfo = getRoleBadgeInfo(u.role);







                        const chanInfo = getChannelBadgeInfo(u.channel);







                        const initials = getUserInitials(u.full_name, u.username);







                        const grad = getUserAvatarGradient(u.username);















                        return `







                            <div onclick="showUserDetail('${u.username}')" class="bg-white border border-slate-200 hover:border-blue-300 rounded-xl p-3 shadow-2xs space-y-2 cursor-pointer transition-all">







                                <div class="flex items-center justify-between">







                                    <div class="flex items-center gap-2">







                                        ${u.avatar ? `







                                            <div class="w-8 h-8 rounded-full overflow-hidden shadow-xs flex-shrink-0 border border-slate-200">







                                                <img src="${u.avatar}" alt="${u.username}" class="w-full h-full object-cover">







                                            </div>







                                        ` : `







                                            <div class="w-8 h-8 rounded-full bg-gradient-to-br ${grad} text-white flex items-center justify-center font-black text-xs shadow-xs flex-shrink-0">







                                                ${initials}







                                            </div>







                                        `}







                                        <div>







                                            <div class="font-bold text-slate-900 text-xs leading-tight">${u.full_name || 'Chưa đặt tên'}</div>







                                            <div class="font-mono text-[10px] text-blue-600">@${u.username}</div>







                                        </div>







                                    </div>







                                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${roleInfo.badge}">${roleInfo.label}</span>







                                </div>







                                <div class="flex items-center justify-between text-xs pt-1 border-t border-slate-100">







                                    <span class="text-slate-500 font-medium">Mật khẩu:</span>







                                    <div class="flex items-center gap-1.5 font-mono">







                                        <span class="font-mono font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 select-all">${getUserPassword(u)}</span>







                                        <button type="button" onclick="event.stopPropagation(); copyPasswordText('${getUserPassword(u)}', this)" class="text-slate-400 hover:text-blue-600 p-0.5 cursor-pointer" title="Sao chép">📋</button>







                                    </div>







                                </div>







                                <div class="grid grid-cols-2 gap-1 text-[11px] pt-1 border-t border-slate-100 text-slate-600">







                                    <div>







                                        <span class="text-slate-400 block text-[9px] uppercase font-bold">Kênh phụ trách</span>







                                        <span class="font-bold text-blue-800 truncate block">${chanInfo.label}</span>







                                    </div>







                                    <div>







                                        <span class="text-slate-400 block text-[9px] uppercase font-bold">Phạm vi dữ liệu</span>







                                        <span class="font-bold text-emerald-700 truncate block" title="${u.scope_value || 'Toàn quốc'}">${u.scope_value || 'Toàn quốc'}</span>







                                    </div>







                                </div>







                                <div class="flex items-center justify-end gap-1.5 pt-1 border-t border-slate-100" onclick="event.stopPropagation()">







                                    <button type="button" onclick="showUserDetail('${u.username}')" class="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-[11px] font-bold">👁️ Xem Pass</button>







                                    <button type="button" onclick="editAdminUser('${u.username}')" class="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-[11px] font-bold">✏️ Sửa</button>







                                    ${!isAdmin ? `<button type="button" onclick="deleteAdminUser('${u.username}')" class="px-2.5 py-1 rounded-lg bg-red-50 text-red-600 text-[11px] font-bold">🗑️ Xóa</button>` : ''}







                                </div>







                            </div>







                        `;







                    }).join('');







                }







            }







        }















        function filterAdminUserTable() {







            renderAdminUserTable();







        }















        // =========================================================================







        // MULTI-CHANNEL & MULTI-SCOPE 3-LEVEL HIERARCHICAL CONTROLS







        // =========================================================================







        let selectedScopeValuesSet = new Set(['all']);







        let availableScopeOptionsCache = [];















        function parseChannelList(raw) {







            if (!raw) return ['ALL'];







            const str = String(raw).trim();







            if (!str || str.toLowerCase() === 'all' || str === '*') return ['ALL'];







            return str.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);







        }















        function parseScopeValues(raw) {







            if (!raw) return ['all'];







            const str = String(raw).trim();







            if (!str || str.toLowerCase() === 'all' || str === '*') return ['all'];







            return str.split(',').map(s => s.trim()).filter(Boolean);







        }















        function toggleAdminChannelDropdown(e) {







            if (e) e.stopPropagation();







            const menu = document.getElementById('adm-channel-menu');







            if (menu) menu.classList.toggle('hidden');







            closeAdminScopeDropdown();







        }















        function closeAdminChannelDropdown() {







            const menu = document.getElementById('adm-channel-menu');







            if (menu) menu.classList.add('hidden');







        }















        function toggleAdminScopeDropdown(e) {







            if (e) e.stopPropagation();







            const menu = document.getElementById('adm-scope-menu');







            if (menu) menu.classList.toggle('hidden');







            closeAdminChannelDropdown();







        }















        function closeAdminScopeDropdown() {







            const menu = document.getElementById('adm-scope-menu');







            if (menu) menu.classList.add('hidden');







        }















        // Close dropdowns when clicking outside







        document.addEventListener('click', function(e) {







            const cBtn = document.getElementById('adm-channel-btn');







            const cMenu = document.getElementById('adm-channel-menu');







            if (cBtn && cMenu && !cBtn.contains(e.target) && !cMenu.contains(e.target)) {







                cMenu.classList.add('hidden');







            }







            const sBtn = document.getElementById('adm-scope-btn');







            const sMenu = document.getElementById('adm-scope-menu');







            if (sBtn && sMenu && !sBtn.contains(e.target) && !sMenu.contains(e.target)) {







                sMenu.classList.add('hidden');







            }







        });















        function onAdminChannelCheckboxChange(chanKey) {







            const chkAll = document.getElementById('chk-chan-all');







            const chkGt = document.getElementById('chk-chan-gt');







            const chkMt = document.getElementById('chk-chan-mt');







            const chkB2b = document.getElementById('chk-chan-b2b');







            const chkKr = document.getElementById('chk-chan-kr');







            const hiddenChan = document.getElementById('adm-channel');







            const displayEl = document.getElementById('adm-channel-display');















            if (chanKey === 'all') {







                const isAll = chkAll.checked;







                if (chkGt) chkGt.checked = isAll;







                if (chkMt) chkMt.checked = isAll;







                if (chkB2b) chkB2b.checked = isAll;







                if (chkKr) chkKr.checked = isAll;







            } else {







                const allIndivChecked = (chkGt?.checked && chkMt?.checked && chkB2b?.checked && chkKr?.checked);







                if (chkAll) chkAll.checked = allIndivChecked;







            }















            const selectedChans = [];







            if (chkGt?.checked) selectedChans.push('GT');







            if (chkMt?.checked) selectedChans.push('MT');







            if (chkB2b?.checked) selectedChans.push('B2B');







            if (chkKr?.checked) selectedChans.push('KR');















            if (selectedChans.length === 4 || chkAll?.checked) {







                hiddenChan.value = 'all';







                if (displayEl) displayEl.textContent = 'Tất cả (4 Kênh)';







            } else if (selectedChans.length === 0) {







                chkGt.checked = true;







                hiddenChan.value = 'GT';







                if (displayEl) displayEl.textContent = 'Kênh GT';







            } else {







                hiddenChan.value = selectedChans.join(', ');







                if (displayEl) displayEl.textContent = selectedChans.join(', ');







            }















            onAdminChannelChange();







        }















        function setAdminChannelCheckboxes(chanVal) {







            const chkAll = document.getElementById('chk-chan-all');







            const chkGt = document.getElementById('chk-chan-gt');







            const chkMt = document.getElementById('chk-chan-mt');







            const chkB2b = document.getElementById('chk-chan-b2b');







            const chkKr = document.getElementById('chk-chan-kr');







            const hiddenChan = document.getElementById('adm-channel');







            const displayEl = document.getElementById('adm-channel-display');















            const chans = parseChannelList(chanVal);







            const isAll = chans.includes('ALL') || chans.length === 4;















            if (chkAll) chkAll.checked = isAll;







            if (chkGt) chkGt.checked = isAll || chans.includes('GT');







            if (chkMt) chkMt.checked = isAll || chans.includes('MT');







            if (chkB2b) chkB2b.checked = isAll || chans.includes('B2B');







            if (chkKr) chkKr.checked = isAll || chans.includes('KR');















            if (hiddenChan) hiddenChan.value = isAll ? 'all' : chans.join(', ');







            if (displayEl) {







                displayEl.textContent = isAll ? 'Tất cả (4 Kênh)' : chans.join(', ');







            }







        }















        function onAdminRoleChange() {







            const role = (document.getElementById('adm-role')?.value || 'viewer').toLowerCase();







            let targetChan = 'all';







            let targetScopeLevel = 'all';















            if (['admin', 'bod', 'viewer'].includes(role)) {







                targetChan = 'all';







                targetScopeLevel = 'all';







            } else if (role === 'head_gt') {







                targetChan = 'GT';







                targetScopeLevel = 'all';







            } else if (role === 'head_mt') {







                targetChan = 'MT';







                targetScopeLevel = 'all';







            } else if (role === 'head_b2b') {







                targetChan = 'B2B';







                targetScopeLevel = 'all';







            } else if (role === 'head_kr') {







                targetChan = 'KR';







                targetScopeLevel = 'all';







            } else if (role === 'rsm') {







                targetChan = 'GT';







                targetScopeLevel = 'region';







            } else if (role === 'asm') {







                targetChan = 'GT';







                targetScopeLevel = 'vung';







            } else if (role === 'gsbh') {







                targetChan = 'GT';







                targetScopeLevel = 'office';







            } else if (role === 'npp') {







                targetChan = 'GT';







                targetScopeLevel = 'npp';







            } else if (role === 'kam') {







                targetChan = 'MT';







                targetScopeLevel = 'chain';







            } else if (role === 'b2b_lead') {







                targetChan = 'B2B';







                targetScopeLevel = 'segment';







            } else if (role === 'kr_lead') {







                targetChan = 'KR';







                targetScopeLevel = 'account';







            }















            setAdminChannelCheckboxes(targetChan);







            onAdminChannelChange(targetScopeLevel);







            selectedScopeValuesSet.clear();







            selectedScopeValuesSet.add('all');







            updateScopeHiddenInputAndTags();







        }















        function onAdminChannelChange(preferredLevel = null) {







            const chanVal = document.getElementById('adm-channel')?.value || 'all';







            const scopeLevelSelect = document.getElementById('adm-scope-level');







            if (!scopeLevelSelect) return;















            const currentVal = preferredLevel || scopeLevelSelect.value || 'all';







            const chans = parseChannelList(chanVal);







            scopeLevelSelect.innerHTML = '';







            let levels = [];















            if (chans.includes('ALL') || chans.length > 1) {







                levels = [







                    { val: 'all', label: 'all (Toàn quyền các Kênh đã chọn)' },







                    { val: 'region', label: 'region (Theo Miền: Miền Bắc / Miền Nam)' },







                    { val: 'vung', label: 'vung (Theo Vùng địa lý: HCM, Cần Thơ, Nha Trang...)' },







                    { val: 'area', label: 'area (Theo Area trong Master Office)' },

                    { val: 'office', label: 'office (Theo GSBH / Văn phòng GT)' },







                    { val: 'npp', label: 'npp (Theo Nhà Phân Phối GT)' },







                    { val: 'chain', label: 'chain (Theo Chuỗi Siêu Thị MT: WinMart, Co.op, BHX...)' },







                    { val: 'subchannel', label: 'subchannel (Theo Mô Hình / Phân Kênh)' },







                    { val: 'store', label: 'store (Theo Điểm Bán / Siêu Thị MT Cụ Thể)' },







                    { val: 'segment', label: 'segment (Theo Phân Khúc B2B: Direct, Indirect...)' },







                    { val: 'account', label: 'account (Theo Khách Hàng / Đại Lý B2B & KR)' },







                    { val: 'custom', label: 'custom (Nhập/Chọn phạm vi tùy biến đa giá trị)' }







                ];







            } else if (chans.includes('GT')) {







                levels = [







                    { val: 'all', label: 'all (Toàn Bộ Kênh GT)' },







                    { val: 'region', label: 'region (Theo Miền: Miền Bắc / Miền Nam)' },







                    { val: 'vung', label: 'vung (Theo Vùng: HCM, Cần Thơ, Nha Trang...)' },







                    { val: 'area', label: 'area (Theo Area trong Master Office)' },

                    { val: 'office', label: 'office (Theo GSBH / Văn Phòng GT)' },







                    { val: 'npp', label: 'npp (Theo Nhà Phân Phối Cụ Thể)' },







                    { val: 'custom', label: 'custom (Nhập/Chọn phạm vi tùy biến)' }







                ];







            } else if (chans.includes('MT')) {







                levels = [







                    { val: 'all', label: 'all (Toàn Bộ Kênh MT)' },







                    { val: 'chain', label: 'chain (Theo Chuỗi Siêu Thị: WinMart+, Co.op, BHX...)' },







                    { val: 'subchannel', label: 'subchannel (Theo Mô Hình: CVS, Hyper, Super, Minimart)' },







                    { val: 'store', label: 'store (Theo Điểm Bán / Siêu Thị Cụ Thể)' },







                    { val: 'region', label: 'region (Theo Miền: Miền Bắc / Miền Nam)' },







                    { val: 'custom', label: 'custom (Nhập/Chọn phạm vi tùy biến)' }







                ];







            } else if (chans.includes('B2B')) {







                levels = [







                    { val: 'all', label: 'all (Toàn Bộ Kênh B2B)' },







                    { val: 'segment', label: 'segment (Theo Phân Khúc: Direct, Indirect...)' },







                    { val: 'account', label: 'account (Theo Khách Hàng B2B Cụ Thể)' },







                    { val: 'custom', label: 'custom (Nhập/Chọn phạm vi tùy biến)' }







                ];







            } else if (chans.includes('KR')) {







                levels = [







                    { val: 'all', label: 'all (Toàn Bộ Kênh KR)' },







                    { val: 'subchannel', label: 'subchannel (Theo Nhóm Đại Lý: B2C, Premium, B2B)' },







                    { val: 'account', label: 'account (Theo Khách Hàng / Đại Lý KR Cụ Thể)' },







                    { val: 'custom', label: 'custom (Nhập/Chọn phạm vi tùy biến)' }







                ];







            }















            levels.forEach(lvl => {







                const opt = document.createElement('option');







                opt.value = lvl.val;







                opt.textContent = lvl.label;







                scopeLevelSelect.appendChild(opt);







            });















            if (levels.some(l => l.val === currentVal)) {







                scopeLevelSelect.value = currentVal;







            } else {







                scopeLevelSelect.value = levels[0]?.val || 'all';







            }















            onAdminScopeLevelChange();







        }















        function onAdminScopeLevelChange() {







            const chanVal = document.getElementById('adm-channel')?.value || 'all';







            const level = document.getElementById('adm-scope-level')?.value || 'all';







            const chans = parseChannelList(chanVal);















            let options = [];















            if (level === 'all') {







                options = [{ val: 'all', label: chans.includes('ALL') ? 'Toàn Quốc (4 Kênh)' : `Toàn Kênh ${chans.join(', ')}` }];







            } else if (level === 'region' || level === 'mien' || level === 'gt_region') {







                const set = new Set();







                if (typeof DIM_GEO_HIER !== 'undefined' && Array.isArray(DIM_GEO_HIER)) {







                    DIM_GEO_HIER.forEach(g => { if (g.mien) set.add(g.mien.trim()); });







                }







                if (set.size === 0) { set.add('MIỀN BẮC'); set.add('MIỀN NAM'); }







                options = Array.from(set).sort((a,b) => a.localeCompare(b, 'vi')).map(m => ({ val: m, label: m }));







            } else if (level === 'vung') {

                const set = new Set();

                if (typeof DIM_GEO_HIER !== 'undefined' && Array.isArray(DIM_GEO_HIER)) {

                    DIM_GEO_HIER.forEach(g => { if (g.vung) set.add(g.vung.trim()); });

                }

                options = Array.from(set).sort((a,b) => a.localeCompare(b, 'vi')).map(v => ({ val: v, label: v }));

            } else if (level === 'area') {

                const set = new Set();

                if (typeof window.STATIC_AREAS !== 'undefined' && Array.isArray(window.STATIC_AREAS)) {

                    window.STATIC_AREAS.forEach(a => set.add(a.trim()));

                }

                if (typeof DIM_GEO_HIER !== 'undefined' && Array.isArray(DIM_GEO_HIER)) {

                    DIM_GEO_HIER.forEach(g => { if (g.area) set.add(g.area.trim()); });

                }

                if (typeof STATIC_OFFICE_GEO_MAP !== 'undefined') {

                    Object.values(STATIC_OFFICE_GEO_MAP).forEach(d => { if (d.area) set.add(d.area.trim()); });

                }

                options = Array.from(set).sort((a,b) => a.localeCompare(b, 'vi')).map(a => ({ val: a, label: a }));

            } else if (level === 'office' || level === 'gsbh') {







                const set = new Set();







                if (typeof DIM_GEO_HIER !== 'undefined' && Array.isArray(DIM_GEO_HIER)) {







                    DIM_GEO_HIER.forEach(g => { if (g.gsbh) set.add(g.gsbh.trim()); });







                }







                if (typeof GT_TREE !== 'undefined' && Array.isArray(GT_TREE)) {







                    GT_TREE.forEach(g => { if (g.gsbh_name) set.add(g.gsbh_name.trim()); });







                }







                options = Array.from(set).sort((a,b) => a.localeCompare(b, 'vi')).map(g => ({ val: g, label: g }));







            } else if (level === 'npp') {







                const nppMap = new Map();







                if (typeof DIM_GEO_HIER !== 'undefined' && Array.isArray(DIM_GEO_HIER)) {







                    DIM_GEO_HIER.forEach(g => {







                        const name = (g.npp_name || '').trim();







                        const code = (g.npp_code || '').trim();







                        if (name) {







                            if (!nppMap.has(name)) {







                                nppMap.set(name, { val: name, label: code ? `${code} - ${name}` : name, code: code });







                            }







                        }







                    });







                }







                if (typeof GT_TREE !== 'undefined' && Array.isArray(GT_TREE)) {







                    GT_TREE.forEach(g => {







                        const name = (g.npp_name || '').trim();







                        const code = (g.npp_code || '').trim();







                        if (name && !nppMap.has(name)) {







                            nppMap.set(name, { val: name, label: code ? `${code} - ${name}` : name, code: code });







                        }







                    });







                }







                options = Array.from(nppMap.values()).sort((a, b) => a.label.localeCompare(b.label, 'vi'));







            } else if (level === 'chain') {







                const set = new Set();







                if (typeof MT_TREE !== 'undefined' && Array.isArray(MT_TREE)) {







                    MT_TREE.forEach(m => {







                        const c = m.key_account || m.chain;







                        if (c) set.add(c.trim());







                    });







                }







                if (typeof DIM_COMM_HIER !== 'undefined' && Array.isArray(DIM_COMM_HIER)) {







                    DIM_COMM_HIER.filter(c => c.channel === 'MT').forEach(c => {







                        if (c.account_name) set.add(c.account_name.trim());







                    });







                }







                options = Array.from(set).sort((a,b) => a.localeCompare(b, 'vi')).map(c => ({ val: c, label: c }));







            } else if (level === 'subchannel') {







                const set = new Set();







                if (typeof DIM_COMM_HIER !== 'undefined' && Array.isArray(DIM_COMM_HIER)) {







                    DIM_COMM_HIER.forEach(c => {







                        if (chans.includes('ALL') || chans.includes(c.channel)) {







                            if (c.sub_channel) set.add(c.sub_channel.trim());







                        }







                    });







                }







                if (typeof MT_TREE !== 'undefined' && Array.isArray(MT_TREE) && (chans.includes('ALL') || chans.includes('MT'))) {







                    MT_TREE.forEach(m => { if (m.sub_channel) set.add(m.sub_channel.trim()); });







                }







                if (typeof B2B_TREE !== 'undefined' && Array.isArray(B2B_TREE) && (chans.includes('ALL') || chans.includes('B2B'))) {







                    B2B_TREE.forEach(b => { if (b.sub_channel) set.add(b.sub_channel.trim()); });







                }







                if (typeof KR_TREE !== 'undefined' && Array.isArray(KR_TREE) && (chans.includes('ALL') || chans.includes('KR'))) {







                    KR_TREE.forEach(k => { if (k.sub_channel) set.add(k.sub_channel.trim()); });







                }







                options = Array.from(set).sort((a,b) => a.localeCompare(b, 'vi')).map(s => ({ val: s, label: s }));







            } else if (level === 'segment') {







                const set = new Set();







                if (typeof B2B_TREE !== 'undefined' && Array.isArray(B2B_TREE)) {







                    B2B_TREE.forEach(b => { if (b.sub_channel) set.add(b.sub_channel.trim()); });







                }







                if (typeof DIM_COMM_HIER !== 'undefined' && Array.isArray(DIM_COMM_HIER)) {







                    DIM_COMM_HIER.filter(c => c.channel === 'B2B').forEach(c => {







                        if (c.sub_channel) set.add(c.sub_channel.trim());







                    });







                }







                options = Array.from(set).sort((a,b) => a.localeCompare(b, 'vi')).map(s => ({ val: s, label: s }));







            } else if (level === 'account') {







                const set = new Map();







                const includeB2B = chans.includes('ALL') || chans.includes('B2B');







                const includeKR = chans.includes('ALL') || chans.includes('KR');















                if (includeB2B) {







                    if (typeof B2B_TREE !== 'undefined' && Array.isArray(B2B_TREE)) {







                        B2B_TREE.forEach(b => {







                            const n = (b.b2b_customer || b.customer_name || '').trim();







                            if (n && !set.has(n)) set.set(n, { val: n, label: `${n} (B2B)` });







                        });







                    }







                    if (typeof DIM_COMM_HIER !== 'undefined' && Array.isArray(DIM_COMM_HIER)) {







                        DIM_COMM_HIER.filter(c => c.channel === 'B2B').forEach(c => {







                            const n = (c.account_name || '').trim();







                            if (n && !set.has(n)) set.set(n, { val: n, label: `${n} (B2B)` });







                        });







                    }







                }







                if (includeKR) {







                    if (typeof KR_TREE !== 'undefined' && Array.isArray(KR_TREE)) {







                        KR_TREE.forEach(k => {







                            const n = (k.kr_chain || k.customer_name || '').trim();







                            if (n && !set.has(n)) set.set(n, { val: n, label: `${n} (KR)` });







                        });







                    }







                    if (typeof DIM_COMM_HIER !== 'undefined' && Array.isArray(DIM_COMM_HIER)) {







                        DIM_COMM_HIER.filter(c => c.channel === 'KR').forEach(c => {







                            const n = (c.account_name || '').trim();







                            if (n && !set.has(n)) set.set(n, { val: n, label: `${n} (KR)` });







                        });







                    }







                }







                options = Array.from(set.values()).sort((a,b) => a.label.localeCompare(b.label, 'vi'));







            } else if (level === 'store') {







                options = [{ val: 'all', label: 'Tất cả Điểm Bán / Siêu Thị (Nhập tùy biến)' }];







            } else {







                options = [{ val: 'all', label: 'Tùy chỉnh (Nhập danh sách giá trị)' }];







            }















            availableScopeOptionsCache = options;







            renderScopeOptionsList(options);







            updateScopeHiddenInputAndTags();







        }















        function renderScopeOptionsList(options, filterKw = '') {







            const container = document.getElementById('adm-scope-options-container');







            const totalBadge = document.getElementById('adm-scope-total-items-badge');







            if (!container) return;















            const kw = (filterKw || '').trim().toLowerCase();







            const filtered = options.filter(opt => !kw || (opt.label || '').toLowerCase().includes(kw) || (opt.val || '').toLowerCase().includes(kw));















            if (totalBadge) {







                totalBadge.textContent = kw ? `${filtered.length} / ${options.length} mục` : `${options.length} mục`;







            }















            if (filtered.length === 0) {







                container.innerHTML = `<div class="col-span-full text-center text-slate-400 py-3 italic">Không có mục nào khớp từ khóa "${filterKw}". Bạn có thể nhập mục tùy biến bên dưới.</div>`;







                return;







            }















            container.innerHTML = filtered.map(opt => {







                const isChecked = selectedScopeValuesSet.has(opt.val) || (opt.val === 'all' && selectedScopeValuesSet.has('all'));







                return `







                    <label class="flex items-center gap-2 p-1.5 rounded-lg hover:bg-blue-50 cursor-pointer text-xs text-slate-700 select-none border border-transparent hover:border-blue-200 transition-all">







                        <input type="checkbox" value="${opt.val}" ${isChecked ? 'checked' : ''} onchange="toggleScopeOption(this.value, this.checked)" class="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 flex-shrink-0 cursor-pointer">







                        <span class="truncate font-medium text-slate-800" title="${opt.label}">${opt.label}</span>







                    </label>







                `;







            }).join('');







        }















        function toggleScopeOption(val, isChecked) {







            if (val === 'all') {







                selectedScopeValuesSet.clear();







                if (isChecked) selectedScopeValuesSet.add('all');







            } else {







                selectedScopeValuesSet.delete('all');







                if (isChecked) {







                    selectedScopeValuesSet.add(val);







                } else {







                    selectedScopeValuesSet.delete(val);







                }







                if (selectedScopeValuesSet.size === 0) {







                    selectedScopeValuesSet.add('all');







                }







            }







            updateScopeHiddenInputAndTags();







            renderScopeOptionsList(availableScopeOptionsCache, document.getElementById('adm-scope-search')?.value || '');







        }















        function selectAllScopeOptions(selectAll) {







            selectedScopeValuesSet.clear();







            if (selectAll) {







                availableScopeOptionsCache.forEach(opt => {







                    if (opt.val !== 'all') selectedScopeValuesSet.add(opt.val);







                });







                if (selectedScopeValuesSet.size === 0) selectedScopeValuesSet.add('all');







            } else {







                selectedScopeValuesSet.add('all');







            }







            updateScopeHiddenInputAndTags();







            renderScopeOptionsList(availableScopeOptionsCache, document.getElementById('adm-scope-search')?.value || '');







        }















        function onScopeSearchInput(val) {







            renderScopeOptionsList(availableScopeOptionsCache, val);







        }















        function addCustomScopeFromInput() {







            const input = document.getElementById('adm-scope-custom-input');







            if (!input || !input.value.trim()) return;







            const items = input.value.split(',').map(s => s.trim()).filter(Boolean);







            if (items.length > 0) {







                selectedScopeValuesSet.delete('all');







                items.forEach(it => selectedScopeValuesSet.add(it));







                updateScopeHiddenInputAndTags();







                input.value = '';







                renderScopeOptionsList(availableScopeOptionsCache);







            }







        }















        function updateScopeHiddenInputAndTags() {







            const hiddenInput = document.getElementById('adm-scope-value-select');







            const displayEl = document.getElementById('adm-scope-display');







            const badgeEl = document.getElementById('adm-scope-count-badge');







            if (!hiddenInput) return;















            const arr = Array.from(selectedScopeValuesSet);







            if (arr.length === 0 || arr.includes('all')) {







                hiddenInput.value = 'all';







                if (displayEl) displayEl.textContent = 'Toàn quyền (All Values)';







                if (badgeEl) badgeEl.textContent = 'Tất cả';







            } else {







                hiddenInput.value = arr.join(', ');







                const summaryTxt = arr.length <= 2 ? arr.join(', ') : `${arr.slice(0, 2).join(', ')} (+${arr.length - 2} mục)`;







                if (displayEl) displayEl.textContent = summaryTxt;







                if (badgeEl) badgeEl.textContent = `Đã chọn: ${arr.length} mục`;







            }







        }







        















        function editAdminUser(username) {







            const users = getAppUsers();







            const u = users.find(x => x.username.toLowerCase() === username.toLowerCase());







            if (!u) return;















            editingUsername = u.username;







            toggleAdminUserForm(true);







            document.getElementById('admin-form-badge')?.classList.remove('hidden');







            document.getElementById('admin-form-title').innerHTML = `<span>✏️</span> Chỉnh Sửa Tài Khoản: <strong class="text-blue-700">${u.username}</strong>`;















            const uInput = document.getElementById('adm-username');







            if (uInput) {







                uInput.value = u.username;







                uInput.disabled = true;







            }







            const realPass = getUserPassword(u);







            const admPassInput = document.getElementById('adm-password');







            if (admPassInput) {







                admPassInput.value = realPass;







                admPassInput.type = 'password';







            }







            document.getElementById('adm-fullname').value = u.full_name || '';
            const admEmailInput = document.getElementById('adm-email');
            if (admEmailInput) admEmailInput.value = u.email || '';







            document.getElementById('adm-role').value = u.role || 'viewer';







            







            // Set Multi-Channel Checkboxes







            setAdminChannelCheckboxes(u.channel || 'all');







            onAdminChannelChange(u.scope_level || 'all');















            // Set Scope Level







            document.getElementById('adm-scope-level').value = u.scope_level || 'all';







            onAdminScopeLevelChange();















            // Set Multi-Scope Values







            selectedScopeValuesSet.clear();







            const svArr = parseScopeValues(u.scope_value);







            svArr.forEach(v => selectedScopeValuesSet.add(v));







            updateScopeHiddenInputAndTags();







            renderScopeOptionsList(availableScopeOptionsCache);















            document.getElementById('btn-cancel-edit')?.classList.remove('hidden');







        }















        function cancelAdminEdit() {







            editingUsername = null;







            document.getElementById('admin-form-badge')?.classList.add('hidden');







            document.getElementById('admin-form-title').innerHTML = `<span>➕</span> Thêm / Chỉnh Sửa Người Dùng`;







            const uInput = document.getElementById('adm-username');







            if (uInput) {







                uInput.value = '';







                uInput.disabled = false;







            }







            document.getElementById('adm-password').value = '';







            document.getElementById('adm-fullname').value = '';
            const admEmailInputCancel = document.getElementById('adm-email');
            if (admEmailInputCancel) admEmailInputCancel.value = '';







            document.getElementById('adm-role').value = 'asm';







            onAdminRoleChange();







            selectedScopeValuesSet.clear();







            selectedScopeValuesSet.add('all');







            updateScopeHiddenInputAndTags();







            document.getElementById('btn-cancel-edit')?.classList.add('hidden');







        }















        async function saveAdminUser(e) {







            e.preventDefault();







            const username = document.getElementById('adm-username').value.trim();







            const pass = document.getElementById('adm-password').value;







            const fullname = document.getElementById('adm-fullname').value.trim();
            const email = document.getElementById('adm-email') ? document.getElementById('adm-email').value.trim() : '';







            const role = document.getElementById('adm-role').value;







            const channel = document.getElementById('adm-channel').value;







            const scopeLevel = document.getElementById('adm-scope-level').value;







            const scopeValue = document.getElementById('adm-scope-value-select').value;















            if (!username) {







                alert("Vui lòng nhập Username!");







                return;







            }















            let users = getAppUsers();







            const nowIso = new Date().toISOString();







            let savedRecord = null;















            if (editingUsername) {







                const idx = users.findIndex(u => u.username.toLowerCase() === editingUsername.toLowerCase());







                if (idx !== -1) {







                    users[idx].full_name = fullname;
                    users[idx].email = email;







                    users[idx].role = role;







                    users[idx].channel = channel;







                    users[idx].scope_level = scopeLevel;







                    users[idx].scope_value = scopeValue;







                    users[idx].updated_at = nowIso;







                    if (pass && pass.trim() !== '') {







                        users[idx].password_hash = sha256(pass.trim());







                        







                    







                    }







                    savedRecord = { ...users[idx] };







                    if (currentUser && currentUser.username.toLowerCase() === editingUsername.toLowerCase()) {







                        currentUser = { ...users[idx] };







                        localStorage.setItem('cj_current_user', JSON.stringify(currentUser));







                        applyUserScope(currentUser);







                    }







                }







            } else {







                if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {







                    alert(`Username "${username}" đã tồn tại! Vui lòng chọn username khác.`);







                    return;







                }







                const defaultPass = pass || 'cj@2026';







                savedRecord = {
                    username: username,
                    email: email,







                    password_hash: sha256(defaultPass),







                    







                    full_name: fullname,







                    role: role,







                    channel: channel,







                    scope_level: scopeLevel,







                    scope_value: scopeValue,







                    is_active: 1,







                    avatar: '',







                    updated_at: nowIso







                };







                users.push(savedRecord);







                removeDeletedUser(username);







            }















                        saveAppUsers(users);

            cancelAdminEdit();

            renderAdminUserTable();

            // Sync to PostgreSQL backend
            try {
                const token = sessionStorage.getItem('cj_access_token') || localStorage.getItem('cj_access_token');
                if (token && savedRecord) {
                    fetch('/api/v1/users/upsert', {
                        method: 'POST',
                        headers: {
                            'Authorization': 'Bearer ' + token,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            username: savedRecord.username,
                            email: savedRecord.email || email,
                            fullName: savedRecord.full_name,
                            role: savedRecord.role,
                            channel: savedRecord.channel,
                            scopeLevel: savedRecord.scope_level,
                            scopeValue: savedRecord.scope_value,
                            isActive: true,
                            password: (pass && pass.trim()) ? pass.trim() : undefined
                        })
                    }).then(r => r.json()).then(resp => {
                        console.log('✅ PostgreSQL Upsert Result:', resp);
                    }).catch(e => console.warn('PostgreSQL Upsert Warning:', e));
                }
            } catch (err) {
                console.warn('Upsert to PostgreSQL warning:', err);
            }















            // Sync upsert to Cloud Webhook







            const webhookUrl = getCloudWebhookUrl();







            if (webhookUrl && savedRecord) {







                fetch(webhookUrl, {







                    method: 'POST',







                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },







                    body: JSON.stringify({







                        action: 'upsert_user',







                        ...savedRecord,







                        user_agent: navigator.userAgent







                    }),







                    mode: 'no-cors'







                }).catch(err => console.warn("Sync user to cloud error:", err));







            }















            alert("Lưu thông tin người dùng thành công!");







        }















        async function deleteAdminUser(username) {







            if (username.toLowerCase() === 'admin') {







                alert("Không thể xóa tài khoản Quản trị viên mặc định (admin)!");







                return;







            }







            if (!confirm(`Bạn có chắc chắn muốn xóa tài khoản "${username}"?`)) return;















                        let users = getAppUsers();

            users = users.filter(u => u.username.toLowerCase() !== username.toLowerCase());

            saveAppUsers(users);

            // Sync delete to PostgreSQL backend
            try {
                const token = sessionStorage.getItem('cj_access_token') || localStorage.getItem('cj_access_token');
                if (token) {
                    fetch('/api/v1/users/' + encodeURIComponent(username), {
                        method: 'DELETE',
                        headers: {
                            'Authorization': 'Bearer ' + token
                        }
                    }).then(r => r.json()).then(resp => {
                        console.log('✅ PostgreSQL Delete Result:', resp);
                    }).catch(e => console.warn('PostgreSQL Delete Warning:', e));
                }
            } catch (err) {
                console.warn('Delete from PostgreSQL warning:', err);
            }







            







            // Add to blacklist with current timestamp (Anti-revival)







            addDeletedUser(username);















            cancelAdminEdit();







            renderAdminUserTable();















            // Sync deletion to Cloud Webhook







            const webhookUrl = getCloudWebhookUrl();







            if (webhookUrl) {







                fetch(webhookUrl, {







                    method: 'POST',







                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },







                    body: JSON.stringify({







                        action: 'delete_user',







                        username: username,







                        is_active: 0,







                        updated_at: new Date().toISOString(),







                        user_agent: navigator.userAgent







                    }),







                    mode: 'no-cors'







                }).catch(err => console.warn("Sync delete user to cloud error:", err));







            }















            alert(`Đã xóa thành công tài khoản "${username}"!`);







        }















        function resetDefaultUsers() {







            if (!confirm("Khôi phục toàn bộ danh sách tài khoản mặc định từ Master Data? (Các tài khoản thêm mới tùy chỉnh sẽ được đặt lại theo mặc định)")) return;







            localStorage.setItem('cj_app_users', JSON.stringify(BASE_APP_USERS));







            localStorage.removeItem('cj_deleted_users');







            cancelAdminEdit();







            renderAdminUserTable();







            alert("Đã khôi phục thành công danh sách người dùng mặc định!");







        }















        function exportUsersCSV() {







            const users = getAppUsers();







            let lines = ["﻿username,email,password_hash,full_name,channel,role,scope_level,scope_value,is_active,updated_at"];







            users.forEach(u => {







                lines.push(`"${u.username}","${u.email || ''}","${u.password_hash || ''}","${u.full_name || ''}","${u.channel || ''}","${u.role || ''}","${u.scope_level || ''}","${u.scope_value || ''}","${u.is_active !== undefined ? u.is_active : 1}","${u.updated_at || ''}"`);







            });







            downloadCSVBlob(lines.join(String.fromCharCode(13, 10)), "Master_Users_Export.csv");







        }















        







        // =========================================================================







        // EXCEL USER IMPORT MODULE (SHEETJS INTEGRATION)







        // =========================================================================







        let parsedImportUsersList = [];















        function openImportExcelModal() {







            parsedImportUsersList = [];







            const modal = document.getElementById('admin-import-modal');







            const fileInput = document.getElementById('excel-file-input');







            const previewSec = document.getElementById('excel-preview-section');







            const btnExec = document.getElementById('btn-execute-import');







            const display = document.getElementById('excel-filename-display');







            







            if (fileInput) fileInput.value = '';







            if (previewSec) previewSec.classList.add('hidden');







            if (btnExec) {







                btnExec.disabled = true;







                const txt = document.getElementById('btn-execute-import-text');







                if (txt) txt.textContent = 'Tiến Hành Import';







            }







            if (display) display.textContent = 'Nhấp để chọn file Excel hoặc kéo thả file vào đây';







            







            if (modal) modal.classList.add('active');







        }















        function closeImportExcelModal() {







            const modal = document.getElementById('admin-import-modal');







            if (modal) modal.classList.remove('active');







        }















        // Drag & Drop setup for excel dropzone







        document.addEventListener('DOMContentLoaded', () => {







            const dropzone = document.getElementById('excel-dropzone');







            if (dropzone) {







                ['dragenter', 'dragover'].forEach(eventName => {







                    dropzone.addEventListener(eventName, (e) => {







                        e.preventDefault();







                        e.stopPropagation();







                        dropzone.classList.add('border-emerald-500', 'bg-emerald-50');







                    }, false);







                });







                ['dragleave', 'drop'].forEach(eventName => {







                    dropzone.addEventListener(eventName, (e) => {







                        e.preventDefault();







                        e.stopPropagation();







                        dropzone.classList.remove('border-emerald-500', 'bg-emerald-50');







                    }, false);







                });







                dropzone.addEventListener('drop', (e) => {







                    const dt = e.dataTransfer;







                    const files = dt.files;







                    if (files && files.length > 0) {







                        const fileInput = document.getElementById('excel-file-input');







                        if (fileInput) {







                            fileInput.files = files;







                            handleExcelFileSelect({ target: { files: files } });







                        }







                    }







                }, false);







            }







        });















        function downloadUserImportTemplate() {







            if (typeof XLSX === 'undefined') {







                alert("Thư viện SheetJS (XLSX) đang tải, vui lòng thử lại sau vài giây!");







                return;







            }















            const templateHeaders = [







                ["username", "password", "email", "full_name", "role", "channel", "scope_level", "scope_value"]







            ];















            const sampleRows = [
                ["asm_danang", "cj@2026", "asm.danang@cjfoods.com.vn", "Nguyễn Văn A", "asm", "GT", "vung", "ĐÀ NẴNG"],
                ["gsbh_hanoi", "cj@2026", "gsbh.hanoi@cjfoods.com.vn", "Trần Văn B", "gsbh", "GT", "office", "GSBH HÀ NỘI"],
                ["kam_coop", "cj@2026", "kam.coop@cjfoods.com.vn", "Lê Thị C", "kam", "MT", "chain", "Co.opmart"],
                ["npp_phuoctai", "cj@2026", "phuoctai@gmail.com", "Nhà Phân Phối Phước Tài", "npp", "GT", "npp", "NPP PHƯỚC TÀI"],
                ["lead_horeca", "cj@2026", "horeca@cjfoods.com.vn", "Hoàng Văn D", "b2b_lead", "B2B", "all", "Toàn quốc"],
                ["viewer_hn", "cj@2026", "viewer.hn@cjfoods.com.vn", "Phạm Thị E", "viewer", "all", "all", "Toàn quốc"]
            ];















            const wb = XLSX.utils.book_new();







            const wsUsers = XLSX.utils.aoa_to_sheet([...templateHeaders, ...sampleRows]);







            







            // Set column widths







            wsUsers['!cols'] = [
                { wch: 16 }, // username
                { wch: 12 }, // password
                { wch: 28 }, // email
                { wch: 22 }, // full_name // full_name







                { wch: 12 }, // role







                { wch: 12 }, // channel







                { wch: 14 }, // scope_level







                { wch: 20 }  // scope_value







            ];







            XLSX.utils.book_append_sheet(wb, wsUsers, "Users");















            // Sheet 2: Guidelines







            const guideRows = [







                ["Tên Cột (Field)", "Bắt Buộc?", "Mô Tả Chi Tiết", "Giá Trị Mẫu Hợp Lệ"],







                ["username", "CÓ (*)", "Tên đăng nhập duy nhất (viết thường, không dấu)", "asm_danang, gsbh_hn, rsm_south"],







                ["password", "Không", "Mật khẩu đăng nhập (mặc định 'cj@2026' nếu để trống)", "cj@2026, Pass123@"],
                ["email", "Khuyên dùng (*)", "Địa chỉ Email nhận mã OTP xác thực 2FA khi đăng nhập ngoài văn phòng", "user@cjfoods.com.vn, sales@gmail.com"],







                ["full_name", "CÓ (*)", "Họ và tên nhân sự hiển thị trên hệ thống", "Nguyễn Văn A, Trần Thị B"],







                ["role", "CÓ (*)", "Vai trò RBAC phân quyền chức vụ", "admin, bod, rsm, asm, gsbh, kam, npp, b2b_lead, kr_lead, viewer"],







                ["channel", "Không", "Kênh phụ trách (mặc định 'all')", "all, GT, MT, B2B, KR (hoặc nhiều kênh cách nhau dấu phẩy: GT, MT)"],







                ["scope_level", "Không", "Cấp lọc dữ liệu (mặc định 'all')", "all, region, vung, office, npp, chain, subchannel, segment, account"],







                ["scope_value", "Không", "Phạm vi dữ liệu cụ thể (mặc định 'Toàn quốc')", "Toàn quốc, MIỀN BẮC, MIỀN NAM, ĐÀ NẴNG, WinMart+, Co.opmart..."]







            ];







            const wsGuide = XLSX.utils.aoa_to_sheet(guideRows);







            wsGuide['!cols'] = [{ wch: 16 }, { wch: 12 }, { wch: 35 }, { wch: 45 }];







            XLSX.utils.book_append_sheet(wb, wsGuide, "Huong_Dan");















            XLSX.writeFile(wb, "Mau_Import_Nguoi_Dung.xlsx");







        }















        function handleExcelFileSelect(e) {







            const files = e.target.files;







            if (!files || files.length === 0) return;







            const file = files[0];















            const display = document.getElementById('excel-filename-display');







            if (display) {







                display.innerHTML = `<strong>📄 ${file.name}</strong> (${(file.size / 1024).toFixed(1)} KB)`;







            }















            if (typeof XLSX === 'undefined') {







                alert("Thư viện SheetJS chưa sẵn sàng!");







                return;







            }















            const reader = new FileReader();







            reader.onload = function(evt) {







                try {







                    const data = new Uint8Array(evt.target.result);







                    const workbook = XLSX.read(data, { type: 'array' });







                    







                    // Select sheet "Users" or first sheet







                    let sheetName = workbook.SheetNames.includes("Users") ? "Users" : workbook.SheetNames[0];







                    const worksheet = workbook.Sheets[sheetName];







                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });















                    if (!jsonData || jsonData.length === 0) {







                        alert("File Excel rỗng hoặc không đọc được dữ liệu!");







                        return;







                    }















                    // Normalize headers & map rows







                    parsedImportUsersList = [];







                    let validCount = 0;







                    let errCount = 0;















                    jsonData.forEach((row, idx) => {







                        // Find keys case-insensitively







                        const getVal = (...aliases) => {







                            for (const k of Object.keys(row)) {







                                const cleanK = k.trim().toLowerCase();







                                for (const a of aliases) {







                                    if (cleanK === a.toLowerCase()) return String(row[k]).trim();







                                }







                            }







                            return '';







                        };















                        const username = getVal('username', 'tên đăng nhập', 'user', 'ma nv', 'mã nv').toLowerCase().trim();







                        const raw_pass = getVal('password', 'mật khẩu', 'pass', 'mat khau') || 'cj@2026';
                        const email = getVal('email', 'hòm thư', 'mail', 'email otp', 'e-mail').toLowerCase().trim();







                        const full_name = getVal('full_name', 'họ và tên', 'họ tên', 'tên', 'name', 'fullname');







                        let role = getVal('role', 'vai trò', 'chức vụ', 'phân quyền').toLowerCase() || 'viewer';

                        let channel = getVal('channel', 'kênh', 'kenh') || 'all';

                        let scope_level = getVal('scope_level', 'cấp phân quyền', 'cấp', 'scope level').toLowerCase() || 'all';

                        let scope_value = getVal('scope_value', 'phạm vi', 'phạm vi dữ liệu', 'scope value', 'giá trị') || 'Toàn quốc';



                        // Smart normalization for roles & scopes

                        const areaListNorm = ['đông nam bộ', 'dh & bmt', 'đà nẵng 1', 'đà nẵng 2', 'tiền giang', 'tây bắc', 'hải phòng', 'hà nội', 'cần thơ', 'hcm', 'nha trang', 'khác'];

                        if (role === 'asm') {

                            channel = 'GT';

                            if (scope_level === 'area' || areaListNorm.includes(scope_value.toLowerCase())) {

                                scope_level = 'area';

                            } else if (!scope_level || scope_level === 'all') {

                                scope_level = 'vung';

                            }

                        } else if (role === 'gsbh') {

                            channel = 'GT';

                            scope_level = 'office';

                            if (typeof STATIC_OFFICE_GEO_MAP !== 'undefined') {

                                if (STATIC_OFFICE_GEO_MAP[scope_level]) {

                                    scope_value = scope_level;

                                }

                            }

                        }















                        // Role mapping sanity







                        const validRoles = ['admin', 'bod', 'rsm', 'asm', 'gsbh', 'kam', 'npp', 'b2b_lead', 'kr_lead', 'viewer'];







                        if (!validRoles.includes(role)) {







                            role = 'viewer';







                        }















                        const isValid = Boolean(username && username.length >= 2);







                        if (isValid) validCount++; else errCount++;















                        parsedImportUsersList.push({







                            stt: idx + 1,







                            username: username,
                            email: email,







                            password_hash: raw_pass ? sha256(raw_pass) : sha256('cj@2026'),
                            raw_password: raw_pass || 'cj@2026',







                            full_name: full_name || username,







                            role: role,







                            channel: channel,







                            scope_level: scope_level,







                            scope_value: scope_value,







                            isValid: isValid,







                            errorReason: !isValid ? 'Thiếu Username' : ''







                        });







                    });















                    renderImportPreview(parsedImportUsersList, validCount, errCount);















                } catch (err) {







                    console.error("Error reading excel file:", err);







                    alert("Lỗi khi đọc file Excel: " + err.message);







                }







            };







            reader.readAsArrayBuffer(file);







        }















        function renderImportPreview(rows, validCount, errCount) {







            const previewSec = document.getElementById('excel-preview-section');







            const tbody = document.getElementById('excel-preview-tbody');







            const statsEl = document.getElementById('excel-preview-stats');







            const btnExec = document.getElementById('btn-execute-import');







            const btnExecTxt = document.getElementById('btn-execute-import-text');















            if (previewSec) previewSec.classList.remove('hidden');







            if (statsEl) {







                statsEl.innerHTML = `<span class="text-emerald-600 font-bold">${validCount} hợp lệ</span> / <span class="text-rose-600 font-bold">${errCount} lỗi</span> (Tổng: ${rows.length} dòng)`;







            }















            if (btnExec) {







                btnExec.disabled = (validCount === 0);







                if (btnExecTxt) btnExecTxt.textContent = `Tiến Hành Import (${validCount} Tài Khoản)`;







            }















            if (tbody) {







                const previewRows = rows.slice(0, 10);







                tbody.innerHTML = previewRows.map(r => {







                    const statusHtml = r.isValid







                        ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">✓ Hợp Lệ</span>`







                        : `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800" title="${r.errorReason}">✕ ${r.errorReason}</span>`;















                    return `







                        <tr class="hover:bg-slate-50 border-b border-slate-100">







                            <td class="p-2 text-slate-500 font-mono">${r.stt}</td>







                            <td class="p-2 font-mono font-bold ${r.isValid ? 'text-blue-700' : 'text-rose-600'}">${r.username || '(trống)'}</td>







                            <td class="p-2 font-semibold text-slate-800">${r.full_name}</td>
                            <td class="p-2 font-mono text-[10px] text-blue-600">${r.email || '<span class="text-slate-400 italic">Trống</span>'}</td>







                            <td class="p-2 uppercase font-bold text-[10px] text-indigo-700">${r.role}</td>







                            <td class="p-2 font-bold text-slate-700">${r.channel}</td>







                            <td class="p-2 text-slate-600">${r.scope_level}</td>







                            <td class="p-2 text-emerald-700 font-medium truncate max-w-[120px]">${r.scope_value}</td>







                            <td class="p-2 text-center">${statusHtml}</td>







                        </tr>







                    `;







                }).join('');















                if (rows.length > 10) {







                    tbody.innerHTML += `<tr><td colspan="8" class="p-2 text-center text-slate-400 bg-slate-50 font-medium italic">... và ${rows.length - 10} dòng khác đã sẵn sàng được import.</td></tr>`;







                }







            }







        }















        async function executeUserImport() {







            if (!parsedImportUsersList || parsedImportUsersList.length === 0) {







                alert("Không có dữ liệu người dùng để import!");







                return;







            }















            const validRows = parsedImportUsersList.filter(r => r.isValid);







            if (validRows.length === 0) {







                alert("Không tìm thấy dòng dữ liệu nào hợp lệ để import!");







                return;







            }















            const importMode = document.querySelector('input[name="import-mode"]:checked')?.value || 'upsert';







            let currentUsers = getAppUsers();







            const nowIso = new Date().toISOString();















            let addedCount = 0;







            let updatedCount = 0;







            let skippedCount = 0;















            validRows.forEach(row => {







                const uIdx = currentUsers.findIndex(u => u.username.toLowerCase() === row.username.toLowerCase());







                







                if (uIdx !== -1) {







                    if (importMode === 'upsert') {







                        // Update existing user







                        currentUsers[uIdx].full_name = row.full_name;







                        currentUsers[uIdx].role = row.role;
                        if (row.email) currentUsers[uIdx].email = row.email;







                        currentUsers[uIdx].channel = row.channel;







                        currentUsers[uIdx].scope_level = row.scope_level;







                        currentUsers[uIdx].scope_value = row.scope_value;







                        currentUsers[uIdx].updated_at = nowIso;







                        if (row.raw_password && row.raw_password.trim() !== '') {







                            currentUsers[uIdx].password_hash = sha256(row.raw_password);







                        }







                        







                        updatedCount++;







                    } else {







                        skippedCount++;







                    }







                } else {







                    // Insert new user







                    const pass = row.raw_password || 'cj@2026';







                    currentUsers.push({







                        username: row.username,







                        password_hash: sha256(pass),
                        email: row.email || '',







                        full_name: row.full_name,







                        role: row.role,







                        channel: row.channel,







                        scope_level: row.scope_level,







                        scope_value: row.scope_value,







                        is_active: 1,







                        updated_at: nowIso







                    });







                    removeDeletedUser(row.username);







                    addedCount++;







                }







            });















            // Save to LocalStorage







            saveAppUsers(currentUsers);







            renderAdminUserTable();

            closeImportExcelModal();



            // PostgreSQL Bulk Import Sync

            try {

                const jwtToken = sessionStorage.getItem('cj_access_token') || localStorage.getItem('cj_access_token');

                if (jwtToken && validRows.length > 0) {

                    fetch('/api/v1/users/bulk-import', {

                        method: 'POST',

                        headers: {

                            'Content-Type': 'application/json',

                            'Authorization': 'Bearer ' + jwtToken

                        },

                        body: JSON.stringify({ users: validRows })

                    }).then(r => r.json()).then(resp => {

                        console.log('✅ PostgreSQL Bulk Import Result:', resp);

                    }).catch(e => console.warn('PostgreSQL Bulk Import Warning:', e));

                }

            } catch (pgErr) {

                console.warn('PostgreSQL sync error:', pgErr);

            }















            // Background sync upsert to Cloud Webhook







            const webhookUrl = getCloudWebhookUrl();







            if (webhookUrl && (addedCount > 0 || updatedCount > 0)) {







                try {







                    fetch(webhookUrl, {







                        method: 'POST',







                        headers: { 'Content-Type': 'text/plain;charset=utf-8' },







                        body: JSON.stringify({







                            action: 'bulk_upsert_users',







                            admin_u: currentUser ? currentUser.username : 'admin',







                            admin_h: currentUser ? currentUser.password_hash : '',







                            users: validRows.map(r => ({







                                username: r.username,







                                password_hash: r.password_hash || sha256('cj@2026'),







                                full_name: r.full_name,







                                role: r.role,







                                channel: r.channel,







                                scope_level: r.scope_level,







                                scope_value: r.scope_value,







                                is_active: 1,







                                updated_at: nowIso







                            })),







                            user_agent: navigator.userAgent







                        }),







                        mode: 'no-cors'







                    }).catch(e => console.warn("Cloud bulk sync warn:", e));







                } catch(e) {}







            }















            alert(`🎉 Import Excel thành công!



• Thêm mới: ${addedCount} người dùng

• Cập nhật: ${updatedCount} người dùng

• Bỏ qua (trùng): ${skippedCount} người dùng`);







        }























        function exportUsersExcel() {







            if (typeof XLSX === 'undefined') {







                alert("Thư viện SheetJS (XLSX) chưa tải xong. Đang chuyển sang xuất CSV.");







                exportUsersCSV();







                return;







            }







            const users = getAppUsers();







            const wsData = [







                ["username", "email", "password_hash", "full_name", "channel", "role", "scope_level", "scope_value", "is_active", "updated_at"]







            ];







            users.forEach(u => {







                wsData.push([







                    u.username,
                    u.email || '',







                    u.password_hash || '',







                    u.full_name || '',







                    u.channel || 'all',







                    u.role || 'viewer',







                    u.scope_level || 'all',







                    u.scope_value || 'Toàn quốc',







                    u.is_active !== undefined ? u.is_active : 1,







                    u.updated_at || ''







                ]);







            });















            const wb = XLSX.utils.book_new();







            const ws = XLSX.utils.aoa_to_sheet(wsData);







            XLSX.utils.book_append_sheet(wb, ws, "Users");















            // Sheet 2: Guide







            const guideData = [







                ["Trường (Field)", "Mô Tả", "Giá Trị Hợp Lệ"],







                ["username", "Tên đăng nhập duy nhất", "Viết thường, không dấu"],







                ["channel", "Kênh phụ trách", "all, GT, MT, B2B, KR"],







                ["role", "Vai trò người dùng", "admin, bod, head_channel, rsm, asm, gsbh, kam, npp, viewer"],







                ["scope_level", "Cấp phân quyền xem dữ liệu", "all, region, vung, office, npp, chain, subchannel, store, segment, account, agent"],







                ["scope_value", "Giá trị phân quyền cụ thể", "Tên Miền, Tên Vùng, Tên Chuỗi MT, Tên NPP..."]







            ];







            const wsGuide = XLSX.utils.aoa_to_sheet(guideData);







            XLSX.utils.book_append_sheet(wb, wsGuide, "Guide");















            XLSX.writeFile(wb, "Master_Users.xlsx");







        }















        // =========================================================================







        // USER DETAIL MODAL (INCL. PASSWORD INSPECTION & QUICK LOGIN)







        // =========================================================================







        let selectedDetailUser = null;















        function showUserDetail(username) {







            const users = getAppUsers();







            const u = users.find(x => x.username.toLowerCase() === username.toLowerCase());







            if (!u) return;















            selectedDetailUser = u;







            const titleEl = document.getElementById('ud-title-username');







            if (titleEl) titleEl.textContent = u.username;
            const emailInp = document.getElementById('ud-email-input');
            if (emailInp) emailInp.value = u.email || '';
            const emailSt = document.getElementById('ud-email-status');
            if (emailSt) emailSt.innerText = '';







            const uEl = document.getElementById('ud-username');







            if (uEl) uEl.textContent = u.username;







            







            const realPass = getUserPassword(u);







            const passInput = document.getElementById('ud-password-input');







            if (passInput) {







                passInput.value = realPass;







                passInput.type = 'password';







            }







            const eyeEl = document.getElementById('ud-pass-eye');







            if (eyeEl) eyeEl.textContent = '👁️';







            const copyStatus = document.getElementById('ud-copy-status');







            if (copyStatus) copyStatus.textContent = '';







            







            const hashEl = document.getElementById('ud-hash');







            if (hashEl) hashEl.textContent = u.password_hash || '';







            const fnEl = document.getElementById('ud-fullname');







            if (fnEl) fnEl.textContent = u.full_name || 'Chưa đặt tên';







            const udImg = document.getElementById('ud-avatar-img');







            const udFallback = document.getElementById('ud-avatar-fallback');







            if (u.avatar) {







                if (udImg) { udImg.src = u.avatar; udImg.classList.remove('hidden'); }







                if (udFallback) udFallback.classList.add('hidden');







            } else {







                if (udImg) { udImg.src = ''; udImg.classList.add('hidden'); }







                if (udFallback) { udFallback.classList.remove('hidden'); udFallback.textContent = getUserInitials(u.full_name, u.username) || '👤'; }







            }







            







            const roleBadge = document.getElementById('ud-role-badge');







            const roleUpper = (u.role || 'user').toUpperCase();







            if (roleBadge) {







                roleBadge.textContent = roleUpper;







                roleBadge.className = 'inline-block px-2.5 py-0.5 rounded-full text-xs font-black ' + (







                    u.role === 'admin' ? 'bg-amber-100 text-amber-800' :







                    u.role === 'bod' ? 'bg-rose-100 text-rose-800' :







                    u.role === 'head_channel' ? 'bg-purple-100 text-purple-800' :







                    u.role === 'rsm' ? 'bg-indigo-100 text-indigo-800' :







                    u.role === 'asm' ? 'bg-sky-100 text-sky-800' :







                    u.role === 'kam' ? 'bg-emerald-100 text-emerald-800' :







                    u.role === 'gsbh' ? 'bg-teal-100 text-teal-800' : 'bg-slate-100 text-slate-700'







                );







            }















            const chanEl = document.getElementById('ud-channel');







            if (chanEl) chanEl.textContent = (u.channel || 'all').toUpperCase();







            const scLvlEl = document.getElementById('ud-scope-level');







            if (scLvlEl) scLvlEl.textContent = u.scope_level || 'all';







            const scValEl = document.getElementById('ud-scope-value');







            if (scValEl) scValEl.textContent = u.scope_value || 'Toàn quốc';















            let desc = `Tài khoản vai trò <strong>${roleUpper}</strong> thuộc Kênh <strong>${(u.channel || 'all').toUpperCase()}</strong>. `;







            if ((u.channel || 'all').toLowerCase() === 'all') {







                desc += `Có quyền xem toàn bộ 4 kênh phân phối (GT, MT, B2B, KR) trên toàn quốc.`;







            } else {







                desc += `Chỉ được phép xem dữ liệu <strong>Kênh ${(u.channel || '').toUpperCase()}</strong> (phạm vi: <em>${u.scope_value || 'Toàn bộ'}</em>). Các kênh phân phối khác sẽ bị ẩn hoàn toàn để bảo mật dữ liệu.`;







            }







            const descEl = document.getElementById('ud-access-desc');







            if (descEl) descEl.innerHTML = desc;

            const isDetailUserLocked = (u.is_active === 0 || u.is_active === false || (u.failed_attempts || 0) >= 5);
            const statusBadge = document.getElementById('ud-status-badge');
            if (statusBadge) {
                if (isDetailUserLocked) {
                    statusBadge.textContent = '🔒 ĐÃ BỊ KHÓA (' + (u.failed_attempts || 5) + '/5 lần sai)';
                    statusBadge.className = 'px-2.5 py-0.5 rounded-full text-[11px] font-black bg-rose-100 text-rose-800 border border-rose-300 shadow-2xs animate-pulse';
                } else {
                    statusBadge.textContent = '● Hoạt Động (Active)';
                    statusBadge.className = 'px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200';
                }
            }
            const failedEl = document.getElementById('ud-failed-attempts');
            if (failedEl) {
                failedEl.textContent = (u.failed_attempts || 0) + '/5 lần';
                failedEl.className = isDetailUserLocked ? 'font-mono font-bold text-rose-600' : 'font-mono font-bold text-slate-700';
            }
            const btnToggle = document.getElementById('ud-btn-toggle-status');
            if (btnToggle) {
                if ((u.username || '').toLowerCase() === 'admin') {
                    btnToggle.classList.add('hidden');
                } else {
                    btnToggle.classList.remove('hidden');
                    if (isDetailUserLocked) {
                        btnToggle.innerHTML = '<span>🔓</span> Mở Khóa Tài Khoản';
                        btnToggle.className = 'px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition-colors flex items-center gap-1 shadow-xs cursor-pointer';
                    } else {
                        btnToggle.innerHTML = '<span>🔒</span> Khóa Tài Khoản';
                        btnToggle.className = 'px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold rounded-lg text-xs transition-colors flex items-center gap-1 shadow-xs cursor-pointer';
                    }
                }
            }















            const modal = document.getElementById('user-detail-modal');







            if (modal) {







                modal.classList.add('active');







                modal.style.display = 'flex';







            }







        }















        function closeUserDetailModal() {







            const modal = document.getElementById('user-detail-modal');







            if (modal) {







                modal.classList.remove('active');







                modal.style.display = 'none';







            }







        }















        function toggleUserDetailPassword() {







            const passInput = document.getElementById('ud-password-input');







            const eye = document.getElementById('ud-pass-eye');







            if (!passInput || !eye) return;







            if (passInput.type === 'password') {







                passInput.type = 'text';







                eye.textContent = '🙈';







            } else {







                passInput.type = 'password';







                eye.textContent = '👁️';







            }







        }















        function copyUserDetailPassword() {







            const passInput = document.getElementById('ud-password-input');







            const status = document.getElementById('ud-copy-status');







            if (!passInput || !status) return;







            if (navigator.clipboard && navigator.clipboard.writeText) {







                navigator.clipboard.writeText(passInput.value).then(() => {







                    status.textContent = '✓ Đã copy!';







                    setTimeout(() => { if (status) status.textContent = ''; }, 2000);







                }).catch(() => {







                    fallbackCopy(passInput.value, status);







                });







            } else {







                fallbackCopy(passInput.value, status);







            }







        }















        function fallbackCopy(text, statusEl) {







            const ta = document.createElement('textarea');







            ta.value = text;







            document.body.appendChild(ta);







            ta.select();







            document.execCommand('copy');







            document.body.removeChild(ta);







            if (statusEl) {







                statusEl.textContent = '✓ Đã copy!';







                setTimeout(() => { if (statusEl) statusEl.textContent = ''; }, 2000);







            }







        }















        function editFromUserDetail() {







            if (!selectedDetailUser) return;







            const uName = selectedDetailUser.username;







            closeUserDetailModal();







            editAdminUser(uName);







        }















        function quickLoginAsSelectedUser() {







            if (!selectedDetailUser) return;







            if (!confirm(`Bạn có muốn chuyển sang đăng nhập bằng tài khoản "${selectedDetailUser.username}" (${selectedDetailUser.full_name})?`)) return;







            closeUserDetailModal();







            closeAdminModal();







            currentUser = selectedDetailUser;







            localStorage.setItem('cj_current_user', JSON.stringify(currentUser));







            applyUserScope(currentUser);







            alert(`Đã đăng nhập thành công với vai trò: ${selectedDetailUser.full_name} (${selectedDetailUser.username})`);







        }























                function applyUrlParams() {







            try {







                const params = new URLSearchParams(window.location.search);







                if (params.has('year')) {







                    const y = params.get('year');







                    state.year = y;







                    const sel = document.getElementById('sel-year');







                    if (sel) sel.value = y;







                }







                if (params.has('month')) {







                    const m = params.get('month');







                    state.selectedMonths = m.split(',').map(s => s.padStart(2, '0'));







                    updateMonthChipsUI();







                }







                if (params.has('channel')) {







                    const ch = params.get('channel');







                    state.dashChannel = ch;







                    const sel = document.getElementById('sel-dash-channel');







                    if (sel) sel.value = ch;







                    populateDashSubChannel();







                    populateDashAccount();







                }







                if (params.has('storage')) {







                    const st = params.get('storage');







                    state.prodStorage = st;







                    const sel = document.getElementById('sel-prod-storage');







                    if (sel) sel.value = st;







                    populateProdCate();







                    populateProdPh1();







                    populateProdPh2();







                    populateProdSku();







                }







            } catch(e) { console.error('Error applying URL params:', e); }







        }















        // =========================================================================







        // MOBILE UX & DUAL-MODE CONTROLS







        // =========================================================================







        function toggleViewMode(forcedMode) {







            const body = document.body;







            let targetMode = forcedMode;







            if (!targetMode) {







                targetMode = body.classList.contains('mobile-mode') ? 'desktop' : 'mobile';







            }







            const btnDesk = document.getElementById('btn-toggle-viewmode');







            const mToggleText = document.getElementById('m-drawer-toggle-text');







            const mToggleIcon = document.getElementById('m-drawer-toggle-icon');















            if (targetMode === 'mobile') {







                body.classList.add('mobile-mode');







                localStorage.setItem('preferredViewMode', 'mobile');







                if (btnDesk) btnDesk.innerHTML = '<span>💻</span> <span>Xem Giao Diện Desktop</span>';







                if (mToggleText) mToggleText.innerText = 'Chuyển sang Giao Diện Desktop';







                if (mToggleIcon) mToggleIcon.innerText = '💻';







            } else {







                body.classList.remove('mobile-mode');







                localStorage.setItem('preferredViewMode', 'desktop');







                if (btnDesk) btnDesk.innerHTML = '<span>📱</span> <span>Xem Giao Diện Mobile</span>';







                if (mToggleText) mToggleText.innerText = 'Chuyển sang Giao Diện Mobile';







                if (mToggleIcon) mToggleIcon.innerText = '📱';







            }







            setTimeout(resizeAllCharts, 150);







        }















        function openMobileDrawer() {







            const drawer = document.getElementById('cj-mobile-drawer');







            if (drawer) {







                drawer.classList.remove('hidden');







                // Sync mobile drawer navigation active state







                ['m-nav-tab-overview', 'm-nav-tab-gt', 'm-nav-tab-mt', 'm-nav-tab-b2b', 'm-nav-tab-kr', 'm-nav-tab-reports'].forEach(id => {







                    const el = document.getElementById(id);







                    if (el) el.classList.remove('active');







                });







                const mNavBtn = document.getElementById('m-nav-' + state.activeTab);







                if (mNavBtn) mNavBtn.classList.add('active');















                const mGtTree = document.getElementById('m-nav-gt-tree');







                const mGtChevron = document.getElementById('m-nav-gt-chevron');







                if (state.activeTab === 'tab-gt') {







                    if (mGtTree) mGtTree.classList.remove('hidden');







                    if (mGtChevron) mGtChevron.classList.add('rotate-180');







                }







                if (typeof updateGtTreeSubMenuUI === 'function') updateGtTreeSubMenuUI();







            }







        }















        function closeMobileDrawer() {







            const drawer = document.getElementById('cj-mobile-drawer');







            if (drawer) drawer.classList.add('hidden');







        }















        function toggleMobileFilterAccordion() {







            const filterWrap = document.getElementById('main-filter-bar-wrapper');







            const arrow = document.getElementById('mobile-filter-arrow');







            if (filterWrap) {







                if (filterWrap.classList.contains('mobile-expanded')) {







                    filterWrap.classList.remove('mobile-expanded');







                    if (arrow) arrow.innerText = '▼';







                } else {







                    filterWrap.classList.add('mobile-expanded');







                    if (arrow) arrow.innerText = '▲';







                }







            }







        }















        function resizeAllCharts() {







            if (typeof echarts === 'undefined') return;







            const seen = new Set();
            document.querySelectorAll('[id^="chart-"], [_echarts_instance_]').forEach(dom => {







                if (seen.has(dom) || dom.offsetParent === null) return;
                seen.add(dom);
                const chart = echarts.getInstanceByDom(dom);







                if (chart) chart.resize();







            });







        }















        window.addEventListener('resize', () => {







            clearTimeout(window._resizeTimer);







            window._resizeTimer = setTimeout(resizeAllCharts, 200);







        });















        



        // Embedded Apps Scope Updater for CTKM & Routemap

        window.updateEmbeddedAppsScope = function(user) {

            let u = user || window.currentUser;

            if (!u && window.state && window.state.currentUser) u = window.state.currentUser;

            if (!u) {

                try {

                    const raw = sessionStorage.getItem('cj_current_user') || localStorage.getItem('cj_current_user');

                    if (raw) u = JSON.parse(raw);

                } catch (_) {}

            }

            const rFrame = document.getElementById('iframe-gt-routemap');

            const cFrame = document.getElementById('iframe-gt-ctkm');

            let routeSrc = '/apps/routemap/';

            let ctkmSrc = '/apps/ctkm/';

            if (u) {

                const role = (u.role || '').toLowerCase();

                const scopeLvl = (u.scope_level || '').toLowerCase();

                const scopeVal = (u.scope_value || '').trim();

                if (role !== 'admin' && role !== 'bod' && role !== 'director' && scopeVal && scopeVal.toLowerCase() !== 'all' && scopeVal !== 'Toàn Quốc') {

                    if (role === 'gsbh' || scopeLvl === 'office') {

                        let vungName = '';

                        if (typeof window.getGeoByOffice === 'function') {

                            const geo = window.getGeoByOffice(scopeVal);

                            if (geo && geo.vung) vungName = geo.vung;

                        }

                        if (!vungName) {

                            const geoList = (typeof DIM_GEO_HIER !== 'undefined' && Array.isArray(DIM_GEO_HIER)) ? DIM_GEO_HIER : [];

                            const match = geoList.find(g => normMatch(g.gsbh, scopeVal));

                            if (match && match.vung) vungName = match.vung;

                        }

                        routeSrc += '?vung=' + encodeURIComponent(vungName) + '&office=' + encodeURIComponent(scopeVal) + '&lock=1';

                        ctkmSrc += '?vung=' + encodeURIComponent(vungName) + '&office=' + encodeURIComponent(scopeVal) + '&lock=1';

                    } else if (scopeLvl === 'area') {

                        let vungName = '';

                        if (typeof window.STATIC_OFFICE_GEO_MAP !== 'undefined') {

                            const entry = Object.values(window.STATIC_OFFICE_GEO_MAP).find(d => normMatch(d.area, scopeVal));

                            if (entry && entry.vung) vungName = entry.vung;

                        }

                        if (!vungName && typeof DIM_GEO_HIER !== 'undefined' && Array.isArray(DIM_GEO_HIER)) {

                            const match = DIM_GEO_HIER.find(g => normMatch(g.area, scopeVal));

                            if (match && match.vung) vungName = match.vung;

                        }

                        routeSrc += '?vung=' + encodeURIComponent(vungName || scopeVal) + '&area=' + encodeURIComponent(scopeVal) + '&lock=1';

                        ctkmSrc += '?vung=' + encodeURIComponent(vungName || scopeVal) + '&area=' + encodeURIComponent(scopeVal) + '&lock=1';

                    } else if (scopeLvl === 'vung') {

                        routeSrc += '?vung=' + encodeURIComponent(scopeVal) + '&lock=1';

                        ctkmSrc += '?vung=' + encodeURIComponent(scopeVal) + '&lock=1';

                    } else {

                        routeSrc += '?area=' + encodeURIComponent(scopeVal) + '&lock=1';

                        ctkmSrc += '?vung=' + encodeURIComponent(scopeVal) + '&lock=1';

                    }

                }

            }

            if (rFrame) {

                const cur = rFrame.getAttribute('src');

                if (!cur || cur === 'about:blank' || cur !== routeSrc) {

                    rFrame.setAttribute('src', routeSrc);

                }

            }

            if (cFrame) {

                const cur = cFrame.getAttribute('src');

                if (!cur || cur === 'about:blank' || cur !== ctkmSrc) {

                    cFrame.setAttribute('src', ctkmSrc);

                }

            }

        };



        // Export globals to window

        window.openAdminModal = openAdminModal;

        window.closeAdminModal = closeAdminModal;

        window.toggleAdminUserForm = toggleAdminUserForm;

        window.renderAdminUserTable = renderAdminUserTable;

        window.onAdminRoleChange = onAdminRoleChange;

        window.onAdminChannelChange = onAdminChannelChange;

        window.onAdminScopeLevelChange = onAdminScopeLevelChange;

        window.handleExcelFileSelect = handleExcelFileSelect;

        window.executeUserImport = executeUserImport;

        window.openImportExcelModal = openImportExcelModal;

        window.closeImportExcelModal = closeImportExcelModal;



async function adminPromptResetPass(username) {
    if (!username) return;
    const newPass = prompt(`Nhập mật khẩu mới cho tài khoản @${username} (Tối thiểu 6 ký tự):`);
    if (!newPass || !newPass.trim()) return;
    if (newPass.trim().length < 6) {
        alert("Mật khẩu mới phải có tối thiểu 6 ký tự!");
        return;
    }
    try {
        const token = sessionStorage.getItem('cj_access_token') || localStorage.getItem('cj_access_token');
        const res = await fetch(`/api/v1/users/${encodeURIComponent(username)}/reset-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ newPassword: newPass.trim() })
        });
        const data = await res.json();
        if (res.ok && data.status === 'success') {
            alert(`✅ Đã cấp lại mật khẩu mới cho tài khoản @${username}! Mật khẩu đã được mã hóa an toàn bằng thuật toán Bcrypt trong PostgreSQL.`);
            await syncUsersFromDatabase();
        } else {
            alert(`❌ Không thể cấp lại mật khẩu: ${data.message || 'Lỗi không xác định'}`);
        }
    } catch(err) {
        alert(`❌ Lỗi kết nối đến máy chủ: ${err.message}`);
    }
}
window.adminPromptResetPass = adminPromptResetPass;


window.adminSaveUserEmail = async function() {
    if (typeof selectedDetailUser === 'undefined' || !selectedDetailUser || !selectedDetailUser.username) {
        alert('Vui lòng chọn tài khoản người dùng!');
        return;
    }
    const input = document.getElementById('ud-email-input');
    const newEmail = (input ? input.value : '').trim().toLowerCase();
    if (!newEmail || !newEmail.includes('@') || !newEmail.includes('.')) {
        alert('Vui lòng nhập định dạng Email hợp lệ (ví dụ: your_name@gmail.com)!');
        if (input) input.focus();
        return;
    }
    const btn = document.getElementById('ud-btn-save-email');
    if (btn) { btn.disabled = true; btn.innerText = 'Đang lưu...'; }
    try {
        const token = sessionStorage.getItem('cj_access_token') || localStorage.getItem('cj_access_token');
        const res = await fetch(`/api/v1/users/${encodeURIComponent(selectedDetailUser.username)}/email`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token ? `Bearer ${token}` : ''
            },
            body: JSON.stringify({ email: newEmail })
        });
        const data = await res.json();
        if (!res.ok || data.status !== 'success') {
            throw new Error(data.message || 'Lỗi khi lưu Email');
        }
        selectedDetailUser.email = newEmail;
        if (typeof getAppUsers === 'function') {
            const users = getAppUsers();
            const u = users.find(x => (x.username || '').toLowerCase() === selectedDetailUser.username.toLowerCase());
            if (u) u.email = newEmail;
        }
        const statusEl = document.getElementById('ud-email-status');
        if (statusEl) {
            statusEl.innerText = '✓ Đã lưu thành công!';
            setTimeout(() => { if (statusEl) statusEl.innerText = ''; }, 3000);
        }
        alert(`✅ Đã cập nhật thành công Email nhận mã OTP cho @${selectedDetailUser.username} thành:\n${newEmail}\n\nKhi tài khoản này đăng nhập từ Mạng Ngoài, mã OTP 6 số sẽ được gửi về đúng email này!`);
        if (typeof renderAdminUserTable === 'function') renderAdminUserTable();
    } catch(err) {
        alert('❌ Không thể lưu Email: ' + err.message);
    } finally {
        if (btn) { btn.disabled = false; btn.innerText = '💾 Lưu Email'; }
    }
};
