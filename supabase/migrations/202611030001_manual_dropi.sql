-- Manual fulfillment only. Does not call Dropi or create a shipment.
alter table public.store_orders
  add column if not exists customer_confirmed_at timestamptz,
  add column if not exists stock_confirmed_at timestamptz,
  add column if not exists coverage_confirmed_at timestamptz,
  add column if not exists dropi_order_id text,
  add column if not exists tracking_code text,
  add column if not exists manual_registered_at timestamptz,
  add column if not exists manual_notes text;
create unique index if not exists store_orders_dropi_id_unique
  on public.store_orders (dropi_order_id) where dropi_order_id is not null;

create or replace function public.guard_manual_dropi_registration()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.fulfillment_status = 'manual_registered' and
    (old.fulfillment_status is distinct from 'manual_registered' or new.dropi_order_id is distinct from old.dropi_order_id) then
    if new.environment <> 'prod' then raise exception 'No registrar pedidos de prueba en Dropi'; end if;
    if new.customer_confirmed_at is null or new.stock_confirmed_at is null or new.coverage_confirmed_at is null then
      raise exception 'Confirmar cliente, inventario y cobertura primero';
    end if;
    if new.payment_method = 'advance' and new.payment_status <> 'approved' then
      raise exception 'El pago anticipado no esta aprobado';
    end if;
    if new.dropi_order_id is null or btrim(new.dropi_order_id) = '' then raise exception 'Falta numero de pedido Dropi'; end if;
    new.manual_registered_at = coalesce(new.manual_registered_at,now());
  end if;
  return new;
end $$;
revoke all on function public.guard_manual_dropi_registration() from public,anon,authenticated;
create or replace trigger guard_manual_dropi_registration
  before update of fulfillment_status,dropi_order_id on public.store_orders
  for each row execute function public.guard_manual_dropi_registration();

-- Escape spreadsheet formula prefixes in operator exports.
create or replace function public.store_export_text(value text)
returns text language sql immutable set search_path = '' as $$
  select case when coalesce(value,'') ~ '^[[:space:]]*[=+@-]' then chr(39)||value else coalesce(value,'') end
$$;
revoke all on function public.store_export_text(text) from public,anon,authenticated;
grant execute on function public.store_export_text(text) to service_role;

create or replace view public.pedidos_revision_manual with (security_invoker=true) as
select
  id, reference as numero_tienda, created_at as fecha,
  case
    when fulfillment_status='manual_registered' then 'REGISTRADO_EN_DROPI'
    when fulfillment_status='cancelled' then 'CANCELADO'
    when payment_method='advance' and payment_status<>'approved' then 'ESPERAR_PAGO'
    when customer_confirmed_at is null then 'CONFIRMAR_CLIENTE'
    when stock_confirmed_at is null then 'CONFIRMAR_INVENTARIO'
    when coverage_confirmed_at is null then 'CONFIRMAR_COBERTURA'
    else 'LISTO_PARA_CARGAR'
  end as siguiente_paso,
  public.store_export_text(concat(customer->>'firstName',' ',customer->>'lastName')) as cliente,
  public.store_export_text(customer->>'phone') as celular,
  public.store_export_text(customer->>'email') as correo,
  public.store_export_text(customer->>'department') as departamento,
  public.store_export_text(customer->>'city') as municipio,
  public.store_export_text(customer->>'address') as direccion,
  public.store_export_text(customer->>'neighborhood') as barrio,
  public.store_export_text(customer->>'property') as inmueble,
  public.store_export_text(customer->>'unit') as apartamento,
  public.store_export_text(customer->>'notes') as indicaciones,
  public.store_export_text(customer->>'recipient') as recibe,
  public.store_export_text(customer->>'recipientPhone') as celular_recibe,
  size as talla, color, quantity as cantidad,
  case payment_method when 'cod' then 'CONTRA_ENTREGA' else 'ANTICIPADO' end as modalidad,
  payment_status as estado_pago,
  amount_in_cents/100.0 as total_cliente_cop,
  shipping_in_cents/100.0 as envio_cliente_cop,
  case when payment_method='cod' then amount_in_cents/100.0 else 0 end as recaudo_producto_cop,
  customer_confirmed_at,stock_confirmed_at,coverage_confirmed_at,
  public.store_export_text(dropi_order_id) as numero_dropi,
  public.store_export_text(tracking_code) as guia,
  fulfillment_status as estado_despacho,manual_registered_at,
  public.store_export_text(manual_notes) as notas_internas
from public.store_orders where environment='prod';
revoke all on public.pedidos_revision_manual from public,anon,authenticated;
grant select on public.pedidos_revision_manual to service_role;

create or replace view public.pedidos_listos_dropi with (security_invoker=true) as
select * from public.pedidos_revision_manual where siguiente_paso='LISTO_PARA_CARGAR';
revoke all on public.pedidos_listos_dropi from public,anon,authenticated;
grant select on public.pedidos_listos_dropi to service_role;

select 'Bandejas manuales creadas. Pedidos de prueba excluidos. No se han generado despachos.' as resultado;
