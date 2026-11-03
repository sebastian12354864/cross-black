export function checkedCheckoutUrl(value,environment){
 const url=new URL(value);
 const prefix=environment==='prod'?'pub_prod_':'pub_test_';
 if(url.origin!=='https://checkout.wompi.co'||url.pathname!=='/p/'||!url.searchParams.get('public-key')?.startsWith(prefix))throw Error('No se pudo abrir el pago seguro. Contáctanos para revisar tu pedido.');
 return url.href;
}
export function deliveryCovered(destinations,department,city,zone,property){
 return zone==='urban'&&property!=='Finca / zona rural'&&destinations.some(item=>item.department===department&&item.city===city);
}
export async function sendOrder(config,payload,fetcher=fetch){
 const response=await fetcher(config.orderUrl,{method:'POST',headers:{'Content-Type':'application/json',apikey:config.publicKey,Authorization:`Bearer ${config.publicKey}`},body:JSON.stringify(payload),signal:AbortSignal.timeout(25000)});
 const data=await response.json();
 if(!response.ok)throw Error(data.error||'No pudimos registrar el pedido. Intenta nuevamente.');
 if(data.environment!==config.environment||typeof data.reference!=='string')throw Error('No pudimos confirmar el registro del pedido. Contáctanos antes de repetirlo.');
 if(data.checkoutUrl)data.checkoutUrl=checkedCheckoutUrl(data.checkoutUrl,config.environment);
 return data;
}
