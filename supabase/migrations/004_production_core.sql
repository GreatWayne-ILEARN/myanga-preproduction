-- MyYanga production core: creators, garments, looks, events, competitions,
-- daily editorial, and a hardened RLS posture.

-- ── Fix the profiles exposure: self + admin only; public sees a safe view ──
drop policy if exists profiles_self on profiles;
create policy profiles_self_read on profiles for select
  using (auth.uid() = id or is_admin());
create policy profiles_self_update on profiles for update
  using (auth.uid() = id) with check (auth.uid() = id and is_owner = false and role = 'user');
-- role/is_owner changes go through the owner-only RPC below, never self-service.

create or replace view public_profiles as
  select id, name, avatar from profiles where status = 'ACTIVE';

create or replace function set_user_role(p_user uuid, p_role text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_owner() then raise exception 'Only the owner can change roles'; end if;
  if p_role not in ('user','brand','admin') then raise exception 'Bad role %', p_role; end if;
  update profiles set role = p_role where id = p_user;
end $$;

-- New sign-ups get a profile row automatically (role user, never owner).
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email, name) values (new.id, new.email, split_part(new.email,'@',1))
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- ── Creators: the discover/engage/patronize pool ──
create table if not exists creators (
  id bigserial primary key,
  user_id uuid references profiles(id) on delete set null,
  name text not null,
  slug text unique,
  discipline text not null default 'fashion',  -- fashion|photography|makeup|fabrics
  bio text,
  city text,
  country text default 'Nigeria',
  avatar text,
  cover_image text,
  instagram text, whatsapp text, website text,
  credibility_score int not null default 0 check (credibility_score between 0 and 100),
  is_promoted boolean not null default false,          -- the "select pool"
  promotion_kind text check (promotion_kind in ('credibility','paid')),
  promoted_until date,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists idx_creators_promoted on creators(is_promoted, credibility_score desc) where is_active;

alter table creators enable row level security;
create policy creators_read on creators for select using (is_active = true or is_admin());
create policy creators_admin on creators for all using (is_admin()) with check (is_admin());

-- ── Premium virtual-wear garment database (powers SmartSearch + Virtual Wear) ──
create table if not exists garments (
  id bigserial primary key,
  creator_id bigint references creators(id) on delete cascade,
  name text not null,
  part text not null default 'main_outfit',  -- head_piece|main_outfit|shoes|jewellery|bag|belt
  style text,          -- Agbada|Kaftan|Aso-Oke|Lace|Ankara|Senator|Gown|Two-piece
  event_tags text[] not null default '{}',   -- wedding|corporate|casual|traditional|date|festival
  colours text[] not null default '{}',
  gender text default 'unisex',
  price_ngn int not null default 0,
  image text,           -- transparent overlay for compositing
  card_image text,      -- presentation card image
  is_premium boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists idx_garments_search on garments(style, gender) where is_active;
create index if not exists idx_garments_event on garments using gin(event_tags);
create index if not exists idx_garments_colour on garments using gin(colours);

alter table garments enable row level security;
create policy garments_read on garments for select using (is_active = true or is_admin());
create policy garments_admin on garments for all using (is_admin()) with check (is_admin());

-- ── Looks: composed outfits users create, share and discuss ──
create table if not exists looks (
  id bigserial primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  title text not null default 'My Look',
  scene text not null default 'plain',      -- plain|wedding|corporate|festival|date
  garment_ids bigint[] not null default '{}',
  total_ngn int not null default 0,
  image text,                                -- composited render (storage URL)
  share_code text unique,
  is_public boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_looks_user on looks(user_id, created_at desc);
create index if not exists idx_looks_share on looks(share_code) where share_code is not null;

alter table looks enable row level security;
create policy looks_own on looks for select using (auth.uid() = user_id or is_public = true or is_admin());
create policy looks_insert on looks for insert with check (auth.uid() = user_id);
create policy looks_update on looks for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy looks_delete on looks for delete using (auth.uid() = user_id or is_admin());

create table if not exists look_comments (
  id bigserial primary key,
  look_id bigint not null references looks(id) on delete cascade,
  user_id uuid references profiles(id) on delete set null,
  guest_name text,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index if not exists idx_look_comments on look_comments(look_id, created_at);

alter table look_comments enable row level security;
create policy look_comments_read on look_comments for select using (
  exists (select 1 from looks l where l.id = look_id and (l.is_public or l.user_id = auth.uid())) or is_admin()
);
create policy look_comments_write on look_comments for insert with check (
  exists (select 1 from looks l where l.id = look_id and l.is_public)
);
create policy look_comments_admin_del on look_comments for delete using (is_admin());

-- ── Events ──
create table if not exists events (
  id bigserial primary key,
  title text not null,
  description text,
  venue text, city text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  image text,
  ticket_url text,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);
alter table events enable row level security;
create policy events_read on events for select using (is_published or is_admin());
create policy events_admin on events for all using (is_admin()) with check (is_admin());

-- ── Post Your Look: competition + voting (one vote per user per entry) ──
create table if not exists pyl_votes (
  id bigserial primary key,
  entry_id bigint not null references pyl_entries(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (entry_id, user_id)
);
alter table pyl_votes enable row level security;
create policy pyl_votes_read on pyl_votes for select using (true);
create policy pyl_votes_insert on pyl_votes for insert with check (auth.uid() = user_id);

alter table pyl_entries add column if not exists caption text;
alter table pyl_entries add column if not exists status text not null default 'live';
create policy pyl_entries_insert on pyl_entries for insert with check (auth.uid() = user_id);
create policy pyl_entries_own_delete on pyl_entries for delete using (auth.uid() = user_id or is_admin());

create or replace function vote_pyl(p_entry bigint)
returns int language plpgsql security definer set search_path = public as $$
declare c int;
begin
  if auth.uid() is null then raise exception 'Sign in to vote'; end if;
  insert into pyl_votes (entry_id, user_id) values (p_entry, auth.uid());
  update pyl_entries set votes = votes + 1 where id = p_entry returning votes into c;
  return c;
exception when unique_violation then
  raise exception 'You already voted for this entry';
end $$;

-- ── Daily editorial: picture/bride/look of the day — server-persisted ──
create table if not exists editorial_daily (
  id bigserial primary key,
  kind text not null check (kind in ('picture_of_day','bride_of_day','look_of_day','outfit_of_day','designer_in_focus','groom_of_week','couple_of_week')),
  title text not null,
  creator text,
  description text,
  image text,
  link text,
  show_on date not null default current_date,
  is_current boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists idx_editorial_current on editorial_daily(kind, show_on desc) where is_current;

alter table editorial_daily enable row level security;
create policy editorial_daily_read on editorial_daily for select using (true);
create policy editorial_daily_admin on editorial_daily for all using (is_admin()) with check (is_admin());

-- ── Write policies the prototype was missing (users' own content) ──
create policy saved_items_own on saved_items for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
alter table saved_items enable row level security;

alter table orders enable row level security;
create policy orders_own_read on orders for select using (auth.uid() = user_id or is_admin());

alter table subscriptions enable row level security;
create policy subs_own_read on subscriptions for select using (auth.uid() = user_id or is_admin());

-- Admin write access to content tables (prototype had read-only RLS = nothing worked).
do $$ declare t text;
begin
  foreach t in array array['listings','categories','locations','products','product_pictures','product_shipments','editorial_picks','discovers','posts','groom_tips','tvs','premium_content','ads','reel_config','reel_brand_placements','settings'] loop
    execute format('drop policy if exists %I_admin_write on %I', t, t);
    execute format('create policy %I_admin_write on %I for all using (is_admin()) with check (is_admin())', t, t);
  end loop;
end $$;

-- ── Storage: public content bucket + private user-uploads bucket ──
insert into storage.buckets (id, name, public) values
  ('content','content',true),
  ('looks','looks',true)
on conflict (id) do nothing;

-- ── Storage policies ──

drop policy if exists "content_admin_write" on storage.objects;
create policy "content_admin_write" on storage.objects for insert to authenticated
  with check (bucket_id = 'content' and is_admin());

drop policy if exists "looks_own_write" on storage.objects;
create policy "looks_own_write" on storage.objects for insert to authenticated
  with check (bucket_id = 'looks' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "content_public_read" on storage.objects;
create policy "content_public_read" on storage.objects for select
  using (bucket_id in ('content','looks'));
