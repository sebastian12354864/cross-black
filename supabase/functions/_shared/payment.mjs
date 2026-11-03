export async function sha256(value) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function validEvent(event, secret) {
  if (!secret || !Number.isSafeInteger(event?.timestamp)) return false;
  const properties = event?.signature?.properties;
  if (!Array.isArray(properties) || !properties.length || properties.length > 30) return false;
  let values = '';
  for (const path of properties) {
    if (typeof path !== 'string' || !/^[a-zA-Z0-9_.]+$/.test(path)) return false;
    let value = event.data;
    for (const key of path.split('.')) {
      if (!value || !Object.hasOwn(value, key)) return false;
      value = value[key];
    }
    if (!['number', 'string', 'boolean'].includes(typeof value)) return false;
    values += String(value);
  }
  const expected = await sha256(values + event.timestamp + secret);
  const supplied = String(event.signature.checksum || '').toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(supplied)) return false;
  let diff = 0;
  for (let i = 0; i < 64; i++) diff |= expected.charCodeAt(i) ^ supplied.charCodeAt(i);
  return diff === 0;
}

export function validateOrder(body, allowedDestinations) {
  if (!body || !/^[a-f0-9-]{36}$/i.test(body.requestId || '')) throw Error('Identificador inválido.');
  if (!['cod','advance'].includes(body.payment)) throw Error('Selecciona el método de pago.');
  if (!['S','M','L','XL','2XL','3XL'].includes(body.size) || !['Negro','Beige'].includes(body.color)) throw Error('Selecciona talla y color válidos.');
  if (!Number.isInteger(body.quantity) || body.quantity < 1 || body.quantity > 10) throw Error('Cantidad inválida.');
  if (body.consent !== true) throw Error('Debes autorizar el tratamiento de tus datos.');
  const customer = {};
  for (const [key, max] of Object.entries({firstName:80,lastName:80,phone:20,email:150,department:100,city:100,address:180,neighborhood:100,property:40,unit:150,notes:500})) {
    const value = body.customer?.[key];
    if (value !== undefined && typeof value !== 'string') throw Error('Datos inválidos.');
    customer[key] = (value || '').trim();
    if (customer[key].length > max) throw Error('Datos demasiado largos.');
  }
  for (const field of ['firstName','lastName','phone','department','city','address','neighborhood','property']) if (!customer[field]) throw Error('Completa tus datos de entrega.');
  if (!/^(\+57\s?)?3\d{9}$/.test(customer.phone)) throw Error('Celular inválido.');
  if (body.payment === 'advance' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) throw Error('Correo inválido.');
  if (customer.property === 'Apartamento' && !customer.unit) throw Error('Falta el apartamento.');
  const destination = customer.department + '|' + customer.city;
  if (body.zone !== 'urban' || !allowedDestinations.includes(destination)) throw Error('Esta dirección requiere confirmar cobertura y envío antes de comprar.');
  return {customer,size:body.size,color:body.color,quantity:body.quantity,payment:body.payment,amount:body.quantity * (body.payment === 'advance' ? 9700000 : 10000000)};
}
