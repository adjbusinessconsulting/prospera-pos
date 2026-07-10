-- ============================================================
-- Server-side enforcement of the per-tier store cap.
-- (The app already caps in the UI; this makes it unbypassable.)
-- Standard = 2, Premium/Business/Enterprise = unlimited, else 1.
-- Run once in Supabase -> SQL Editor.
-- ============================================================

create or replace function public.enforce_store_cap()
returns trigger language plpgsql security definer as $$
declare
  cnt int;
  cap int;
  t   text := lower(coalesce(new.tier, 'free'));
begin
  cap := case t
    when 'premium'    then 2147483647
    when 'business'   then 2147483647
    when 'enterprise' then 2147483647
    when 'standard'   then 2
    else 1
  end;
  select count(*) into cnt from public.stores where owner_id = new.owner_id;
  if cnt >= cap then
    raise exception 'Batas toko untuk paket % tercapai (maks %).', t, cap
      using errcode = 'check_violation';
  end if;
  return new;
end $$;

drop trigger if exists trg_enforce_store_cap on public.stores;
create trigger trg_enforce_store_cap
  before insert on public.stores
  for each row execute function public.enforce_store_cap();
