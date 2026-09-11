import { describe, it, expect } from 'vitest';
import { matchCommand } from '../../src/lib/palette-commands';

describe('matchCommand', () => {
  it('matches the bare word', () => {
    expect(matchCommand('play')?.id).toBe('play');
  });

  it('matches with the leading slash the palette never receives from `/`', () => {
    expect(matchCommand('/play')?.id).toBe('play');
  });

  it('ignores case and surrounding space', () => {
    expect(matchCommand('  /PLAY ')?.id).toBe('play');
  });

  it('carries the label and description the row draws', () => {
    expect(matchCommand('play')).toMatchObject({
      label: '/play',
      description: 'space invaders, in a terminal window',
    });
  });

  it('does not match a partial word', () => {
    expect(matchCommand('/pla')).toBeNull();
    expect(matchCommand('p')).toBeNull();
  });

  it('does not match a longer word that starts with it', () => {
    expect(matchCommand('playwright')).toBeNull();
  });

  it('does not match a second slash', () => {
    expect(matchCommand('//play')).toBeNull();
  });

  it('returns null for an empty query', () => {
    expect(matchCommand('')).toBeNull();
    expect(matchCommand('   ')).toBeNull();
    expect(matchCommand('/')).toBeNull();
  });
});
