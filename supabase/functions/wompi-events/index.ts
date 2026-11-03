import { createClient } from 'npm:@supabase/supabase-js@2';
import { validEvent } from '../_shared/payment.mjs';

Deno.serve(async req => {
  const reply = (status:number) => new Response(null,{status});
  if (req.method !== 'POST') return reply(405);
  try {
    const raw = await req.text();
    if (raw.length > 32000) return reply(413);
    const event = JSON.parse(raw);
    const secret = Deno.env.get('WOMPI_EVENTS_SECRET') || '';
    if (!secret.startsWith('test_events_') || event.environment !== 'test' || !await validEvent(event,secret)) return reply(401);
    if (event.event !== 'transaction.updated') return reply(200);
    const tx = event.data.transaction;
    if (!tx || typeof tx.id !== 'string') return reply(400);
    // Signed properties can vary. Verify all business fields with Wompi itself.
    const result = await fetch('https://sandbox.wompi.co/v1/transactions/'+encodeURIComponent(tx.id));
    if (!result.ok) return reply(503);
    const {data:verified} = await result.json();
    if (verified.id !== tx.id || verified.status !== tx.status) return reply(503);
    const db = createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const {error} = await db.rpc('record_store_payment',{p_reference:verified.reference,p_transaction:verified.id,p_amount:verified.amount_in_cents,p_currency:verified.currency,p_environment:'test',p_status:verified.status,p_timestamp:event.timestamp});
    return reply(error ? 500 : 200);
  } catch { return reply(400); }
});
