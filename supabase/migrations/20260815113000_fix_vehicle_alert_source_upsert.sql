-- PostgREST's `on_conflict=source_record_key` cannot target the old partial
-- unique index.  A normal UNIQUE constraint still permits multiple NULLs and
-- makes vehicle-alert imports idempotent through the REST API.
drop index if exists public.vehicle_alerts_source_record_key_uidx;

alter table public.vehicle_alerts
  drop constraint if exists vehicle_alerts_source_record_key_key;

alter table public.vehicle_alerts
  add constraint vehicle_alerts_source_record_key_key unique (source_record_key);
