#!/usr/bin/env bash
# Breaks a copy of src/lib/search.ts in six ways. Each break must make the checks fail.
set -uo pipefail
SKILL="$(cd "$(dirname "$0")/.." && pwd)"
ROOT="$(cd "$SKILL/../../.." && pwd)"
SRC="$ROOT/src/lib/search.ts"
DIR="$SKILL/.state/mutants"
rm -rf "$DIR"; mkdir -p "$DIR"
cd "$ROOT"

mutate() { # name, sed expression
  sed -E "$2" "$SRC" | sed "s#from './nav'#from '$ROOT/src/lib/nav.ts'#" >"$DIR/$1.ts"
  if cmp -s "$SRC" "$DIR/$1.ts"; then echo "BAD  $1: the edit did not change the file"; bad=1; return; fi
  if SEARCH_MODULE="$DIR/$1.ts" npx vitest run --config "$SKILL/vitest.config.ts" >"$DIR/$1.log" 2>&1; then
    echo "MISS $1: checks still pass"; bad=1
  else
    echo "caught $1"
  fi
}

bad=0
mutate cap-off-by-one     "s/posts: 5/posts: 6/"
mutate empty-group-kept   "s/return groups\.filter\(\(g\) => g\.total > 0\);/return groups;/"
mutate posts-total-capped "s/total: input\.posts\.total,/total: Math.min(input.posts.total, CAPS.posts),/"
mutate tags-total-capped  "s/total: tags\.length,/total: Math.min(tags.length, CAPS.tags),/"
mutate filter-ignored     "s/input\.filter === 'all' \|\| input\.filter === f/true/"
mutate group-order        "s/^    \.\.\.\(want\('posts'\) \? \[posts\] : \[\]\),$//; s/^  return groups\.filter\(\(g\) => g\.total > 0\);/  return [...groups, ...(want('posts') ? [posts] : [])].filter((g) => g.total > 0);/"
exit $bad
