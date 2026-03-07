# CFDI 4.0 - Preguntas Frecuentes (FAQ Operativo)

## 1) Que datos del receptor son obligatorios?

Normalmente:

- RFC
- nombre o razon social
- domicilio fiscal receptor (codigo postal)
- regimen fiscal receptor
- uso CFDI

## 2) Que hago si el CFDI es rechazado por datos del receptor?

Pasos:

1. validar constancia fiscal actualizada.
2. corregir RFC/nombre/codigo postal.
3. reenviar timbrado.

## 3) Cual es la diferencia entre PUE y PPD?

- `PUE`: pago en una sola exhibicion.
- `PPD`: pago en parcialidades o diferido.

## 4) Si uso PPD, que sigue?

Emitir complemento de pagos cuando se reciba el cobro.

## 5) Puedo poner cualquier uso CFDI?

No. Debe corresponder al contexto del receptor y de la operacion.

## 6) Cual es el error mas comun en catalogos?

Usar claves obsoletas o no compatibles con la operacion real.

## 7) Que significa ObjetoImp?

Indica si el concepto es objeto de impuesto y condiciona validaciones de impuestos.

## 8) Como evitar errores de redondeo?

- definir una politica unica de redondeo en sistema,
- calcular impuestos de forma consistente por concepto y total.

## 9) Que hago si facture con datos incorrectos?

Evaluar cancelacion y sustitucion con CFDI relacionado segun reglas aplicables.

## 10) Cuando se requiere CFDI relacionado?

En escenarios de sustitucion, ajustes o relaciones fiscales entre comprobantes.

## 11) Que revisar antes de timbrar?

Checklist rapido:

1. receptor correcto.
2. catalogos vigentes.
3. impuestos correctos.
4. metodo y forma de pago correctos.
5. relaciones/complementos correctos.

## 12) Como elegir clave de producto/servicio?

Seleccionar la clave que mejor represente el bien/servicio real, no por conveniencia.

## 13) Que hacer si una clave dejo de ser vigente?

- actualizar catalogos,
- corregir mapeos de sistema,
- bloquear clave en captura.

## 14) Se puede usar descripcion libre?

Si, pero debe ser clara y coherente con la clave de producto/servicio.

## 15) Que pasa si el cliente paga parcialmente?

Se documenta por parcialidad mediante complemento de pagos 2.0.

## 16) El SAT valida consistencia entre nodos?

Si. No solo valida formato XML; tambien cruces entre campos y catalogos.

## 17) Cual es el rol del PAC?

Aplicar validaciones, timbrar y devolver errores cuando el CFDI no cumple reglas.

## 18) Puedo emitir CFDI sin actualizar catalogos?

Riesgoso. Aumenta rechazos y retrabajo operativo.

## 19) Que evidencia conservar en soporte?

- XML timbrado,
- acuse PAC,
- datos capturados,
- motivo de correccion/cancelacion (si aplica).

## 20) Referencias oficiales recomendadas

- SAT CFDI 4.0
- Anexo 20
- Guia de llenado CFDI vigente
- Catalogos CFDI vigentes

## 21) Que revisar primero si falla por "receptor invalido"?

1. RFC exacto.
2. Nombre/razon social.
3. Codigo postal fiscal.
4. Regimen fiscal receptor.
5. Uso CFDI seleccionado.

## 22) Como elegir correctamente el uso CFDI?

- partir de la naturaleza real de la operacion.
- confirmar con el receptor cuando existan dudas.
- evitar seleccionar uso por inercia o historico sin validar.

## 23) Que hago con clientes que cambian de regimen frecuentemente?

- pedir actualizacion documental periodica.
- actualizar maestro de clientes antes de cada facturacion relevante.
- bloquear timbrado si existe inconsistencia detectada.

## 24) Que errores de pagos 2.0 son mas costosos?

- UUID relacionado incorrecto,
- parcialidad mal secuenciada,
- saldos insolutos incorrectos,
- falta de conciliacion con banco.

## 25) Que evidencia debo guardar para auditoria interna?

- XML timbrado de ingreso y pagos (si aplica),
- acuses PAC,
- trazabilidad de cancelacion/sustitucion,
- bitacora de cambios de datos de receptor,
- evidencia de conciliacion de cobros.
