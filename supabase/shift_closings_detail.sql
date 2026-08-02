-- Nota Tutup Shift: store the parts behind "seharusnya di laci".
--
-- saveShiftClosing() computed cash / kas masuk / kas keluar / pelunasan hutang and
-- then wrote only their net result, so the nota stated a drawer total it could not
-- justify. New hutang was never carried at all.
--
-- Additive and idempotent: existing rows keep NULL (the UI hides a line it has no
-- value for), and an older POS build writing without these columns still works.

alter table public.shift_closings
  add column if not exists cash          numeric default 0,
  add column if not exists kas_masuk     numeric default 0,
  add column if not exists kas_keluar    numeric default 0,
  add column if not exists hutang_settle numeric default 0,
  add column if not exists piutang_baru  numeric default 0;

-- Verify — expect 5 rows.
select column_name, data_type, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'shift_closings'
  and column_name in ('cash','kas_masuk','kas_keluar','hutang_settle','piutang_baru')
order by column_name;
