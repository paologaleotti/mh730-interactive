## Testing Strategy

Vitest suite colocated with sources (`src/**/<name>.test.ts(x)`, kebab-case). Run it after **every** change; a change is not done until all four gates pass:

```bash
pnpm test        # 1. vitest run — full suite must pass
pnpm build       # 2. tsc -b && vite build — typecheck + bundle must pass
pnpm lint        # 3. oxlint (if it OOMs, use ./node_modules/.bin/oxlint)
# 4. runtime: drive the real app headless against pnpm dev (see below)
```

**Runtime verification (gate 4):** unit tests do not cover MapLibre/WebGL. For any change touching the map, layout, or mode switching, drive the running app with headless Chrome (playwright-core, `channel: 'chrome'`) and check: page loads with zero console errors/warnings, the `.maplibregl-canvas` exists and has non-zero size, mode switching works, and a hostile hash (`#c=0,999,2,0,0&t=NaN`) does not crash. Screenshot and look at it — a blank frame is a failure.

**Conventions:**
- Test environment is `node` by default; DOM tests opt in per-file with `// @vitest-environment jsdom` on line 1.
- `globals: false` — import `describe/it/expect` from vitest explicitly.
- zustand stores are module singletons: capture initial state at module scope, restore with `useStore.setState(initial, true)` in `beforeEach`.
- New module -> colocated test file in the same commit. New config data (layers, events, evidence) -> extend the invariant tests (unique ids, sorted order, valid URLs/dates, cross-references resolve).
- Never render `GlobeMap` in jsdom (needs WebGL) — cover map logic via `basemap.ts` style assertions and headless-Chrome runtime checks instead.
- Behavior changes: update the failing test to pin the NEW behavior in the same change; never delete a test to make the suite pass.

## Core Rules

Critical rules for **ALL** packages. **Non-compliance will not be tolerated.**

- **ALWAYS** apply when writing code
- **ALWAYS** check when reviewing code changes

**Shell**

- **CRITICAL**: do not **EVER** run `git` commands, with these exceptions:
    - Read-only inspection is always allowed: `git diff` (any flags/paths) and `git status`.
    - `git add` and `git commit` are allowed **only** when the user explicitly asks for a commit (e.g. via `/commit`) — never autonomously, never as a side effect of another task.
    - Everything else that mutates history or remotes (checkout, reset, rebase, push, branch -D, stash drop, etc.) stays forbidden.

**Types & Imports:**

- **NEVER** use `any` or `as` casting
- Explicit type annotations **ONLY** when needed (inlined data, function params, etc)
- **NEVER** `is` type guards in `.filter` - narrowing is automatic
- **ALWAYS** `const` for functions, not `function`
- **NO** region-dividing comments unless explicitly requested
- **ALWAYS** kebab-case for files
- **Avoid untyped Zod `.parse()`**: Don't use `schema.parse(untypedValue)` to bypass TypeScript - it silently erases the type-checking bridge between layers (e.g., DB -> model). Use `.parse()` only at true system boundaries (external API responses, `JSON.parse` results, user input). For internal data, let TypeScript enforce the mapping - if types don't align, fix the types, don't `.parse()` them away.

## Code Style

### Prefer declarative over imperative

- **Avoid `let` + loops**: Use `.find()`, `.map()`, `.filter()`, `.reduce()`, `.some()`, `.every()`, `.flatMap()` instead of `let` + `for` loops. If you need to find an item, use `.find()` - never declare a `let` variable and loop to assign it.
- **Default to `.reduce`** for accumulation, `for` **ONLY** when it clearly helps readability.
- **NEVER** `.forEach()` - use `for(const x of arr)` when a loop is needed.
- **Avoid manual array building**: Instead of `const arr = []; if (x) arr.push(...)`, use `[x ? mapX(x) : undefined, y ? mapY(y) : undefined].filter(defined)`.
- **Ternary over simple if/else**: For simple conditional assignments, prefer ternary operators. Avoid when they hurt readability (nested ternaries).
- **Prefer `const`**: Use `let` only when mutation is truly unavoidable. Build data with expressions (ternary, spread, array methods), not statements (if/push/reassign).

### Pattern matching with ts-pattern

- Use `.exhaustive()` by default - compile-time exhaustiveness checking catches missing cases.
- Use `.otherwise()` only when a genuine default/fallback is needed (e.g., unknown external input, catch-all logging). Don't use it to skip handling known cases.
- Don't overuse for trivial 2-branch conditions - a simple ternary or `if` is fine there.
- `.returnType<T>()` when: return type needs `as const`, or type already exists/is reusable.
- `.returnType` set -> no `as const` in branches.
- One-off return type -> `as const` in branches is fine, skip `.returnType`.

### Utilities: es-toolkit

- Use `es-toolkit` for utility operations: `chunk`, `groupBy`, `keyBy`, `sumBy`, `partition`, `mapValues`, `uniq`, `pick`, `omit`, etc.
- **ALWAYS** `identity` for pass-through functions.
- Prefer es-toolkit over hand-rolled loops or lodash.

### Modern JS built-ins

- Prefer `Object.groupBy()` / `Map.groupBy()` over manual grouping loops or `es-toolkit/groupBy` when the logic is simple.
- Prefer `Set` for uniqueness checks and set operations (`.union()`, `.intersection()`, `.difference()`).
