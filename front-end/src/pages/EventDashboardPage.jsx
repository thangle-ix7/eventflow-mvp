import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import { EventLeaderSnapshotPanel } from '../components/DashboardSnapshotPanels';
import {
  LoadingState,
  MetricCard,
  Panel,
  SelectControl,
} from '../components/ui';
import dashboardApi from '../api/dashboardApi';
import departmentApi from '../api/departmentApi';
import eventApi from '../api/eventApi';
import leaderSnapshotApi from '../api/leaderSnapshotApi';
import { getEventPermissions } from '../utils/permissionUtils';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const pad = (value) => String(value).padStart(2, '0');
const toDateInput = (value) => {
  const date = value instanceof Date ? value : new Date(value || Date.now());
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};
const addDays = (date, days) => new Date(date.getTime() + days * MS_PER_DAY);
const getDefaultDateRange = (eventStart, eventEnd) => {
  const start = new Date(eventStart || Date.now());
  start.setHours(0, 0, 0, 0);
  const from = start;
  const fallbackTo = addDays(from, 6);
  const end = eventEnd ? new Date(eventEnd) : null;
  const to = end && !Number.isNaN(end.getTime()) && end < fallbackTo ? end : fallbackTo;
  return { fromDate: toDateInput(from), toDate: toDateInput(to) };
};
const getDateBounds = (event) => ({
  minDate: toDateInput(event?.startTime || event?.eventDate),
  maxDate: event?.endTime ? toDateInput(event.endTime) : '',
});

const normalizeDateRange = (range, changedField) => {
  let fromDate = range.fromDate;
  let toDate = range.toDate;

  if (fromDate && toDate && fromDate > toDate) {
    if (changedField === 'fromDate') {
      toDate = fromDate;
    } else {
      fromDate = toDate;
    }
  }

  return { fromDate, toDate };
};

