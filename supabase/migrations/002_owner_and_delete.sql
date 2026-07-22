-- Owner-only "Delete All" + admin "delete selected", enforced server-side.
create or replace function is_owner() returns boolean language sql stable as $$
  select coalesce((select is_owner from profiles where id = auth.uid()), false);
$$;
create or replace function is_admin() returns boolean language sql stable as $$
  select coalesce((select role in ('admin','owner') or is_owner from profiles where id = auth.uid()), false);
$$;

-- Owner-only bulk wipe of a whitelisted table.
create or replace function delete_all_records(target text) returns void language plpgsql security definer as $$
begin
  if not is_owner() then raise exception 'Only the owner can delete all records'; end if;
  if target not in ('products','listings','orders','discovers','premium_content','ads','pyl_entries','editorial_picks','image_interactions','saved_items','subscriptions')
    then raise exception 'Table % not allowed', target; end if;
  execute format('delete from %I', target);
end $$;

-- Admin delete of selected ids.
create or replace function delete_selected_records(target text, ids bigint[]) returns void language plpgsql security definer as $$
begin
  if not is_admin() then raise exception 'Admin role required'; end if;
  if target not in ('products','listings','orders','discovers','premium_content','ads','pyl_entries','editorial_picks')
    then raise exception 'Table % not allowed', target; end if;
  execute format('delete from %I where id = any($1)', target) using ids;
end $$;
