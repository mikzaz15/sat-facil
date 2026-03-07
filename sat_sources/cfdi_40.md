# CFDI 4.0 - Referencia Operativa Integral

## 1) Que es CFDI 4.0

CFDI 4.0 es el estandar vigente de facturacion electronica en Mexico. El objetivo es que la informacion fiscal del comprobante sea mas precisa y consistente para validacion automatica por SAT y PAC.

## 2) Definiciones clave

- CFDI: Comprobante Fiscal Digital por Internet.
- PAC: Proveedor Autorizado de Certificacion.
- Uso CFDI: destino fiscal que el receptor dara al comprobante.
- Regimen fiscal: clasificacion fiscal del contribuyente segun catalogo SAT.
- PUE/PPD: metodo de pago en una sola exhibicion o en parcialidades/diferido.

## 3) Datos obligatorios del receptor (punto critico)

En operacion diaria, validar como minimo:

- RFC del receptor.
- Nombre o razon social del receptor.
- Domicilio fiscal receptor (codigo postal).
- Regimen fiscal receptor.
- Uso CFDI.

Regla practica:

- los datos deben estar alineados con informacion fiscal vigente del receptor; diferencias suelen provocar rechazo de timbrado.

## 4) Uso CFDI

`UsoCFDI` expresa para que se usara fiscalmente el comprobante.

Buenas practicas:

1. no asignar uso por defecto sin validar contexto.
2. validar compatibilidad con regimen del receptor.
3. capacitar captura para los usos mas frecuentes por tipo de cliente.

Ejemplos de uso comun:

- `G01`: adquisicion de mercancias.
- `G03`: gastos en general.
- usos de tipo deduccion personal cuando aplica al caso real.

## 5) Regimen fiscal

El regimen fiscal afecta validaciones entre emisor, receptor y uso CFDI.

Controles recomendados:

- validar regimen del receptor en datos maestros.
- bloquear combinaciones no compatibles en UI/backend.
- auditar rechazos por regimen para mejorar catalogos internos.

## 6) Metodo y forma de pago

- `MetodoPago` define momento de liquidacion (`PUE` o `PPD`).
- `FormaPago` describe medio real de pago.

Edge case comun:

- venta emitida como contado (`PUE`) pero cobrada despues; esto genera inconsistencias operativas y puede requerir correccion/cancelacion.

## 7) Validaciones y errores comunes

Errores de mayor frecuencia:

- RFC/Nombre/Codigo postal de receptor no coinciden.
- Uso CFDI incompatible.
- Regimen fiscal incorrecto.
- Claves de catalogo obsoletas.
- Impuestos con base/tasa/importe inconsistentes.
- Metodo/forma de pago incongruentes con cobranza.

Accion de soporte sugerida:

1. revisar mensaje exacto del PAC.
2. validar datos receptor.
3. validar catalogos vigentes.
4. recalcular impuestos.
5. reintentar timbrado.

## 8) Cancelacion de CFDI

La cancelacion depende del estado del comprobante y reglas aplicables.

Escenarios tipicos:

- error de captura: cancelar y sustituir con CFDI relacionado.
- devolucion/ajuste: emitir comprobante relacionado conforme a la operacion.

Controles:

- registrar motivo de cancelacion.
- conservar trazabilidad entre UUID original y sustituto.
- verificar si procede aceptacion del receptor en el escenario aplicable.

## 9) Ejemplos rapidos

### Ejemplo A: factura de contado correcta

- receptor validado.
- uso CFDI coherente.
- metodo `PUE`.
- impuestos correctos.

### Ejemplo B: factura a credito

- metodo `PPD`.
- seguimiento para complemento de pagos 2.0 al cobrar.

### Ejemplo C: correccion de receptor

- cancelar CFDI incorrecto.
- emitir CFDI sustituto con datos correctos.
- relacionar UUID segun regla aplicable.

## 10) FAQ corto

1. Que pasa si cambia el regimen fiscal del cliente?
- actualizar datos maestros antes del siguiente timbrado.

2. Puedo timbrar con datos aproximados del receptor?
- no se recomienda; aumenta rechazo y correcciones.

3. Si el cliente no tiene claro su uso CFDI?
- solicitar confirmacion formal y documentarla.

## 11) Fuentes oficiales sugeridas

- SAT CFDI 4.0: https://www.sat.gob.mx/consultas/35025/factura-electronica-(cfdi)-4.0
- SAT Anexo 20: https://www.sat.gob.mx/consultas/42968/anexo-20
- SAT Catalogos CFDI: https://www.sat.gob.mx/consultas/53016/catalogos-cfdi