const EventDashboardPage = ({ user, onLogout }) => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [dateRange, setDateRange] = useState(null);
  const [departmentId, setDepartmentId] = useState('');

  const eventQuery = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => eventApi.getEvent(eventId),
    enabled: Boolean(eventId),
  });

  const event = eventQuery.data;
  const permissions = getEventPermissions(event);
  const canViewDashboard = permissions.canViewEventDashboard;

  const leaderSnapshotQuery = useQuery({
    queryKey: ['leaderSnapshot', eventId],
    queryFn: () => leaderSnapshotApi.getLeaderSnapshot(eventId),
    enabled: Boolean(eventId && canViewDashboard),
  });

  const defaultDateRange = useMemo(
    () => getDefaultDateRange(event?.startTime || event?.eventDate, event?.endTime),
    [event?.endTime, event?.eventDate, event?.startTime]
  );
  const dashboardRange = dateRange || defaultDateRange;
  const dateBounds = useMemo(() => getDateBounds(event), [event]);

  const selectedDepartmentId = departmentId || null;

  const departmentsQuery = useQuery({
    queryKey: ['departments', eventId],
    queryFn: () => departmentApi.getEventDepartments(eventId),
    enabled: Boolean(eventId && canViewDashboard),
  });

  const summaryQuery = useQuery({
    queryKey: ['dashboardSummary', eventId, selectedDepartmentId],
    queryFn: () => selectedDepartmentId
      ? dashboardApi.getDepartmentSummary({ eventId, departmentId: selectedDepartmentId })
      : dashboardApi.getSummary(eventId),
    enabled: Boolean(eventId && canViewDashboard),
  });

  const statusQuery = useQuery({
    queryKey: ['eventTasksByStatus', eventId, selectedDepartmentId, dashboardRange.fromDate, dashboardRange.toDate],
    queryFn: () => selectedDepartmentId
      ? dashboardApi.getDepartmentTasksByStatus({ eventId, departmentId: selectedDepartmentId, ...dashboardRange })
      : dashboardApi.getTasksByStatus(eventId, dashboardRange),
    enabled: Boolean(eventId && canViewDashboard),
  });

  const trendQuery = useQuery({
    queryKey: ['eventTaskStatusTrend', eventId, selectedDepartmentId, dashboardRange.fromDate, dashboardRange.toDate],
    queryFn: () => selectedDepartmentId
      ? dashboardApi.getDepartmentTaskTrend({ eventId, departmentId: selectedDepartmentId, ...dashboardRange })
      : dashboardApi.getTaskTrend(eventId, dashboardRange),
    enabled: Boolean(eventId && canViewDashboard),
  });

  const summary = summaryQuery.data;
  const departments = useMemo(() => departmentsQuery.data || [], [departmentsQuery.data]);
  const statusData = useMemo(() => normalizeStatusData(statusQuery.data, summary), [statusQuery.data, summary]);

  const isLoading = eventQuery.isLoading || (canViewDashboard && (
    departmentsQuery.isLoading ||
    summaryQuery.isLoading ||
    statusQuery.isLoading ||
    trendQuery.isLoading
  ));

  const error = eventQuery.error ||
    departmentsQuery.error ||
    summaryQuery.error ||
    statusQuery.error ||
    trendQuery.error;

  const handleDepartmentChange = (event) => {
    setDepartmentId(event.target.value);
  };

  const handleDateRangeChange = (field, value) => {
    setDateRange((old) => normalizeDateRange({
      ...defaultDateRange,
      ...old,
      [field]: value,
    }, field));
  };

  const openFilteredTasks = ({ status, deadlineStatus, fromDate, toDate }) => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (deadlineStatus) params.set('deadlineStatus', deadlineStatus);
    if (selectedDepartmentId) params.set('departmentId', selectedDepartmentId);
    if (fromDate) params.set('fromDate', fromDate);
    if (toDate) params.set('toDate', toDate);
    navigate(`/events/${eventId}/tasks?${params.toString()}`);
  };

  if (isLoading) {
    return (
      <AppLayout user={user} events={event ? [event] : []} selectedEvent={event} onEventChange={() => {}} onLogout={onLogout}>
        <LoadingState message="Đang tải dashboard..." />
      </AppLayout>
    );
  }

  if (error) {
    return (
      <Navigate
        to="/error"
        replace
        state={{
          status: error.status,
          title: error.status === 403 ? 'Không có quyền truy cập dashboard' : 'Không tải được dashboard',
          message: error.userMessage || 'EventFlow chưa thể tải dữ liệu dashboard. Vui lòng thử lại hoặc quay về trang trước.',
          requestUrl: location.pathname,
        }}
      />
    );
  }

  if (event && !canViewDashboard) {
    if (permissions.ownDepartmentId) {
      return (
        <Navigate
          to={`/events/${eventId}/departments/${permissions.ownDepartmentId}/dashboard`}
          replace
        />
      );
    }

    return (
      <Navigate
        to="/error"
        replace
        state={{
          status: 403,
          title: 'Không có quyền truy cập dashboard',
          message: 'Bạn không có quyền xem dashboard này.',
          requestUrl: location.pathname,
        }}
      />
    );
  }

  return (
    <AppLayout user={user} events={event ? [event] : []} selectedEvent={event} onEventChange={() => {}} onLogout={onLogout}>
      <div className="min-w-0 space-y-6">
        <EventLeaderSnapshotPanel
          eventId={eventId}
          snapshot={leaderSnapshotQuery.data}
          isLoading={leaderSnapshotQuery.isLoading}
          error={leaderSnapshotQuery.error}
        />

        <Panel className="p-5">
          <div className="grid gap-4 xl:grid-cols-[minmax(220px,0.8fr)_minmax(0,1.4fr)] xl:items-end">
            <div>
              <SelectControl
                label="Ban tổ chức"
                name="departmentId"
                value={departmentId}
                onChange={handleDepartmentChange}
                disabled={departmentsQuery.isLoading}
              >
                <option value="">Toàn bộ sự kiện</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </SelectControl>
            </div>

            <DateRangeControl
              range={dashboardRange}
              minDate={dateBounds.minDate}
              maxDate={dateBounds.maxDate}
              onChange={handleDateRangeChange}
              onReset={() => setDateRange(null)}
            />
          </div>
        </Panel>

        {canViewDashboard && summary && !error && (
          <>
            <section className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Tổng công việc" value={summary.totalTasks} />
              <MetricCard label="Đã hoàn thành" value={summary.completedTasks} />
              <MetricCard label="Tiến độ" value={`${summary.progressPercentage || 0}%`} />
              <MetricCard label="Quá hạn chưa xong" value={summary.overdueTasksCount} />
            </section>

            <section className="grid gap-5">
              <ChartPanel title="Task theo ngày">
                <StatusLineChart
                  data={trendQuery.data || []}
                  onPointClick={({ status, date }) => openFilteredTasks({ status, fromDate: date, toDate: date })}
                />
              </ChartPanel>

              <ChartPanel title="Trạng thái công việc">
                <StatusColumnChart
                  data={statusData}
                  onColumnClick={(status) => openFilteredTasks({ status: status === 'OVERDUE' ? '' : status, deadlineStatus: status === 'OVERDUE' ? 'OVERDUE' : '', fromDate: dashboardRange.fromDate, toDate: dashboardRange.toDate })}
                />
              </ChartPanel>
            </section>
          </>
        )}
      </div>
    </AppLayout>
  );
};

