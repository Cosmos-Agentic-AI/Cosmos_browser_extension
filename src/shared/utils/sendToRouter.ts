import { CosmosMessage, CosmosMessageType, createMessage } from "@shared/types/messages";

interface RouterResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

export async function sendToRouter<TPayload, TResult = unknown>(
  type: CosmosMessageType,
  payload: TPayload,
  source: CosmosMessage["source"],
): Promise<TResult> {
  const message = createMessage(type, payload, source);
  const response = (await chrome.runtime.sendMessage(message)) as RouterResponse<TResult>;

  if (!response?.ok) {
    throw new Error(response?.error ?? "Cosmos Router: unknown error");
  }
  return response.data as TResult;
}
