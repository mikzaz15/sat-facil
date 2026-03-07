# Guia de llenado CFDI 4.0

## Objetivo de esta guia

Esta guia resume como capturar datos de CFDI 4.0 de forma consistente para reducir rechazos de timbrado y correcciones posteriores. Sirve como referencia operativa para equipos de facturacion, soporte y producto.

## Flujo recomendado de captura

1. Validar datos fiscales del receptor antes de iniciar.
2. Definir tipo de comprobante y moneda.
3. Capturar conceptos con claves correctas de catalogo.
4. Calcular impuestos por concepto.
5. Definir metodo y forma de pago segun el caso real.
6. Revisar totales, relaciones y complementos.
7. Timbrar solo despues de validaciones previas.

## Datos del receptor (punto critico)

Los campos del receptor son de los mas sensibles en CFDI 4.0:

- RFC,
- nombre o razon social,
- domicilio fiscal (codigo postal),
- regimen fiscal receptor,
- uso CFDI.

Regla operativa: validar estos datos contra constancia fiscal vigente para evitar rechazos.

### Edge cases de receptor

1. Cliente cambia razon social recientemente:
- actualizar maestro y revalidar antes de timbrar.

2. Grupo empresarial con RFC similares:
- confirmar RFC exacto y razon social completa.

3. Cliente nuevo sin datos completos:
- no timbrar hasta confirmar RFC, codigo postal y regimen.

## Llenado de conceptos

Por cada concepto:

- `ClaveProdServ` debe representar el bien/servicio real.
- `ClaveUnidad` debe corresponder a la unidad facturada.
- `Cantidad`, `ValorUnitario` e `Importe` deben ser coherentes.
- `ObjetoImp` debe reflejar si hay impuestos aplicables.

Evitar texto ambiguo en descripcion. Una descripcion clara facilita conciliacion y defensa documental.

## Impuestos

Validar impuestos al nivel correcto:

- por concepto,
- con tasa o cuota aplicable,
- con base e importe matematicamente consistentes.

Errores tipicos:

- redondeos inconsistentes,
- impuestos aplicados cuando `ObjetoImp` no corresponde,
- tasa incorrecta para el tipo de operacion.

## Metodo y forma de pago

`MetodoPago`:

- `PUE` cuando se liquida en una sola exhibicion,
- `PPD` cuando se paga en parcialidades o diferido.

`FormaPago`:

- debe reflejar el medio real de pago.
- en credito, la forma de pago se documenta conforme a reglas aplicables del flujo comercial.

Regla practica: no usar valores por defecto sin validar la operacion real.

### Edge cases de pago

1. Operacion inicia como contado y termina a credito:
- corregir metodo de pago conforme al flujo real y evaluar sustitucion si ya se timbro.

2. Anticipos:
- validar tratamiento fiscal y relacion de comprobantes segun regla vigente.

3. Cobros mixtos:
- documentar correctamente metodo/forma y conciliacion.

## CFDI relacionados y sustitucion

Cuando se corrige un comprobante:

- definir si procede cancelacion con sustitucion,
- capturar `CfdiRelacionados` con tipo de relacion correcto,
- mantener trazabilidad entre comprobante original y nuevo.

Esto evita diferencias entre contabilidad, cobranza y reportes fiscales.

## Cancelacion de CFDI - Guia rapida

Pasos recomendados:

1. identificar motivo real de cancelacion.
2. validar si requiere sustitucion.
3. capturar tipo de relacion correcto.
4. emitir CFDI sustituto cuando aplique.
5. archivar evidencia (UUID origen/sustituto y motivo).

Errores comunes:

- cancelar sin relacion cuando era sustitucion.
- no reflejar cambio en sistemas de cobranza o ERP.

## Casos operativos frecuentes

### Caso 1: venta de contado

- metodo pago: `PUE`
- forma de pago: segun medio real
- sin complemento de pagos

### Caso 2: venta a credito

- metodo pago: `PPD`
- emision de complemento de pagos cuando se cobre

### Caso 3: nota de credito

- usar tipo de comprobante correspondiente
- relacionar CFDI origen con tipo de relacion adecuado

## Control de calidad previo a timbrado

Checklist minimo:

1. receptor validado.
2. catalogos vigentes.
3. importes e impuestos consistentes.
4. metodo/forma de pago coherentes.
5. relaciones y complementos correctos.
6. pruebas de XML en ambiente QA (si hay cambios de sistema).

## Buenas practicas de operacion

- mantener bitacora de errores de timbrado por codigo,
- entrenar capturistas en casos de alto error,
- automatizar validaciones previas en UI y backend,
- revisar cambios SAT de forma periodica.

## Alcance

Este documento es una guia de trabajo para ingestion y RAG. Para criterios definitivos, validar con guias oficiales del SAT y reglas del PAC en produccion.

## FAQ operativo breve

1. Si el cliente no sabe su uso CFDI, que hago?
- solicitar confirmacion y documentarla antes de timbrar.

2. Puedo usar regimen del cliente de una factura anterior?
- solo si sigue vigente y confirmado; no asumir.

3. Cuando debo emitir complemento de pagos?
- cuando la factura fue emitida con `PPD` y se recibe cobro posterior.
