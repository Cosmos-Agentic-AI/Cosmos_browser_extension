import { HeadingNode, PageElement, PageForm, PageSnapshot, PageTable, ElementRole } from "@shared/types/dom";

const COSMOS_ID_ATTR = "data-cosmos-id";
let counter = 0;

function assignCosmosId(el: Element): string {
  const existing = el.getAttribute(COSMOS_ID_ATTR);
  if (existing) return existing;
  const id = `c${++counter}`;
  el.setAttribute(COSMOS_ID_ATTR, id);
  return id;
}

function roleFor(el: Element): ElementRole {
  const tag = el.tagName.toLowerCase();
  if (tag === "a") return "link";
  if (tag === "button") return "button";
  if (tag === "textarea") return "textarea";
  if (tag === "select") return "select";
  if (tag === "form") return "form";
  if (tag === "table") return "table";
  if (/^h[1-6]$/.test(tag)) return "heading";
  if (tag === "input") {
    const type = (el as HTMLInputElement).type;
    if (type === "checkbox") return "checkbox";
    if (type === "radio") return "radio";
    return "input";
  }
  const role = el.getAttribute("role");
  if (role === "button") return "button";
  if (role === "link") return "link";
  return "other";
}

function isVisible(el: Element): boolean {
  const style = window.getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") {
    return false;
  }
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function boundingBoxFor(el: Element) {
  const rect = el.getBoundingClientRect();
  return { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) };
}

function inViewport(el: Element): boolean {
  const rect = el.getBoundingClientRect();
  return rect.top < window.innerHeight && rect.bottom > 0 && rect.left < window.innerWidth && rect.right > 0;
}

function describeElement(el: Element): PageElement {
  const id = assignCosmosId(el);
  const text = (el.textContent ?? "").trim().slice(0, 200) || null;

  return {
    cosmosId: id,
    role: roleFor(el),
    tag: el.tagName.toLowerCase(),
    text,
    attributes: {
      name: el.getAttribute("name") ?? undefined,
      type: el.getAttribute("type") ?? undefined,
      placeholder: el.getAttribute("placeholder") ?? undefined,
      href: el.getAttribute("href") ?? undefined,
      value: (el as HTMLInputElement).value ?? undefined,
      ariaLabel: el.getAttribute("aria-label") ?? undefined,
      required: el.hasAttribute("required") || undefined,
      disabled: el.hasAttribute("disabled") || undefined,
    },
    boundingBox: isVisible(el) ? boundingBoxFor(el) : null,
    inViewport: isVisible(el) && inViewport(el),
  };
}

const INTERACTIVE_SELECTOR =
  'a[href], button, input, textarea, select, [role="button"], [role="link"], [contenteditable="true"]';

function extractInteractiveElements(root: ParentNode, limit = 300): PageElement[] {
  const nodes = Array.from(root.querySelectorAll(INTERACTIVE_SELECTOR)).filter(isVisible);
  return nodes.slice(0, limit).map(describeElement);
}

function extractForms(root: ParentNode): PageForm[] {
  return Array.from(root.querySelectorAll("form")).map((form) => ({
    cosmosId: assignCosmosId(form),
    name: form.getAttribute("name"),
    action: form.getAttribute("action"),
    fields: extractInteractiveElements(form, 100),
  }));
}

function extractTables(root: ParentNode): PageTable[] {
  return Array.from(root.querySelectorAll("table"))
    .slice(0, 20)
    .map((table) => {
      const headerCells = Array.from(table.querySelectorAll("thead th, tr:first-child th"));
      const headers = headerCells.map((c) => (c.textContent ?? "").trim());
      const rows = Array.from(table.querySelectorAll("tbody tr, tr")).slice(0, 5);
      const sampleRows = rows.map((r) =>
        Array.from(r.querySelectorAll("td")).map((c) => (c.textContent ?? "").trim()),
      );
      return {
        cosmosId: assignCosmosId(table),
        headers,
        rowCount: table.querySelectorAll("tbody tr, tr").length,
        sampleRows,
      };
    });
}

function extractHeadings(root: ParentNode): HeadingNode[] {
  return Array.from(root.querySelectorAll("h1, h2, h3, h4, h5, h6"))
    .filter(isVisible)
    .slice(0, 50)
    .map((h) => ({
      level: Number(h.tagName[1]),
      text: (h.textContent ?? "").trim(),
      cosmosId: assignCosmosId(h),
    }));
}

function hasShadowDomAnywhere(): boolean {
  const all = document.querySelectorAll("*");
  for (let i = 0; i < all.length && i < 2000; i++) {
    if (all[i]!.shadowRoot) return true;
  }
  return false;
}

/** Entry point called by the content script's message listener. */
export function readPage(): PageSnapshot {
  return {
    url: window.location.href,
    title: document.title,
    capturedAt: Date.now(),
    interactiveElements: extractInteractiveElements(document),
    forms: extractForms(document),
    tables: extractTables(document),
    headings: extractHeadings(document),
    mainText: (document.body?.innerText ?? "").trim().slice(0, 4000),
    hasCanvas: document.querySelectorAll("canvas").length > 0,
    hasShadowDom: hasShadowDomAnywhere(),
  };
}

export function getElementByCosmosId(id: string): Element | null {
  return document.querySelector(`[${COSMOS_ID_ATTR}="${id}"]`);
}
