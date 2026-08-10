-- Prefer a readable person name for the criminal-person module audit trail.
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
    nullif(v_record ->> 'camera_name', ''),
    nullif(v_record ->> 'name', ''),
    nullif(v_record ->> 'display_name', ''),
    nullif(trim(concat_ws(' ', nullif(v_record ->> 'first_name', ''), nullif(v_record ->> 'last_name', ''))), ''),
    nullif(v_record ->> 'checkpoint_name', ''), nullif(v_record ->> 'mission_name', ''),
    nullif(v_record ->> 'case_no', ''), nullif(v_record ->> 'subject_code', ''),
    nullif(v_record ->> 'plate_number', ''), nullif(v_record ->> 'uid', ''), nullif(v_record ->> 'id', '')
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

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke execute on function public.audit_row_change() from anon, authenticated;
