-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "datamart";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "iam";

-- CreateTable
CREATE TABLE "iam"."roles" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam"."permissions" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(100) NOT NULL,
    "module" VARCHAR(50) NOT NULL,
    "description" TEXT,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam"."role_permissions" (
    "role_id" INTEGER NOT NULL,
    "permission_id" INTEGER NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "iam"."users" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "username" VARCHAR(50) NOT NULL,
    "email" VARCHAR(100),
    "password_hash" VARCHAR(255) NOT NULL,
    "full_name" VARCHAR(150) NOT NULL,
    "channel" VARCHAR(50) NOT NULL DEFAULT 'all',
    "role" VARCHAR(50) NOT NULL,
    "scope_level" VARCHAR(50) NOT NULL DEFAULT 'all',
    "scope_value" VARCHAR(150) NOT NULL DEFAULT 'Toàn Quốc',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "failed_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMPTZ,
    "two_factor_secret" VARCHAR(100),
    "two_factor_enabled" BOOLEAN NOT NULL DEFAULT false,
    "last_login_at" TIMESTAMPTZ,
    "last_login_ip" VARCHAR(45),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam"."audit_logs" (
    "id" BIGSERIAL NOT NULL,
    "user_id" UUID,
    "username" VARCHAR(50) NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "module" VARCHAR(50) NOT NULL,
    "ip_address" VARCHAR(45) NOT NULL,
    "user_agent" TEXT,
    "endpoint" VARCHAR(255),
    "method" VARCHAR(10),
    "status" VARCHAR(20) NOT NULL DEFAULT 'SUCCESS',
    "details" JSONB,
    "execution_time_ms" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam"."trusted_networks" (
    "id" SERIAL NOT NULL,
    "network_name" VARCHAR(100) NOT NULL,
    "cidr_or_ip" VARCHAR(50) NOT NULL,
    "description" VARCHAR(255),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trusted_networks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "datamart"."fact_monthly_performance" (
    "id" SERIAL NOT NULL,
    "year" INTEGER NOT NULL,
    "month" VARCHAR(7) NOT NULL,
    "channel" VARCHAR(50) NOT NULL,
    "sub_channel" VARCHAR(100) NOT NULL DEFAULT 'ALL',
    "sellin_revenue" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "target_sellin" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "gap_sellin" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "achievement_rate" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "ly_sellin" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "yoy_growth_amt" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "yoy_growth_rate" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "mom_mtd_rate" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "ytd_revenue" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "channel_share" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fact_monthly_performance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "datamart"."fact_daily_sales" (
    "id" SERIAL NOT NULL,
    "sale_date" DATE NOT NULL,
    "year" INTEGER NOT NULL,
    "month" VARCHAR(7) NOT NULL,
    "channel" VARCHAR(50) NOT NULL,
    "sellin_amt" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "target_amt" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "cumulative_sellin" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "cumulative_target" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fact_daily_sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "datamart"."fact_stock_doi" (
    "id" SERIAL NOT NULL,
    "report_month" VARCHAR(7) NOT NULL,
    "channel" VARCHAR(50) NOT NULL DEFAULT 'GT',
    "region" VARCHAR(50) NOT NULL,
    "area" VARCHAR(50) NOT NULL,
    "npp_code" VARCHAR(50) NOT NULL,
    "npp_name" VARCHAR(150) NOT NULL,
    "stock_amt" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "l3m_avg_monthly" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "doi_days" DECIMAL(6,1) NOT NULL DEFAULT 0,
    "doi_status" VARCHAR(50) NOT NULL DEFAULT 'Normal',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fact_stock_doi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "datamart"."dim_geo_hierarchy" (
    "id" SERIAL NOT NULL,
    "region_code" VARCHAR(20) NOT NULL,
    "region_name" VARCHAR(50) NOT NULL,
    "vung_code" VARCHAR(50) NOT NULL,
    "area_code" VARCHAR(50) NOT NULL,
    "office_name" VARCHAR(100),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dim_geo_hierarchy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "datamart"."dim_product_hierarchy" (
    "sku_code" VARCHAR(50) NOT NULL,
    "sku_name" VARCHAR(200) NOT NULL,
    "storage_type" VARCHAR(50) NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "ph1" VARCHAR(100),
    "ph2" VARCHAR(100),
    "unit" VARCHAR(20) NOT NULL DEFAULT 'EA',
    "price_layer1" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dim_product_hierarchy_pkey" PRIMARY KEY ("sku_code")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "iam"."roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_code_key" ON "iam"."permissions"("code");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "iam"."users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "iam"."users"("email");

-- CreateIndex
CREATE INDEX "idx_iam_users_username" ON "iam"."users"("username");

-- CreateIndex
CREATE INDEX "idx_iam_users_role" ON "iam"."users"("role");

-- CreateIndex
CREATE INDEX "idx_audit_created_at" ON "iam"."audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "idx_audit_username" ON "iam"."audit_logs"("username");

-- CreateIndex
CREATE INDEX "idx_audit_action" ON "iam"."audit_logs"("action");

-- CreateIndex
CREATE INDEX "idx_std_perf_month_chan" ON "datamart"."fact_monthly_performance"("month", "channel");

-- CreateIndex
CREATE UNIQUE INDEX "uq_std_monthly_perf" ON "datamart"."fact_monthly_performance"("year", "month", "channel", "sub_channel");

-- CreateIndex
CREATE INDEX "idx_std_daily_date_chan" ON "datamart"."fact_daily_sales"("sale_date", "channel");

-- CreateIndex
CREATE UNIQUE INDEX "uq_std_daily_sales" ON "datamart"."fact_daily_sales"("sale_date", "channel");

-- CreateIndex
CREATE INDEX "idx_std_stock_region_area" ON "datamart"."fact_stock_doi"("report_month", "region", "area");

-- CreateIndex
CREATE UNIQUE INDEX "uq_std_stock_doi" ON "datamart"."fact_stock_doi"("report_month", "npp_code");

-- CreateIndex
CREATE UNIQUE INDEX "uq_std_geo" ON "datamart"."dim_geo_hierarchy"("region_code", "vung_code", "area_code");

-- AddForeignKey
ALTER TABLE "iam"."role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "iam"."roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iam"."role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "iam"."permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iam"."audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "iam"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

