# Reglas CFDI SAT: guia estructurada

## 1) Objetivo

Concentrar reglas operativas clave de CFDI 4.0 para emision estable, evitando rechazos de timbrado y retrabajo.

## 2) Definiciones basicas

- `CFDI`: comprobante fiscal digital por internet.
- `Anexo 20`: especificacion tecnica del CFDI.
- `PAC`: proveedor autorizado de certificacion que valida y timbra.
- `UUID`: identificador unico del CFDI timbrado.

## 3) Reglas SAT de captura

1. Datos del receptor deben ser completos y consistentes.
2. `UsoCFDI` y `RegimenFiscalReceptor` deben ser compatibles.
3. Claves de producto/servicio y unidad deben corresponder a la operacion.
4. Impuestos deben cuadrar entre concepto y totales.
5. `MetodoPago` y `FormaPago` deben reflejar el flujo real.
6. Cuando aplique sustitucion, relacionar CFDI correctamente.

## 4) Reglas SAT de consistencia

- No mezclar catalogos incompatibles.
- Evitar importes negativos no permitidos por flujo.
- Mantener redondeo uniforme en toda la factura.
- Validar moneda y tipo de cambio en operaciones con divisa.

## 5) Reglas de pago (PUE/PPD)

- `PUE`: pago al momento.
- `PPD`: pago posterior total o parcial.
- Si es `PPD`, dar seguimiento para complemento de pagos.

## 6) Reglas de cancelacion y sustitucion

1. Definir motivo real de cancelacion.
2. Validar estatus antes de cancelar.
3. Emitir sustituto cuando corresponda.
4. Mantener trazabilidad de UUID origen y sustituto.

## 7) Ejemplos practicos

### Ejemplo A: factura de contado

- Cobro en el momento.
- `MetodoPago = PUE`.
- Sin complemento de pagos en flujo normal.

### Ejemplo B: factura a credito

- Cobro posterior.
- `MetodoPago = PPD`.
- Emitir complemento de pagos al cobrar.

### Ejemplo C: correccion de datos receptor

- Cancelar CFDI incorrecto.
- Emitir CFDI corregido y relacionarlo segun procedimiento.

## 8) Controles recomendados

1. Validaciones previas al timbrado en backend.
2. Versionado de catalogos SAT en sistema.
3. Alertas por errores repetidos de captura.
4. Conciliacion diaria de facturacion vs cobranza.

## 9) Referencias SAT sugeridas

- Anexo 20 vigente.
- Guia de llenado CFDI 4.0.
- Catalogos CFDI vigentes.
- Guia de cancelacion y criterios aplicables.
