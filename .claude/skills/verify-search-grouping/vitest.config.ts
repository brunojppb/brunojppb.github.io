import { defineConfig } from 'vitest/config';

// Separate from the repo config: search.ts is pure, so Astro's plugins are not needed.
export default defineConfig({
  test: { include: ['.claude/skills/verify-search-grouping/grouping.test.ts'] },
});
