const {readFileSync}=require('node:fs');
const assert=require('node:assert/strict');
const {JSDOM}=require(process.env.JSDOM_MODULE||'jsdom');
async function run(payment){
 const dom=new JSDOM(readFileSync('index.html','utf8'),{url:'https://sebastian12354864.github.io/cross-black/',runScripts:'outside-only'});
 const w=dom.window,d=w.document;
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
 w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'));};
 w.turnstile={render(_el,options){options.callback('valid-token');return 1;},reset(){}};
 let payload;
 w.fakeSend=async(_config,value)=>{payload=value;return {environment:'prod',reference:'QF-prod-test',...(payment==='advance'?{checkoutUrl:'https://checkout.wompi.co/p/?public-key=pub_prod_fake'}:{status:'pending_confirmation'})};};
 const imports="const config={enabled:true,consentVersion:'2026-11-03'};const destinations=[{department:'Antioquia',city:'Medellín'}];const deliveryCovered=(d,department,city,zone,property)=>zone==='urban'&&property!=='Finca / zona rural'&&d.some(x=>x.department===department&&x.city===city);const sendOrder=window.fakeSend;\n";
 w.eval(imports+readFileSync('app.js','utf8').replace(/^import .*;\r?\n/gm,''));
 d.querySelector('#size').value='M';d.querySelector('#color').value='Beige';d.querySelector('[data-checkout]').click();
 const f=d.querySelector('form');
 for(const [name,value]of Object.entries({firstName:'Ana',lastName:'Prueba',phone:'3001234567',email:'ana@example.com',department:'Antioquia',address:'Calle 12 #34',neighborhood:'Centro',property:'Casa'})){f.elements[name].value=value;f.elements[name].dispatchEvent(new w.Event('change',{bubbles:true}));}
 f.elements.city.value='Medellín';f.elements.zone.value='urban';f.elements.payment.value=payment;f.elements.consent.checked=true;f.elements.terms.checked=true;
 f.dispatchEvent(new w.Event('change',{bubbles:true}));
 assert.equal(f.checkValidity(),true);
 f.dispatchEvent(new w.Event('submit',{cancelable:true,bubbles:true}));
 assert.equal(d.querySelector('#review').hidden,false);
 assert.equal(d.querySelector('#confirm-order').disabled,false);
 d.querySelector('#confirm-order').click();await new Promise(resolve=>setTimeout(resolve,0));
 assert.equal(payload.payment,payment);assert.equal(payload.customer.city,'Medellín');assert.equal(payload.captchaToken,'valid-token');assert.equal(payload.consent,true);
 assert.equal(d.querySelector('#payment-link').hidden,payment!=='advance');
 assert.equal(d.querySelector('#confirm-order').hidden,true);
 d.querySelector('#close-checkout').click();assert.equal(d.querySelector('#review').hidden,true);
 dom.window.close();
}
(async()=>{await run('cod');await run('advance');console.log('PASS: checkout opens, validates, reviews, sends COD/prepaid and resets.');})().catch(error=>{console.error(error);process.exitCode=1;});
