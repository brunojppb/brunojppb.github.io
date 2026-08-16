/**
 * Tailwind class strings shared between `CodeBlock.astro` and the rehype
 * plugin that restructures Shiki's markdown output (`rehype-code-block.ts`).
 * A fenced code block in a post and a hand-authored `<CodeBlock>` must look
 * identical, so both paths read from here instead of keeping two copies.
 *
 * These are literal strings (not built from template interpolation) because
 * Tailwind's content scanner only sees classnames that appear verbatim in a
 * source file — including this one.
 */
export const codeBlockClasses = {
  figure: 'relative -mx-4 border-y border-line-hairline sm:mx-0 sm:border',
  header: 'flex items-center justify-between border-b border-line-hairline bg-surface-chrome px-4 py-2',
  label: 'text-2xs uppercase tracking-chrome text-ink-muted',
  copyButton: 'text-2xs uppercase tracking-chrome text-ink-muted hover:text-accent-lift',
  pre: 'overflow-x-auto bg-surface-code p-4 text-sm text-ink-body',
  line: 'flex whitespace-pre',
  lineNumber: 'mr-4 inline-block w-10 shrink-0 select-none text-right text-ink-muted',
};
