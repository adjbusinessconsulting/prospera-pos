-- Sterith · Transaction history retention cleanup
-- Deletes sales (and their sale_items) older than each store's tier window,
-- measured in WHOLE CALENDAR DAYS in WITA (Asia/Makassar, Palu time):
--   Free       1 day  → a sale is kept through the NEXT day 23:59, then purged
--   Standard   30 days
--   Premium    90 days
--   Business   1095 days
--   Enterprise 1825 days
--
-- Example (Free): a sale on 8 Jul is kept all of 9 Jul (until 23:59) and removed
-- at the next run on 10 Jul — so you always see today + yesterday.
--
-- ⚠️ THIS PERMANENTLY DELETES OLD TRANSACTIONS. Run STEP 1 + 2 (functions) first,
--    check STEP 3 (dry-run) to see what WOULD be deleted, and only then enable the
--    nightly schedule in STEP 4.

-- ── STEP 1: retention window per tier (calendar days) ──────────────────────────
create or replace function public.retention_days(p_tier text)
returns int language sql immutable as $$
  select case lower(coalesce(p_tier, 'free'))
    when 'free'       then 1
    when 'standard'   then 30
    when 'premium'    then 90
    when 'business'   then 1095
    when 'enterprise' then 1825
    else 1 end;
$$;

-- ── STEP 1b: LAPSE GRACE — effective keep-days per store ───────────────────────
-- When a paid subscription lapses (tier_expires_at in the past) data is FROZEN,
-- not deleted, for 30 days. Renew within the month → everything restored. After
-- 30 days lapsed → Free retention (1 day) applies.
create or replace function public.effective_keep_days(p_tier text, p_expires timestamptz)
returns int language sql stable as $$
  select case
    -- active (no expiry, or not yet expired): normal tier window
    when p_expires is null
      or (p_expires at time zone 'Asia/Makassar')::date >= (now() at time zone 'Asia/Makassar')::date
      then public.retention_days(p_tier)
    -- lapsed but within the 30-day freeze: keep everything
    when (now() at time zone 'Asia/Makassar')::date
      <= ((p_expires at time zone 'Asia/Makassar')::date + 30)
      then 100000
    -- lapsed > 30 days: Free retention
    else 1
  end;
$$;

-- ── STEP 2: the cleanup (sale_items first, then sales) ─────────────────────────
-- Keeps a sale while its WITA date >= today(WITA) − effective_keep_days; deletes older.
create or replace function public.expire_old_sales()
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from public.sale_items si
  using public.sales s
  join public.stores st on st.id = s.store_id
  where si.sale_id = s.id
    and (s.created_at at time zone 'Asia/Makassar')::date
        < ((now() at time zone 'Asia/Makassar')::date - public.effective_keep_days(st.tier, st.tier_expires_at));

  delete from public.sales s
  using public.stores st
  where st.id = s.store_id
    and (s.created_at at time zone 'Asia/Makassar')::date
        < ((now() at time zone 'Asia/Makassar')::date - public.effective_keep_days(st.tier, st.tier_expires_at));
end $$;

-- ── STEP 3: DRY RUN — how many sales WOULD be deleted (run this to review) ──────
-- select st.name, st.tier, public.retention_days(st.tier) as keep_days,
--        count(s.id) as sales_to_delete
-- from public.sales s
-- join public.stores st on st.id = s.store_id
-- where (s.created_at at time zone 'Asia/Makassar')::date
--       < ((now() at time zone 'Asia/Makassar')::date - public.retention_days(st.tier))
-- group by st.name, st.tier
-- order by sales_to_delete desc;

-- ── STEP 4: schedule nightly (00:05 WITA = 16:05 UTC). Uncomment to ENABLE. ─────
-- create extension if not exists pg_cron;
-- select cron.unschedule('expire-old-sales')
--   where exists (select 1 from cron.job where jobname = 'expire-old-sales');
-- select cron.schedule('expire-old-sales', '5 16 * * *', $$ select public.expire_old_sales(); $$);

-- To run the cleanup once manually (instead of / before scheduling):
--   select public.expire_old_sales();
