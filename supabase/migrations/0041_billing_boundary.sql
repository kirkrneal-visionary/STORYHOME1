-- Payment / entitlement boundary. No card numbers. No live provider.
-- Payment failure must NOT cascade-delete Prospects, Farms, Studies,
-- CRM, My Home, or auth users.
-- Does NOT delete users, listings, or county/CAD truth data.

create table if not exists public.billing_customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete restrict,
  provider text not null default 'unset',
  provider_customer_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_customer_id)
);

create table if not exists public.billing_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete restrict,
  billing_customer_id uuid references public.billing_customers (id) on delete restrict,
  provider text not null default 'unset',
  provider_subscription_id text,
  plan text,
  status text not null default 'none',
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  last_verified_event_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.billing_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null,
  event_type text,
  processed_at timestamptz not null default now(),
  unique (provider, provider_event_id)
);

create index if not exists billing_subscriptions_user_idx
  on public.billing_subscriptions (user_id);

alter table public.billing_customers enable row level security;
alter table public.billing_subscriptions enable row level security;
alter table public.billing_webhook_events enable row level security;

revoke all on public.billing_customers from anon, authenticated, public;
revoke all on public.billing_subscriptions from anon, authenticated, public;
revoke all on public.billing_webhook_events from anon, authenticated, public;

comment on table public.billing_customers is
  'Provider customer reference. Server-only. Failed payment must not delete user data.';
comment on table public.billing_subscriptions is
  'Trusted subscription/entitlement state. Client redirect is not proof of payment.';
comment on table public.billing_webhook_events is
  'Idempotency for provider webhook event IDs. Duplicates must not mutate entitlement twice.';
