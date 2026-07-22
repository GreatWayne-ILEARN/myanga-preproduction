-- MyYanga marketplace commerce: e-vetted brands unlock cart; Flutterwave/Paystack
-- settle immediately to brand subaccounts with platform commission split.
-- MyYanga is a trust layer — not the merchant holding customer funds.

-- ── Platform commerce settings ──
create table if not exists commerce_settings (
  id int primary key default 1 check (id = 1),
  commission_pct numeric(5,2) not null default 8.00 check (commission_pct >= 0 and commission_pct <= 40),
  currency text not null default 'NGN',
  provider_order text[] not null default '{flutterwave,paystack}',
  trust_copy text not null default 'MyYanga is a trust platform. Payment settles immediately via Flutterwave/Paystack to the e-vetted designer, with MyYanga commission split at the gateway.',
  updated_at timestamptz not null default now()
);
insert into commerce_settings (id) values (1) on conflict (id) do nothing;
alter table commerce_settings enable row level security;
create policy commerce_settings_read on commerce_settings for select using (true);
create policy commerce_settings_admin on commerce_settings for all using (is_admin()) with check (is_admin());

-- ── Brand e-vetting + settlement accounts ──
alter table creators add column if not exists is_e_vetted boolean not null default false;
alter table creators add column if not exists e_vetted_at timestamptz;
alter table creators add column if not exists e_vetted_by uuid references profiles(id);
alter table creators add column if not exists flutterwave_subaccount_id text;
alter table creators add column if not exists paystack_subaccount_code text;
alter table creators add column if not exists commerce_notes text;

create index if not exists idx_creators_e_vetted on creators(is_e_vetted) where is_e_vetted = true;

-- ── Garment merchandising (Selfridges-grade size matrix) ──
alter table garments add column if not exists sizes_available text[] not null default '{}';
alter table garments add column if not exists size_guide jsonb not null default '{}';
alter table garments add column if not exists colours_available text[] not null default '{}';
alter table garments add column if not exists stock_by_sku jsonb not null default '{}';
alter table garments add column if not exists care_notes text;
alter table garments add column if not exists composition text;

-- ── Retail orders (audit trail; money moves at the gateway) ──
create table if not exists retail_orders (
  id bigserial primary key,
  reference text not null unique,
  user_id uuid references profiles(id) on delete set null,
  buyer_email text,
  buyer_phone text,
  status text not null default 'pending'
    check (status in ('pending','awaiting_payment','paid','failed','cancelled','fulfilled','refunded')),
  currency text not null default 'NGN',
  subtotal_ngn int not null default 0,
  commission_pct numeric(5,2) not null default 8,
  commission_ngn int not null default 0,
  brand_net_ngn int not null default 0,
  provider text,
  provider_refs jsonb not null default '[]',
  shipping jsonb not null default '{}',
  trust_note text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_retail_orders_user on retail_orders(user_id, created_at desc);

create table if not exists retail_order_items (
  id bigserial primary key,
  order_id bigint not null references retail_orders(id) on delete cascade,
  creator_id bigint references creators(id) on delete set null,
  garment_id bigint references garments(id) on delete set null,
  name text not null,
  brand_name text,
  size text,
  colour text,
  qty int not null default 1 check (qty > 0),
  unit_price_ngn int not null,
  line_total_ngn int not null,
  flutterwave_subaccount_id text,
  paystack_subaccount_code text,
  metadata jsonb not null default '{}'
);
create index if not exists idx_retail_items_order on retail_order_items(order_id);

alter table retail_orders enable row level security;
alter table retail_order_items enable row level security;
create policy retail_orders_own on retail_orders for select using (auth.uid() = user_id or is_admin());
create policy retail_items_own on retail_order_items for select using (
  exists (select 1 from retail_orders o where o.id = order_id and (o.user_id = auth.uid() or is_admin()))
);

-- Mark payments.feature allowing retail references (widen check if present)
-- payments.feature is free text already in 005 — retail uses feature = 'retail_checkout'

create or replace function mark_retail_order_paid(p_reference text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare o retail_orders%rowtype;
begin
  update retail_orders
    set status = 'paid', updated_at = now()
  where reference = p_reference and status in ('pending','awaiting_payment')
  returning * into o;
  if not found then
    select * into o from retail_orders where reference = p_reference;
    return jsonb_build_object('ok', o.status = 'paid', 'status', o.status, 'reference', p_reference);
  end if;
  return jsonb_build_object('ok', true, 'status', 'paid', 'reference', p_reference, 'order_id', o.id);
end;
$$;
