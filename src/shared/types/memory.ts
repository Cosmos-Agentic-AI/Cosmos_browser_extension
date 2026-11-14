/**
 * Memory Engine types.
 *
 * Five layers, per the spec:
 *  - Session: ephemeral, per-task, cleared often
 *  - User: durable preferences and saved data
 *  - Website: what Cosmos has learned about a specific domain's structure
 *  - Workflow: reusable named task flows (possibly domain-scoped)
 *  - Failure: what went wrong before, and what recovery worked
 */

export interface SessionMemory {
  id: string; // stable id, typically the tab id as a string
  taskId: string | null;
  currentGoal: string | null;
  executionState: "idle" | "planning" | "executing" | "waiting_confirmation" | "error" | "done";
  variables: Record<string, unknown>;
  currentUrl: string | null;
  activeTabIds: number[];
  updatedAt: number;
}

export type UserMemoryCategory =
  | "preference"
  | "frequent_site"
  | "custom_prompt"
  | "saved_info"
  | "approved_form_data";

export interface UserMemoryEntry {
  id: string;
  category: UserMemoryCategory;
  key: string;
  value: unknown;
  updatedAt: number;
}

export interface LearnedSelector {
  purpose: string; // e.g. "search input", "submit button"
  selector: string;
  confidence: number; // 0-1
  lastVerifiedAt: number;
}

export interface WebsiteMemory {
  id: string; // domain, e.g. "example.com"
  domain: string;
  structureNotes: string | null; // free-text summary of layout/quirks
  learnedSelectors: LearnedSelector[];
  navigationPatterns: string[]; // free-text notes, e.g. "search results paginate via ?page=N"
  knownWorkflowIds: string[];
  updatedAt: number;
}

export interface WorkflowStepTemplate {
  order: number;
  description: string;
  actionType: string; // matches ActionType from actions.ts, kept loose to avoid circular import
}

export interface WorkflowMemory {
  id: string;
  name: string;
  domain: string | null; // null = general/reusable across sites
  steps: WorkflowStepTemplate[];
  timesUsed: number;
  successCount: number;
  failureCount: number;
  updatedAt: number;
  /** Semantic embedding of `name` for cosine-similarity retrieval. */
  embedding?: number[];
}

export interface FailureMemory {
  id: string;
  domain: string | null;
  taskSignature: string; // short normalized description of what was attempted
  cause: string;
  recoveryStrategy: string | null;
  confidence: number; // 0-1, how reliable the recovery strategy has proven
  occurrences: number;
  lastOccurredAt: number;
  /** Semantic embedding of `taskSignature` for cosine-similarity retrieval. */
  embedding?: number[];
}

export interface MemoryExportBundle {
  exportedAt: number;
  userMemory: UserMemoryEntry[];
  websiteMemory: WebsiteMemory[];
  workflowMemory: WorkflowMemory[];
  failureMemory: FailureMemory[];
}
