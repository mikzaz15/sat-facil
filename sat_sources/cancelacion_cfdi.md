# Cancelacion CFDI: criterios operativos y sustitucion

## 1) Objetivo

Definir un flujo claro para cancelar CFDI con el menor riesgo operativo y fiscal.

## 2) Definiciones

- Cancelacion CFDI: proceso para dejar sin efectos un comprobante timbrado.
- Sustitucion: emision de un nuevo CFDI que reemplaza al anterior, con relacion adecuada.
- UUID: identificador unico del CFDI timbrado.

## 3) Reglas SAT operativas

1. Confirmar motivo real de cancelacion.
2. Validar estatus del CFDI antes de cancelar.
3. Cuando aplique sustitucion, relacionar CFDI nuevo con el UUID anterior.
4. Mantener evidencia de la causa y autorizacion interna.

## 4) Flujo recomendado

1. Diagnosticar error: datos fiscales, importes, impuestos, metodo de pago, etc.
2. Definir si requiere cancelacion simple o cancelacion con sustitucion.
3. Ejecutar cancelacion segun procedimiento vigente.
4. Emitir comprobante sustituto cuando corresponda.
5. Registrar bitacora con UUID origen y UUID nuevo.

## 5) Ejemplos practicos

### Ejemplo A: error en datos del receptor

- Accion: cancelar y emitir CFDI corregido.
- Control: mantener relacion y evidencia de cambio.

### Ejemplo B: importe capturado incorrecto

- Accion: cancelar CFDI incorrecto y sustituir.
- Control: validar total e impuestos antes del nuevo timbrado.

### Ejemplo C: metodo de pago mal definido

- Accion: evaluar si procede sustitucion conforme flujo real.

## 6) Errores comunes

- Cancelar sin documentar motivo.
- No relacionar CFDI sustituto cuando aplica.
- Reemitir con los mismos errores por falta de checklist.

## 7) Controles recomendados

1. Politica interna de aprobacion de cancelaciones.
2. Checklist obligatorio pre-timbrado del sustituto.
3. Reporte semanal de cancelaciones por causa raiz.
4. Capacitacion de captura para reducir recurrencia.

## 8) Checklist

1. Motivo identificado.
2. Estatus CFDI validado.
3. Relacion UUID definida si aplica.
4. Sustituto validado antes de timbrar.
5. Evidencia archivada.

## 9) Referencias SAT sugeridas

- Documentacion SAT vigente de cancelacion de CFDI.
- Catalogo de motivos de cancelacion y reglas de aceptacion.
- Guia de llenado CFDI 4.0 para relaciones y sustitucion.
- Criterios normativos SAT aplicables a correcciones y reemision.
