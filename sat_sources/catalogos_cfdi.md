# Catalogos CFDI

Los catalogos CFDI son listas controladas por el SAT que restringen valores permitidos en campos del comprobante. Su objetivo es estandarizar informacion para que el CFDI sea consistente y procesable en validaciones tecnicas, contables y fiscales. Entre los catalogos mas usados estan claves de producto o servicio, unidad, forma de pago, metodo de pago, regimen fiscal y uso del CFDI.

Buenas practicas para operar catalogos CFDI:

- sincronizar catalogos con la version vigente publicada por SAT,
- validar cada clave antes de timbrar,
- bloquear claves obsoletas o fuera de vigencia,
- registrar la fecha de actualizacion de catalogos en el sistema,
- auditar errores recurrentes para corregir mapeos internos.

Un error comun es reutilizar claves por costumbre sin confirmar que sigan vigentes para la operacion real. Otro problema frecuente es mezclar regimen fiscal o uso del CFDI incompatibles con el tipo de receptor. Estas inconsistencias generan rechazos de timbrado, cancelaciones y retrabajo administrativo.

Para cumplimiento estable, el proceso de facturacion debe incluir reglas de negocio y validaciones previas al envio a timbrado. Tambien conviene revisar periodicamente cambios de catalogos y comunicar actualizaciones al equipo que captura datos fiscales. Un control preventivo reduce errores y mejora la calidad de la informacion reportada.
