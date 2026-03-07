# Catalogos CFDI 4.0

## Que son y por que importan

Los catalogos CFDI son listas oficiales del SAT con valores permitidos para campos del XML. Su funcion es estandarizar datos para que facturas, declaraciones, conciliaciones y auditorias puedan procesarse con reglas consistentes.

Si una clave no existe, esta fuera de vigencia o no corresponde al contexto del comprobante, el timbrado puede ser rechazado.

## Catalogos de uso frecuente

1. `c_UsoCFDI`
- define para que usara el receptor el comprobante.

2. `c_RegimenFiscal`
- clasifica el regimen del emisor y receptor.

3. `c_ClaveProdServ`
- identifica el tipo de bien o servicio facturado.

4. `c_ClaveUnidad`
- indica la unidad de medida facturada.

5. `c_FormaPago`
- especifica como se pago (efectivo, transferencia, tarjeta, etc).

6. `c_MetodoPago`
- define si se liquida en una exhibicion (`PUE`) o en parcialidades/diferido (`PPD`).

7. `c_ObjetoImp`
- indica si el concepto es objeto de impuesto.

8. `c_Moneda`
- define la moneda del comprobante y reglas asociadas.

9. `c_TipoRelacion`
- se usa para relacionar CFDI en sustituciones, notas de credito y otros casos.

10. `c_Exportacion`
- clasifica operaciones de exportacion cuando aplica.

## Errores comunes por catalogos

- usar clave de producto demasiado generica sin alineacion al servicio real,
- usar `PUE` cuando la operacion realmente es credito,
- capturar uso CFDI por costumbre sin validar el caso del receptor,
- mantener catalogos desactualizados en el ERP o facturador,
- permitir claves libres sin validacion previa al timbrado.

## Uso CFDI y regimen fiscal: validaciones cruzadas

Puntos clave:

1. `UsoCFDI` debe capturarse con base en la operacion real del receptor.
2. `RegimenFiscalReceptor` debe estar vigente y correctamente mapeado.
3. el motor de validacion debe bloquear combinaciones incompatibles.

Edge cases:

- cliente con cambios recientes de regimen,
- cliente con multiples razones sociales,
- operaciones mixtas donde el uso cambia por tipo de servicio.

Controles sugeridos:

- matriz interna de compatibilidad uso/regimen por tipo de cliente.
- confirmacion explicita de uso CFDI en onboarding o renovacion de datos.

## Matriz de validacion recomendada

Antes de timbrar, validar al menos:

1. vigencia de la clave en fecha de emision,
2. compatibilidad entre `uso CFDI`, `regimen receptor` y tipo de comprobante,
3. coherencia entre `metodo pago` y flujo comercial real,
4. compatibilidad entre `objeto impuesto` e impuestos del concepto,
5. consistencia de moneda, tipo de cambio e importes.

## Ejemplos practicos

### Ejemplo A: servicio empresarial mensual

- validar clave servicio.
- validar uso CFDI para gasto operativo.
- validar regimen receptor.

### Ejemplo B: venta a credito

- metodo pago `PPD`.
- flujo posterior de complemento de pagos.
- revisar catalogos de pago en cada etapa.

### Ejemplo C: factura corregida por datos receptor

- revisar catalogos antes de reemitir.
- asegurar relacion CFDI cuando sea sustitucion.

## Gobierno de catalogos en sistemas internos

Para operar de forma estable:

- versionar catalogos por fecha de actualizacion,
- registrar fuente y fecha de descarga oficial,
- separar catalogos de produccion y QA,
- bloquear timbrado cuando exista clave invalida o obsoleta,
- agregar pruebas automatizadas con casos de negocio criticos.

## Proceso de actualizacion sugerido

1. Detectar cambios SAT.
2. Descargar catalogos oficiales.
3. Ejecutar validaciones de integridad.
4. Probar escenarios de timbrado en QA.
5. Publicar en produccion con control de version.
6. Monitorear errores post despliegue.

## Señales de alerta operativa

Si aparecen rechazos repetidos, revisar:

- catalogo desalineado vs SAT,
- mapeo incorrecto en pantalla de captura,
- reglas de negocio inconsistentes entre frontend y backend,
- datos maestros del cliente/proveedor incompletos.

## FAQ rapido de catalogos

1. Cada cuanto debo actualizar catalogos?
- cada vez que exista publicacion oficial o cambio relevante.

2. Puedo dejar que el usuario capture clave libre?
- no recomendable en produccion; aumenta rechazos.

3. Como detectar clave obsoleta?
- validar vigencia por fecha de emision en cada timbrado.

4. Que hacer si un catalogo cambia a mitad de mes?
- versionar por fecha, probar en QA y desplegar controladamente.

## Nota de uso

Este documento resume criterios practicos para ingestion y RAG. En caso de conflicto, prevalece la documentacion oficial vigente del SAT y las validaciones tecnicas del PAC.
