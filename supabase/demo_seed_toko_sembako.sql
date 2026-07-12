-- ============================================================
-- DEMO SEED — "Toko Sembako" (Back Office + POS demo store)
-- ------------------------------------------------------------
-- Makes the demo Toko Sembako fully functional & Premium so you can log into
-- BOTH the Back Office and the POS with the demo account and see real data.
--
-- • Targets the store BY NAME (ilike 'Toko Sembako%') — no UUID needed.
-- • Idempotent: wipes this store's demo children, then reseeds. Safe to re-run.
-- • Does NOT touch owner_id (your demo login stays), and never touches any other
--   store (Toko Kopi Cinta is untouched).
-- • One transaction — all-or-nothing.
--
-- Run once in Supabase → SQL Editor. If it says the store isn't found, sign up
-- the demo account in the app first (that creates the store), then run again.
-- ============================================================

begin;

-- Ensure the columns this seed touches exist (idempotent — safe if migrations
-- already ran). Covers store_settings.sql, tier expiry, shift session, hutang fields.
alter table public.stores  add column if not exists settings jsonb not null default '{}'::jsonb;
alter table public.stores  add column if not exists settings_locked boolean not null default false;
alter table public.stores  add column if not exists tier_expires_at date;
alter table public.shifts   add column if not exists modal_awal integer;
alter table public.shifts   add column if not exists opened_at timestamptz;
alter table public.shifts   add column if not exists closed_at timestamptz;
alter table public.hutang   add column if not exists trx_id text;
alter table public.hutang   add column if not exists settled_method text;
alter table public.hutang   add column if not exists settled_at timestamptz;
-- Ensure kas 'hutang_settle' type is allowed (kas_hutang_settle_type.sql).
alter table public.kas_entries drop constraint if exists kas_entries_type_check;
alter table public.kas_entries add constraint kas_entries_type_check check (type in ('masuk','keluar','auto','hutang_settle'));

-- 0) Guard: the demo store must exist.
do $$
begin
  if not exists (select 1 from public.stores where name ilike 'Toko Sembako%') then
    raise exception 'Demo store "Toko Sembako" tidak ditemukan. Daftar dulu akun demo di aplikasi, lalu jalankan lagi.';
  end if;
end $$;

-- 1) Premium + default settings (unlock everything in POS + Back Office).
update public.stores s
set tier = 'premium',
    tier_expires_at = (now() + interval '365 days')::date,
    settings = '{}'::jsonb,
    settings_locked = false
where s.id = (select id from public.stores where name ilike 'Toko Sembako%' order by created_at limit 1);

-- 2) Reset this store's demo children (scoped — only the demo store).
delete from public.sale_items where sale_id in (
  select id from public.sales where store_id = (select id from public.stores where name ilike 'Toko Sembako%' order by created_at limit 1));
delete from public.sales     where store_id = (select id from public.stores where name ilike 'Toko Sembako%' order by created_at limit 1);
delete from public.kas_entries where store_id = (select id from public.stores where name ilike 'Toko Sembako%' order by created_at limit 1);
delete from public.hutang    where store_id = (select id from public.stores where name ilike 'Toko Sembako%' order by created_at limit 1);
delete from public.products  where store_id = (select id from public.stores where name ilike 'Toko Sembako%' order by created_at limit 1);
delete from public.cashiers  where store_id = (select id from public.stores where name ilike 'Toko Sembako%' order by created_at limit 1);
delete from public.shifts    where store_id = (select id from public.stores where name ilike 'Toko Sembako%' order by created_at limit 1);

-- 3) Cashiers.
insert into public.cashiers (id, store_id, name, initials, role, pin, active)
select gen_random_uuid(), st.id, v.name, v.ini, 'kasir', v.pin, true
from (select id from public.stores where name ilike 'Toko Sembako%' order by created_at limit 1) st,
     (values ('Aerith D.','AE','1234'), ('Stevany C.','ST','5678')) as v(name, ini, pin);

-- 4) Open shift (gives POS a modal awal for Kas / Tutup Toko).
insert into public.shifts (id, store_id, name, start_time, end_time, modal_awal, opened_at)
select 'demo-shift-siang', st.id, 'Shift Siang', '14:00', '22:00', 500000, now()
from (select id from public.stores where name ilike 'Toko Sembako%' order by created_at limit 1) st;

