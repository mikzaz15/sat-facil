# Errores comunes CFDI y como resolverlos

## 1) Objetivo

Proveer un mapa de errores tipicos en CFDI 4.0 con acciones de correccion y prevencion.

## 2) Errores de datos del receptor

### Error: RFC, nombre o codigo postal inconsistentes

- Sintoma: rechazo en timbrado por receptor invalido.
- Causa raiz: datos maestros desactualizados.
- Accion: corregir datos del receptor antes de timbrar.

### Error: regimen receptor incompatible

- Sintoma: validacion de catalogo fallida.
- Accion: revisar regimen fiscal y uso CFDI.

## 3) Errores de catalogos

### Error: UsoCFDI incorrecto

- Sintoma: rechazo por incompatibilidad.
- Accion: seleccionar uso acorde al caso real y regimen.

### Error: clave producto/servicio incorrecta

- Sintoma: observaciones en auditoria o rechazo de captura.
- Accion: mapear catalogo por tipo de operacion y mantener tabla interna.

## 4) Errores de impuestos y totales

### Error: desglose de impuestos no cuadra

- Sintoma: total de impuestos no coincide con conceptos.
- Accion: recalculo centralizado y regla unica de redondeo.

### Error: redondeo inconsistente

- Sintoma: diferencias de centavos.
- Accion: unificar precision en todo el pipeline de facturacion.

## 5) Errores de metodo y forma de pago

### Error: usar PUE en venta a credito

- Impacto: inconsistencia operativa y posible correccion posterior.
- Accion: usar `PPD` cuando el cobro no es inmediato.

### Error: no emitir complemento en PPD

- Impacto: trazabilidad incompleta de cobranza.
- Accion: emitir complemento al recibir pago.

## 6) Errores de cancelacion CFDI

### Error: cancelar sin estrategia de sustitucion

- Impacto: se pierde continuidad documental.
- Accion: definir si aplica sustitucion y relacion UUID.

### Error: repetir el mismo error en el sustituto

- Impacto: retrabajo y riesgo de nuevos rechazos.
- Accion: checklist tecnico antes de reemitir.

## 7) Errores con clientes extranjeros

### Error: datos incompletos del receptor extranjero

- Impacto: rechazo o inconsistencia documental.
- Accion: checklist de datos para extranjeros y validacion de moneda/tipo de cambio.

## 8) Ejemplos practicos de diagnostico

### Caso 1: rechazo por receptor invalido

1. Revisar RFC, nombre y CP.
2. Corregir maestro de cliente.
3. Reintentar timbrado.

### Caso 2: rechazo por uso CFDI

1. Confirmar regimen receptor.
2. Elegir uso compatible.
3. Validar en pre-timbrado.

### Caso 3: error por PUE/PPD

1. Confirmar momento real de cobro.
2. Ajustar metodo de pago.
3. Si ya se timbro mal, evaluar correccion permitida.

## 9) Checklist preventivo diario

1. Validar receptor completo.
2. Validar uso CFDI y regimen.
3. Validar catalogos de conceptos.
4. Validar impuestos y totales.
5. Validar metodo/forma de pago.
6. Validar reglas de cancelacion/sustitucion.

## 10) Referencias SAT sugeridas

- Anexo 20 vigente.
- Guia de llenado CFDI 4.0.
- Catalogos CFDI.
- Guia de complemento de pagos.
- Criterios de cancelacion vigentes.
