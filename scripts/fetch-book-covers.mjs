import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import sharp from 'sharp';

// This script only ever runs on demand (`npm run books:covers`), never as
// part of `npm run build` — the build must succeed with zero network
// access, so it reads whatever is already committed in src/assets/books/.

const OUT = 'src/assets/books';
mkdirSync(OUT, { recursive: true });

// BookCover asks Astro for 480px at the widest (reading, 2x its ~241px cap),
// so a source wider than that is detail no page can show.
const MAX_WIDTH = 480;

const doc = parse(readFileSync('src/data/books.yaml', 'utf8')) ?? {};
const books = [...(doc.reading ?? []), ...(doc.finished ?? [])];

// src/lib/books.ts matches a cover by filename stem, so any extension counts
// as already downloaded.
const stems = new Set(readdirSync(OUT).map((f) => f.replace(/\.[^.]+$/, '')));

const unresolved = [];

for (const book of books) {
  const key = book.isbn ?? book.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const target = join(OUT, `${key}.webp`);

  // 1. Already downloaded.
  if (stems.has(key)) {
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

    // Quality 80 to match scripts/optimize-images.mjs. Astro re-encodes this
    // file to serve it, and measuring 75 through 90 here moved the served bytes
    // by under 2%, so the higher settings only cost repository size.
    let img = sharp(buf);
    const meta = await img.metadata();
    if (meta.width > MAX_WIDTH) img = img.resize({ width: MAX_WIDTH });
    const out = await img.webp({ quality: 80, effort: 6 }).toBuffer();

    writeFileSync(target, out);
    console.log(
      `saved   ${book.title}  ${meta.width}x${meta.height} ${meta.format}` +
        ` -> ${(out.length / 1024).toFixed(0)} KB webp  <- ${url}`
    );
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
