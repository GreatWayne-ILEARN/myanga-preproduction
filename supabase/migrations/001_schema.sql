-- MyYanga schema (core + content + notification/reel). RLS on; public read content.
create extension if not exists pgcrypto;

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text, email text, mobile text, whatsapp text,
  type text default 'INDIVIDUAL', role text default 'user', is_owner boolean default false,
  status text default 'ACTIVE', avatar text,
  notification_list jsonb default '[]', whatsapp_reel_optin boolean default false,
  webpush_optin boolean default false, reel_channel text default 'email',
  created_at timestamptz default now()
);
create table if not exists listings ( id bigserial primary key, name text not null, slug text unique,
  user_id uuid references profiles(id), location_id bigint, logo text, status text default 'ACTIVE',
  featured boolean default false, cac text, cac_no text, description text, address text, created_at timestamptz default now());
create table if not exists categories ( id bigserial primary key, name text not null, parent_id bigint );
create table if not exists locations ( id bigserial primary key, name text not null, parent_id bigint );
create table if not exists products ( id bigserial primary key, listing_id bigint references listings(id) on delete cascade,
  user_id uuid references profiles(id), category_id bigint references categories(id),
  name text not null, slug text, description text, price int default 0, quantity int default 0,
  status text default 'ACTIVE', tips text, image text, created_at timestamptz default now());
create table if not exists product_pictures ( id bigserial primary key, product_id bigint references products(id) on delete cascade, url text );
create table if not exists product_shipments ( id bigserial primary key, product_id bigint references products(id) on delete cascade, price int, description text, return_policy text );
create table if not exists orders ( id bigserial primary key, user_id uuid references profiles(id), data jsonb, amount int, status text default 'PENDING', payment_details jsonb, created_at timestamptz default now());
create table if not exists editorial_picks ( id bigserial primary key, kind text, title text, brand text, image text, is_current boolean default true, created_at timestamptz default now());
create table if not exists discovers ( id bigserial primary key, title text, excerpt text, body text, image text, created_at timestamptz default now());
create table if not exists posts ( id bigserial primary key, title text, body text, image text, created_at timestamptz default now());
create table if not exists groom_tips ( id bigserial primary key, title text, body text, image text, created_at timestamptz default now());
create table if not exists tvs ( id bigserial primary key, title text, youtube_id text, created_at timestamptz default now());
create table if not exists premium_content ( id bigserial primary key, title text, tier text default 'Premium', image text, created_at timestamptz default now());
create table if not exists pyl_entries ( id bigserial primary key, user_id uuid references profiles(id), image text, votes int default 0, created_at timestamptz default now());
create table if not exists ads ( id bigserial primary key, title text, image text, link text, is_active boolean default true, created_at timestamptz default now());
create table if not exists subscriptions ( id bigserial primary key, user_id uuid references profiles(id), tier text, status text default 'ACTIVE', created_at timestamptz default now());
create table if not exists saved_items ( id bigserial primary key, user_id uuid references profiles(id), product_id bigint references products(id) on delete cascade );
create table if not exists image_interactions ( id bigserial primary key, user_id uuid references profiles(id), kind text, ref_id bigint, created_at timestamptz default now());
create table if not exists settings ( id bigserial primary key, name text unique, value text );
-- notification & reel
create table if not exists user_notifications ( id bigserial primary key, user_id uuid references profiles(id) on delete cascade, listings jsonb default '[]', categories jsonb default '[]', days jsonb default '[]');
create table if not exists notification_data ( id bigserial primary key, user_id uuid references profiles(id) on delete cascade, premium_ids jsonb default '[]', reel_json jsonb, created_at timestamptz default now());
create table if not exists reel_config ( id int primary key default 1 check (id=1), delivery_mode text default 'email', images_per_reel int default 10, max_brand_slots_per_reel int default 3, all_users_eligible boolean default true, send_frequency text default 'weekly', whatsapp_api_key text, whatsapp_sender_id text, vapid_public_key text );
create table if not exists reel_brand_placements ( id bigserial primary key, listing_id bigint references listings(id), image_url text, caption text, link_url text, impressions_purchased int default 0, impressions_delivered int default 0, is_active boolean default true, priority int default 5, active_from date, active_until date, notes text );
create table if not exists push_subscriptions ( id bigserial primary key, user_id uuid references profiles(id) on delete cascade, endpoint text, p256dh text, auth text, device_hint text, is_active boolean default true, last_used_at timestamptz );

-- RLS: content tables are publicly readable; writes require admin/owner.
do $$ declare t text;
begin
  foreach t in array array['listings','categories','locations','products','product_pictures','product_shipments','editorial_picks','discovers','posts','groom_tips','tvs','premium_content','pyl_entries','ads','reel_config','reel_brand_placements','settings'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists %I_read on %I', t, t);
    execute format('create policy %I_read on %I for select using (true)', t, t);
  end loop;
end $$;
alter table profiles enable row level security;
drop policy if exists profiles_self on profiles;
create policy profiles_self on profiles for select using (true);
