import type { FlowDefinition } from "@/lib/sat/types";

export const FLOW_DEFINITIONS: Record<string, FlowDefinition> = {
  FACTURAR: {
    id: "FACTURAR",
    questions: [
      { id: "persona_tipo", label: "¿Eres persona física o moral?" },
      { id: "tipo_operacion", label: "¿Vas a facturar servicio o producto?" },
      { id: "tipo_cliente", label: "¿Tu cliente es empresa o persona?" },
      {
        id: "credenciales",
        label: "¿Tienes contraseña del SAT o e.firma?",
      },
    ],
  },
  RESICO: {
    id: "RESICO",
    questions: [
      {
        id: "ingresos_rango",
        label: "¿Cuál es tu rango de ingresos aproximados?",
      },
      {
        id: "tipo_ingresos",
        label: "¿Tus ingresos son por servicios, ventas, arrendamiento u otro?",
      },
      {
        id: "nomina_adicional",
        label: "¿También tienes ingresos por nómina? (sí/no)",
      },
    ],
  },
  BUZON: {
    id: "BUZON",
    questions: [
      {
        id: "recibio_aviso",
        label: "¿Recibiste aviso en Buzón Tributario? (sí/no)",
      },
      {
        id: "puede_entrar_hoy",
        label: "¿Puedes entrar al buzón hoy? (sí/no)",
      },
      {
        id: "requerimiento_multa",
        label: "¿El aviso menciona requerimiento o multa? (sí/no/no sé)",
      },
    ],
  },
  DEVOLUCION: {
    id: "DEVOLUCION",
    questions: [
      {
        id: "perfil_ingresos",
        label: "¿Eres asalariado, freelance o mixto?",
      },
      {
        id: "deducciones_cfdi",
        label: "¿Tienes deducciones con factura (CFDI)? (sí/no)",
      },
      { id: "efirma", label: "¿Tienes e.firma vigente? (sí/no)" },
    ],
  },
};

export function getFlowDefinition(flowId: string): FlowDefinition | null {
  return FLOW_DEFINITIONS[flowId] ?? null;
}
