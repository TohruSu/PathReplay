import type { Sample, Trajectory } from './data';

export interface Timeline { start: number; end: number }

export function getTimeline(tracks: Trajectory[]): Timeline | null {
  if (!tracks.length) return null;
  return {
    start: Math.min(...tracks.map((track) => track.samples[0].time)),
    end: Math.max(...tracks.map((track) => track.samples.at(-1)!.time)),
  };
}

// Binary search keeps replay independent of sample count and sampling interval.
// Outside a track's own time range the marker stays at its nearest endpoint.
export function positionAt(samples: Sample[], time: number): Sample {
  if (time <= samples[0].time) return samples[0];
  if (time >= samples.at(-1)!.time) return samples.at(-1)!;
  let low = 0;
  let high = samples.length - 1;
  while (high - low > 1) {
    const middle = Math.floor((low + high) / 2);
    if (samples[middle].time <= time) low = middle;
    else high = middle;
  }
  const a = samples[low];
  const b = samples[high];
  const ratio = (time - a.time) / (b.time - a.time);
  return {
    time,
    x: a.x * (1 - ratio) + b.x * ratio,
    y: a.y * (1 - ratio) + b.y * ratio,
  };
}

export function advanceTime(startTime: number, elapsedMs: number, timeline: Timeline): { time: number; ended: boolean } {
  const time = Math.min(timeline.end, Math.max(timeline.start, startTime + elapsedMs / 1000));
  return { time, ended: time >= timeline.end };
}
