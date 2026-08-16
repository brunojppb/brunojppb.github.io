import sharp from 'sharp';
import { readdirSync, statSync, readFileSync, writeFileSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOT = 'public/assets/images';
const MAX_WIDTH = 1600;

/** Every file under dir, recursively. */
function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]
  );
}

let before = 0, after = 0, skipped = [];

for (const file of walk(ROOT)) {
  const ext = extname(file).toLowerCase();
  before += statSync(file).size;

  // SVG is already small. GIF re-encoding drops the animation.
  if (ext === '.svg' || ext === '.gif') {
    skipped.push(file);
    after += statSync(file).size;
    continue;
  }
  if (!['.jpg', '.jpeg', '.png'].includes(ext)) {
    after += statSync(file).size;
    continue;
  }

  const input = readFileSync(file);
  const img = sharp(input).rotate();
  const meta = await img.metadata();
  const resized = meta.width && meta.width > MAX_WIDTH ? img.resize({ width: MAX_WIDTH }) : img;

  const out =
    ext === '.png'
      ? await resized.png({ compressionLevel: 9, palette: true }).toBuffer()
      : await resized.jpeg({ quality: 80, mozjpeg: true }).toBuffer();

  // Never make a file bigger.
  if (out.length < input.length) writeFileSync(file, out);
  after += statSync(file).size;
}

const mb = (n) => (n / 1024 / 1024).toFixed(1);
console.log(`${mb(before)} MB -> ${mb(after)} MB`);
if (skipped.length) console.log(`skipped (svg/gif): ${skipped.length}`);
for (const s of skipped) console.log(`  ${s} ${(statSync(s).size / 1024).toFixed(0)} KB`);
