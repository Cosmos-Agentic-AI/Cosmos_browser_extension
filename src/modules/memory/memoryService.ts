import { cosmosDB } from "./db";
import {
  FailureMemory,
  MemoryExportBundle,
  SessionMemory,
  TaskRun,
  UserMemoryCategory,
  UserMemoryEntry,
  WebsiteMemory,
  WorkflowMemory,
} from "@shared/types/memory";
import { CosmosSettings } from "@shared/types/settings";
import { cosineSimilarity, embed } from "@modules/api-manager/llmClient";

function now() {
  return Date.now();
}

function normalizeSignature(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 200);
}

/** Strip obvious secrets from memory text before persisting. */
function redact(text: string): string {
  return text
    .replace(/\b(password|passwd|secret|token|api[_-]?key|access[_-]?key)\s*[=:]\s*\S+/gi, "$1=[REDACTED]")
    .replace(/\b\d{4}[\s-]\d{4}[\s-]\d{4}[\s-]\d{4}\b/g, "[CARD-REDACTED]");
}

const SIMILARITY_THRESHOLD = 0.75;

/**
 * Memory Engine
 * --------------
 * Retrieval uses embeddings when available (requires a provider that supports
 * /v1/embeddings, e.g. OmniRoute or OpenRouter). Falls back to exact-match
 * + keyword overlap when embeddings are unavailable or the API errors.
 */
export class MemoryService {
  // ---------- Session ----------

  async getSession(sessionId: string): Promise<SessionMemory> {
    const existing = await cosmosDB.session.get(sessionId);
    if (existing) return existing;

    const fresh: SessionMemory = {
      id: sessionId,
      taskId: null,
      currentGoal: null,
      executionState: "idle",
      variables: {},
      currentUrl: null,
      activeTabIds: [],
      updatedAt: now(),
    };
    await cosmosDB.session.put(fresh);
    return fresh;
  }

  async updateSession(sessionId: string, patch: Partial<SessionMemory>): Promise<SessionMemory> {
    const current = await this.getSession(sessionId);
    const updated: SessionMemory = { ...current, ...patch, updatedAt: now() };
    await cosmosDB.session.put(updated);
    return updated;
  }

  async clearSession(sessionId: string): Promise<void> {
    await cosmosDB.session.delete(sessionId);
  }

  // ---------- User Memory ----------

  async setUserMemory(category: UserMemoryCategory, key: string, value: unknown): Promise<void> {
    const id = `${category}:${key}`;
    const entry: UserMemoryEntry = { id, category, key, value, updatedAt: now() };
    await cosmosDB.userMemory.put(entry);
  }

  async getUserMemory(category: UserMemoryCategory, key: string): Promise<unknown | null> {
    const entry = await cosmosDB.userMemory.get(`${category}:${key}`);
    return entry?.value ?? null;
  }

  async listUserMemory(category?: UserMemoryCategory): Promise<UserMemoryEntry[]> {
    if (!category) return cosmosDB.userMemory.toArray();
    return cosmosDB.userMemory.where("category").equals(category).toArray();
  }

  async deleteUserMemory(category: UserMemoryCategory, key: string): Promise<void> {
    await cosmosDB.userMemory.delete(`${category}:${key}`);
  }

  // ---------- Website Memory ----------

  async getWebsiteMemory(domain: string): Promise<WebsiteMemory | null> {
    return (await cosmosDB.websiteMemory.get(domain)) ?? null;
  }

  async upsertWebsiteMemory(domain: string, patch: Partial<WebsiteMemory>): Promise<WebsiteMemory> {
    const existing = await this.getWebsiteMemory(domain);
    const merged: WebsiteMemory = {
      id: domain,
      domain,
      structureNotes: null,
      learnedSelectors: [],
      navigationPatterns: [],
      knownWorkflowIds: [],
      ...existing,
      ...patch,
      updatedAt: now(),
    };
    await cosmosDB.websiteMemory.put(merged);
    return merged;
  }

