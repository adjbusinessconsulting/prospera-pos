-- ============================================================
-- Live-model RLS for products, cashiers, shifts — owner-scoped via
-- stores.owner_id = auth.uid() (same pattern as hutang / kas_entries).
-- Without these, an owner's INSERT is rejected and the product/cashier only
-- lives in memory for the session, then disappears on next login.
-- Idempotent (drop + create). Safe to run once.
-- ============================================================

-- PRODUCTS ----------------------------------------------------
alter table public.products enable row level security;
drop policy if exists products_all on public.products;
create policy products_all on public.products
  for all to authenticated
  using      (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()));

-- CASHIERS ----------------------------------------------------
alter table public.cashiers enable row level security;
drop policy if exists cashiers_all on public.cashiers;
create policy cashiers_all on public.cashiers
  for all to authenticated
  using      (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()));

-- SHIFTS ------------------------------------------------------
alter table public.shifts enable row level security;
drop policy if exists shifts_all on public.shifts;
create policy shifts_all on public.shifts
  for all to authenticated
  using      (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()));
