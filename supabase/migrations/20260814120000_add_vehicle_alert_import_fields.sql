-- Source fields and photo references for the vehicle-alert import.
-- Existing rows remain unchanged; imported source rows are identified by source_record_key.
alter table public.vehicle_alerts
  add column if not exists source_record_key text,
  add column if not exists source_sequence integer,
  add column if not exists vehicle_brand text,
  add column if not exists vehicle_model text,
  add column if not exists vehicle_year integer,
  add column if not exists engine_number text,
  add column if not exists chassis_number text,
  add column if not exists watch_status text,
  add column if not exists police_station text,
  add column if not exists police_province text,
  add column if not exists incident_cause text,
  add column if not exists place_type text,
  add column if not exists recovered_at date,
  add column if not exists case_status text,
  add column if not exists security_flag text,
  add column if not exists ry3_ref text,
  add column if not exists ry4_ref text,
  add column if not exists lost_time text,
  add column if not exists religion text,
  add column if not exists photo_urls jsonb not null default '[]'::jsonb,
  add column if not exists source_photo_refs jsonb not null default '[]'::jsonb,
  add column if not exists source_file text,
  add column if not exists imported_at timestamptz;

create unique index if not exists vehicle_alerts_source_record_key_uidx
  on public.vehicle_alerts (source_record_key)
  where source_record_key is not null;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'vehicle-evidence', 'vehicle-evidence', false, 10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set public = false;

drop policy if exists "Authenticated users can view vehicle evidence" on storage.objects;
create policy "Authenticated users can view vehicle evidence"
  on storage.objects for select to authenticated
  using (bucket_id = 'vehicle-evidence');
