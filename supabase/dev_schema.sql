-- ============================================================================
-- STERITH DEV — full schema bootstrap
-- ============================================================================
-- Mirrors the LIVE production schema (exported from information_schema +
-- pg_policies), with three deliberate corrections:
--   1. cashiers.password        — exists here (missing in prod; breaks manager approval)
--   2. stores_auth / cashiers_auth backdoor policies — NOT recreated (see §4)
--   3. feedback is insert-only for the public (prod lets anyone READ feedback)
--
-- Safe to re-run: everything is `if not exists` / `drop policy if exists`.
-- Run once on the Sterith Dev project → SQL Editor (RLS off / postgres role).
-- ============================================================================


-- ─────────────────────────────────────────────────────────────
-- §1  CORE: stores, staff, catalog
-- ─────────────────────────────────────────────────────────────

create table if not exists public.stores (
  id                       uuid primary key default gen_random_uuid(),
  name                     text not null,
  address                  text default ''::text,
  phone                    text default ''::text,
  owner_id                 uuid,
  tier                     text default 'free'::text,
  status                   text default 'active'::text,
  created_at               timestamptz default now(),
  client_code              text,
  synced_at                timestamptz,
  qris_image_url           text,
  midtrans_server_key      text,
  midtrans_client_key      text,
  inventory_enabled        boolean not null default true,
  low_stock_threshold      integer not null default 5,
  add_ons                  text[] not null default '{}'::text[],
  tier_expires_at          date,
  settings                 jsonb not null default '{}'::jsonb,
  settings_locked          boolean not null default false,
  owner_email              text,
  backoffice_password_hash text,
  receipt_logo             text,
  active_device_id         text,
  active_device_at         timestamptz,
  active_bo_device_id      text,
  active_bo_device_at      timestamptz
);

create table if not exists public.cashiers (
  id         uuid primary key default gen_random_uuid(),
  store_id   uuid references public.stores(id) on delete cascade,
  name       text not null,
  initials   text not null,
  role       text default 'Kasir'::text,
  pin        text not null,
  active     boolean default true,
  created_at timestamptz default now(),
  password   text                      -- manager approval (missing in prod!)
);
create index if not exists idx_cashiers_store on public.cashiers(store_id);

create table if not exists public.products (
  id             text primary key,
  store_id       uuid references public.stores(id) on delete cascade,
  name           text not null,
  monogram       text,
  emoji          text,
  category       text default 'SBK'::text,
  unit           text default 'pcs'::text,
  price          integer not null default 0,
  stock          integer default 0,
  active         boolean default true,
  created_at     timestamptz default now(),
  sku            text,
  threshold      integer not null default 10,
  warehouse_qty  integer not null default 0,
  store_qty      integer not null default 0,
  sold_today     integer not null default 0,
  photo_url      text,
  deleted_at     timestamptz,
  stock_awal     integer not null default 0,
  stock_tambahan integer not null default 0,
  stock_terjual  integer not null default 0,
  stock_date     date
);
create index if not exists idx_products_store on public.products(store_id);

create table if not exists public.shifts (
  id                  text primary key,
  store_id            uuid not null references public.stores(id) on delete cascade,
  name                text not null,
  start_time          text not null,
  end_time            text not null,
  assigned_cashier_id uuid,
  selisih_type        text,
  selisih_amount      integer
);
create index if not exists idx_shifts_store on public.shifts(store_id);


-- ─────────────────────────────────────────────────────────────
-- §2  SALES + money
-- ─────────────────────────────────────────────────────────────

create table if not exists public.sales (
  id             uuid primary key default gen_random_uuid(),
  store_id       uuid references public.stores(id) on delete cascade,
  trx_id         text,
  cashier_id     text,
  cashier_name   text,
  shift          integer,
  total          integer not null default 0,
  payment_method text,
  cash_received  integer,
  change_amount  integer,
  created_at     timestamptz default now(),
  voided         boolean not null default false,
  voided_at      timestamptz,
  customer_name  text
);
create index if not exists idx_sales_store_date on public.sales(store_id, created_at desc);

