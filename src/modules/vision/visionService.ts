import { PageSnapshot } from "@shared/types/dom";
import { CosmosSettings } from "@shared/types/settings";
import { chatComplete } from "@modules/api-manager/llmClient";

/**
 * Vision is a fallback, not the default path — DOM reading is cheaper and
 * more reliable when it works. This heuristic decides when it's worth the
 * extra round trip.
 */
export function shouldUseVision(snapshot: PageSnapshot): boolean {
  if (snapshot.hasShadowDom) return true;
  if (snapshot.hasCanvas) return true;
  if (snapshot.interactiveElements.length === 0 && snapshot.mainText.length < 200) return true;
  return false;
}

export async function captureVisibleTab(windowId?: number): Promise<string> {
  // Returns a data: URL (PNG). Requires the tab to be the active tab in its window.
  return chrome.tabs.captureVisibleTab(windowId ?? chrome.windows.WINDOW_ID_CURRENT, {
    format: "png",
  });
}

export interface VisionAnalysisResult {
  description: string;
  suggestedTargets: string[]; // free-text hints, e.g. "blue 'Submit' button, bottom right"
}

/**
 * Sends a screenshot to a vision-capable model and asks it to describe
 * what's on screen and where the elements relevant to the goal are.
 * This is intentionally descriptive rather than coordinate-precise —
 * translating a description into an actionable target is the Planner's job,
 * cross-referenced against whatever DOM elements *were* extracted.
 */
export async function analyzeScreenshot(
  settings: CosmosSettings,
  screenshotDataUrl: string,
  goal: string,
  providerId: "openrouter" | "omniroute",
  visionModel: string,
): Promise<VisionAnalysisResult> {
  const raw = await chatComplete(settings, {
    providerId,
    model: visionModel,
    jsonMode: true,
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content:
          "You are the vision layer of a browser automation agent. Describe the screenshot " +
          'plainly and list elements relevant to the user\'s goal. Respond ONLY as JSON: ' +
          '{"description": string, "suggestedTargets": string[]}. No markdown, no commentary.',
      },
      {
        role: "user",
        content: [
          { type: "text", text: `Goal: ${goal}` },
          { type: "image_url", image_url: { url: screenshotDataUrl } },
        ],
      },
    ],
  });

  try {
    const parsed = JSON.parse(raw) as VisionAnalysisResult;
    return {
      description: parsed.description ?? "",
      suggestedTargets: Array.isArray(parsed.suggestedTargets) ? parsed.suggestedTargets : [],
    };
  } catch {
    return { description: raw, suggestedTargets: [] };
  }
}
