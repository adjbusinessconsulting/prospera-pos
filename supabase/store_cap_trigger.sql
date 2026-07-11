-- ============================================================
-- Server-side store cap. Base tiers include 1 store (Free/Standard/Premium);
-- EXTRA stores are a PAID add-on provisioned by Master Office (Standard +50rb,
-- Premium +70rb each). So:
--   • Self-serve owner inserts (auth.uid() = owner) are capped to 1.
--   • Master Office (service role, auth.uid() IS NULL) BYPASSES the cap so it
--     can provision the paid extra stores.
--   • Business/Enterprise: unlimited.
-- Run once in Supabase -> SQL Editor.
-- ============================================================

create or replace function public.enforce_store_cap()
returns trigger language plpgsql security definer as $$
declare
  cnt int;
  cap int;
  t   text := lower(coalesce(new.tier, 'free'));
begin
  -- Master Office provisions paid extras via the service role (no auth.uid()).
  if auth.uid() is null then
    return new;
  end if;

  cap := case t
    when 'business'   then 2147483647
    when 'enterprise' then 2147483647
    else 1   -- free / standard / premium each include 1; extras are paid add-ons
  end;

  select count(*) into cnt from public.stores where owner_id = new.owner_id;
  if cnt >= cap then
    raise exception 'Batas toko untuk paket % tercapai. Tambah toko adalah add-on berbayar (hubungi Sterith).', t
      using errcode = 'check_violation';
  end if;
  return new;
end $$;

drop trigger if exists trg_enforce_store_cap on public.stores;
create trigger trg_enforce_store_cap
  before insert on public.stores
  for each row execute function public.enforce_store_cap();
