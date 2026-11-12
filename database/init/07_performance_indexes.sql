-- ============================================================================
-- CJ ENTERPRISE SNS - PERFORMANCE & RLS EXPRESSION INDEXES (PHASE 2)
-- Enables PostgreSQL B-tree index scans for case/whitespace-insensitive
-- Row-Level Security (LOWER(TRIM(col))) and channel/geo filters.
-- Safe & idempotent (IF NOT EXISTS).
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_dim_geo_dist_mien_norm ON datamart.dim_geo_distributors (LOWER(TRIM(mien)));
CREATE INDEX IF NOT EXISTS idx_dim_geo_dist_vung_norm ON datamart.dim_geo_distributors (LOWER(TRIM(vung)));
CREATE INDEX IF NOT EXISTS idx_dim_geo_dist_gsbh_norm ON datamart.dim_geo_distributors (LOWER(TRIM(gsbh)));
CREATE INDEX IF NOT EXISTS idx_dim_geo_dist_npp_norm ON datamart.dim_geo_distributors (LOWER(TRIM(npp_code)));

CREATE INDEX IF NOT EXISTS idx_sellin_m_chan_upper ON datamart.fact_sellin_monthly (UPPER(channel), year, month_num);
CREATE INDEX IF NOT EXISTS idx_sellin_m_mien_norm ON datamart.fact_sellin_monthly (LOWER(TRIM(mien)));
CREATE INDEX IF NOT EXISTS idx_sellin_m_cluster_norm ON datamart.fact_sellin_monthly (LOWER(TRIM(cluster)));
CREATE INDEX IF NOT EXISTS idx_sellin_m_gsbh_norm ON datamart.fact_sellin_monthly (LOWER(TRIM(gsbh)));
CREATE INDEX IF NOT EXISTS idx_sellin_m_office_norm ON datamart.fact_sellin_monthly (LOWER(TRIM(office)));
CREATE INDEX IF NOT EXISTS idx_sellin_m_acc_code_norm ON datamart.fact_sellin_monthly (LOWER(TRIM(account_code)));

CREATE INDEX IF NOT EXISTS idx_gt_tree_mien_norm ON datamart.fact_gt_tree (LOWER(TRIM(mien)));
CREATE INDEX IF NOT EXISTS idx_gt_tree_vung_norm ON datamart.fact_gt_tree (LOWER(TRIM(vung)));
CREATE INDEX IF NOT EXISTS idx_gt_tree_gsbh_norm ON datamart.fact_gt_tree (LOWER(TRIM(gsbh_name)));
CREATE INDEX IF NOT EXISTS idx_gt_tree_office_norm ON datamart.fact_gt_tree (LOWER(TRIM(office)));
CREATE INDEX IF NOT EXISTS idx_gt_tree_npp_norm ON datamart.fact_gt_tree (LOWER(TRIM(npp_code)));

CREATE INDEX IF NOT EXISTS idx_gt_cust_routes_mien_norm ON datamart.fact_gt_cust_routes (LOWER(TRIM(mien)));
CREATE INDEX IF NOT EXISTS idx_gt_cust_routes_vung_norm ON datamart.fact_gt_cust_routes (LOWER(TRIM(vung)));
CREATE INDEX IF NOT EXISTS idx_gt_cust_routes_gsbh_norm ON datamart.fact_gt_cust_routes (LOWER(TRIM(gsbh)));
CREATE INDEX IF NOT EXISTS idx_gt_cust_routes_npp_norm ON datamart.fact_gt_cust_routes (LOWER(TRIM(npp_code)));

CREATE INDEX IF NOT EXISTS idx_gt_stock_npp_norm ON datamart.fact_gt_stock (LOWER(TRIM(npp_code)));
CREATE INDEX IF NOT EXISTS idx_gt_nvbh_m_npp_norm ON datamart.fact_gt_nvbh_m (LOWER(TRIM(npp_code)));
CREATE INDEX IF NOT EXISTS idx_mt_tree_cluster_norm ON datamart.fact_mt_tree (LOWER(TRIM(cluster)));

CREATE INDEX IF NOT EXISTS idx_dms_cj_vung_norm ON datamart.fact_dms_cj_outlets (LOWER(TRIM(vung)));
CREATE INDEX IF NOT EXISTS idx_dms_cj_gsbh_norm ON datamart.fact_dms_cj_outlets (LOWER(TRIM(gsbh)));
CREATE INDEX IF NOT EXISTS idx_dms_pot_vung_norm ON datamart.fact_dms_pot_outlets (LOWER(TRIM(vung)));

CREATE INDEX IF NOT EXISTS idx_ctkm_tien_mien_norm ON datamart.fact_ctkm_tien (LOWER(TRIM(mien)));
CREATE INDEX IF NOT EXISTS idx_ctkm_tien_vung_norm ON datamart.fact_ctkm_tien (LOWER(TRIM(vung)));
CREATE INDEX IF NOT EXISTS idx_ctkm_hang_mien_norm ON datamart.fact_ctkm_hang (LOWER(TRIM(mien)));
CREATE INDEX IF NOT EXISTS idx_ctkm_hang_vung_norm ON datamart.fact_ctkm_hang (LOWER(TRIM(vung)));

ANALYZE;

