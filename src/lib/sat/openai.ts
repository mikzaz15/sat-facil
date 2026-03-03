type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

function getApiKey() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY");
  }
  return apiKey;
}

function getChatModel() {
  return process.env.OPENAI_CHAT_MODEL ?? "gpt-4.1-mini";
}

function getEmbeddingModel() {
  return process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small";
}

export function hasOpenAIConfig() {
  return Boolean(process.env.OPENAI_API_KEY);
}

export async function runChatCompletion(messages: ChatMessage[]): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: getChatModel(),
      temperature: 0.2,
      messages,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI chat completion failed (${response.status}): ${body}`);
  }

  const payload = (await response.json()) as ChatCompletionResponse;
  const content = payload.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("OpenAI returned an empty chat completion response");
  }

  return content;
}

export async function runChatJson<T>(messages: ChatMessage[]): Promise<T> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: getChatModel(),
      temperature: 0,
      response_format: { type: "json_object" },
      messages,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI JSON completion failed (${response.status}): ${body}`);
  }

  const payload = (await response.json()) as ChatCompletionResponse;
  const content = payload.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("OpenAI returned an empty JSON completion response");
  }

  return JSON.parse(content) as T;
}

export async function createEmbedding(input: string): Promise<number[]> {
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: getEmbeddingModel(),
      input,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI embedding failed (${response.status}): ${body}`);
  }

  const payload = (await response.json()) as {
    data?: Array<{ embedding?: number[] }>;
  };
  const embedding = payload.data?.[0]?.embedding;

  if (!embedding) {
    throw new Error("OpenAI embedding response was empty");
  }

  return embedding;
}

export function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}
