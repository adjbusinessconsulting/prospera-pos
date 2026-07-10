-- ============================================================
-- KAS ENTRIES — cash in/out ledger (Standard+)
-- Matches the LIVE model: RLS via stores.owner_id = auth.uid()
-- (same pattern as activity_logs_rls.sql). NOT the tenants model
-- in schema.sql (that file is a stale reference, never deployed).
-- Run once: Supabase Dashboard -> SQL Editor.
-- ============================================================

create table if not exists public.kas_entries (
  id            uuid primary key default gen_random_uuid(),
  store_id      uuid not null references public.stores(id) on delete cascade,
  cashier_name  text,
  shift         integer,                              -- 1|2|3 (matches sales.shift)
  type          text not null check (type in ('masuk','keluar','auto')),
  amount        integer not null check (amount >= 0), -- always positive; sign from type
  label         text not null,
  description   text,
  photo_url     text,                                 -- kas-photos bucket (Premium)
  created_at    timestamptz not null default now()
);

create index if not exists idx_kas_store_date on public.kas_entries(store_id, created_at desc);

alter table public.kas_entries enable row level security;

drop policy if exists kas_entries_insert on public.kas_entries;
create policy kas_entries_insert on public.kas_entries
  for insert to authenticated
  with check (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()));

drop policy if exists kas_entries_select on public.kas_entries;
create policy kas_entries_select on public.kas_entries
  for select to authenticated
  using (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()));

-- No update/delete policies on purpose: kas is an append-only ledger.

-- ── Storage bucket for kas photo proof (Premium) ──
insert into storage.buckets (id, name, public)
  values ('kas-photos', 'kas-photos', true)
  on conflict (id) do nothing;

-- Owners can upload to their own store's folder; anyone can read (public bucket).
drop policy if exists "kas photos insert" on storage.objects;
create policy "kas photos insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'kas-photos');

drop policy if exists "kas photos read" on storage.objects;
create policy "kas photos read" on storage.objects
  for select using (bucket_id = 'kas-photos');
