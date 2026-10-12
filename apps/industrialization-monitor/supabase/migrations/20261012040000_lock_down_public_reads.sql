-- No public reads through the Supabase API. The public map reads published data on the server
-- with the service role key; everything else requires a signed-in admin.

do $$
declare t text;
begin
  foreach t in array array[
    'taxonomy', 'companies', 'company_aliases', 'sites', 'announcements', 'announcement_sources',
    'organizations', 'organization_aliases', 'programs', 'announcement_parties'
  ] loop
    execute format('drop policy if exists public_read on %I', t);
    execute format('create policy admin_select on %I for select using (is_admin())', t);
  end loop;
end $$;

-- Defense in depth: the anon role gets no table, view or sequence privileges at all.
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;
-- Anonymous callers have no use for app functions either (sign-in happens in the auth schema).
revoke execute on all functions in schema public from anon;
alter default privileges in schema public revoke execute on functions from anon;
