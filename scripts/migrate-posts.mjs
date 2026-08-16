import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const SRC = 'content/articles';
const OUT = 'src/content/posts';

// Imported as plain data so the script does not need a TS runtime.
// tag-data.mjs exports TAG_MAP as an object and PT_SLUGS as an array.
const { TAG_MAP, PT_SLUGS } = await import('./tag-data.mjs');
const PT = new Set(PT_SLUGS);

mkdirSync(OUT, { recursive: true });

const yamlString = (s) => `"${String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

let count = 0;
for (const file of readdirSync(SRC).filter((f) => f.endsWith('.md'))) {
  const slug = file.replace(/\.md$/, '');
  const raw = readFileSync(join(SRC, file), 'utf8');

  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) throw new Error(`${file}: no front matter`);
  const [, fmText, body] = m;

  // Read the fields we care about. Values may be quoted or fold across lines.
  const field = (name) => {
    // No `m` flag: with it, `$` matches end-of-line, which truncates a folded
    // field whose value starts on the line right after `name:`.
    const re = new RegExp(`(?:^|\\n)${name}:[ \\t]*([\\s\\S]*?)(?=\\n[a-z_]+:|$)`);
    const hit = fmText.match(re);
    if (!hit) return undefined;
    return hit[1].trim().replace(/^["']|["']$/g, '').replace(/\s*\n\s*/g, ' ').trim();
  };

  const tags = TAG_MAP[slug];
  if (!tags) throw new Error(`${slug}: no tag mapping`);

  const title = field('title');
  const date = field('date');
  const description = field('meta_description');
  if (!title) throw new Error(`${slug}: no title`);
  if (!date) throw new Error(`${slug}: no date`);
  if (!description) throw new Error(`${slug}: no meta_description`);

  const lines = [
    '---',
    `title: ${yamlString(title)}`,
    `description: ${yamlString(description)}`,
    `date: ${date}`,
    `tags: [${tags.join(', ')}]`,
    `lang: ${PT.has(slug) ? 'pt-BR' : 'en'}`,
  ];
  const keywords = field('keywords');
  if (keywords) lines.push(`keywords: ${yamlString(keywords)}`);
  const image = field('meta_image');
  if (image) lines.push(`image: ${yamlString(image)}`);
  lines.push('---', '');

  writeFileSync(join(OUT, file), lines.join('\n') + body);
  count++;
}

console.log(`migrated ${count} posts into ${OUT}`);
if (count !== 30) throw new Error(`expected 30 posts, wrote ${count}`);
