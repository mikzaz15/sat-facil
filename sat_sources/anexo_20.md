# Anexo 20 del CFDI

El Anexo 20 es la base tecnica para emitir CFDI validos ante el SAT. Define la estructura XML del comprobante, reglas de llenado, catálogos permitidos y validaciones que deben cumplir emisores, receptores y proveedores de certificacion. Cuando un sistema factura, cada dato debe respetar longitud, formato y relacion con otros campos. Si el XML no cumple, el timbrado puede fallar.

Puntos clave para uso operativo:

- usar version vigente del estandar y sus catálogos,
- validar RFC, nombre, regimen fiscal y codigo postal del receptor,
- capturar correctamente uso del CFDI, metodo y forma de pago,
- revisar impuestos trasladados y retenidos con tasas y bases correctas,
- aplicar relaciones de CFDI cuando se sustituyen comprobantes.

Tambien existen guias de llenado y criterios tecnicos para distintos tipos de comprobante y complementos. Por ejemplo, exportacion, pagos, nomina u operaciones especificas requieren nodos y reglas adicionales. Antes de liberar cambios en un sistema de facturacion, conviene probar XML de muestra y validar contra reglas vigentes para reducir rechazos.

Para control interno, es recomendable mantener un checklist de campos criticos, monitorear errores de timbrado y documentar cambios de catálogos. Esto ayuda a prevenir cancelaciones improcedentes, discrepancias con declaraciones y diferencias entre CFDI emitidos y operaciones reales.
