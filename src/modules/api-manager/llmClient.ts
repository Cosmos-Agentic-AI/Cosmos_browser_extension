import { CosmosSettings, ProviderId } from "@shared/types/settings";

export interface LlmTextPart {
  type: "text";
  text: string;
}
export interface LlmImagePart {
  type: "image_url";
  image_url: { url: string }; // data: URL
}
export type LlmContentPart = LlmTextPart | LlmImagePart;

export interface LlmMessage {
  role: "system" | "user" | "assistant";
  content: string | LlmContentPart[];
}

export interface ChatCompleteOptions {
  providerId: ProviderId;
  model: string;
  messages: LlmMessage[];
  temperature?: number;
  /** JSON schema mode — most OpenAI-compatible gateways accept this passthrough. */
  jsonMode?: boolean;
}

/**
 * Resolves which provider config to use and throws a clear error if it's
 * missing a key it actually needs (local gateways may run keyless).
 */
function resolveProvider(settings: CosmosSettings, providerId: ProviderId) {
  const provider = settings.providers[providerId];
  if (!provider) throw new Error(`Unknown provider: ${providerId}`);
  if (!provider.apiKey && !provider.isLocalGateway) {
    throw new Error(`${provider.label} has no API key configured. Add one in Settings.`);
  }
  return provider;
}

/** Non-streaming call — used by Planner/Vision/Specialist Agent for structured JSON output. */
export async function chatComplete(
  settings: CosmosSettings,
  options: ChatCompleteOptions,
): Promise<string> {
  const provider = resolveProvider(settings, options.providerId);

  const res = await fetch(`${provider.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(provider.apiKey ? { Authorization: `Bearer ${provider.apiKey}` } : {}),
    },
    body: JSON.stringify({
      model: options.model,
      messages: options.messages,
      temperature: options.temperature ?? 0.3,
      stream: false,
      ...(options.jsonMode ? { response_format: { type: "json_object" } } : {}),
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${provider.label} request failed (${res.status}): ${body.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    choices: Array<{ message: { content: string } }>;
  };
  return data.choices[0]?.message?.content ?? "";
}

/**
 * Streaming call — used by the chat orchestrator for the assistant's
 * narration. Parses standard OpenAI-style SSE ("data: {json}\n\n" lines,
 * terminated by "data: [DONE]").
 */
export async function* chatCompleteStream(
  settings: CosmosSettings,
  options: ChatCompleteOptions,
): AsyncGenerator<string> {
  const provider = resolveProvider(settings, options.providerId);

  const res = await fetch(`${provider.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(provider.apiKey ? { Authorization: `Bearer ${provider.apiKey}` } : {}),
    },
    body: JSON.stringify({
      model: options.model,
      messages: options.messages,
      temperature: options.temperature ?? 0.5,
      stream: true,
    }),
  });

  if (!res.ok || !res.body) {
    const body = await res.text().catch(() => "");
    throw new Error(`${provider.label} stream failed (${res.status}): ${body.slice(0, 300)}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (payload === "[DONE]") return;

      try {
        const json = JSON.parse(payload) as {
          choices: Array<{ delta?: { content?: string } }>;
        };
        const delta = json.choices[0]?.delta?.content;
        if (delta) yield delta;
      } catch {
        // Some gateways send heartbeat/comment lines — skip anything unparsable.
        continue;
      }
    }
  }
}
