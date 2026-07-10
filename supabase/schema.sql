-- ============================================================
-- ⚠️  STALE / REFERENCE ONLY — DO NOT RUN AGAINST THE LIVE DB
-- ------------------------------------------------------------
-- This file describes an EARLIER design (tenants + my_tier() +
-- transactions/transaction_items/kas_entries) that was NEVER
-- deployed. The live database instead uses:
--   • stores.owner_id = auth.uid()  for RLS (see activity_logs_rls.sql)
--   • sales / sale_items            (not transactions/*)
--   • kas_entries                   (see kas_entries.sql — the real one)
--   • retention                     (see retention_cleanup.sql — prem 90)
-- Treat the individual migration files as the source of truth.
-- Running anything here (e.g. history_days/my_tier) will error.
-- ============================================================
-- STERITH POS · SUPABASE SCHEMA (historical design doc)
-- ============================================================


-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE tier      AS ENUM ('free', 'standard', 'premium');
CREATE TYPE kas_type  AS ENUM ('masuk', 'keluar', 'auto');


-- ============================================================
-- TENANTS
-- One row per paying subscriber (the business owner).
-- Supabase auth handles the password/login — this table just
-- maps their auth email to a tier and stores their display name.
-- ============================================================

CREATE TABLE tenants (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email            TEXT        NOT NULL UNIQUE,
  full_name        TEXT        NOT NULL,
  tier             tier        NOT NULL DEFAULT 'free',
  tier_expires_at  TIMESTAMPTZ,              -- NULL = no expiry (lifetime / manual)
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- STORES
-- Free + Standard: 1 store per tenant.
-- Premium: up to 5 stores (multi-outlet).
-- ============================================================

CREATE TABLE stores (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  address     TEXT,
  phone       TEXT,
  logo_url    TEXT,       -- NULL → show Sterith watermark (Free). Standard+ can set this.
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CASHIERS
-- Free: 1 cashier (owner only).
-- Standard: up to 5 cashiers.
-- Premium: unlimited.
-- PIN is stored hashed (bcrypt). Never store plain text.
-- ============================================================

CREATE TABLE cashiers (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    UUID        NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  initials    TEXT        NOT NULL,
  pin_hash    TEXT        NOT NULL,   -- bcrypt hash of 4-digit PIN
  role        TEXT        NOT NULL DEFAULT 'kasir',   -- 'owner' | 'kasir'
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PRODUCTS
-- Per store. name + price required. description + photo optional.
-- photo_url points to Supabase Storage bucket 'product-photos'.
-- Standard+ only (enforced in app).
-- ============================================================

CREATE TABLE products (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id     UUID        NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name         TEXT        NOT NULL,
  price        INTEGER     NOT NULL,   -- IDR, whole number
  description  TEXT,
  photo_url    TEXT,
  category     TEXT,
  unit         TEXT,
  stock        INTEGER,
  is_active    BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SHIFTS
-- Tracks who opened/closed a shift. One row per shift session.
-- modal_awal = opening cash. modal_akhir = closing cash (NULL if still open).
-- ============================================================

CREATE TABLE shifts (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id      UUID        NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  cashier_id    UUID        NOT NULL REFERENCES cashiers(id),
  shift_num     SMALLINT    NOT NULL CHECK (shift_num IN (1, 2, 3)),
  modal_awal    INTEGER     NOT NULL DEFAULT 0,
  modal_akhir   INTEGER,               -- NULL = shift still open
  opened_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at     TIMESTAMPTZ
);

-- ============================================================
-- TRANSACTIONS
-- One row per completed sale.
-- Line items live in transaction_items.
-- ============================================================

CREATE TABLE transactions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        UUID        NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  cashier_id      UUID        REFERENCES cashiers(id) ON DELETE SET NULL,
  shift_id        UUID        REFERENCES shifts(id) ON DELETE SET NULL,
  trx_number      TEXT        NOT NULL,    -- e.g. '#TRX-0042'
  payment_method  TEXT        NOT NULL DEFAULT 'tunai',   -- 'tunai' | 'qris' | 'transfer'
  subtotal        INTEGER     NOT NULL,
  discount        INTEGER     NOT NULL DEFAULT 0,
  total           INTEGER     NOT NULL,
  cash_received   INTEGER,                 -- NULL for non-cash payments
  change_given    INTEGER,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TRANSACTION ITEMS
-- Snapshot of product name + price at time of sale.
-- product_id is nullable so history survives if a product is deleted.
-- ============================================================

CREATE TABLE transaction_items (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id  UUID    NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  product_id      UUID    REFERENCES products(id) ON DELETE SET NULL,
  product_name    TEXT    NOT NULL,    -- snapshot — never changes
  product_price   INTEGER NOT NULL,    -- snapshot in IDR
  qty             INTEGER NOT NULL,
  subtotal        INTEGER NOT NULL
);

-- ============================================================
-- KAS ENTRIES
-- Cash management: masuk (in), keluar (out), auto (from sales).
-- photo_url → Supabase Storage bucket 'kas-photos'.
-- Photo upload is Standard+ only (enforced in app).
-- ============================================================

CREATE TABLE kas_entries (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id     UUID        NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  cashier_id   UUID        REFERENCES cashiers(id) ON DELETE SET NULL,
  shift_id     UUID        REFERENCES shifts(id) ON DELETE SET NULL,
  type         kas_type    NOT NULL,
  amount       INTEGER     NOT NULL,   -- always positive; sign inferred from type
  label        TEXT        NOT NULL,
  description  TEXT,
  photo_url    TEXT,                   -- Standard+ only
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- HELPER FUNCTIONS (used inside RLS policies)
-- SECURITY DEFINER so policies can read the current user's tenant.
-- ============================================================

CREATE OR REPLACE FUNCTION my_tenant_id()
RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER AS $$
  SELECT id FROM tenants WHERE email = auth.email() LIMIT 1
$$;

CREATE OR REPLACE FUNCTION my_tier()
RETURNS tier LANGUAGE SQL STABLE SECURITY DEFINER AS $$
  SELECT tier FROM tenants WHERE email = auth.email() LIMIT 1
$$;

-- Returns how many days of history this user is allowed to read.
-- Enforced at the database level — no client-side code can bypass it.
-- History read window per tier. MUST match retention_cleanup.sql's
-- retention_days() (the hard-delete job) or users will "see" rows the cron
-- is about to delete. free 1 / standard 30 / premium 90.
CREATE OR REPLACE FUNCTION history_days()
RETURNS INTEGER LANGUAGE SQL STABLE SECURITY DEFINER AS $$
  SELECT CASE my_tier()
    WHEN 'free'     THEN 1
    WHEN 'standard' THEN 30
    WHEN 'premium'  THEN 90
    ELSE 1
  END
$$;


-- ============================================================
-- ROW LEVEL SECURITY
-- Each user can only read/write their own store's data.
-- The history window is enforced at the database level — no
-- client-side change can bypass it.
--
-- MasterOffice uses the Supabase service_role key, which
-- bypasses RLS entirely — giving you full visibility across
-- all tenants from the owner dashboard.
-- ============================================================

ALTER TABLE tenants            ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores             ENABLE ROW LEVEL SECURITY;
ALTER TABLE cashiers           ENABLE ROW LEVEL SECURITY;
ALTER TABLE products           ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts             ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE kas_entries        ENABLE ROW LEVEL SECURITY;

-- Tenants: only your own row
CREATE POLICY "tenant: self"
  ON tenants FOR ALL
  USING (email = auth.email());

-- Stores: only stores owned by your tenant
CREATE POLICY "stores: own tenant"
  ON stores FOR ALL
  USING (tenant_id = my_tenant_id());

-- Cashiers: only cashiers in your stores
CREATE POLICY "cashiers: own stores"
  ON cashiers FOR ALL
  USING (store_id IN (SELECT id FROM stores WHERE tenant_id = my_tenant_id()));

-- Products: only products in your stores
CREATE POLICY "products: own stores"
  ON products FOR ALL
  USING (store_id IN (SELECT id FROM stores WHERE tenant_id = my_tenant_id()));

-- Shifts: only shifts in your stores
CREATE POLICY "shifts: own stores"
  ON shifts FOR ALL
  USING (store_id IN (SELECT id FROM stores WHERE tenant_id = my_tenant_id()));

-- Transactions: own stores + tier history window on reads
CREATE POLICY "transactions: read"
  ON transactions FOR SELECT
  USING (
    store_id IN (SELECT id FROM stores WHERE tenant_id = my_tenant_id())
    AND created_at > NOW() - (history_days() || ' days')::INTERVAL
  );

CREATE POLICY "transactions: insert"
  ON transactions FOR INSERT
  WITH CHECK (store_id IN (SELECT id FROM stores WHERE tenant_id = my_tenant_id()));

-- Transaction items: inherit parent transaction's visibility
CREATE POLICY "transaction_items: via transaction"
  ON transaction_items FOR ALL
  USING (
    transaction_id IN (
      SELECT id FROM transactions
      WHERE
        store_id IN (SELECT id FROM stores WHERE tenant_id = my_tenant_id())
        AND created_at > NOW() - (history_days() || ' days')::INTERVAL
    )
  );

-- Kas entries: own stores + tier history window on reads
CREATE POLICY "kas_entries: read"
  ON kas_entries FOR SELECT
  USING (
    store_id IN (SELECT id FROM stores WHERE tenant_id = my_tenant_id())
    AND created_at > NOW() - (history_days() || ' days')::INTERVAL
  );

CREATE POLICY "kas_entries: insert"
  ON kas_entries FOR INSERT
  WITH CHECK (store_id IN (SELECT id FROM stores WHERE tenant_id = my_tenant_id()));


-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_stores_tenant           ON stores(tenant_id);
CREATE INDEX idx_cashiers_store          ON cashiers(store_id, is_active);
CREATE INDEX idx_products_store          ON products(store_id, is_active);
CREATE INDEX idx_shifts_store_date       ON shifts(store_id, opened_at DESC);
CREATE INDEX idx_transactions_store_date ON transactions(store_id, created_at DESC);
CREATE INDEX idx_trx_items_transaction   ON transaction_items(transaction_id);
CREATE INDEX idx_kas_store_date          ON kas_entries(store_id, created_at DESC);


-- ============================================================
-- TIER REFERENCE
-- ============================================================
--
--  feature                    FREE         STANDARD      PREMIUM
--  ─────────────────────────  ───────────  ────────────  ────────────
--  riwayat / kas history      1 day        30 days       365 days
--  max stores                 1            1             5
--  max cashiers               1 (owner)    5             unlimited
--  product photos             no           yes           yes
--  kas photos                 no           yes           yes
--  custom branding / logo     no           yes           yes
--  Sterith watermark          shows        hidden        hidden
--  WhatsApp struk             no           yes           yes
--  export (Excel / PDF)       no           no            yes
--  MasterOffice dashboard     no           yes           yes
--  multi-outlet view          no           no            yes
--  API access                 no           no            yes
--
-- How enforcement works:
--  History window  → RLS policy (server-side, cannot be bypassed by client)
--  Feature gating  → app reads tenants.tier and conditionally renders/blocks
--  Store count cap → app checks count before INSERT
--  Cashier count   → app checks count before INSERT
--  Photo uploads   → app + Supabase Storage bucket policies
--  MasterOffice    → service_role key bypasses RLS, sees all tenants
