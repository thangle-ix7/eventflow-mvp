import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  BarChart3,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Loader2,
  TrendingUp,
  Users,
} from 'lucide-react';
import AppLayout from '../components/AppLayout';
import { DepartmentLeaderSnapshotPanel } from '../components/DashboardSnapshotPanels';
import dashboardApi from '../api/dashboardApi';
import eventApi from '../api/eventApi';
import leaderSnapshotApi from '../api/leaderSnapshotApi';
import taskApi from '../api/taskApi';
import { PriorityBadge, StatusBadge } from '../components/ui';
import { formatDate } from '../utils/dateUtils';
import { canAccessDepartment, getEventPermissions } from '../utils/permissionUtils';

const PAGE_SIZE = 8;
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

const DepartmentDashboardPage = ({ user, onLogout }) => {
  const { eventId, departmentId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [page, setPage] = useState(0);
  const [dateRange, setDateRange] = useState(null);

  const eventQuery = useQuery({ queryKey: ['event', eventId], queryFn: () => eventApi.getEvent(eventId), enabled: Boolean(eventId) });
  const event = eventQuery.data;
  const permissions = getEventPermissions(event);
  const canViewDashboard = Boolean(event && permissions.canViewDepartmentDashboard && canAccessDepartment(event, departmentId));
  const defaultDateRange = getDefaultDateRange(event?.startTime || event?.eventDate, event?.endTime);
  const dashboardRange = dateRange || defaultDateRange;
  const dateBounds = getDateBounds(event);
  const leaderSnapshotQuery = useQuery({
    queryKey: ['departmentLeaderSnapshot', eventId, departmentId],
    queryFn: () => leaderSnapshotApi.getDepartmentLeaderSnapshot({ eventId, departmentId }),
    enabled: Boolean(eventId && departmentId && canViewDashboard),
  });
  const summaryQuery = useQuery({ queryKey: ['departmentDashboardSummary', eventId, departmentId], queryFn: () => dashboardApi.getDepartmentSummary({ eventId, departmentId }), enabled: Boolean(eventId && departmentId && canViewDashboard) });
  const trendQuery = useQuery({ queryKey: ['departmentTaskStatusTrend', eventId, departmentId, dashboardRange.fromDate, dashboardRange.toDate], queryFn: () => dashboardApi.getDepartmentTaskTrend({ eventId, departmentId, ...dashboardRange }), enabled: Boolean(eventId && departmentId && canViewDashboard) });
  const statusQuery = useQuery({ queryKey: ['departmentTasksByStatus', eventId, departmentId, dashboardRange.fromDate, dashboardRange.toDate], queryFn: () => dashboardApi.getDepartmentTasksByStatus({ eventId, departmentId, ...dashboardRange }), enabled: Boolean(eventId && departmentId && canViewDashboard) });
  const tasksQuery = useQuery({
    queryKey: ['departmentDashboardTasks', eventId, departmentId, page, dashboardRange.fromDate, dashboardRange.toDate],
    queryFn: () => taskApi.getEventTaskPage({ eventId, departmentId, page, size: PAGE_SIZE, sort: 'deadline', direction: 'asc', ...dashboardRange }),
    enabled: Boolean(eventId && departmentId && canViewDashboard),
  });

  const summary = summaryQuery.data;
  const statusData = normalizeStatusData(statusQuery.data);
  const tasks = tasksQuery.data?.content || [];
  const isLoading = eventQuery.isLoading || (canViewDashboard && (summaryQuery.isLoading || trendQuery.isLoading || statusQuery.isLoading || tasksQuery.isLoading));
  const error = eventQuery.error || summaryQuery.error || trendQuery.error || statusQuery.error || tasksQuery.error;

  const handleDateRangeChange = (field, value) => {
    setPage(0);
    setDateRange((old) => normalizeDateRange({
      ...defaultDateRange,
      ...old,
      [field]: value,
    }, field));
  };

  const resetDateRange = () => {
    setPage(0);
    setDateRange(null);
  };

  const openFilteredTasks = ({ status, fromDate, toDate }) => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (fromDate) params.set('fromDate', fromDate);
    if (toDate) params.set('toDate', toDate);
    navigate(`/events/${eventId}/departments/${departmentId}/tasks?${params.toString()}`);
  };

  if (isLoading) {
    return (
      <AppLayout user={user} events={event ? [event] : []} selectedEvent={event} onEventChange={() => {}} onLogout={onLogout}>
        <LoadingBlock message="Đang tải dashboard department..." />
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
          title: error.status === 403 ? 'Không có quyền truy cập dashboard ban' : 'Không tải được dashboard',
          message: error.userMessage || 'EventFlow chưa thể tải dữ liệu dashboard. Vui lòng thử lại hoặc quay về trang trước.',
          requestUrl: location.pathname,
        }}
      />
    );
  }

  if (event && !canViewDashboard) {
    return (
      <Navigate
        to="/error"
        replace
        state={{
          status: 403,
          title: 'Không có quyền truy cập dashboard ban',
          message: 'Bạn không có quyền xem dashboard này.',
          requestUrl: location.pathname,
        }}
      />
    );
  }

  return (
    <AppLayout user={user} events={event ? [event] : []} selectedEvent={event} onEventChange={() => {}} onLogout={onLogout}>
      <div className="min-w-0 space-y-6">
        <section className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <Link
              to={`/events/${eventId}/departments/${departmentId}/members`}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-white hover:shadow-lg hover:shadow-emerald-100 active:translate-y-px"
            >
              <Users size={16} />
              Member
            </Link>

            <Link
              to={`/events/${eventId}/departments/${departmentId}/tasks`}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-2 text-sm font-black text-sky-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-white hover:shadow-lg hover:shadow-sky-100 active:translate-y-px"
            >
              <ClipboardList size={16} />
              Task
            </Link>
          </div>

          <DateRangeControl
            range={dashboardRange}
            minDate={dateBounds.minDate}
            maxDate={dateBounds.maxDate}
            onChange={handleDateRangeChange}
            onReset={resetDateRange}
          />
        </section>

        <DepartmentLeaderSnapshotPanel
          eventId={eventId}
          departmentId={departmentId}
          snapshot={leaderSnapshotQuery.data}
          isLoading={leaderSnapshotQuery.isLoading}
          error={leaderSnapshotQuery.error}
        />

        {canViewDashboard && summary && !error && (
          <>
            <section className="grid gap-5">
              <ChartPanel icon={<TrendingUp size={18} />} title="Task theo ngày">
                <StatusLineChart
                  data={trendQuery.data || []}
                  onPointClick={({ status, date }) => openFilteredTasks({ status, fromDate: date, toDate: date })}
                />
              </ChartPanel>

              <ChartPanel icon={<BarChart3 size={18} />} title="Task theo trạng thái">
                <StatusColumnChart
                  data={statusData}
                  onColumnClick={(status) => openFilteredTasks({ status, fromDate: dashboardRange.fromDate, toDate: dashboardRange.toDate })}
                />
              </ChartPanel>
            </section>

            <TaskListSection tasks={tasks} page={page} setPage={setPage} pageData={tasksQuery.data} eventId={eventId} />
          </>
        )}
      </div>
    </AppLayout>
  );
};

