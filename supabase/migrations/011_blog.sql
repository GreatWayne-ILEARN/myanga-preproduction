-- Blog comments (article acquisition funnel)
-- Mirrors look_comments guest pattern; keyed by article slug for SPA routing (?view=article&slug=).

create table if not exists blog_comments (
  id bigserial primary key,
  slug text not null,
  user_id uuid references profiles(id) on delete set null,
  guest_name text,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index if not exists idx_blog_comments_slug on blog_comments(slug, created_at);

alter table blog_comments enable row level security;

create policy blog_comments_read on blog_comments
  for select using (true);

create policy blog_comments_write on blog_comments
  for insert with check (
    char_length(trim(body)) between 1 and 1000
  );

create policy blog_comments_admin_del on blog_comments
  for delete using (is_admin());

-- Optional published posts table for production CMS (seed still ships client-side for Testing)
create table if not exists blog_posts (
  id bigserial primary key,
  slug text not null unique,
  title text not null,
  excerpt text,
  body jsonb not null default '[]'::jsonb,
  category text,
  author text default 'MyYanga Editorial',
  thumb text,
  trending boolean not null default false,
  is_published boolean not null default true,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_blog_posts_published on blog_posts(published_at desc) where is_published;

alter table blog_posts enable row level security;

create policy blog_posts_read on blog_posts
  for select using (is_published = true or is_admin());

create policy blog_posts_admin on blog_posts
  for all using (is_admin()) with check (is_admin());
