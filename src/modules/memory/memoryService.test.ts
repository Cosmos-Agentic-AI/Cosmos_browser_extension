import { describe, it, expect, vi, beforeEach } from "vitest";

// Isolate the redact and normalizeSignature pure logic by extracting what we
// need to test without initialising IndexedDB (which requires a real browser).
// We test the observable effect: failure records must not contain plaintext secrets.

// Minimal Dexie mock — returns empty arrays and silently swallows writes.
vi.mock("./db", () => ({
  cosmosDB: {
    session: { get: vi.fn().mockResolvedValue(undefined), put: vi.fn() },
    userMemory: { get: vi.fn().mockResolvedValue(undefined), put: vi.fn(), where: vi.fn(() => ({ equals: vi.fn(() => ({ toArray: vi.fn().mockResolvedValue([]) })) })), toArray: vi.fn().mockResolvedValue([]) },
    websiteMemory: { get: vi.fn().mockResolvedValue(undefined), put: vi.fn(), where: vi.fn(() => ({ equals: vi.fn(() => ({ toArray: vi.fn().mockResolvedValue([]) })) })) },
    workflowMemory: { get: vi.fn().mockResolvedValue(undefined), put: vi.fn(), where: vi.fn(() => ({ equals: vi.fn(() => ({ toArray: vi.fn().mockResolvedValue([]) })) })), toArray: vi.fn().mockResolvedValue([]) },
    failureMemory: { get: vi.fn().mockResolvedValue(undefined), put: vi.fn(), where: vi.fn(() => ({ equals: vi.fn(() => ({ toArray: vi.fn().mockResolvedValue([]) })) })), toArray: vi.fn().mockResolvedValue([]) },
    transaction: vi.fn(),
  },
}));

// Mock the LLM client so no real API calls happen.
vi.mock("@modules/api-manager/llmClient", () => ({
  embed: vi.fn().mockResolvedValue(null),
  cosineSimilarity: vi.fn().mockReturnValue(0),
}));

import { memoryService } from "./memoryService";
import { cosmosDB } from "./db";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("MemoryService.recordFailure", () => {
  it("redacts password tokens from task signature and cause", async () => {
    await memoryService.recordFailure({
      domain: "example.com",
      taskSignature: "type password=hunter2 into login form",
      cause: "API_KEY=sk-abc123 caused 401 error",
    });

    const putArg = (cosmosDB.failureMemory.put as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    expect(putArg.taskSignature).not.toContain("hunter2");
    expect(putArg.cause).not.toContain("sk-abc123");
    // taskSignature passes through normalizeSignature (lowercases), cause does not
    expect(putArg.taskSignature.toLowerCase()).toContain("[redacted]");
    expect(putArg.cause.toLowerCase()).toContain("[redacted]");
  });

  it("stores domain and increments occurrences from zero", async () => {
    await memoryService.recordFailure({
      domain: "shop.example.com",
      taskSignature: "click the submit button",
      cause: "element not found",
    });

    const putArg = (cosmosDB.failureMemory.put as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    expect(putArg.domain).toBe("shop.example.com");
    expect(putArg.occurrences).toBe(1);
  });

  it("normalises the task signature to lowercase", async () => {
    await memoryService.recordFailure({
      domain: null,
      taskSignature: "Click The SUBMIT Button",
      cause: "timeout",
    });

    const putArg = (cosmosDB.failureMemory.put as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    expect(putArg.taskSignature).toBe("click the submit button");
  });
});
