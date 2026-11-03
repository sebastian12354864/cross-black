import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sha256,validEvent,validateOrder} from '../supabase/functions/_shared/payment.mjs';

const sample=()=>({requestId:'12345678-1234-4234-8234-123456789abc',payment:'advance',size:'M',color:'Negro',quantity:2,consent:true,zone:'urban',customer:{firstName:'Prueba',lastName:'Prueba',phone:'3001234567',email:'test@example.com',department:'Antioquia',city:'Medellín',address:'Dirección de prueba',neighborhood:'Prueba',property:'Casa'}});
const destinations=['Antioquia|Medellín'];
test('price is computed server-side, ignoring a client amount',()=>{
 const b=sample();b.amount=1;assert.equal(validateOrder(b,destinations).amount,19400000);
 b.payment='cod';assert.equal(validateOrder(b,destinations).amount,20000000);
});
test('unapproved destinations, rural addresses and missing consent are rejected',()=>{
 const b=sample();assert.throws(()=>validateOrder(b,[]));b.zone='rural';assert.throws(()=>validateOrder(b,destinations));b.zone='urban';b.consent=false;assert.throws(()=>validateOrder(b,destinations));
});
test('invalid product variants, quantities and apartment details are rejected',()=>{
 for(const change of [{color:'Café'},{quantity:0},{quantity:1.5},{size:'XXS'},{customer:{...sample().customer,property:'Apartamento'}}])assert.throws(()=>validateOrder({...sample(),...change},destinations));
});
test('SHA-256 fixture independently computed with Python validates and tampering fails',async()=>{
 const e={data:{transaction:{id:'1234-1610641025-49201',status:'APPROVED',amount_in_cents:4490000}},timestamp:1530291411,signature:{properties:['transaction.id','transaction.status','transaction.amount_in_cents'],checksum:'5A18EC5E8FDB7DF463E9F94774CBA8F583BA21BD04A09CEFF2EA68A4BC0AEFBE'}};
 const secret='prod_events_OcHnIzeBl5socpwByQ4hA52Em3USQ93Z';
 assert.equal(await validEvent(e,secret),true);e.data.transaction.amount_in_cents=1;assert.equal(await validEvent(e,secret),false);
});
test('signature follows dynamic property order and rejects missing fields',async()=>{
 const e={data:{transaction:{id:'test',status:'DECLINED'}},timestamp:1,signature:{properties:['transaction.status','transaction.id'],checksum:await sha256('DECLINEDtest1secret')}};
 assert.equal(await validEvent(e,'secret'),true);e.signature.properties.push('transaction.missing');assert.equal(await validEvent(e,'secret'),false);
});
