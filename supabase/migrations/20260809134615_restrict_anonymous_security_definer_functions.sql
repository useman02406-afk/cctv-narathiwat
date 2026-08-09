-- Administrative RPCs validate ADMIN internally, but must never be callable
-- through the public anonymous API role.
revoke execute on function public.admin_confirm_user_email(uuid) from anon, public;
revoke execute on function public.admin_delete_user(uuid) from anon, public;
revoke execute on function public.admin_update_profile(uuid, text, boolean) from anon, public;
revoke execute on function public.current_app_role() from anon, public;

-- Signed-in users need access to the role helper and to the administrative
-- RPC endpoints. Each administrative function checks current_app_role() = ADMIN.
grant execute on function public.admin_confirm_user_email(uuid) to authenticated;
grant execute on function public.admin_delete_user(uuid) to authenticated;
grant execute on function public.admin_update_profile(uuid, text, boolean) to authenticated;
grant execute on function public.current_app_role() to authenticated;

-- Avoid recreating the unsafe default on future public-schema functions.
alter default privileges for role postgres in schema public
  revoke execute on functions from anon, public;
