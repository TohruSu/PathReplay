import Papa from 'papaparse';

export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_SAMPLES = 50_000;
export const MAX_TRAJECTORIES = 200;

export interface Sample { time: number; x: number; y: number }
export interface Trajectory {
  id: string;
  label: string;
  scenario: string | null;
  samples: Sample[];
}
export interface Dataset {
  format: 'generic' | 'tractor';
  trajectories: Trajectory[];
  scenarios: string[];
  sampleCount: number;
}

const GENERIC = ['time', 'x', 'y'];
const TRACTOR = ['scenario', 'controller', 'time_s', 'x_m', 'y_m'];
const DECIMAL = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i;

function numeric(value: string, column: string, row: number): number {
  const trimmed = value.trim();
  const number = Number(trimmed);
  if (!DECIMAL.test(trimmed) || !Number.isFinite(number)) {
    throw new Error(`Data row ${row}: "${column}" must be a finite decimal number; received ${JSON.stringify(value)}.`);
  }
  return number;
}

export function parseCsv(csv: string): Dataset {
  if (new Blob([csv]).size > MAX_FILE_BYTES) {
    throw new Error('This CSV exceeds the 5 MiB limit. Export a smaller time range or fewer trajectories.');
  }
  // Read raw record boundaries so only truly blank lines are ignored. A quoted
  // empty record (""), for example, must still fail field-count validation.
  csv = csv.replace(/^\uFEFF/, '');
  const records: string[][] = [];
  let cursor = 0;
  let formattingError = '';
  let tooManyRows = false;
  Papa.parse<string[]>(csv, {
    delimiter: ',',
    skipEmptyLines: false,
    step(result, parser) {
      const rawRecord = csv.slice(cursor, result.meta.cursor);
      cursor = result.meta.cursor;
      if (result.errors.length) {
        formattingError = `CSV formatting error near record ${records.length + 1}: ${result.errors[0].message}. Check quotes and separators.`;
        parser.abort();
        return;
      }
      if (result.data.length === 1 && result.data[0] === '' && /^[\r\n]*$/.test(rawRecord)) return;
      records.push(result.data);
      if (records.length > MAX_SAMPLES + 1) {
        tooManyRows = true;
        parser.abort();
      }
    },
  });
  if (formattingError) throw new Error(formattingError);
  const [rawHeaders, ...rows] = records;
  if (!rawHeaders) throw new Error('The CSV is empty. Include a header and at least two samples.');
  const headers = rawHeaders.map((header) => header.trim());
  if (headers.some((header) => !header) || new Set(headers).size !== headers.length) {
    throw new Error('CSV column names must be nonempty and unique. Check the header row.');
  }
  const format = TRACTOR.every((key) => headers.includes(key)) ? 'tractor'
    : GENERIC.every((key) => headers.includes(key)) ? 'generic' : null;
  if (!format) {
    throw new Error('Unrecognized CSV columns. Use time,x,y (optional track), or scenario,controller,time_s,x_m,y_m. Column names are case-sensitive.');
  }
  if (tooManyRows) {
    throw new Error('This CSV exceeds the 50,000-sample limit. Export fewer rows.');
  }
  if (!rows.length) throw new Error('The CSV has a header but no samples. Include at least two samples per trajectory.');

  const index = Object.fromEntries(headers.map((header, i) => [header, i]));
  const groups = new Map<string, Trajectory>();
  rows.forEach((row, i) => {
    const dataRow = i + 1;
    if (row.length !== headers.length) {
      throw new Error(`Data row ${dataRow}: expected ${headers.length} fields, found ${row.length}. Check for missing fields or an unquoted comma.`);
    }
    const scenario = format === 'tractor' ? row[index.scenario].trim() : null;
    const label = format === 'tractor' ? row[index.controller].trim()
      : headers.includes('track') ? row[index.track].trim() : 'Trajectory';
    if (!label || scenario === '') {
      throw new Error(`Data row ${dataRow}: ${format === 'tractor' ? 'scenario and controller' : 'track'} names must not be blank.`);
    }
    const keys = format === 'tractor' ? ['time_s', 'x_m', 'y_m'] : GENERIC;
    const [time, x, y] = keys.map((key) => numeric(row[index[key]], key, dataRow));
    const id = JSON.stringify([scenario, label]);
    let trajectory = groups.get(id);
    if (!trajectory) {
      if (groups.size >= MAX_TRAJECTORIES) {
        throw new Error(`This CSV exceeds the ${MAX_TRAJECTORIES}-trajectory limit. Export fewer tracks or scenario/controller groups.`);
      }
      trajectory = { id, label, scenario, samples: [] };
      groups.set(id, trajectory);
    }
    const previous = trajectory.samples.at(-1);
    if (previous && time <= previous.time) {
      throw new Error(`Data row ${dataRow}, trajectory "${label}"${scenario ? ` in "${scenario}"` : ''}: timestamp ${time} must be greater than ${previous.time}. Keep samples in strictly increasing time order; duplicate times are not supported.`);
    }
    trajectory.samples.push({ time, x, y });
  });
  const trajectories = [...groups.values()];
  for (const trajectory of trajectories) {
    if (trajectory.samples.length < 2) {
      throw new Error(`Trajectory "${trajectory.label}"${trajectory.scenario ? ` in "${trajectory.scenario}"` : ''} has only one sample. Each trajectory needs at least two.`);
    }
    const duration = trajectory.samples.at(-1)!.time - trajectory.samples[0].time;
    if (!Number.isFinite(duration)) {
      throw new Error(`Trajectory "${trajectory.label}" has a time range too large to replay. Use smaller timestamp values.`);
    }
  }
  const start = Math.min(...trajectories.map((track) => track.samples[0].time));
  const end = Math.max(...trajectories.map((track) => track.samples.at(-1)!.time));
  if (!Number.isFinite(end - start)) throw new Error('The combined time range is too large to replay. Use smaller timestamp values.');
  return {
    format,
    trajectories,
    scenarios: [...new Set(trajectories.flatMap((track) => track.scenario === null ? [] : [track.scenario]))],
    sampleCount: rows.length,
  };
}
