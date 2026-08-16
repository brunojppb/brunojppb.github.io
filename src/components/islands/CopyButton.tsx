import { useState } from 'react';
import { COPY_LABEL, COPIED_LABEL, COPY_RESET_MS } from '../../lib/copy-button';

/**
 * The [ COPY ] control in a code block header. Used only on `/system/` —
 * the delegated click script in `BaseLayout.astro` handles every copy
 * button the rehype plugin emits into post code blocks. Both read the
 * label pair and timeout from `src/lib/copy-button.ts`.
 */
export default function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), COPY_RESET_MS);
  }

  return (
    <button
      type="button"
      data-copy
      // Carries the raw source so it can serve as ground truth for the
      // rendered line count in tests, independent of the DOM the same
      // render produced — see tests/e2e/codeblocks.spec.ts.
      data-code={text}
      onClick={copy}
      className="text-2xs uppercase tracking-chrome text-ink-muted hover:text-accent-lift"
    >
      {copied ? COPIED_LABEL : COPY_LABEL}
    </button>
  );
}
