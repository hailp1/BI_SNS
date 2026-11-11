-- ============================================================================
-- CJ FOODS ENTERPRISE ARCHITECTURE - TIER 4: IAM & SECURITY SCHEMA
-- Compliance: NIST SP 800-63B, OWASP ASVS v4.0.3, ISO/IEC 27001
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Schema tách biệt cho bảo mật định danh
CREATE SCHEMA IF NOT EXISTS iam;

-- 1. BẢNG ROLES (Vai trò quyền hạn)
CREATE TABLE IF NOT EXISTS iam.roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL, -- 'SUPER_ADMIN', 'BOD', 'HEAD_CHANNEL', 'RSM', 'ASM', 'KAM', 'NVBH'
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. BẢNG PERMISSIONS (Quyền hạn chi tiết)
CREATE TABLE IF NOT EXISTS iam.permissions (
    id SERIAL PRIMARY KEY,
    code VARCHAR(100) UNIQUE NOT NULL,
    module VARCHAR(50) NOT NULL,
    description TEXT
);

-- 3. BẢNG ROLE_PERMISSIONS
CREATE TABLE IF NOT EXISTS iam.role_permissions (
    role_id INT REFERENCES iam.roles(id) ON DELETE CASCADE,
    permission_id INT REFERENCES iam.permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- 4. BẢNG USERS (Quản lý danh tính theo chuẩn NIST SP 800-63B)
CREATE TABLE IF NOT EXISTS iam.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,           -- Bcrypt Cost 12 (Không lưu plaintext)
    full_name VARCHAR(150) NOT NULL,
    channel VARCHAR(50) DEFAULT 'all',             -- 'all', 'GT', 'MT', 'B2B', 'KR'
    role VARCHAR(50) NOT NULL,                     -- 'admin', 'bod', 'head_gt', 'rsm', 'asm', 'kam', 'nvbh'
    scope_level VARCHAR(50) DEFAULT 'all',         -- 'all', 'region', 'vung', 'office', 'npp', 'chain'
    scope_value VARCHAR(150) DEFAULT 'Toàn Quốc',
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Chính sách chống Brute-force & Khóa tài khoản (Account Lockout Policy)
    failed_attempts INT DEFAULT 0,
    locked_until TIMESTAMPTZ,
    
    -- Xác thực 2 yếu tố (2FA / TOTP RFC 6238)
    two_factor_secret VARCHAR(100),
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    
    last_login_at TIMESTAMPTZ,
    last_login_ip VARCHAR(45),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_iam_users_username ON iam.users(username);
CREATE INDEX IF NOT EXISTS idx_iam_users_role ON iam.users(role);

-- 5. BẢNG AUDIT LOGS (Kiểm toán bảo mật theo chuẩn ISO/IEC 27001 - Bất biến WORM)
CREATE TABLE IF NOT EXISTS iam.audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES iam.users(id) ON DELETE SET NULL,
    username VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,                   -- 'LOGIN_SUCCESS', 'LOGIN_FAILED', 'ACCOUNT_LOCKED', 'VIEW_REPORT', 'EXPORT_EXCEL'
    module VARCHAR(50) NOT NULL,                   -- 'AUTH', 'DASHBOARD_OVERVIEW', 'GT_CHANNEL', 'MT_CHANNEL'
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT,
    endpoint VARCHAR(255),
    method VARCHAR(10),
    status VARCHAR(20) DEFAULT 'SUCCESS',          -- 'SUCCESS', 'FORBIDDEN', 'FAILED'
    details JSONB,
    execution_time_ms INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_created_at ON iam.audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_username ON iam.audit_logs(username);
CREATE INDEX IF NOT EXISTS idx_audit_action ON iam.audit_logs(action);

-- 6. BẢNG MẠNG NỘI BỘ TIN CẬY (ZERO TRUST CONDITIONAL ACCESS)
CREATE TABLE IF NOT EXISTS iam.trusted_networks (
    id SERIAL PRIMARY KEY,
    network_name VARCHAR(100) NOT NULL,
    cidr_or_ip VARCHAR(50) NOT NULL,
    description VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO iam.trusted_networks (network_name, cidr_or_ip, description) VALUES
('Local Loopback & Dev', '127.0.0.1/32', 'May chu va moi truong local'),
('IPv6 Localhost', '::1/128', 'Localhost IPv6'),
('Mang noi bo Van phong CJ (LAN Class C)', '192.168.0.0/16', 'Dai mang noi bo van phong Wi-Fi / Day'),
('Mang noi bo Tap doan CJ (Intranet Class A)', '10.0.0.0/8', 'He thong VPN va mang Intranet Tap doan CJ'),
('Mang noi bo Docker & Cloud Private', '172.16.0.0/12', 'Subnet may chu va container noi bo')
ON CONFLICT DO NOTHING;
