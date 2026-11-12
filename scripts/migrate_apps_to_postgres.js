#!/usr/bin/env node
/**
 * One-time idempotent ETL script to migrate Route Map (dms_data.js) and
 * CTKM Tracker (COMPRESSED_DATA in apps/ctkm/index.html) into PostgreSQL schema "datamart".
 *
 * Usage: node scripts/migrate_apps_to_postgres.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const zlib = require('zlib');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');

function loadEnv() {
  const env = { POSTGRES_USER: 'cj_sec_admin', POSTGRES_DB: 'cj_enterprise_db' };
  const envPath = path.join(ROOT, '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (m) {
        env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
      }
    }
  }
  return env;
}

function csvCell(v) {
  if (v === null || v === undefined) return '""';
  const s = String(v).replace(/"/g, '""');
  return `"${s}"`;
}

function csvRow(fields) {
  return fields.map(csvCell).join(',') + '\n';
}

function loadRouteMapData() {
  const jsPath = path.join(ROOT, 'web_app', 'apps', 'routemap', 'dms_data.js');
  if (!fs.existsSync(jsPath)) {
    throw new Error(`Missing Route Map source file: ${jsPath}`);
  }
  const code = fs.readFileSync(jsPath, 'utf8');
  const ctx = { window: {} };
  vm.runInNewContext(code, ctx);
  const raw = ctx.DMS_RAW_DATA || ctx.window.DMS_RAW_DATA;
  if (!raw || !Array.isArray(raw.cj) || !Array.isArray(raw.pot)) {
    throw new Error('Invalid DMS_RAW_DATA structure in dms_data.js');
  }
  return raw;
}

function loadCtkmData() {
  const htmlPath = path.join(ROOT, 'web_app', 'apps', 'ctkm', 'index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const match = html.match(/const COMPRESSED_DATA\s*=\s*"([^"]+)"/);
  if (!match) {
    throw new Error('COMPRESSED_DATA not found in web_app/apps/ctkm/index.html');
  }
  const parsed = JSON.parse(zlib.gunzipSync(Buffer.from(match[1], 'base64')).toString('utf8'));
  if (!parsed || !Array.isArray(parsed.tien_data) || !Array.isArray(parsed.hang_data)) {
    throw new Error('Invalid CTKM payload structure');
  }
  // Deliberately omit parsed.users — identity belongs strictly in iam.users
  return {
    metadata: parsed.metadata || {},
    tien_data: parsed.tien_data,
    hang_data: parsed.hang_data,
  };
}

function main() {
  const env = loadEnv();
  const dbUser = env.POSTGRES_USER;
  const dbName = env.POSTGRES_DB;

  console.log('[1/4] Reading static source data (Route Map + CTKM)...');
  const dms = loadRouteMapData();
  const ctkm = loadCtkmData();
  console.log(
    `      DMS cj=${dms.cj.length}, pot=${dms.pot.length}; CTKM tien=${ctkm.tien_data.length}, hang=${ctkm.hang_data.length}`,
  );

  console.log('[2/4] Building PostgreSQL DDL + COPY transaction...');
  const chunks = [];

  chunks.push(`
BEGIN;

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

CREATE TABLE IF NOT EXISTS datamart.app_ctkm_metadata (
    id            SMALLINT PRIMARY KEY DEFAULT 1,
    metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

TRUNCATE TABLE
    datamart.fact_dms_cj_outlets,
    datamart.fact_dms_pot_outlets,
    datamart.fact_ctkm_tien,
    datamart.fact_ctkm_hang
RESTART IDENTITY;

COPY datamart.fact_dms_cj_outlets (
    row_seq, outlet_code, outlet_name, lat, lon, salesman, distributor,
    route_code, route_name, vung, gsbh, freq, week,
    t2, t3, t4, t5, t6, t7, cn, addr, phone, province
) FROM STDIN WITH (FORMAT csv);
`);

  for (const r of dms.cj) {
    chunks.push(
      csvRow([
        Number(r[0] || 1),
        r[1] || '',
        r[2] || '',
        Number(r[3] || 0),
        Number(r[4] || 0),
        r[5] || '',
        r[6] || '',
        r[7] || '',
        r[8] || '',
        r[9] || '',
        r[10] || '',
        r[11] || '',
        r[12] || '',
        Number(r[13] || 0),
        Number(r[14] || 0),
        Number(r[15] || 0),
        Number(r[16] || 0),
        Number(r[17] || 0),
        Number(r[18] || 0),
        Number(r[19] || 0),
        r[20] || '',
        r[21] || '',
        r[22] || '',
      ]),
    );
  }
  chunks.push('\\\.\n');

  chunks.push(`
COPY datamart.fact_dms_pot_outlets (
    row_seq, outlet_code, outlet_name, lat, lon, salesman, distributor,
    province, addr, score, vung
) FROM STDIN WITH (FORMAT csv);
`);
  for (const r of dms.pot) {
    chunks.push(
      csvRow([
        Number(r[0] || 2),
        r[1] || '',
        r[2] || '',
        Number(r[3] || 0),
        Number(r[4] || 0),
        r[5] || '',
        r[6] || '',
        r[7] || '',
        r[8] || '',
        Math.round(Number(r[9] || 0)),
        r[10] || '',
      ]),
    );
  }
  chunks.push('\\\.\n');

  chunks.push(`
COPY datamart.fact_ctkm_tien (
    nam, thang, khu_vuc, mien, vung, office, area, group_ct, ten_ct,
    code_npp, ten_npp, full_name_npp, code_gsbh, ten_gsbh, amount,
    reason, reason_detail, missing_docs, aging
) FROM STDIN WITH (FORMAT csv);
`);
  let tienSum = 0;
  for (const r of ctkm.tien_data) {
    const amt = Number(r.amount || 0);
    tienSum += amt;
    chunks.push(
      csvRow([
        Number(r.nam || 2026),
        Number(r.thang || 1),
        r.khu_vuc || '',
        r.mien || '',
        r.vung || '',
        r.office || '',
        r.area || '',
        r.group_ct || '',
        r.ten_ct || '',
        r.code_npp || '',
        r.ten_npp || '',
        r.full_name_npp || '',
        r.code_gsbh || '',
        r.ten_gsbh || '',
        amt,
        r.reason || '',
        r.reason_detail || '',
        JSON.stringify(Array.isArray(r.missing_docs) ? r.missing_docs : []),
        r.aging || '',
      ]),
    );
  }
  chunks.push('\\\.\n');

  chunks.push(`
COPY datamart.fact_ctkm_hang (
    nam, thang, khu_vuc, mien, vung, office, area, group_ct, ten_ct,
    code_npp, ten_npp, full_name_npp, code_gsbh, ten_gsbh, ea, gia_npp, amount,
    ma_sp, ten_sp, storage, cate, reason, reason_detail, missing_docs, aging
) FROM STDIN WITH (FORMAT csv);
`);
  let hangSum = 0;
  for (const r of ctkm.hang_data) {
    const amt = Number(r.amount || 0);
    hangSum += amt;
    chunks.push(
      csvRow([
        Number(r.nam || 2026),
        Number(r.thang || 1),
        r.khu_vuc || '',
        r.mien || '',
        r.vung || '',
        r.office || '',
        r.area || '',
        r.group_ct || '',
        r.ten_ct || '',
        r.code_npp || '',
        r.ten_npp || '',
        r.full_name_npp || '',
        r.code_gsbh || '',
        r.ten_gsbh || '',
        Number(r.ea || 0),
        Number(r.gia_npp || 0),
        amt,
        r.ma_sp || '',
        r.ten_sp || '',
        r.storage || '',
        r.cate || '',
        r.reason || '',
        r.reason_detail || '',
        JSON.stringify(Array.isArray(r.missing_docs) ? r.missing_docs : []),
        r.aging || '',
      ]),
    );
  }
  chunks.push('\\\.\n');

  const metaJsonLiteral = JSON.stringify(ctkm.metadata).replace(/'/g, "''");
  chunks.push(`
INSERT INTO datamart.app_ctkm_metadata (id, metadata_json, updated_at)
VALUES (1, '${metaJsonLiteral}'::jsonb, NOW())
ON CONFLICT (id) DO UPDATE SET
    metadata_json = EXCLUDED.metadata_json,
    updated_at = NOW();

INSERT INTO datamart.etl_dataset_stats (dataset_name, table_name, row_count, min_month, max_month, metric_sum, loaded_at)
VALUES
    ('DMS_CJ_DATA', 'datamart.fact_dms_cj_outlets', ${dms.cj.length}, NULL, NULL, 0, NOW()),
    ('DMS_POT_DATA', 'datamart.fact_dms_pot_outlets', ${dms.pot.length}, NULL, NULL, 0, NOW()),
    ('CTKM_TIEN_DATA', 'datamart.fact_ctkm_tien', ${ctkm.tien_data.length}, '2026-01', '2026-10', ${tienSum.toFixed(2)}, NOW()),
    ('CTKM_HANG_DATA', 'datamart.fact_ctkm_hang', ${ctkm.hang_data.length}, '2026-01', '2026-10', ${hangSum.toFixed(2)}, NOW())
ON CONFLICT (dataset_name) DO UPDATE SET
    table_name = EXCLUDED.table_name,
    row_count = EXCLUDED.row_count,
    min_month = EXCLUDED.min_month,
    max_month = EXCLUDED.max_month,
    metric_sum = EXCLUDED.metric_sum,
    loaded_at = NOW();

INSERT INTO datamart.etl_metadata (meta_key, meta_value, updated_at)
SELECT 'total_datasets', COUNT(*)::text, NOW() FROM datamart.etl_dataset_stats
ON CONFLICT (meta_key) DO UPDATE SET meta_value = EXCLUDED.meta_value, updated_at = NOW();

INSERT INTO datamart.etl_metadata (meta_key, meta_value, updated_at)
SELECT 'total_rows', COALESCE(SUM(row_count), 0)::text, NOW() FROM datamart.etl_dataset_stats
ON CONFLICT (meta_key) DO UPDATE SET meta_value = EXCLUDED.meta_value, updated_at = NOW();

COMMIT;
`);

  console.log('[3/4] Executing psql COPY import into standard_postgres...');
  const sqlPayload = chunks.join('');
  const res = spawnSync(
    'docker',
    ['exec', '-i', 'standard_postgres', 'psql', '-v', 'ON_ERROR_STOP=1', '-U', dbUser, '-d', dbName],
    {
      input: sqlPayload,
      encoding: 'utf8',
      maxBuffer: 256 * 1024 * 1024,
    },
  );

  if (res.status !== 0) {
    console.error('[ERROR] psql migration failed:\n', res.stderr || res.stdout);
    process.exit(res.status || 1);
  }
  console.log(res.stdout);

  console.log('[4/4] Verifying row counts in PostgreSQL...');
  const verify = spawnSync(
    'docker',
    [
      'exec',
      'standard_postgres',
      'psql',
      '-U',
      dbUser,
      '-d',
      dbName,
      '-c',
      "SELECT dataset_name, row_count FROM datamart.etl_dataset_stats WHERE dataset_name IN ('DMS_CJ_DATA','DMS_POT_DATA','CTKM_TIEN_DATA','CTKM_HANG_DATA') ORDER BY dataset_name; SELECT meta_key, meta_value FROM datamart.etl_metadata WHERE meta_key IN ('total_datasets','total_rows') ORDER BY meta_key;",
    ],
    { encoding: 'utf8' },
  );
  console.log(verify.stdout);
  if (verify.status !== 0) {
    console.error(verify.stderr);
    process.exit(verify.status || 1);
  }
  console.log('[OK] Route Map + CTKM PostgreSQL migration complete.');
}

main();
