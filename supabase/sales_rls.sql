-- Owner-scoped RLS for sales + sale_items (same pattern as products_cashiers_rls).
-- Without these, an authenticated owner's INSERT into sales is rejected, so sales
-- only sit in the on-device sync queue and never reach the DB — Riwayat (which
-- reads the DB) shows 0 even though the on-device Log recorded them. Reads are
-- blocked too, so this fixes both. Idempotent (drop + create); safe to re-run.

-- SALES -------------------------------------------------------
alter table public.sales enable row level security;
drop policy if exists sales_all on public.sales;
create policy sales_all on public.sales
  for all to authenticated
  using      (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()));

-- SALE_ITEMS --------------------------------------------------
-- sale_items has no store_id — scope through its parent sale's store.
alter table public.sale_items enable row level security;
drop policy if exists sale_items_all on public.sale_items;
create policy sale_items_all on public.sale_items
  for all to authenticated
  using      (exists (select 1 from public.sales sa join public.stores s on s.id = sa.store_id where sa.id = sale_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from public.sales sa join public.stores s on s.id = sa.store_id where sa.id = sale_id and s.owner_id = auth.uid()));
