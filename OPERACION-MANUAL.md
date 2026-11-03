# Pedidos con carga manual en Dropi

Este flujo no envía pedidos ni genera guías automáticamente. La tienda puede conservar la integración de pagos con Wompi y cambiar la carga manual por una conexión automática en el futuro.

## Dónde ver los pedidos

Entrar a Supabase con la cuenta del propietario y abrir Table Editor.

- `pedidos_revision_manual`: pedidos reales y el siguiente paso para cada uno.
- `pedidos_listos_dropi`: únicamente los confirmados y listos para cargar.
- `store_orders`: registro privado editable para confirmar revisiones y guardar el número de Dropi.

Estas vistas no son públicas. No compartir credenciales, capturas con datos personales ni enlaces de exportación. Los pedidos de prueba no aparecen en las bandejas de ventas reales.

## Cómo procesar cada pedido

1. Confirmar por teléfono o WhatsApp nombre, dirección, talla, color, cantidad y modalidad de pago. Registrar la fecha en `customer_confirmed_at`.
2. Revisar inventario y seleccionar la variante exacta en Dropi; registrar la fecha en `stock_confirmed_at`.
3. Confirmar con Dropi cobertura, condición urbana de la dirección, costo y plazo antes de despachar; registrar la fecha en `coverage_confirmed_at`. El envío gratis al cliente lo asume la tienda, no significa que Dropi no cobre el flete.
4. Si es pago anticipado, esperar `estado_pago = approved`. No aceptar una captura de pago o la página de regreso como confirmación.
5. En Dropi, crear un pedido manual con producto y variante exactos. Copiar nombre, celular, departamento, municipio, dirección, barrio, apartamento e indicaciones. El identificador de la tienda es `numero_tienda`; conservarlo como referencia interna donde Dropi lo permita.
6. En contra entrega, configurar el cobro del producto por el total indicado. En anticipado, elegir la modalidad que corresponda a producto ya pagado para no cobrarlo otra vez. Revisar por separado flete y cargos de recaudo en Dropi antes de confirmar. No deducirlos del total del cliente automáticamente.
7. Revisar todo y confirmar el pedido directamente en Dropi. Este paso sí crea un despacho real.
8. Guardar el número devuelto por Dropi en `dropi_order_id` y cambiar `fulfillment_status` a `manual_registered` en la misma edición. Guardar la guía en `tracking_code` cuando esté disponible.

Si un campo exportado comienza por un apóstrofo de protección de hoja de cálculo, copiar su contenido de texto sin ese apóstrofo a Dropi. La bandeja no es una plantilla de importación masiva de Dropi.

## Evitar duplicados y cobros dobles

- Revisar `numero_dropi` antes de crear otro pedido. Si Dropi tarda o muestra un error, comprobar primero si el pedido ya existe allí.
- No registrar pedidos con prefijo `QF-test-`.
- No marcar un anticipo como aprobado manualmente para forzar su despacho.
- La base de datos bloquea marcar como registrado un pedido de prueba, un anticipo no aprobado o un pedido sin las tres revisiones.
- `cancelled` permite apartar pedidos que el cliente no confirmó. No borra datos ni produce reembolsos.
- La restricción única de número Dropi evita reutilizar ese número en dos pedidos de la tienda; no reemplaza la revisión de duplicados dentro de Dropi.

## Pendiente para recibir ventas reales

El flujo probado continúa en Sandbox. Antes de abrir ventas se deben conectar el formulario definitivo, los textos de autorización de datos y compra, las claves de producción y la confirmación real de Wompi. También deben quedar confirmados inventario, plazos y cobertura. La carga manual evita depender de la API de Dropi para empezar; no elimina esos pasos.

## Información confirmada por el vendedor

Entrega estimada de 2 a 3 días hábiles; no cuentan domingos ni festivos. Solicitudes de cambios y devoluciones al 301 148 0699 para revisar el caso y definir solución. No prometer una entrega en dirección sin cobertura ni dar por aceptado automáticamente un cambio.
