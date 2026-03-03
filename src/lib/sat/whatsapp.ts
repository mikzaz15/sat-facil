import { WHATSAPP_SHORTENER_PROMPT } from "@/lib/sat/prompts";
import { hasOpenAIConfig, runChatCompletion } from "@/lib/sat/openai";
import { toWhatsAppFriendly } from "@/lib/sat/format";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function shortenForWhatsApp(text: string): Promise<string> {
  if (!hasOpenAIConfig()) {
    return toWhatsAppFriendly(text, 900);
  }

  try {
    const shortened = await runChatCompletion([
      { role: "system", content: WHATSAPP_SHORTENER_PROMPT },
      { role: "user", content: text },
    ]);

    return toWhatsAppFriendly(shortened, 900);
  } catch {
    return toWhatsAppFriendly(text, 900);
  }
}

export function createTwimlMessage(message: string): string {
  const safeMessage = escapeXml(message);
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${safeMessage}</Message></Response>`;
}
