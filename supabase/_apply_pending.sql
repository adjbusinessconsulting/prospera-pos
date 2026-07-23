-- ============================================================================
-- APPLY PENDING MIGRATIONS — paste this whole file into the Supabase SQL editor
-- once and hit Run. It contains every not-yet-applied migration, in order.
-- Safe to re-run: everything uses "if not exists" / "drop policy if exists", so
-- running it again is a no-op. (Does NOT include schema.sql or demo seeds.)
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1) day_opens — "Buka Toko" opening cash (modal awal) per business day
-- ---------------------------------------------------------------------------
create table if not exists public.day_opens (
  id            uuid primary key default gen_random_uuid(),
  store_id      uuid not null references public.stores(id) on delete cascade,
  business_date date not null,
  modal_awal    integer not null default 0,   -- opening cash in the drawer
  opened_at     timestamptz not null default now(),
  opened_by     text,                          -- cashier who opened
  created_at    timestamptz not null default now(),
  unique (store_id, business_date)
);

alter table public.day_opens enable row level security;
drop policy if exists day_opens_all on public.day_opens;
create policy day_opens_all on public.day_opens
  for all to authenticated
  using      (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()));


-- ---------------------------------------------------------------------------
-- 2) device_lock — single active POS device per store (last login wins)
-- ---------------------------------------------------------------------------
alter table public.stores add column if not exists active_device_id text;
alter table public.stores add column if not exists active_device_at timestamptz;

drop policy if exists stores_owner_update on public.stores;
create policy stores_owner_update on public.stores
  for update to authenticated
  using      (owner_id = auth.uid())
  with check (owner_id = auth.uid());


-- ---------------------------------------------------------------------------
-- 3) sales + sale_items RLS — owner-scoped. WITHOUT THIS, sales never reach the
--    DB (rejected insert) so Riwayat shows 0 even though the Log recorded them.
-- ---------------------------------------------------------------------------
alter table public.sales enable row level security;
drop policy if exists sales_all on public.sales;
create policy sales_all on public.sales
  for all to authenticated
  using      (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()));

alter table public.sale_items enable row level security;
drop policy if exists sale_items_all on public.sale_items;
create policy sale_items_all on public.sale_items
  for all to authenticated
  using      (exists (select 1 from public.sales sa join public.stores s on s.id = sa.store_id where sa.id = sale_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from public.sales sa join public.stores s on s.id = sa.store_id where sa.id = sale_id and s.owner_id = auth.uid()));
