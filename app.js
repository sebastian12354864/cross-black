import {storeConfig as config} from './store-config.js?v=live-1';
import {destinations} from './delivery-config.js';
import {deliveryCovered,sendOrder} from './order-client.js';
'use strict';
const departments=['Amazonas','Antioquia','Arauca','Atlántico','Bogotá, D. C.','Bolívar','Boyacá','Caldas','Caquetá','Casanare','Cauca','Cesar','Chocó','Córdoba','Cundinamarca','Guainía','Guaviare','Huila','La Guajira','Magdalena','Meta','Nariño','Norte de Santander','Putumayo','Quindío','Risaralda','San Andrés, Providencia y Santa Catalina','Santander','Sucre','Tolima','Valle del Cauca','Vaupés','Vichada'];
const dialog=document.querySelector('#checkout');
const form=document.querySelector('#delivery-form');
const layout=document.querySelector('.checkout-layout');
const review=document.querySelector('#review');
let quantity=1;
let opener;
let busy=false;
let captchaToken='';
let widgetId;
let requestId=crypto.randomUUID();
let reviewedPayload;
const confirmation=document.querySelector('#confirm-order');
const orderMessage=document.querySelector('#order-message');
const paymentLink=document.querySelector('#payment-link');
const citySelect=document.querySelector('#city');
function covered(){return deliveryCovered(destinations,form.elements.department.value,citySelect.value,form.elements.zone.value,form.elements.property.value);}
function updateCities(){const previous=citySelect.value;citySelect.replaceChildren(new Option('Selecciona el municipio',''));for(const item of destinations.filter(x=>x.department===form.elements.department.value))citySelect.add(new Option(item.city,item.city));if([...citySelect.options].some(x=>x.value===previous))citySelect.value=previous;updatePricing();}
form.elements.department.addEventListener('change',updateCities);

