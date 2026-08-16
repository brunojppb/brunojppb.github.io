import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';

// This script only ever runs on demand (`npm run books:covers`), never as
// part of `npm run build` — the build must succeed with zero network
// access, so it reads whatever is already committed in src/assets/books/.

const OUT = 'src/assets/books';
mkdirSync(OUT, { recursive: true });

const doc = parse(readFileSync('src/data/books.yaml', 'utf8')) ?? {};
const books = [...(doc.reading ?? []), ...(doc.finished ?? [])];

const unresolved = [];

for (const book of books) {
  const key = book.isbn ?? book.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const target = join(OUT, `${key}.jpg`);

  // 1. Already downloaded.
  if (existsSync(target)) {
    console.log(`have    ${book.title}`);
    continue;
  }

  // 2. A publisher URL, then 3. Open Library by ISBN.
  const sources = [
    book.cover_url,
    book.isbn && `https://covers.openlibrary.org/b/isbn/${book.isbn}-L.jpg?default=false`,
  ].filter(Boolean);

  let saved = false;
  for (const url of sources) {
    let res;
    try {
      res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(10_000) });
    } catch (err) {
      console.log(`error   ${book.title}  ${url}  ${err.message}`);
      continue;
    }
    if (!res.ok) continue;
    const buf = Buffer.from(await res.arrayBuffer());
    // Open Library returns a tiny placeholder for some misses even with default=false.
    if (buf.length < 2000) continue;
    writeFileSync(target, buf);
    console.log(`saved   ${book.title}  ${(buf.length / 1024).toFixed(0)} KB  <- ${url}`);
    saved = true;
    break;
  }

  // 4. Nothing. The page renders the dither placeholder.
  if (!saved) unresolved.push(book.title);
}

if (unresolved.length) {
  console.log(`\nno cover found for ${unresolved.length}:`);
  for (const t of unresolved) console.log(`  ${t}`);
  console.log('These render the dither placeholder. Set cover_url to fix.');
}
