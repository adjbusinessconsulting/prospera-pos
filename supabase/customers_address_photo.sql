-- Optional customer details captured with a hutang: house address + a photo
-- (stored as a data URL). Idempotent — safe to run once.
alter table public.customers add column if not exists address text;
alter table public.customers add column if not exists photo   text;
