-- Anonymized interaction analytics (no PII columns).
-- session_id / device_id are client-generated random UUIDs — not auth.users ids.

create table if not exists analytics_events (
  id bigserial primary key,
  event text not null,
  session_id text not null,
  device_id text not null,
  path text,
  view text,
  props jsonb not null default '{}'::jsonb,
  client_ts timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists analytics_events_event_idx on analytics_events (event, created_at desc);
create index if not exists analytics_events_session_idx on analytics_events (session_id);
create index if not exists analytics_events_props_gin on analytics_events using gin (props);

alter table analytics_events enable row level security;

drop policy if exists "analytics insert authenticated" on analytics_events;
create policy "analytics insert authenticated" on analytics_events
  for insert to authenticated with check (true);

drop policy if exists "analytics insert anon" on analytics_events;
create policy "analytics insert anon" on analytics_events
  for insert to anon with check (true);

drop policy if exists "analytics admin read" on analytics_events;
create policy "analytics admin read" on analytics_events
  for select to authenticated using (is_admin());

create or replace function admin_fashion_analytics(p_days int default 30)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  since timestamptz := now() - make_interval(days => greatest(1, least(coalesce(p_days, 30), 365)));
begin
  if not is_admin() then raise exception 'Admin only'; end if;
  return jsonb_build_object(
    'since', since,
    'totals', (
      select jsonb_build_object(
        'events', count(*),
        'sessions', count(distinct session_id),
        'devices', count(distinct device_id)
      ) from analytics_events where created_at >= since
    ),
    'by_event', (
      select coalesce(jsonb_object_agg(event, c), '{}'::jsonb) from (
        select event, count(*)::int as c from analytics_events
        where created_at >= since group by event
      ) s
    ),
    'top_colours', (
      select coalesce(jsonb_agg(jsonb_build_object('key', colour, 'count', c)), '[]'::jsonb)
      from (
        select colour, count(*)::int as c from (
          select jsonb_array_elements_text(coalesce(props->'colours','[]'::jsonb)) as colour
          from analytics_events
          where created_at >= since
            and event in ('product_select','vw_render','search','product_view')
        ) raw
        where colour is not null and colour <> ''
        group by colour order by c desc limit 12
      ) x
    ),
    'top_styles', (
      select coalesce(jsonb_agg(jsonb_build_object('key', style, 'count', c)), '[]'::jsonb)
      from (
        select props->>'style' as style, count(*)::int as c
        from analytics_events
        where created_at >= since
          and event in ('product_select','product_view')
          and props->>'style' is not null
        group by 1 order by 2 desc limit 12
      ) x
    ),
    'return_reason_matrix', (
      select coalesce(jsonb_object_agg(reason, c), '{}'::jsonb) from (
        select props->>'reason' as reason, count(*)::int as c
        from analytics_events
        where created_at >= since and event = 'return_reason' and props->>'reason' is not null
        group by 1
      ) r
    ),
    'fit', (
      select jsonb_build_object(
        'vw_renders', count(*) filter (where event = 'vw_render'),
        'ai', count(*) filter (where event = 'vw_render' and props->>'mode' = 'ai'),
        'canvas', count(*) filter (where event = 'vw_render' and props->>'mode' = 'canvas'),
        'shares', count(*) filter (where event = 'vw_share')
      ) from analytics_events where created_at >= since
    )
  );
end $$;

grant execute on function admin_fashion_analytics(int) to authenticated;
