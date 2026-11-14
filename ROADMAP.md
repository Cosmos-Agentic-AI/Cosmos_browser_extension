# Cosmos Roadmap

This is a living document. Items marked ✅ are shipped. Items marked 🔨 are in progress or planned — contributions welcome.

---

## ✅ Shipped

- AI-powered task planning (LLM → structured plan → validated with Zod)
- DOM reader with stable element IDs (`data-cosmos-id`)
- Browser controller: click, type, scroll, select, navigate, tab management
- 5-layer adaptive memory: session, user, website, workflow, failure
- Streaming chat UI with live execution timeline
- Side panel (Chrome MV3 Side Panel API)
- Keyboard shortcut (`Ctrl+Shift+Space`)
- Command history with quick-replay chips
- Vision fallback (screenshot + vision model for canvas/shadow DOM pages)
- Specialist agent for failure diagnosis
- Step budget guard (max steps per task)
- Goal completion detection + post-run task judge
- Dry-run mode (show plan without executing)
- Context menu integration (right-click selected text → run goal)
- Clipboard read/write actions
- Variable carry-forward (extract → reuse in next step)
- Screenshot on step failure
- Task history panel
- Workflow library (save, reuse, export)
- Chrome notifications on task complete
- Blocked domains security list
- Dark / light / system theme
- Professional UI redesign (glassmorphism, animations, bottom nav)

---

## 🔨 Planned / Help Wanted

### High priority
- [ ] **Firefox support** (Manifest V2 compatibility) — `help wanted`
- [ ] **More AI providers** — Anthropic Claude direct, Google Gemini, Ollama (local) — `help wanted`
- [ ] **Real embedding-based memory retrieval** — replace keyword overlap with cosine similarity via a local model — `enhancement`
- [ ] **Multi-tab orchestration** — a single goal that spans multiple tabs — `enhancement`

### Medium priority
- [ ] **Record & replay** — record a manual session and save it as a reusable workflow — `enhancement`
- [ ] **Scheduled tasks** — run a goal on a cron schedule — `enhancement`
- [ ] **Export extracted data as CSV / Markdown** — after an extract step, one-click download — `enhancement`
- [ ] **Step-level undo** — roll back the last action — `enhancement`
- [ ] **Localization / i18n** — translate the UI — `help wanted`

### Good first issues (great for new contributors)
- [ ] **Add more quick action presets** — new one-click goals in the Quick Actions bar — `good first issue`
- [ ] **Add more keyboard shortcuts** — navigate between panels without a mouse — `good first issue`
- [ ] **Write unit tests for plannerService** — improve test coverage — `good first issue`
- [ ] **Write unit tests for memoryService** — improve test coverage — `good first issue`
- [ ] **Add a "copy as JSON" button to extracted variables** — in the MemoryInsights panel — `good first issue`
- [ ] **Improve onboarding wizard** — clearer instructions, better UX — `good first issue`
- [ ] **Add provider health check** — ping the configured base URL and show a status dot in Settings — `good first issue`

---

## Ideas under consideration

- Native messaging host for filesystem access (would unlock full file upload)
- Electron desktop wrapper for non-Chrome browsers
- Shared workflow marketplace
- Voice input for goals

---

Want to work on something? Open an issue to claim it before starting — avoids duplicate effort.
