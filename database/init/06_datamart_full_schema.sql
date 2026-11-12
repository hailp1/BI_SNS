-- ============================================================================
-- CJ FOODS ENTERPRISE ARCHITECTURE - FULL POSTGRESQL DATAMART SCHEMA (PHASE 1)
-- Migrates 100% of business cubes (33 datasets) from static files into
-- indexed PostgreSQL relational tables under schema "datamart".
-- Idempotent & backwards-compatible with 02_datamart_schema.sql.
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS datamart;

-- 0. ETL METADATA & REFRESH AUDIT
CREATE TABLE IF NOT EXISTS datamart.etl_metadata (
    meta_key    VARCHAR(100) PRIMARY KEY,
    meta_value  TEXT NOT NULL,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS datamart.etl_dataset_stats (
    dataset_name VARCHAR(64) PRIMARY KEY,
    table_name   VARCHAR(100) NOT NULL,
    row_count    INT NOT NULL DEFAULT 0,
    min_month    VARCHAR(10),
    max_month    VARCHAR(10),
    metric_sum   NUMERIC(20, 2) DEFAULT 0,
    loaded_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 1. MASTER DIMENSIONS (matching DIM_GEO_HIER, DIM_PROD_HIER, DIM_COMM_HIER)
-- ============================================================================

CREATE TABLE IF NOT EXISTS datamart.dim_geo_distributors (
    npp_code    VARCHAR(50) PRIMARY KEY,
    npp_name    VARCHAR(200) NOT NULL,
    mien        VARCHAR(100) NOT NULL DEFAULT '',
    vung        VARCHAR(100) NOT NULL DEFAULT '',
    gsbh        VARCHAR(120) NOT NULL DEFAULT '',
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_dim_geo_dist_hier ON datamart.dim_geo_distributors (mien, vung, gsbh);

CREATE TABLE IF NOT EXISTS datamart.dim_product_catalog (
    sku_name    TEXT PRIMARY KEY,
    storage     VARCHAR(50) NOT NULL DEFAULT 'Ambient',
    cate        VARCHAR(120) NOT NULL DEFAULT '',
    ph1         VARCHAR(150) NOT NULL DEFAULT '',
    ph2         VARCHAR(150) NOT NULL DEFAULT '',
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_dim_prod_cat_hier ON datamart.dim_product_catalog (storage, cate, ph1, ph2);

CREATE TABLE IF NOT EXISTS datamart.dim_commercial_hierarchy (
    id           SERIAL PRIMARY KEY,
    channel      VARCHAR(50) NOT NULL,
    sub_channel  VARCHAR(120) NOT NULL DEFAULT '',
    account_name VARCHAR(255) NOT NULL DEFAULT '',
    CONSTRAINT uq_dim_comm_hier UNIQUE (channel, sub_channel, account_name)
);
CREATE INDEX IF NOT EXISTS idx_dim_comm_chan ON datamart.dim_commercial_hierarchy (channel, sub_channel);

-- ============================================================================
-- 2. ENTERPRISE OVERVIEW / PRODUCT / CHANNEL / TARGET FACTS
-- ============================================================================

-- SELLIN_M (331k+ rows)
CREATE TABLE IF NOT EXISTS datamart.fact_sellin_monthly (
    id           BIGSERIAL PRIMARY KEY,
    month        VARCHAR(7) NOT NULL,
    year         SMALLINT NOT NULL,
    month_num    CHAR(2) NOT NULL,
    channel      VARCHAR(50) NOT NULL,
    sub_channel  VARCHAR(120) NOT NULL DEFAULT '',
    account_code VARCHAR(100) NOT NULL DEFAULT '',
    account_name VARCHAR(255) NOT NULL DEFAULT '',
    mien         VARCHAR(100) NOT NULL DEFAULT '',
    cluster      VARCHAR(120) NOT NULL DEFAULT '',
    gsbh         VARCHAR(120) NOT NULL DEFAULT '',
    office       VARCHAR(120) NOT NULL DEFAULT '',
    storage      VARCHAR(50) NOT NULL DEFAULT '',
    cate         VARCHAR(120) NOT NULL DEFAULT '',
    ph1          VARCHAR(150) NOT NULL DEFAULT '',
    ph2          VARCHAR(150) NOT NULL DEFAULT '',
    sku_name     TEXT NOT NULL DEFAULT '',
    sellin_val   NUMERIC(18, 2) NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_sellin_m_ym_chan ON datamart.fact_sellin_monthly (year, month_num, channel);
CREATE INDEX IF NOT EXISTS idx_sellin_m_month ON datamart.fact_sellin_monthly (month);
CREATE INDEX IF NOT EXISTS idx_sellin_m_geo ON datamart.fact_sellin_monthly (mien, cluster, office, account_code);
CREATE INDEX IF NOT EXISTS idx_sellin_m_prod ON datamart.fact_sellin_monthly (storage, cate, ph1);

-- DAILY_DATA (202k+ rows)
CREATE TABLE IF NOT EXISTS datamart.fact_daily_sellin (
    id           BIGSERIAL PRIMARY KEY,
    month        VARCHAR(7) NOT NULL,
    date_val     DATE NOT NULL,
    channel      VARCHAR(50) NOT NULL,
    storage      VARCHAR(50) NOT NULL DEFAULT '',
    cate         VARCHAR(120) NOT NULL DEFAULT '',
    ph1          VARCHAR(150) NOT NULL DEFAULT '',
    ph2          VARCHAR(150) NOT NULL DEFAULT '',
    sku_name     TEXT NOT NULL DEFAULT '',
    daily_sellin NUMERIC(18, 2) NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_daily_si_month_chan ON datamart.fact_daily_sellin (month, channel, date_val);

-- PROD_TREE (12.8k+ rows)
CREATE TABLE IF NOT EXISTS datamart.fact_prod_tree (
    id         BIGSERIAL PRIMARY KEY,
    month      VARCHAR(7) NOT NULL,
    year       SMALLINT NOT NULL,
    month_num  CHAR(2) NOT NULL,
    storage    VARCHAR(50) NOT NULL DEFAULT '',
    cate       VARCHAR(120) NOT NULL DEFAULT '',
    ph1        VARCHAR(150) NOT NULL DEFAULT '',
    ph2        VARCHAR(150) NOT NULL DEFAULT '',
    sku_name   TEXT NOT NULL DEFAULT '',
    sellin_val NUMERIC(18, 2) NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_prod_tree_ym ON datamart.fact_prod_tree (year, month_num, storage, cate);

-- CHAN_TREE (19k+ rows)
CREATE TABLE IF NOT EXISTS datamart.fact_chan_tree (
    id           BIGSERIAL PRIMARY KEY,
    month        VARCHAR(7) NOT NULL,
    year         SMALLINT NOT NULL,
    month_num    CHAR(2) NOT NULL,
    channel      VARCHAR(50) NOT NULL,
    sub_channel  VARCHAR(120) NOT NULL DEFAULT '',
    account_code VARCHAR(100) NOT NULL DEFAULT '',
    account_name VARCHAR(255) NOT NULL DEFAULT '',
    sellin_val   NUMERIC(18, 2) NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_chan_tree_ym ON datamart.fact_chan_tree (year, month_num, channel, sub_channel);

-- TARGET_SELLIN (8.7k+ rows)
CREATE TABLE IF NOT EXISTS datamart.fact_target_sellin (
    id               BIGSERIAL PRIMARY KEY,
    year             SMALLINT NOT NULL,
    month            VARCHAR(7) NOT NULL,
    channel          VARCHAR(50) NOT NULL,
    sub_channel      VARCHAR(120) NOT NULL DEFAULT '',
    account_npp      VARCHAR(255) NOT NULL DEFAULT '',
    distributor_code VARCHAR(100) NOT NULL DEFAULT '',
    storage          VARCHAR(50) NOT NULL DEFAULT '',
    ph1              VARCHAR(150) NOT NULL DEFAULT '',
    target_amt       NUMERIC(18, 2) NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_target_si_mc ON datamart.fact_target_sellin (month, channel, distributor_code);

-- TARGET_SELLOUT (20.4k+ rows)
CREATE TABLE IF NOT EXISTS datamart.fact_target_sellout (
    id               BIGSERIAL PRIMARY KEY,
    year             SMALLINT NOT NULL,
    month            VARCHAR(7) NOT NULL,
    channel          VARCHAR(50) NOT NULL DEFAULT 'GT',
    distributor_code VARCHAR(100) NOT NULL DEFAULT '',
    employee_name    VARCHAR(150) NOT NULL DEFAULT '',
    storage          VARCHAR(50) NOT NULL DEFAULT '',
    ph1              VARCHAR(150) NOT NULL DEFAULT '',
    target_amt       NUMERIC(18, 2) NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_target_so_md ON datamart.fact_target_sellout (month, distributor_code, employee_name);

-- ============================================================================
-- 3. CHANNEL MT, B2B, KR FACTS
-- ============================================================================

-- MT_TREE (114k+ rows)
CREATE TABLE IF NOT EXISTS datamart.fact_mt_tree (
    id          BIGSERIAL PRIMARY KEY,
    month       VARCHAR(7) NOT NULL,
    year        SMALLINT NOT NULL,
    month_num   CHAR(2) NOT NULL,
    sub_channel VARCHAR(120) NOT NULL DEFAULT '',
    key_account VARCHAR(150) NOT NULL DEFAULT '',
    cluster     VARCHAR(120) NOT NULL DEFAULT '',
    storage     VARCHAR(50) NOT NULL DEFAULT '',
    cate        VARCHAR(120) NOT NULL DEFAULT '',
    ph1         VARCHAR(150) NOT NULL DEFAULT '',
    ph2         VARCHAR(150) NOT NULL DEFAULT '',
    sku_name    TEXT NOT NULL DEFAULT '',
    sellin_val  NUMERIC(18, 2) NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_mt_tree_ym ON datamart.fact_mt_tree (year, month_num, sub_channel, key_account);

-- MT_STORE_DATA (66k+ rows)
CREATE TABLE IF NOT EXISTS datamart.fact_mt_store (
    id          BIGSERIAL PRIMARY KEY,
    m           SMALLINT NOT NULL,
    store_id    VARCHAR(100) NOT NULL,
    acc         VARCHAR(150) NOT NULL DEFAULT '',
    name        VARCHAR(255) NOT NULL DEFAULT '',
    sc          VARCHAR(100) NOT NULL DEFAULT '',
    cl          VARCHAR(100) NOT NULL DEFAULT '',
    addr        TEXT NOT NULL DEFAULT '',
    val         NUMERIC(18, 2) NOT NULL DEFAULT 0,
    lm          NUMERIC(18, 2) NOT NULL DEFAULT 0,
    ly          NUMERIC(18, 2) NOT NULL DEFAULT 0,
    sku         INT NOT NULL DEFAULT 0,
    lm_sku      INT NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_mt_store_m ON datamart.fact_mt_store (m, acc, sc, cl);

-- MT_DAILY_DATA (9.2k+ rows)
CREATE TABLE IF NOT EXISTS datamart.fact_mt_daily (
    id          BIGSERIAL PRIMARY KEY,
    month       VARCHAR(7) NOT NULL,
    date_val    DATE NOT NULL,
    sub_channel VARCHAR(120) NOT NULL DEFAULT '',
    key_account VARCHAR(150) NOT NULL DEFAULT '',
    val         NUMERIC(18, 2) NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_mt_daily_md ON datamart.fact_mt_daily (month, date_val, sub_channel);

-- B2B_TREE (42.9k+ rows)
CREATE TABLE IF NOT EXISTS datamart.fact_b2b_tree (
    id           BIGSERIAL PRIMARY KEY,
    month        VARCHAR(7) NOT NULL,
    year         SMALLINT NOT NULL,
    month_num    CHAR(2) NOT NULL,
    sub_channel  VARCHAR(120) NOT NULL DEFAULT '',
    b2b_account  VARCHAR(150) NOT NULL DEFAULT '',
    b2b_customer VARCHAR(255) NOT NULL DEFAULT '',
    storage      VARCHAR(50) NOT NULL DEFAULT '',
    cate         VARCHAR(120) NOT NULL DEFAULT '',
    ph1          VARCHAR(150) NOT NULL DEFAULT '',
    ph2          VARCHAR(150) NOT NULL DEFAULT '',
    sku_name     TEXT NOT NULL DEFAULT '',
    sellin_val   NUMERIC(18, 2) NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_b2b_tree_ym ON datamart.fact_b2b_tree (year, month_num, sub_channel, b2b_account);

-- KR_TREE (53.8k+ rows)
CREATE TABLE IF NOT EXISTS datamart.fact_kr_tree (
    id           BIGSERIAL PRIMARY KEY,
    month        VARCHAR(7) NOT NULL,
    year         SMALLINT NOT NULL,
    month_num    CHAR(2) NOT NULL,
    sub_channel  VARCHAR(120) NOT NULL DEFAULT '',
    account_code VARCHAR(120) NOT NULL DEFAULT '',
    kr_chain     VARCHAR(255) NOT NULL DEFAULT '',
    storage      VARCHAR(50) NOT NULL DEFAULT '',
    cate         VARCHAR(120) NOT NULL DEFAULT '',
    ph1          VARCHAR(150) NOT NULL DEFAULT '',
    ph2          VARCHAR(150) NOT NULL DEFAULT '',
    sku_name     TEXT NOT NULL DEFAULT '',
    sellin_val   NUMERIC(18, 2) NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_kr_tree_ym ON datamart.fact_kr_tree (year, month_num, sub_channel, account_code);

-- ============================================================================
-- 4. CHANNEL GT FACTS (16 DATASETS)
-- ============================================================================

-- GT_TREE (221k+ rows)
CREATE TABLE IF NOT EXISTS datamart.fact_gt_tree (
    id            BIGSERIAL PRIMARY KEY,
    month         VARCHAR(7) NOT NULL,
    year          SMALLINT NOT NULL,
    month_num     CHAR(2) NOT NULL,
    mien          VARCHAR(100) NOT NULL DEFAULT '',
    vung          VARCHAR(100) NOT NULL DEFAULT '',
    gsbh_name     VARCHAR(120) NOT NULL DEFAULT '',
    npp_code      VARCHAR(50) NOT NULL DEFAULT '',
    npp_name      VARCHAR(200) NOT NULL DEFAULT '',
    nvbh_name     VARCHAR(150) NOT NULL DEFAULT '',
    office        VARCHAR(120) NOT NULL DEFAULT '',
    storage       VARCHAR(50) NOT NULL DEFAULT '',
    cate          VARCHAR(120) NOT NULL DEFAULT '',
    ph1           VARCHAR(150) NOT NULL DEFAULT '',
    ph2           VARCHAR(150) NOT NULL DEFAULT '',
    sku_name      TEXT NOT NULL DEFAULT '',
    sellout_val   NUMERIC(18, 2) NOT NULL DEFAULT 0,
    aso_count     INT NOT NULL DEFAULT 0,
    order_count   INT NOT NULL DEFAULT 0,
    order_sku_cnt INT NOT NULL DEFAULT 0,
    aso_sku_cnt   INT NOT NULL DEFAULT 0,
    sku_count     INT NOT NULL DEFAULT 0,
    line_count    INT NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_gt_tree_ym ON datamart.fact_gt_tree (year, month_num);
CREATE INDEX IF NOT EXISTS idx_gt_tree_geo ON datamart.fact_gt_tree (month, mien, vung, office, npp_code);
CREATE INDEX IF NOT EXISTS idx_gt_tree_prod ON datamart.fact_gt_tree (month, storage, cate);

-- GT_DAILY_SI (136k+ rows)
CREATE TABLE IF NOT EXISTS datamart.fact_gt_daily_si (
    id       BIGSERIAL PRIMARY KEY,
    month    VARCHAR(7) NOT NULL,
    date_val DATE NOT NULL,
    npp_code VARCHAR(50) NOT NULL DEFAULT '',
    storage  VARCHAR(50) NOT NULL DEFAULT '',
    cate     VARCHAR(120) NOT NULL DEFAULT '',
    ph1      VARCHAR(150) NOT NULL DEFAULT '',
    ph2      VARCHAR(150) NOT NULL DEFAULT '',
    sku_name TEXT NOT NULL DEFAULT '',
    daily_si NUMERIC(18, 2) NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_gt_daily_si_m ON datamart.fact_gt_daily_si (month, date_val, npp_code);

-- GT_DAILY_SO (125k+ rows)
CREATE TABLE IF NOT EXISTS datamart.fact_gt_daily_so (
    id       BIGSERIAL PRIMARY KEY,
    month    VARCHAR(7) NOT NULL,
    date_val DATE NOT NULL,
    npp_code VARCHAR(50) NOT NULL DEFAULT '',
    storage  VARCHAR(50) NOT NULL DEFAULT '',
    cate     VARCHAR(120) NOT NULL DEFAULT '',
    ph1      VARCHAR(150) NOT NULL DEFAULT '',
    ph2      VARCHAR(150) NOT NULL DEFAULT '',
    sku_name TEXT NOT NULL DEFAULT '',
    daily_so NUMERIC(18, 2) NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_gt_daily_so_m ON datamart.fact_gt_daily_so (month, date_val, npp_code);

-- GT_SI (4.1k+ rows)
CREATE TABLE IF NOT EXISTS datamart.fact_gt_si (
    id         BIGSERIAL PRIMARY KEY,
    month      VARCHAR(7) NOT NULL,
    npp_code   VARCHAR(50) NOT NULL,
    sellin_val NUMERIC(18, 2) NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_gt_si_m ON datamart.fact_gt_si (month, npp_code);

-- GT_STOCK (183k+ rows)
CREATE TABLE IF NOT EXISTS datamart.fact_gt_stock (
    id        BIGSERIAL PRIMARY KEY,
    month     VARCHAR(7) NOT NULL,
    npp_code  VARCHAR(50) NOT NULL DEFAULT '',
    storage   VARCHAR(50) NOT NULL DEFAULT '',
    cate      VARCHAR(120) NOT NULL DEFAULT '',
    ph1       VARCHAR(150) NOT NULL DEFAULT '',
    ph2       VARCHAR(150) NOT NULL DEFAULT '',
    sku_name  TEXT NOT NULL DEFAULT '',
    stock_val NUMERIC(18, 2) NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_gt_stock_m ON datamart.fact_gt_stock (month, npp_code, storage);

-- GT_ASO_M (20.7k+ rows)
CREATE TABLE IF NOT EXISTS datamart.fact_gt_aso_m (
    id          BIGSERIAL PRIMARY KEY,
    month       VARCHAR(7) NOT NULL,
    year        SMALLINT NOT NULL,
    month_num   CHAR(2) NOT NULL,
    npp_code    VARCHAR(50) NOT NULL DEFAULT '',
    storage     VARCHAR(50) NOT NULL DEFAULT '',
    aso_count   INT NOT NULL DEFAULT 0,
    order_count INT NOT NULL DEFAULT 0,
    mien        VARCHAR(100) NOT NULL DEFAULT '',
    vung        VARCHAR(100) NOT NULL DEFAULT '',
    gsbh        VARCHAR(120) NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_gt_aso_m ON datamart.fact_gt_aso_m (month, npp_code, storage);

-- GT_MCP_M (3.4k+ rows)
CREATE TABLE IF NOT EXISTS datamart.fact_gt_mcp_m (
    id        BIGSERIAL PRIMARY KEY,
    month     VARCHAR(7) NOT NULL,
    year      SMALLINT NOT NULL,
    month_num CHAR(2) NOT NULL,
    mien      VARCHAR(100) NOT NULL DEFAULT '',
    vung      VARCHAR(100) NOT NULL DEFAULT '',
    gsbh      VARCHAR(120) NOT NULL DEFAULT '',
    npp_code  VARCHAR(50) NOT NULL DEFAULT '',
    mcp_count INT NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_gt_mcp_m ON datamart.fact_gt_mcp_m (month, npp_code);

-- GT_NVBH_M (29.3k+ rows)
CREATE TABLE IF NOT EXISTS datamart.fact_gt_nvbh_m (
    id            BIGSERIAL PRIMARY KEY,
    month         VARCHAR(7) NOT NULL,
    year          SMALLINT NOT NULL,
    month_num     CHAR(2) NOT NULL,
    npp_code      VARCHAR(50) NOT NULL DEFAULT '',
    nvbh_name     VARCHAR(150) NOT NULL DEFAULT '',
    storage       VARCHAR(50) NOT NULL DEFAULT '',
    sellout_val   NUMERIC(18, 2) NOT NULL DEFAULT 0,
    aso_count     INT NOT NULL DEFAULT 0,
    order_count   INT NOT NULL DEFAULT 0,
    order_sku_cnt INT NOT NULL DEFAULT 0,
    aso_sku_cnt   INT NOT NULL DEFAULT 0,
    npp_name      VARCHAR(200) NOT NULL DEFAULT '',
    mien          VARCHAR(100) NOT NULL DEFAULT '',
    vung          VARCHAR(100) NOT NULL DEFAULT '',
    gsbh          VARCHAR(120) NOT NULL DEFAULT '',
    office        VARCHAR(120) NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_gt_nvbh_m ON datamart.fact_gt_nvbh_m (month, npp_code, nvbh_name);

-- GT_NVBH_MCP_M (6.7k+ rows)
CREATE TABLE IF NOT EXISTS datamart.fact_gt_nvbh_mcp_m (
    id        BIGSERIAL PRIMARY KEY,
    month     VARCHAR(7) NOT NULL,
    npp_code  VARCHAR(50) NOT NULL DEFAULT '',
    nvbh_name VARCHAR(150) NOT NULL DEFAULT '',
    mcp_count INT NOT NULL DEFAULT 0,
    npp_name  VARCHAR(200) NOT NULL DEFAULT '',
    mien      VARCHAR(100) NOT NULL DEFAULT '',
    vung      VARCHAR(100) NOT NULL DEFAULT '',
    gsbh      VARCHAR(120) NOT NULL DEFAULT '',
    office    VARCHAR(120) NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_gt_nvbh_mcp_m ON datamart.fact_gt_nvbh_mcp_m (month, npp_code);

-- GT_SALESMAN_ACTIVE (3.5k+ rows)
CREATE TABLE IF NOT EXISTS datamart.fact_gt_salesman_active (
    id                  BIGSERIAL PRIMARY KEY,
    year                SMALLINT NOT NULL,
    month_num           CHAR(2) NOT NULL,
    mien                VARCHAR(100) NOT NULL DEFAULT '',
    vung                VARCHAR(100) NOT NULL DEFAULT '',
    gsbh                VARCHAR(120) NOT NULL DEFAULT '',
    npp_code            VARCHAR(50) NOT NULL DEFAULT '',
    npp_name            VARCHAR(200) NOT NULL DEFAULT '',
    office              VARCHAR(120) NOT NULL DEFAULT '',
    emp_code            VARCHAR(50) NOT NULL DEFAULT '',
    emp_name            VARCHAR(150) NOT NULL DEFAULT '',
    is_active_target    INT NOT NULL DEFAULT 0,
    is_active_in_month  INT NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_gt_sm_active_ym ON datamart.fact_gt_salesman_active (year, month_num, npp_code);

-- GT_L3M (18.2k+ rows)
CREATE TABLE IF NOT EXISTS datamart.fact_gt_l3m (
    id       BIGSERIAL PRIMARY KEY,
    month    VARCHAR(7) NOT NULL,
    mien     VARCHAR(100) NOT NULL DEFAULT '',
    vung     VARCHAR(100) NOT NULL DEFAULT '',
    gsbh     VARCHAR(120) NOT NULL DEFAULT '',
    npp_code VARCHAR(50) NOT NULL DEFAULT '',
    storage  VARCHAR(50) NOT NULL DEFAULT '',
    l3m_aso  INT NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_gt_l3m_m ON datamart.fact_gt_l3m (month, npp_code, storage);

-- GT_SUBCHAN_M (12.6k+ rows)
CREATE TABLE IF NOT EXISTS datamart.fact_gt_subchan_m (
    id        BIGSERIAL PRIMARY KEY,
    month     VARCHAR(7) NOT NULL,
    year      SMALLINT NOT NULL,
    month_num CHAR(2) NOT NULL,
    sub_chan  VARCHAR(100) NOT NULL DEFAULT '',
    npp_code  VARCHAR(50) NOT NULL DEFAULT '',
    total_so  NUMERIC(18, 2) NOT NULL DEFAULT 0,
    cold_so   NUMERIC(18, 2) NOT NULL DEFAULT 0,
    dry_so    NUMERIC(18, 2) NOT NULL DEFAULT 0,
    aso_count INT NOT NULL DEFAULT 0,
    nv_count  INT NOT NULL DEFAULT 0,
    mien      VARCHAR(100) NOT NULL DEFAULT '',
    vung      VARCHAR(100) NOT NULL DEFAULT '',
    gsbh      VARCHAR(120) NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_gt_subchan_m ON datamart.fact_gt_subchan_m (month, sub_chan, npp_code);

-- GT_ROUTE_SUMMARY (1k+ rows)
CREATE TABLE IF NOT EXISTS datamart.fact_gt_route_summary (
    id          BIGSERIAL PRIMARY KEY,
    month       VARCHAR(7) NOT NULL,
    year        SMALLINT NOT NULL,
    month_num   CHAR(2) NOT NULL,
    mien        VARCHAR(100) NOT NULL DEFAULT '',
    vung        VARCHAR(100) NOT NULL DEFAULT '',
    gsbh        VARCHAR(120) NOT NULL DEFAULT '',
    npp_code    VARCHAR(50) NOT NULL DEFAULT '',
    npp_name    VARCHAR(200) NOT NULL DEFAULT '',
    nvbh        VARCHAR(150) NOT NULL DEFAULT '',
    route       VARCHAR(255) NOT NULL DEFAULT '',
    total_mcp   INT NOT NULL DEFAULT 0,
    active_aso  INT NOT NULL DEFAULT 0,
    sellout_val NUMERIC(18, 2) NOT NULL DEFAULT 0,
    office      VARCHAR(120) NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_gt_route_sum_m ON datamart.fact_gt_route_summary (month, npp_code);

-- GT_CUST_ROUTES (169k+ rows, unpacked 18-col tuple)
CREATE TABLE IF NOT EXISTS datamart.fact_gt_cust_routes (
    id        BIGSERIAL PRIMARY KEY,
    month     VARCHAR(7) NOT NULL,
    c_code    VARCHAR(80) NOT NULL,
    c_name    VARCHAR(255) NOT NULL DEFAULT '',
    addr      TEXT NOT NULL DEFAULT '',
    route     VARCHAR(255) NOT NULL DEFAULT '',
    nvbh      VARCHAR(150) NOT NULL DEFAULT '',
    npp_name  VARCHAR(200) NOT NULL DEFAULT '',
    npp_code  VARCHAR(50) NOT NULL DEFAULT '',
    gsbh      VARCHAR(120) NOT NULL DEFAULT '',
    vung      VARCHAR(100) NOT NULL DEFAULT '',
    mien      VARCHAR(100) NOT NULL DEFAULT '',
    is_active SMALLINT NOT NULL DEFAULT 0,
    sellout   NUMERIC(18, 2) NOT NULL DEFAULT 0,
    freq      VARCHAR(30) NOT NULL DEFAULT '',
    week_type VARCHAR(30) NOT NULL DEFAULT '',
    days_str  VARCHAR(60) NOT NULL DEFAULT '',
    emp_code  VARCHAR(50) NOT NULL DEFAULT '',
    is_target SMALLINT NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_gt_cust_routes_m ON datamart.fact_gt_cust_routes (month, npp_code, c_code);

-- GT_CUST_PROD_SALES (588k+ rows, unpacked 8-col tuple)
CREATE TABLE IF NOT EXISTS datamart.fact_gt_cust_prod_sales (
    id        BIGSERIAL PRIMARY KEY,
    month_num CHAR(2) NOT NULL,
    c_code    VARCHAR(80) NOT NULL,
    storage   VARCHAR(50) NOT NULL DEFAULT '',
    cate      VARCHAR(120) NOT NULL DEFAULT '',
    ph1       VARCHAR(150) NOT NULL DEFAULT '',
    ph2       VARCHAR(150) NOT NULL DEFAULT '',
    sku_name  TEXT NOT NULL DEFAULT '',
    sales     NUMERIC(18, 2) NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_gt_cust_prod_mc ON datamart.fact_gt_cust_prod_sales (month_num, c_code);
CREATE INDEX IF NOT EXISTS idx_gt_cust_prod_mp ON datamart.fact_gt_cust_prod_sales (month_num, storage, cate);

-- GT_VISIT_MTD (7.6k+ rows, unpacked 14-col tuple)
CREATE TABLE IF NOT EXISTS datamart.fact_gt_visit_mtd (
    id        BIGSERIAL PRIMARY KEY,
    month     VARCHAR(7) NOT NULL,
    npp_code  VARCHAR(50) NOT NULL DEFAULT '',
    nvbh      VARCHAR(150) NOT NULL DEFAULT '',
    days      INT NOT NULL DEFAULT 0,
    call_plan INT NOT NULL DEFAULT 0,
    visit     INT NOT NULL DEFAULT 0,
    visit_out INT NOT NULL DEFAULT 0,
    work_mins INT NOT NULL DEFAULT 0,
    orders    INT NOT NULL DEFAULT 0,
    sales     NUMERIC(18, 2) NOT NULL DEFAULT 0,
    mien      VARCHAR(100) NOT NULL DEFAULT '',
    vung      VARCHAR(100) NOT NULL DEFAULT '',
    gsbh      VARCHAR(120) NOT NULL DEFAULT '',
    npp_name  VARCHAR(200) NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_gt_visit_mtd_m ON datamart.fact_gt_visit_mtd (month, npp_code);

-- GT_VISIT_DAILY (27.4k+ rows, unpacked 16-col tuple)
CREATE TABLE IF NOT EXISTS datamart.fact_gt_visit_daily (
    id        BIGSERIAL PRIMARY KEY,
    month     VARCHAR(7) NOT NULL,
    day_num   SMALLINT NOT NULL,
    npp_code  VARCHAR(50) NOT NULL DEFAULT '',
    nvbh      VARCHAR(150) NOT NULL DEFAULT '',
    call_plan INT NOT NULL DEFAULT 0,
    visit     INT NOT NULL DEFAULT 0,
    visit_out INT NOT NULL DEFAULT 0,
    work_mins INT NOT NULL DEFAULT 0,
    orders    INT NOT NULL DEFAULT 0,
    sales     NUMERIC(18, 2) NOT NULL DEFAULT 0,
    mien      VARCHAR(100) NOT NULL DEFAULT '',
    vung      VARCHAR(100) NOT NULL DEFAULT '',
    gsbh      VARCHAR(120) NOT NULL DEFAULT '',
    npp_name  VARCHAR(200) NOT NULL DEFAULT '',
    emp_code  VARCHAR(50) NOT NULL DEFAULT '',
    is_target SMALLINT NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_gt_visit_daily_m ON datamart.fact_gt_visit_daily (month, day_num, npp_code);

-- GT_FREEZER_DATA (3k+ rows)
CREATE TABLE IF NOT EXISTS datamart.fact_gt_freezer (
    id           BIGSERIAL PRIMARY KEY,
    mien         VARCHAR(100) NOT NULL DEFAULT '',
    vung         VARCHAR(100) NOT NULL DEFAULT '',
    gsbh         VARCHAR(120) NOT NULL DEFAULT '',
    gsbh_code    VARCHAR(50) NOT NULL DEFAULT '',
    npp_code     VARCHAR(50) NOT NULL DEFAULT '',
    npp_name     VARCHAR(200) NOT NULL DEFAULT '',
    emp_code     VARCHAR(50) NOT NULL DEFAULT '',
    emp_name     VARCHAR(150) NOT NULL DEFAULT '',
    c_code       VARCHAR(80) NOT NULL DEFAULT '',
    c_name       VARCHAR(255) NOT NULL DEFAULT '',
    addr         TEXT NOT NULL DEFAULT '',
    lng          VARCHAR(40) NOT NULL DEFAULT '',
    lat          VARCHAR(40) NOT NULL DEFAULT '',
    dev_code     VARCHAR(80) NOT NULL DEFAULT '',
    dev_name     VARCHAR(255) NOT NULL DEFAULT '',
    dev_type     VARCHAR(100) NOT NULL DEFAULT '',
    capacity     VARCHAR(50) NOT NULL DEFAULT '',
    cap_group    VARCHAR(50) NOT NULL DEFAULT '',
    model_year   INT,
    qr           VARCHAR(100) NOT NULL DEFAULT '',
    serial       VARCHAR(100) NOT NULL DEFAULT '',
    channel      VARCHAR(50) NOT NULL DEFAULT '',
    channel_name VARCHAR(150) NOT NULL DEFAULT '',
    month        VARCHAR(7) NOT NULL DEFAULT '',
    year         SMALLINT,
    month_num    SMALLINT,
    office       VARCHAR(120) NOT NULL DEFAULT '',
    sales_json   JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_gt_freezer_m ON datamart.fact_gt_freezer (month, npp_code, c_code);

-- GT_STANDEE_DATA (4.3k+ rows)
CREATE TABLE IF NOT EXISTS datamart.fact_gt_standee (
    id           BIGSERIAL PRIMARY KEY,
    mien         VARCHAR(100) NOT NULL DEFAULT '',
    vung         VARCHAR(100) NOT NULL DEFAULT '',
    gsbh         VARCHAR(120) NOT NULL DEFAULT '',
    gsbh_code    VARCHAR(50) NOT NULL DEFAULT '',
    npp_code     VARCHAR(50) NOT NULL DEFAULT '',
    npp_name     VARCHAR(200) NOT NULL DEFAULT '',
    emp_code     VARCHAR(50) NOT NULL DEFAULT '',
    emp_name     VARCHAR(150) NOT NULL DEFAULT '',
    c_code       VARCHAR(80) NOT NULL DEFAULT '',
    c_name       VARCHAR(255) NOT NULL DEFAULT '',
    addr         TEXT NOT NULL DEFAULT '',
    lng          VARCHAR(40) NOT NULL DEFAULT '',
    lat          VARCHAR(40) NOT NULL DEFAULT '',
    dev_code     VARCHAR(80) NOT NULL DEFAULT '',
    dev_name     VARCHAR(255) NOT NULL DEFAULT '',
    dev_type     VARCHAR(100) NOT NULL DEFAULT '',
    model_year   INT,
    qr           VARCHAR(100) NOT NULL DEFAULT '',
    serial       VARCHAR(100) NOT NULL DEFAULT '',
    qty          INT NOT NULL DEFAULT 1,
    channel      VARCHAR(50) NOT NULL DEFAULT '',
    channel_name VARCHAR(150) NOT NULL DEFAULT '',
    month        VARCHAR(7) NOT NULL DEFAULT '',
    year         SMALLINT,
    month_num    SMALLINT,
    office       VARCHAR(120) NOT NULL DEFAULT '',
    sales_json   JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_gt_standee_m ON datamart.fact_gt_standee (month, npp_code, c_code);

-- =============================================================================
-- 4. SUB-APP DATASETS (ROUTE MAP & CTKM TRACKER — MIGRATED FROM STATIC FILES)
-- =============================================================================

-- DMS_CJ_DATA (57.6k+ rows)
CREATE TABLE IF NOT EXISTS datamart.fact_dms_cj_outlets (
    id           BIGSERIAL PRIMARY KEY,
    row_seq      INT NOT NULL DEFAULT 0,
    outlet_code  VARCHAR(50) NOT NULL DEFAULT '',
    outlet_name  VARCHAR(150) NOT NULL DEFAULT '',
    lat          DOUBLE PRECISION NOT NULL DEFAULT 0,
    lon          DOUBLE PRECISION NOT NULL DEFAULT 0,
    salesman     VARCHAR(100) NOT NULL DEFAULT '',
    distributor  VARCHAR(150) NOT NULL DEFAULT '',
    route_code   VARCHAR(40) NOT NULL DEFAULT '',
    route_name   VARCHAR(100) NOT NULL DEFAULT '',
    vung         VARCHAR(80) NOT NULL DEFAULT '',
    gsbh         VARCHAR(100) NOT NULL DEFAULT '',
    freq         VARCHAR(20) NOT NULL DEFAULT '',
    week         VARCHAR(20) NOT NULL DEFAULT '',
    t2           SMALLINT NOT NULL DEFAULT 0,
    t3           SMALLINT NOT NULL DEFAULT 0,
    t4           SMALLINT NOT NULL DEFAULT 0,
    t5           SMALLINT NOT NULL DEFAULT 0,
    t6           SMALLINT NOT NULL DEFAULT 0,
    t7           SMALLINT NOT NULL DEFAULT 0,
    cn           SMALLINT NOT NULL DEFAULT 0,
    addr         TEXT NOT NULL DEFAULT '',
    phone        VARCHAR(60) NOT NULL DEFAULT '',
    province     VARCHAR(100) NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_dms_cj_vung_gsbh ON datamart.fact_dms_cj_outlets (vung, gsbh);

-- DMS_POT_DATA (61.7k+ rows)
CREATE TABLE IF NOT EXISTS datamart.fact_dms_pot_outlets (
    id           BIGSERIAL PRIMARY KEY,
    row_seq      INT NOT NULL DEFAULT 0,
    outlet_code  VARCHAR(50) NOT NULL DEFAULT '',
    outlet_name  VARCHAR(150) NOT NULL DEFAULT '',
    lat          DOUBLE PRECISION NOT NULL DEFAULT 0,
    lon          DOUBLE PRECISION NOT NULL DEFAULT 0,
    salesman     VARCHAR(100) NOT NULL DEFAULT '',
    distributor  VARCHAR(150) NOT NULL DEFAULT '',
    province     VARCHAR(100) NOT NULL DEFAULT '',
    addr         TEXT NOT NULL DEFAULT '',
    score        BIGINT NOT NULL DEFAULT 0,
    vung         VARCHAR(80) NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_dms_pot_vung ON datamart.fact_dms_pot_outlets (vung);

-- CTKM Metadata (1 singleton row — excludes legacy client-side users map)
CREATE TABLE IF NOT EXISTS datamart.app_ctkm_metadata (
    id            SMALLINT PRIMARY KEY DEFAULT 1,
    metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- CTKM Tien Data (311+ rows)
CREATE TABLE IF NOT EXISTS datamart.fact_ctkm_tien (
    id            BIGSERIAL PRIMARY KEY,
    nam           SMALLINT NOT NULL,
    thang         SMALLINT NOT NULL,
    khu_vuc       VARCHAR(100) NOT NULL DEFAULT '',
    mien          VARCHAR(100) NOT NULL DEFAULT '',
    vung          VARCHAR(100) NOT NULL DEFAULT '',
    office        VARCHAR(120) NOT NULL DEFAULT '',
    area          VARCHAR(120) NOT NULL DEFAULT '',
    group_ct      VARCHAR(120) NOT NULL DEFAULT '',
    ten_ct        TEXT NOT NULL DEFAULT '',
    code_npp      VARCHAR(50) NOT NULL DEFAULT '',
    ten_npp       VARCHAR(255) NOT NULL DEFAULT '',
    full_name_npp VARCHAR(255) NOT NULL DEFAULT '',
    code_gsbh     VARCHAR(50) NOT NULL DEFAULT '',
    ten_gsbh      VARCHAR(120) NOT NULL DEFAULT '',
    amount        NUMERIC(18, 2) NOT NULL DEFAULT 0,
    reason        TEXT NOT NULL DEFAULT '',
    reason_detail TEXT NOT NULL DEFAULT '',
    missing_docs  JSONB NOT NULL DEFAULT '[]'::jsonb,
    aging         VARCHAR(100) NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_ctkm_tien_rls ON datamart.fact_ctkm_tien (nam, thang, mien, vung, code_npp, ten_gsbh);

-- CTKM Hang Data (3.5k+ rows)
CREATE TABLE IF NOT EXISTS datamart.fact_ctkm_hang (
    id            BIGSERIAL PRIMARY KEY,
    nam           SMALLINT NOT NULL,
    thang         SMALLINT NOT NULL,
    khu_vuc       VARCHAR(100) NOT NULL DEFAULT '',
    mien          VARCHAR(100) NOT NULL DEFAULT '',
    vung          VARCHAR(100) NOT NULL DEFAULT '',
    office        VARCHAR(120) NOT NULL DEFAULT '',
    area          VARCHAR(120) NOT NULL DEFAULT '',
    group_ct      VARCHAR(120) NOT NULL DEFAULT '',
    ten_ct        TEXT NOT NULL DEFAULT '',
    code_npp      VARCHAR(50) NOT NULL DEFAULT '',
    ten_npp       VARCHAR(255) NOT NULL DEFAULT '',
    full_name_npp VARCHAR(255) NOT NULL DEFAULT '',
    code_gsbh     VARCHAR(50) NOT NULL DEFAULT '',
    ten_gsbh      VARCHAR(120) NOT NULL DEFAULT '',
    ea            NUMERIC(18, 2) NOT NULL DEFAULT 0,
    gia_npp       NUMERIC(18, 2) NOT NULL DEFAULT 0,
    amount        NUMERIC(18, 2) NOT NULL DEFAULT 0,
    ma_sp         VARCHAR(80) NOT NULL DEFAULT '',
    ten_sp        TEXT NOT NULL DEFAULT '',
    storage       VARCHAR(80) NOT NULL DEFAULT '',
    cate          VARCHAR(120) NOT NULL DEFAULT '',
    reason        TEXT NOT NULL DEFAULT '',
    reason_detail TEXT NOT NULL DEFAULT '',
    missing_docs  JSONB NOT NULL DEFAULT '[]'::jsonb,
    aging         VARCHAR(100) NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_ctkm_hang_rls ON datamart.fact_ctkm_hang (nam, thang, mien, vung, code_npp, ten_gsbh);

