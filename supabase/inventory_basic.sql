-- Sterith · Basic Inventori daily ledger (per product)
-- Model:  stok_awal + stok_tambahan − stok_terjual = sisa
--         `stock` holds the live SISA (already shown on POS items).
--         At the first login of a new day, sisa rolls into stok_awal and the
--         tambahan/terjual counters reset (handled in the app).
-- Run once in Supabase (SQL Editor). Safe to re-run.

alter table public.products add column if not exists stock_awal     integer not null default 0;
alter table public.products add column if not exists stock_tambahan integer not null default 0;
alter table public.products add column if not exists stock_terjual  integer not null default 0;
alter table public.products add column if not exists stock_date      date;