document.querySelector('#year').textContent=new Date().getFullYear();
for(const department of departments){const option=document.createElement('option');option.value=department;option.textContent=department;document.querySelector('#department').append(option);}
const money=value=>new Intl.NumberFormat("es-CO",{style:"currency",currency:"COP",maximumFractionDigits:0}).format(value);
function updatePricing(){const advance=form.elements.payment.value==="advance";const base=quantity*100000;const discount=advance?base*0.03:0;document.querySelector("#summary-base").textContent=money(base);document.querySelector("#summary-discount").textContent=discount?"−"+money(discount):money(0);document.querySelector("#summary-subtotal").textContent=money(base-discount);document.querySelector("#summary-variant").textContent="Talla "+document.querySelector("#size").value+" · "+document.querySelector("#color").value;document.querySelector("#gateway-section").hidden=!advance;form.elements.gateway.required=advance;form.elements.gateway.disabled=!advance;form.elements.email.required=advance;document.querySelector('#summary-shipping').textContent=covered()?'Gratis':'Por cotizar';document.querySelector('#coverage-note').hidden=covered();}
form.addEventListener("change",()=>{requestId=crypto.randomUUID();reviewedPayload=undefined;updatePricing();});
function updateQuantity(){updatePricing();document.querySelector('#quantity').textContent=quantity;document.querySelector('#summary-quantity').textContent=quantity;document.querySelector('#bag-count').textContent=quantity;document.querySelector('#minus').disabled=quantity===1;document.querySelector('#plus').disabled=quantity===10;}
document.querySelector('#minus').addEventListener('click',()=>{quantity=Math.max(1,quantity-1);updateQuantity();});
document.querySelector('#plus').addEventListener('click',()=>{quantity=Math.min(10,quantity+1);updateQuantity();});
document.querySelectorAll('[data-checkout]').forEach(button=>button.addEventListener('click',()=>{opener=button;for(const id of ["size","color"]){if(!document.getElementById(id).reportValidity()){document.getElementById(id).focus();return;}}updateQuantity();dialog.showModal();}));
document.querySelector('#close-checkout').addEventListener('click',()=>{if(!busy)dialog.close();});
dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault();});
dialog.addEventListener('click',event=>{if(!busy&&event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
dialog.addEventListener('close',()=>{form.reset();requestId=crypto.randomUUID();reviewedPayload=undefined;captchaToken='';orderMessage.textContent='';paymentLink.hidden=true;paymentLink.removeAttribute('href');confirmation.hidden=false;confirmation.disabled=true;if(widgetId!==undefined)window.turnstile?.reset(widgetId);updateCities();document.querySelector('#review-data').replaceChildren();document.querySelector('#review-pricing').textContent='';review.hidden=true;layout.hidden=false;document.querySelector('#edit-details').hidden=false;document.querySelector('#captcha-area').hidden=false;updateUnit();updatePricing();opener?.focus();});
function updateUnit(){const input=form.elements.unit;const apartment=form.elements.property.value==='Apartamento';input.required=apartment;document.querySelector('#unit-label span').textContent=apartment?'(obligatorio para apartamento)':'(opcional)';}
form.elements.property.addEventListener('change',updateUnit);
const labels={zone:'Zona',firstName:'Nombres',lastName:'Apellidos',phone:'Celular',email:'Correo',department:'Departamento',city:'Municipio',address:'Dirección',neighborhood:'Barrio / vereda',property:'Inmueble',unit:'Complemento',notes:'Indicaciones',postalCode:'Código postal',recipient:'Quién recibe',recipientPhone:'Celular de quien recibe',payment:'Método de pago',gateway:'Pasarela'};
form.addEventListener('submit',event=>{
 event.preventDefault();if(!form.reportValidity())return;
 if(!covered()){document.querySelector('#coverage-note').hidden=false;form.elements.zone.focus();return;}
 const data=new FormData(form);const list=document.querySelector('#review-data');list.replaceChildren();
 for(const [key,label]of Object.entries(labels)){
  let value=String(data.get(key)||'').trim();if(!value)continue;
  if(key==='gateway'&&data.get('payment')!=='advance')continue;
  if(key==='payment')value=value==='cod'?'Contra entrega':'Anticipado · 3 % de descuento';
  if(key==='zone')value=value==='urban'?'Urbana':'Rural / vereda';
  const dt=document.createElement('dt');dt.textContent=label;const dd=document.createElement('dd');dd.textContent=value;list.append(dt,dd);
 }
 reviewedPayload={requestId,payment:data.get('payment'),size:document.querySelector('#size').value,color:document.querySelector('#color').value,quantity,zone:data.get('zone'),consent:form.elements.consent.checked,termsAccepted:form.elements.terms.checked,consentVersion:config.consentVersion,customer:Object.fromEntries(Object.keys(labels).filter(key=>!['zone','payment','gateway'].includes(key)).map(key=>[key,String(data.get(key)||'').trim()]))};
 document.querySelector('#review-pricing').textContent=`${quantity} unidad(es) · Talla ${reviewedPayload.size} · ${reviewedPayload.color} · Total ${document.querySelector('#summary-subtotal').textContent} · Envío gratis`;
 layout.hidden=true;review.hidden=false;dialog.scrollTop=0;orderMessage.textContent='';paymentLink.hidden=true;confirmation.hidden=false;
 confirmation.textContent=reviewedPayload.payment==='advance'?'Registrar y continuar al pago':'Confirmar pedido contra entrega';
 confirmation.disabled=!config.enabled||!captchaToken;
 if(config.enabled)showCaptcha();
 document.querySelector('#edit-details').focus();
});
confirmation.addEventListener('click',async()=>{
 if(busy||!reviewedPayload||!captchaToken||!config.enabled)return;
 busy=true;confirmation.disabled=true;document.querySelector('#close-checkout').disabled=true;document.querySelector('#edit-details').disabled=true;orderMessage.textContent='Registrando tu pedido…';
 try{
  const result=await sendOrder(config,{...reviewedPayload,captchaToken});
  confirmation.hidden=true;document.querySelector('#captcha-area').hidden=true;document.querySelector('#edit-details').hidden=true;
  document.querySelector('#review-data').replaceChildren();
  if(result.checkoutUrl){paymentLink.href=result.checkoutUrl;paymentLink.hidden=false;orderMessage.textContent=`Pedido ${result.reference} registrado. Continúa a Wompi para realizar el pago. Todavía no está pagado.`;}
  else orderMessage.textContent=result.status==='approved'?`Pedido ${result.reference}: pago confirmado. Revisaremos los datos para coordinar el despacho.`:`Pedido ${result.reference} recibido. Te contactaremos para confirmar disponibilidad y entrega. Pagarás al recibirlo.`;
 }catch(error){orderMessage.textContent=error.name==='TimeoutError'?'La respuesta tardó demasiado. Reintenta aquí; conservaremos el identificador para evitar duplicados.':error.message;}
 finally{busy=false;captchaToken='';document.querySelector('#close-checkout').disabled=false;document.querySelector('#edit-details').disabled=false;if(widgetId!==undefined)window.turnstile?.reset(widgetId);}
});
function showCaptcha(){
 document.querySelector('#captcha-area').hidden=false;
 if(window.turnstile){if(widgetId===undefined)widgetId=window.turnstile.render('#captcha-area',{sitekey:config.turnstileSiteKey,action:'checkout',callback:token=>{captchaToken=token;confirmation.disabled=busy;},'expired-callback':()=>{captchaToken='';confirmation.disabled=true;},'error-callback':()=>{captchaToken='';confirmation.disabled=true;orderMessage.textContent='No pudimos verificar la solicitud. Recarga e intenta nuevamente.';}});return;}
 if(document.querySelector('#turnstile-loader'))return;
 window.onStoreTurnstileReady=showCaptcha;
 const script=document.createElement('script');script.id='turnstile-loader';script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onStoreTurnstileReady&render=explicit';script.async=true;script.defer=true;script.onerror=()=>{orderMessage.textContent='No se pudo cargar la verificación. Revisa tu conexión.';};document.head.append(script);
}
if(config.enabled){
 document.querySelectorAll('[data-preview-only]').forEach(el=>{el.hidden=true;});
 document.querySelectorAll('[data-live-only]').forEach(el=>{el.hidden=false;});
}else confirmation.hidden=true;
updateCities();updatePricing();
document.querySelector('#edit-details').addEventListener('click',()=>{if(busy)return;requestId=crypto.randomUUID();reviewedPayload=undefined;review.hidden=true;layout.hidden=false;form.elements.firstName.focus();});
document.querySelector('#minus').disabled=true;
