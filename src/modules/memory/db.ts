import Dexie, { Table } from "dexie";
import {
  FailureMemory,
  SessionMemory,
  UserMemoryEntry,
  WebsiteMemory,
  WorkflowMemory,
} from "@shared/types/memory";

/**
 * CosmosDB
 * ---------
 * One Dexie database, one table per memory layer. Session memory is kept
 * here too (rather than purely in-memory) so a popup close/reopen doesn't
 * lose execution state mid-task.
 */
export class CosmosDB extends Dexie {
  session!: Table<SessionMemory, string>;
  userMemory!: Table<UserMemoryEntry, string>;
  websiteMemory!: Table<WebsiteMemory, string>;
  workflowMemory!: Table<WorkflowMemory, string>;
  failureMemory!: Table<FailureMemory, string>;

  constructor() {
    super("cosmos_memory");
    this.version(1).stores({
      session: "id, taskId, updatedAt",
      userMemory: "id, category, key, updatedAt",
      websiteMemory: "id, domain, updatedAt",
      workflowMemory: "id, name, domain, updatedAt",
      failureMemory: "id, domain, taskSignature, lastOccurredAt",
    });
  }
}

export const cosmosDB = new CosmosDB();
