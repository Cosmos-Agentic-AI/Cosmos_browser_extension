# Contributing to Cosmos

Thanks for your interest in contributing. This guide covers bug reports, feature requests, and pull requests.

---

## Bug reports

Please [open a GitHub issue](https://github.com/Cosmos-Agentic-AI/Cosmos_browser_extension/issues/new) and include:

- **Chrome version** (from `chrome://version`)
- **Extension version** (from `chrome://extensions`)
- **Steps to reproduce** — exact goal text, the site you were on, what happened
- **Expected vs actual behaviour**
- **Console errors** if any (right-click the side panel → Inspect → Console)

If the run failed mid-task, the execution timeline screenshot is especially helpful.

---

## Feature requests

Open an issue before writing code. A quick discussion up front saves everyone time — the feature may already be planned, may conflict with something in progress, or may need a different approach than you'd expect given the architecture.

Label your issue `enhancement` and describe:
- What problem you're trying to solve
- What your proposed solution looks like from the user's perspective

---

## Pull requests

1. **Fork** the repo and create a branch: `git checkout -b feat/my-feature`
2. Make your changes
3. Run `npm run type-check` — must report zero errors
4. Run `npm run test` — must pass
5. Open a PR against `main` with a description of **what** you changed and **why**

Keep PRs focused. One feature or fix per PR makes review faster.

---

## Code style

- **TypeScript strict** — no `any`, no type assertions unless unavoidable
- **Tailwind CSS** for all styling — no inline `style={{}}` or plain CSS outside `globals.css`
- Follow existing naming and file structure patterns
- No new `npm` dependencies without first discussing in an issue — bundle size and security matter for a browser extension

---

## Architecture note

**All communication between background modules goes through `router.ts`** (request/response messages) or the `cosmos-chat` port (streaming). Background modules must not import each other directly — that coupling makes testing and future refactoring significantly harder. If you're adding a new cross-module capability, add a handler in `router.ts` and a corresponding message type in `src/shared/types/messages.ts`.

---

## Questions

Feel free to open a discussion or issue if anything in the codebase is unclear. We'd rather answer a question than have you go down the wrong path.
