# Cosmos

An AI browser extension that reads pages, plans multi-step tasks, executes
browser actions, and learns from experience via a layered memory system.

## Status: Milestones 1-12 complete

### Architecture at a glance

- **Router** (`src/background/router.ts`): all request/response messaging
  (settings, memory management) flows through here. No module calls another
  module directly.
- **Chat orchestrator** (`src/background/orchestrator.ts` +
  `chatPort.ts`): the actual task-execution loop runs over a long-lived
  `chrome.runtime.connect` port (named `"cosmos-chat"`), not request/response
  messaging, because it needs to stream incremental updates — text, timeline
  status, memory insights — as the task runs. One port per popup session;
  cancellation and step-confirmation state are scoped to that connection.

### Milestone 3 — Memory Engine

`src/modules/memory/` — Dexie/IndexedDB database (`db.ts`) with five tables
matching the five memory layers, and a `MemoryService` (`memoryService.ts`)
that's the only thing allowed to touch them:

- **Session**: current goal, execution state, active tabs — survives popup close/reopen
- **User**: preferences, frequent sites, custom prompts, saved/approved form data
- **Website**: per-domain structure notes and learned selectors
- **Workflow**: named, reusable step sequences, with usage/success counters
- **Failure**: what went wrong, what recovery worked, with a confidence score

Retrieval is exact-match-plus-keyword-overlap rather than embeddings-based —
there's no vector store in this environment. The interface is shaped so a
real embedding-based retriever could replace the internals later without
changing callers.

### Milestone 4 — Chat UI

`src/modules/chat/chatStore.ts` (zustand) + `src/popup/components/`:
streaming assistant text, a live execution timeline with per-step status,
inline approve/skip for steps marked `requiresConfirmation`, memory-insight
callouts, cancel, and retry-last-task.

### Milestone 5 — DOM Reader

`src/modules/dom-reader/domReader.ts` (content-script side). Tags every
interactive element with a stable `data-cosmos-id` attribute so the Action
Executor can target it later without re-deriving a brittle CSS selector.
Extracts interactive elements, forms, tables, heading hierarchy, and visible
text into a `PageSnapshot`, plus flags (`hasCanvas`, `hasShadowDom`) the
Vision Layer's heuristic uses.

### Milestone 6 — Browser Controller

Split by where it has to run:
- `src/modules/browser-controller/contentActions.ts` (content script):
  click, type, scroll, select, file upload
- `src/modules/browser-controller/tabController.ts` (background):
  switch/open/close tab, navigate (waits for load), download detection via
  `chrome.downloads.onCreated`

**Known limitation, stated plainly**: a content script can't fabricate an
arbitrary `File` from a disk path — browser security prevents that. Upload
support here drives an existing `<input type="file">` from a `data:` URL
already available in the session (e.g. a generated file, a pasted image);
it can't pick a file from the user's filesystem unattended.

### Milestone 7 — Planner

`src/modules/planner/plannerService.ts`. Builds a prompt from the goal, the
current `PageSnapshot`, any matching `WorkflowMemory`, and any relevant
`FailureMemory`, then asks the LLM for a JSON plan. The response is validated
against a `zod` schema (`shared/types/actions.ts`) before anything touches
the page — a malformed or hallucinated plan is rejected rather than executed.

### Milestone 8 — Vision Layer

`src/modules/vision/visionService.ts`. `shouldUseVision()` is a cheap
heuristic (shadow DOM present, canvas present, or DOM read came back nearly
empty) that decides *whether* to pay for a screenshot + vision-model call at
all — DOM reading is the default path because it's cheaper and more precise.

### Milestone 9 — Dynamic Specialist Agent Framework