const statusValue = (data = [], status) => data.find((item) => item.label === status)?.totalTasks || 0;
const STATUS_ORDER = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];
const STATUS_LABELS = {
  TODO: 'Cần làm',
  IN_PROGRESS: 'Đang làm',
  IN_REVIEW: 'Chờ duyệt',
  DONE: 'Hoàn thành',
};

const normalizeStatusData = (data = []) => STATUS_ORDER.map((status) => ({
  label: status,
  totalTasks: statusValue(data, status),
}));

const DateRangeControl = ({ range, minDate, maxDate, onChange, onReset }) => (
  <div className="min-w-0 rounded-2xl border border-sky-100 bg-white/85 p-3 shadow-sm backdrop-blur">
    <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
      <label className="block">
        <span className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-slate-500">
          <CalendarDays className="h-4 w-4 text-sky-500" strokeWidth={1.8} />
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
  <section className="min-w-0 overflow-hidden rounded-[2rem] border border-sky-100 bg-white shadow-xl shadow-sky-100/70">
    <div className="border-b border-sky-100 bg-gradient-to-r from-sky-50 via-white to-emerald-50 px-5 py-4">
      <div className="flex items-start gap-3">
        <div className="rounded-2xl bg-gradient-to-br from-sky-500 to-emerald-400 p-3 text-white shadow-lg shadow-cyan-100">
          {icon}
        </div>

        <div className="min-w-0">
          <h3 className="font-black text-slate-950">{title}</h3>
        </div>
      </div>
    </div>

    <div className="p-4 sm:p-5">
      {children}
    </div>
  </section>
);

