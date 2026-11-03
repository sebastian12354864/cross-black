import {checkoutConfig as config} from './checkout-config.js';
import {destinations} from './delivery-config.js';

const form=document.querySelector('#test-checkout');
const status=document.querySelector('#test-status');
const submit=document.querySelector('#test-submit');
const link=document.querySelector('#test-payment-link');
const destination=document.querySelector('#test-destination');
const money=n=>new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(n);
let requestId=crypto.randomUUID();
let captchaToken='';
let widgetId;
let busy=false;
let completed=false;
let retryPayload;

for(const [index,item] of destinations.entries()){
 const option=document.createElement('option');option.value=String(index);option.textContent=`${item.city} · ${item.department}`;destination.append(option);
}
function update(){
 const rural=document.querySelector('#test-zone').value==='rural';
 const amount=Number(document.querySelector('#test-quantity').value)*(document.querySelector('#test-payment').value==='advance'?97000:100000);
 document.querySelector('#test-total').textContent=rural?'Envío por cotizar. Esta dirección no puede continuar al pago.':`Total de prueba: ${money(amount)} · Envío: $0`;
 document.querySelector('#test-image').src=document.querySelector('#test-color').value==='Negro'?'assets/body-negro.png':'assets/body-beige.png';
 document.querySelector('#test-image').alt=`Body ${document.querySelector('#test-color').value.toLowerCase()}, imagen recreada`;
 submit.disabled=!config.enabled||!config.supabaseAnonKey||!config.turnstileSiteKey||!captchaToken||rural||busy||completed;
}
function changed(){
 requestId=crypto.randomUUID();retryPayload=undefined;completed=false;link.hidden=true;link.removeAttribute('href');update();
}
form.addEventListener('change',changed);
form.addEventListener('input',changed);
form.addEventListener('submit',async event=>{
 event.preventDefault();
 if(!form.reportValidity()||submit.disabled||busy)return;
 const place=destinations[Number(destination.value)];
 if(!place)return;
 busy=true;update();status.textContent='Preparando el pedido de prueba…';
 const payload=retryPayload||{requestId,payment:document.querySelector('#test-payment').value,size:document.querySelector('#test-size').value,color:document.querySelector('#test-color').value,quantity:Number(document.querySelector('#test-quantity').value),zone:document.querySelector('#test-zone').value,consent:true,customer:{firstName:'Cliente',lastName:'Prueba',phone:'3001234567',email:'prueba@example.com',department:place.department,city:place.city,address:'Dirección ficticia de prueba, no despachar',neighborhood:'Prueba',property:'Casa'}};
 retryPayload=payload;
 form.querySelector('fieldset').disabled=true;
 try{
  const response=await fetch(config.functionUrl,{method:'POST',headers:{'Content-Type':'application/json',apikey:config.supabaseAnonKey,Authorization:`Bearer ${config.supabaseAnonKey}`},body:JSON.stringify({...payload,captchaToken}),signal:AbortSignal.timeout(20000)});
  const result=await response.json();
  if(!response.ok)throw Error(result.error||'No se pudo preparar la prueba.');
  if(result.environment!=='test'||typeof result.reference!=='string')throw Error('Respuesta de prueba inesperada.');
  if(result.checkoutUrl){
   const url=new URL(result.checkoutUrl);
   if(url.origin!=='https://checkout.wompi.co'||url.pathname!=='/p/'||!url.searchParams.get('public-key')?.startsWith('pub_test_'))throw Error('El enlace no corresponde a Wompi de pruebas.');
   link.href=url.href;link.hidden=false;
   status.textContent=`Pedido de prueba ${result.reference}. Continúa a Wompi para simular el pago. Todavía no está aprobado.`;
  }else status.textContent=`Pedido de prueba ${result.reference} registrado como contra entrega, pendiente de confirmación. No genera un despacho.`;
  completed=true;
 }catch(error){status.textContent=error.name==='TimeoutError'?'La respuesta tardó demasiado. Puedes reintentar; conservaremos el identificador para evitar duplicados.':(error instanceof TypeError?'No se pudo conectar. Revisa tu conexión y reintenta.':error.message);}
 finally{busy=false;captchaToken='';form.querySelector('fieldset').disabled=false;if(widgetId!==undefined)window.turnstile?.reset(widgetId);update();}
});
update();
if(config.enabled&&config.supabaseAnonKey&&config.turnstileSiteKey){
 window.onTurnstileReady=()=>{widgetId=window.turnstile.render('#test-captcha',{sitekey:config.turnstileSiteKey,action:'checkout',callback:token=>{captchaToken=token;update();},'expired-callback':()=>{captchaToken='';update();},'error-callback':()=>{captchaToken='';status.textContent='No pudimos verificar la solicitud. Recarga la página e intenta nuevamente.';update();}});};
 const script=document.createElement('script');script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileReady&render=explicit';script.async=true;script.defer=true;script.onerror=()=>{status.textContent='No se pudo cargar la verificación. Revisa tu conexión.';};document.head.append(script);
 status.textContent='Completa la verificación para iniciar una prueba.';
}
