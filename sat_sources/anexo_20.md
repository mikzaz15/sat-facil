# Anexo 20 CFDI 4.0

## Que es el Anexo 20

El Anexo 20 es la especificacion tecnica del CFDI. Define como debe construirse el XML, que campos son obligatorios, que relaciones existen entre nodos y que reglas de validacion aplican al timbrado.

En CFDI 4.0, el Anexo 20 se complementa con:

- estandar tecnico (estructura XML),
- esquemas XSD (tipos y formato),
- catalogos SAT (claves permitidas),
- guia de llenado (criterio operativo),
- reglas de validacion publicadas por SAT y PAC.

## Objetivo operativo

En terminos practicos, Anexo 20 evita que cada sistema facture "a su manera". Si un XML no cumple estructura, catalogos o reglas de consistencia, el PAC rechaza el timbrado.

## Estructura base del CFDI 4.0

Los bloques principales del comprobante son:

1. `Comprobante`
- version, serie, folio, fecha, moneda, tipo de comprobante, metodo y forma de pago, lugar de expedicion, exportacion.

2. `Emisor`
- RFC, nombre, regimen fiscal.

3. `Receptor`
- RFC, nombre, domicilio fiscal receptor, regimen fiscal receptor, uso CFDI.

4. `Conceptos`
- descripcion de bienes/servicios, clave de producto/servicio, clave unidad, cantidad, valor unitario, importe, descuentos y objeto de impuesto.

5. `Impuestos`
- traslados y retenciones a nivel concepto y/o comprobante, con base, impuesto, tipo factor, tasa/cuota e importe.

6. `CfdiRelacionados` (cuando aplica)
- para sustitucion, devoluciones, notas de credito u otros supuestos.

7. `Complemento` (cuando aplica)
- por ejemplo: pagos 2.0, nomina, carta porte, comercio exterior, etc.

## Reglas criticas de validacion en CFDI 4.0

En operacion diaria, los errores mas frecuentes vienen de estas validaciones:

- datos del receptor no coinciden con constancia de situacion fiscal,
- uso CFDI incompatible con tipo de receptor o regimen,
- claves de catalogo fuera de vigencia o mal seleccionadas,
- impuestos con base, tasa o importes inconsistentes,
- metodo de pago y forma de pago sin coherencia con la operacion,
- CFDI relacionado faltante en sustituciones/cancelaciones.

### Validaciones de alto riesgo por receptor

1. RFC capturado con homoclave incorrecta.
2. Nombre con variaciones no compatibles con datos fiscales.
3. Codigo postal de domicilio fiscal desactualizado.
4. Regimen fiscal receptor no alineado.
5. Uso CFDI capturado por default sin validacion.

## Cambios de alto impacto en CFDI 4.0

Comparado con versiones previas, los puntos con mayor impacto operativo son:

- mayor precision en datos del receptor,
- validaciones mas estrictas de catalogos,
- mayor control en cancelaciones y sustituciones,
- mayor dependencia de consistencia entre nodos XML.

## Cancelacion y sustitucion desde el enfoque Anexo 20

Puntos operativos:

- la trazabilidad entre comprobantes es parte critica para consistencia documental.
- cuando hay correccion material, suele requerirse relacion correcta entre UUID origen y comprobante sustituto.
- omitir la relacion puede generar diferencias en conciliacion fiscal y operativa.

Edge cases:

1. correccion de datos del receptor despues del timbrado.
2. correccion de metodo de pago por cambio de cobranza.
3. correccion de impuestos por error de calculo.

## Checklist tecnico antes de timbrar

1. Confirmar version CFDI y XSD vigentes.
2. Validar receptor contra datos fiscales actuales.
3. Verificar catalogos obligatorios (uso, regimen, clave producto, clave unidad, objeto impuesto, etc).
4. Revisar calculo de impuestos por concepto y total.
5. Confirmar coherencia entre metodo/forma de pago y flujo comercial.
6. Validar si requiere complemento y/o CFDI relacionado.
7. Probar XML en ambiente de QA con casos reales.

## Ejemplos de errores comunes y accion

1. Error: "uso CFDI no valido para receptor"
- accion: validar uso y regimen receptor con catalogo vigente.

2. Error: "codigo postal del receptor incorrecto"
- accion: validar domicilio fiscal receptor en datos maestros.

3. Error: "metodo de pago inconsistente"
- accion: revisar flujo comercial y ajustar antes de timbrar.

4. Error en cancelacion por relacion faltante
- accion: determinar tipo de relacion correcto y reemitir segun criterio aplicable.

## Buenas practicas para estabilidad

- mantener catalogos y reglas SAT versionados por fecha,
- registrar errores de timbrado por codigo y causa raiz,
- construir validaciones previas al timbrado en frontend y backend,
- publicar guias internas para captura correcta por area operativa,
- monitorear cambios SAT y ejecutar pruebas de regresion mensuales.

## Nota de uso

Este documento es una guia de trabajo para RAG y soporte operativo. Para decisiones finales, siempre validar contra documentacion oficial vigente del SAT y criterios del PAC en produccion.
