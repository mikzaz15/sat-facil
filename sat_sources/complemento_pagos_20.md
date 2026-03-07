# Complemento de pagos 2.0 - Cobertura operativa reforzada

## 1) Objetivo

Registrar cobros de operaciones facturadas a credito para mantener:

- trazabilidad fiscal por UUID,
- control de saldos por parcialidad,
- coherencia entre facturacion, cobranza y contabilidad.

Este documento prioriza reglas practicas para evitar errores recurrentes en `Complemento para recepcion de pagos 2.0`.

## 2) Conceptos clave

- `PUE`: pago en una sola exhibicion.
- `PPD`: pago en parcialidades o diferido.
- `CFDI de ingreso`: factura original de la operacion.
- `CFDI tipo P`: comprobante de pago con complemento.
- `DoctoRelacionado`: nodo que conecta el pago contra el CFDI origen.
- `NumParcialidad`: consecutivo de pagos aplicados al mismo CFDI.
- `ImpSaldoAnt`: saldo antes de aplicar el pago.
- `ImpPagado`: monto aplicado en esa parcialidad.
- `ImpSaldoInsoluto`: saldo pendiente despues de aplicar el pago.

Formula basica de control:

- `ImpSaldoAnt - ImpPagado = ImpSaldoInsoluto`

## 3) Cuando aplica el complemento de pagos 2.0

Aplica normalmente cuando:

- el CFDI origen se emitio con `MetodoPago = PPD`,
- el cobro ocurre despues del timbrado del CFDI de ingreso,
- existen pagos parciales o un pago diferido posterior a la factura.

No aplica normalmente cuando:

- el CFDI origen fue `PUE` y efectivamente se liquido en el momento,
- no existe cobro posterior por documentar.

## 4) PPD vs PUE: criterio de decision

| Escenario comercial | Metodo en CFDI ingreso | Complemento de pagos 2.0 |
| --- | --- | --- |
| Venta de contado, cobrada al emitir | `PUE` | No, en flujo normal |
| Venta a credito a 30 dias | `PPD` | Si, al recibir pago |
| Cobro en 2 o mas exhibiciones | `PPD` | Si, uno o varios CFDI tipo P |
| Cobro total dias despues de la factura | `PPD` | Si, al cobro |

Regla operativa:

- si existe incertidumbre de cobro inmediato, tratar la operacion como credito (`PPD`) para conservar trazabilidad posterior.

## 5) Relacion con el CFDI original

El complemento no sustituye la factura original; la referencia mediante UUID es obligatoria para trazabilidad.

### 5.1 Datos minimos por `DoctoRelacionado`

- UUID del CFDI origen (`IdDocumento`),
- moneda del documento relacionado (`MonedaDR`),
- numero parcialidad (`NumParcialidad`),
- saldo anterior (`ImpSaldoAnt`),
- importe pagado (`ImpPagado`),
- saldo insoluto (`ImpSaldoInsoluto`),
- metodo de pago del documento relacionado (`MetodoDePagoDR`, usualmente `PPD`).

### 5.2 Reglas de consistencia por UUID

- `NumParcialidad` debe ser incremental por cada CFDI origen.
- `ImpSaldoAnt` de una parcialidad debe coincidir con `ImpSaldoInsoluto` de la parcialidad anterior.
- `ImpSaldoInsoluto` no puede ser negativo.
- cuando el saldo llega a `0`, ese CFDI queda liquidado.

## 6) Parcialidades y pagos diferidos

### 6.1 Caso A: pago diferido unico

- CFDI ingreso: `PPD`, total `11,600.00`.
- Cobro unico 20 dias despues: `11,600.00`.
- Complemento:
- `NumParcialidad = 1`
- `ImpSaldoAnt = 11,600.00`
- `ImpPagado = 11,600.00`
- `ImpSaldoInsoluto = 0.00`

### 6.2 Caso B: dos parcialidades del mismo CFDI

Parcialidad 1:

- `ImpSaldoAnt = 11,600.00`
- `ImpPagado = 4,000.00`
- `ImpSaldoInsoluto = 7,600.00`

Parcialidad 2:

- `ImpSaldoAnt = 7,600.00`
- `ImpPagado = 7,600.00`
- `ImpSaldoInsoluto = 0.00`

### 6.3 Caso C: un pago aplicado a varios CFDI

Pago recibido: `20,000.00`.

Aplicacion:

