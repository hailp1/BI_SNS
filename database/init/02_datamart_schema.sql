-- ============================================================================
-- CJ FOODS ENTERPRISE ARCHITECTURE - TIER 4: COMMERCIAL DATA MART
-- Schema: datamart (Tập hợp các bảng Fact & Dimension chuẩn KimBall Data Warehouse)
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS datamart;

-- 1. BẢNG HIỆU SUẤT THÁNG THEO KÊNH (MONTHLY PERFORMANCE FACT)
CREATE TABLE IF NOT EXISTS datamart.fact_monthly_performance (
    id SERIAL PRIMARY KEY,
    year INT NOT NULL,
    month VARCHAR(7) NOT NULL,                      -- '2026-10'
    channel VARCHAR(50) NOT NULL,                   -- 'GT', 'MT', 'B2B', 'KR', 'ALL'
    sub_channel VARCHAR(100) DEFAULT 'ALL',
    sellin_revenue NUMERIC(18,2) DEFAULT 0,
    target_sellin NUMERIC(18,2) DEFAULT 0,
    gap_sellin NUMERIC(18,2) DEFAULT 0,
    achievement_rate NUMERIC(6,2) DEFAULT 0,        -- 100.7%
    ly_sellin NUMERIC(18,2) DEFAULT 0,              -- Cùng kỳ năm trước
    yoy_growth_amt NUMERIC(18,2) DEFAULT 0,
    yoy_growth_rate NUMERIC(6,2) DEFAULT 0,         -- YoY +23.2%
    mom_mtd_rate NUMERIC(6,2) DEFAULT 0,            -- MoM MTD +0.9%
    ytd_revenue NUMERIC(18,2) DEFAULT 0,            -- Lũy kế năm
    channel_share NUMERIC(6,2) DEFAULT 0,           -- Tỷ trọng đóng góp %
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_std_monthly_perf UNIQUE (year, month, channel, sub_channel)
);

CREATE INDEX IF NOT EXISTS idx_std_perf_month_chan ON datamart.fact_monthly_performance (month, channel);

-- 2. BẢNG TIẾN ĐỘ DOANH SỐ THEO NGÀY (DAILY SALES TREND FACT)
CREATE TABLE IF NOT EXISTS datamart.fact_daily_sales (
    id SERIAL PRIMARY KEY,
    sale_date DATE NOT NULL,
    year INT NOT NULL,
    month VARCHAR(7) NOT NULL,
    channel VARCHAR(50) NOT NULL,                   -- 'GT', 'MT', 'B2B', 'KR', 'ALL'
    sellin_amt NUMERIC(18,2) DEFAULT 0,
    target_amt NUMERIC(18,2) DEFAULT 0,
    cumulative_sellin NUMERIC(18,2) DEFAULT 0,
    cumulative_target NUMERIC(18,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_std_daily_sales UNIQUE (sale_date, channel)
);

CREATE INDEX IF NOT EXISTS idx_std_daily_date_chan ON datamart.fact_daily_sales (sale_date, channel);

-- 3. BẢNG TỒN KHO & NGÀY TỒN KHO DOI (STOCK & DOI FACT)
CREATE TABLE IF NOT EXISTS datamart.fact_stock_doi (
    id SERIAL PRIMARY KEY,
    report_month VARCHAR(7) NOT NULL,
    channel VARCHAR(50) DEFAULT 'GT',
    region VARCHAR(50) NOT NULL,                    -- 'North', 'Central', 'South'
    area VARCHAR(50) NOT NULL,                      -- 'Hà Nội 1', 'Đà Nẵng 1', 'HCM 1'
    npp_code VARCHAR(50) NOT NULL,
    npp_name VARCHAR(150) NOT NULL,
    stock_amt NUMERIC(18,2) DEFAULT 0,              -- Giá trị tồn kho
    l3m_avg_monthly NUMERIC(18,2) DEFAULT 0,        -- Doanh số bán bình quân 3 tháng
    doi_days NUMERIC(6,1) DEFAULT 0,                -- Số ngày tồn kho DOI = (Stock / L3M) * 26
    doi_status VARCHAR(50) DEFAULT 'Normal',        -- 'Danger_High', 'Normal', 'Low_Stock'
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_std_stock_doi UNIQUE (report_month, npp_code)
);

CREATE INDEX IF NOT EXISTS idx_std_stock_region_area ON datamart.fact_stock_doi (report_month, region, area);

-- 4. BẢNG PHÂN CẤP ĐỊA LÝ (DIMENSION GEOGRAPHY HIERARCHY)
CREATE TABLE IF NOT EXISTS datamart.dim_geo_hierarchy (
    id SERIAL PRIMARY KEY,
    region_code VARCHAR(20) NOT NULL,               -- 'BẮC', 'TRUNG', 'NAM'
    region_name VARCHAR(50) NOT NULL,
    vung_code VARCHAR(50) NOT NULL,                 -- 'Đông Bắc', 'Miền Tây'
    area_code VARCHAR(50) NOT NULL,                 -- 'Hà Nội 1', 'Đà Nẵng 1'
    office_name VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_std_geo UNIQUE (region_code, vung_code, area_code)
);

-- 5. BẢNG PHÂN CẤP SẢN PHẨM (DIMENSION PRODUCT HIERARCHY)
CREATE TABLE IF NOT EXISTS datamart.dim_product_hierarchy (
    sku_code VARCHAR(50) PRIMARY KEY,
    sku_name VARCHAR(200) NOT NULL,
    storage_type VARCHAR(50) NOT NULL,              -- 'FROZEN' (Đông), 'CHILLED' (Mát), 'AMBIENT' (Khô)
    category VARCHAR(100) NOT NULL,                 -- 'Kimchi', 'Thịt Chế Biến', 'Gia Vị'
    ph1 VARCHAR(100),
    ph2 VARCHAR(100),
    unit VARCHAR(20) DEFAULT 'EA',
    price_layer1 NUMERIC(15,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