const statusValue = (data = [], status) => data.find((item) => item.label === status)?.totalTasks || 0;

const STATUS_ORDER = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'OVERDUE'];

const STATUS_LABELS = {
  TODO: 'Cần làm',
  IN_PROGRESS: 'Đang làm',
  IN_REVIEW: 'Chờ duyệt',
  DONE: 'Hoàn thành',
  OVERDUE: 'Quá hạn',
};

const normalizeStatusData = (data = [], summary) => STATUS_ORDER.map((status) => ({
  label: status,
  totalTasks: status === 'OVERDUE' ? (summary?.overdueTasksCount || 0) : statusValue(data, status),
}));

const DateRangeControl = ({ range, minDate, maxDate, onChange, onReset }) => (
  <div className="rounded-2xl border border-sky-100 bg-white/85 p-3 shadow-sm backdrop-blur">
    <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
      <label className="block">
        <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
          Từ ngày
        </span>
        <input
          type="date"
          value={range.fromDate}
          min={minDate || undefined}
          max={range.toDate || maxDate || undefined}
          onChange={(event) => onChange('fromDate', event.target.value)}
          className="mt-2 h-11 w-full rounded-xl border border-sky-100 bg-white px-3 text-sm font-black text-slate-800 outline-none transition focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100"
        />
      </label>

      <label className="block">
        <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
          Đến ngày
        </span>
        <input
          type="date"
          value={range.toDate}
          min={range.fromDate || minDate || undefined}
          max={maxDate || undefined}
          onChange={(event) => onChange('toDate', event.target.value)}
          className="mt-2 h-11 w-full rounded-xl border border-sky-100 bg-white px-3 text-sm font-black text-slate-800 outline-none transition focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100"
        />
      </label>

      <button
        type="button"
        onClick={onReset}
        className="inline-flex min-h-11 items-center justify-center rounded-xl border border-sky-100 bg-sky-50 px-4 text-sm font-black text-sky-700 transition hover:bg-white"
      >
        Về mặc định
      </button>
    </div>
  </div>
);

