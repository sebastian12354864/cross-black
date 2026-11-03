import {storeConfig as config} from './store-config.js?v=live-1';
const params=new URLSearchParams(location.search);
const transactionId=params.get('id')||'';
const environment=params.get('mode')==='test'?'test':'prod';
const title=document.querySelector('#payment-title');
const message=document.querySelector('#payment-message');
const notice=document.querySelector('#payment-notice');
const refresh=document.querySelector('#refresh-payment');
let timer, attempts=0, busy=false;
async function check(){
 if(busy)return;
 clearTimeout(timer);
 if(!/^[a-zA-Z0-9-]{5,100}$/.test(transactionId)){notice.textContent='No encontramos el identificador del pago. Escríbenos para revisar tu pedido.';refresh.hidden=true;return;}
 busy=true;refresh.disabled=true;
 try{
  const response=await fetch(config.statusUrl,{method:'POST',headers:{'Content-Type':'application/json',apikey:config.publicKey,Authorization:`Bearer ${config.publicKey}`},body:JSON.stringify({transactionId,environment}),signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw Error('consulta');
  const data=await response.json();
  const states={approved:['Pago confirmado','Recibimos la confirmación de tu pago. Revisaremos tus datos para coordinar el despacho.'],declined:['Pago rechazado','Wompi informó que el pago fue rechazado. Consulta el resultado en Wompi antes de intentar otro pago.'],error:['El pago presentó un error','Revisa el resultado en Wompi o contáctanos antes de intentar nuevamente.'],voided:['Pago anulado','Wompi informó la anulación de este pago. Escríbenos para revisar el pedido.']};
  if(states[data.status]&&data.environment===environment){[title.textContent,message.textContent]=states[data.status];notice.textContent=environment==='test'?'Resultado de prueba: no corresponde a una venta real.':'Estado confirmado mediante la notificación verificada de Wompi.';document.querySelector('#payment-reference').textContent=data.reference||'';}
  else{title.textContent='Estamos verificando tu pago.';message.textContent='La confirmación puede tardar unos momentos. Evita pagar nuevamente mientras revisamos el resultado.';notice.textContent='Aún no recibimos una confirmación definitiva.';if(++attempts<6)timer=setTimeout(check,4000);}
 }catch{notice.textContent='No pudimos consultar el estado en este momento. Consulta de nuevo o escríbenos; evita repetir el pago.';}
 finally{busy=false;refresh.disabled=false;}
}
refresh.addEventListener('click',()=>{attempts=0;check();});
check();
