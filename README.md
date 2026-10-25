# PathReplay

A small, browser-based viewer for comparing and replaying 2D trajectories from local CSV files. React, TypeScript, Vite, and SVG; client-side only.

## Run locally

Requires Node.js 22.12 or newer and npm.

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. For a production build:

```sh
npm test
npm run build
npm run preview
```

`npm test` runs the focused Vitest suite once. `npm run test:watch` starts watch mode. CI installs with `npm ci`, runs the tests, and builds the app. The production files are in `dist/` and can be served by an ordinary static HTTP server.

## GitHub Pages

In the GitHub repository, select **Settings > Pages > Build and deployment > Source > GitHub Actions**. The `Deploy GitHub Pages` workflow builds with Node 22 and `npm ci` / `npm run build`, uploads `dist/`, and deploys through the `github-pages` environment on pushes to `main`. To run it manually, choose **Actions > Deploy GitHub Pages > Run workflow** on `main`. The deployment job reports the site URL. Relative assets support a repository subpath such as `/PathReplay/`; no `gh-pages` branch or committed build output is needed. See [GitHub's custom Pages workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## Use

1. Choose **Load Demo** for an immediate example, or **Import CSV** to open one local file.
2. For simulator data, select a scenario. Choose one or two trajectories using the checkboxes. Uncheck a selected path before choosing a third.
3. **Play** follows the timestamps at 1× speed. **Pause** holds the current time; **Reset** returns to the start. Drag the time slider or use its arrow keys to seek. Seeking pauses playback.
4. Read current coordinates below the plot. Changing a scenario, selection, or dataset resets playback. A failed import keeps the previous dataset available.

Files are read in your browser, with no uploads, telemetry, remote fonts, backend, accounts, or persistent storage. Refreshing the page clears the loaded data.

## CSV formats

CSV files must be comma-delimited UTF-8 text with a header row. Quoted values, escaped quotes, CRLF/LF line endings, scientific notation, and a UTF-8 BOM are supported. Surrounding whitespace in headers, names, and numeric values is ignored; column names are case-sensitive. Completely empty lines are ignored. Other malformed rows are rejected.

### Generic

Required columns: `time,x,y`. Optional: `track`. Additional columns are ignored.

```csv
time,x,y,track
0,0,0,Path A
1,2,3,Path A
0,0,1,Path B
1.5,3,4,Path B
```

Without `track`, the entire file is one trajectory. With `track`, samples are grouped by the nonempty track name, in their original order. Time values are interpreted as seconds; X/Y units are whatever the CSV uses, with equal scale on both axes.

### Tractor simulator

Required columns: `scenario,controller,time_s,x_m,y_m`.

```csv
scenario,controller,step,time_s,x_m,y_m,heading_rad,speed_mps,requested_steering_rad,applied_steering_rad,cross_track_error_m,progress_m
turn,Controller A,0,0,0,0,0,2,0,0,0,0
turn,Controller A,1,0.1,0.2,0.01,0.1,2,0.2,0.1,0.01,0.2
```

Use **samples.csv**, not summary.csv, from [Autonomous Tractor Navigation Simulation](https://github.com/TohruSu/autonomous-tractor-navigation-sim). The header is compatible with its [CSV exporter](https://github.com/TohruSu/autonomous-tractor-navigation-sim/blob/main/src/TractorNavigation.Cli/CsvExport.cs). Samples are grouped by the pair `(scenario, controller)`; runs in different scenarios remain separate. Extra exporter columns are ignored. Coordinates are displayed in meters. No reference route is inferred or generated.

### Validation and limits

- Maximum **5 MiB** (5,242,880 bytes) and **50,000 data rows**, across all trajectories. Parsing happens on the main thread; these limits bound the work and SVG size.
- Maximum **200 trajectories per file**, including unselected trajectories. Generic files count distinct `track` groups; native files count distinct `(scenario, controller)` pairs across all scenarios. Files over this limit are rejected; export fewer groups.
- Every trajectory must contain at least two samples, including trajectories not currently selected.
- All timestamps and coordinates must be finite decimal numbers. Blank values, NaN, Infinity, and hexadecimal values are rejected.
- Timestamps must be strictly increasing within each trajectory in the input order. Rows may interleave trajectories. No sorting, deduplication, or repair is performed.
- All rows must have the same number of fields as the header. Duplicate/blank column names and blank scenario/controller/track names are rejected.
- A time range whose subtraction exceeds the finite numeric range is rejected.

Errors identify the relevant field, trajectory, or data row when available. Data-row numbers count parsed nonempty records after the header, not physical lines inside quoted fields.

## Demo

[src/demo.csv](src/demo.csv) is a small, deterministic, explicitly **synthetic** example with two paths and different sampling intervals over 12 seconds. It is bundled with the app and downloadable from the format guide on desktop. It contains no vehicle measurements and was not generated by the tractor simulator.

## Replay behavior

The timeline spans the earliest start through the latest end of the selected paths. Playback uses elapsed wall-clock time through `requestAnimationFrame`, with UI updates capped at roughly 30 fps. Position is linearly interpolated between adjacent timestamps using binary search. Before a path starts or after it ends, its marker stays at the corresponding endpoint; it never extrapolates. Playback stops at the timeline end. Pressing Play again starts over. No automatic time synchronization is applied.

The SVG automatically fits the selected paths with padding and preserves equal X/Y scale. Solid teal and dashed violet distinguish the paths. Static path geometry is memoized separately from the changing markers and coordinate readouts.

Axis label precision follows tick spacing. Close coordinates with a large shared value use an explicitly labeled offset; add that offset to the tick label to recover the coordinate. Position and time readouts retain up to three decimal places below a magnitude of 10¹², including large absolute timestamps. Very large values use up to 15 significant digits in scientific notation; magnitudes below 0.001 use three significant digits.

## Project layout

- `src/data.ts`: CSV parsing, grouping, limits, and validation (Papa Parse).
- `src/playback.ts`, `src/usePlayback.ts`: interpolation, timeline, and animation clock.
- `src/plot.ts`, `src/TrajectoryPlot.tsx`: equal-scale SVG geometry and rendering.
- `src/App.tsx`, `src/Replay.tsx`, `src/styles.css`: import, selection, responsive interface, and playback controls.
- `src/*.test.ts`: parser, interpolation, playback clock, and geometry checks (Vitest).

## Known limitations

One file at a time, up to two visible trajectories, linear interpolation, and fixed 1× playback. Units are inferred only for the native tractor schema. The plot fits automatically and has no manual pan/zoom. Large files near the limits can briefly occupy the main thread. Readouts round for readability; changes below their displayed precision may not be visible. All calculations retain JavaScript floating-point precision, so extremely large absolute timestamps can still lose subsecond precision. The timeline is based on elapsed time, so playback may advance while a browser tab is in the background. There are no maps, metrics, exports, time alignment, or saved sessions.

## License

[MIT](LICENSE)
