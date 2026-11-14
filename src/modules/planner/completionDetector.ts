import { CosmosSettings } from "@shared/types/settings";
import { PageSnapshot } from "@shared/types/dom";
import { chatComplete } from "@modules/api-manager/llmClient";

function pickProvider(settings: CosmosSettings) {
  return settings.providers.omniroute.apiKey
    ? "omniroute"
    : settings.providers.openrouter.apiKey
      ? "openrouter"
      : "groq";
}

/**
 * Lightweight check after each step: did the goal get achieved?
 * Uses only page title + 300 chars of text — intentionally cheap.
 * Returns null on any error so the orchestrator can continue safely.
 */
export async function checkGoalComplete(
  settings: CosmosSettings,
  goal: string,
  snapshot: PageSnapshot,
  stepsCompleted: number,
  totalSteps: number,
): Promise<{ done: boolean; reason: string } | null> {
  if (stepsCompleted < 1) return null; // too early to judge

  try {
    const raw = await chatComplete(settings, {
      providerId: pickProvider(settings),
      model: settings.defaultModel ?? "auto",
      jsonMode: true,
      temperature: 0,
      messages: [
        {
          role: "system",
          content:
            'You are a task completion checker. Reply ONLY as JSON: {"done": boolean, "reason": string}. ' +
            "done=true only if the goal is FULLY achieved — not just partially.",
        },
        {
          role: "user",
          content:
            `Goal: ${goal}\n` +
            `Page: ${snapshot.title} — ${snapshot.url}\n` +
            `Page text: ${snapshot.mainText.slice(0, 300)}\n` +
            `Steps completed: ${stepsCompleted} of ${totalSteps}`,
        },
      ],
    });
    const parsed = JSON.parse(raw) as { done: boolean; reason: string };
    return { done: Boolean(parsed.done), reason: parsed.reason ?? "" };
  } catch {
    return null;
  }
}

/**
 * Post-run Task Judge: compares the original goal against a fresh snapshot
 * after all steps finish. Surfaces verdict as a memory insight and returns
 * a human-readable verdict string.
 */
export async function judgeTaskOutcome(
  settings: CosmosSettings,
  goal: string,
  snapshot: PageSnapshot,
): Promise<string | null> {
  try {
    const raw = await chatComplete(settings, {
      providerId: pickProvider(settings),
      model: settings.defaultModel ?? "auto",
      jsonMode: true,
      temperature: 0,
      messages: [
        {
          role: "system",
          content:
            "You are a task outcome judge. Given a goal and the final page state, determine if the goal was achieved. " +
            'Reply ONLY as JSON: {"success": boolean, "verdict": string}. verdict is 1–2 sentences.',
        },
        {
          role: "user",
          content:
            `Goal: ${goal}\n` +
            `Final page: ${snapshot.title} — ${snapshot.url}\n` +
            `Page text: ${snapshot.mainText.slice(0, 500)}`,
        },
      ],
    });
    const parsed = JSON.parse(raw) as { success: boolean; verdict: string };
    return parsed.verdict ?? null;
  } catch {
    return null;
  }
}