- CFDI A: `12,500.00`
- CFDI B: `7,500.00`

En el CFDI tipo P deben capturarse dos nodos `DoctoRelacionado`, uno por cada UUID, con sus saldos independientes.

## 7) Campos criticos a validar antes de timbrar

### 7.1 Nivel pago

- fecha real de cobro,
- forma de pago real,
- moneda del pago y tipo de cambio cuando aplique,
- monto del pago.

### 7.2 Nivel documento relacionado

- UUID correcto y vigente del CFDI origen,
- secuencia correcta de parcialidad,
- aritmetica de saldos,
- relacion correcta entre moneda de pago y moneda del documento.

## 8) Errores comunes y como evitarlos

### Error 1: emitir complemento para factura `PUE`

Riesgo:

- inconsistencia fiscal y operativa.

Prevencion:

- bloquear en sistema CFDI tipo P si el origen no es `PPD` (salvo proceso especial de correccion).

### Error 2: UUID de factura incorrecto

Riesgo:

- pago aplicado al documento equivocado y conciliacion rota.

Prevencion:

- validar UUID contra base timbrada antes de permitir timbrado.

### Error 3: parcialidad mal secuenciada

Riesgo:

- saldos inconsistentes y auditoria compleja.

Prevencion:

- calcular `NumParcialidad` automaticamente por UUID, no manual.

### Error 4: saldo insoluto mal calculado

Riesgo:

- rechazo de timbrado o diferencias posteriores.

Prevencion:

- usar regla matematica automatica y redondeo consistente.

### Error 5: no conciliar con banco

Riesgo:

- se timbra informacion que no coincide con cobro real.

Prevencion:

- exigir referencia bancaria o evidencia de cobro previa al timbrado.

### Error 6: mezclar pagos multimoneda sin control

Riesgo:

- diferencias por conversion y saldos residuales no explicados.

Prevencion:

- registrar tipo de cambio y conversion por cada documento relacionado.

## 9) Flujo recomendado (operacion estable)

1. emitir CFDI ingreso en `PPD` para operaciones a credito.
2. registrar cobro real en modulo de cobranza.
3. mapear cobro a UUID(s) de factura(s) pendiente(s).
4. construir CFDI tipo P con complemento de pagos 2.0.
5. validar aritmetica y secuencia de parcialidad.
6. timbrar.
7. guardar evidencia de conciliacion (folio banco, referencia, fecha).

## 10) Controles automaticos sugeridos en sistema

- regla dura: bloquear pago 2.0 si `MetodoPago` del origen no es `PPD`.
- regla dura: bloquear si `ImpPagado > ImpSaldoAnt`.
- regla dura: bloquear si `ImpSaldoInsoluto < 0`.
- regla dura: bloquear si `NumParcialidad` no es consecutivo.
- regla blanda: alertar pagos con diferencia de centavos por redondeo.
- regla blanda: alertar CFDI `PPD` con antiguedad alta y sin complemento.

## 11) Checklist de cierre para equipo fiscal/operativo

1. Metodo de pago del CFDI origen confirmado (`PPD`).
2. UUID(s) verificados contra timbrado.
3. Parcialidad y saldos validados.
4. Forma de pago consistente con evidencia bancaria.
5. Moneda y tipo de cambio consistentes.
6. Documentacion de respaldo archivada.
7. Reporte de saldos insolutos actualizado.

## 12) FAQ breve

### Se emite un complemento por cada pago?

En flujo normal, si: cada evento de cobro debe quedar trazable. Puede haber varios `DoctoRelacionado` dentro de un mismo comprobante cuando un pago cubre varios CFDI.

### Si el cliente paga en una sola exhibicion pero dias despues, es PUE o PPD?

Si el pago fue posterior al CFDI de ingreso, normalmente corresponde flujo `PPD` con complemento al momento del cobro.

### Que pasa si se capturo `PUE` por error en una venta a credito?

Se debe revisar el procedimiento de correccion aplicable (cancelacion/sustitucion u otro flujo vigente) antes de emitir cualquier complemento.

### Cuales son los errores de mayor impacto?

- UUID mal relacionado,
- parcialidad incorrecta,
- saldos mal calculados,
- registrar pago sin respaldo bancario.

## 13) Referencias oficiales a consultar

- Anexo 20 vigente.
- Guia de llenado de CFDI 4.0.
- Guia de llenado del complemento para recepcion de pagos vigente.
