# Conexión de pruebas: Quita Fácil

Estado: tablas y función SQL creadas y comprobadas en el proyecto. Ambas funciones desplegadas. Se verificó que las tres claves de Wompi corresponden al ambiente de pruebas, sin leer sus valores. El usuario autorizó desactivar JWT exclusivamente en wompi-events para usar autenticación por firma; cambio aplicado. GET devuelve 405 y un evento con firma falsa devuelve 401. create-order conserva JWT y las compras siguen desactivadas. No se ha activado dinero real ni envío automático a Dropi.

Proyecto: btakiyexojkrrfwoxbtk. La página sigue en GitHub Pages.

## Base de datos

La migración `migrations/202611020001_orders.sql` ya fue ejecutada en el SQL Editor el 2 de noviembre de 2026; no repetir. Las tablas tienen RLS y no conceden acceso a visitantes ni a usuarios autenticados. Solo las funciones privadas con credencial de servicio pueden registrar o leer pedidos.

## Funciones y secretos

Desplegar `create-order` y `wompi-events` con Supabase CLI o el panel. Las claves de servicio de Supabase son inyectadas automáticamente; nunca copiarlas a la página.

Configurar en Edge Functions > Secrets, exclusivamente en Supabase:

- WOMPI_PUBLIC_KEY: llave pública de pruebas, pub_test_…
- WOMPI_INTEGRITY_SECRET: secreto de integridad de pruebas, test_integrity_…
- WOMPI_EVENTS_SECRET: secreto de eventos de pruebas, test_events_…
- STORE_ORIGIN: https://sebastian12354864.github.io
- FREE_SHIPPING_DESTINATIONS: lista JSON departamento|municipio. Dejar [] hasta confirmar cobertura.
- TURNSTILE_SECRET_KEY: secreto de verificación antispam. Falta crear el widget y configurar el cliente.
- CHECKOUT_TEST_ENABLED: mantener false hasta completar las pruebas y la configuración.

No se necesita la llave privada de Wompi para este checkout alojado. No enviar secretos por chat ni subirlos a GitHub.

En Wompi Sandbox, la URL de eventos será:
https://btakiyexojkrrfwoxbtk.supabase.co/functions/v1/wompi-events

Solo este receptor usa verify_jwt=false porque autentica a Wompi con su firma. create-order conserva la validación JWT y requiere además CAPTCHA. No cambiar políticas para permitir acceso público a las tablas.

## Pendiente antes de conectar el formulario

- Responsable confirmado: Juan Sebastián Losada Guevara. Contacto: juselogue@gmail.com, +57 301 148 0699. Pendiente redactar y revisar textos de privacidad, autorización y términos.
- Municipios autorizados y procedimiento para validar direcciones urbanas; seleccionar urbano no prueba cobertura real.
- Crear widget Turnstile y configurar llave pública en el cliente.
- Desplegar funciones y configurar secretos directamente en Supabase.
- Página de retorno pago.html preparada. Pendiente conectar el formulario en modo de prueba y consultar de forma protegida el estado del pedido, sin anunciar un pago como aprobado por una redirección.
- Registrar la URL de eventos en el panel de Wompi Sandbox. No usarla en producción.
- Probar: aprobación, rechazo, reintento duplicado, importes alterados, evento falsificado y zonas sin cobertura.
- Probar la RPC con eventos duplicados y fuera de orden en la base de datos.
- Verificar en el panel que el usuario anónimo no puede consultar datos.
- Definir conservación, borrado y respaldo de datos de clientes.
- Integrar Dropi solo con documentación y credenciales oficiales. Sin despacho automático por ahora.

El código actual es exclusivamente Sandbox. Producción requiere una revisión y configuración separadas; cambiar una variable no activa dinero real.

Verificación local: 5 pruebas aprobadas con `node --test tests/payment.test.mjs`; ambas funciones pasan `deno check`. En Supabase se verificaron acceso privado, RLS, importe incorrecto, duplicados y eventos fuera de orden con datos ficticios revertidos. Falta comprobar el flujo completo con Wompi Sandbox.
