-- Sterith · Basic Inventori settings on stores
-- inventory_enabled: owner's ON/OFF toggle (Premium). OFF = no stock display / alerts.
-- low_stock_threshold: global low-stock alert level (per-item override can come later).
-- Run once in Supabase (SQL Editor). Safe to re-run.

alter table public.stores add column if not exists inventory_enabled boolean not null default true;
alter table public.stores add column if not exists low_stock_threshold integer not null default 5;
