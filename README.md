# PathReplay

**Visualize and replay 2D trajectories from CSV files.**

PathReplay is a lightweight, browser-based viewer for comparing motion over time. Load a CSV, choose up to two trajectories, and use the timeline to see how their positions change. Everything runs in your browser.

**[Try the live demo](https://tohrusu.github.io/PathReplay/)**

## Features

- **CSV import:** Open a local file in a generic `time,x,y` format or the native format from [Autonomous Tractor Navigation Simulation](https://github.com/TohruSu/autonomous-tractor-navigation-sim).
- **Side-by-side comparison:** Select one or two trajectories, with equal X/Y scale and distinct line styles.
- **Replay controls:** Play at 1× speed, pause, reset, or seek to any point on the timeline.
- **Built-in demo:** Explore two sample paths immediately, without preparing a file.

Data stays in the browser; there is no account or server upload.

## Getting started

Open the [live application](https://tohrusu.github.io/PathReplay/) and select **Load Demo** or **Import CSV**.

After importing a file, choose the paths you want to compare. Simulator exports are organized by scenario and controller. Select up to two trajectories; deselect one to choose another.

Use **Play**, **Pause**, **Reset**, or the time slider to explore movement. Seeking pauses playback, and changing the dataset, scenario, or selection restarts the timeline. An invalid import leaves your previous dataset available.

## CSV formats

Files should be comma-delimited UTF-8 CSV with a header row. Quoted fields, escaped quotes, CRLF/LF endings, a UTF-8 BOM, and scientific notation are supported. Headers are case-sensitive; whitespace around headers and values is trimmed.

### Generic trajectories

Required columns: `time,x,y`. Add an optional `track` column to group multiple paths:

```csv
time,x,y,track
0,0,0,Path A
1,2,3,Path A
0,0,1,Path B
1.5,3,4,Path B
```

Without `track`, the file represents one trajectory. Time is measured in seconds, while X and Y use the units of your data. Rows for different tracks can be interleaved.

### Tractor simulator exports

Required columns: `scenario,controller,time_s,x_m,y_m`.

```csv
scenario,controller,step,time_s,x_m,y_m,heading_rad,speed_mps,requested_steering_rad,applied_steering_rad,cross_track_error_m,progress_m
turn,Controller A,0,0,0,0,0,2,0,0,0,0
turn,Controller A,1,0.1,0.2,0.01,0.1,2,0.2,0.1,0.01,0.2
```

Import the simulator's `samples.csv` file. PathReplay groups rows by `(scenario, controller)`, displays coordinates in meters, and ignores additional exporter columns. See the simulator's [CSV exporter](https://github.com/TohruSu/autonomous-tractor-navigation-sim/blob/main/src/TractorNavigation.Cli/CsvExport.cs) for the native format.

### File limits and validation

| Limit | Value |
| --- | --- |
| File size | 5 MiB |
| Data rows | 50,000 across all paths |
| Trajectories | 200 per file |
| Visible trajectories | 2 at a time |

Each trajectory needs at least two samples with strictly increasing timestamps. Coordinates and timestamps must be finite numbers. Rows must match the header's field count; column names and trajectory identifiers must be nonempty and unique where applicable. Empty lines are skipped.

Invalid data produces a descriptive error without replacing the current dataset.

## Playback and plotting

Playback follows the timestamps in the selected paths and interpolates linearly between samples. Markers remain at their endpoints outside each path's recorded time range. The SVG plot fits the selected trajectories automatically while preserving equal X/Y scale.

Axis tick precision adapts to the plotted range. When large coordinates are close together, labeled offsets keep the axes readable. Position and time readouts use compact formatting.

The bundled [demo CSV](src/demo.csv) contains two synthetic paths sampled at different intervals over 12 seconds.

## Run locally

Requires Node.js 22.12 or newer and npm.

```sh
npm ci
npm run dev
```

Vite prints the local development URL. To run tests and preview a production build:

```sh
npm test
npm run build
npm run preview
```

`npm run test:watch` starts Vitest in watch mode. The built site is written to `dist/`.

### GitHub Pages

The [live application](https://tohrusu.github.io/PathReplay/) is deployed from `main` using [GitHub Actions](.github/workflows/deploy.yml). To set up Pages in a fork, choose **Settings → Pages → Build and deployment → GitHub Actions**. The workflow builds and deploys `dist/` automatically.

## Project structure

- `src/data.ts` — CSV parsing, grouping, and validation with Papa Parse.
- `src/playback.ts` and `src/usePlayback.ts` — interpolation and playback timing.
- `src/plot.ts` and `src/TrajectoryPlot.tsx` — equal-scale SVG plotting.
- `src/App.tsx`, `src/Replay.tsx`, and `src/styles.css` — application interface and controls.
- `src/*.test.ts` — automated tests with Vitest.

## Notes

PathReplay supports one file at a time, a fixed 1× playback speed, and automatic plot fitting rather than manual pan or zoom. Very large files can briefly occupy the main thread. Numeric readouts are rounded, and extremely large timestamps remain subject to JavaScript floating-point precision. Playback may continue advancing while the browser tab is in the background.

## License

[MIT](LICENSE)
