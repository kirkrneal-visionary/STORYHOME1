-- Grants for product_analytics_events (0029 created the table; SQL editor
-- runs as postgres without default table grants to anon/authenticated).

grant usage on schema public to anon, authenticated, service_role;

grant insert on public.product_analytics_events to anon, authenticated, service_role;
grant select on public.product_analytics_events to authenticated, service_role;

-- Identity sequence used by bigint generated always as identity
do $$
declare
  seq_name text;
begin
  select pg_get_serial_sequence('public.product_analytics_events', 'id')
    into seq_name;
  if seq_name is not null then
    execute format(
      'grant usage, select on sequence %s to anon, authenticated, service_role',
      seq_name
    );
  end if;
end $$;
