/**
 * The palette's one command. Pure: the island
 * (src/components/islands/CommandPalette.tsx) passes the typed query through
 * here and draws whatever comes back.
 *
 * The leading slash is optional because `/` already opens the palette and the
 * open resets the query, so a reader who arrives that way types `play` while a
 * reader who arrives by ⌘K types `/play`. Both mean the same thing.
 */

export interface Command {
  id: 'play';
  /** What the row shows, slash included, whichever form the reader typed. */
  label: string;
  description: string;
}

const PLAY: Command = {
  id: 'play',
  label: '/play',
  description: 'space invaders, in a terminal window',
};

export function matchCommand(query: string): Command | null {
  const word = query.trim().toLowerCase().replace(/^\//, '');
  return word === PLAY.id ? PLAY : null;
}
