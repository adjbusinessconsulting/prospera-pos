-- ============================================================
-- kas_entries: allow a new ledger type 'hutang_settle'
-- ------------------------------------------------------------
-- A TUNAI hutang settlement puts real cash in the drawer TODAY, but that
-- money is NOT today's income (cash-basis: income belongs to the bon's day).
-- We record it as its own kas type so it:
--   • counts toward the drawer/laci reconciliation (physical cash today), and
--   • is EXCLUDED from omzet everywhere (it's not a sale).
-- QRIS / Transfer settlements never touch the drawer → no kas entry at all.
--
-- Idempotent: safe to run on the live DB (drops + re-adds the check).
-- Run once: Supabase Dashboard -> SQL Editor.
-- ============================================================

alter table public.kas_entries drop constraint if exists kas_entries_type_check;
alter table public.kas_entries add constraint kas_entries_type_check
  check (type in ('masuk', 'keluar', 'auto', 'hutang_settle'));
