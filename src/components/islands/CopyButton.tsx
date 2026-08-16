import { useState } from 'react';

/** The [ COPY ] control in a code block header. */
export default function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
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
      {copied ? '[ COPIED ]' : '[ COPY ]'}
    </button>
  );
}
