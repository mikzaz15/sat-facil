# Metodos de pago CFDI: PUE vs PPD

## 1) Objetivo

Explicar cuando usar `PUE` y cuando usar `PPD` en CFDI 4.0, con enfoque operativo para evitar errores de timbrado y de cobranza.

## 2) Definiciones clave

- `PUE` (Pago en Una sola Exhibicion): el cobro se liquida al momento de emitir el CFDI de ingreso.
- `PPD` (Pago en Parcialidades o Diferido): el cobro ocurre despues de la emision del CFDI, en uno o varios eventos.
- `FormaPago`: medio real del pago (transferencia, efectivo, tarjeta, etc).
- `MetodoPago`: momento en que se liquida la operacion (`PUE` o `PPD`).

## 3) Reglas SAT operativas

1. El `MetodoPago` debe reflejar la realidad comercial de la operacion.
2. Si la factura se cobra despues, debe usarse `PPD`.
3. Si la factura se liquida al emitir, debe usarse `PUE`.
4. Para operaciones `PPD`, normalmente se requiere complemento de pagos al cobrar.
5. `FormaPago` no sustituye a `MetodoPago`; ambos deben ser consistentes.

## 4) Matriz de decision rapida

| Escenario | MetodoPago recomendado | Accion posterior |
| --- | --- | --- |
| Venta de contado cobrada al emitir | `PUE` | Sin complemento de pagos en flujo normal |
| Venta a credito 30 dias | `PPD` | Emitir complemento al recibir pago |
| Cobro en 2 parcialidades | `PPD` | Registrar cada parcialidad |
| Pago total dias despues de facturar | `PPD` | Emitir complemento al cobro |

## 5) Ejemplos practicos

### Ejemplo A: venta de contado

- Total factura: 5,000.00
- Cobro en el momento: 5,000.00
- Captura recomendada:
- `MetodoPago = PUE`
- `FormaPago =` medio real (ejemplo: transferencia)

### Ejemplo B: venta a credito

- Total factura: 11,600.00
- Cobro 15 dias despues
- Captura inicial:
- `MetodoPago = PPD`
- Emision posterior de complemento de pagos cuando entre el cobro

### Ejemplo C: pago parcial

- Total factura: 20,000.00
- Primer cobro: 8,000.00
- Segundo cobro: 12,000.00
- Captura inicial: `PPD`
- Se documentan parcialidades con complemento de pagos

## 6) Errores comunes

- Marcar `PUE` en operaciones que realmente son a credito.
- Usar `PPD` en ventas de contado sin necesidad.
- Confundir `FormaPago` con `MetodoPago`.
- No emitir complemento de pagos en operaciones `PPD`.

## 7) Controles recomendados

1. Regla de negocio: si hay credito comercial, sugerir `PPD`.
2. Validar contra evidencia de cobranza antes de cerrar factura.
3. Alerta de facturas `PPD` sin complemento despues de plazo interno.
4. Bitacora de correcciones de `MetodoPago`.

## 8) Checklist operativo

1. Confirmar si hubo cobro al emitir.
2. Definir `MetodoPago` segun flujo real.
3. Registrar `FormaPago` real.
4. Si es `PPD`, preparar seguimiento de cobranza.
5. Emitir complemento de pagos al recibir cobro.

## 9) Referencias SAT sugeridas

- Anexo 20 vigente para CFDI 4.0.
- Guia de llenado CFDI 4.0.
- Catalogo de formas y metodos de pago aplicables.
- Documentacion oficial del complemento de recepcion de pagos 2.0.