create table if not exists public.sale_items (
  id           uuid primary key default gen_random_uuid(),
  sale_id      uuid references public.sales(id) on delete cascade,
  product_id   text references public.products(id),
  product_name text not null,
  price        integer not null,
  qty          integer not null,
  subtotal     integer not null
);
create index if not exists idx_sale_items_sale on public.sale_items(sale_id);

create table if not exists public.customers (
  id         uuid primary key default gen_random_uuid(),
  store_id   uuid not null references public.stores(id) on delete cascade,
  name       text not null,
  phone      text,
  created_at timestamptz not null default now(),
  address    text,
  photo      text
);
create index if not exists idx_customers_store on public.customers(store_id, name);

create table if not exists public.hutang (
  id             uuid primary key default gen_random_uuid(),
  store_id       uuid not null references public.stores(id) on delete cascade,
  sale_id        uuid,
  customer_id    uuid references public.customers(id) on delete set null,
  customer_name  text not null,
  phone          text,
  amount         integer not null check (amount >= 0),
  paid_amount    integer not null default 0 check (paid_amount >= 0),
  status         text not null default 'open'::text check (status in ('open','partial','lunas')),
  cashier_name   text,
  created_at     timestamptz not null default now(),
  settled_at     timestamptz,
  trx_id         text,
  settled_method text,
  voided         boolean not null default false
);
create index if not exists idx_hutang_store_status on public.hutang(store_id, status, created_at desc);

create table if not exists public.kas_entries (
  id           uuid primary key default gen_random_uuid(),
  store_id     uuid not null references public.stores(id) on delete cascade,
  cashier_name text,
  shift        integer,
  type         text not null check (type in ('masuk','keluar','auto','hutang_settle')),
  amount       integer not null check (amount >= 0),
  label        text not null,
  description  text,
  photo_url    text,
  created_at   timestamptz not null default now()
);
create index if not exists idx_kas_store_date on public.kas_entries(store_id, created_at desc);

create table if not exists public.day_opens (
  id            uuid primary key default gen_random_uuid(),
  store_id      uuid not null references public.stores(id) on delete cascade,
  business_date date not null,
  modal_awal    integer not null default 0,
  opened_at     timestamptz not null default now(),
  opened_by     text,
  created_at    timestamptz not null default now(),
  unique (store_id, business_date)
);

create table if not exists public.shift_closings (
  id            uuid primary key default gen_random_uuid(),
  store_id      uuid not null references public.stores(id) on delete cascade,
  business_date date not null,
  opened_at     timestamptz,
  closed_at     timestamptz not null default now(),
  cashier_name  text,
  omzet         integer not null default 0,
  trx           integer not null default 0,
  shift_count   integer not null default 1,
  modal_awal    integer not null default 0,
  expected      integer not null default 0,
  counted       integer,
  selisih       integer,
  reconciled    boolean not null default false,
  auto_closed   boolean not null default false,
  breakdown     jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  unique (store_id, business_date)
);

create table if not exists public.cash_drawers (
  id         text primary key,
  store_id   uuid not null references public.stores(id) on delete cascade,
  entry_type text not null,
  amount     integer not null,
  note       text,
  by_user_id text not null,
  shift_id   text,
  created_at timestamptz not null default now()
);

create table if not exists public.qris_payments (
  id              uuid primary key default gen_random_uuid(),
  store_id        uuid references public.stores(id) on delete cascade,
  order_id        text not null unique,
  amount          bigint not null,
  qr_string       text,
  qr_url          text,
  status          text not null default 'pending'::text,
  midtrans_trx_id text,
  created_at      timestamptz default now(),
  paid_at         timestamptz
);


-- ─────────────────────────────────────────────────────────────
-- §3  INVENTORI add-on + audit
-- ─────────────────────────────────────────────────────────────

