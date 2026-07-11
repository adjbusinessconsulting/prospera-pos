-- ============================================================
-- Structured upgrade-request payload on the feedback (Layanan) table.
-- Run once in Supabase -> SQL Editor.
-- ============================================================

alter table public.feedback add column if not exists requested_tier   text;      -- 'standard' | 'premium' | ...
alter table public.feedback add column if not exists requested_addons text[];    -- e.g. {inventori,crm}
