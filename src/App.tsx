import { useMemo, useRef, useState } from 'react';
import { MAX_FILE_BYTES, parseCsv, type Dataset } from './data';
import demoCsv from './demo.csv?raw';
import demoUrl from './demo.csv?url';
import { formatNumber } from './format';
import Icon from './Icon';
import Replay from './Replay';
import { TRACK_COLORS } from './TrajectoryPlot';

export default function App() {
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [source, setSource] = useState('');
  const [isDemo, setIsDemo] = useState(false);
  const [scenario, setScenario] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadId, setLoadId] = useState(0);
  const [error, setError] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  const available = useMemo(() => dataset?.trajectories.filter((track) => dataset.format === 'generic' || track.scenario === scenario) ?? [], [dataset, scenario]);
  const selected = useMemo(() => selectedIds.flatMap((id) => {
    const track = available.find((candidate) => candidate.id === id);
    return track ? [track] : [];
  }), [available, selectedIds]);

  function load(csv: string, name: string, demo = false) {
    const next = parseCsv(csv);
    const initialScenario = next.scenarios[0] ?? '';
    const firstTracks = next.trajectories.filter((track) => next.format === 'generic' || track.scenario === initialScenario).slice(0, 2);
    setDataset(next);
    setLoadId((value) => value + 1);
    setSource(name);
    setIsDemo(demo);
    setScenario(initialScenario);
    setSelectedIds(firstTracks.map((track) => track.id));
    setError('');
  }

  async function importFile(file: File) {
    setLoading(true);
    setError('');
    try {
      if (file.size > MAX_FILE_BYTES) throw new Error('This file exceeds the 5 MiB limit. Export a smaller time range or fewer trajectories.');
      const csv = await file.text();
      load(csv, file.name);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The file could not be read. Try selecting it again.');
    } finally {
      setLoading(false);
    }
  }

  function selectScenario(value: string) {
    setScenario(value);
    setSelectedIds(dataset!.trajectories.filter((track) => track.scenario === value).slice(0, 2).map((track) => track.id));
  }

  return <div className="app-shell">
    <header className="app-header">
      <a className="brand" href="." aria-label="PathReplay home">
        <img src="./favicon.svg" alt="" width="38" height="38" /><span>PathReplay</span><span className="version">v0.1.0</span>
      </a>
      <div className="privacy-badge"><Icon name="shield" size={15} /><span>Local files. Private by default.</span></div>
    </header>

    <main>
      <div className="page-heading">
        <div><p className="eyebrow">A LITTLE PERSPECTIVE ON EVERY PATH</p><h1>See the path unfold.</h1><p>Import, compare, and replay your 2D trajectories.</p></div>
        <div className="header-actions">
          <button className="button" disabled={loading} onClick={() => load(demoCsv, 'synthetic-demo.csv', true)}>Load Demo<Icon name="arrow" size={16} /></button>
          <button className="button primary" disabled={loading} onClick={() => fileInput.current?.click()}><Icon name="upload" />{loading ? 'Reading CSV…' : 'Import CSV'}</button>
          <input className="sr-only" ref={fileInput} type="file" accept=".csv,text/csv" aria-label="Import local CSV file" tabIndex={-1} onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) void importFile(file);
          }} />
        </div>
      </div>

      {error && <div className="error-banner" role="alert"><div><strong>Couldn’t import this CSV</strong><p>{error}</p>{dataset && <small>Your previous dataset is still loaded.</small>}</div><button className="icon-button" aria-label="Dismiss import error" onClick={() => setError('')}><Icon name="close" /></button></div>}
      <div className="workspace" aria-busy={loading}>
        <aside className="sidebar">
          <section className="sidebar-card data-card">
            <div className="card-heading"><h2>Data source</h2><span className="step-label">01</span></div>
            {dataset ? <>
              <div className="source-file"><div className="file-icon"><Icon name="file" size={21} /></div><div><strong title={source}>{source}</strong><span>{dataset.sampleCount.toLocaleString()} samples · {dataset.trajectories.length} {dataset.format === 'tractor' ? dataset.trajectories.length === 1 ? 'controller run' : 'controller runs' : dataset.trajectories.length === 1 ? 'track' : 'tracks'}</span></div></div>
              <span className={`source-badge ${isDemo ? 'demo-badge' : ''}`}>{isDemo ? 'SYNTHETIC DEMO' : dataset.format === 'tractor' ? 'TRACTOR SIMULATOR CSV' : 'GENERIC CSV'}</span>
              {isDemo && <p className="sidebar-help">A deterministic illustration. These are synthetic paths, not vehicle measurements or simulator output.</p>}
              {dataset.format === 'tractor' && <div className="scenario-field"><label htmlFor="scenario">Scenario</label><select id="scenario" value={scenario} onChange={(event) => selectScenario(event.target.value)}>{dataset.scenarios.map((name) => <option key={name} value={name}>{name}</option>)}</select></div>}
            </> : <div className="source-empty"><div className="file-icon"><Icon name="file" size={23} /></div><strong>No file loaded</strong><p>Start with a CSV or explore the built-in demo.</p></div>}
          </section>

          <section className="sidebar-card">
            <div className="card-heading"><h2>Trajectories</h2><span className="step-label">02</span></div>
            <p className="sidebar-help selection-help">Choose one or two paths to replay.</p>
            {available.length ? <div className="track-list">{available.map((track) => {
              const selectedIndex = selectedIds.indexOf(track.id);
              const checked = selectedIndex !== -1;
              return <label className={`track-option ${checked ? 'selected' : ''}`} key={track.id}>
                <input type="checkbox" checked={checked} disabled={!checked && selectedIds.length >= 2} onChange={() => setSelectedIds((ids) => checked ? ids.filter((id) => id !== track.id) : [...ids, track.id])} />
                <span className="track-option-text"><strong>{track.label}</strong><span>{track.samples.length.toLocaleString()} samples · {formatNumber(track.samples[0].time)}–{formatNumber(track.samples.at(-1)!.time)} s</span></span>
                {checked && <span className="track-line" style={{ borderColor: TRACK_COLORS[selectedIndex], borderStyle: selectedIndex ? 'dashed' : 'solid' }} />}
              </label>;
            })}</div> : <div className="empty-track-list"><span /><span /><p>Your trajectories will appear here.</p></div>}
            {available.length > 2 && selectedIds.length === 2 && <p className="sidebar-help limit-hint">Uncheck a path to choose another.</p>}
          </section>

          <section className="format-guide">
            <h3>A simple CSV is all you need.</h3>
            <code>time,x,y,track<br />0,0,0,Path A<br />1,2,3,Path A</code>
            <p>The <code>track</code> column is optional. Tractor simulator <code>samples.csv</code> files work too.</p>
            <a href={demoUrl} download="pathreplay-synthetic-demo.csv">Download example CSV <Icon name="arrow" size={14} /></a>
            <span className="input-limit">Up to 5 MiB · 50,000 samples</span>
          </section>
        </aside>

        <div className="main-column">
          <div className="view-heading"><h2>Trajectory view</h2><span>{selected.length ? `${selected.length} ${selected.length === 1 ? 'path' : 'paths'} selected` : 'Your paths, in perspective'}</span></div>
          {selected.length ? <Replay key={JSON.stringify([loadId, selectedIds])} tracks={selected} native={dataset?.format === 'tractor'} /> : <section className="canvas-card empty-canvas">
            <div className="empty-grid" aria-hidden="true"><svg viewBox="0 0 400 220"><path d="M35 175C65 175 55 50 125 65S210 180 260 120 310 40 365 55" /><path d="M35 180C100 190 65 90 130 95S215 185 270 140 320 85 365 80" /><circle cx="35" cy="175" r="5" /><circle cx="365" cy="55" r="5" /></svg></div>
            <div className="empty-content"><span className="empty-kicker">FROM SAMPLES TO MOTION</span><h2>{dataset ? 'Choose a path to begin.' : 'Every path tells a story.'}</h2><p>{dataset ? 'Select one or two trajectories in the panel to see them here.' : 'Bring your CSV to life. Compare two trajectories and follow every turn, one moment at a time.'}</p>{!dataset && <button className="button primary" disabled={loading} onClick={() => load(demoCsv, 'synthetic-demo.csv', true)}>Explore the demo<Icon name="arrow" size={17} /></button>}<span className="empty-footnote">{dataset ? 'Selection resets the replay to its starting time.' : 'No setup. No uploads. Just your data.'}</span></div>
          </section>}
        </div>
      </div>
    </main>
    <footer><span>PathReplay <span className="footer-divider">/</span> Small tool. Clearer paths.</span><span>Processed in your browser · Nothing uploaded</span></footer>
  </div>;
}
