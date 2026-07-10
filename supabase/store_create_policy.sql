-- ============================================================
-- Allow an owner to create their own store from the POS
-- (multi-outlet: Standard 2, Premium ∞ — capped client-side).
-- Run once if in-app "Buat Toko Baru" returns a permission error.
-- Does NOT toggle RLS (so it can't accidentally lock existing reads);
-- it only adds the insert policy.
-- ============================================================

drop policy if exists stores_owner_insert on public.stores;
create policy stores_owner_insert on public.stores
  for insert to authenticated
  with check (owner_id = auth.uid());

-- ⚠️ SECURITY FOLLOW-UP: the per-tier store cap (Standard = 2) is currently
-- enforced only in the app. To hard-enforce it, add a BEFORE INSERT trigger that
-- rejects when the owner already has >= cap stores for their tier.
