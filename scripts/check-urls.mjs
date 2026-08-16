import { readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

/** Every route the build produced, as a URL path. */
function routes(root) {
  const out = [];
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name === 'index.html') out.push('/' + relative(root, dir).replace(/\\/g, '/') + '/');
      else if (e.name.endsWith('.html')) out.push('/' + relative(root, p).replace(/\\/g, '/'));
    }
  };
  walk(root);
  return new Set(out.map((u) => u.replace('//', '/')));
}

const OLD = process.env.OLD_DIST ?? '/tmp/dist-old';
if (!existsSync(OLD)) {
  console.error(`No old build at ${OLD}. Run ./build.sh and copy dist/ there first.`);
  process.exit(1);
}

const before = routes(OLD);
const after = routes('dist');

// Section pages are allowed to move; posts are not.
const MOVED_ON_PURPOSE = new Set(['/open-source/', '/work/', '/hidden/replace-me-at-woom/']);

const missing = [...before].filter((u) => !after.has(u) && !MOVED_ON_PURPOSE.has(u));

if (missing.length) {
  console.error(`${missing.length} URLs disappeared:`);
  for (const u of missing) console.error(`  ${u}`);
  process.exit(1);
}

const posts = [...after].filter((u) => u.startsWith('/entries/'));
console.log(`${posts.length} post URLs, all preserved`);
if (posts.length !== 30) {
  console.error(`expected 30 posts, built ${posts.length}`);
  process.exit(1);
}
