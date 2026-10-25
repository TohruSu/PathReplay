import { useMemo } from 'react';
import type { Trajectory } from './data';
import { formatNumber } from './format';
import Icon from './Icon';
import { getTimeline, positionAt } from './playback';
import TrajectoryPlot, { TRACK_COLORS } from './TrajectoryPlot';
import { usePlayback } from './usePlayback';

export default function Replay({ tracks, native }: { tracks: Trajectory[]; native: boolean }) {
  const timeline = useMemo(() => getTimeline(tracks)!, [tracks]);
  const { time, playing, toggle, seek, reset } = usePlayback(timeline);
  const progress = (time - timeline.start) / (timeline.end - timeline.start) * 100;
  return <>
    <section className="canvas-card" aria-label="Trajectory visualization">
      <div className="canvas-toolbar">
        <div><span className={`status-dot ${playing ? 'live' : ''}`} /><span>{playing ? 'Playing' : time >= timeline.end ? 'Replay complete' : 'Ready to replay'}</span></div>
        <span className="canvas-note">2D view <span>·</span> Equal X / Y scale</span>
      </div>
      <TrajectoryPlot tracks={tracks} time={time} native={native} />
      <div className="plot-legend">
        {tracks.map((track, i) => <span key={track.id}><i style={{ borderColor: TRACK_COLORS[i], borderStyle: i ? 'dashed' : 'solid' }} />{track.label}</span>)}
        <span className="marker-key"><i />Current position</span>
      </div>
    </section>

    <section className="playback-card" aria-label="Playback controls">
      <div className="playback-top">
        <div className="transport">
          <button className="button primary play-button" onClick={toggle}><Icon name={playing ? 'pause' : 'play'} size={16} />{playing ? 'Pause' : 'Play'}</button>
          <button className="button reset-button" onClick={reset}><Icon name="reset" size={16} />Reset</button>
        </div>
        <div className="time-display"><span className="eyebrow">TIME</span><strong>{formatNumber(time)}<small> s</small></strong><span className="time-end">/ {formatNumber(timeline.end)} s</span></div>
        <span className="speed-tag">1× <span>speed</span></span>
      </div>
      <label className="sr-only" htmlFor="timeline">Replay time in seconds</label>
      <input id="timeline" className="timeline" type="range" min={timeline.start} max={timeline.end} step={(timeline.end - timeline.start) / 1000 || Number.MIN_VALUE} value={time} onChange={(event) => seek(Number(event.target.value))} aria-valuetext={`${formatNumber(time)} seconds`} style={{ background: `linear-gradient(to right, var(--accent) ${progress}%, #e5ebed ${progress}%)` }} />
      <div className="timeline-labels"><span>{formatNumber(timeline.start)} s</span><span>Drag to explore the timeline</span><span>{formatNumber(timeline.end)} s</span></div>
    </section>

    <section className="position-section" aria-label="Current positions">
      <div className="section-caption"><h3>Current positions</h3><span>Linearly interpolated · {native ? 'meters' : 'CSV coordinates'}</span></div>
      <div className="position-grid">
        {tracks.map((track, i) => {
          const point = positionAt(track.samples, time);
          const first = track.samples[0];
          const last = track.samples.at(-1)!;
          return <div className="position-card" key={track.id}>
            <div className="position-name"><span className="track-dot" style={{ background: TRACK_COLORS[i] }} /><strong>{track.label}</strong><span className="range-status">{time < first.time ? 'Waiting at start' : time >= last.time ? 'At end' : 'On track'}</span></div>
            <div className="coordinates"><span>X <strong>{formatNumber(point.x)}</strong></span><span>Y <strong>{formatNumber(point.y)}</strong></span></div>
          </div>;
        })}
      </div>
    </section>
  </>;
}
