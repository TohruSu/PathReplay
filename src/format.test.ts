import { describe, expect, it } from 'vitest';
import type { Trajectory } from './data';
import { formatAxisTicks, formatNumber } from './format';
import { createPlot } from './plot';

describe('numeric readouts', () => {
  it('preserves ordinary rounding, zero, negative values, and small scientific values', () => {
    expect([0, -0, 12.34567, -2.5, 0.001, 0.0001234].map(formatNumber))
      .toEqual(['0', '0', '12.346', '-2.5', '0.001', '1.23e-4']);
  });

  it('keeps changing UTM-like positions and absolute timestamps distinct at millisecond precision', () => {
    expect([500000, 500000.125, 4000000, 4000000.125].map(formatNumber))
      .toEqual(['500,000', '500,000.125', '4,000,000', '4,000,000.125']);
    expect([1730000000, 1730000000.033, 1730000000.067].map(formatNumber))
      .toEqual(['1,730,000,000', '1,730,000,000.033', '1,730,000,000.067']);
  });

  it('uses bounded scientific readouts for extreme magnitudes without hiding ordinary large values', () => {
    expect(formatNumber(1e12)).toBe('1e+12');
    expect(formatNumber(1e12 + 100)).toBe('1.0000000001e+12');
    expect(formatNumber(1e308).length).toBeLessThan(24);
  });
});

describe('axis labels', () => {
  it('distinguishes close ticks near 1234–1236 without displaying floating-point noise', () => {
    const axis = formatAxisTicks([1234, 1234.4, 1234.8, 1235.2, 1235.6, 1236]);
    expect(axis.offsetLabel).toBe('offset +1235');
    expect(axis.labels).toEqual(['-1', '-0.6', '-0.2', '0.2', '0.6', '1']);
    const close = formatAxisTicks([500000, 500000.0001, 500000.0002]);
    expect(close.labels).toEqual(['0', '1e-4', '2e-4']);
  });

  it('formats ordinary axes and wide scientific ranges without negative zero', () => {
    expect(formatAxisTicks([-2.5, 0, 2.5]).labels).toEqual(['-2.5', '0', '2.5']);
    expect(formatAxisTicks([-7.65, 9.06666667, 25.78333333, 42.5]).labels).toEqual(['-7.7', '9.1', '25.8', '42.5']);
    const wide = formatAxisTicks([-1e6, 0, 1e6]);
    expect(wide.offsetLabel).toBe('');
    expect(wide.labels).toEqual(['-1e+6', '0', '1e+6']);
    expect(formatAxisTicks([-1e-17, 1, 2]).labels[0]).toBe('0');
  });

  it.each([
    { x: 1234, y: 0 },
    { x: 500000, y: 4000000 },
    { x: 1730000000, y: 4000000 },
  ])('keeps actual desktop and mobile ticks distinct and compact around $x / $y', ({ x, y }) => {
    const trajectory: Trajectory = { id: 'A', label: 'A', scenario: null,
      samples: [{ time: 0, x, y }, { time: 1, x: x + 2, y: y + 1 }] };
    for (const [width, height] of [[960, 530], [320, 300]]) {
      const geometry = createPlot([trajectory], width, height);
      for (const ticks of [geometry.xTicks, geometry.yTicks]) {
        const axis = formatAxisTicks(ticks.map((tick) => tick.value));
        expect(new Set(axis.labels).size).toBe(ticks.length);
        expect(axis.labels.every((label) => label.length <= 7)).toBe(true);
      }
    }
  });
});