  async recordLearnedSelector(
    domain: string,
    purpose: string,
    selector: string,
    confidence = 0.8,
  ): Promise<void> {
    const site = await this.upsertWebsiteMemory(domain, {});
    const others = site.learnedSelectors.filter((s) => s.purpose !== purpose);
    await this.upsertWebsiteMemory(domain, {
      learnedSelectors: [...others, { purpose, selector, confidence, lastVerifiedAt: now() }],
    });
  }

  // ---------- Workflow Memory ----------

  async saveWorkflow(
    workflow: Omit<WorkflowMemory, "id" | "updatedAt">,
    settings?: CosmosSettings,
  ): Promise<WorkflowMemory> {
    const id = `${workflow.domain ?? "general"}:${normalizeSignature(workflow.name)}`;
    const embedding = settings ? await embed(settings, workflow.name).catch(() => null) : undefined;
    const record: WorkflowMemory = {
      ...workflow,
      id,
      updatedAt: now(),
      ...(embedding ? { embedding } : {}),
    };
    await cosmosDB.workflowMemory.put(record);
    if (workflow.domain) {
      const site = await this.upsertWebsiteMemory(workflow.domain, {});
      if (!site.knownWorkflowIds.includes(id)) {
        await this.upsertWebsiteMemory(workflow.domain, {
          knownWorkflowIds: [...site.knownWorkflowIds, id],
        });
      }
    }
    return record;
  }

  async findWorkflow(
    name: string,
    domain: string | null,
    settings?: CosmosSettings,
  ): Promise<WorkflowMemory | null> {
    // Exact-match first (always fast).
    const id = `${domain ?? "general"}:${normalizeSignature(name)}`;
    const exact = await cosmosDB.workflowMemory.get(id);
    if (exact) return exact;

    // Semantic search when embeddings are available.
    if (settings) {
      const queryVec = await embed(settings, name).catch(() => null);
      if (queryVec) {
        const candidates = domain
          ? await cosmosDB.workflowMemory.where("domain").equals(domain).toArray()
          : await cosmosDB.workflowMemory.toArray();
        let best: WorkflowMemory | null = null;
        let bestScore = 0;
        for (const c of candidates) {
          if (!c.embedding) continue;
          const score = cosineSimilarity(queryVec, c.embedding);
          if (score > bestScore) { bestScore = score; best = c; }
        }
        if (bestScore >= SIMILARITY_THRESHOLD) return best;
      }
    }

    return null;
  }

  async listWorkflows(domain?: string): Promise<WorkflowMemory[]> {
    if (!domain) return cosmosDB.workflowMemory.toArray();
    return cosmosDB.workflowMemory.where("domain").equals(domain).toArray();
  }

  async recordWorkflowOutcome(id: string, success: boolean): Promise<void> {
    const wf = await cosmosDB.workflowMemory.get(id);
    if (!wf) return;
    await cosmosDB.workflowMemory.put({
      ...wf,
      timesUsed: wf.timesUsed + 1,
      successCount: wf.successCount + (success ? 1 : 0),
      failureCount: wf.failureCount + (success ? 0 : 1),
      updatedAt: now(),
    });
  }

  // ---------- Failure Memory ----------

  async recordFailure(
    input: {
      domain: string | null;
      taskSignature: string;
      cause: string;
      recoveryStrategy?: string | null;
      confidence?: number;
    },
    settings?: CosmosSettings,
  ): Promise<FailureMemory> {
    const signature = normalizeSignature(redact(input.taskSignature));
    const id = `${input.domain ?? "general"}:${signature}`;
    const existing = await cosmosDB.failureMemory.get(id);
    const embedding = settings ? await embed(settings, signature).catch(() => null) : undefined;

    const record: FailureMemory = {
      id,
      domain: input.domain,
      taskSignature: signature,
      cause: redact(input.cause),
      recoveryStrategy: input.recoveryStrategy ? redact(input.recoveryStrategy) : (existing?.recoveryStrategy ?? null),
      confidence: input.confidence ?? existing?.confidence ?? 0,
      occurrences: (existing?.occurrences ?? 0) + 1,
      lastOccurredAt: now(),
      ...(embedding ? { embedding } : existing?.embedding ? { embedding: existing.embedding } : {}),
    };
    await cosmosDB.failureMemory.put(record);
    return record;
  }

