-- Product photos had nowhere to live.
--
-- Produk.tsx read the file as a base64 data URL, put it in local state (so it
-- appeared instantly) and then saved the product to Supabase WITHOUT it — there
-- was no column to save it to. The photo survived until the next load from the
-- server, then vanished. That is the "picture is gone after a while" report.
--
-- Stored as a URL into Storage rather than base64 in the row: the product list is
-- fetched on every login and on every refresh, and a dozen phone photos inlined as
-- text would make that download tens of megabytes on a phone.
--
-- Mirrors the kas-photos bucket that already exists.

alter table public.products
  add column if not exists photo_url text;

insert into storage.buckets (id, name, public)
  values ('product-photos', 'product-photos', true)
  on conflict (id) do nothing;

drop policy if exists "product photos insert" on storage.objects;
create policy "product photos insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'product-photos');

drop policy if exists "product photos update" on storage.objects;
create policy "product photos update" on storage.objects
  for update to authenticated using (bucket_id = 'product-photos');

drop policy if exists "product photos read" on storage.objects;
create policy "product photos read" on storage.objects
  for select using (bucket_id = 'product-photos');

-- Verify — expect one column row and one bucket row.
select column_name, data_type from information_schema.columns
where table_schema = 'public' and table_name = 'products' and column_name = 'photo_url';

select id, public from storage.buckets where id = 'product-photos';
