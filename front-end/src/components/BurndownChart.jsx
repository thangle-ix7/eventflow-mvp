import { useMemo, useState } from 'react';

const valueOf = (item, key) => Number(item?.[key] || 0);
const remainingOf = (item) => valueOf(item, 'todoTasks') + valueOf(item, 'inProgressTasks') + valueOf(item, 'inReviewTasks');
const formatAxisLabel = (label) => label?.slice(5) || label;

const BurndownChart = ({ data = [], onPointClick }) => {
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const chartData = useMemo(() => data.filter((item) => item?.label), [data]);

  if (!chartData.length) return <EmptyChart message="Chưa có dữ liệu burndown." />;

  const width = Math.max(680, chartData.length * 76);
  const height = 280;
  const padding = { top: 28, right: 28, bottom: 46, left: 54 };
  const chartLeft = padding.left;
  const chartRight = width - padding.right;
  const chartTop = padding.top;
  const chartBottom = height - padding.bottom;
  const chartWidth = chartRight - chartLeft;
  const chartHeight = chartBottom - chartTop;
  const maxRemaining = Math.max(...chartData.map(remainingOf), 1);
  const maxValue = Math.max(Math.ceil(maxRemaining / 5) * 5, 5);
  const yTicks = Array.from({ length: 5 }, (_, index) => Math.round((maxValue / 4) * index));
  const labelStep = Math.max(Math.ceil(chartData.length / 8), 1);
  const shouldShowXAxisLabel = (index) => index === 0 || index === chartData.length - 1 || index % labelStep === 0;

  const points = chartData.map((item, index) => {
    const x = chartLeft + (index * chartWidth) / Math.max(chartData.length - 1, 1);
    const value = remainingOf(item);
    const y = chartBottom - (value / maxValue) * chartHeight;
    return { x, y, value, label: item.label, index };
  });
  const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');

  return (
    <div className="min-w-0">
      <div className="overflow-x-auto rounded-3xl border border-sky-100 bg-gradient-to-br from-white via-sky-50/40 to-emerald-50/40 p-2">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-64 max-w-none sm:h-72"
          style={{ width: `${width}px` }}
          role="img"
          aria-label="Burndown chart"
        >
          <text x={chartLeft} y="18" fill="#0f172a" className="text-[12px] font-black">
            Task còn lại
          </text>

          {yTicks.map((tick) => {
            const y = chartBottom - (tick / maxValue) * chartHeight;
            return (
              <g key={tick}>
                <text x={chartLeft - 14} y={y + 4} textAnchor="end" fill="#0f172a" className="text-[12px] font-black">
                  {tick}
                </text>
                <line x1={chartLeft} y1={y} x2={chartRight} y2={y} stroke={tick === 0 ? '#475569' : '#cbd5e1'} strokeDasharray={tick === 0 ? undefined : '6 8'} />
              </g>
            );
          })}

          <line x1={chartLeft} y1={chartTop} x2={chartLeft} y2={chartBottom} stroke="#475569" />
          <path d={path} fill="none" stroke="#e11d48" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />

          {points.map((point) => (
            <g key={point.label}>
              <circle cx={point.x} cy={point.y} r="5" fill="#e11d48" stroke="#ffffff" strokeWidth="2" />
              <circle
                cx={point.x}
                cy={point.y}
                r="14"
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setHoveredPoint(point)}
                onMouseLeave={() => setHoveredPoint(null)}
                onFocus={() => setHoveredPoint(point)}
                onBlur={() => setHoveredPoint(null)}
                onClick={() => onPointClick?.({ date: point.label })}
              />
            </g>
          ))}

          {hoveredPoint && (
            <g className="pointer-events-none">
              <rect
                x={Math.min(Math.max(hoveredPoint.x - 70, 8), width - 148)}
                y={Math.max(hoveredPoint.y - 72, 8)}
                width="140"
                height="52"
                rx="14"
                fill="#ffffff"
                stroke="#fecdd3"
              />
              <text x={Math.min(Math.max(hoveredPoint.x, 78), width - 78)} y={Math.max(hoveredPoint.y - 50, 30)} textAnchor="middle" fill="#0f172a" className="text-[11px] font-black">
                {hoveredPoint.label}
              </text>
              <text x={Math.min(Math.max(hoveredPoint.x, 78), width - 78)} y={Math.max(hoveredPoint.y - 32, 48)} textAnchor="middle" fill="#475569" className="text-[11px] font-semibold">
                Còn lại: {hoveredPoint.value} task
              </text>
            </g>
          )}

          {points.filter((point) => shouldShowXAxisLabel(point.index)).map((point) => (
            <text key={point.label} x={point.x} y={height - 12} textAnchor="middle" fill="#64748b" className="text-[10px] font-bold">
              {formatAxisLabel(point.label)}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
};

const EmptyChart = ({ message }) => (
  <div className="flex h-72 items-center justify-center rounded-3xl border border-dashed border-sky-200 bg-sky-50/50 px-4 text-center text-sm font-bold text-slate-500">
    {message}
  </div>
);

export default BurndownChart;
