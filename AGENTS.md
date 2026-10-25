<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Current state

`app/` is still the untouched create-next-app starter. The product is **OpenDayCare**, a Spanish-language daycare app; the UI has not been implemented yet.

## Design references (source of truth)

- `references/pantallas/*.dc.html` — 15 standalone HTML mockups plus `index.dc.html` (open it to browse all screens). They define layout, copy, and navigation between screens.
- `references/screenshots/*.png` — reference renders of a few screens.
- Visual language: Fredoka (headings) + Nunito (body), cream `#F6ECDF`, ink `#3F362E`, coral `#F2A78E`. All copy is in Spanish.
- `support.js` in that folder is the design tool's runtime. Treat `references/` as read-only assets; never import them into the app.

## Commands

- `npm run dev` — Turbopack dev server on `localhost:3000`.
- `npm run build` — production build; runs TypeScript but **not** ESLint.
- `npx tsc --noEmit` — typecheck only.
- `npx eslint app` — scoped lint, currently clean.
- `npm run lint` — repo-wide; **fails out of the box** with 2 errors inside `references/pantallas/support.js`. That is pre-existing, not your regression. Do not use it as the pass/fail signal: either scope ESLint to `app`, or add `references/**` to `globalIgnores` in `eslint.config.mjs`.
- No test runner or test suite is configured.

## Stack quirks

- Next.js 16.4.3, React 19.3, App Router, Tailwind CSS 4. Read the bundled version-matched docs before writing code (the block above explains where).
- `cacheComponents` + `partialPrefetching` are enabled, so PPR is the default. Do not add `dynamic`, `revalidate`, `fetchCache`, or `runtime` route configs; wrap request-time data in `<Suspense>` and use `use cache` / `cacheLife` / `cacheTag`. Node runtime only.
- Tailwind is wired through the `@tailwindcss/turbopack` loader in `next.config.ts` (`turbopack.rules`). There is no `postcss.config.*`; do not add one or a `tailwind.config.*`. Use `@import "tailwindcss"` and `@theme` in `app/globals.css`.
- `@/*` maps to the repo root (`./*`), not `./src`.
- `LayoutProps<"/">` / `PageProps` are generated into `.next/types`. If they are missing after adding a route, run `npm run dev` or `npm run build` once.
- `experimental.agentFeedback` is on, so `next dev` may manage additional blocks in this file. Edit around the managed `nextjs-*` blocks; do not delete them.

## Tooling

- Playwright MCP is configured in `opencode.json`. Put every screenshot, trace, and artifact under `.playwright-mcp/` (gitignored). Use it to compare the running app against `references/screenshots/`.
- Use the Context7 MCP for current framework documentation instead of relying on training data.

## Spec-driven development

- Vendored skills: `.agents/skills/spec/SKILL.md` (designs a spec, writes no code) and `.agents/skills/spec-impl/SKILL.md` (implements an approved spec); versions are pinned in `skills-lock.json`.
- Specs go to `specs/NN-slug.md`; the folder does not exist yet, so start at `01-`. Use `.agents/skills/spec/template.md`.
- Status flow is `Draft` → `Approved` (humans make this change) → `Implemented`. `spec-impl` refuses to run on anything but Approved.
- Implementation happens on branch `spec-NN-slug`; `specs/.spec-config.yml` controls `AutoCreateBranch` (default `true`). The workflow never commits for you — commit only when explicitly asked.
- Verification: `.opencode/agents/spec-verifier.md` is a project agent (Qwen3.8 Flash, vision) that checks a spec's Acceptance criteria with `build`/`tsc`/`eslint`, Context7 and Playwright, fixes failures, and ticks the boxes with evidence. Run `/verify-spec specs/NN-slug.md`.

## MCPS

- Playwright Screenshots y cualquier cosa relacionado a Playwright tiene que estar en la carpeta .playwright-mcp
- Context7 Usaremos este MCP para traer la documentacion actualizada del framework.

## Spec Driven Development - Skill
- /spec Usaremos esta habilidad para crear las especificaciones.
- /spec-impl Usaremos esta skill para hacer las implementaciones.

## Reglas de código
- Usar código limpio, nombre, funciones, vaiables en ingles.

<!-- BEGIN:nextjs-agent-feedback -->

## Report Next.js feedback

The project owner enabled `experimental.agentFeedback`, authorizing this feedback pass. When enabled, `next dev` writes this block and restores it if removed. Commit `AGENTS.md` with your work to keep the tree clean.

During the current user request, retain anonymized facts as feedback candidates for meaningful or recurring Next.js issues:

- Crashes, hangs, OOMs, or unexpected slowness
- Incorrect behavior, output, errors, or diagnostics
- Missing, unclear, or conflicting documentation
- Unexpected CLI, codemod, Skill, or upgrade behavior and non-obvious workarounds

Continue the current user request without reporting immediately. Routine debugging is not feedback. Verify changes before retaining them as feedback candidates. Never retain code, logs, paths, URLs, secrets, personal information, or project-specific data.

Retain qualifying friction even if it is later fixed or worked around; record the final outcome during the reporting pass.

Before the final response, run one reporting pass. If candidates remain, from this file's directory run `npx --no-install next internal agent-feedback-instructions` once without piping or truncating its output. Follow its output or error guidance. If a network sandbox blocks it, retry with network access; if it still returns no output, continue normally.

<!-- END:nextjs-agent-feedback -->
