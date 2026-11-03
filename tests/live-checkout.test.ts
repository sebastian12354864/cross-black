import {createOrderHandler} from '../supabase/functions/_shared/create-order.ts';
import {wompiEventHandler} from '../supabase/functions/_shared/wompi-events.ts';
const assert=(value:unknown)=>{if(!value)throw Error('Assertion failed');};
const body={requestId:'11111111-2222-4333-8444-555555555555',payment:'advance',size:'S',color:'Negro',quantity:1,zone:'urban',consent:true,termsAccepted:true,consentVersion:'2026-11-03',captchaToken:'fake',amount:1,customer:{firstName:'Test',lastName:'Cliente',phone:'3001234567',email:'test@example.com',department:'Antioquia',city:'Medellín',address:'Calle 12 # 34',neighborhood:'Centro',property:'Casa'}};
function setup(){for(const [k,v]of Object.entries({CHECKOUT_LIVE_ENABLED:'true',WOMPI_LIVE_PUBLIC_KEY:'pub_prod_fake',WOMPI_LIVE_INTEGRITY_SECRET:'prod_integrity_fake',WOMPI_LIVE_EVENTS_SECRET:'prod_events_fake',FREE_SHIPPING_DESTINATIONS:'["Antioquia|Medellín"]',SELLABLE_VARIANTS:'["S|Negro"]',TURNSTILE_SECRET_KEY:'fake',SUPABASE_URL:'https://db.example.invalid',SUPABASE_SERVICE_ROLE_KEY:'fake'}))Deno.env.set(k,v);}
const request=(value=body)=>new Request('https://local.invalid',{method:'POST',headers:{origin:'https://sebastian12354864.github.io','content-type':'application/json'},body:JSON.stringify(value)});
Deno.test('Live gate, consent and stock reject before network',async()=>{
 setup();const original=globalThis.fetch;globalThis.fetch=()=>{throw Error('Unexpected network');};
 try{Deno.env.set('CHECKOUT_LIVE_ENABLED','false');assert((await createOrderHandler('prod')(request())).status===503);setup();assert((await createOrderHandler('prod')(request({...body,termsAccepted:false}))).status===400);assert((await createOrderHandler('prod')(request({...body,size:'M'}))).status===409);Deno.env.set('WOMPI_LIVE_PUBLIC_KEY','pub_test_wrong');assert((await createOrderHandler('prod')(request())).status===503);}finally{globalThis.fetch=original;}
});
Deno.test('Live order uses server price, production key and persists private order',async()=>{
 setup();const original=globalThis.fetch;let saved:any;
 globalThis.fetch=async(input,init)=>{
  const url=String(input);
  if(url.includes('siteverify'))return Response.json({success:true,hostname:'sebastian12354864.github.io',action:'checkout'});
  if(url.includes('/rest/v1/store_orders')){if(init?.method==='POST'){saved=JSON.parse(String(init.body));return new Response(null,{status:201});}return Response.json(null);}
  throw Error('Unexpected URL '+url);
 };
 try{const response=await createOrderHandler('prod')(request());const data=await response.json();assert(response.status===200);assert(saved.amount_in_cents===9700000);assert(saved.environment==='prod');assert(saved.consent_version==='2026-11-03');const checkout=new URL(data.checkoutUrl);assert(checkout.searchParams.get('public-key')==='pub_prod_fake');assert(checkout.searchParams.get('amount-in-cents')==='9700000');assert(checkout.searchParams.get('redirect-url')?.endsWith('?mode=prod'));}finally{globalThis.fetch=original;}
});
Deno.test('Production webhook rejects test events without network',async()=>{setup();assert((await wompiEventHandler('prod')(new Request('https://local.invalid',{method:'POST',body:JSON.stringify({environment:'test'})}))).status===401);});
