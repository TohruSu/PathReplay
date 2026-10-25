const readoutFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 3 });

function scientific(value: number, digits: number): string {
  if (value === 0) return '0';
  return value.toExponential(digits).replace(/\.?0+e/, 'e');
}

export function formatNumber(value: number): string {
  if (Object.is(value, -0) || value === 0) return '0';
  if (Math.abs(value) >= 1e12) return scientific(value, 14);
  if (Math.abs(value) < 0.001) return value.toExponential(2);
  return readoutFormat.format(value);
}

// Precision follows tick spacing, rather than the magnitude of the coordinates.
// A labeled common offset keeps close, large coordinates readable on small plots.
export function formatAxisTicks(values: number[]): { labels: string[]; offsetLabel: string } {
  if (!values.length) return { labels: [], offsetLabel: '' };
  const gaps = values.slice(1).map((value, i) => Math.abs(value - values[i])).filter((gap) => gap > 0 && Number.isFinite(gap));
  const spacing = gaps.length ? Math.min(...gaps) : 1;
  const center = values[Math.floor(values.length / 2)];
  const offset = Math.abs(center) >= 1000 && Math.abs(center) / spacing >= 100 ? Math.trunc(center) : 0;
  const relative = values.map((value) => value - offset);
  const magnitude = Math.max(...relative.map(Math.abs));
  const exponential = magnitude >= 1e4 || (magnitude > 0 && magnitude < 0.001);
  const digits = Math.min(15, Math.max(0, Math.ceil((exponential ? Math.floor(Math.log10(magnitude)) : 0) - Math.log10(spacing)) + 2));
  const decimal = new Intl.NumberFormat('en-US', { maximumFractionDigits: digits });
  let labels = relative.map((value) => (exponential ? scientific(value, digits) : decimal.format(value)).replace(/^-0(?:\.0+)?$/, '0'));
  // At the edge of floating-point precision, retain distinct representable ticks.
  if (new Set(labels).size < new Set(relative).size) labels = relative.map((value) => value.toString());
  return { labels, offsetLabel: offset ? `offset ${offset > 0 ? '+' : ''}${offset}` : '' };
}
