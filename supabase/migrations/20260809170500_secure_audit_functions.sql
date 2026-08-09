-- Trigger functions are not API endpoints. Only PostgreSQL triggers may invoke them.
revoke execute on function public.audit_redact_payload(jsonb) from anon, authenticated;
revoke execute on function public.audit_row_change() from anon, authenticated;
