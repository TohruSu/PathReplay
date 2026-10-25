import { describe, expect, it } from 'vitest';
import type { Sample, Trajectory } from './data';
import { advanceTime, getTimeline, positionAt } from './playback';

const samples: Sample[] = [
  { time: 2, x: 0, y: 2 }, { time: 3, x: 4, y: 4 }, { time: 7, x: 12, y: -4 },
];
const track = (points: Sample[]): Trajectory => ({ id: 'A', label: 'A', scenario: null, samples: points });

describe('interpolation', () => {
  it('interpolates irregular sample intervals by time', () => {
    expect(positionAt(samples, 2.5)).toEqual({ time: 2.5, x: 2, y: 3 });
    expect(positionAt(samples, 4)).toEqual({ time: 4, x: 6, y: 2 });
  });
  it('returns exact samples and clamps at both endpoints without extrapolation', () => {
    expect(positionAt(samples, -10)).toEqual(samples[0]);
    expect(positionAt(samples, 2)).toEqual(samples[0]);
    expect(positionAt(samples, 3)).toEqual(samples[1]);
    expect(positionAt(samples, 7)).toEqual(samples[2]);
    expect(positionAt(samples, 100)).toEqual(samples[2]);
  });
  it('does not overflow coordinate differences for large finite endpoints', () => {
    expect(positionAt([{ time: 0, x: -1e308, y: 1e308 }, { time: 1, x: 1e308, y: -1e308 }], .5)).toEqual({ time: .5, x: 0, y: 0 });
  });
  it('handles differing start times and durations on a shared timeline', () => {
    const later = [{ time: 4, x: 9, y: 1 }, { time: 10, x: 15, y: 7 }];
    expect(getTimeline([track(samples), track(later)])).toEqual({ start: 2, end: 10 });
    expect(positionAt(later, 2)).toEqual(later[0]);
    expect(positionAt(samples, 9)).toEqual(samples[2]);
    expect(getTimeline([])).toBeNull();
  });
});

describe('playback clock', () => {
  const timeline = { start: 2, end: 10 };
  it('advances by elapsed seconds independently of frame count', () => {
    expect(advanceTime(3, 2500, timeline)).toEqual({ time: 5.5, ended: false });
    expect(advanceTime(5.5, 500, timeline)).toEqual(advanceTime(3, 3000, timeline));
  });
  it('caps time and signals completion exactly at the end', () => {
    expect(advanceTime(3, 7000, timeline)).toEqual({ time: 10, ended: true });
    expect(advanceTime(3, 9000, timeline)).toEqual({ time: 10, ended: true });
    expect(advanceTime(3, -5000, timeline)).toEqual({ time: 2, ended: false });
  });
});
