---
name: verify-search-grouping
description: Checks the search palette's grouping and cap rules against generated indexes and queries. Use after any change to src/lib/search.ts or the groups the palette draws in CommandPalette.tsx.
---

# Verify search grouping

## The property

Every search returns groups in the order POSTS, TAGS, PAGES. A group is never empty. A group shows at most 5 posts, 3 tags, or 3 pages. Its `total` counts every match, including the ones the cap hides. A filter returns one group and leaves it unchanged. A blank query returns no groups.

The harm if it breaks: the palette shows an empty group, hides a match without a count, or shows the wrong total in the rule beside the label. The reader trusts those numbers.

## What is covered

| Code | What |
| --- | --- |
| `composeGroups()` in `src/lib/search.ts` | grouping, `CAPS`, group order, `total`, `filter`, blank query |
| `matchTags()`, `matchPages()` | the tags and pages totals, against a substring oracle |

The posts total comes from Pagefind, so the test takes it as input and checks that the group reports it unchanged. The test generates the posts, never runs Pagefind.

Not covered: field ranking (`rankByField`), the word guard (`unresolvedWords`), `matchedIn`, `highlightParts`, `postFilename`, `topTags`, `src/lib/pagefind.ts`, and the React code in `CommandPalette.tsx`. `tests/unit/search.test.ts` and `tests/unit/pagefind.test.ts` cover those by example.

## Tool and bounds

The tool is Vitest, already in the repo. No model checker fits this code. The function is pure and short. The check runs the real `composeGroups()` on 4000 seeded random inputs. Each has a posts total from 0 to 39, up to 11 tags, 11 queries and 4 filters. That is 176000 calls. It is bounded random testing, not a proof. The seed is fixed, so a failure repeats.

Tags use a small vocabulary on purpose (`alpha`, `beta`, `ALPHA`, `alphabet`, `gamma`, `src`). Many tags match, so the caps are reached often. Pages are the real six tabs, and the queries `src`, `o` and `post` match some of them.

## Run

```bash
npx vitest run --config .claude/skills/verify-search-grouping/vitest.config.ts
.claude/skills/verify-search-grouping/scripts/mutants.sh
```

The first command takes about 4 seconds. It must pass. The second breaks a copy of `search.ts` six ways and prints `caught <name>` for each. A line starting `MISS` means the check cannot see that break. Fix the check.

`SEARCH_MODULE=<path>` makes the test import another file in place of `src/lib/search.ts`. `mutants.sh` uses this. The copies go in `.state/`, which git ignores.

## Telling a bug from a modeling error

A failure prints the generated entries' values in the assertion. Read it with the property in mind.

- If the code returns an empty group, an extra row, or a wrong total, it is a bug in `composeGroups()`. Report it with the failing query and index. Do not change the test.
- If the test fails because the code's rule changed on purpose (for example a new cap), change `CAPS` in `grouping.test.ts` and the cap numbers in this file, then run `mutants.sh`.
- If a tags or pages total fails after a change to `matchTags` or `matchPages`, check the test's `has` oracle against the new rule first.

## Sync record

Last confirmed against the code at the Pagefind rewrite on branch `feat/pagefind-search`.

Run `git log feat/pagefind-search..HEAD -- src/lib/search.ts src/components/islands/CommandPalette.tsx` after the branch lands. If it prints commits, the check needs another look.
