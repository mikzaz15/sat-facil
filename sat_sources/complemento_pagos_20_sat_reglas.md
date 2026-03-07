# Complemento de pagos 2.0: reglas SAT y operacion

## 1) Objetivo

Documentar las reglas practicas del complemento de pagos 2.0 para mantener trazabilidad entre facturacion y cobranza.

## 2) Definiciones

- `CFDI tipo P`: comprobante de pago con complemento para recepcion de pagos.
- `DoctoRelacionado`: nodo que vincula el pago con el CFDI origen.
- `NumParcialidad`: consecutivo de pagos por UUID de factura.
- `ImpSaldoAnt`: saldo anterior al pago.
- `ImpPagado`: monto aplicado en esa parcialidad.
- `ImpSaldoInsoluto`: saldo pendiente despues del pago.

## 3) Regla central

Si el CFDI de ingreso fue emitido en `PPD` y el cobro se recibe despues, debe registrarse con complemento de pagos.

## 4) Reglas SAT operativas

1. El UUID del CFDI origen debe existir y ser correcto.
2. `NumParcialidad` debe ser incremental por documento.
3. `ImpSaldoAnt - ImpPagado = ImpSaldoInsoluto`.
4. `ImpSaldoInsoluto` no puede ser negativo.
5. Si un pago aplica a varias facturas, debe haber un `DoctoRelacionado` por cada UUID.

## 5) Estructura minima sugerida

### 5.1 Nodo Pago

- Fecha de pago
- Forma de pago
- Moneda
- Monto

### 5.2 Nodo DoctoRelacionado

- `IdDocumento`
- `NumParcialidad`
- `ImpSaldoAnt`
- `ImpPagado`
- `ImpSaldoInsoluto`

## 6) Ejemplos practicos

### Ejemplo A: pago diferido unico

- Factura origen: 11,600.00 (PPD)
- Pago posterior: 11,600.00
- Resultado:
- `NumParcialidad = 1`
- `ImpSaldoInsoluto = 0.00`

### Ejemplo B: dos parcialidades

Parcialidad 1:

- `ImpSaldoAnt = 11,600.00`
- `ImpPagado = 5,000.00`
- `ImpSaldoInsoluto = 6,600.00`

Parcialidad 2:

- `ImpSaldoAnt = 6,600.00`
- `ImpPagado = 6,600.00`
- `ImpSaldoInsoluto = 0.00`

### Ejemplo C: un pago para 2 CFDI

- Pago recibido: 15,000.00
- Aplicacion:
- CFDI A: 10,000.00
- CFDI B: 5,000.00

## 7) Errores frecuentes

- Emitir complemento para factura `PUE` en flujo normal.
- Capturar UUID incorrecto.
- Saltar o duplicar parcialidades.
- Diferencias de saldo por redondeo mal aplicado.

## 8) Controles de calidad

1. Validacion automatica de formula de saldos.
2. Validacion de consecutivo de parcialidad por UUID.
3. Conciliacion contra evidencia bancaria.
4. Alertas para facturas `PPD` sin complemento.

## 9) Checklist

1. Verificar que origen es `PPD`.
2. Verificar UUID y estatus del CFDI origen.
3. Verificar parcialidad y saldos.
4. Verificar forma de pago real.
5. Timbrar y guardar evidencia de conciliacion.

## 10) Referencias SAT sugeridas

- Estandar del complemento para recepcion de pagos 2.0.
- Guia de llenado de complemento de pagos.
- Anexo 20 vigente para CFDI 4.0.
- Catalogos CFDI aplicables a forma de pago, moneda y metodo de pago.
