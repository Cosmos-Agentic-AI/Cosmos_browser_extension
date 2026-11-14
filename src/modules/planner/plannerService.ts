import { CosmosSettings } from "@shared/types/settings";
import { chatComplete } from "@modules/api-manager/llmClient";
import { Plan, PlanSchema } from "@shared/types/actions";
import { PageSnapshot } from "@shared/types/dom";
import { FailureMemory, WebsiteMemory, WorkflowMemory } from "@shared/types/memory";

export interface PlannerContext {
  goal: string;
  snapshot: PageSnapshot;
  websiteMemory: WebsiteMemory | null;
  matchingWorkflow: WorkflowMemory | null;
  relevantFailures: FailureMemory[];
}

const SYSTEM_PROMPT = `You are the Planner module of Cosmos, an autonomous browser assistant.
Convert the user's goal into a short, executable plan against the current page.

Rules:
- Only reference elements that exist in the provided interactiveElements list, using their cosmosId as targetId.
- Prefer reusing a known workflow's step shape if one is provided.
- If a similar failure and recovery strategy is provided, incorporate the recovery into the plan instead of repeating the same mistake.
- Mark requiresConfirmation: true for irreversible or sensitive actions (submitting forms, purchases, deleting data, sending messages).
- Keep plans short — 3 to 8 steps. If the goal can't be completed on this page, include a "navigate" or "open_tab" step first.
- Respond ONLY with JSON matching this shape, no markdown, no commentary:
{
  "goal": string,
  "reasoning": string,
  "steps": [
    {
      "id": string,
      "order": number,
      "description": string,
      "action": {
        "type": "click"|"type"|"scroll"|"select_option"|"read_dom"|"switch_tab"|"open_tab"|"close_tab"|"navigate"|"upload_file"|"wait_for_download"|"ask_user_confirmation"|"extract"|"assert",
        // extract: value = natural-language description of data to pull (returns JSON in chat)
        // assert: value = condition to verify before proceeding (fails step if false)
        "targetId": string (optional),
        "value": string (optional),
        "tabId": number (optional)
      },
      "requiresConfirmation": boolean
    }
  ]
}`;

function buildUserPrompt(ctx: PlannerContext): string {
  const parts: string[] = [];
  parts.push(`Goal: ${ctx.goal}`);
  parts.push(`Current page: ${ctx.snapshot.title} (${ctx.snapshot.url})`);
  parts.push(
    `Interactive elements (cosmosId: role "text"): ${JSON.stringify(
      ctx.snapshot.interactiveElements.slice(0, 80).map((e) => ({
        cosmosId: e.cosmosId,
        role: e.role,
        text: e.text,
        name: e.attributes.name,
        placeholder: e.attributes.placeholder,
        href: e.attributes.href,
      })),
    )}`,
  );

  if (ctx.snapshot.forms.length > 0) {
    parts.push(`Forms on page: ${ctx.snapshot.forms.length}`);
  }

  if (ctx.websiteMemory?.structureNotes) {
    parts.push(`Known notes about this site: ${ctx.websiteMemory.structureNotes}`);
  }
  if (ctx.websiteMemory?.learnedSelectors.length) {
    parts.push(
      `Previously learned selectors: ${JSON.stringify(ctx.websiteMemory.learnedSelectors)}`,
    );
  }

  if (ctx.matchingWorkflow) {
    parts.push(
      `A similar workflow has succeeded before ("${ctx.matchingWorkflow.name}"), steps: ${JSON.stringify(
        ctx.matchingWorkflow.steps,
      )}`,
    );
  }

  if (ctx.relevantFailures.length > 0) {
    parts.push(
      `Past failures to avoid repeating: ${JSON.stringify(
        ctx.relevantFailures.map((f) => ({ cause: f.cause, recoveryStrategy: f.recoveryStrategy })),
      )}`,
    );
  }

  return parts.join("\n\n");
}

export async function createPlan(
  settings: CosmosSettings,
  ctx: PlannerContext,
): Promise<Plan> {
  const providerId = settings.providers.omniroute.apiKey
    ? "omniroute"
    : settings.providers.openrouter.apiKey
      ? "openrouter"
      : "groq";
  const model = settings.defaultModel ?? "auto";

  const raw = await chatComplete(settings, {
    providerId,
    model,
    jsonMode: true,
    temperature: 0.2,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(ctx) },
    ],
  });

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    throw new Error(`Planner: model did not return valid JSON. Raw output: ${raw.slice(0, 300)}`);
  }

  const result = PlanSchema.safeParse(parsedJson);
  if (!result.success) {
    throw new Error(`Planner: plan failed validation — ${result.error.message}`);
  }
  return result.data;
}
