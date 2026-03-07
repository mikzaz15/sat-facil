# Catalogo Uso CFDI: reglas y ejemplos

## 1) Objetivo

Ayudar a capturar correctamente el `UsoCFDI` para reducir errores de timbrado y de deducibilidad.

## 2) Definiciones

- `UsoCFDI`: clave del catalogo SAT que describe el destino fiscal del comprobante para el receptor.
- `RegimenFiscalReceptor`: regimen fiscal del receptor que debe ser compatible con el uso capturado.

## 3) Reglas SAT operativas

1. `UsoCFDI` debe ser coherente con el tipo de operacion y receptor.
2. Debe existir compatibilidad entre regimen del receptor y uso seleccionado.
3. El uso no debe seleccionarse por costumbre; debe obedecer al caso real.

## 4) Flujo recomendado

1. Confirmar regimen del receptor.
2. Identificar finalidad fiscal de la operacion.
3. Seleccionar clave de uso compatible.
4. Validar con reglas del PAC/ERP antes de timbrar.

## 5) Ejemplos practicos

### Ejemplo A: venta general de bienes

- Receptor: persona moral
- Uso recomendado: clave del catalogo aplicable a adquisicion de mercancias (segun caso)

### Ejemplo B: honorarios profesionales

- Receptor: persona fisica
- Uso recomendado: clave aplicable al tipo de servicio (segun reglas vigentes)

### Ejemplo C: receptor con regimen actualizado

- Si cambia regimen del receptor, revisar de nuevo `UsoCFDI` antes de timbrar.

## 6) Errores comunes

- Usar una clave generica para todos los clientes.
- No actualizar regimen del receptor en datos maestros.
- Seleccionar uso incompatible con el regimen o actividad.

## 7) Controles recomendados

1. Tabla de decision por tipo de operacion.
2. Validacion automatica de compatibilidad regimen/uso.
3. Alertas cuando cliente cambie datos fiscales.
4. Revision muestral diaria de CFDI emitidos.

## 8) Checklist

1. Regimen receptor verificado.
2. Uso CFDI seleccionado con criterio.
3. Compatibilidad validada.
4. Timbrado sin errores de catalogo.

## 9) Referencias SAT sugeridas

- Catalogo de usos de CFDI vigente.
- Guia de llenado CFDI 4.0.
- Anexo 20 vigente.
- Catalogos CFDI para validar compatibilidades con regimen fiscal del receptor.