-- 5) Products (12).
insert into public.products (id, store_id, name, category, unit, price, stock, active, threshold, warehouse_qty, store_qty, sold_today)
select 'SMBK-'||v.sku, st.id, v.name, v.cat, v.unit, v.price, v.stk, true, v.thr, v.wh, v.stq, v.sold
from (select id from public.stores where name ilike 'Toko Sembako%' order by created_at limit 1) st,
(values
  ('BRS001','Beras Pandan 5kg','Sembako','karung',75000,40,20,42,40,6),
  ('MNY008','Bimoli 2L','Sembako','botol',38000,24,20,18,24,4),
  ('SSU012','Susu Bendera 1L','Sembako','botol',22000,3,12,5,3,5),
  ('MIE003','Indomie Goreng','Snack','pcs',3500,128,60,300,128,40),
  ('AIR011','Aqua 600ml','Minuman','botol',4000,64,50,240,64,30),
  ('TLR004','Telur Ayam 1kg','Sembako','kg',28000,6,12,20,6,5),
  ('GLA006','Gula Pasir 1kg','Sembako','plastik',14500,8,12,52,8,9),
  ('TEH015','Teh Pucuk 350ml','Minuman','botol',5000,52,40,180,52,22),
  ('KOP021','Kopi Kapal Api','Minuman','renceng',12000,24,20,90,24,8),
  ('KEC031','Kecap Bango 220ml','Sembako','botol',9500,0,10,14,0,3),
  ('RKK051','Rokok Sampoerna','Rokok','bungkus',28000,34,30,120,34,18),
  ('SBN061','Sabun Lifebuoy','Sembako','pcs',4500,22,15,60,22,6)
) as v(sku, name, cat, unit, price, stk, thr, wh, stq, sold);

-- 6) Sales (40, single-item each) spread over the last 5 days + their sale_items.
with st as (select id from public.stores where name ilike 'Toko Sembako%' order by created_at limit 1),
cash as (select id, initials, name from public.cashiers where store_id = (select id from st)),
p as (
  select id, name, price, (row_number() over (order by id)) - 1 as rn, count(*) over () as cnt
  from public.products where store_id = (select id from st)
),
gen as (
  select g,
    'TRX-'||lpad((1000 + g)::text, 4, '0') as trx_id,
    case when g % 2 = 0 then 'AE' else 'ST' end as ini,
    case when g % 6 = 0 then 'qris' when g % 9 = 0 then 'transfer' else 'tunai' end as method,
    (now() - make_interval(days => (g % 5)) - make_interval(mins => g * 7)) as created_at,
    (g % (select cnt from p limit 1)) as pick,
    (1 + (g % 3)) as qty
  from generate_series(1, 40) g
),
ins as (
  insert into public.sales (store_id, trx_id, cashier_id, cashier_name, shift, total, payment_method, cash_received, change_amount, created_at)
  select (select id from st), gen.trx_id, c.id, c.name, 2,
         pr.price * gen.qty, gen.method,
         case when gen.method = 'tunai' then pr.price * gen.qty else null end, 0, gen.created_at
  from gen
  join p pr on pr.rn = gen.pick
  join cash c on c.initials = gen.ini
  returning id, trx_id
)
insert into public.sale_items (sale_id, product_id, product_name, price, qty, subtotal)
select ins.id, pr.id, pr.name, pr.price, gen.qty, pr.price * gen.qty
from ins
join gen on gen.trx_id = ins.trx_id
join p pr on pr.rn = gen.pick;

-- 7) Hutang (2 open + 1 lunas).
insert into public.hutang (store_id, trx_id, customer_name, phone, amount, paid_amount, status, cashier_name, created_at, settled_at, settled_method)
select st.id, v.trx, v.cust, v.phone, v.amt, v.paid, v.status, 'Aerith D.', now() - make_interval(days => v.dago), v.settled, v.method
from (select id from public.stores where name ilike 'Toko Sembako%' order by created_at limit 1) st,
(values
  ('TRX-9001','Bu Sari (warung sebelah)','0812-3456-7890',185000,0,'open',2, null::timestamptz, null::text),
  ('TRX-9002','Ibu Ratna',null,32000,0,'open',1, null, null),
  ('TRX-9003','Pak Budi','0813-1111-2222',90000,90000,'lunas',6, now(), 'tunai')
) as v(trx, cust, phone, amt, paid, status, dago, settled, method);

-- 8) Kas entries (modal comes from the shift; here: masuk / keluar / hutang_settle).
insert into public.kas_entries (store_id, cashier_name, shift, type, amount, label, created_at)
select st.id, 'Aerith D.', 2, v.type, v.amt, v.label, now() - make_interval(hours => v.hago)
from (select id from public.stores where name ilike 'Toko Sembako%' order by created_at limit 1) st,
(values
  ('masuk', 200000, 'Setoran modal tambahan', 6),
  ('keluar', 100000, 'Beli es batu', 3),
  ('keluar', 15000, 'Bayar parkir & retribusi', 2),
  ('hutang_settle', 90000, 'Pelunasan bon TRX-9003 — Pak Budi', 1)
) as v(type, amt, label, hago);

commit;
