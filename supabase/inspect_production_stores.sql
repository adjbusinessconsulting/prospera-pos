-- What is actually in the PRODUCTION stores table, and what hangs off each store.
--
-- Read-only. Run this BEFORE deleting anything — the point is to see the blast
-- radius, and to find out who owns each store, since deleting a client in Master
-- Office removes every app on that email (see the Health incident).

-- 1. Every store, with its owner's email and tier.
select
  s.id,
  s.name,
  s.tier,
  s.created_at::date as dibuat,
  u.email as pemilik
from public.stores s
left join auth.users u on u.id = s.owner_id
order by s.created_at;

-- 2. How much data each store carries. A store with 0 everywhere is safe to drop;
--    anything with sales is worth a second look before it goes.
select
  s.name,
  (select count(*) from public.sales      where store_id = s.id) as sales,
  (select count(*) from public.products   where store_id = s.id) as produk,
  (select count(*) from public.hutang     where store_id = s.id) as hutang,
  (select count(*) from public.kas_entries where store_id = s.id) as kas,
  (select count(*) from public.cashiers   where store_id = s.id) as kasir
from public.stores s
order by s.name;

-- 3. Which tenants own which apps — so you can see, before deleting anyone,
--    whether that email also carries Health or Studio.
select email, full_name, status, apps
from public.tenants
order by created_at;
