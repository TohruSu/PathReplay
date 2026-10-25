import { useCallback, useEffect, useRef, useState } from 'react';
import { advanceTime, type Timeline } from './playback';

export function usePlayback(timeline: Timeline) {
  const [time, setTime] = useState(timeline.start);
  const [playing, setPlaying] = useState(false);
  const timeRef = useRef(time);
  const updateTime = useCallback((value: number) => {
    timeRef.current = value;
    setTime(value);
  }, []);

  useEffect(() => {
    if (!playing) return;
    const anchor = performance.now();
    const start = timeRef.current;
    let lastPaint = anchor;
    let frame = 0;
    const tick = (now: number) => {
      const next = advanceTime(start, now - anchor, timeline);
      if (now - lastPaint >= 1000 / 30 || next.ended) {
        updateTime(next.time);
        lastPaint = now;
      }
      if (next.ended) setPlaying(false);
      else frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, timeline, updateTime]);

  const toggle = () => {
    if (!playing && timeRef.current >= timeline.end) updateTime(timeline.start);
    setPlaying((value) => !value);
  };
  const seek = (value: number) => {
    setPlaying(false);
    updateTime(Math.max(timeline.start, Math.min(timeline.end, value)));
  };
  const reset = () => seek(timeline.start);
  return { time, playing, toggle, seek, reset };
}
