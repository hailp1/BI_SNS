-- ============================================================================
-- CJ FOODS ENTERPRISE ARCHITECTURE - TIER 4: SEED DATA & ROLES
-- Standard initial accounts (All hashed with authentic Bcrypt Cost 12)
-- Default initial password: CjFoods@2026!
-- ============================================================================

-- 1. SEED ROLES
INSERT INTO iam.roles (name, description) VALUES
('SUPER_ADMIN', 'Quản trị viên tối cao - Toàn quyền cấu hình an ninh và hệ thống'),
('BOD', 'Ban Giám Đốc - Xem báo cáo điều hành toàn diện 4 kênh toàn quốc'),
('HEAD_CHANNEL', 'Giám Đốc Kênh - Quản lý toàn diện 1 kênh (GT, MT, B2B hoặc KR)'),
('RSM', 'Giám Đốc Miền - Quản lý số liệu toàn Miền (Bắc / Trung / Nam)'),
('ASM', 'Quản Lý Khu Vực - Quản lý số liệu Tỉnh / Vùng phụ trách'),
('KAM', 'Quản Lý Khách Hàng Trọng Điểm - Quản lý chuỗi siêu thị MT / Key Accounts'),
('NVBH', 'Nhân Viên Bán Hàng - Chỉ xem tuyến bán hàng và danh sách khách hàng của mình')
ON CONFLICT (name) DO NOTHING;

-- 2. SEED USERS (Bcrypt hash: $2b$12$qNwM3QPkLaL7QqSF/8V7ZeK.o57TPD0BHzxgndf0HvXn971FrOjQ. = CjFoods@2026!)
INSERT INTO iam.users (username, email, password_hash, full_name, role, channel, scope_level, scope_value) VALUES
('admin', 'admin@cjfoods.com.vn', '$2b$12$qNwM3QPkLaL7QqSF/8V7ZeK.o57TPD0BHzxgndf0HvXn971FrOjQ.', 'Quản Trị Viên (Admin)', 'admin', 'all', 'all', 'Toàn Quốc'),
('bod_director', 'bod@cjfoods.com.vn', '$2b$12$qNwM3QPkLaL7QqSF/8V7ZeK.o57TPD0BHzxgndf0HvXn971FrOjQ.', 'Giám Đốc Điều Hành (BOD)', 'bod', 'all', 'all', 'Toàn Quốc'),
('head_gt', 'head_gt@cjfoods.com.vn', '$2b$12$qNwM3QPkLaL7QqSF/8V7ZeK.o57TPD0BHzxgndf0HvXn971FrOjQ.', 'Trưởng Kênh GT Toàn Quốc', 'head_gt', 'GT', 'channel', 'Kênh GT'),
('head_mt', 'head_mt@cjfoods.com.vn', '$2b$12$qNwM3QPkLaL7QqSF/8V7ZeK.o57TPD0BHzxgndf0HvXn971FrOjQ.', 'Trưởng Kênh MT Toàn Quốc', 'head_mt', 'MT', 'channel', 'Kênh MT'),
('rsm_north', 'rsm_north@cjfoods.com.vn', '$2b$12$qNwM3QPkLaL7QqSF/8V7ZeK.o57TPD0BHzxgndf0HvXn971FrOjQ.', 'Giám Đốc Miền Bắc', 'rsm', 'GT', 'region', 'Miền Bắc'),
('asm_hcm', 'asm_hcm@cjfoods.com.vn', '$2b$12$qNwM3QPkLaL7QqSF/8V7ZeK.o57TPD0BHzxgndf0HvXn971FrOjQ.', 'Quản Lý Khu Vực HCM 1', 'asm', 'GT', 'area', 'Hồ Chí Minh 1'),
('asm_danang', 'asm_danang@cjfoods.com.vn', '$2b$12$qNwM3QPkLaL7QqSF/8V7ZeK.o57TPD0BHzxgndf0HvXn971FrOjQ.', 'Quản Lý Khu Vực Đà Nẵng 1', 'asm', 'GT', 'area', 'Đà Nẵng 1'),
('kam_winmart', 'kam_winmart@cjfoods.com.vn', '$2b$12$qNwM3QPkLaL7QqSF/8V7ZeK.o57TPD0BHzxgndf0HvXn971FrOjQ.', 'KAM Phụ Trách Chuỗi WinMart', 'kam', 'MT', 'chain', 'WinMart'),
('lead_b2b', 'lead_b2b@cjfoods.com.vn', '$2b$12$qNwM3QPkLaL7QqSF/8V7ZeK.o57TPD0BHzxgndf0HvXn971FrOjQ.', 'Trưởng Kênh Khách Hàng B2B', 'head_b2b', 'B2B', 'channel', 'Kênh B2B'),
('sales_08562', 'sales08562@cjfoods.com.vn', '$2b$12$qNwM3QPkLaL7QqSF/8V7ZeK.o57TPD0BHzxgndf0HvXn971FrOjQ.', 'Nguyễn Văn Ngọc (NVBH 08562)', 'nvbh', 'GT', 'route', 'Tuyến T2-T4-T6')
ON CONFLICT (username) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    full_name = EXCLUDED.full_name,
    is_active = TRUE;

-- 3. SEED DỮ LIỆU BÁO CÁO MẪU CHO DATAMART (Tháng 10/2026 chuẩn CJ Foods)
INSERT INTO datamart.fact_monthly_performance 
(year, month, channel, sub_channel, sellin_revenue, target_sellin, gap_sellin, achievement_rate, ly_sellin, yoy_growth_amt, yoy_growth_rate, mom_mtd_rate, ytd_revenue, channel_share)
VALUES
(2026, '2026-10', 'ALL', 'ALL', 209.54, 211.11, -1.57, 99.26, 170.09, 39.45, 23.20, 0.90, 2011.06, 100.00),
(2026, '2026-10', 'GT', 'GT', 44.22, 47.68, -3.46, 92.74, 40.55, 3.67, 9.05, 15.50, 489.74, 21.10),
(2026, '2026-10', 'MT', 'MT', 127.33, 126.43, 0.90, 100.71, 100.49, 26.84, 26.71, 4.60, 1250.68, 60.77),
(2026, '2026-10', 'B2B', 'B2B', 24.93, 24.82, 0.11, 100.44, 17.05, 7.88, 46.22, -4.00, 227.59, 11.90),
(2026, '2026-10', 'KR', 'KR', 13.06, 12.18, 0.88, 107.22, 11.99, 1.07, 8.92, 37.20, 112.05, 6.23)
ON CONFLICT (year, month, channel, sub_channel) DO NOTHING;
