-- Sterith · Custom receipt logo (Standard+)
-- Stores the owner's logo as a data URL (embedded on the receipt). Free keeps the
-- Sterith mark; Standard/Premium show this logo + "Powered by Sterith".
-- Run once in Supabase (SQL Editor). Safe to re-run.

alter table public.stores add column if not exists receipt_logo text;
