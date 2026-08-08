import { getElementByCosmosId } from "@modules/dom-reader/domReader";
import { BrowserAction } from "@shared/types/actions";

function requireElement(targetId: string | undefined): Element {
  if (!targetId) throw new Error("Action requires a targetId but none was provided.");
  const el = getElementByCosmosId(targetId);
  if (!el) throw new Error(`No element found for cosmosId "${targetId}". Page may have changed — re-read the DOM.`);
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
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    el.focus();
    el.value = value ?? "";
    dispatchInputEvents(el);
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
    default:
      throw new Error(`executeContentAction: unsupported action type "${action.type}" for content scope.`);
  }
}
