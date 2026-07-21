-- ============================================================
-- Consolidated: every optional column the app reads/writes on `stores`.
-- Fixes "column stores.<x> does not exist" errors when only some of the
-- individual migrations were run. All idempotent — safe to run/re-run once.
-- ============================================================

alter table public.stores add column if not exists status              text    not null default 'active';
alter table public.stores add column if not exists tier_expires_at     date;
alter table public.stores add column if not exists inventory_enabled   boolean not null default true;
alter table public.stores add column if not exists low_stock_threshold integer not null default 5;
alter table public.stores add column if not exists receipt_logo        text;
alter table public.stores add column if not exists qris_image_url      text;
alter table public.stores add column if not exists midtrans_client_key text;
alter table public.stores add column if not exists settings            jsonb   not null default '{}'::jsonb;
alter table public.stores add column if not exists settings_locked     boolean not null default false;
alter table public.stores add column if not exists add_ons             text[]  not null default '{}';
