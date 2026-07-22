-- Access control: founding super admin, co-owners, privilege grants, transfer.
-- Founding super admin (immutable bootstrap email): oadeagbo@gmail.com

insert into settings (name, value) values
  ('founding_owner_email', 'oadeagbo@gmail.com'),
  ('google_auth_enabled', 'true')
on conflict (name) do update set value = excluded.value;

create table if not exists platform_co_owners (
  user_id uuid primary key references profiles(id) on delete cascade,
  email text not null,
  granted_by uuid references profiles(id),
  note text,
  created_at timestamptz not null default now()
);

create table if not exists admin_privileges (
  id bigserial primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  privilege text not null check (privilege in (
    'content_studio','editorial','monetization','analytics','catalog',
    'reel_config','events','garments','users_roles','access_control',
    'delete_selected','delete_all'
  )),
  granted_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  unique (user_id, privilege)
);

create table if not exists access_audit_log (
  id bigserial primary key,
  actor_id uuid references profiles(id),
  action text not null,
  target_email text,
  detail jsonb default '{}',
  created_at timestamptz not null default now()
);

alter table platform_co_owners enable row level security;
alter table admin_privileges enable row level security;
alter table access_audit_log enable row level security;

create policy co_owners_admin_read on platform_co_owners for select using (is_admin());
create policy privileges_self_or_admin on admin_privileges for select
  using (auth.uid() = user_id or is_admin());
create policy audit_admin_read on access_audit_log for select using (is_owner());

create or replace function is_co_owner() returns boolean language sql stable set search_path = public as $$
  select exists (select 1 from platform_co_owners where user_id = auth.uid())
    or coalesce((select is_owner from profiles where id = auth.uid()), false);
$$;

create or replace function is_super_admin() returns boolean language sql stable set search_path = public as $$
  select coalesce((select is_owner from profiles where id = auth.uid()), false)
    or exists (select 1 from platform_co_owners where user_id = auth.uid());
$$;

-- Refresh is_admin to include co-owners
create or replace function is_admin() returns boolean language sql stable set search_path = public as $$
  select coalesce(
    (select role in ('admin','owner') or is_owner from profiles where id = auth.uid()),
    false
  ) or exists (select 1 from platform_co_owners where user_id = auth.uid());
$$;

create or replace function has_privilege(p_priv text) returns boolean
language plpgsql stable security definer set search_path = public as $$
begin
  if is_super_admin() then return true; end if;
  if p_priv = 'delete_all' then return false; end if; -- never for non-owners unless granted
  return exists (
    select 1 from admin_privileges where user_id = auth.uid() and privilege = p_priv
  ) or (
    p_priv = 'delete_selected' and is_admin()
  );
end $$;

create or replace function log_access(p_action text, p_email text, p_detail jsonb default '{}')
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into access_audit_log (actor_id, action, target_email, detail)
  values (auth.uid(), p_action, p_email, coalesce(p_detail, '{}'));
end $$;

-- Promote founding email + existing co-owners on every new auth user
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  founding text;
  is_founding boolean := false;
begin
  select value into founding from settings where name = 'founding_owner_email';
  founding := lower(coalesce(founding, 'oadeagbo@gmail.com'));
  is_founding := lower(coalesce(new.email, '')) = founding;

  insert into profiles (id, email, name, role, is_owner)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1)),
    case when is_founding then 'owner' else 'user' end,
    is_founding
  )
  on conflict (id) do update set
    email = excluded.email,
    name = coalesce(profiles.name, excluded.name),
    role = case when is_founding then 'owner' else profiles.role end,
    is_owner = case when is_founding then true else profiles.is_owner end;

  if is_founding then
    perform log_access('founding_owner_claimed', new.email, jsonb_build_object('user_id', new.id));
  end if;
  return new;
end $$;

-- Claim founding ownership if profile already exists without flag (e.g. email/password first)
create or replace function claim_founding_owner()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  founding text;
  me profiles%rowtype;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  select value into founding from settings where name = 'founding_owner_email';
  founding := lower(coalesce(founding, 'oadeagbo@gmail.com'));
  select * into me from profiles where id = auth.uid();
  if me.id is null then raise exception 'Profile missing'; end if;
  if lower(me.email) <> founding then
    raise exception 'Only % can claim founding super admin', founding;
  end if;
  update profiles set is_owner = true, role = 'owner' where id = auth.uid();
  perform log_access('founding_owner_claimed', me.email, '{}'::jsonb);
  return jsonb_build_object('ok', true, 'email', me.email, 'is_owner', true);
end $$;

