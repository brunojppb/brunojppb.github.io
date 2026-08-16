import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { rehypeCodeBlock } from './src/lib/rehype-code-block.ts';

export default defineConfig({
  site: 'https://bpaulino.com',
  output: 'static',
  trailingSlash: 'always',
  integrations: [react(), sitemap()],
  vite: { plugins: [tailwindcss()] },
  markdown: {
    // 'css-variables' emits `var(--astro-code-*)` instead of hex colours,
    // so token colour can be remapped onto CONSOLE's ink/accent scale in
    // src/styles/code-vars.css instead of fighting inline hex values.
    shikiConfig: { theme: 'css-variables' },
    // Runs after Shiki has tokenised and coloured the code — see
    // src/lib/rehype-code-block.ts for what it restructures and why.
    rehypePlugins: [rehypeCodeBlock],
  },
});
