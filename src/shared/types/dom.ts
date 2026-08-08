/**
 * DOM Reader output contract.
 *
 * Every interactive element gets a `cosmosId` — injected as a
 * `data-cosmos-id` attribute by the DOM Reader — so the Action Executor can
 * target it reliably without re-deriving a CSS selector (which breaks
 * easily on dynamic class names).
 */

export type ElementRole =
  | "button"
  | "link"
  | "input"
  | "textarea"
  | "select"
  | "checkbox"
  | "radio"
  | "form"
  | "table"
  | "heading"
  | "other";

export interface PageElement {
  cosmosId: string;
  role: ElementRole;
  tag: string;
  text: string | null;
  attributes: {
    name?: string;
    type?: string;
    placeholder?: string;
    href?: string;
    value?: string;
    ariaLabel?: string;
    required?: boolean;
    disabled?: boolean;
  };
  boundingBox: { x: number; y: number; width: number; height: number } | null;
  inViewport: boolean;
}

export interface PageForm {
  cosmosId: string;
  name: string | null;
  action: string | null;
  fields: PageElement[];
}

export interface PageTable {
  cosmosId: string;
  headers: string[];
  rowCount: number;
  sampleRows: string[][];
}

export interface HeadingNode {
  level: number;
  text: string;
  cosmosId: string;
}

export interface PageSnapshot {
  url: string;
  title: string;
  capturedAt: number;
  interactiveElements: PageElement[];
  forms: PageForm[];
  tables: PageTable[];
  headings: HeadingNode[];
  mainText: string; // truncated visible text, for context
  hasCanvas: boolean;
  hasShadowDom: boolean;
}
