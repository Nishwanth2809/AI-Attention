export default function Chart({ samples = [], height = 150 }) {
  const width = 660, pad = 9;
  // Keep the SVG bounded even for a two-hour report.
  const step = Math.max(1, Math.ceil(samples.length / 180));
  const points = samples.filter((_, i) => i % step === 0 || i === samples.length - 1);
  const maxTime = Math.max(1000, samples.at(-1)?.elapsed || 1000);
  const coords = points.map(p => `${pad + (p.elapsed / maxTime) * (width - pad * 2)},${height - pad - p.score / 100 * (height - pad * 2)}`).join(' ');
  return <div className="chart-wrap">
    <div className="chart-scale"><span>100</span><span>50</span><span>0</span></div>
    <svg className="chart" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label={samples.length ? `Focus score timeline, ${samples.length} observations` : 'Your focus timeline will appear here'}>
      {[0, 50, 100].map(n => <line key={n} x1="0" x2={width} y1={height - pad - n / 100 * (height - pad * 2)} y2={height - pad - n / 100 * (height - pad * 2)} stroke="#e5e9e4" strokeDasharray="4 5"/>)}
      {points.length > 1 && <><polygon points={`${coords} ${pad + points.at(-1).elapsed / maxTime * (width - pad * 2)},${height - pad} ${pad + points[0].elapsed / maxTime * (width - pad * 2)},${height - pad}`} fill="#d6e9db" opacity=".6"/><polyline points={coords} fill="none" stroke="#39805b" strokeWidth="2.6" vectorEffect="non-scaling-stroke" strokeLinejoin="round"/></>}
    </svg>
    {!samples.length && <span className="chart-empty">A fresh start looks good on you.</span>}
  </div>;
}
