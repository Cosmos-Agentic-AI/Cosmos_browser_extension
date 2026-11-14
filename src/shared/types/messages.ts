// Cosmos runtime message contract.
// The Router (background service worker) is the only module allowed to
// receive and dispatch these messages. Popup/content/onboarding send
// requests; they never talk to each other directly.

export type CosmosMessageType =
  | "ONBOARDING_SAVE_KEYS"
  | "SETTINGS_GET_KEYS"
  | "SETTINGS_UPDATE_KEYS"
  | "SETTINGS_UPDATE_MODEL"
  | "SETTINGS_UPDATE_BASE_URL"
  | "SETTINGS_UPDATE_THEME"
  | "SETTINGS_UPDATE_BLOCKED_DOMAINS"
  | "SETTINGS_UPDATE_MAX_STEPS"
  | "MEMORY_LIST_WORKFLOWS"
  | "MEMORY_LIST_USER"
  | "MEMORY_EXPORT"
  | "MEMORY_IMPORT"
  | "MEMORY_CLEAR_ALL"
  | "CHAT_USER_MESSAGE"
  | "CHAT_STREAM_CHUNK"
  | "CHAT_EXECUTION_STATE"
  | "DOM_READ_REQUEST"
  | "DOM_READ_RESULT"
  | "ACTION_EXECUTE_REQUEST"
  | "ACTION_EXECUTE_RESULT";

export interface CosmosMessage<TPayload = unknown> {
  type: CosmosMessageType;
  payload: TPayload;
  requestId: string;
  source: "popup" | "content" | "onboarding" | "background";
}

export function createMessage<TPayload>(
  type: CosmosMessageType,
  payload: TPayload,
  source: CosmosMessage["source"],
): CosmosMessage<TPayload> {
  return {
    type,
    payload,
    requestId: crypto.randomUUID(),
    source,
  };
}
