// Run with: PGLITE_MODULE=<absolute module path> node tests/manual-dropi-db.cjs
// Uses an isolated, in-memory PostgreSQL database. Never connects to Supabase.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

(async()=>{
 const {PGlite}=require(process.env.PGLITE_MODULE||'@electric-sql/pglite');
 const db=new PGlite();
 await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
 for(const file of ['202611020001_orders.sql','202611030001_manual_dropi.sql'])await db.exec(fs.readFileSync(path.join(__dirname,'../supabase/migrations',file),'utf8'));
 async function reject(sql,message){let failed=false;try{await db.exec(sql);}catch{failed=true;}assert.equal(failed,true,message);}
 async function insert(reference,environment,payment){await db.query(`insert into public.store_orders(request_id,request_hash,reference,environment,payment_method,customer,size,color,quantity,amount_in_cents,consent_version) values(gen_random_uuid(),'test',$1,$2,$3,'{"firstName":"=HYPERLINK(1)","lastName":"Prueba","phone":"3001234567"}','M','Negro',1,9700000,'test')`,[reference,environment,payment]);}
 await insert('test-order','test','cod');
 assert.equal((await db.query('select * from public.pedidos_revision_manual')).rows.length,0,'Test orders must never enter the live queue');
 await reject("update public.store_orders set fulfillment_status='manual_registered',dropi_order_id='NO-REAL-ORDER' where reference='test-order'",'Test shipments must be blocked');
 await insert('prod-advance','prod','advance');
 await db.exec("update public.store_orders set customer_confirmed_at=now(),stock_confirmed_at=now(),coverage_confirmed_at=now() where reference='prod-advance'");
 assert.equal((await db.query('select * from public.pedidos_listos_dropi')).rows.length,0,'Unpaid advance must not be ready');
 await reject("update public.store_orders set fulfillment_status='manual_registered',dropi_order_id='SIMULATED-1' where reference='prod-advance'",'Unpaid advance must not be registered');
 await db.exec("select public.record_store_payment('prod-advance','simulated-tx',9700000,'COP','prod','APPROVED',100)");
 let ready=(await db.query('select * from public.pedidos_listos_dropi')).rows;
 assert.equal(ready.length,1);assert.equal(Number(ready[0].recaudo_producto_cop),0,'Paid product must not be collected again');
 assert.ok(ready[0].cliente.startsWith("'="),'Export must escape spreadsheet formulas');
 await reject("update public.store_orders set fulfillment_status='manual_registered' where reference='prod-advance'",'Dropi ID is required');
 await db.exec("update public.store_orders set fulfillment_status='manual_registered',dropi_order_id='SIMULATED-1' where reference='prod-advance'");
 assert.equal((await db.query('select * from public.pedidos_listos_dropi')).rows.length,0,'Registered orders must leave the queue');
 await insert('prod-cod','prod','cod');
 await reject("update public.store_orders set fulfillment_status='manual_registered',dropi_order_id='SIMULATED-2' where reference='prod-cod'",'Missing reviews must prevent registration');
 await db.exec("update public.store_orders set customer_confirmed_at=now(),stock_confirmed_at=now(),coverage_confirmed_at=now() where reference='prod-cod'");
 ready=(await db.query('select * from public.pedidos_listos_dropi')).rows;
 assert.equal(Number(ready[0].recaudo_producto_cop),97000,'COD should preserve the amount to collect');
 await reject("update public.store_orders set fulfillment_status='manual_registered',dropi_order_id='SIMULATED-1' where reference='prod-cod'",'Duplicate Dropi IDs must be blocked');
 for(const role of ['anon','authenticated']){
  await db.exec('set role '+role);
  await reject('select * from public.pedidos_revision_manual','Private review view must deny '+role);
  await reject('select * from public.pedidos_listos_dropi','Private ready view must deny '+role);
  await db.exec('reset role');
 }
 await db.close();
 console.log('PASS: private queues, test isolation, review gates, payment gate, collect-on-delivery amount, duplicate IDs and spreadsheet export protection.');
})().catch(error=>{console.error(error);process.exitCode=1;});
