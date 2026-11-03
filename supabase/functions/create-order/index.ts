import { createClient } from 'npm:@supabase/supabase-js@2';
import { sha256, validateOrder } from '../_shared/payment.mjs';

// Sandbox only. Production must be enabled in a separately reviewed release.
Deno.serve(async req => {
  const origin = Deno.env.get('STORE_ORIGIN') || 'https://sebastian12354864.github.io';
  const headers = {'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin'};
  const reply = (data: unknown, status=200) => new Response(JSON.stringify(data),{status,headers});
  if (req.method === 'OPTIONS') return new Response(null,{status:204,headers});
  if (req.method !== 'POST') return reply({error:'Método no permitido.'},405);
  if (req.headers.get('origin') !== origin) return reply({error:'Origen no autorizado.'},403);
  if (Deno.env.get('CHECKOUT_TEST_ENABLED') !== 'true') return reply({error:'Estamos preparando las compras. Intenta más tarde.'},503);
  try {
    const raw = await req.text();
    if (raw.length > 12000) return reply({error:'Solicitud demasiado grande.'},413);
    const body = JSON.parse(raw);
    const allowed = JSON.parse(Deno.env.get('FREE_SHIPPING_DESTINATIONS') || '[]');
    const order = validateOrder(body, allowed);
    // CAPTCHA is verified server-side before any record is written.
    const captchaSecret = Deno.env.get('TURNSTILE_SECRET_KEY');
    if (!captchaSecret || typeof body.captchaToken !== 'string') return reply({error:'Falta verificar la solicitud.'},400);
    const captcha = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',body:new URLSearchParams({secret:captchaSecret,response:body.captchaToken})});
    const challenge = await captcha.json();
    if (!challenge.success || challenge.hostname !== new URL(origin).hostname || challenge.action !== 'checkout') return reply({error:'Verificación inválida. Intenta nuevamente.'},400);
    const db = createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const hash = await sha256(JSON.stringify(order));
    const reference = 'QF-test-' + body.requestId;
    const {data:existing,error:readError} = await db.from('store_orders').select('reference,request_hash').eq('request_id',body.requestId).maybeSingle();
    if (readError) throw Error('storage');
    if (existing && existing.request_hash !== hash) return reply({error:'La solicitud cambió. Inicia un pedido nuevo.'},409);
    const publicKey = Deno.env.get('WOMPI_PUBLIC_KEY') || '';
    const integrity = Deno.env.get('WOMPI_INTEGRITY_SECRET') || '';
    if (order.payment === 'advance' && (!publicKey.startsWith('pub_test_') || !integrity.startsWith('test_integrity_'))) return reply({error:'Los pagos de prueba todavía no están configurados.'},503);
    if (!existing) {
      const {error} = await db.from('store_orders').insert({request_id:body.requestId,request_hash:hash,reference,environment:'test',payment_method:order.payment,customer:order.customer,size:order.size,color:order.color,quantity:order.quantity,amount_in_cents:order.amount,consent_version:'pending-test-v1'});
      if (error) {
        if (error.code === '23505') return reply({error:'El pedido ya se está procesando. Reintenta con el mismo identificador.'},409);
        throw Error('storage');
      }
    }
    if (order.payment === 'cod') return reply({reference,environment:'test',status:'pending_confirmation'});
    const signature = await sha256(reference + order.amount + 'COP' + integrity);
    const params = new URLSearchParams({'public-key':publicKey,currency:'COP','amount-in-cents':String(order.amount),reference,'signature:integrity':signature,'redirect-url':origin+'/cross-black/pago.html'});
    return reply({reference,environment:'test',checkoutUrl:'https://checkout.wompi.co/p/?'+params});
  } catch { return reply({error:'No se pudo preparar el pedido. Revisa tus datos e intenta nuevamente.'},400); }
});
