Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:

- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

## 5. Never Install Anything Without Asking

**Changes to the machine need a yes first. Changes to the repo do not.**

Installing, upgrading or removing anything outside this repo — Homebrew packages, global `npm`/`pip` installs, language runtimes, CLIs, shell or system config — requires explicit authorization **before** it happens. Say what you want to install, why the task needs it, what it costs, and what the alternative is if the answer is no. Then wait for an answer.

This applies to subagents too. An agent you spawn inherits this rule, and you may not authorize an install on the user's behalf inside its prompt.

**Not covered:** anything that lives in the repo. A dependency added to `package.json`, or an `npm install` of something already declared there, is an ordinary code change — it shows up in the diff and gets reviewed like everything else.

A legitimate need is still not authorization. `deno` was once installed to type-check the Edge Functions, which `tsc` genuinely cannot do (see the `exclude` note in `tsconfig.json`). The reasoning was sound and the tool was the only option — and it was still the user's call to make, not the agent's.

## 6. Check the Backlog Before Reporting a Bug

**Known debt is not a discovery.**

Read `docs/tech-debt/backlog.md` **before the sentence leaves your mouth** — not before you file the entry. By the time the user has read "I found a problem with X" and answered "save that", the duplicate conversation has already happened, and finding the entry afterwards does not give it back. The same applies to proposing a fix, or adding a "while I was here" finding to a review.

This bites hardest on an **incidental** find — a bug noticed while doing something else, which is exactly when stopping to check feels like a detour. Check anyway. Several of this app's rough edges are already found, diagnosed and deliberately deferred, with the reasoning and the intended approach written down. Re-raising one as new costs the user the same conversation a second time, and it buries the entries that really are unresolved.

- **Already there?** Reference the entry. Do not restate its argument — say which one it is and move on.
- **Fixing one?** Tick its box in the file's _Open items_ index and update its `Status:` line, in the same commit as the fix.
- **Genuinely new, and you are deferring it?** Add an entry, rather than mentioning it in passing where it will be lost.

The same applies before proposing a refactor: two of the entries are refactors somebody already scoped and chose not to do yet.

## Code conventions

### Naming

Use **camelCase** for all identifiers in application code — variables, functions, parameters, and object/domain fields (e.g. `Movement` fields are `executionPrice`, `executionDate`, `grossAmount`, not snake_case). **snake_case is reserved for the database layer only**: Supabase/Postgres column names stay snake_case and are translated to camelCase domain objects at the data-access boundary (`mapRowToMovement`). Never let snake_case leak into domain types, the engine, components, or tests. Exception: framework-defined identifiers (e.g. Expo Router's `unstable_settings`).

### ASCII-only source

Source files (`.ts`, `.tsx`) use **plain ASCII punctuation** — never a
typographic lookalike. The one that keeps coming back is the minus sign: a
negative amount is `-$10.13` with an **ASCII hyphen** (U+002D), never U+2212
(`−`). Same for quotes and dashes: `'`, `"`, `-`, not `’`, `“`, `—`.

Why: the lookalikes are indistinguishable in most editors, so a reader cannot
tell which character a string holds, and a careless find-and-replace silently
swaps one for the other. This has already broken the test suite twice.

Spanish UI copy keeps its accents and `¿¡` — those carry meaning. This rule is
about **punctuation that has an ASCII equivalent**.

Applies to string literals, comments and test assertions alike. To assert the
_absence_ of a lookalike in a test, write it as a unicode escape —
`not.toContain("\u2212")` — rather than pasting the glyph, so the assertion
says out loud which character it means.

### Where a validation lives

**Value rules live in the view-model; the schema holds structural facts only.** Do not propose a Postgres `CHECK` for a rule about a number — this is settled across all five movement types, and not one of them has such a constraint.

The distinction is what the rule protects. A **structural** constraint says which type a row is, or which columns that type may fill, and the row mappers read a row back through it — `regulatory_fees_belong_to_sells` is how a buy is told from a sell coming out of the trades table, so the schema is the only place it can live. A **value** rule — `fee < amount` on a withdrawal, `tax <= gross` on a dividend, `total <= Cash` on a buy — is policy: it changes, it applies to one type and not its sibling, and the form's save button already refuses it.

Reopen this only when a second write path appears — an edit screen, a bulk import, anything reaching the write path without a form in front of it.

## Agent skills

### Issue tracker

Issues and PRDs live as local markdown files under `.scratch/<feature>/`. See `docs/agents/issue-tracker.md`. **PRDs are written by the `to-prd` skill, not by hand**. Same for `to-issues` and issues. Knowing where the file goes is not the same as knowing what belongs in it; the skill holds the second half.

### Triage labels

This repo does not use triage labels — the triage skill applies no label or status markers. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
