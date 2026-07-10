-- ============================================================
-- HUTANG (customer credit / bon) — customers + debt ledger
-- Live model: RLS via stores.owner_id = auth.uid()
-- Run once: Supabase Dashboard -> SQL Editor.
-- ============================================================

-- ── Customers (optional, created inline at checkout) ──
create table if not exists public.customers (
  id          uuid primary key default gen_random_uuid(),
  store_id    uuid not null references public.stores(id) on delete cascade,
  name        text not null,
  phone       text,
  created_at  timestamptz not null default now()
);
create index if not exists idx_customers_store on public.customers(store_id, name);

-- ── Hutang ledger ──
-- Self-contained: snapshots customer_name + amount so a debt survives even if
-- the underlying sale is deleted by the retention cron (retention exemption).
create table if not exists public.hutang (
  id             uuid primary key default gen_random_uuid(),
  store_id       uuid not null references public.stores(id) on delete cascade,
  sale_id        uuid,                                  -- loose ref (sale may age out)
  customer_id    uuid references public.customers(id) on delete set null,
  customer_name  text not null,                         -- snapshot
  phone          text,
  amount         integer not null check (amount >= 0),  -- original debt
  paid_amount    integer not null default 0 check (paid_amount >= 0),
  status         text not null default 'open' check (status in ('open','partial','lunas')),
  cashier_name   text,
  created_at     timestamptz not null default now(),
  settled_at     timestamptz
);
create index if not exists idx_hutang_store_status on public.hutang(store_id, status, created_at desc);
create index if not exists idx_hutang_customer on public.hutang(customer_id);

alter table public.customers enable row level security;
alter table public.hutang    enable row level security;

-- Customers: full access to your own store's rows
drop policy if exists customers_all on public.customers;
create policy customers_all on public.customers
  for all to authenticated
  using       (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()))
  with check  (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()));

-- Hutang: insert + read + UPDATE (for settlement). No delete (ledger integrity).
drop policy if exists hutang_insert on public.hutang;
create policy hutang_insert on public.hutang
  for insert to authenticated
  with check (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()));

drop policy if exists hutang_select on public.hutang;
create policy hutang_select on public.hutang
  for select to authenticated
  using (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()));

drop policy if exists hutang_update on public.hutang;
create policy hutang_update on public.hutang
  for update to authenticated
  using       (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()))
  with check  (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()));
