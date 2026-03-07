# Guia de llenado CFDI 4.0 - Paso a Paso Operativo

## 1) Objetivo

Documento de referencia para capturar CFDI 4.0 con menos errores.
Enfocado en operaciones frecuentes: contado, credito, ajustes y sustituciones.

## 2) Flujo recomendado de emision

1. Validar datos fiscales del receptor.
2. Definir tipo de comprobante.
3. Capturar conceptos y claves SAT.
4. Calcular impuestos.
5. Definir metodo y forma de pago.
6. Revisar totales y relaciones.
7. Timbrar.
8. Registrar evidencia operativa.

## 3) Datos del emisor

Campos obligatorios:

- RFC emisor
- nombre emisor
- regimen fiscal emisor

Buenas practicas:

- mantener datos maestros unificados,
- evitar alta manual duplicada de emisores.

## 4) Datos del receptor

Campos de control:

- RFC
- nombre o razon social
- codigo postal fiscal
- regimen fiscal receptor
- uso CFDI

Definicion:

- `UsoCFDI` describe destino fiscal previsto del comprobante.

Ejemplo:

- si el cliente es empresa y gasto operativo, usar uso CFDI conforme a su caso real y catalogo vigente.

## 5) Conceptos

Por cada concepto:

- `ClaveProdServ`
- `Cantidad`
- `ClaveUnidad`
- `Descripcion`
- `ValorUnitario`
- `Importe`
- `ObjetoImp`

Reglas:

- descripcion clara y verificable,
- sin importes negativos en conceptos de ingreso,
- coherencia entre cantidad, precio unitario e importe.

## 6) Impuestos

Control minimo:

1. base por concepto correcta.
2. tasa/cuota correcta.
3. importe de impuesto correcto.
4. suma por comprobante correcta.

Ejemplo simple:

- base: 1,000.00
- IVA 16%: 160.00
- total concepto: 1,160.00

## 7) Metodo y forma de pago

Definiciones:

- `MetodoPago`: momento de liquidacion (`PUE` o `PPD`).
- `FormaPago`: medio de pago (transferencia, efectivo, tarjeta, etc).

Ejemplos:

- contado hoy -> `PUE`
- credito con cobro posterior -> `PPD` y despues complemento de pagos.

## 8) Relaciones CFDI

Usar `CfdiRelacionados` cuando aplique:

- sustitucion por error,
- nota de credito/debito,
- devoluciones.

Controles:

- registrar UUID origen,
- registrar motivo de relacion.

## 9) Checklist previo a timbrado

1. receptor validado.
2. catalogos vigentes.
3. importes e impuestos cuadran.
4. metodo/forma de pago coherentes.
5. UUID relacionados capturados (si aplica).
6. complemento requerido capturado (si aplica).

## 10) Errores comunes

- RFC y nombre receptor no coinciden con datos fiscales.
- uso CFDI incompatible.
- clave producto/servicio generica incorrecta.
- objeto impuesto mal definido.
- metodo pago incorrecto para operacion a credito.

## 11) Ejemplo completo de captura (resumen)

Caso:

- empresa vende servicio de mantenimiento a credito.

Decisiones:

- tipo comprobante: ingreso.
- metodo pago: `PPD`.
- forma de pago: se define al cobrar.
- conceptos: clave servicio + unidad correcta.
- impuestos: IVA trasladado segun base.
- seguimiento: emitir complemento de pagos al cobro.

## 12) Documentos oficiales de referencia

- Portal SAT CFDI 4.0
- Guia de llenado CFDI vigente
- Catalogos CFDI vigentes
- Anexo 20 vigente

