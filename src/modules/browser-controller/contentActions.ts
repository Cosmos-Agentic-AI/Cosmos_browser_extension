import { getElementByCosmosId } from "@modules/dom-reader/domReader";
import { BrowserAction } from "@shared/types/actions";

function requireElement(targetId: string | undefined): Element {
  if (!targetId) throw new Error("Action requires a targetId but none was provided.");
  const el = getElementByCosmosId(targetId);
  if (!el) throw new Error(`No element found for cosmosId "${targetId}". Page may have changed — re-read the DOM.`);
  // Stale-element preflight: verify the element is still attached and has layout.
  if (!document.contains(el)) {
    throw new Error(`Element "${targetId}" is detached from the DOM (StaleElement). Re-read the DOM.`);
  }
  return el;
}

function dispatchInputEvents(el: HTMLElement) {
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

function click(targetId: string | undefined) {
  const el = requireElement(targetId) as HTMLElement;
  el.scrollIntoView({ block: "center", behavior: "instant" as ScrollBehavior });
  el.click();
}

function type(targetId: string | undefined, value: string | undefined) {
  const el = requireElement(targetId);
  if (!(el instanceof HTMLInputElement) && !(el instanceof HTMLTextAreaElement) && !(el as HTMLElement).isContentEditable) {
    throw new Error("Target element does not accept text input.");
  }
  // Scroll into view before typing (improves reliability for off-screen inputs).
  (el as HTMLElement).scrollIntoView({ block: "center", behavior: "instant" as ScrollBehavior });
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    // Temporarily blur password/sensitive fields to avoid exposing values in screenshots.
    const isSensitive = el instanceof HTMLInputElement && (el.type === "password" || el.autocomplete?.includes("cc-"));
    if (isSensitive) (el.style as CSSStyleDeclaration & { webkitTextSecurity: string }).webkitTextSecurity = "disc";
    el.focus();
    el.value = value ?? "";
    dispatchInputEvents(el);
    if (isSensitive) (el.style as CSSStyleDeclaration & { webkitTextSecurity: string }).webkitTextSecurity = "";
  } else {
    (el as HTMLElement).focus();
    (el as HTMLElement).innerText = value ?? "";
    dispatchInputEvents(el as HTMLElement);
  }
}

function selectOption(targetId: string | undefined, value: string | undefined) {
  const el = requireElement(targetId);
  if (!(el instanceof HTMLSelectElement)) throw new Error("Target element is not a <select>.");
  el.value = value ?? "";
  dispatchInputEvents(el);
}

function scroll(targetId: string | undefined, value: string | undefined) {
  if (targetId) {
    requireElement(targetId).scrollIntoView({ block: "center", behavior: "smooth" });
    return;
  }
  const amount = Number(value ?? "600");
  window.scrollBy({ top: amount, behavior: "smooth" });
}

/**
 * File upload from an extension content script can't fabricate a real
 * File from disk (browser security) — it can only drive an existing
 * <input type="file"> if the user has already selected a file via the
 * native picker, or set a File constructed from data the user provided in
 * the same session. This implementation supports the latter: `value` is a
 * data: URL and `attributes` on the action can carry a filename.
 */
async function uploadFile(targetId: string | undefined, dataUrl: string | undefined) {
  const el = requireElement(targetId);
  if (!(el instanceof HTMLInputElement) || el.type !== "file") {
    throw new Error("Target element is not a file input.");
  }
  if (!dataUrl) throw new Error("upload_file requires a data: URL value.");

  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const file = new File([blob], "cosmos-upload", { type: blob.type });
  const dt = new DataTransfer();
  dt.items.add(file);
  el.files = dt.files;
  dispatchInputEvents(el);
}

function pressKey(targetId: string | undefined, key: string | undefined) {
  const target = targetId ? (requireElement(targetId) as HTMLElement) : (document.activeElement as HTMLElement | null) ?? document.body;
  const k = key ?? "Enter";
  const init: KeyboardEventInit = { key: k, bubbles: true, cancelable: true };
  target.dispatchEvent(new KeyboardEvent("keydown", init));
  target.dispatchEvent(new KeyboardEvent("keypress", init));
  target.dispatchEvent(new KeyboardEvent("keyup", init));
}

function hover(targetId: string | undefined) {
  const el = requireElement(targetId) as HTMLElement;
  el.scrollIntoView({ block: "center", behavior: "instant" as ScrollBehavior });
  el.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
  el.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
}

function wait(value: string | undefined): Promise<void> {
  const ms = Math.min(Number(value ?? "500"), 10000);
  return new Promise((resolve) => setTimeout(resolve, isNaN(ms) ? 500 : ms));
}

export async function executeContentAction(action: BrowserAction): Promise<unknown> {
  switch (action.type) {
    case "click":
      click(action.targetId);
      return { clicked: action.targetId };
    case "type":
      type(action.targetId, action.value);
      return { typed: action.targetId };
    case "select_option":
      selectOption(action.targetId, action.value);
      return { selected: action.targetId };
    case "scroll":
      scroll(action.targetId, action.value);
      return { scrolled: true };
    case "upload_file":
      await uploadFile(action.targetId, action.value);
      return { uploaded: action.targetId };
    case "press_key":
      pressKey(action.targetId, action.value);
      return { pressed: action.value };
    case "hover":
      hover(action.targetId);
      return { hovered: action.targetId };
    case "wait":
      await wait(action.value);
      return { waited: action.value };
    case "execute_js": {
      if (!action.value) throw new Error("execute_js requires a value (JS source).");
      // eslint-disable-next-line no-new-func
      const result = await new Function("return (async () => { " + action.value + " })()")();
      return { result: JSON.stringify(result) };
    }
    case "read_clipboard": {
      const text = await navigator.clipboard.readText();
      return { text };
    }
    case "write_clipboard": {
      await navigator.clipboard.writeText(action.value ?? "");
      return { written: true };
    }
    default:
      throw new Error(`executeContentAction: unsupported action type "${action.type}" for content scope.`);
  }
}
