import { useMemo, useState } from 'react';

const SERIES = [
  { key: 'completedTasks', status: 'DONE', label: 'Hoàn thành', color: '#22c55e', track: '#dcfce7' },
  { key: 'inReviewTasks', status: 'IN_REVIEW', label: 'Chờ duyệt', color: '#8b5cf6', track: '#ede9fe' },
  { key: 'inProgressTasks', status: 'IN_PROGRESS', label: 'Đang làm', color: '#f59e0b', track: '#fef3c7' },
  { key: 'todoTasks', status: 'TODO', label: 'Cần làm', color: '#0ea5e9', track: '#e0f2fe' },
  { key: 'overdueTasks', deadlineStatus: 'OVERDUE', label: 'Quá hạn', color: '#dc2626', track: '#fee2e2' },
];

const valueOf = (item, key) => Number(item?.[key] || 0);
const formatAxisLabel = (label) => label?.slice(5) || label;

const CumulativeFlowChart = ({ data = [], onStatusClick }) => {
  const [hoveredBar, setHoveredBar] = useState(null);
  const chartData = useMemo(() => data.filter((item) => item?.label), [data]);

  const rows = useMemo(() => {
    if (!chartData.length) return [];
    const latest = chartData[chartData.length - 1];
    const previous = chartData.length > 1 ? chartData[chartData.length - 2] : null;

    return SERIES.map((series) => {
      const value = valueOf(latest, series.key);
      const previousValue = previous ? valueOf(previous, series.key) : value;
      return {
        ...series,
        date: latest.label,
        value,
        change: value - previousValue,
      };
    });
  }, [chartData]);

  if (!chartData.length) return <EmptyChart message="Chưa có dữ liệu cumulative flow." />;

  const maxValue = Math.max(...rows.map((row) => row.value), 1);
  const ticks = Array.from({ length: 5 }, (_, index) => Math.round((maxValue / 4) * index));
  const latestLabel = formatAxisLabel(chartData[chartData.length - 1]?.label);

  return (
    <div className="min-w-0">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-3 text-xs font-black text-slate-600">
          {SERIES.map((series) => (
            <span key={series.key} className="inline-flex items-center gap-1.5 rounded-full border border-sky-100 bg-white px-3 py-1 shadow-sm">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: series.color }} />
              {series.label}
            </span>
          ))}
        </div>
        <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
          Ngày {latestLabel}
        </span>
      </div>

      <div className="rounded-3xl border border-sky-100 bg-gradient-to-br from-white via-sky-50/40 to-emerald-50/40 p-4">
        <div className="grid gap-4">
          {rows.map((row) => {
            const width = `${Math.max((row.value / maxValue) * 100, row.value ? 8 : 0)}%`;
            const changeLabel = row.change > 0 ? `+${row.change}` : String(row.change);

            return (
              <button
                key={row.key}
                type="button"
                className="grid min-w-0 grid-cols-[96px_minmax(0,1fr)_48px] items-center gap-3 text-left"
                onMouseEnter={() => setHoveredBar(row)}
                onMouseLeave={() => setHoveredBar(null)}
                onFocus={() => setHoveredBar(row)}
                onBlur={() => setHoveredBar(null)}
                onClick={() => onStatusClick?.({ status: row.status, deadlineStatus: row.deadlineStatus, date: row.date })}
              >
                <span className="truncate text-xs font-black text-slate-700">{row.label}</span>
                <span
                  className="relative block h-8 overflow-hidden rounded-xl border border-white bg-white shadow-inner"
                  style={{ backgroundColor: row.track }}
                >
                  <span
                    className="absolute inset-y-0 left-0 rounded-xl transition-all duration-300"
                    style={{ width, backgroundColor: row.color }}
                  />
                  <span className="absolute inset-y-0 left-3 flex items-center text-[11px] font-black text-white drop-shadow-sm">
                    {row.value ? row.value : ''}
                  </span>
                </span>
                <span className={`text-right text-xs font-black ${row.change >= 0 ? 'text-slate-500' : 'text-emerald-600'}`}>
                  {changeLabel}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-5 grid grid-cols-5 border-t border-sky-100 pt-3 text-[10px] font-bold text-slate-400">
          {ticks.map((tick, index) => (
            <span key={`${tick}-${index}`} className="text-right first:text-left">
              {tick}
            </span>
          ))}
        </div>

        {hoveredBar && (
          <div className="mt-4 rounded-2xl border border-sky-100 bg-white px-4 py-3 text-xs font-bold text-slate-600 shadow-sm">
            <span className="font-black text-slate-900">{hoveredBar.label}</span>
            <span> có {hoveredBar.value} task</span>
            <span className="text-slate-400"> · chênh lệch ngày trước {hoveredBar.change > 0 ? `+${hoveredBar.change}` : hoveredBar.change}</span>
          </div>
        )}
      </div>
    </div>
  );
};

const EmptyChart = ({ message }) => (
  <div className="flex h-72 items-center justify-center rounded-3xl border border-dashed border-sky-200 bg-sky-50/50 px-4 text-center text-sm font-bold text-slate-500">
    {message}
  </div>
);

export default CumulativeFlowChart;

