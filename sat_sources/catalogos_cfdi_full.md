# Catalogos CFDI - Referencia Completa para Operacion

## 1) Objetivo

Concentrar definiciones, reglas practicas y ejemplos de uso de catalogos CFDI
para reducir errores de captura y rechazo de timbrado.

## 2) Que es un catalogo CFDI

Un catalogo CFDI es una lista oficial de claves permitidas por SAT para campos
del XML. Cada clave tiene significado, vigencia y reglas de aplicacion.

## 3) Catalogos prioritarios

### 3.1 `c_UsoCFDI`

Definicion:

- describe el uso fiscal que el receptor dara al comprobante.

Riesgo comun:

- asignar una clave por defecto sin validar el caso real.

### 3.2 `c_RegimenFiscal`

Definicion:

- clasifica regimen fiscal de emisor/receptor.

Control:

- validar regimen receptor antes de timbrar.

### 3.3 `c_ClaveProdServ`

Definicion:

- clasifica bien o servicio facturado.

Ejemplo:

- servicio tecnico debe usar clave de servicio, no clave de producto fisico.

### 3.4 `c_ClaveUnidad`

Definicion:

- unidad de medida del concepto.

Ejemplo:

- servicios por hora, pieza, evento, etc, segun operacion real.

### 3.5 `c_FormaPago`

Definicion:

- medio por el que se liquida pago.

### 3.6 `c_MetodoPago`

Definicion:

- `PUE` o `PPD` segun momento de pago.

### 3.7 `c_ObjetoImp`

Definicion:

- determina tratamiento de impuestos del concepto.

### 3.8 `c_Moneda`

Definicion:

- moneda del comprobante y validaciones de tipo de cambio.

### 3.9 `c_TipoRelacion`

Definicion:

- motivo de relacion entre CFDI.

## 4) Validaciones recomendadas por sistema

1. vigencia de clave por fecha.
2. compatibilidad entre catalogos relacionados.
3. bloqueo de claves obsoletas.
4. trazabilidad de version de catalogos cargada.

## 5) Matriz minima de consistencia

| Campo | Validar contra | Error comun |
|---|---|---|
| Uso CFDI | Tipo de receptor y operacion | Seleccion por defecto |
| Regimen receptor | Datos fiscales receptor | Regimen desactualizado |
| ClaveProdServ | Naturaleza del concepto | Clave generica incorrecta |
| ClaveUnidad | Unidad real de venta | Unidad no congruente |
| MetodoPago | Flujo de cobranza | Marcar PUE en ventas a credito |

## 6) Ejemplos operativos

### Ejemplo A: Servicio profesional de contado

- metodo pago: `PUE`
- forma pago: transferencia
- clave producto/servicio: servicio profesional
- clave unidad: unidad de servicio

### Ejemplo B: Venta a credito

- metodo pago: `PPD`
- complemento de pagos al cobrar
- control de parcialidades

## 7) Proceso de actualizacion de catalogos

1. detectar nueva publicacion SAT.
2. descargar fuente oficial.
3. validar integridad de datos.
4. publicar en QA y correr pruebas.
5. desplegar en produccion.
6. monitorear tasa de rechazos.

## 8) Indicadores de salud

- porcentaje de timbrados rechazados por catalogos,
- top 10 claves con mayor error,
- tiempo medio de correccion.

## 9) Buenas practicas de gobernanza

- due;o funcional de catalogos,
- versionado documentado,
- aprobacion previa a cambios en mapeo,
- capacitacion periodica de captura.

## 10) Fuentes oficiales sugeridas

- SAT: Catalogos CFDI
- SAT: CFDI 4.0
- SAT: Anexo 20

