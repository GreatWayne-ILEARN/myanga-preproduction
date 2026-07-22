-- MyYanga monetization: admin-controlled per-feature gates, payments across
-- Flutterwave → Paystack → Stripe, entitlements, webhook idempotency.

-- ── Per-feature monetization settings (the Admin Studio switchboard) ──
create table if not exists monetization_settings (
  feature text primary key,           -- virtual_wear|smart_search|pyl_entry|premium|events|creator_promotion
  enabled boolean not null default true,
  mode text not null default 'free' check (mode in ('free','paid')),
  price_ngn int not null default 0 check (price_ngn >= 0),
  currency text not null default 'NGN',
  billing text not null default 'one_time' check (billing in ('one_time','days_30','days_365')),
  provider_order text[] not null default '{flutterwave,paystack,stripe}',
  updated_by uuid references profiles(id),
  updated_at timestamptz not null default now()
);
alter table monetization_settings enable row level security;
create policy monetization_read on monetization_settings for select using (true);
create policy monetization_admin on monetization_settings for all using (is_admin()) with check (is_admin());

insert into monetization_settings (feature, mode, price_ngn) values
  ('virtual_wear','free',0),
  ('smart_search','free',0),
  ('pyl_entry','free',0),
  ('premium','paid',2500),
  ('events','free',0),
  ('creator_promotion','paid',50000)
on conflict (feature) do nothing;

-- ── Payments ──
create table if not exists payments (
  id bigserial primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  feature text not null,
  provider text not null check (provider in ('flutterwave','paystack','stripe')),
  reference text not null unique,
  amount_ngn int not null,
  currency text not null default 'NGN',
  status text not null default 'pending' check (status in ('pending','succeeded','failed','refunded')),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_payments_user on payments(user_id, created_at desc);
create index if not exists idx_payments_ref on payments(reference);

alter table payments enable row level security;
create policy payments_own_read on payments for select using (auth.uid() = user_id or is_admin());
-- inserts/updates only via service role (edge function)

-- ── Entitlements: what a user has paid for ──
create table if not exists entitlements (
  id bigserial primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  feature text not null,
  payment_id bigint references payments(id) on delete set null,
  granted_at timestamptz not null default now(),
  expires_at timestamptz,                 -- null = one-time/lifetime
  unique (user_id, feature, granted_at)
);
create index if not exists idx_entitlements_user on entitlements(user_id, feature);

alter table entitlements enable row level security;
create policy entitlements_own_read on entitlements for select using (auth.uid() = user_id or is_admin());

-- ── Webhook idempotency ──
create table if not exists payment_webhook_events (
  id bigserial primary key,
  provider text not null,
  event_id text not null,
  reference text,
  payload jsonb not null default '{}',
  processed_at timestamptz not null default now(),
  unique (provider, event_id)
);
alter table payment_webhook_events enable row level security;
create policy webhook_admin_read on payment_webhook_events for select using (is_admin());

-- ── The single source of truth the client + edge functions consult ──
create or replace function get_feature_gate(p_feature text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare s monetization_settings%rowtype; entitled boolean := false;
begin
  select * into s from monetization_settings where feature = p_feature;
  if not found or not s.enabled then
    return jsonb_build_object('feature', p_feature, 'enabled', coalesce(s.enabled,false), 'access', not found);
  end if;
  if s.mode = 'free' then
    return jsonb_build_object('feature', p_feature, 'enabled', true, 'mode', 'free', 'access', true);
  end if;
  if auth.uid() is not null then
    select exists (
      select 1 from entitlements e
      where e.user_id = auth.uid() and e.feature = p_feature
        and (e.expires_at is null or e.expires_at > now())
    ) into entitled;
  end if;
  return jsonb_build_object(
    'feature', p_feature, 'enabled', true, 'mode', 'paid',
    'price_ngn', s.price_ngn, 'currency', s.currency, 'billing', s.billing,
    'provider_order', to_jsonb(s.provider_order), 'access', entitled
  );
end $$;

-- Fulfil a payment + grant entitlement atomically. Called by the edge
-- function (service role) after provider verification / webhook.
create or replace function fulfil_payment(p_reference text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare pay payments%rowtype; s monetization_settings%rowtype; exp timestamptz;
begin
  select * into pay from payments where reference = p_reference for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if pay.status = 'succeeded' then return jsonb_build_object('ok', true, 'already', true); end if;

  update payments set status = 'succeeded', updated_at = now() where id = pay.id;

  select * into s from monetization_settings where feature = pay.feature;
  exp := case coalesce(s.billing,'one_time')
           when 'days_30' then now() + interval '30 days'
           when 'days_365' then now() + interval '365 days'
           else null end;
  insert into entitlements (user_id, feature, payment_id, expires_at)
  values (pay.user_id, pay.feature, pay.id, exp);

  if pay.feature = 'premium' then
    insert into subscriptions (user_id, tier, status) values (pay.user_id, 'Premium', 'ACTIVE');
  end if;
  return jsonb_build_object('ok', true, 'feature', pay.feature);
end $$;

-- Live analytics (replaces the fabricated numbers) — admin only.
create or replace function admin_analytics()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Admin only'; end if;
  return jsonb_build_object(
    'users',        (select count(*) from profiles),
    'creators',     (select count(*) from creators where is_active),
    'garments',     (select count(*) from garments where is_active),
    'looks',        (select count(*) from looks),
    'pyl_entries',  (select count(*) from pyl_entries),
    'payments_30d', (select coalesce(sum(amount_ngn),0) from payments where status='succeeded' and created_at > now() - interval '30 days'),
    'premium_subs', (select count(*) from subscriptions where status='ACTIVE')
  );
end $$;
