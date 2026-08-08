import { CosmosSettings } from "@shared/types/settings";
import { memoryService } from "@modules/memory/memoryService";
import { createPlan } from "@modules/planner/plannerService";
import { executeStep, readPageSnapshot } from "@modules/action-executor/actionExecutor";
import { invokeSpecialistAgent } from "@modules/specialist-agent/specialistAgentService";
import { shouldUseVision } from "@modules/vision/visionService";
import { ActionResult, PlanStep } from "@shared/types/actions";
import { ChatStreamEvent, TimelineStep } from "@shared/types/chat";
import { apiManagerService } from "@modules/api-manager/apiManagerService";

const MAX_RETRIES_BEFORE_SPECIALIST = 2;

function domainOf(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

export interface OrchestratorControls {
  isCancelled: () => boolean;
  waitForConfirmation: (stepId: string) => Promise<boolean>;
  emit: (event: ChatStreamEvent) => void;
}

export async function runTask(
  goal: string,
  tabId: number,
  controls: OrchestratorControls,
): Promise<void> {
  const { emit, isCancelled, waitForConfirmation } = controls;
  const settings = await apiManagerService.getSettings();
  const sessionId = String(tabId);

  try {
    emit({ kind: "status", status: "planning" });
    await memoryService.updateSession(sessionId, {
      currentGoal: goal,
      executionState: "planning",
      activeTabIds: [tabId],
    });

    const snapshot = await readPageSnapshot(tabId);
    const domain = domainOf(snapshot.url);

    if (shouldUseVision(snapshot)) {
      emit({
        kind: "memory_insight",
        note: "Page structure looks sparse or DOM-inaccessible (canvas/shadow DOM) — vision fallback may be needed for some steps.",
      });
    }

    const websiteMemory = domain ? await memoryService.getWebsiteMemory(domain) : null;
    const matchingWorkflow = domain ? await memoryService.findWorkflow(goal, domain) : null;
    const relevantFailures = domain
      ? [await memoryService.findRecoveryStrategy(domain, goal)].filter(
          (f): f is NonNullable<typeof f> => f !== null,
        )
      : [];

    if (websiteMemory) {
      emit({ kind: "memory_insight", note: `Recognized ${domain} — using previously learned page structure.` });
    }
    if (matchingWorkflow) {
      emit({ kind: "memory_insight", note: `Found a similar workflow used before: "${matchingWorkflow.name}".` });
    }

    const plan = await createPlan(settings, {
      goal,
      snapshot,
      websiteMemory,
      matchingWorkflow,
      relevantFailures,
    });

    let timeline: TimelineStep[] = plan.steps.map((step) => ({ step, status: "pending" }));
    emit({ kind: "timeline", timeline });
    emit({ kind: "text_chunk", delta: plan.reasoning ? plan.reasoning + "\n\n" : "" });

    const failureCounts = new Map<string, ActionResult[]>();
    let overallSuccess = true;

    for (const step of plan.steps) {
      if (isCancelled()) {
        emit({ kind: "status", status: "cancelled" });
        await memoryService.updateSession(sessionId, { executionState: "idle" });
        return;
      }

      if (step.requiresConfirmation) {
        emit({ kind: "status", status: "awaiting_confirmation" });
        timeline = updateTimeline(timeline, step.id, "pending");
        emit({ kind: "timeline", timeline });
        const approved = await waitForConfirmation(step.id);
        if (!approved) {
          timeline = updateTimeline(timeline, step.id, "skipped");
          emit({ kind: "timeline", timeline });
          emit({ kind: "text_chunk", delta: `Skipped "${step.description}" — not confirmed.\n` });
          continue;
        }
      }

      emit({ kind: "status", status: "executing" });
      timeline = updateTimeline(timeline, step.id, "running");
      emit({ kind: "timeline", timeline });

      let result = await executeStep(step, tabId);
      let stepToRun: PlanStep = step;

      // Retry loop with escalation to the specialist agent on repeated failure.
      while (!result.ok) {
        const attempts = [...(failureCounts.get(step.id) ?? []), result];
        failureCounts.set(step.id, attempts);

        if (attempts.length < MAX_RETRIES_BEFORE_SPECIALIST) {
          result = await executeStep(stepToRun, tabId);
          continue;
        }

        emit({ kind: "status", status: "recovering" });
        emit({
          kind: "text_chunk",
          delta: `"${step.description}" failed ${attempts.length} times — bringing in a specialist to diagnose it.\n`,
        });

        const freshSnapshot = await readPageSnapshot(tabId);
        const outcome = await invokeSpecialistAgent(settings, {
          domain,
          goal,
          failingStep: step,
          priorAttempts: attempts,
          snapshot: freshSnapshot,
        });

        emit({ kind: "memory_insight", note: `Specialist diagnosis: ${outcome.recoveryStrategy}` });

        if (!outcome.revisedAction) {
          result = { stepId: step.id, ok: false, error: "No recovery action available.", durationMs: 0 };
          break;
        }

        stepToRun = { ...step, action: { ...step.action, ...outcome.revisedAction } };
        result = await executeStep(stepToRun, tabId);

        if (!result.ok) {
          // Specialist's fix didn't work either — stop retrying this step.
          break;
        }
      }

      timeline = updateTimeline(timeline, step.id, result.ok ? "done" : "failed", result);
      emit({ kind: "timeline", timeline });

      if (!result.ok) {
        overallSuccess = false;
        emit({ kind: "text_chunk", delta: `Step failed: ${step.description} — ${result.error}\n` });
        await memoryService.recordFailure({
          domain,
          taskSignature: step.description,
          cause: result.error ?? "unknown error",
        });
        break; // stop the plan; don't cascade failures downstream
      }

      emit({ kind: "text_chunk", delta: `Done: ${step.description}\n` });
    }

    if (domain) {
      await memoryService.upsertWebsiteMemory(domain, {});
    }
    if (matchingWorkflow) {
      await memoryService.recordWorkflowOutcome(matchingWorkflow.id, overallSuccess);
    } else if (overallSuccess && domain) {
      await memoryService.saveWorkflow({
        name: goal,
        domain,
        steps: plan.steps.map((s) => ({
          order: s.order,
          description: s.description,
          actionType: s.action.type,
        })),
        timesUsed: 1,
        successCount: 1,
        failureCount: 0,
      });
    }

    await memoryService.updateSession(sessionId, {
      executionState: overallSuccess ? "done" : "error",
    });
    emit({ kind: "status", status: overallSuccess ? "done" : "error" });
    emit({ kind: "done" });
  } catch (error) {
    emit({ kind: "error", message: error instanceof Error ? error.message : String(error) });
    await memoryService.updateSession(sessionId, { executionState: "error" });
  }
}

function updateTimeline(
  timeline: TimelineStep[],
  stepId: string,
  status: TimelineStep["status"],
  result?: ActionResult,
): TimelineStep[] {
  return timeline.map((t) => (t.step.id === stepId ? { ...t, status, result: result ?? t.result } : t));
}

// Re-exported so the popup's type imports resolve without pulling in
// background-only chrome APIs at the type level.
export type { CosmosSettings };