-- Transfer sole super-admin flag to another profile (caller keeps nothing unless co-owner path)
create or replace function transfer_super_admin(p_to_email text, p_confirm text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  target profiles%rowtype;
  me profiles%rowtype;
begin
  if not is_owner() then raise exception 'Only the current super admin can transfer ownership'; end if;
  if p_confirm <> 'TRANSFER SUPER ADMIN' then raise exception 'Type TRANSFER SUPER ADMIN to confirm'; end if;
  select * into me from profiles where id = auth.uid();
  select * into target from profiles where lower(email) = lower(trim(p_to_email));
  if target.id is null then raise exception 'No profile for % — they must sign in once first', p_to_email; end if;
  if target.id = me.id then raise exception 'Already the super admin'; end if;

  update profiles set is_owner = false, role = case when role = 'owner' then 'admin' else role end where id = me.id;
  update profiles set is_owner = true, role = 'owner' where id = target.id;
  -- Ensure outgoing remains admin so they are not locked out mid-handoff
  update profiles set role = 'admin' where id = me.id and role = 'user';

  insert into platform_co_owners (user_id, email, granted_by, note)
  values (me.id, me.email, target.id, 'Previous super admin after transfer')
  on conflict (user_id) do update set note = excluded.note;

  perform log_access('transfer_super_admin', target.email, jsonb_build_object('from', me.email, 'to', target.email));
  return jsonb_build_object('ok', true, 'from', me.email, 'to', target.email);
end $$;

create or replace function add_co_owner(p_email text, p_note text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare target profiles%rowtype;
begin
  if not is_owner() then raise exception 'Only the super admin can co-share ownership'; end if;
  select * into target from profiles where lower(email) = lower(trim(p_email));
  if target.id is null then raise exception 'User % must sign in once before co-share', p_email; end if;
  insert into platform_co_owners (user_id, email, granted_by, note)
  values (target.id, target.email, auth.uid(), p_note)
  on conflict (user_id) do update set note = excluded.note, granted_by = auth.uid();
  update profiles set role = case when is_owner then role else 'admin' end where id = target.id;
  perform log_access('add_co_owner', target.email, jsonb_build_object('note', p_note));
  return jsonb_build_object('ok', true, 'email', target.email);
end $$;

create or replace function remove_co_owner(p_email text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare target profiles%rowtype;
begin
  if not is_owner() then raise exception 'Only the super admin can remove co-owners'; end if;
  select * into target from profiles where lower(email) = lower(trim(p_email));
  if target.id is null then raise exception 'Unknown user'; end if;
  if target.is_owner then raise exception 'Cannot remove the active super admin via co-owner revoke'; end if;
  delete from platform_co_owners where user_id = target.id;
  perform log_access('remove_co_owner', target.email, '{}'::jsonb);
  return jsonb_build_object('ok', true);
end $$;

create or replace function grant_privileges(p_email text, p_privileges text[])
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  target profiles%rowtype;
  priv text;
begin
  if not is_super_admin() then raise exception 'Super admin or co-owner required'; end if;
  select * into target from profiles where lower(email) = lower(trim(p_email));
  if target.id is null then raise exception 'User % must sign in once first', p_email; end if;
  update profiles set role = 'admin' where id = target.id and role = 'user';
  foreach priv in array p_privileges loop
    insert into admin_privileges (user_id, privilege, granted_by)
    values (target.id, priv, auth.uid())
    on conflict (user_id, privilege) do nothing;
  end loop;
  perform log_access('grant_privileges', target.email, jsonb_build_object('privileges', to_jsonb(p_privileges)));
  return jsonb_build_object('ok', true, 'email', target.email, 'privileges', p_privileges);
end $$;

create or replace function revoke_privileges(p_email text, p_privileges text[])
returns jsonb language plpgsql security definer set search_path = public as $$
declare target profiles%rowtype;
begin
  if not is_super_admin() then raise exception 'Super admin or co-owner required'; end if;
  select * into target from profiles where lower(email) = lower(trim(p_email));
  if target.id is null then raise exception 'Unknown user'; end if;
  delete from admin_privileges where user_id = target.id and privilege = any(p_privileges);
  perform log_access('revoke_privileges', target.email, jsonb_build_object('privileges', to_jsonb(p_privileges)));
  return jsonb_build_object('ok', true);
end $$;

create or replace function set_user_role(p_user uuid, p_role text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not (is_owner() or has_privilege('users_roles')) then
    raise exception 'Not allowed to change roles';
  end if;
  if p_role not in ('user','brand','admin') then raise exception 'Bad role %', p_role; end if;
  -- Never demote the active owner through this path
  if exists (select 1 from profiles where id = p_user and is_owner) and p_role <> 'owner' then
    raise exception 'Use transfer_super_admin to change the super admin';
  end if;
  update profiles set role = p_role where id = p_user;
end $$;

create or replace function list_access_directory()
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Admin required'; end if;
  return jsonb_build_object(
    'founding_owner_email', coalesce((select value from settings where name = 'founding_owner_email'), 'oadeagbo@gmail.com'),
    'owners', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', id, 'email', email, 'name', name, 'is_owner', is_owner, 'role', role
      )), '[]'::jsonb)
      from profiles where is_owner = true or id in (select user_id from platform_co_owners)
    ),
    'co_owners', (
      select coalesce(jsonb_agg(to_jsonb(c)), '[]'::jsonb) from platform_co_owners c
    ),
    'admins', (
      select coalesce(jsonb_agg(row_to_json(x)::jsonb), '[]'::jsonb)
      from (
        select p.id, p.email, p.name, p.role, p.is_owner,
          coalesce((select jsonb_agg(ap.privilege) from admin_privileges ap where ap.user_id = p.id), '[]'::jsonb) as privileges
        from profiles p
        where p.role in ('admin','owner') or p.is_owner
        order by p.is_owner desc, p.email
      ) x
    ),
    'audit', (
      select coalesce(jsonb_agg(to_jsonb(a) order by a.created_at desc), '[]'::jsonb)
      from (select * from access_audit_log order by created_at desc limit 40) a
    )
  );
end $$;

-- Admins may read limited profile directory for access UI
drop policy if exists profiles_admin_directory on profiles;
create policy profiles_admin_directory on profiles for select
  using (auth.uid() = id or is_admin());
