-- Single active POS device per store ("last login wins"). On login/store-entry a
-- device stamps its id here; other devices notice they're no longer current and
-- sign themselves out. Free/Standard/Premium POS are all 1 device (Premium also
-- gets Back Office, a separate app). Owner-scoped via stores.owner_id = auth.uid().
alter table public.stores add column if not exists active_device_id text;
alter table public.stores add column if not exists active_device_at timestamptz;

-- The device lock needs the owner to UPDATE their own store row. Add an explicit
-- owner UPDATE policy (idempotent; permissive policies OR with any existing ones).
drop policy if exists stores_owner_update on public.stores;
create policy stores_owner_update on public.stores
  for update to authenticated
  using      (owner_id = auth.uid())
  with check (owner_id = auth.uid());
