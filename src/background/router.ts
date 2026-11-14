import { CosmosMessage } from "@shared/types/messages";
import { apiManagerService } from "@modules/api-manager/apiManagerService";
import { memoryService } from "@modules/memory/memoryService";
import { CosmosSettings, ProviderId } from "@shared/types/settings";
import { MemoryExportBundle } from "@shared/types/memory";

/**
 * Router
 * -------
 * The brain of Cosmos. Every cross-context request (popup, content,
 * onboarding) flows through here. Modules never call each other directly —
 * they only export functions the Router composes.
 *
 * The chat execution loop itself runs over a long-lived port
 * (see background/chatPort.ts + background/orchestrator.ts) since it needs
 * to stream incremental updates — request/response messaging here covers
 * everything else: settings, memory management, and one-off lookups.
 */
export async function routeMessage(
  message: CosmosMessage,
  _sender: chrome.runtime.MessageSender,
): Promise<unknown> {
  switch (message.type) {
    case "SETTINGS_GET_KEYS": {
      return apiManagerService.getSettings();
    }

    case "ONBOARDING_SAVE_KEYS": {
      const { keys } = message.payload as { keys: Partial<Record<ProviderId, string>> };
      for (const [providerId, apiKey] of Object.entries(keys)) {
        if (apiKey) {
          await apiManagerService.updateProviderKey(providerId as ProviderId, apiKey);
        }
      }
      return apiManagerService.completeOnboarding();
    }

    case "SETTINGS_UPDATE_KEYS": {
      const { providerId, apiKey } = message.payload as { providerId: ProviderId; apiKey: string };
      return apiManagerService.updateProviderKey(providerId, apiKey);
    }

    case "SETTINGS_UPDATE_MODEL": {
      const { model } = message.payload as { model: string };
      return apiManagerService.updateDefaultModel(model);
    }

    case "SETTINGS_UPDATE_BASE_URL": {
      const { providerId, baseUrl } = message.payload as { providerId: ProviderId; baseUrl: string };
      return apiManagerService.updateProviderBaseUrl(providerId, baseUrl);
    }

    case "SETTINGS_UPDATE_THEME": {
      const { theme } = message.payload as { theme: CosmosSettings["theme"] };
      return apiManagerService.updateTheme(theme);
    }

    case "SETTINGS_UPDATE_BLOCKED_DOMAINS": {
      const { blockedDomains } = message.payload as { blockedDomains: string[] };
      return apiManagerService.updateBlockedDomains(blockedDomains);
    }

    case "SETTINGS_UPDATE_MAX_STEPS": {
      const { maxStepsPerTask } = message.payload as { maxStepsPerTask: number };
      return apiManagerService.updateMaxSteps(maxStepsPerTask);
    }

    case "MEMORY_LIST_WORKFLOWS": {
      const { domain } = (message.payload as { domain?: string }) ?? {};
      return memoryService.listWorkflows(domain);
    }

    case "MEMORY_LIST_USER": {
      return memoryService.listUserMemory();
    }

    case "MEMORY_EXPORT": {
      return memoryService.exportAll();
    }

    case "MEMORY_IMPORT": {
      const bundle = message.payload as MemoryExportBundle;
      await memoryService.importAll(bundle);
      return { imported: true };
    }

    case "MEMORY_CLEAR_ALL": {
      await memoryService.clearAll();
      return { cleared: true };
    }

    case "HISTORY_LIST": {
      const { limit } = (message.payload as { limit?: number }) ?? {};
      return memoryService.listTaskRuns(limit);
    }

    case "HISTORY_CLEAR": {
      await memoryService.clearTaskRuns();
      return { cleared: true };
    }

    default:
      throw new Error(`Router: no handler registered for message type "${message.type}"`);
  }
}
