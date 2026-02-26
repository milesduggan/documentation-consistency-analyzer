'use client';

interface SparklineProps {
  data: number[];  // Health scores (0-100)
  width?: number;
  height?: number;
}

/**
 * Minimal SVG sparkline for health score trends
 * Shows last N data points as a line chart
 */
export default function Sparkline({ data, width = 60, height = 24 }: SparklineProps) {
  if (data.length < 2) {
    return null; // Need at least 2 points for a line
  }

  // Normalize to SVG coordinates
  const padding = 2;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  // Map data points to SVG coordinates
  const points = data.map((value, index) => {
    const x = padding + (index / (data.length - 1)) * chartWidth;
    // Invert Y (SVG 0 is top), clamp to 0-100 range
    const normalizedValue = Math.max(0, Math.min(100, value));
    const y = padding + chartHeight - (normalizedValue / 100) * chartHeight;
    return { x, y, value: normalizedValue };
  });

  // Create SVG path
  const pathD = points
    .map((point, i) => `${i === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(' ');

  // Determine trend color based on first vs last value
  const firstValue = data[0];
  const lastValue = data[data.length - 1];
  const trend = lastValue - firstValue;

  let strokeColor = 'var(--color-text-muted)'; // Flat
  if (trend > 5) {
    strokeColor = 'var(--color-success)'; // Improving
  } else if (trend < -5) {
    strokeColor = 'var(--color-high)'; // Declining
  }

  // Latest point indicator
  const lastPoint = points[points.length - 1];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="sparkline"
      aria-label={`Health trend: ${data.join(', ')}`}
    >
      {/* Trend line */}
      <path
        d={pathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Current value dot */}
      <circle
        cx={lastPoint.x}
        cy={lastPoint.y}
        r={2.5}
        fill={strokeColor}
      />
    </svg>
  );
}