create table if not exists public.stock_movements (
  id         text primary key,
  store_id   uuid not null references public.stores(id) on delete cascade,
  type       text not null,
  product_id text not null,
  qty        integer not null,
  from_loc   text,
  to_loc     text,
  by_user_id text not null,
  meta       jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.opnames (
  id              text primary key,
  store_id        uuid not null references public.stores(id) on delete cascade,
  location        text not null,
  status          text not null default 'DRAFT'::text,
  created_by_id   text not null,
  approved_by_id  text,
  created_at      timestamptz not null default now(),
  approved_at     timestamptz
);

create table if not exists public.opname_lines (
  id           text primary key,
  opname_id    text not null references public.opnames(id) on delete cascade,
  product_id   text not null,
  system_qty   integer not null,
  physical_qty integer not null
);

create table if not exists public.activity_logs (
  id         text primary key,
  store_id   uuid not null references public.stores(id) on delete cascade,
  type       text not null,
  by_user_id text,
  meta       jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_activity_store_date on public.activity_logs(store_id, created_at desc);


-- ─────────────────────────────────────────────────────────────
-- §4  MASTER OFFICE: tenants, credentials, misc
-- ─────────────────────────────────────────────────────────────

create table if not exists public.tenants (
  id                      uuid primary key default gen_random_uuid(),
  email                   text not null unique,
  full_name               text not null,
  tier                    text not null default 'free'::text,
  tier_expires_at         timestamptz,
  created_at              timestamptz not null default now(),
  status                  text default 'prospek'::text,
  wa_number               text,
  store_name              text,
  store_address           text,
  business_type           text,
  notes                   text,
  badan_usaha             text,
  npwp                    text,
  nib                     text,
  pkp                     boolean,
  jumlah_karyawan         text,
  omzet_bulanan           text,
  sistem_pembukuan        text,
  tantangan               text,
  apps                    text[] not null default '{}'::text[],
  requested_apps          text[] not null default '{}'::text[],
  subscription_type       text default 'paid'::text,
  renewal_status          text default 'pending'::text,
  renewal_updated_at      timestamptz,
  requested_tier          text,
  rerequest_count         integer not null default 0,
  subscription_started_at date,
  billing_cycle           text,
  suspended_apps          text[] not null default '{}'::text[]
);

create table if not exists public.app_credentials (
  owner_id      uuid not null,
  app           text not null,
  password_hash text not null,
  updated_at    timestamptz not null default now(),
  primary key (owner_id, app)
);

create table if not exists public.app_setup_tokens (
  token      text primary key,
  owner_id   uuid not null,
  app        text not null,
  expires_at timestamptz not null,
  used_at    timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.auth_throttle (
  key           text primary key,
  fails         integer not null default 0,
  window_start  timestamptz not null default now(),
  blocked_until timestamptz
);

create table if not exists public.client_payments (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid references public.tenants(id) on delete cascade,
  file_path  text not null,
  file_name  text,
  note       text,
  created_at timestamptz not null default now()
);

create table if not exists public.feedback (
  id                uuid primary key default gen_random_uuid(),
  type              text not null,
  email             text not null,
  message           text not null,
  status            text default 'pending'::text,
  created_at        timestamptz default now(),
  requested_tier    text,
  requested_addons  text[],
  app               text default 'pos'::text
);

create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.health_state (
  user_id    uuid primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.posts (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  status     text not null default 'draft'::text,
  platforms  text[] not null default '{}'::text[],
  day        integer not null default 1,
  "time"     text not null default '09:00'::text,
  media      text not null default 'image'::text,
  caption    text not null default ''::text,
  created_at timestamptz not null default now()
);


-- ============================================================================
-- §5  ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------
-- Every store-scoped table is gated on: the row's store belongs to the
-- logged-in owner. Master Office / Back Office use the service_role key, which
-- bypasses RLS entirely, so admin tables need no policies.
--
-- NOTE: production also has `stores_auth` and `cashiers_auth` policies granting
-- ALL to anyone where auth.role() = 'authenticated'. Because permissive
-- policies are OR-ed, those let ANY logged-in user read/write EVERY store and
-- every cashier PIN. They are deliberately NOT recreated here.
-- ============================================================================

alter table public.stores           enable row level security;
alter table public.cashiers         enable row level security;
alter table public.products         enable row level security;
alter table public.shifts           enable row level security;
alter table public.sales            enable row level security;
alter table public.sale_items       enable row level security;
alter table public.customers        enable row level security;
alter table public.hutang           enable row level security;
alter table public.kas_entries      enable row level security;
alter table public.day_opens        enable row level security;
alter table public.shift_closings   enable row level security;
alter table public.cash_drawers     enable row level security;
alter table public.qris_payments    enable row level security;
alter table public.stock_movements  enable row level security;
alter table public.opnames          enable row level security;
alter table public.opname_lines     enable row level security;
alter table public.activity_logs    enable row level security;
alter table public.tenants          enable row level security;
alter table public.app_credentials  enable row level security;
alter table public.app_setup_tokens enable row level security;
alter table public.auth_throttle    enable row level security;
alter table public.client_payments  enable row level security;
alter table public.feedback         enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.health_state     enable row level security;
alter table public.posts            enable row level security;

-- ── stores: owner-scoped (no blanket "any authenticated" policy) ──
drop policy if exists stores_owner_select on public.stores;
create policy stores_owner_select on public.stores
  for select to authenticated using (owner_id = auth.uid());

drop policy if exists stores_owner_insert on public.stores;
create policy stores_owner_insert on public.stores
  for insert to authenticated with check (owner_id = auth.uid());

drop policy if exists stores_owner_update on public.stores;
create policy stores_owner_update on public.stores
  for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- ── store-scoped tables: one uniform owner check ──
do $$
declare t text;
begin
  foreach t in array array[
    'cashiers','products','shifts','sales','customers','hutang','kas_entries',
    'day_opens','shift_closings','cash_drawers','stock_movements','opnames','activity_logs'
  ] loop
    execute format('drop policy if exists %I on public.%I', t || '_all', t);
    execute format($f$
      create policy %I on public.%I for all to authenticated
      using      (exists (select 1 from public.stores s where s.id = %I.store_id and s.owner_id = auth.uid()))
      with check (exists (select 1 from public.stores s where s.id = %I.store_id and s.owner_id = auth.uid()))
    $f$, t || '_all', t, t, t);
  end loop;
end $$;

-- ── sale_items: scoped through its parent sale ──
drop policy if exists sale_items_all on public.sale_items;
create policy sale_items_all on public.sale_items
  for all to authenticated
  using (exists (select 1 from public.sales sa join public.stores s on s.id = sa.store_id
                 where sa.id = sale_items.sale_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from public.sales sa join public.stores s on s.id = sa.store_id
                 where sa.id = sale_items.sale_id and s.owner_id = auth.uid()));

-- ── opname_lines: scoped through its parent opname ──
drop policy if exists opname_lines_all on public.opname_lines;
create policy opname_lines_all on public.opname_lines
  for all to authenticated
  using (exists (select 1 from public.opnames o join public.stores s on s.id = o.store_id
                 where o.id = opname_lines.opname_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from public.opnames o join public.stores s on s.id = o.store_id
                 where o.id = opname_lines.opname_id and s.owner_id = auth.uid()));

-- ── qris_payments: owner may read their own payments (writes via service_role) ──
drop policy if exists owner_read_qris on public.qris_payments;
create policy owner_read_qris on public.qris_payments
  for select to authenticated
  using (store_id in (select id from public.stores where owner_id = auth.uid()));

-- ── tenants: an account may read only its own tenant row ──
drop policy if exists tenants_read_self on public.tenants;
create policy tenants_read_self on public.tenants
  for select to authenticated
  using (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

-- ── health_state: private per user ──
drop policy if exists health_state_rw on public.health_state;
create policy health_state_rw on public.health_state
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── feedback: anyone may submit; reading is service_role only.
--    (prod has a "Public can read feedback" policy — intentionally omitted.) ──
drop policy if exists feedback_insert on public.feedback;
create policy feedback_insert on public.feedback
  for insert to public with check (true);

-- app_credentials / app_setup_tokens / auth_throttle / client_payments /
-- push_subscriptions / posts: no policies — service_role only (deny by default).


-- ============================================================================
-- §6  STORAGE — kas photo proof (Premium)
-- ============================================================================
insert into storage.buckets (id, name, public)
  values ('kas-photos', 'kas-photos', true)
  on conflict (id) do nothing;

drop policy if exists "kas photos insert" on storage.objects;
create policy "kas photos insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'kas-photos');

drop policy if exists "kas photos read" on storage.objects;
create policy "kas photos read" on storage.objects
  for select using (bucket_id = 'kas-photos');
