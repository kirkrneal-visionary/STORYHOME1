-- C2.0-D companion: grants for corridor segment cache (tables created in 0034).
-- Owner may already have run 0034; this unlocks service_role soft-cache writes
-- and authenticated reads via PostgREST.

grant select on public.corridor_road_segments to authenticated, service_role;
grant select on public.corridor_traffic_observations to authenticated, service_role;
grant insert, update, delete on public.corridor_road_segments to service_role;
grant insert, update, delete on public.corridor_traffic_observations to service_role;
grant usage, select on sequence public.corridor_traffic_observations_id_seq to service_role;
