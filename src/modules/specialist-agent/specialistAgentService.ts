import { CosmosSettings } from "@shared/types/settings";
import { chatComplete } from "@modules/api-manager/llmClient";
import { memoryService } from "@modules/memory/memoryService";
import { ActionResult, PlanStep } from "@shared/types/actions";
import { PageSnapshot } from "@shared/types/dom";

export interface SpecialistInvocation {
  domain: string | null;
  goal: string;
  failingStep: PlanStep;
  priorAttempts: ActionResult[]; // consecutive failures for this step
  snapshot: PageSnapshot;
}

export interface SpecialistOutcome {
  recoveryStrategy: string;
  confidence: number;
  revisedAction: PlanStep["action"] | null;
  generalizable: boolean; // whether this is worth saving as a reusable Workflow, not just a Failure record
}

const SPECIALIST_SYSTEM_PROMPT = `You are a temporary specialist agent within Cosmos, spun up only because
normal planning has failed repeatedly on one specific step. Your job is narrow: diagnose why this
one step keeps failing, and produce a concrete recovery strategy.

You are not a persistent agent — you exist for this single diagnosis only. Do not reference future
turns or ongoing state. Respond ONLY with JSON:
{
  "recoveryStrategy": string,   // concrete, actionable description of what to do differently
  "confidence": number,          // 0-1
  "revisedAction": { "type": string, "targetId": string|null, "value": string|null, "tabId": number|null } | null,
  "generalizable": boolean       // true if this recovery would likely help on other tasks/sites, not just this one
}`;

/**
 * Invoked by the orchestrator when a step has failed the same way more
 * than once. This function has no persistent identity — it's a single
 * LLM call plus a memory write. Nothing about "the specialist" survives
 * past this function returning; only the resulting knowledge does.
 */
export async function invokeSpecialistAgent(
  settings: CosmosSettings,
  invocation: SpecialistInvocation,
): Promise<SpecialistOutcome> {
  const providerId = settings.providers.omniroute.apiKey
    ? "omniroute"
    : settings.providers.openrouter.apiKey
      ? "openrouter"
      : "groq";

  const prompt = [
    `Goal: ${invocation.goal}`,
    `Failing step: ${invocation.failingStep.description}`,
    `Attempted action: ${JSON.stringify(invocation.failingStep.action)}`,
    `Failure history (most recent last): ${JSON.stringify(
      invocation.priorAttempts.map((a) => ({ error: a.error, durationMs: a.durationMs })),
    )}`,
    `Current page elements: ${JSON.stringify(
      invocation.snapshot.interactiveElements.slice(0, 60).map((e) => ({
        cosmosId: e.cosmosId,
        role: e.role,
        text: e.text,
      })),
    )}`,
  ].join("\n\n");

  const raw = await chatComplete(settings, {
    providerId,
    model: settings.defaultModel ?? "auto",
    jsonMode: true,
    temperature: 0.4,
    messages: [
      { role: "system", content: SPECIALIST_SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
  });

  let outcome: SpecialistOutcome;
  try {
    const parsed = JSON.parse(raw);
    outcome = {
      recoveryStrategy: parsed.recoveryStrategy ?? "No strategy produced.",
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.3,
      revisedAction: parsed.revisedAction ?? null,
      generalizable: Boolean(parsed.generalizable),
    };
  } catch {
    outcome = {
      recoveryStrategy: raw.slice(0, 500),
      confidence: 0.2,
      revisedAction: null,
      generalizable: false,
    };
  }

  // Persist only the knowledge — never the agent itself.
  await memoryService.recordFailure({
    domain: invocation.domain,
    taskSignature: invocation.failingStep.description,
    cause: invocation.priorAttempts[invocation.priorAttempts.length - 1]?.error ?? "unknown",
    recoveryStrategy: outcome.recoveryStrategy,
    confidence: outcome.confidence,
  });

  if (outcome.generalizable && outcome.confidence >= 0.5) {
    await memoryService.saveWorkflow({
      name: invocation.failingStep.description,
      domain: invocation.domain,
      steps: [
        {
          order: 0,
          description: outcome.recoveryStrategy,
          actionType: outcome.revisedAction?.type ?? invocation.failingStep.action.type,
        },
      ],
      timesUsed: 0,
      successCount: 0,
      failureCount: 0,
    });
  }

  return outcome;
}
