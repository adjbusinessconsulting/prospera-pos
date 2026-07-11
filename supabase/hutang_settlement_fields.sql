-- Hutang settlement fields
-- Adds the columns the new "pelunasan sekaligus" (one-shot full settlement) flow needs:
--   trx_id         → links a bon back to its original sale/transaction number
--   settled_method → how the debt was finally paid (tunai / qris / transfer)
--   settled_at     → already added earlier; kept here idempotently for fresh DBs
--
-- Accounting note (no code impact): a settled hutang counts as omzet on the day
-- its bon was created (created_at), never on the day it was paid — so settling an
-- old debt never moves "today". No installments: a bon is settled in full at once.

alter table public.hutang add column if not exists trx_id text;
alter table public.hutang add column if not exists settled_method text;
alter table public.hutang add column if not exists settled_at timestamptz;