  /** Looks up a previously successful recovery strategy for a similar failure. */
  async findRecoveryStrategy(
    domain: string | null,
    taskSignature: string,
    settings?: CosmosSettings,
  ): Promise<FailureMemory | null> {
    const signature = normalizeSignature(taskSignature);
    const id = `${domain ?? "general"}:${signature}`;
    const exact = await cosmosDB.failureMemory.get(id);
    if (exact?.recoveryStrategy) return exact;

    // Semantic search when embeddings are available.
    if (settings) {
      const queryVec = await embed(settings, signature).catch(() => null);
      if (queryVec) {
        const candidates = domain
          ? await cosmosDB.failureMemory.where("domain").equals(domain).toArray()
          : await cosmosDB.failureMemory.toArray();
        let best: FailureMemory | null = null;
        let bestScore = 0;
        for (const c of candidates) {
          if (!c.recoveryStrategy || !c.embedding) continue;
          const score = cosineSimilarity(queryVec, c.embedding);
          if (score > bestScore) { bestScore = score; best = c; }
        }
        if (bestScore >= SIMILARITY_THRESHOLD) return best;
      }
    }

    // Fallback: keyword overlap.
    const candidates = domain
      ? await cosmosDB.failureMemory.where("domain").equals(domain).toArray()
      : await cosmosDB.failureMemory.toArray();
    const words = new Set(signature.split(" ").filter((w) => w.length > 3));
    let best: FailureMemory | null = null;
    let bestScore = 0;
    for (const c of candidates) {
      if (!c.recoveryStrategy) continue;
      const overlap = c.taskSignature.split(" ").filter((w) => words.has(w)).length;
      if (overlap > bestScore) { bestScore = overlap; best = c; }
    }
    return bestScore >= 2 ? best : null;
  }

  // ---------- Task History ----------

  async startTaskRun(goal: string, domain: string | null): Promise<string> {
    const id = `run:${Date.now()}:${Math.random().toString(36).slice(2, 7)}`;
    const run: TaskRun = { id, goal, domain, startedAt: now(), finishedAt: null, success: null, stepCount: 0, verdict: null };
    await cosmosDB.taskRuns.put(run);
    return id;
  }

  async finishTaskRun(id: string, success: boolean, stepCount: number, verdict: string | null): Promise<void> {
    const run = await cosmosDB.taskRuns.get(id);
    if (!run) return;
    await cosmosDB.taskRuns.put({ ...run, finishedAt: now(), success, stepCount, verdict });
  }

  async listTaskRuns(limit = 50): Promise<TaskRun[]> {
    return cosmosDB.taskRuns.orderBy("startedAt").reverse().limit(limit).toArray();
  }

  async clearTaskRuns(): Promise<void> {
    await cosmosDB.taskRuns.clear();
  }

  // ---------- Cross-cutting ----------

  async exportAll(): Promise<MemoryExportBundle> {
    return {
      exportedAt: now(),
      userMemory: await cosmosDB.userMemory.toArray(),
      websiteMemory: await cosmosDB.websiteMemory.toArray(),
      workflowMemory: await cosmosDB.workflowMemory.toArray(),
      failureMemory: await cosmosDB.failureMemory.toArray(),
    };
  }

  async importAll(bundle: MemoryExportBundle): Promise<void> {
    await cosmosDB.transaction(
      "rw",
      [cosmosDB.userMemory, cosmosDB.websiteMemory, cosmosDB.workflowMemory, cosmosDB.failureMemory],
      async () => {
        await cosmosDB.userMemory.bulkPut(bundle.userMemory);
        await cosmosDB.websiteMemory.bulkPut(bundle.websiteMemory);
        await cosmosDB.workflowMemory.bulkPut(bundle.workflowMemory);
        await cosmosDB.failureMemory.bulkPut(bundle.failureMemory);
      },
    );
  }

  async clearAll(): Promise<void> {
    await Promise.all([
      cosmosDB.session.clear(),
      cosmosDB.userMemory.clear(),
      cosmosDB.websiteMemory.clear(),
      cosmosDB.workflowMemory.clear(),
      cosmosDB.failureMemory.clear(),
      cosmosDB.taskRuns.clear(),
    ]);
  }
}

export const memoryService = new MemoryService();
