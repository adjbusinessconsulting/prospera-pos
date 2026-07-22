-- Shift-closing snapshots (Tutup Toko notas), so an owner can review a day's
-- close — even one that was auto-closed because they forgot. One row per business
-- day per store. Owner-scoped RLS via stores.owner_id = auth.uid().
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
  expected      integer not null default 0,   -- drawer seharusnya
  counted       integer,                       -- physical count (null = not reconciled)
  selisih       integer,                       -- counted − expected (null if not counted)
  reconciled    boolean not null default false,
  auto_closed   boolean not null default false,
  breakdown     jsonb   not null default '{}'::jsonb,  -- per-method totals
  created_at    timestamptz not null default now(),
  unique (store_id, business_date)
);

alter table public.shift_closings enable row level security;
drop policy if exists shift_closings_all on public.shift_closings;
create policy shift_closings_all on public.shift_closings
  for all to authenticated
  using      (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()));
