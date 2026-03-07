# Anexo 20 CFDI 4.0 - Referencia Operativa Completa

## 1) Alcance

Este documento resume el Anexo 20 para operacion diaria de facturacion CFDI 4.0.
Su objetivo es reducir rechazos de timbrado y mejorar consistencia de captura.

Base documental oficial a consultar siempre:

- SAT: Factura electronica (CFDI) 4.0
- SAT: Anexo 20
- SAT: Catalogos CFDI
- Guia de llenado vigente

## 2) Definiciones clave

- CFDI: Comprobante Fiscal Digital por Internet.
- PAC: Proveedor Autorizado de Certificacion.
- XML: formato estructurado del comprobante.
- Anexo 20: especificacion tecnica del CFDI.
- Nodo: bloque de informacion dentro del XML.
- Catalogo SAT: lista oficial de claves permitidas.

## 3) Estructura del CFDI 4.0

El CFDI se organiza en nodos principales:

1. `Comprobante`
- version, fecha, moneda, tipo de comprobante, lugar expedicion, exportacion, subtotales y totales.

2. `Emisor`
- RFC, nombre, regimen fiscal.

3. `Receptor`
- RFC, nombre, domicilio fiscal receptor (codigo postal), regimen fiscal receptor, uso CFDI.

4. `Conceptos`
- uno o varios conceptos con clave producto/servicio, unidad, cantidad, descripcion, valor unitario, importe y objeto impuesto.

5. `Impuestos`
- traslados y retenciones a nivel concepto y/o comprobante.

6. `CfdiRelacionados` (cuando aplica)
- relacion de UUID con tipo de relacion.

7. `Complemento` (cuando aplica)
- pagos 2.0, nomina, carta porte, etc.

## 4) Campos de mayor impacto en validacion

Campos criticos que mas provocan rechazo:

- `Receptor.Rfc`
- `Receptor.Nombre`
- `Receptor.DomicilioFiscalReceptor`
- `Receptor.RegimenFiscalReceptor`
- `Receptor.UsoCFDI`
- `Concepto.ClaveProdServ`
- `Concepto.ClaveUnidad`
- `Concepto.ObjetoImp`
- `Comprobante.MetodoPago`
- `Comprobante.FormaPago`

## 5) Reglas de consistencia funcional

Reglas operativas importantes:

- los datos del receptor deben corresponder a informacion fiscal vigente.
- uso CFDI debe ser coherente con el tipo de operacion.
- metodo/forma de pago deben reflejar la realidad comercial.
- impuestos deben cuadrar por concepto y en totales.
- si hay sustitucion, usar relacion CFDI correctamente.

## 6) Impuestos: validaciones practicas

Validaciones recomendadas:

1. verificar base gravable por concepto.
2. aplicar tasa/cuota correcta.
3. revisar redondeo controlado.
4. asegurar que suma de impuestos por concepto coincida con total global.
5. validar consistencia con `ObjetoImp`.

## 7) CFDI relacionados y sustitucion

Escenarios comunes:

- correccion de datos -> cancelacion y sustitucion.
- nota de credito/debito -> relacion con comprobante origen.
- devoluciones -> relacion conforme al tipo de operacion.

Punto de control:

- registrar motivo, tipo de relacion y UUID de origen en bitacora interna.

## 8) Ejemplo funcional A (ingreso de contado)

Caso:

- servicio profesional
- pago en una sola exhibicion
- IVA trasladado

Checklist:

- metodo pago `PUE`
- forma de pago segun medio real
- uso CFDI coherente
- conceptos e impuestos correctos

## 9) Ejemplo funcional B (ingreso a credito)

Caso:

- venta a credito
- pago posterior

Checklist:

- metodo pago `PPD`
- emision posterior de complemento de pagos 2.0
- conciliacion de saldos por parcialidad

## 10) Errores frecuentes y correccion

1. RFC receptor invalido
- accion: validar contra constancia fiscal actualizada.

2. Clave de catalogo no vigente
- accion: actualizar catalogos SAT en sistema.

3. Impuestos no cuadran
- accion: rehacer calculo por concepto y total.

4. Metodo pago incorrecto
- accion: alinear con flujo de cobranza real.

5. Falta CFDI relacionado
- accion: capturar tipo relacion y UUID origen.

## 11) Controles recomendados para estabilidad

- validaciones previas en UI y backend.
- bloqueo de timbrado con errores criticos.
- versionado de catalogos y reglas.
- pruebas de regresion al cambiar motor de facturacion.
- tablero de errores por codigo PAC/SAT.

## 12) Fuentes oficiales sugeridas

- https://www.sat.gob.mx/consultas/35025/factura-electronica-(cfdi)-4.0
- https://www.sat.gob.mx/consultas/42968/anexo-20
- https://www.sat.gob.mx/consultas/53016/catalogos-cfdi

