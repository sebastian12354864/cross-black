'use strict';
const departments=['Amazonas','Antioquia','Arauca','Atlántico','Bogotá, D. C.','Bolívar','Boyacá','Caldas','Caquetá','Casanare','Cauca','Cesar','Chocó','Córdoba','Cundinamarca','Guainía','Guaviare','Huila','La Guajira','Magdalena','Meta','Nariño','Norte de Santander','Putumayo','Quindío','Risaralda','San Andrés, Providencia y Santa Catalina','Santander','Sucre','Tolima','Valle del Cauca','Vaupés','Vichada'];
const dialog=document.querySelector('#checkout');
const form=document.querySelector('#delivery-form');
const layout=document.querySelector('.checkout-layout');
const review=document.querySelector('#review');
let quantity=1;
let opener;
document.querySelector('#year').textContent=new Date().getFullYear();
for(const department of departments){const option=document.createElement('option');option.value=department;option.textContent=department;document.querySelector('#department').append(option);}
const money=value=>new Intl.NumberFormat("es-CO",{style:"currency",currency:"COP",maximumFractionDigits:0}).format(value);
function updatePricing(){const advance=form.elements.payment.value==="advance";const base=quantity*100000;const discount=advance?base*0.03:0;document.querySelector("#summary-base").textContent=money(base);document.querySelector("#summary-discount").textContent=discount?"−"+money(discount):money(0);document.querySelector("#summary-subtotal").textContent=money(base-discount);document.querySelector("#summary-variant").textContent="Talla "+document.querySelector("#size").value+" · "+document.querySelector("#color").value;document.querySelector("#gateway-section").hidden=!advance;form.elements.gateway.required=advance;form.elements.gateway.disabled=!advance;}
form.addEventListener("change",updatePricing);
function updateQuantity(){updatePricing();document.querySelector('#quantity').textContent=quantity;document.querySelector('#summary-quantity').textContent=quantity;document.querySelector('#bag-count').textContent=quantity;document.querySelector('#minus').disabled=quantity===1;document.querySelector('#plus').disabled=quantity===10;}
document.querySelector('#minus').addEventListener('click',()=>{quantity=Math.max(1,quantity-1);updateQuantity();});
document.querySelector('#plus').addEventListener('click',()=>{quantity=Math.min(10,quantity+1);updateQuantity();});
document.querySelectorAll('[data-checkout]').forEach(button=>button.addEventListener('click',()=>{opener=button;for(const id of ["size","color"]){if(!document.getElementById(id).reportValidity()){document.getElementById(id).focus();return;}}updateQuantity();dialog.showModal();}));
document.querySelector('#close-checkout').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
dialog.addEventListener('close',()=>{form.reset();document.querySelector('#review-data').replaceChildren();document.querySelector('#review-pricing').textContent='';review.hidden=true;layout.hidden=false;updateUnit();updatePricing();opener?.focus();});
function updateUnit(){const input=form.elements.unit;const apartment=form.elements.property.value==='Apartamento';input.required=apartment;document.querySelector('#unit-label span').textContent=apartment?'(obligatorio para apartamento)':'(opcional)';}
form.elements.property.addEventListener('change',updateUnit);
const labels={firstName:'Nombres',lastName:'Apellidos',phone:'Celular',email:'Correo',department:'Departamento',city:'Municipio',address:'Dirección',neighborhood:'Barrio / vereda',property:'Inmueble',unit:'Complemento',notes:'Indicaciones',postalCode:'Código postal',recipient:'Quién recibe',recipientPhone:'Celular de quien recibe',payment:'Método de pago',gateway:'Pasarela'};
form.addEventListener('submit',event=>{event.preventDefault();if(!form.reportValidity())return;const data=new FormData(form);const list=document.querySelector('#review-data');list.replaceChildren();for(const [key,label]of Object.entries(labels)){let value=String(data.get(key)||'').trim();if(!value)continue;if(key==='gateway'&&data.get('payment')!=='advance')continue;if(key==='payment')value=value==='cod'?'Contra entrega':'Anticipado · 3 % de descuento';const dt=document.createElement('dt');dt.textContent=label;const dd=document.createElement('dd');dd.textContent=value;list.append(dt,dd);}document.querySelector("#review-pricing").textContent=`${quantity} unidad(es) · Talla ${document.querySelector("#size").value} · ${document.querySelector("#color").value} · Subtotal ${document.querySelector("#summary-subtotal").textContent} COP + envío por confirmar`;layout.hidden=true;review.hidden=false;dialog.scrollTop=0;document.querySelector('#edit-details').focus();});
document.querySelector('#edit-details').addEventListener('click',()=>{review.hidden=true;layout.hidden=false;form.elements.firstName.focus();});
document.querySelector('#minus').disabled=true;
