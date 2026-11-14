export type ProviderId = "omniroute" | "openrouter" | "groq";

export interface ProviderConfig {
  id: ProviderId;
  label: string;
  keyUrl: string;
  apiKey: string | null;
  /**
   * Base URL for this provider's OpenAI-compatible endpoint.
   * OmniRoute is a self-hosted local gateway (not a cloud API), so it
   * defaults to localhost and the user typically doesn't need a remote key —
   * just the dashboard key from their local instance.
   */
  baseUrl: string;
  /** True for providers that run locally rather than as a hosted cloud API. */
  isLocalGateway: boolean;
}

export interface CosmosSettings {
  providers: Record<ProviderId, ProviderConfig>;
  defaultModel: string | null;
  theme: "dark" | "light" | "system";
  onboardingComplete: boolean;
  /** Domains Cosmos must never act on (checked before each task). */
  blockedDomains: string[];
  /** Hard cap on plan steps per task. Prevents runaway token spend on ambiguous goals. */
  maxStepsPerTask: number;
  /** Show the plan without executing any actions. */
  dryRun: boolean;
  /** Fire a Chrome notification when a task finishes while the panel is closed. */
  notifyOnComplete: boolean;
}

export const DEFAULT_PROVIDERS: Record<ProviderId, ProviderConfig> = {
  omniroute: {
    id: "omniroute",
    label: "OmniRoute",
    keyUrl: "https://omniroute.online/",
    apiKey: null,
    baseUrl: "http://localhost:20128/v1",
    isLocalGateway: true,
  },
  openrouter: {
    id: "openrouter",
    label: "OpenRouter",
    keyUrl: "https://openrouter.ai/",
    apiKey: null,
    baseUrl: "https://openrouter.ai/api/v1",
    isLocalGateway: false,
  },
  groq: {
    id: "groq",
    label: "Groq",
    keyUrl: "https://console.groq.com/",
    apiKey: null,
    baseUrl: "https://api.groq.com/openai/v1",
    isLocalGateway: false,
  },
};

export const DEFAULT_SETTINGS: CosmosSettings = {
  providers: DEFAULT_PROVIDERS,
  defaultModel: null,
  theme: "dark",
  onboardingComplete: false,
  blockedDomains: [],
  maxStepsPerTask: 15,
  dryRun: false,
  notifyOnComplete: true,
};
