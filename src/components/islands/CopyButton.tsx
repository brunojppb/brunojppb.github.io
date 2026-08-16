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
      onClick={copy}
      className="text-2xs uppercase tracking-chrome text-ink-muted hover:text-accent-lift"
    >
      {copied ? '[ COPIED ]' : '[ COPY ]'}
    </button>
  );
}
