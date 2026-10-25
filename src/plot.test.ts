import { expect, it } from 'vitest';
import type { Trajectory } from './data';
import { createPlot, PLOT } from './plot';

const track = (points: [number, number][]): Trajectory => ({
  id: 'A', label: 'A', scenario: null,
  samples: points.map(([x, y], time) => ({ time, x, y })),
});

it('preserves aspect ratio, fits all selected paths, and points positive Y upward', () => {
  const plot = createPlot([track([[0, 0], [100, 50]]), track([[-20, -30], [40, 70]])]);
  expect(plot.x(1) - plot.x(0)).toBeCloseTo(plot.y(0) - plot.y(1));
  expect(plot.x(-20)).toBeGreaterThan(PLOT.left);
  expect(plot.x(100)).toBeLessThan(PLOT.left + PLOT.width);
  expect(plot.y(70)).toBeGreaterThan(PLOT.top);
  expect(plot.y(-30)).toBeLessThan(PLOT.top + PLOT.height);
});

it('keeps equal coordinate scale and readable tick spacing on a narrow canvas', () => {
  const plot = createPlot([track([[0, 0], [100, 50]])], 360, 300);
  expect(plot.x(1) - plot.x(0)).toBeCloseTo(plot.y(0) - plot.y(1));
  expect(plot.xTicks).toHaveLength(4);
  expect(plot.x(100)).toBeLessThan(360);
  expect(plot.y(0)).toBeLessThan(300);
});

it.each(([ [[3, 3], [3, 3]], [[0, 0], [0, 0]], [[-1e308, 1e308], [1e308, -1e308]] ] as [number, number][][]).map((points) => ({ points })))(
  'renders stationary and extreme finite coordinates without NaN or Infinity: $points', ({ points }) => {
    const plot = createPlot([track(points)]);
    expect(plot.paths[0]).not.toMatch(/NaN|Infinity/);
    expect(Number.isFinite(plot.x(points[0][0]))).toBe(true);
    expect(Number.isFinite(plot.y(points[0][1]))).toBe(true);
  },
);
