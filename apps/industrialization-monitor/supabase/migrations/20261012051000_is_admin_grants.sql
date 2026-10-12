-- is_admin() is only needed by signed-in users (RLS policies) and trusted server code.
revoke execute on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated, service_role;
