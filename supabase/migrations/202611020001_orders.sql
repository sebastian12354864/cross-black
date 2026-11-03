-- Private order storage. No browser roles can read or write these tables.
create table public.store_orders (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique,
  request_hash text not null,
  reference text not null unique,
  environment text not null default 'test' check (environment in ('test','prod')),
  payment_method text not null check (payment_method in ('cod','advance')),
  payment_status text not null default 'pending' check (payment_status in ('pending','approved','declined','error','voided')),
  fulfillment_status text not null default 'not_sent',
  customer jsonb not null,
  size text not null check (size in ('S','M','L','XL','2XL','3XL')),
  color text not null check (color in ('Negro','Beige')),
  quantity integer not null check (quantity between 1 and 10),
  amount_in_cents integer not null check (amount_in_cents > 0),
  currency text not null default 'COP' check (currency = 'COP'),
  shipping_in_cents integer not null default 0 check (shipping_in_cents >= 0),
  consent_version text not null,
  consent_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
alter table public.store_orders enable row level security;
revoke all on public.store_orders from anon, authenticated;
grant select, insert, update on public.store_orders to service_role;

create table public.store_payments (
  transaction_id text primary key,
  order_id uuid not null references public.store_orders(id),
  status text not null,
  event_timestamp bigint not null,
  updated_at timestamptz not null default now()
);
alter table public.store_payments enable row level security;
revoke all on public.store_payments from anon, authenticated;
grant select, insert, update on public.store_payments to service_role;

-- Locks the order so duplicate or out-of-order notifications cannot undo approval.
create function public.record_store_payment(p_reference text, p_transaction text, p_amount integer, p_currency text, p_environment text, p_status text, p_timestamp bigint)
returns void language plpgsql security definer set search_path = '' as $$
declare o public.store_orders; previous public.store_payments;
begin
  select * into o from public.store_orders where reference=p_reference for update;
  if not found or o.payment_method <> 'advance' or o.amount_in_cents <> p_amount or o.currency <> p_currency or o.environment <> p_environment then
    raise exception 'Payment does not match order';
  end if;
  if p_status not in ('PENDING','APPROVED','DECLINED','ERROR','VOIDED') then raise exception 'Invalid status'; end if;
  select * into previous from public.store_payments where transaction_id=p_transaction;
  if found and (previous.order_id <> o.id or previous.event_timestamp > p_timestamp) then return; end if;
  if previous.status='APPROVED' and p_status <> 'VOIDED' then return; end if;
  insert into public.store_payments(transaction_id,order_id,status,event_timestamp)
  values(p_transaction,o.id,p_status,p_timestamp)
  on conflict(transaction_id) do update set status=excluded.status,event_timestamp=excluded.event_timestamp,updated_at=now();
  if p_status='APPROVED' or o.payment_status <> 'approved' or (p_status='VOIDED' and previous.status='APPROVED') then
    update public.store_orders set payment_status=lower(p_status) where id=o.id;
  end if;
end $$;
revoke all on function public.record_store_payment(text,text,integer,text,text,text,bigint) from public, anon, authenticated;
grant execute on function public.record_store_payment(text,text,integer,text,text,text,bigint) to service_role;
