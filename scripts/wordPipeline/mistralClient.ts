/**
 * Mistral 7B Instruct via Hugging Face router (OpenAI-compatible chat completions).
 * Used offline/on-demand only; never per game.
 * Requires HF_TOKEN in env.
 */

const HF_CHAT_URL = "https://router.huggingface.co/v1/chat/completions";
const MODEL = "mistralai/Mistral-7B-Instruct-v0.2";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface MistralOptions {
  maxTokens?: number;
  temperature?: number;
}

function getToken(): string {
  const token = process.env.HF_TOKEN ?? process.env.HUGGING_FACE_HUB_TOKEN ?? "";
  if (!token) {
    throw new Error("HF_TOKEN or HUGGING_FACE_HUB_TOKEN must be set for Mistral pipeline.");
  }
  return token;
}

/**
 * Call Mistral via HF router. Returns the assistant reply text.
 */
export async function complete(
  messages: ChatMessage[],
  options: MistralOptions = {}
): Promise<string> {
  const token = getToken();
  const body = {
    model: MODEL,
    messages,
    max_tokens: options.maxTokens ?? 1024,
    temperature: options.temperature ?? 0.3,
  };

  const maxRetries = 3;
  let lastError: unknown;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await fetch(HF_CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HF API ${res.status}: ${text}`);
      }

      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = data.choices?.[0]?.message?.content ?? "";
      return content.trim();
    } catch (e) {
      lastError = e;
      if (attempt < maxRetries - 1) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }

  throw lastError;
}

/**
 * Single user prompt with optional system message. Returns assistant reply.
 */
export async function prompt(
  userPrompt: string,
  systemPrompt?: string,
  opts?: MistralOptions
): Promise<string> {
  const messages: ChatMessage[] = [];
  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }
  messages.push({ role: "user", content: userPrompt });
  return complete(messages, opts);
}
