import {createClient} from 'npm:@supabase/supabase-js@2';
Deno.serve(async req=>{
 const origin=Deno.env.get('STORE_ORIGIN')||'https://sebastian12354864.github.io';
 const headers={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin'};
 const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return reply({error:'Método no permitido.'},405);
 if(req.headers.get('origin')!==origin)return reply({error:'Origen no autorizado.'},403);
 try{
  const raw=await req.text();if(raw.length>1000)return reply({error:'Solicitud inválida.'},400);
  const {transactionId,environment}=JSON.parse(raw);
  if(typeof transactionId!=='string'||!/^[a-zA-Z0-9-]{5,100}$/.test(transactionId)||!['test','prod'].includes(environment))return reply({error:'Solicitud inválida.'},400);
  const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const {data,error}=await db.from('store_payments').select('status,store_orders!inner(reference,environment,amount_in_cents,payment_status)').eq('transaction_id',transactionId).maybeSingle();
  if(error)return reply({error:'No pudimos consultar la confirmación.'},503);
  const order=data?.store_orders as unknown as {reference:string,environment:string,amount_in_cents:number,payment_status:string}|undefined;
  if(!order||order.environment!==environment)return reply({status:'pending'});
  // Only the verified notification can populate store_payments. Never trust redirect status.
  return reply({status:order.payment_status,reference:order.reference,amount:order.amount_in_cents/100,environment});
 }catch{return reply({error:'No pudimos consultar la confirmación.'},400);}
});
