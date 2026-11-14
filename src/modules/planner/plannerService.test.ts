import { describe, it, expect } from "vitest";
import { PlanSchema } from "@shared/types/actions";

describe("PlanSchema validation", () => {
  const validPlan = {
    goal: "Search for cats",
    reasoning: "User wants to find cat images.",
    steps: [
      {
        id: "step-1",
        order: 1,
        description: "Type 'cats' in the search box",
        action: { type: "type", targetId: "cosmos-42", value: "cats" },
        requiresConfirmation: false,
      },
    ],
  };

  it("accepts a well-formed plan", () => {
    expect(PlanSchema.safeParse(validPlan).success).toBe(true);
  });

  it("rejects a plan with zero steps", () => {
    expect(PlanSchema.safeParse({ ...validPlan, steps: [] }).success).toBe(false);
  });

  it("rejects an unknown action type", () => {
    const badStep = { ...validPlan.steps[0], action: { type: "teleport" } };
    expect(PlanSchema.safeParse({ ...validPlan, steps: [badStep] }).success).toBe(false);
  });

  it("accepts the new extract action type", () => {
    const extractStep = {
      ...validPlan.steps[0],
      action: { type: "extract", value: "product names and prices" },
    };
    expect(PlanSchema.safeParse({ ...validPlan, steps: [extractStep] }).success).toBe(true);
  });

  it("accepts the new assert action type", () => {
    const assertStep = {
      ...validPlan.steps[0],
      action: { type: "assert", value: "I am logged in" },
    };
    expect(PlanSchema.safeParse({ ...validPlan, steps: [assertStep] }).success).toBe(true);
  });

  it("requiresConfirmation defaults to false when omitted", () => {
    const stepWithoutConfirmation = {
      id: "step-2",
      order: 2,
      description: "Scroll down",
      action: { type: "scroll" },
    };
    const result = PlanSchema.safeParse({ ...validPlan, steps: [stepWithoutConfirmation] });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.steps[0]!.requiresConfirmation).toBe(false);
    }
  });
});
