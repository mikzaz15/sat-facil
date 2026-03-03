export type SatTopic =
  | "FACTURACION_CFDI"
  | "RFC_EFIRMA"
  | "RESICO"
  | "DECLARACIONES_DEVOLUCION"
  | "BUZON_REQUERIMIENTOS"
  | "OTRO";

export type ConfidenceLevel = "Alta" | "Media" | "Baja";

export type RouterResult = {
  topic: SatTopic;
  needMoreInfo: boolean;
  questions: string[];
  ragQueries: string[];
};

export type RetrievedChunk = {
  id: string;
  source_id: string;
  chunk_text: string;
  tags: string[];
  similarity: number;
  url: string;
  title: string;
  publisher: string;
};

export type SourceCitation = {
  url: string;
  title: string;
  publisher: string;
};

export type StructuredAnswer = {
  summary: string;
  steps: string[];
  confidence: ConfidenceLevel;
  sources: SourceCitation[];
  clarifyingQuestions?: string[];
  disclaimer: string;
  legalAlert?: string;
};

export type FlowQuestion = {
  id: string;
  label: string;
};

export type FlowDefinition = {
  id: "FACTURAR" | "RESICO" | "BUZON" | "DEVOLUCION";
  questions: FlowQuestion[];
};

export type FlowStateResult = {
  status: "in_progress" | "completed";
  nextQuestion?: FlowQuestion;
  answer?: StructuredAnswer;
};

export type ChatInput = {
  userId?: string;
  sessionId?: string;
  channel: "web" | "whatsapp";
  message: string;
};

export type ChatResult = {
  userId: string;
  sessionId: string;
  topic: SatTopic;
  structured: StructuredAnswer;
  text: string;
  limited?: boolean;
};
