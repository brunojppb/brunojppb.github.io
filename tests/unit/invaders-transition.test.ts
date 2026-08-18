import { describe, expect, it } from 'vitest';
import { blockAt, veilAt } from '../../src/lib/invaders/transition';

describe('blockAt', () => {
  it('hits every keyframe the handoff names', () => {
    expect(blockAt(0)).toBeCloseTo(1, 5);
    expect(blockAt(160)).toBeCloseTo(6, 5);
    expect(blockAt(380)).toBeCloseTo(20, 5);
    expect(blockAt(520)).toBeCloseTo(40, 5);
    expect(blockAt(650)).toBeCloseTo(8, 5);
    expect(blockAt(720)).toBeCloseTo(1, 5);
  });

  it('falls in resolution up to 520ms', () => {
    let previous = blockAt(0);
    for (let t = 20; t <= 520; t += 20) {
      const now = blockAt(t);
      expect(now).toBeGreaterThan(previous);
      previous = now;
    }
  });

  // The reversal is the idea. A fade would leave this monotonic all the way to
  // 720ms, and the invaders would never appear to come out of the page's pixels.
  it('climbs back from 520ms rather than fading', () => {
    let previous = blockAt(520);
    for (let t = 540; t <= 720; t += 20) {
      const now = blockAt(t);
      expect(now).toBeLessThan(previous);
      previous = now;
    }
  });

  it('never goes under one pixel', () => {
    for (let t = 0; t <= 800; t += 10) expect(blockAt(t)).toBeGreaterThanOrEqual(1);
  });
});

describe('veilAt', () => {
  it('is off until 380ms', () => {
    expect(veilAt(0)).toBe(0);
    expect(veilAt(379)).toBe(0);
  });

  it('builds to 70 percent by 520ms', () => {
    expect(veilAt(450)).toBeGreaterThan(0);
    expect(veilAt(450)).toBeLessThan(0.7);
    expect(veilAt(520)).toBeCloseTo(0.7, 5);
  });

  // The handoff builds the veil and never takes it off. It has to come off, or
  // the invaders resolve under a 70 percent wash of the field colour and are
  // never seen.
  it('retreats to nothing by 650ms, so the invaders can resolve', () => {
    expect(veilAt(585)).toBeCloseTo(0.35, 5);
    expect(veilAt(650)).toBe(0);
    expect(veilAt(720)).toBe(0);
  });
});
