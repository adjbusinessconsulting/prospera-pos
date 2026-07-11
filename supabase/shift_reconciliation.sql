-- ============================================================
-- Store the optional Tutup-Shift reconciliation result on the shift.
-- Run once in Supabase -> SQL Editor.
-- ============================================================

alter table public.shifts add column if not exists selisih_type   text;      -- 'cocok' | 'lebih' | 'kurang'
alter table public.shifts add column if not exists selisih_amount integer;   -- absolute selisih (0 when cocok)
