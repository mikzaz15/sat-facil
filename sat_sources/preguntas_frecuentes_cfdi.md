# Preguntas frecuentes CFDI 4.0

## Introduccion

Esta coleccion responde dudas recurrentes de facturacion CFDI 4.0. El enfoque es operativo: prevenir rechazos, corregir errores comunes y mejorar consistencia de captura.

## FAQ

### 1) Que datos del receptor son obligatorios en CFDI 4.0?

Normalmente se validan como minimo:

- RFC,
- nombre o razon social,
- codigo postal de domicilio fiscal,
- regimen fiscal receptor,
- uso CFDI.

Si estos datos no coinciden con informacion fiscal vigente, el timbrado puede fallar.

### 2) Puedo usar cualquier uso CFDI?

No. Debe ser coherente con el tipo de receptor y la operacion. Elegirlo por costumbre es una causa comun de rechazo.

### 3) Cuando usar PUE y cuando PPD?

- `PUE`: pago en una sola exhibicion.
- `PPD`: pago en parcialidades o diferido.

Si una venta se emite como `PPD`, normalmente se requiere complemento de pagos cuando se cobre.

### 4) Que pasa si facture con datos incorrectos?

Depende del error y del estado del comprobante. En muchos casos se requiere cancelacion y sustitucion con CFDI relacionado.

### 5) Es obligatorio usar clave de producto y unidad exactas?

Si. Deben representar la operacion real y existir en catalogos vigentes. Claves genericas mal usadas generan observaciones y retrabajo.

### 6) Que errores de impuestos son mas comunes?

- bases mal calculadas,
- tasa/cuota incorrecta,
- redondeo inconsistente,
- objeto de impuesto incorrecto.

### 7) Si el cliente no paga hoy, como facturo?

Generalmente con metodo `PPD` y seguimiento de cobro para emitir complemento de pagos cuando corresponda.

### 8) El CFDI 4.0 permite cancelar sin relacionar?

No siempre. En correcciones frecuentes, la sustitucion y relacion del CFDI previo son clave para trazabilidad.

### 9) Que catalogos debo revisar primero al diagnosticar rechazos?

Priorizar:

- uso CFDI,
- regimen fiscal,
- clave producto/servicio,
- clave unidad,
- forma y metodo de pago,
- objeto impuesto.

### 10) Como reducir errores de timbrado en equipos grandes?

Implementar controles:

1. validacion previa automatizada,
2. entrenamiento en casos frecuentes,
3. bloqueo de claves obsoletas,
4. bitacora de errores y causa raiz.

### 11) Que diferencia hay entre regimen fiscal del emisor y del receptor?

- ambos son obligatorios pero cumplen funciones distintas en validaciones.
- el regimen del receptor impacta compatibilidad de uso CFDI y reglas de captura.

### 12) Que valida primero soporte cuando falla timbrado?

1. datos del receptor.
2. uso CFDI.
3. regimen fiscal.
4. catalogos de concepto.
5. impuestos.
6. metodo/forma de pago.

### 13) Si el cliente cambia de regimen, debo cancelar facturas pasadas?

No necesariamente. Lo importante es que nuevas facturas se emitan con datos vigentes. Para comprobantes ya emitidos, evaluar correccion segun impacto y criterio fiscal aplicable.

### 14) Que pasa si uso `PUE` y en realidad fue `PPD`?

Puede requerir correccion administrativa/fiscal segun el caso. Es mejor detectar antes de timbrar para evitar cancelaciones y retrabajo.

### 15) Cuando es obligatorio emitir complemento de pagos 2.0?

En operaciones facturadas con `PPD` cuando el pago ocurre despues de la emision del CFDI de ingreso.

### 16) Que errores son tipicos en complemento de pagos?

- parcialidad incorrecta,
- saldos no cuadran,
- UUID relacionado incorrecto,
- forma de pago mal capturada.

### 17) Puedo cancelar CFDI sin sustitucion?

Depende del motivo y del caso. Si hubo error de captura y se requiere corregir datos esenciales, suele aplicarse sustitucion con CFDI relacionado.

### 18) Que evidencia guardar en cancelaciones?

- UUID original,
- UUID sustituto (si aplica),
- tipo de relacion,
- motivo documentado,
- fecha/hora y responsable.

### 19) Como tratar rechazos repetidos por uso CFDI?

- revisar politica interna de seleccion de uso,
- agregar reglas por tipo de cliente,
- bloquear opciones incompatibles en sistema.

### 20) Como mejorar calidad de datos del receptor?

- pedir constancia fiscal actualizada en alta,
- validar campos criticos en cada re-facturacion relevante,
- auditar clientes con alto indice de correccion.

## Mini checklist de soporte rapido

Si un CFDI se rechaza:

1. revisar mensaje del PAC,
2. validar datos del receptor,
3. validar catalogos y vigencia,
4. revisar impuestos y redondeos,
5. verificar metodo/forma de pago,
6. revisar si requiere relacion o complemento.

## Nota de uso

Estas respuestas sirven como base de conocimiento para asistencia SAT/CFDI. Para decisiones definitivas, usar documentacion oficial vigente del SAT y criterios tecnicos del PAC.
