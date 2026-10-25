import { memo, useEffect, useMemo, useRef, useState } from 'react';
import type { Trajectory } from './data';
import { formatAxisTicks, formatNumber } from './format';
import { positionAt } from './playback';
import { createPlot } from './plot';

export const TRACK_COLORS = ['#087f74', '#7a60cf'];
type Geometry = ReturnType<typeof createPlot>;

const StaticPlot = memo(function StaticPlot({ tracks, geometry, native }: {
  tracks: Trajectory[]; geometry: Geometry; native: boolean;
}) {
  const { box, height } = geometry;
  const xAxis = formatAxisTicks(geometry.xTicks.map((tick) => tick.value));
  const yAxis = formatAxisTicks(geometry.yTicks.map((tick) => tick.value));
  return <>
    {yAxis.offsetLabel && <text className="axis-offset" x={box.left} y={box.top - 12}>Y {yAxis.offsetLabel}</text>}
    <rect x={box.left} y={box.top} width={box.width} height={box.height} fill="#fbfcfd" />
    {geometry.xTicks.map((tick, i) => <g key={i}>
      <line className="grid-line" x1={tick.pixel} x2={tick.pixel} y1={box.top} y2={box.top + box.height} />
      <text className="tick" x={tick.pixel} y={box.top + box.height + 25} textAnchor="middle">{xAxis.labels[i]}</text>
    </g>)}
    {geometry.yTicks.map((tick, i) => <g key={i}>
      <line className="grid-line" x1={box.left} x2={box.left + box.width} y1={tick.pixel} y2={tick.pixel} />
      <text className="tick" x={box.left - 14} y={tick.pixel + 4} textAnchor="end">{yAxis.labels[i]}</text>
    </g>)}
    <path className="axis-line" d={`M${box.left},${box.top}V${box.top + box.height}H${box.left + box.width}`} />
    <text className={`axis-label ${xAxis.offsetLabel ? 'with-offset' : ''}`} x={box.left + box.width / 2} y={height - 17} textAnchor="middle">{native ? 'X (m)' : 'X coordinate'}{xAxis.offsetLabel && ` (${xAxis.offsetLabel})`}</text>
    <text className="axis-label" transform={`translate(17 ${box.top + box.height / 2}) rotate(-90)`} textAnchor="middle">{native ? 'Y (m)' : 'Y coordinate'}</text>
    {tracks.map((track, i) => <g key={track.id}>
      <path d={geometry.paths[i]} fill="none" stroke={TRACK_COLORS[i]} strokeWidth="2.8" strokeDasharray={i ? '8 5' : undefined} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={geometry.x(track.samples[0].x)} cy={geometry.y(track.samples[0].y)} r="3.5" fill="white" stroke={TRACK_COLORS[i]} strokeWidth="1.8" />
    </g>)}
  </>;
});

export default function TrajectoryPlot({ tracks, time, native }: {
  tracks: Trajectory[]; time: number; native: boolean;
}) {
  const svg = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState(960);
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(300, Math.round(entry.contentRect.width))));
    observer.observe(svg.current!);
    return () => observer.disconnect();
  }, []);
  const height = width < 600 ? 300 : width * 530 / 960;
  const geometry = useMemo(() => createPlot(tracks, width, height), [tracks, width, height]);
  return <svg ref={svg} className="trajectory-plot" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`2D plot of ${tracks.map((track) => track.label).join(' and ')}. X and Y use equal scale.`}>
    <StaticPlot tracks={tracks} geometry={geometry} native={native} />
    {tracks.map((track, i) => {
      const point = positionAt(track.samples, time);
      return <g key={track.id} className="position-marker" transform={`translate(${geometry.x(point.x)} ${geometry.y(point.y)})`}>
        <circle r="12" fill={TRACK_COLORS[i]} opacity="0.12" />
        <circle r="6" fill={TRACK_COLORS[i]} stroke="white" strokeWidth="2.5" />
        <title>{track.label}: X {formatNumber(point.x)}, Y {formatNumber(point.y)}</title>
      </g>;
    })}
  </svg>;
}
