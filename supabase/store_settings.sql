-- ============================================================
-- POS feature settings (Pengaturan) — per-store toggles.
-- See §14 of the Tiers doc. Toggles gate NEW-entry surfaces only.
--   settings        → jsonb bag of feature flags (see src/settings.ts)
--   settings_locked → Premium master lock: when true the POS hides its
--                     Pengaturan surface and settings are managed only from
--                     the Back Office.
-- Idempotent. Run once: Supabase Dashboard -> SQL Editor.
-- ============================================================

alter table public.stores add column if not exists settings jsonb not null default '{}'::jsonb;
alter table public.stores add column if not exists settings_locked boolean not null default false;
