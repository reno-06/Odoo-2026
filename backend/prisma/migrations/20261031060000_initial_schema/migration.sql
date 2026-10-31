-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspaces" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "billing_email" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "tax_id" TEXT,
    "default_currency" CHAR(3) NOT NULL DEFAULT 'USD',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_memberships" (
    "workspace_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspace_memberships_pkey" PRIMARY KEY ("workspace_id","user_id")
);

-- CreateTable
CREATE TABLE "auth_sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "refresh_token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_invitations" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspace_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_preferences" (
    "user_id" UUID NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'USD',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "date_format" TEXT NOT NULL DEFAULT 'YYYY-MM-DD',
    "email_notifications" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "product_number" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "sales_price" DECIMAL(12,2) NOT NULL,
    "cost_price" DECIMAL(12,2) NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_variants" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "additional_price" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plans" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "plan_number" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "interval_unit" TEXT NOT NULL,
    "interval_count" INTEGER NOT NULL DEFAULT 1,
    "price" DECIMAL(12,2) NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'USD',
    "minimum_quantity" INTEGER NOT NULL DEFAULT 1,
    "available_from" DATE,
    "available_until" DATE,
    "auto_close" BOOLEAN NOT NULL DEFAULT false,
    "allow_early_closure" BOOLEAN NOT NULL DEFAULT false,
    "allow_pause" BOOLEAN NOT NULL DEFAULT false,
    "allow_renewal" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "customer_number" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "company_name" TEXT,
    "address" TEXT,
    "location" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotations" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "quote_number" TEXT NOT NULL,
    "customer_id" UUID NOT NULL,
    "created_by" UUID,
    "created_on" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valid_until" DATE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "currency" CHAR(3) NOT NULL DEFAULT 'USD',
    "subtotal" DECIMAL(12,2) NOT NULL,
    "tax_total" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quotations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotation_items" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "quotation_id" UUID NOT NULL,
    "product_id" UUID,
    "plan_id" UUID,
    "description_snapshot" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(12,2) NOT NULL,
    "tax_rate" DECIMAL(7,4) NOT NULL,
    "line_subtotal" DECIMAL(12,2) NOT NULL,
    "tax_amount" DECIMAL(12,2) NOT NULL,
    "line_total" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "quotation_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "subscription_number" TEXT NOT NULL,
    "customer_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "quotation_id" UUID,
    "starts_on" DATE NOT NULL,
    "expires_on" DATE,
    "next_billing_on" DATE,
    "interval_unit" TEXT NOT NULL,
    "interval_count" INTEGER NOT NULL DEFAULT 1,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "paused_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "invoice_number" TEXT NOT NULL,
    "customer_id" UUID NOT NULL,
    "subscription_id" UUID,
    "quotation_id" UUID,
    "issue_date" DATE NOT NULL,
    "due_date" DATE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "currency" CHAR(3) NOT NULL DEFAULT 'USD',
    "subtotal" DECIMAL(12,2) NOT NULL,
    "tax_total" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_items" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "product_id" UUID,
    "plan_id" UUID,
    "description_snapshot" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(12,2) NOT NULL,
    "tax_rate" DECIMAL(7,4) NOT NULL,
    "line_subtotal" DECIMAL(12,2) NOT NULL,
    "tax_amount" DECIMAL(12,2) NOT NULL,
    "line_total" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discounts" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "discount_number" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "type" TEXT NOT NULL,
    "value" DECIMAL(12,2) NOT NULL,
    "minimum_purchase" DECIMAL(12,2),
    "minimum_quantity" INTEGER,
    "starts_on" DATE,
    "ends_on" DATE,
    "usage_limit" INTEGER,
    "applies_to" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discount_redemptions" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "discount_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "quotation_id" UUID,
    "invoice_id" UUID,
    "redeemed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "amount" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "discount_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "payment_number" TEXT NOT NULL,
    "customer_id" UUID NOT NULL,
    "created_by" UUID,
    "invoice_id" UUID,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'USD',
    "method" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "paid_at" TIMESTAMP(3),
    "external_reference" TEXT,
    "provider" TEXT,
    "provider_payment_id" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_tax_settings" (
    "workspace_id" UUID NOT NULL,
    "tax_name" TEXT NOT NULL,
    "tax_rate" DECIMAL(7,4) NOT NULL,
    "tax_id" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspace_tax_settings_pkey" PRIMARY KEY ("workspace_id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "actor_user_id" UUID,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_DiscountProducts" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_DiscountProducts_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_DiscountPlans" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_DiscountPlans_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "workspaces_slug_key" ON "workspaces"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "auth_sessions_refresh_token_hash_key" ON "auth_sessions"("refresh_token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_invitations_token_hash_key" ON "workspace_invitations"("token_hash");

-- CreateIndex
CREATE INDEX "workspace_invitations_workspace_id_email_idx" ON "workspace_invitations"("workspace_id", "email");

-- CreateIndex
CREATE INDEX "products_workspace_id_status_idx" ON "products"("workspace_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "products_workspace_id_id_key" ON "products"("workspace_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "products_workspace_id_product_number_key" ON "products"("workspace_id", "product_number");

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_product_id_name_key" ON "product_variants"("product_id", "name");

-- CreateIndex
CREATE INDEX "plans_workspace_id_status_idx" ON "plans"("workspace_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "plans_workspace_id_id_key" ON "plans"("workspace_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "plans_workspace_id_plan_number_key" ON "plans"("workspace_id", "plan_number");

-- CreateIndex
CREATE INDEX "customers_workspace_id_status_idx" ON "customers"("workspace_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "customers_workspace_id_id_key" ON "customers"("workspace_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "customers_workspace_id_customer_number_key" ON "customers"("workspace_id", "customer_number");

-- CreateIndex
CREATE UNIQUE INDEX "customers_workspace_id_email_key" ON "customers"("workspace_id", "email");

-- CreateIndex
CREATE INDEX "quotations_workspace_id_status_idx" ON "quotations"("workspace_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "quotations_workspace_id_id_key" ON "quotations"("workspace_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "quotations_workspace_id_quote_number_key" ON "quotations"("workspace_id", "quote_number");

-- CreateIndex
CREATE INDEX "quotation_items_workspace_id_idx" ON "quotation_items"("workspace_id");

-- CreateIndex
CREATE INDEX "subscriptions_workspace_id_status_idx" ON "subscriptions"("workspace_id", "status");

-- CreateIndex
CREATE INDEX "subscriptions_workspace_id_next_billing_on_idx" ON "subscriptions"("workspace_id", "next_billing_on");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_workspace_id_id_key" ON "subscriptions"("workspace_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_workspace_id_subscription_number_key" ON "subscriptions"("workspace_id", "subscription_number");

-- CreateIndex
CREATE INDEX "invoices_workspace_id_status_idx" ON "invoices"("workspace_id", "status");

-- CreateIndex
CREATE INDEX "invoices_workspace_id_due_date_idx" ON "invoices"("workspace_id", "due_date");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_workspace_id_id_key" ON "invoices"("workspace_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_workspace_id_invoice_number_key" ON "invoices"("workspace_id", "invoice_number");

-- CreateIndex
CREATE INDEX "invoice_items_workspace_id_idx" ON "invoice_items"("workspace_id");

-- CreateIndex
CREATE INDEX "discounts_workspace_id_status_idx" ON "discounts"("workspace_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "discounts_workspace_id_code_key" ON "discounts"("workspace_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "discounts_workspace_id_discount_number_key" ON "discounts"("workspace_id", "discount_number");

-- CreateIndex
CREATE INDEX "discount_redemptions_workspace_id_discount_id_idx" ON "discount_redemptions"("workspace_id", "discount_id");

-- CreateIndex
CREATE INDEX "payments_workspace_id_status_idx" ON "payments"("workspace_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "payments_workspace_id_id_key" ON "payments"("workspace_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_workspace_id_payment_number_key" ON "payments"("workspace_id", "payment_number");

-- CreateIndex
CREATE INDEX "notifications_user_id_read_at_idx" ON "notifications"("user_id", "read_at");

-- CreateIndex
CREATE INDEX "audit_logs_workspace_id_entity_type_entity_id_idx" ON "audit_logs"("workspace_id", "entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_workspace_id_created_at_idx" ON "audit_logs"("workspace_id", "created_at");

-- CreateIndex
CREATE INDEX "_DiscountProducts_B_index" ON "_DiscountProducts"("B");

-- CreateIndex
CREATE INDEX "_DiscountPlans_B_index" ON "_DiscountPlans"("B");

-- AddForeignKey
ALTER TABLE "workspace_memberships" ADD CONSTRAINT "workspace_memberships_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_memberships" ADD CONSTRAINT "workspace_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_invitations" ADD CONSTRAINT "workspace_invitations_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_invitations" ADD CONSTRAINT "workspace_invitations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plans" ADD CONSTRAINT "plans_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plans" ADD CONSTRAINT "plans_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotation_items" ADD CONSTRAINT "quotation_items_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "quotations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotation_items" ADD CONSTRAINT "quotation_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotation_items" ADD CONSTRAINT "quotation_items_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "quotations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "quotations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discounts" ADD CONSTRAINT "discounts_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discount_redemptions" ADD CONSTRAINT "discount_redemptions_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discount_redemptions" ADD CONSTRAINT "discount_redemptions_discount_id_fkey" FOREIGN KEY ("discount_id") REFERENCES "discounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discount_redemptions" ADD CONSTRAINT "discount_redemptions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discount_redemptions" ADD CONSTRAINT "discount_redemptions_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "quotations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discount_redemptions" ADD CONSTRAINT "discount_redemptions_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_tax_settings" ADD CONSTRAINT "workspace_tax_settings_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DiscountProducts" ADD CONSTRAINT "_DiscountProducts_A_fkey" FOREIGN KEY ("A") REFERENCES "discounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DiscountProducts" ADD CONSTRAINT "_DiscountProducts_B_fkey" FOREIGN KEY ("B") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DiscountPlans" ADD CONSTRAINT "_DiscountPlans_A_fkey" FOREIGN KEY ("A") REFERENCES "discounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DiscountPlans" ADD CONSTRAINT "_DiscountPlans_B_fkey" FOREIGN KEY ("B") REFERENCES "plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Check constraints complement request validation and remain enforced for every database client.
ALTER TABLE "users"
    ADD CONSTRAINT "users_status_check"
    CHECK ("status" IN ('active', 'invited', 'disabled'));

ALTER TABLE "workspace_memberships"
    ADD CONSTRAINT "workspace_memberships_role_check"
        CHECK ("role" IN ('owner', 'admin', 'billing', 'member')),
    ADD CONSTRAINT "workspace_memberships_status_check"
        CHECK ("status" IN ('active', 'invited', 'disabled'));

ALTER TABLE "workspace_invitations"
    ADD CONSTRAINT "workspace_invitations_role_check"
    CHECK ("role" IN ('owner', 'admin', 'billing', 'member'));

ALTER TABLE "products"
    ADD CONSTRAINT "products_type_check"
        CHECK ("type" IN ('digital_service', 'service', 'physical_product')),
    ADD CONSTRAINT "products_status_check"
        CHECK ("status" IN ('active', 'inactive', 'archived')),
    ADD CONSTRAINT "products_prices_check"
        CHECK ("sales_price" >= 0 AND "cost_price" >= 0),
    ADD CONSTRAINT "products_currency_check"
        CHECK ("currency" ~ '^[A-Z]{3}$');

ALTER TABLE "product_variants"
    ADD CONSTRAINT "product_variants_price_check"
    CHECK ("additional_price" >= 0);

ALTER TABLE "plans"
    ADD CONSTRAINT "plans_interval_check"
        CHECK ("interval_unit" IN ('day', 'week', 'month', 'year')),
    ADD CONSTRAINT "plans_interval_count_check"
        CHECK ("interval_count" > 0),
    ADD CONSTRAINT "plans_price_check"
        CHECK ("price" >= 0 AND "minimum_quantity" > 0),
    ADD CONSTRAINT "plans_status_check"
        CHECK ("status" IN ('active', 'inactive', 'archived')),
    ADD CONSTRAINT "plans_availability_check"
        CHECK ("available_from" IS NULL OR "available_until" IS NULL OR "available_until" >= "available_from"),
    ADD CONSTRAINT "plans_currency_check"
        CHECK ("currency" ~ '^[A-Z]{3}$');

ALTER TABLE "customers"
    ADD CONSTRAINT "customers_status_check"
        CHECK ("status" IN ('active', 'inactive', 'archived')),
    ADD CONSTRAINT "customers_email_check"
        CHECK ("email" = lower(trim("email")) AND "email" ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$');

ALTER TABLE "quotations"
    ADD CONSTRAINT "quotations_status_check"
        CHECK ("status" IN ('draft', 'quotation', 'confirmed', 'expired', 'cancelled')),
    ADD CONSTRAINT "quotations_amounts_check"
        CHECK ("subtotal" >= 0 AND "tax_total" >= 0 AND "total" >= 0),
    ADD CONSTRAINT "quotations_dates_check"
        CHECK ("valid_until" >= "created_on"),
    ADD CONSTRAINT "quotations_currency_check"
        CHECK ("currency" ~ '^[A-Z]{3}$');

ALTER TABLE "quotation_items"
    ADD CONSTRAINT "quotation_items_product_or_plan_check"
        CHECK (("product_id" IS NOT NULL)::integer + ("plan_id" IS NOT NULL)::integer = 1),
    ADD CONSTRAINT "quotation_items_quantity_check"
        CHECK ("quantity" > 0),
    ADD CONSTRAINT "quotation_items_amounts_check"
        CHECK ("unit_price" >= 0 AND "tax_rate" BETWEEN 0 AND 100 AND "line_subtotal" >= 0 AND "tax_amount" >= 0 AND "line_total" >= 0);

ALTER TABLE "subscriptions"
    ADD CONSTRAINT "subscriptions_status_check"
        CHECK ("status" IN ('draft', 'quotation', 'confirmed', 'active', 'paused', 'closed', 'expired', 'cancelled')),
    ADD CONSTRAINT "subscriptions_interval_check"
        CHECK ("interval_unit" IN ('day', 'week', 'month', 'year') AND "interval_count" > 0),
    ADD CONSTRAINT "subscriptions_amount_check"
        CHECK ("amount" >= 0),
    ADD CONSTRAINT "subscriptions_dates_check"
        CHECK (("expires_on" IS NULL OR "expires_on" >= "starts_on") AND ("next_billing_on" IS NULL OR "next_billing_on" >= "starts_on")),
    ADD CONSTRAINT "subscriptions_currency_check"
        CHECK ("currency" ~ '^[A-Z]{3}$');

ALTER TABLE "invoices"
    ADD CONSTRAINT "invoices_status_check"
        CHECK ("status" IN ('draft', 'confirmed', 'paid', 'overdue', 'cancelled')),
    ADD CONSTRAINT "invoices_amounts_check"
        CHECK ("subtotal" >= 0 AND "tax_total" >= 0 AND "total" >= 0),
    ADD CONSTRAINT "invoices_dates_check"
        CHECK ("due_date" >= "issue_date"),
    ADD CONSTRAINT "invoices_currency_check"
        CHECK ("currency" ~ '^[A-Z]{3}$');

ALTER TABLE "invoice_items"
    ADD CONSTRAINT "invoice_items_product_or_plan_check"
        CHECK (("product_id" IS NOT NULL)::integer + ("plan_id" IS NOT NULL)::integer <= 1),
    ADD CONSTRAINT "invoice_items_quantity_check"
        CHECK ("quantity" > 0),
    ADD CONSTRAINT "invoice_items_amounts_check"
        CHECK ("unit_price" >= 0 AND "tax_rate" BETWEEN 0 AND 100 AND "line_subtotal" >= 0 AND "tax_amount" >= 0 AND "line_total" >= 0);

ALTER TABLE "discounts"
    ADD CONSTRAINT "discounts_type_check"
        CHECK ("type" IN ('percentage', 'fixed_amount')),
    ADD CONSTRAINT "discounts_value_check"
        CHECK ("value" >= 0 AND ("type" <> 'percentage' OR "value" <= 100)),
    ADD CONSTRAINT "discounts_minimums_check"
        CHECK (("minimum_purchase" IS NULL OR "minimum_purchase" >= 0) AND ("minimum_quantity" IS NULL OR "minimum_quantity" > 0) AND ("usage_limit" IS NULL OR "usage_limit" > 0)),
    ADD CONSTRAINT "discounts_applies_to_check"
        CHECK ("applies_to" IN ('all_products', 'selected_products', 'selected_plans', 'subscription_wide')),
    ADD CONSTRAINT "discounts_status_check"
        CHECK ("status" IN ('active', 'inactive', 'expired')),
    ADD CONSTRAINT "discounts_dates_check"
        CHECK ("starts_on" IS NULL OR "ends_on" IS NULL OR "ends_on" >= "starts_on");

ALTER TABLE "discount_redemptions"
    ADD CONSTRAINT "discount_redemptions_amount_check"
        CHECK ("amount" >= 0),
    ADD CONSTRAINT "discount_redemptions_target_check"
        CHECK (("quotation_id" IS NOT NULL)::integer + ("invoice_id" IS NOT NULL)::integer = 1);

ALTER TABLE "payments"
    ADD CONSTRAINT "payments_status_check"
        CHECK ("status" IN ('pending', 'completed', 'failed', 'refunded')),
    ADD CONSTRAINT "payments_method_check"
        CHECK ("method" IN ('cash', 'bank_transfer', 'card', 'upi', 'other')),
    ADD CONSTRAINT "payments_amount_check"
        CHECK ("amount" > 0),
    ADD CONSTRAINT "payments_currency_check"
        CHECK ("currency" ~ '^[A-Z]{3}$');

ALTER TABLE "workspace_tax_settings"
    ADD CONSTRAINT "workspace_tax_settings_rate_check"
    CHECK ("tax_rate" BETWEEN 0 AND 100);

CREATE UNIQUE INDEX "users_email_lower_key" ON "users" (lower("email"));
CREATE UNIQUE INDEX "customers_workspace_email_lower_key" ON "customers" ("workspace_id", lower("email"));
