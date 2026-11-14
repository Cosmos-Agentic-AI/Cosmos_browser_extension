import { describe, it, expect } from "vitest";
import { shouldUseVision } from "./visionService";
import type { PageElement, PageSnapshot } from "@shared/types/dom";

const baseElement: PageElement = {
  cosmosId: "1",
  role: "button",
  tag: "button",
  text: "Submit",
  attributes: {},
  boundingBox: { x: 0, y: 0, width: 80, height: 32 },
  inViewport: true,
};

function makeSnapshot(overrides: Partial<PageSnapshot>): PageSnapshot {
  return {
    url: "https://example.com",
    title: "Test",
    capturedAt: Date.now(),
    interactiveElements: [],
    forms: [],
    tables: [],
    headings: [],
    mainText: "",
    hasCanvas: false,
    hasShadowDom: false,
    ...overrides,
  };
}

describe("shouldUseVision", () => {
  it("returns false for a normal DOM-readable page", () => {
    const snap = makeSnapshot({
      interactiveElements: [baseElement],
      mainText: "Welcome to the page with plenty of text content to read.",
    });
    expect(shouldUseVision(snap)).toBe(false);
  });

  it("returns true when hasShadowDom is set", () => {
    expect(shouldUseVision(makeSnapshot({ hasShadowDom: true }))).toBe(true);
  });

  it("returns true when hasCanvas is set", () => {
    expect(shouldUseVision(makeSnapshot({ hasCanvas: true }))).toBe(true);
  });

  it("returns true for empty page with no interactive elements and sparse text", () => {
    expect(shouldUseVision(makeSnapshot({ mainText: "Hi" }))).toBe(true);
  });

  it("returns false when text is sparse but interactive elements exist", () => {
    const snap = makeSnapshot({
      interactiveElements: [{ ...baseElement, role: "link" }],
      mainText: "Short",
    });
    expect(shouldUseVision(snap)).toBe(false);
  });
});
