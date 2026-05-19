-- Clean AI Trading Platform Supabase Schema V1
create table if not exists public.profiles (
  id text primary key,
  name text,
  email text unique,
  mobile text,
  role text default 'user',
  kyc_status text default 'PENDING',
  created_at timestamptz default now()
);

create table if not exists public.wallet_ledger (
  id text primary key,
  user_id text not null,
  type text not null,
  amount numeric not null,
  reference_id text not null,
  note text,
  balance_after numeric,
  created_at timestamptz default now(),
  unique(type, reference_id)
);

create table if not exists public.deposit_requests (
  id text primary key,
  user_id text,
  user_email text,
  amount numeric,
  mode text,
  utr text unique,
  status text default 'PENDING',
  balance_applied boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.withdrawal_requests (
  id text primary key,
  user_id text,
  user_email text,
  amount numeric,
  method_id text,
  method_type text,
  method_text text,
  holder_name text,
  status text default 'PENDING',
  hold_applied boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.user_payout_methods (
  id text primary key,
  user_id text,
  user_email text,
  type text,
  upi text,
  bank_name text,
  account_number text,
  ifsc text,
  holder_name text,
  status text default 'PENDING',
  created_at timestamptz default now()
);

create table if not exists public.kyc_requests (
  id text primary key,
  user_id text,
  user_email text,
  name text,
  doc_number text,
  address text,
  status text default 'PENDING',
  created_at timestamptz default now()
);

create table if not exists public.trades (
  id text primary key,
  user_id text,
  user_email text,
  side text,
  amount numeric,
  status text,
  pnl numeric,
  created_at timestamptz default now(),
  closed_at timestamptz
);

alter table public.wallet_ledger enable row level security;
alter table public.deposit_requests enable row level security;
alter table public.withdrawal_requests enable row level security;
alter table public.user_payout_methods enable row level security;
alter table public.kyc_requests enable row level security;
alter table public.trades enable row level security;

-- Testing policies. Tighten before real launch.
drop policy if exists "allow all wallet_ledger" on public.wallet_ledger;
create policy "allow all wallet_ledger" on public.wallet_ledger for all to anon, authenticated using (true) with check (true);
drop policy if exists "allow all deposit_requests" on public.deposit_requests;
create policy "allow all deposit_requests" on public.deposit_requests for all to anon, authenticated using (true) with check (true);
drop policy if exists "allow all withdrawal_requests" on public.withdrawal_requests;
create policy "allow all withdrawal_requests" on public.withdrawal_requests for all to anon, authenticated using (true) with check (true);
drop policy if exists "allow all user_payout_methods" on public.user_payout_methods;
create policy "allow all user_payout_methods" on public.user_payout_methods for all to anon, authenticated using (true) with check (true);
drop policy if exists "allow all kyc_requests" on public.kyc_requests;
create policy "allow all kyc_requests" on public.kyc_requests for all to anon, authenticated using (true) with check (true);
drop policy if exists "allow all trades" on public.trades;
create policy "allow all trades" on public.trades for all to anon, authenticated using (true) with check (true);
