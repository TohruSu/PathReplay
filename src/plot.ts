import type { Trajectory } from './data';

export const PLOT = { left: 76, top: 32, width: 840, height: 424 };

// Normalize before subtracting so finite, very large coordinates remain drawable.
export function createPlot(tracks: Trajectory[], width = 960, height = 530) {
  const box = { left: width < 600 ? 66 : PLOT.left, top: PLOT.top, width: 0, height: height - 106 };
  box.width = width - box.left - (width < 600 ? 24 : 44);
  let scale = 0;
  for (const track of tracks) {
    for (const point of track.samples) scale = Math.max(scale, Math.abs(point.x), Math.abs(point.y));
  }
  scale ||= 1;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const track of tracks) {
    for (const point of track.samples) {
      minX = Math.min(minX, point.x / scale);
      maxX = Math.max(maxX, point.x / scale);
      minY = Math.min(minY, point.y / scale);
      maxY = Math.max(maxY, point.y / scale);
    }
  }
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const span = Math.max((maxX - minX) / box.width, (maxY - minY) / box.height) * 1.18 || 1 / box.height;
  const x = (value: number) => box.left + box.width / 2 + (value / scale - centerX) / span;
  const y = (value: number) => box.top + box.height / 2 - (value / scale - centerY) / span;
  const xIntervals = width < 600 ? 3 : 6;
  const xTicks = Array.from({ length: xIntervals + 1 }, (_, i) => ({
    pixel: box.left + i * box.width / xIntervals,
    value: (centerX + (i / xIntervals - 0.5) * box.width * span) * scale,
  })).filter((tick) => Number.isFinite(tick.value));
  const yTicks = Array.from({ length: 5 }, (_, i) => ({
    pixel: box.top + i * box.height / 4,
    value: (centerY + (0.5 - i / 4) * box.height * span) * scale,
  })).filter((tick) => Number.isFinite(tick.value));
  const paths = tracks.map((track) => track.samples.map((point, i) =>
    `${i ? 'L' : 'M'}${x(point.x).toFixed(3)},${y(point.y).toFixed(3)}`).join(' '));
  return { x, y, xTicks, yTicks, paths, box, width, height };
}
