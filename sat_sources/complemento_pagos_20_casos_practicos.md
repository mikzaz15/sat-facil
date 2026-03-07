# Complemento de pagos 2.0 - Casos practicos y errores de implementacion

## 1) Proposito de este documento

Complementar la guia principal con casos de borde y criterios de implementacion para equipos de:

- facturacion,
- cobranza,
- contabilidad,
- soporte de timbrado.

## 2) Mapa rapido: cuando SI y cuando NO

SI aplica (flujo normal):

- factura emitida en `PPD`,
- cobro total o parcial posterior,
- pago diferido que ocurre dias o meses despues.

NO aplica (flujo normal):

- factura `PUE` realmente cobrada al momento,
- intento de usar complemento para corregir un error del CFDI origen no relacionado con cobranza.

## 3) Relacion obligatoria con el CFDI origen

Cada aplicacion de pago debe vincularse al UUID correcto del CFDI de ingreso.

Campos minimos que no deben faltar en `DoctoRelacionado`:

- `IdDocumento` (UUID),
- `NumParcialidad`,
- `ImpSaldoAnt`,
- `ImpPagado`,
- `ImpSaldoInsoluto`.

Reglas de negocio:

- no reusar parcialidad para el mismo UUID,
- no dejar huecos en la secuencia,
- no permitir `ImpPagado` mayor al saldo anterior.

## 4) Casos practicos de parcialidades

### Caso 1: tres pagos de una misma factura

Factura origen: `5,800.00`.

Pago 1:

- saldo ant: `5,800.00`
- pagado: `1,000.00`
- saldo insoluto: `4,800.00`

Pago 2:

- saldo ant: `4,800.00`
- pagado: `2,500.00`
- saldo insoluto: `2,300.00`

Pago 3:

- saldo ant: `2,300.00`
- pagado: `2,300.00`
- saldo insoluto: `0.00`

Control recomendado:

- recalculo automatico de saldo por UUID despues de cada timbrado.

### Caso 2: un pago que cubre 4 facturas

Pago recibido: `50,000.00`.

Asignacion:

- UUID A: `10,000.00`
- UUID B: `15,000.00`
- UUID C: `20,000.00`
- UUID D: `5,000.00`

Buenas practicas:

- misma fecha de pago para todos los `DoctoRelacionado` del evento,
- guardar criterio de prorrateo o prioridad de aplicacion.

### Caso 3: pago diferido unico sin parcialidades previas

Factura emitida en enero, cobrada en marzo.

Captura esperada:

- `NumParcialidad = 1`,
- saldo anterior igual al total de la factura,
- saldo insoluto `0.00` si liquida totalmente.

## 5) PPD vs PUE: errores de clasificacion

### Error comun A: marcar `PUE` en venta a credito

Impacto:

- bloqueo del flujo normal de complemento,
- necesidad de evaluar correccion documental.

Mitigacion:

- regla de negocio al emitir CFDI de ingreso: si condiciones comerciales no son contado inmediato, forzar revision para `PPD`.

### Error comun B: marcar `PPD` en venta realmente de contado

Impacto:

- se generan tareas innecesarias de control para complemento.

Mitigacion:

- validar politicas comerciales y evidencia de cobro al timbrar factura.

## 6) Errores tecnicos frecuentes de timbrado

1. `IdDocumento` inexistente o de otra empresa.
2. `NumParcialidad` duplicado.
3. `ImpSaldoInsoluto` con precision/redondeo inconsistente.
4. `MonedaP` y `MonedaDR` sin conversion valida.
5. monto del pago distinto a la suma aplicada en documentos relacionados.

Controles sugeridos:

- pruebas unitarias de aritmetica de saldos,
- pruebas de regresion para multi-factura y multimoneda,
- bloqueo transaccional para evitar doble timbrado del mismo pago.

## 7) Operacion diaria: proceso sugerido de 8 pasos

1. cobrar y registrar evidencia bancaria.
2. identificar CFDI(s) pendientes por cliente.
3. determinar montos a aplicar por UUID.
4. generar borrador de CFDI tipo P.
5. correr validaciones de saldo/parcialidad.
6. timbrar y persistir folio/UUID del pago.
7. actualizar cartera y saldo insoluto.
8. auditar conciliacion diaria.

## 8) FAQ enfocada en soporte

### Se puede cambiar un complemento ya timbrado?

Depende del procedimiento vigente de correccion y estatus del comprobante. Debe seguirse el flujo permitido por SAT/PAC.

### Si un pago entra con comision bancaria, como se captura?

Separar monto efectivamente aplicado a factura de otros cargos, con criterio contable y fiscal consistente.

### Que hacer si el cliente deposita de mas?

No forzar aplicacion incorrecta al CFDI. Registrar excedente segun politica interna y reglas fiscales aplicables.

### Que hacer si el cliente paga de menos por redondeo?

Definir tolerancia interna documentada y aplicar criterio consistente para evitar cadenas de diferencias minimas.

## 9) Checklist de auditoria interna

1. todo CFDI `PPD` vencido tiene seguimiento de cobranza.
2. cada pago tiene evidencia bancaria asociada.
3. todo complemento tiene UUID origen valido.
4. no hay parcialidades duplicadas por UUID.
5. no hay saldos insolutos negativos.
6. reportes de cartera y CFDI son reconciliables.

## 10) Referencias recomendadas

- Anexo 20 vigente.
- Guia de llenado de complemento para recepcion de pagos vigente.
- Catalogos CFDI vigentes (metodo/forma de pago y claves relacionadas).