const ChartPanel = ({ icon, title, children }) => (
  <Panel className="min-w-0 overflow-hidden">
    <div className="border-b border-sky-100 bg-slate-50 px-5 py-4">
      <div className="flex items-start gap-3">
        {icon && (
          <div className="rounded-2xl bg-sky-600 p-3 text-white shadow-sm">
            {icon}
          </div>
        )}

        <div className="min-w-0">
          <h3 className="font-black text-slate-950">{title}</h3>
        </div>
      </div>
    </div>

    <div className="p-4 sm:p-5">
      {children}
    </div>
  </Panel>
);
const StatusLineChart = ({ data, onPointClick }) => {
  const [hoveredPoint, setHoveredPoint] = useState(null);
  if (!data.length) return <EmptyChart message="Chưa có dữ liệu cập nhật status." />;

  const width = Math.max(760, data.length * 88);
  const height = 320;
  const padding = {
    top: 28,
    right: 28,
    bottom: 52,
    left: 58,
  };
  const series = [
    { key: 'todoTasks', status: 'TODO', label: 'Cần làm', color: '#ef4444', pointOffset: -10 },
    { key: 'inProgressTasks', status: 'IN_PROGRESS', label: 'Đang làm', color: '#0f62b7', pointOffset: -3 },
    { key: 'inReviewTasks', status: 'IN_REVIEW', label: 'Chờ duyệt', color: '#facc15', pointOffset: 4 },
    { key: 'completedTasks', status: 'DONE', label: 'Hoàn thành', color: '#16a34a', pointOffset: 11 },
  ];

  const rawMaxValue = Math.max(...data.flatMap((item) => series.map((line) => item[line.key] || 0)), 1);
  const maxValue = Math.max(Math.ceil(rawMaxValue / 5) * 5, 5);
  const yTicks = Array.from({ length: 5 }, (_, index) => Math.round((maxValue / 4) * index));
  const labelStep = Math.max(Math.ceil(data.length / 8), 1);
  const shouldShowXAxisLabel = (index) => index === 0 || index === data.length - 1 || index % labelStep === 0;
  const formatAxisLabel = (label) => label?.slice(5) || label;

  const chartLeft = padding.left;
  const chartRight = width - padding.right;
  const chartTop = padding.top;
  const chartBottom = height - padding.bottom;
  const chartWidth = chartRight - chartLeft;
  const chartHeight = chartBottom - chartTop;

  const pointsFor = (line) => data.map((item, index) => {
    const baseX = chartLeft + (index * chartWidth) / Math.max(data.length - 1, 1);
    const x = Math.min(Math.max(baseX + line.pointOffset, chartLeft), chartRight);
    const y = chartBottom - ((item[line.key] || 0) / maxValue) * chartHeight;
    return { x, y, label: item.label, value: item[line.key] || 0, index };
  });

  const xLabelPoints = pointsFor(series[0]).filter((point) => shouldShowXAxisLabel(point.index));

  return (
    <div className="min-w-0">
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white p-3">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-72 max-w-none sm:h-80"
          style={{ width: `${width}px` }}
        >
          <rect x="0" y="0" width={width} height={height} fill="#ffffff" />

          {yTicks.map((tick) => {
            const y = chartBottom - (tick / maxValue) * chartHeight;
            return (
              <g key={tick}>
                <text x={chartLeft - 18} y={y + 4} textAnchor="end" fill="#0f172a" className="text-[12px] font-black">
                  {tick}
                </text>
                <line x1={chartLeft} y1={y} x2={chartRight} y2={y} stroke={tick === 0 ? '#475569' : '#cbd5e1'} />
              </g>
            );
          })}

          <line x1={chartLeft} y1={chartTop} x2={chartLeft} y2={chartBottom} stroke="#475569" />

          {series.map((line) => {
            const points = pointsFor(line);
            const path = points.map((point) => `${point.x},${point.y}`).join(' ');

            return (
              <g key={line.key}>
                <polyline
                  points={path}
                  fill="none"
                  stroke={line.color}
                  strokeWidth="4"
                  strokeLinecap="butt"
                  strokeLinejoin="miter"
                />

                {points.map((point) => (
                  <g key={`${line.key}-${point.label}`}>
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r="5.5"
                      fill={line.color}
                      stroke="#ffffff"
                      strokeWidth="2"
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredPoint({ ...point, statusLabel: line.label })}
                      onMouseLeave={() => setHoveredPoint(null)}
                      onFocus={() => setHoveredPoint({ ...point, statusLabel: line.label })}
                      onBlur={() => setHoveredPoint(null)}
                      onClick={() => onPointClick?.({ status: line.status, date: point.label })}
                    />

                    <circle
                      cx={point.x}
                      cy={point.y}
                      r="14"
                      fill="transparent"
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredPoint({ ...point, statusLabel: line.label })}
                      onMouseLeave={() => setHoveredPoint(null)}
                      onClick={() => onPointClick?.({ status: line.status, date: point.label })}
                    />
                  </g>
                ))}
              </g>
            );
          })}

          {hoveredPoint && (
            <g className="pointer-events-none">
              <rect
                x={Math.min(Math.max(hoveredPoint.x - 78, 8), width - 166)}
                y={Math.max(hoveredPoint.y - 72, 8)}
                width="158"
                height="52"
                rx="8"
                fill="#ffffff"
                stroke="#cbd5e1"
              />
              <text x={Math.min(Math.max(hoveredPoint.x, 86), width - 86)} y={Math.max(hoveredPoint.y - 50, 30)} textAnchor="middle" fill="#0f172a" className="text-[11px] font-black">
                {hoveredPoint.label}
              </text>
              <text x={Math.min(Math.max(hoveredPoint.x, 86), width - 86)} y={Math.max(hoveredPoint.y - 32, 48)} textAnchor="middle" fill="#475569" className="text-[11px] font-semibold">
                {hoveredPoint.statusLabel}: {hoveredPoint.value}
              </text>
            </g>
          )}

          {xLabelPoints.map((point) => (
            <text key={point.label} x={point.x} y={height - 18} textAnchor="middle" fill="#0f172a" className="text-[12px] font-black">
              {formatAxisLabel(point.label)}
            </text>
          ))}
        </svg>
      </div>

      <div className="mt-4 flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm font-black text-slate-900">
        {series.map((line) => (
          <span key={line.key} className="inline-flex items-center gap-2">
            <span className="h-3.5 w-8" style={{ backgroundColor: line.color }} />
            {line.label}
          </span>
        ))}
      </div>
    </div>
  );
};
const StatusColumnChart = ({ data, onColumnClick }) => {
  const [hoveredColumn, setHoveredColumn] = useState(null);
  if (!data.length) return <EmptyChart message="Chưa có dữ liệu status." />;

  const maxValue = Math.max(...data.map((item) => item.totalTasks || 0), 1);
  const colorByStatus = {
    TODO: 'from-sky-500 to-cyan-400',
    IN_PROGRESS: 'from-amber-500 to-orange-400',
    IN_REVIEW: 'from-violet-500 to-fuchsia-400',
    DONE: 'from-emerald-500 to-green-400',
    OVERDUE: 'from-red-600 to-rose-500',
  };

  return (
    <div className="rounded-3xl border border-sky-100 bg-gradient-to-br from-white via-sky-50/40 to-emerald-50/40 p-4">
      <div className="grid h-64 items-end gap-2 border-b border-sky-100 pb-3 sm:h-72 sm:gap-4" style={{ gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))` }}>
        {data.map((item) => (
          <button
            key={item.label}
            type="button"
            onMouseEnter={() => setHoveredColumn(item.label)}
            onMouseLeave={() => setHoveredColumn(null)}
            onFocus={() => setHoveredColumn(item.label)}
            onBlur={() => setHoveredColumn(null)}
            onClick={() => onColumnClick?.(item.label)}
            className="relative flex h-full min-w-0 flex-col items-center justify-end rounded-2xl px-1 transition hover:bg-white/70 sm:px-2"
            title={`Xem task ${STATUS_LABELS[item.label] || item.label}`}
          >
            {hoveredColumn === item.label && (
              <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-40 -translate-x-1/2 rounded-2xl border border-sky-100 bg-white/95 px-3 py-2 text-center text-xs text-slate-900 shadow-xl shadow-sky-100 backdrop-blur">
                <p className="font-black">{STATUS_LABELS[item.label] || item.label}</p>
                <p className="mt-1 font-semibold text-slate-500">{item.totalTasks || 0} task</p>
              </div>
            )}

            <div className="flex h-52 w-full items-end justify-center">
              <div
                className={`w-9 rounded-t-2xl bg-gradient-to-t ${colorByStatus[item.label] || 'from-slate-500 to-slate-400'} shadow-lg shadow-sky-100 transition-all sm:w-14`}
                style={{ height: `${Math.max(((item.totalTasks || 0) / maxValue) * 100, item.totalTasks ? 10 : 2)}%` }}
              />
            </div>

            <p className="mt-3 text-xs font-black text-slate-700">{item.totalTasks || 0}</p>
            <p className="max-w-full truncate text-center text-[11px] font-bold text-slate-500 sm:text-xs">
              {STATUS_LABELS[item.label] || item.label}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
};

const EmptyChart = ({ message }) => (
  <div className="flex h-72 items-center justify-center rounded-3xl border border-dashed border-sky-200 bg-sky-50/50 px-4 text-center text-sm font-bold text-slate-500">
    {message}
  </div>
);

export default EventDashboardPage;

