# Quita Fácil

Sitio estático de Faja Quita Fácil, adaptable a móvil y escritorio, sin dependencias de compilación ni fuentes remotas.

## Desarrollo

Desde `/workspace/cross-black`:

```sh
python3 -m http.server 8000 --bind 127.0.0.1 --directory /workspace/cross-black
```

Archivos principales: `index.html`, `styles.css`, `app.js`. La imagen `assets/faja-ilustracion.svg` es una ilustración referencial, no una fotografía ni una especificación del producto.

## Estado de las compras

El formulario valida contacto y entrega, permite revisar los datos y los elimina al cerrar. No envía solicitudes de pedido, no almacena información personal, no reserva stock y no cobra. Contra entrega y pago anticipado son opciones del resumen; Wompi, Mercado Pago, PayPal y PayU están pendientes de integración; no se recopilan datos de tarjetas.

La ficha Dropi suministrada no pudo consultarse debido a una denegación de acceso de red. Antes de habilitar ventas hacen falta:

- Fotografías y videos autorizados, tabla de medidas y stock verificados. Precio indicado por el vendedor: $100.000 COP por unidad contra entrega; anticipo con 3 % de descuento: $97.000 COP por unidad. El descuento se aplica a productos, no al envío. Tallas: S, M, L, XL, 2XL, 3XL. Colores: negro, blanco y beige.
- Cobertura, costo y plazos de entrega, garantía, cambios y devoluciones.
- Identidad y contacto del vendedor, política de tratamiento de datos y términos de compra.
- Cuenta de comercio y pasarela elegida con PSE y tarjetas; credenciales gestionadas en el servidor, nunca en archivos públicos.
- Backend para validar precio, variantes y disponibilidad, cotizar envío, crear pedidos y sesiones de pago, y verificar firmas de notificaciones de pago con idempotencia. Una redirección del navegador no confirma un pago.

No reutilizar las tarifas ni el contacto del antiguo catálogo de gafas sin confirmación del vendedor. Las imágenes antiguas se conservaron para evitar eliminar recursos del repositorio.

## Validación realizada

Chromium + Python Playwright: HTTP 200, escritorio y móvil (390 px), imágenes, cantidad, apertura/cierre del formulario y Escape, campos obligatorios, apartamento obligatorio cuando corresponde, selección PSE, resumen, edición y eliminación de datos al cerrar; sin errores JavaScript. `node --check app.js` aprobado. Integraciones de proveedor y pagos reales no verificadas.

## Fotos y videos

La sección `#galeria` en `index.html` contiene tres espacios identificados para vista frontal, posterior y video. Cuando recibas los archivos, guárdalos en `assets/` y reemplaza el interior de cada `figure.media-placeholder` por un `img` con texto alternativo o un `video controls preload="metadata"` con su `source`. Sustituye también la ilustración principal cuando tengas una foto real. No añadir reproductores con reproducción automática ni inventar imágenes del producto.

Validación adicional: selección obligatoria de talla y color, dos unidades por $200.000 contra entrega o $194.000 anticipado, descuento de $6.000, cuatro pasarelas seleccionables, pasarela obligatoria solo para anticipo, cambio de modalidad sin conservar pasarela en el resumen, limpieza de datos y galería móvil.