const StatusLineChart = ({ data, onPointClick }) => {
  const [hoveredPoint, setHoveredPoint] = useState(null);
  if (!data.length) return <EmptyChart message="Chưa có dữ liệu cập nhật status." />;

  const width = Math.max(680, data.length * 76);
  const height = 280;
  const padding = 36;
  const series = [
    { key: 'todoTasks', status: 'TODO', label: 'TODO', color: '#0ea5e9', pointOffset: -9 },
    { key: 'inProgressTasks', status: 'IN_PROGRESS', label: 'IN_PROGRESS', color: '#f59e0b', pointOffset: -3 },
    { key: 'inReviewTasks', status: 'IN_REVIEW', label: 'IN_REVIEW', color: '#8b5cf6', pointOffset: 3 },
    { key: 'completedTasks', status: 'DONE', label: 'DONE', color: '#22c55e', pointOffset: 9 },
  ];
  const maxValue = Math.max(...data.flatMap((item) => series.map((line) => item[line.key] || 0)), 1);
  const labelStep = Math.max(Math.ceil(data.length / 8), 1);
  const shouldShowXAxisLabel = (index) => index === 0 || index === data.length - 1 || index % labelStep === 0;
  const formatAxisLabel = (label) => label?.slice(5) || label;

  const smoothPath = (points) => {
    if (points.length < 2) {
      return points[0] ? `M ${points[0].x} ${points[0].y}` : '';
    }

    return points.reduce((path, point, index) => {
      if (index === 0) {
        return `M ${point.x} ${point.y}`;
      }

      const previous = points[index - 1];
      const controlDistance = (point.x - previous.x) * 0.45;
      return `${path} C ${previous.x + controlDistance} ${previous.y}, ${point.x - controlDistance} ${point.y}, ${point.x} ${point.y}`;
    }, '');
  };

  const pointsFor = (line) => data.map((item, index) => {
    const baseX = padding + (index * (width - padding * 2)) / Math.max(data.length - 1, 1);
    const x = Math.min(Math.max(baseX + line.pointOffset, padding), width - padding);
    const y = height - padding - ((item[line.key] || 0) / maxValue) * (height - padding * 2);
    return { x, y, label: item.label, value: item[line.key] || 0, index };
  });

  return (
    <div className="min-w-0">
      <div className="mb-4 flex flex-wrap gap-3 text-xs font-black text-slate-600">
        {series.map((line) => (
          <span key={line.key} className="inline-flex items-center gap-1.5 rounded-full border border-sky-100 bg-white px-3 py-1 shadow-sm">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: line.color }} />
            {line.label}
          </span>
        ))}
      </div>

      <div className="overflow-x-auto rounded-3xl border border-sky-100 bg-gradient-to-br from-white via-sky-50/40 to-emerald-50/40 p-2">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-64 max-w-none sm:h-72"
          style={{ width: `${width}px` }}
        >
          <defs>
            <filter id="line-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#bae6fd" />
          <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#bae6fd" />

          {[0.25, 0.5, 0.75].map((ratio) => (
            <line
              key={ratio}
              x1={padding}
              y1={height - padding - ratio * (height - padding * 2)}
              x2={width - padding}
              y2={height - padding - ratio * (height - padding * 2)}
              stroke="#e0f2fe"
              strokeDasharray="6 8"
            />
          ))}

          {series.map((line) => {
            const points = pointsFor(line);
            const path = smoothPath(points);

            return (
              <g key={line.key}>
                <path
                  d={path}
                  fill="none"
                  stroke={line.color}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  filter="url(#line-glow)"
                />

                {points.filter((point) => point.value > 0).map((point) => (
                  <g key={`${line.key}-${point.label}`}>
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r="5"
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
                    <text x={point.x} y={point.y - 10} textAnchor="middle" fill="#334155" className="text-[11px] font-black">
                      {point.value}
                    </text>
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
                rx="14"
                fill="#ffffff"
                stroke="#bae6fd"
              />
              <text x={Math.min(Math.max(hoveredPoint.x, 86), width - 86)} y={Math.max(hoveredPoint.y - 50, 30)} textAnchor="middle" fill="#0f172a" className="text-[11px] font-black">
                {hoveredPoint.label}
              </text>
              <text x={Math.min(Math.max(hoveredPoint.x, 86), width - 86)} y={Math.max(hoveredPoint.y - 32, 48)} textAnchor="middle" fill="#475569" className="text-[11px] font-semibold">
                {hoveredPoint.statusLabel}: {hoveredPoint.value} task
              </text>
            </g>
          )}

          {pointsFor(series[0]).filter((point) => shouldShowXAxisLabel(point.index)).map((point) => (
            <text key={point.label} x={point.x} y={height - 10} textAnchor="middle" fill="#64748b" className="text-[10px] font-bold">
              {formatAxisLabel(point.label)}
            </text>
          ))}
        </svg>
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
  };

  return (
    <div className="rounded-3xl border border-sky-100 bg-gradient-to-br from-white via-sky-50/40 to-emerald-50/40 p-4">
      <div className="grid h-64 grid-cols-4 items-end gap-2 border-b border-sky-100 pb-3 sm:h-72 sm:gap-4">
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

const TaskListSection = ({ tasks, page, setPage, pageData, eventId }) => (
  <section className="min-w-0 overflow-hidden rounded-[2rem] border border-sky-100 bg-white shadow-xl shadow-sky-100/70">
    <div className="flex items-center gap-3 border-b border-sky-100 bg-gradient-to-r from-sky-50 via-white to-emerald-50 px-5 py-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-emerald-400 text-white shadow-lg shadow-cyan-100">
        <ClipboardList size={18} />
      </div>
      <div>
        <h3 className="font-black text-slate-950">Danh sách công việc</h3>
        <p className="mt-1 text-xs font-semibold text-slate-500">Các task trong khoảng thời gian đang chọn.</p>
      </div>
    </div>

    {tasks.length === 0 && (
      <div className="p-10 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-sky-50 text-sky-500">
          <ClipboardList className="h-7 w-7" strokeWidth={1.8} />
        </div>
        <p className="text-sm font-bold text-slate-500">Chưa có task.</p>
      </div>
    )}

    {tasks.map((task) => (
      <Link
        key={task.id}
        to={`/events/${eventId}/tasks/${task.id}`}
        className="block border-b border-sky-50 p-5 transition last:border-b-0 hover:bg-sky-50/70"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="truncate font-black text-slate-950">{task.title}</p>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              {task.assigneeName || 'Chưa phân công'} • {formatDate(task.deadline)}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <PriorityBadge priority={task.priority} />
            <StatusBadge status={task.status} />
          </div>
        </div>
      </Link>
    ))}

    <div className="grid grid-cols-2 gap-2 border-t border-sky-100 bg-sky-50/50 p-4 sm:flex sm:justify-end">
      <button
        type="button"
        onClick={() => setPage((old) => Math.max(old - 1, 0))}
        disabled={page === 0}
        className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-2xl border border-sky-100 bg-white px-4 py-2 text-sm font-black text-slate-600 shadow-sm transition hover:bg-sky-50 hover:text-sky-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <ChevronLeft className="h-4 w-4" strokeWidth={1.8} />
        Trước
      </button>

      <button
        type="button"
        onClick={() => setPage((old) => old + 1)}
        disabled={pageData?.last !== false}
        className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-2xl border border-sky-100 bg-white px-4 py-2 text-sm font-black text-slate-600 shadow-sm transition hover:bg-sky-50 hover:text-sky-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Sau
        <ChevronRight className="h-4 w-4" strokeWidth={1.8} />
      </button>
    </div>
  </section>
);

const LoadingBlock = ({ message }) => (
  <div className="relative flex items-center justify-center gap-3 overflow-hidden rounded-[2rem] border border-sky-100 bg-white p-8 text-sm font-black text-slate-500 shadow-xl shadow-sky-100/70">
    <div className="pointer-events-none absolute -left-16 -top-16 h-44 w-44 rounded-full bg-sky-100 blur-3xl" />
    <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
      <Loader2 size={20} className="animate-spin" />
    </div>
    <span className="relative">{message}</span>
  </div>
);

const EmptyChart = ({ message }) => (
  <div className="flex h-72 items-center justify-center rounded-3xl border border-dashed border-sky-200 bg-sky-50/50 px-4 text-center text-sm font-bold text-slate-500">
    {message}
  </div>
);

export default DepartmentDashboardPage;
