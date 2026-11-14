import { CosmosSettings, DEFAULT_SETTINGS, ProviderConfig, ProviderId } from "@shared/types/settings";

const STORAGE_KEY = "cosmos_settings_v1";

/**
 * API Manager
 * ------------
 * Sole owner of persisted settings (API keys, provider config, theme, etc).
 * No other module reads or writes chrome.storage directly — they go
 * through the Router, which calls this service.
 */
export class ApiManagerService {
  private cache: CosmosSettings | null = null;

  async getSettings(): Promise<CosmosSettings> {
    if (this.cache) return this.cache;

    const stored = await chrome.storage.local.get(STORAGE_KEY);
    const raw = stored[STORAGE_KEY] as CosmosSettings | undefined;

    this.cache = raw ?? structuredClone(DEFAULT_SETTINGS);
    return this.cache;
  }

  async updateProviderKey(providerId: ProviderId, apiKey: string): Promise<CosmosSettings> {
    const settings = await this.getSettings();
    const updated: CosmosSettings = {
      ...settings,
      providers: {
        ...settings.providers,
        [providerId]: {
          ...settings.providers[providerId],
          apiKey,
        } satisfies ProviderConfig,
      },
    };
    return this.persist(updated);
  }

  async updateProviderBaseUrl(providerId: ProviderId, baseUrl: string): Promise<CosmosSettings> {
    const settings = await this.getSettings();
    const updated: CosmosSettings = {
      ...settings,
      providers: {
        ...settings.providers,
        [providerId]: {
          ...settings.providers[providerId],
          baseUrl,
        } satisfies ProviderConfig,
      },
    };
    return this.persist(updated);
  }

  async updateDefaultModel(model: string): Promise<CosmosSettings> {
    const settings = await this.getSettings();
    return this.persist({ ...settings, defaultModel: model });
  }

  async updateMaxSteps(maxStepsPerTask: number): Promise<CosmosSettings> {
    const settings = await this.getSettings();
    return this.persist({ ...settings, maxStepsPerTask: Math.max(1, Math.min(50, maxStepsPerTask)) });
  }

  async updateDryRun(dryRun: boolean): Promise<CosmosSettings> {
    const settings = await this.getSettings();
    return this.persist({ ...settings, dryRun });
  }

  async updateNotifyOnComplete(notifyOnComplete: boolean): Promise<CosmosSettings> {
    const settings = await this.getSettings();
    return this.persist({ ...settings, notifyOnComplete });
  }

  async updateTheme(theme: CosmosSettings["theme"]): Promise<CosmosSettings> {
    const settings = await this.getSettings();
    return this.persist({ ...settings, theme });
  }

  async updateBlockedDomains(blockedDomains: string[]): Promise<CosmosSettings> {
    const settings = await this.getSettings();
    return this.persist({ ...settings, blockedDomains });
  }

  async completeOnboarding(): Promise<CosmosSettings> {
    const settings = await this.getSettings();
    return this.persist({ ...settings, onboardingComplete: true });
  }

  async clearAll(): Promise<CosmosSettings> {
    const fresh = structuredClone(DEFAULT_SETTINGS);
    return this.persist(fresh);
  }

  private async persist(settings: CosmosSettings): Promise<CosmosSettings> {
    this.cache = settings;
    await chrome.storage.local.set({ [STORAGE_KEY]: settings });
    return settings;
  }
}

export const apiManagerService = new ApiManagerService();
