-- System-wide audit timeline for operational records.
-- Sensitive credentials and identification values are intentionally excluded.

create table if not exists public.system_audit_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  actor_id uuid references public.profiles(id) on delete set null,
  actor_email text,
  actor_name text,
  actor_role text,
  module_key text not null,
  module_label text not null,
  action text not null check (action in ('CREATE', 'UPDATE', 'DELETE')),
  entity_table text not null,
  entity_id text,
  entity_label text,
  before_data jsonb,
  after_data jsonb
);

create index if not exists system_audit_logs_created_at_idx
  on public.system_audit_logs (created_at desc);
create index if not exists system_audit_logs_module_key_idx
  on public.system_audit_logs (module_key, created_at desc);
create index if not exists system_audit_logs_actor_id_idx
  on public.system_audit_logs (actor_id, created_at desc);

alter table public.system_audit_logs enable row level security;

drop policy if exists system_audit_logs_admin_read on public.system_audit_logs;
create policy system_audit_logs_admin_read on public.system_audit_logs
  for select to authenticated
  using ((select public.current_app_role()) = 'ADMIN');

revoke all on public.system_audit_logs from anon;
revoke all on public.system_audit_logs from authenticated;
grant select on public.system_audit_logs to authenticated;

create or replace function public.audit_redact_payload(payload jsonb)
returns jsonb
language sql
immutable
set search_path = public, pg_temp
as $$
  select coalesce(payload, '{}'::jsonb) - array[
    'camera_password', 'password', 'camera_user', 'user',
    'password_hash', 'token', 'access_token', 'refresh_token',
    'national_id', 'raw_data'
  ];
$$;

create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_record jsonb;
  v_before jsonb;
  v_after jsonb;
  v_actor_id uuid := auth.uid();
  v_actor_email text;
  v_actor_name text;
  v_actor_role text;
  v_entity_label text;
begin
  if tg_op = 'DELETE' then
    v_record := to_jsonb(old);
    v_before := public.audit_redact_payload(v_record);
    v_after := null;
  elsif tg_op = 'INSERT' then
    v_record := to_jsonb(new);
    v_before := null;
    v_after := public.audit_redact_payload(v_record);
  else
    v_record := to_jsonb(new);
    v_before := public.audit_redact_payload(to_jsonb(old));
    v_after := public.audit_redact_payload(v_record);
  end if;

  if v_actor_id is not null then
    select p.email,
           coalesce(nullif(p.rank_full_name, ''), nullif(p.full_name, ''), p.username),
           p.role
      into v_actor_email, v_actor_name, v_actor_role
      from public.profiles p
     where p.id = v_actor_id;
  end if;

  v_entity_label := coalesce(
    nullif(v_record ->> 'camera_name', ''), nullif(v_record ->> 'name', ''),
    nullif(v_record ->> 'display_name', ''), nullif(v_record ->> 'checkpoint_name', ''),
    nullif(v_record ->> 'mission_name', ''), nullif(v_record ->> 'case_no', ''),
    nullif(v_record ->> 'subject_code', ''), nullif(v_record ->> 'plate_number', ''),
    nullif(v_record ->> 'uid', ''), nullif(v_record ->> 'id', '')
  );

  insert into public.system_audit_logs (
    actor_id, actor_email, actor_name, actor_role,
    module_key, module_label, action, entity_table, entity_id, entity_label,
    before_data, after_data
  ) values (
    v_actor_id, coalesce(v_actor_email, 'system'), coalesce(v_actor_name, 'ระบบ'),
    coalesce(v_actor_role, 'SYSTEM'), tg_argv[0], tg_argv[1], tg_op,
    tg_table_name, v_record ->> 'id', v_entity_label, v_before, v_after
  );

  return coalesce(new, old);
end;
$$;

revoke all on function public.audit_redact_payload(jsonb) from public;
revoke all on function public.audit_row_change() from public;
revoke execute on function public.audit_redact_payload(jsonb) from anon, authenticated;
revoke execute on function public.audit_row_change() from anon, authenticated;

drop trigger if exists audit_cctv_locations on public.cctv_locations;
create trigger audit_cctv_locations after insert or update or delete on public.cctv_locations
for each row execute function public.audit_row_change('CAMERA', 'ข้อมูลกล้อง CCTV');

drop trigger if exists audit_camera_maintenance_tickets on public.camera_maintenance_tickets;
create trigger audit_camera_maintenance_tickets after insert or update or delete on public.camera_maintenance_tickets
for each row execute function public.audit_row_change('MAINTENANCE', 'แจ้งซ่อมและบำรุงรักษา');

drop trigger if exists audit_camera_inspections on public.camera_inspections;
create trigger audit_camera_inspections after insert or update or delete on public.camera_inspections
for each row execute function public.audit_row_change('INSPECTION', 'บันทึกตรวจสภาพกล้อง');

drop trigger if exists audit_incidents on public.incidents;
create trigger audit_incidents after insert or update or delete on public.incidents
for each row execute function public.audit_row_change('INCIDENT', 'บันทึกเหตุการณ์');

drop trigger if exists audit_critical_infrastructure on public.critical_infrastructure;
create trigger audit_critical_infrastructure after insert or update or delete on public.critical_infrastructure
for each row execute function public.audit_row_change('ECONOMIC', 'พื้นที่เศรษฐกิจ');

drop trigger if exists audit_risk_person_records on public.risk_person_records;
create trigger audit_risk_person_records after insert or update or delete on public.risk_person_records
for each row execute function public.audit_row_change('CRIMINAL_PERSON', 'บุคคลที่มีประวัติอาชญากรรม');

drop trigger if exists audit_vehicle_alerts on public.vehicle_alerts;
create trigger audit_vehicle_alerts after insert or update or delete on public.vehicle_alerts
for each row execute function public.audit_row_change('VEHICLE_ALERT', 'รถแจ้งเตือน');

drop trigger if exists audit_vehicle_sightings on public.vehicle_sightings;
create trigger audit_vehicle_sightings after insert or update or delete on public.vehicle_sightings
for each row execute function public.audit_row_change('VEHICLE_SIGHTING', 'บันทึกพบรถ');

drop trigger if exists audit_risk_areas on public.risk_areas;
create trigger audit_risk_areas after insert or update or delete on public.risk_areas
for each row execute function public.audit_row_change('RISK_AREA', 'พื้นที่เสี่ยงและเฝ้าระวัง');

drop trigger if exists audit_checkpoint_logs on public.checkpoint_logs;
create trigger audit_checkpoint_logs after insert or update or delete on public.checkpoint_logs
for each row execute function public.audit_row_change('CHECKPOINT', 'จุดตรวจ');

drop trigger if exists audit_special_operations on public.special_operations;
create trigger audit_special_operations after insert or update or delete on public.special_operations
for each row execute function public.audit_row_change('SPECIAL_OPERATION', 'ภารกิจพิเศษ');

drop trigger if exists audit_investigation_subjects on public.investigation_subjects;
create trigger audit_investigation_subjects after insert or update or delete on public.investigation_subjects
for each row execute function public.audit_row_change('INVESTIGATION', 'ข้อมูลสืบสวน');

drop trigger if exists audit_case_timeline_entries on public.case_timeline_entries;
create trigger audit_case_timeline_entries after insert or update or delete on public.case_timeline_entries
for each row execute function public.audit_row_change('CASE_TIMELINE', 'ไทม์ไลน์คดี');
