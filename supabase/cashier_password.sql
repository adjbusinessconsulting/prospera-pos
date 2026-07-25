-- Optional manager password for POS manager-override approvals (Phase 2). A cashier
-- with role 'manajer' (or the owner) can approve gated actions with this password when
-- the store's approvalMethod is 'password'. Nullable; PIN approval ignores it.
alter table public.cashiers add column if not exists password text;
