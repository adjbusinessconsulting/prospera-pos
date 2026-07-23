-- "Buka Toko" records: the opening cash float (modal awal) + when the store was
-- opened for the day. One row per business day per store. localStorage on the
-- device is the source of truth during the day; this table is the durable /
-- cross-device mirror (best-effort upsert). Owner-scoped RLS via
-- stores.owner_id = auth.uid(), same as shift_closings.
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
