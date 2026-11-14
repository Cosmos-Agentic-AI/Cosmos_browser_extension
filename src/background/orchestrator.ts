import { CosmosSettings } from "@shared/types/settings";
import { memoryService } from "@modules/memory/memoryService";
import { createPlan, CompletedStep } from "@modules/planner/plannerService";
import { checkGoalComplete, judgeTaskOutcome } from "@modules/planner/completionDetector";
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
    const taskRunId = await memoryService.startTaskRun(goal, domain);

    // Enforce domain blocklist before doing any work.
    if (domain && settings.blockedDomains.length > 0) {
      const blocked = settings.blockedDomains.some(
        (d) => domain === d || domain.endsWith(`.${d}`),
      );
      if (blocked) {
        emit({
          kind: "error",
          message: `Cosmos is configured not to act on ${domain}. Remove it from Blocked Domains in Settings to proceed.`,
        });
        await memoryService.updateSession(sessionId, { executionState: "idle" });
        return;
      }
    }

    if (shouldUseVision(snapshot)) {
      emit({
        kind: "memory_insight",
        note: "Page structure looks sparse or DOM-inaccessible (canvas/shadow DOM) — vision fallback may be needed for some steps.",
      });
    }

    const websiteMemory = domain ? await memoryService.getWebsiteMemory(domain) : null;
    const matchingWorkflow = domain ? await memoryService.findWorkflow(goal, domain, settings) : null;
    const relevantFailures = domain
      ? [await memoryService.findRecoveryStrategy(domain, goal, settings)].filter(
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
      variables: {},
    });

    let timeline: TimelineStep[] = plan.steps.map((step) => ({ step, status: "pending" }));
    emit({ kind: "timeline", timeline });
    emit({ kind: "text_chunk", delta: plan.reasoning ? plan.reasoning + "\n\n" : "" });

    const failureCounts = new Map<string, ActionResult[]>();
    const completedSteps: CompletedStep[] = [];
    const extractedVariables: Record<string, unknown> = {};
    let overallSuccess = true;
    let stepIndex = 0;
    const maxSteps = settings.maxStepsPerTask ?? 15;

    for (const step of plan.steps) {
      if (isCancelled()) {
        emit({ kind: "status", status: "cancelled" });
        await memoryService.updateSession(sessionId, { executionState: "idle" });
        return;
      }

      if (stepIndex >= maxSteps) {
        emit({
          kind: "text_chunk",
          delta: `Step budget of ${maxSteps} reached — stopping to avoid runaway execution.\n`,
        });
        overallSuccess = false;
        break;
      }
      stepIndex++;

      if (step.requiresConfirmation) {
        emit({ kind: "status", status: "awaiting_confirmation" });
        timeline = updateTimeline(timeline, step.id, "pending");
        emit({ kind: "timeline", timeline });
        const approved = await waitForConfirmation(step.id);
        if (!approved) {
          timeline = updateTimeline(timeline, step.id, "skipped");
          emit({ kind: "timeline", timeline });
          emit({ kind: "text_chunk", delta: `Skipped "${step.description}" — not confirmed.\n` });
          completedSteps.push({ order: step.order, description: step.description, status: "skipped" });
          continue;
        }
      }

      emit({ kind: "status", status: "executing" });
      timeline = updateTimeline(timeline, step.id, "running");
      emit({ kind: "timeline", timeline });

      let result = await executeStep(step, tabId, settings);
      let stepToRun: PlanStep = step;

      // Retry loop with escalation to the specialist agent on repeated failure.
      while (!result.ok) {
        const attempts = [...(failureCounts.get(step.id) ?? []), result];
        failureCounts.set(step.id, attempts);

        if (attempts.length < MAX_RETRIES_BEFORE_SPECIALIST) {
          result = await executeStep(stepToRun, tabId, settings);
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
        result = await executeStep(stepToRun, tabId, settings);

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
        completedSteps.push({ order: step.order, description: step.description, status: "failed" });
        // Capture a screenshot so the user can see the failure state.
        try {
          const dataUrl = await chrome.tabs.captureVisibleTab({ format: "jpeg", quality: 70 });
          emit({ kind: "screenshot_capture", stepId: step.id, dataUrl });
        } catch { /* non-fatal — screenshot unavailable on restricted pages */ }
        await memoryService.recordFailure({
          domain,
          taskSignature: step.description,
          cause: result.error ?? "unknown error",
        }, settings);
        break; // stop the plan; don't cascade failures downstream
      }

      emit({ kind: "text_chunk", delta: `Done: ${step.description}\n` });
      completedSteps.push({ order: step.order, description: step.description, status: "done" });

      // Store extract results as named variables for downstream steps.
      if (step.action.type === "extract" && result.output != null) {
        const varKey = step.description.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 30);
        extractedVariables[varKey] = result.output;
        await memoryService.updateSession(sessionId, { variables: { ...extractedVariables } });
        emit({ kind: "memory_insight", note: `Extracted "${varKey}": ${JSON.stringify(result.output).slice(0, 120)}` });
      }

      // Early completion check — cheap LLM call to detect if goal is already achieved.
      const freshSnap = await readPageSnapshot(tabId, false);
      const completion = await checkGoalComplete(settings, goal, freshSnap, completedSteps.length, plan.steps.length);
      if (completion?.done) {
        emit({ kind: "memory_insight", note: `Goal achieved early: ${completion.reason}` });
        overallSuccess = true;
        break;
      }
    }

    // Post-run task judge: compare goal vs final page state.
    const finalSnapshot = await readPageSnapshot(tabId, false);
    const verdict = await judgeTaskOutcome(settings, goal, finalSnapshot);
    if (verdict) {
      emit({ kind: "memory_insight", note: `Task judge: ${verdict}` });
    }

    await memoryService.finishTaskRun(taskRunId, overallSuccess, completedSteps.length, verdict ?? null);

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
      }, settings);
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