`src/modules/specialist-agent/specialistAgentService.ts`. Per the spec, this
is **not** a persistent agent — `invokeSpecialistAgent()` is a single stateless
function call, triggered by the orchestrator only after a step has failed
`MAX_RETRIES_BEFORE_SPECIALIST` (2) times. It diagnoses the specific failure,
proposes a revised action, and its output is written straight into
`FailureMemory` (always) and `WorkflowMemory` (only if flagged
`generalizable` with confidence ≥ 0.5). Nothing about "the specialist"
persists past the function returning — only the resulting knowledge does.

### A note on OmniRoute

OmniRoute is a self-hosted, open-source AI gateway that runs locally
(`http://localhost:20128/v1` by default) rather than a hosted cloud API like
OpenRouter or Groq. Onboarding and provider config reflect that — install it
yourself, paste the key from your local dashboard, and the base URL is
editable in Settings if you run it elsewhere (e.g. a home server via
Tailscale).

## Getting started

```bash
npm install
npm run build      # one-off build to dist/
npm run dev         # watch mode
```

In Chrome: `chrome://extensions` → enable Developer mode → **Load unpacked**
→ select `dist/`. On first install Chrome opens onboarding automatically.

## Architecture

```
src/
  background/       Router, chat orchestrator + port handler, service worker entry
  content/          DOM Reader + Browser Controller (content-script side)
  popup/            Chat UI (messages, execution timeline, settings)
  onboarding/        First-run setup wizard (doubles as options page)
  modules/
    api-manager/    Settings persistence + unified LLM client (streaming + non-streaming)
    memory/         Dexie schema + MemoryService (5 layers)
    dom-reader/     Structured page extraction
    browser-controller/  Content-script actions + background tab control
    action-executor/     Routes a PlanStep's action to the right surface, normalizes the result
    planner/        Goal + context → validated Plan (zod)
    vision/         Screenshot capture + vision-model fallback heuristic
    specialist-agent/    Stateless failure diagnosis → memory write
    chat/           Zustand store driving the popup off the streaming port
  shared/           Cross-cutting types (messages, settings, memory, dom, actions, chat), utils, styles
```

### Milestone 10 — Chrome Side Panel

The popup has been replaced by the Chrome Side Panel API. Clicking the toolbar
icon (or pressing `Ctrl+Shift+Space` / `Cmd+Shift+Space`) opens Cosmos in a
persistent side panel that stays open while you browse, giving far more vertical
space than a 560 px popup.

- `sidepanel/index.html` + `src/sidepanel/main.tsx` — the panel entry point
  (reuses `App` unchanged).
- `chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })` is set
  on install in `background/index.ts`.
- The old `default_popup` is removed from the manifest; the panel is now the
  primary surface.

### Milestone 11 — Command History with Quick-Replay

The last six goals you've sent are stored in `localStorage` and shown as
quick-pick chips in `ChatInput` when you focus the text field. Clicking a chip
re-sends that goal immediately — no retyping. The list deduplicates and keeps
the most-recent entry first.

- `pushRecentGoal` / `loadRecentGoals` / `saveRecentGoals` live in
  `chatStore.ts`, keeping the UI side clean.
- `ChatInput` now accepts a `recentGoals` prop and renders the chip list above
  the input row, with a fuzzy filter as you type.

### Milestone 12 — Keyboard Shortcut

`Ctrl+Shift+Space` (macOS: `Cmd+Shift+Space`) opens the Cosmos side panel
without reaching for the mouse. The shortcut is registered in the manifest as
`_execute_action` — Chrome's built-in command that simulates clicking the
extension toolbar button, so it respects the `openPanelOnActionClick` behaviour
set in Milestone 10 with zero extra code.

## What's next (beyond the current milestones)

- Replace keyword-overlap failure/workflow retrieval with real embeddings if
  a vector store becomes available
- Unit tests per module (the services are already structured as pure
  functions/classes specifically to make this straightforward — none exist
  yet)
- A richer Settings screen (theme switching is modeled in `CosmosSettings`
  but not yet exposed in the UI)
- File upload from an actual filesystem picker would need `chrome.debugger`
  or a native messaging host — out of scope for a content-script-only build

