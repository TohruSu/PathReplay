import { describe, expect, it } from 'vitest';
import demo from './demo.csv?raw';
import { MAX_FILE_BYTES, MAX_SAMPLES, MAX_TRAJECTORIES, parseCsv } from './data';

describe('CSV schemas and grouping', () => {
  it('reads a generic single trajectory, BOM, CRLF, whitespace, scientific notation, and extra columns', () => {
    const data = parseCsv('\uFEFF time ,x,y,note\r\n-1,1e2,-2.5,"a,b"\r\n\r\n0,3,4,ignored\r\n');
    expect(data.format).toBe('generic');
    expect(data.trajectories).toHaveLength(1);
    expect(data.trajectories[0].samples).toEqual([{ time: -1, x: 100, y: -2.5 }, { time: 0, x: 3, y: 4 }]);
  });

  it('groups interleaved tracks, parses escaped quotes and multiline values, and preserves sample order', () => {
    const data = parseCsv('time,x,y,track\n0,1,2,"Path, ""A"""\n3,5,6,"Path\nB"\n2,7,8,"Path, ""A"""\n4,9,10,"Path\nB"');
    expect(data.trajectories.map((track) => track.label)).toEqual(['Path, "A"', 'Path\nB']);
    expect(data.trajectories[0].samples.map((point) => point.time)).toEqual([0, 2]);
    expect(data.sampleCount).toBe(4);
  });

  it('groups native exporter rows by both scenario and controller, ignoring extras', () => {
    const header = 'scenario,controller,step,time_s,x_m,y_m,heading_rad,speed_mps,requested_steering_rad,applied_steering_rad,cross_track_error_m,progress_m';
    const rows = ['north,A,0,0,0,0,0,2,0,0,0,0', 'north,B,0,1,2,3,0,2,0,0,0,0', 'south,A,0,0,4,5,0,2,0,0,0,0', 'north,A,1,0.1,1,2,0,2,0,0,0,0', 'north,B,1,2,3,4,0,2,0,0,0,0', 'south,A,1,1,5,6,0,2,0,0,0,0'];
    const data = parseCsv([header, ...rows].join('\n'));
    expect(data.format).toBe('tractor');
    expect(data.scenarios).toEqual(['north', 'south']);
    expect(data.trajectories.map((track) => [track.scenario, track.label, track.samples.length])).toEqual([['north', 'A', 2], ['north', 'B', 2], ['south', 'A', 2]]);
  });

  it('uses unambiguous pair identities when scenario and controller names contain separators', () => {
    const data = parseCsv('scenario,controller,time_s,x_m,y_m\na:b,c,0,0,0\na:b,c,1,1,1\na,b:c,0,0,0\na,b:c,1,1,1');
    expect(new Set(data.trajectories.map((track) => track.id)).size).toBe(2);
  });

  it('bundles a valid deterministic demo with two sampling intervals', () => {
    const data = parseCsv(demo);
    expect(data.trajectories).toHaveLength(2);
    expect(data.trajectories.map((track) => track.samples.length)).toEqual([25, 16]);
    expect(data.trajectories.map((track) => track.samples.at(-1)!.time)).toEqual([12, 12]);
  });
});

describe('CSV validation', () => {
  it.each([
    ['', /empty/i],
    ['time,x\n0,1\n1,2', /time,x,y/],
    ['time,x,y\n', /no samples/],
    ['time,x,y\n0,1,2', /at least two/],
    ['time,x,y,x\n0,1,2,3\n1,2,3,4', /unique/],
    ['time,x,y,\n0,1,2,3', /nonempty/],
    ['time,x,y\n0,1\n1,2,3', /Data row 1.*expected 3 fields/],
    ['time,x,y\n0,1,2,3\n1,2,3', /found 4/],
    ['time,x,y\n0,1,2\n""\n1,2,3', /Data row 2.*expected 3 fields/],
    ['time,x,y,track\n0,1,2,\n1,2,3,', /names must not be blank/],
    ['scenario,controller,time_s,x_m,y_m\n,A,0,1,2\n,A,1,2,3', /scenario and controller/],
    ['time,x,y\n0,"1,2\n1,2,3', /CSV formatting error/],
  ])('rejects invalid structure: %s', (csv, message) => {
    expect(() => parseCsv(csv)).toThrow(message);
  });

  it.each(['', ' ', 'NaN', 'Infinity', '-Infinity', '0x10', '1e999', 'nope'])(
    'rejects malformed numeric data (%j) without dropping samples', (value) => {
      expect(() => parseCsv(`time,x,y\n0,1,2\n1,${value},3`)).toThrow(/Data row 2: "x" must be a finite decimal number/);
    },
  );

  it('validates native timestamps and coordinates with their original column names', () => {
    expect(() => parseCsv('scenario,controller,time_s,x_m,y_m\na,b,NaN,1,2\na,b,1,2,3')).toThrow(/"time_s"/);
    expect(() => parseCsv('scenario,controller,time_s,x_m,y_m\na,b,0,1,2\na,b,1,2,Infinity')).toThrow(/"y_m"/);
  });

  it.each([0, -1])('rejects duplicate or decreasing timestamps (%s)', (secondTime) => {
    expect(() => parseCsv(`time,x,y\n0,1,2\n${secondTime},2,3`)).toThrow(/strictly increasing/);
  });

  it('requires enough samples even in an unselected group', () => {
    expect(() => parseCsv('time,x,y,track\n0,1,2,A\n1,2,3,A\n0,4,5,B')).toThrow(/"B".*only one sample/);
  });

  it('rejects an overflowing timeline', () => {
    expect(() => parseCsv('time,x,y\n-1e308,0,0\n1e308,1,1')).toThrow(/time range too large/);
  });

  it('enforces byte and row limits and accepts the exact sample-count limit', () => {
    expect(() => parseCsv('x'.repeat(MAX_FILE_BYTES + 1))).toThrow(/5 MiB/);
    const rows = Array.from({ length: MAX_SAMPLES }, (_, i) => `${i},0,0`);
    const csv = ['time,x,y', ...rows].join('\n');
    expect(parseCsv(csv).sampleCount).toBe(MAX_SAMPLES);
    expect(() => parseCsv(`${csv}\n${MAX_SAMPLES},0,0`)).toThrow(/50,000/);
  });

  it.each(['generic', 'tractor'] as const)('accepts exactly 200 %s trajectory groups and rejects the 201st', (format) => {
    const header = format === 'generic' ? 'time,x,y,track' : 'scenario,controller,time_s,x_m,y_m';
    const rowsForGroup = (i: number) => format === 'generic'
      ? [`0,0,0,Track ${i}`, `1,1,1,Track ${i}`]
      : [`Scenario ${Math.floor(i / 2)},Controller ${i % 2},0,0,0`, `Scenario ${Math.floor(i / 2)},Controller ${i % 2},1,1,1`];
    const csv = [header, ...Array.from({ length: MAX_TRAJECTORIES }, (_, i) => rowsForGroup(i)).flat()].join('\n');
    const data = parseCsv(csv);
    expect(data.trajectories).toHaveLength(MAX_TRAJECTORIES);
    expect(data.sampleCount).toBe(MAX_TRAJECTORIES * 2);
    expect(() => parseCsv([csv, ...rowsForGroup(MAX_TRAJECTORIES)].join('\n')))
      .toThrow('This CSV exceeds the 200-trajectory limit. Export fewer tracks or scenario/controller groups.');
  });
});
