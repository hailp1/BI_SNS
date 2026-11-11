-- Enterprise upgrades migration (idempotent, matches database/init/05_enterprise_upgrades.sql)
CREATE OR REPLACE FUNCTION iam.trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CLOCK_TIMESTAMP();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON iam.users;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON iam.users
  FOR EACH ROW
  EXECUTE FUNCTION iam.trigger_set_updated_at();

ALTER TABLE iam.roles
  ADD COLUMN IF NOT EXISTS parent_role_id INT REFERENCES iam.roles(id) ON DELETE SET NULL;

CREATE OR REPLACE VIEW iam.effective_permissions AS
WITH RECURSIVE role_tree AS (
  SELECT id, name, parent_role_id
  FROM iam.roles
  UNION ALL
  SELECT r.id, r.name, r.parent_role_id
  FROM iam.roles r
  INNER JOIN role_tree rt ON r.id = rt.parent_role_id
)
SELECT DISTINCT rt.id AS role_id, rt.name AS role_name, p.code AS permission_code
FROM role_tree rt
JOIN iam.role_permissions rp ON rp.role_id = rt.id
JOIN iam.permissions p ON p.id = rp.permission_id;

ALTER TABLE datamart.dim_geo_hierarchy
  ADD COLUMN IF NOT EXISTS effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS effective_to DATE NOT NULL DEFAULT '9999-12-31',
  ADD COLUMN IF NOT EXISTS is_current BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_users_is_active
  ON iam.users (is_active) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_users_email
  ON iam.users (email) WHERE email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_trusted_networks_active
  ON iam.trusted_networks (is_active) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_stock_doi_npp
  ON datamart.fact_stock_doi (npp_code);

CREATE INDEX IF NOT EXISTS idx_perf_year_month_chan
  ON datamart.fact_monthly_performance (year, month, channel);
