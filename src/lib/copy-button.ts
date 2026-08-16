/**
 * Shared copy-button constants.
 *
 * Two independent implementations render this control: the delegated
 * click script in `BaseLayout.astro` (for `[data-copy]` buttons the
 * rehype plugin emits into post code blocks) and the React island
 * `CopyButton.tsx` (used only on `/system/`). Both read the label pair
 * and timeout from here so an edit to one cannot silently desync the
 * other.
 */
export const COPY_LABEL = '[ COPY ]';
export const COPIED_LABEL = '[ COPIED ]';
export const COPY_RESET_MS = 1400;
