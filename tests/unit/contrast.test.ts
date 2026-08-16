import { describe, it, expect } from 'vitest';
import { contrastRatio } from '../../src/lib/contrast';

describe('contrastRatio', () => {
  it('matches the ratios the design system documents', () => {
    const WINDOW = '#101017';
    expect(contrastRatio('#e4e2ea', WINDOW)).toBeCloseTo(14.8, 0);  // ink
    expect(contrastRatio('#c9c6d4', WINDOW)).toBeCloseTo(11.3, 0);  // ink-body
    expect(contrastRatio('#a3a0b0', WINDOW)).toBeCloseTo(7.4, 0);   // ink-secondary
    expect(contrastRatio('#8b8799', WINDOW)).toBeCloseTo(5.4, 0);   // ink-muted
  });

  it('is symmetric', () => {
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 1);
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1);
  });
});
