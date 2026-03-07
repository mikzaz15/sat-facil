# Facturacion a extranjeros en CFDI 4.0

## 1) Objetivo

Establecer lineamientos practicos para emitir CFDI a clientes extranjeros con menos errores de captura.

## 2) Definiciones

- Receptor extranjero: cliente sin residencia fiscal mexicana segun caso comercial.
- Exportacion: operacion que puede requerir campos y validaciones especificas.
- Moneda: divisa en que se pacta la operacion; puede requerir tipo de cambio.

## 3) Reglas SAT operativas

1. Capturar datos del receptor conforme reglas vigentes para extranjeros.
2. Verificar clave de exportacion cuando la operacion lo requiera.
3. Definir moneda y tipo de cambio de forma consistente.
4. Validar impuestos aplicables segun naturaleza de la operacion.

## 4) Datos y validaciones clave

- Nombre o razon social del receptor.
- Pais de residencia y dato fiscal requerido por regla vigente.
- Clave de exportacion y campos relacionados cuando aplique.
- Moneda y tipo de cambio coherentes con contrato/cobranza.

## 5) Ejemplos practicos

### Ejemplo A: servicio digital a cliente extranjero

- CFDI emitido en moneda extranjera.
- Validar tipo de cambio interno y evidencia de cobro.

### Ejemplo B: venta de bienes con exportacion

- Capturar clave de exportacion correcta.
- Revisar campos logistico-comerciales segun procedimiento.

### Ejemplo C: pago diferido de cliente extranjero

- Si cobro es posterior, usar flujo `PPD` y complemento cuando corresponda.

## 6) Errores comunes

- Omitir datos requeridos del receptor extranjero.
- Capturar moneda sin control de tipo de cambio.
- Confundir operacion nacional con operacion de exportacion.

## 7) Controles recomendados

1. Checklist especial para clientes no residentes.
2. Validacion de catalogos antes de timbrar.
3. Conciliacion de cobro en divisa vs CFDI emitido.
4. Archivo de respaldo contractual y documental.

## 8) Checklist

1. Tipo de operacion definido (nacional/exportacion).
2. Datos receptor extranjero completos.
3. Moneda y tipo de cambio validados.
4. Impuestos y claves revisados.
5. Evidencia de cobro/documentacion archivada.

## 9) Referencias SAT sugeridas

- Anexo 20 vigente para CFDI 4.0.
- Guia de llenado CFDI 4.0 en operaciones con receptor extranjero.
- Catalogos CFDI vigentes para moneda, tipo de comprobante y exportacion.
- Criterios SAT aplicables a operaciones de exportacion y datos del receptor.
