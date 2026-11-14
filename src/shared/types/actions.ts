import { z } from "zod";

export const ActionTypeSchema = z.enum([
  "click",
  "type",
  "scroll",
  "select_option",
  "read_dom",
  "switch_tab",
  "open_tab",
  "close_tab",
  "navigate",
  "upload_file",
  "wait_for_download",
  "ask_user_confirmation",
  // Data extraction: asks the LLM to pull structured JSON from the page.
  // action.value = natural-language description of what to extract.
  "extract",
  // Guard condition: verifies a natural-language assertion is true before continuing.
  // action.value = the condition to check. Fails the step if false.
  "assert",
]);
export type ActionType = z.infer<typeof ActionTypeSchema>;

export const BrowserActionSchema = z.object({
  type: ActionTypeSchema,
  // cosmosId of the target element, when applicable (click/type/select/upload)
  targetId: z.string().optional(),
  value: z.string().optional(), // text to type, option to select, url to navigate to
  tabId: z.number().optional(),
  timeoutMs: z.number().optional(),
});
export type BrowserAction = z.infer<typeof BrowserActionSchema>;

export const PlanStepSchema = z.object({
  id: z.string(),
  order: z.number(),
  description: z.string(),
  action: BrowserActionSchema,
  requiresConfirmation: z.boolean().default(false),
});
export type PlanStep = z.infer<typeof PlanStepSchema>;

export const PlanSchema = z.object({
  goal: z.string(),
  steps: z.array(PlanStepSchema).min(1),
  reasoning: z.string().optional(),
});
export type Plan = z.infer<typeof PlanSchema>;

export interface ActionResult {
  stepId: string;
  ok: boolean;
  output?: unknown;
  error?: string;
  durationMs: number;
}
