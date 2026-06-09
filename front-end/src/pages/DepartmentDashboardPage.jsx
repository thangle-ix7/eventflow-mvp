import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { BarChart3, ClipboardList, Loader2, TrendingUp, Users } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import dashboardApi from '../api/dashboardApi';
import eventApi from '../api/eventApi';
import taskApi from '../api/taskApi';
import { PriorityBadge, StatusBadge } from '../components/ui';
import { formatDate } from '../utils/dateUtils';
import { getEventPermissions } from '../utils/permissionUtils';

const PAGE_SIZE = 8;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const toDateInput = (date) => date.toISOString().slice(0, 10);
const addDays = (date, days) => new Date(date.getTime() + days * MS_PER_DAY);
const getWeekRange = (eventDate, weekIndex) => {
  const start = new Date(eventDate || Date.now());
  start.setHours(0, 0, 0, 0);
  const from = addDays(start, weekIndex * 7);
  const to = addDays(from, 6);
  return { fromDate: toDateInput(from), toDate: toDateInput(to) };
};

const DepartmentDashboardPage = ({ user, onLogout }) => {
  const { eventId, departmentId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [page, setPage] = useState(0);
  const [weekIndex, setWeekIndex] = useState(0);

  const eventQuery = useQuery({ queryKey: ['event', eventId], queryFn: () => eventApi.getEvent(eventId), enabled: Boolean(eventId) });
  const event = eventQuery.data;
  const permissions = getEventPermissions(event);
  const canViewDashboard = permissions.canViewDepartmentDashboard;
  const weekRange = getWeekRange(event?.startTime || event?.eventDate, weekIndex);
  const summaryQuery = useQuery({ queryKey: ['departmentDashboardSummary', eventId, departmentId], queryFn: () => dashboardApi.getDepartmentSummary({ eventId, departmentId }), enabled: Boolean(eventId && departmentId && canViewDashboard) });
  const trendQuery = useQuery({ queryKey: ['departmentTaskStatusTrend', eventId, departmentId, weekRange.fromDate, weekRange.toDate], queryFn: () => dashboardApi.getDepartmentTaskTrend({ eventId, departmentId, ...weekRange }), enabled: Boolean(eventId && departmentId && canViewDashboard) });
  const statusQuery = useQuery({ queryKey: ['departmentTasksByStatus', eventId, departmentId, weekRange.fromDate, weekRange.toDate], queryFn: () => dashboardApi.getDepartmentTasksByStatus({ eventId, departmentId, ...weekRange }), enabled: Boolean(eventId && departmentId && canViewDashboard) });
  const tasksQuery = useQuery({
    queryKey: ['departmentDashboardTasks', eventId, departmentId, page, weekRange.fromDate, weekRange.toDate],
    queryFn: () => taskApi.getEventTaskPage({ eventId, departmentId, page, size: PAGE_SIZE, sort: 'deadline', direction: 'asc', ...weekRange }),
    enabled: Boolean(eventId && departmentId && canViewDashboard),
  });

  const summary = summaryQuery.data;
  const statusData = normalizeStatusData(statusQuery.data);
  const tasks = tasksQuery.data?.content || [];
  const isLoading = eventQuery.isLoading || (canViewDashboard && (summaryQuery.isLoading || trendQuery.isLoading || statusQuery.isLoading || tasksQuery.isLoading));
  const error = eventQuery.error || summaryQuery.error || trendQuery.error || statusQuery.error || tasksQuery.error;

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
        <section className="space-y-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-500">
                {event?.name || 'Event'} / Department / {summary?.departmentName || 'Dashboard'}
              </p>
              <h2 className="mt-1 text-2xl font-bold text-gray-900">{summary?.departmentName || 'Dashboard ban'}</h2>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="grid grid-cols-2 gap-2 sm:flex">
                <Link to={`/events/${eventId}/departments/${departmentId}/members`} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700 shadow-sm transition hover:bg-emerald-100 active:translate-y-px sm:rounded-full">
                  <Users size={16} />
                  Member
                </Link>
                <Link to={`/events/${eventId}/departments/${departmentId}/tasks`} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-indigo-50 px-3 py-2 text-sm font-bold text-indigo-700 shadow-sm transition hover:bg-indigo-100 active:translate-y-px sm:rounded-full">
                  <ClipboardList size={16} />
                  Task
                </Link>
              </div>
              <WeekControl weekIndex={weekIndex} setWeekIndex={(next) => { setPage(0); setWeekIndex(next); }} weekRange={weekRange} />
            </div>
          </div>
        </section>

        {canViewDashboard && summary && !error && (
          <>
            <section className="grid gap-4">
              <ChartPanel icon={<TrendingUp size={18} />} title="Line chart task theo ngày">
                <StatusLineChart
                  data={trendQuery.data || []}
                  onPointClick={({ status, date }) => openFilteredTasks({ status, fromDate: date, toDate: date })}
                />
              </ChartPanel>
              <ChartPanel icon={<BarChart3 size={18} />} title="Column chart task theo status">
                <StatusColumnChart
                  data={statusData}
                  onColumnClick={(status) => openFilteredTasks({ status, fromDate: weekRange.fromDate, toDate: weekRange.toDate })}
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

const WeekControl = ({ weekIndex, setWeekIndex, weekRange }) => (
  <div className="flex min-w-0 flex-col gap-1">
    <div className="text-sm font-semibold text-gray-700">
      Tuần {weekIndex + 1}: {weekRange.fromDate} đến {weekRange.toDate}
    </div>
    <div className="grid grid-cols-2 gap-2 sm:flex">
      <button type="button" onClick={() => setWeekIndex(Math.max(weekIndex - 1, 0))} disabled={weekIndex === 0} className="min-h-10 rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 disabled:opacity-50">Tuần trước</button>
      <button type="button" onClick={() => setWeekIndex(weekIndex + 1)} className="min-h-10 rounded-lg border border-blue-600 px-3 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50">Tuần sau</button>
    </div>
  </div>
);

const ChartPanel = ({ icon, title, children }) => (
  <section className="min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
    <div className="mb-4 flex items-start gap-3">
      <div className="rounded-lg bg-blue-50 p-2 text-blue-600">{icon}</div>
      <div className="min-w-0">
        <h3 className="font-semibold text-gray-900">{title}</h3>
      </div>
    </div>
    {children}
  </section>
);

const StatusLineChart = ({ data, onPointClick }) => {
  const [hoveredPoint, setHoveredPoint] = useState(null);
  if (!data.length) return <EmptyChart message="Chưa có dữ liệu cập nhật status." />;

  const width = 680;
  const height = 280;
  const padding = 36;
  const series = [
    { key: 'todoTasks', status: 'TODO', label: 'TODO', color: '#2563eb', pointOffset: -9 },
    { key: 'inProgressTasks', status: 'IN_PROGRESS', label: 'IN_PROGRESS', color: '#f59e0b', pointOffset: -3 },
    { key: 'inReviewTasks', status: 'IN_REVIEW', label: 'IN_REVIEW', color: '#8b5cf6', pointOffset: 3 },
    { key: 'completedTasks', status: 'DONE', label: 'DONE', color: '#10b981', pointOffset: 9 },
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
      <div className="mb-3 flex flex-wrap gap-3 text-xs font-semibold text-gray-600">
        {series.map((line) => <span key={line.key} className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: line.color }} />{line.label}</span>)}
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-64 w-full sm:h-72">
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} className="stroke-gray-200" />
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} className="stroke-gray-200" />
        {series.map((line) => {
          const points = pointsFor(line);
          const path = smoothPath(points);
          return (
            <g key={line.key}>
              <path d={path} fill="none" stroke={line.color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              {points.filter((point) => point.value > 0).map((point) => (
                <g key={`${line.key}-${point.label}`}>
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r="5"
                    fill={line.color}
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
                  <text x={point.x} y={point.y - 10} textAnchor="middle" className="fill-gray-700 text-[11px] font-semibold">
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
              rx="8"
              className="fill-white/95 stroke-gray-200"
            />
            <text x={Math.min(Math.max(hoveredPoint.x, 86), width - 86)} y={Math.max(hoveredPoint.y - 50, 30)} textAnchor="middle" className="fill-gray-900 text-[11px] font-bold">
              {hoveredPoint.label}
            </text>
            <text x={Math.min(Math.max(hoveredPoint.x, 86), width - 86)} y={Math.max(hoveredPoint.y - 32, 48)} textAnchor="middle" className="fill-gray-600 text-[11px]">
              {hoveredPoint.statusLabel}: {hoveredPoint.value} task
            </text>
          </g>
        )}
        {pointsFor(series[0]).filter((point) => shouldShowXAxisLabel(point.index)).map((point) => <text key={point.label} x={point.x} y={height - 10} textAnchor="middle" className="fill-gray-500 text-[10px]">{formatAxisLabel(point.label)}</text>)}
      </svg>
    </div>
  );
};

const StatusColumnChart = ({ data, onColumnClick }) => {
  const [hoveredColumn, setHoveredColumn] = useState(null);
  if (!data.length) return <EmptyChart message="Chưa có dữ liệu status." />;

  const maxValue = Math.max(...data.map((item) => item.totalTasks || 0), 1);
  const colorByStatus = { TODO: 'bg-blue-500', IN_PROGRESS: 'bg-amber-500', IN_REVIEW: 'bg-violet-500', DONE: 'bg-emerald-500' };

  return (
    <div className="grid h-64 grid-cols-4 items-end gap-2 border-b border-gray-200 pb-3 sm:h-72 sm:gap-4">
      {data.map((item) => (
        <button
          key={item.label}
          type="button"
          onMouseEnter={() => setHoveredColumn(item.label)}
          onMouseLeave={() => setHoveredColumn(null)}
          onFocus={() => setHoveredColumn(item.label)}
          onBlur={() => setHoveredColumn(null)}
          onClick={() => onColumnClick?.(item.label)}
          className="relative flex h-full min-w-0 flex-col items-center justify-end rounded-lg px-1 transition hover:bg-blue-50 sm:px-2"
          title={`Xem task ${STATUS_LABELS[item.label] || item.label}`}
        >
          {hoveredColumn === item.label && (
            <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-40 -translate-x-1/2 rounded-lg border border-gray-200 bg-white/90 px-3 py-2 text-center text-xs text-gray-900 shadow-lg backdrop-blur">
              <p className="font-bold">{STATUS_LABELS[item.label] || item.label}</p>
              <p className="mt-1 text-gray-600">{item.totalTasks || 0} task</p>
            </div>
          )}
          <div className="flex h-52 w-full items-end justify-center">
            <div className={`w-8 rounded-t sm:w-14 ${colorByStatus[item.label] || 'bg-gray-500'}`} style={{ height: `${Math.max(((item.totalTasks || 0) / maxValue) * 100, item.totalTasks ? 10 : 2)}%` }} />
          </div>
          <p className="mt-2 text-xs font-bold text-gray-700">{item.totalTasks || 0}</p>
          <p className="max-w-full truncate text-center text-[11px] font-semibold text-gray-500 sm:text-xs">{STATUS_LABELS[item.label] || item.label}</p>
        </button>
      ))}
    </div>
  );
};

const TaskListSection = ({ tasks, page, setPage, pageData, eventId }) => (
  <section className="min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
    <div className="flex items-center gap-2 border-b border-gray-100 p-4">
      <ClipboardList size={18} className="text-blue-600" />
      <h3 className="font-semibold text-gray-900">Danh sách công việc</h3>
    </div>
    {tasks.length === 0 && <div className="p-8 text-center text-gray-500">Chưa có task.</div>}
    {tasks.map((task) => (
      <Link key={task.id} to={`/events/${eventId}/tasks/${task.id}`} className="block border-b border-gray-100 p-4 last:border-b-0 hover:bg-blue-50/50">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-gray-900">{task.title}</p>
            <p className="text-sm text-gray-500">{task.assigneeName || 'Chưa phân công'} • {formatDate(task.deadline)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <PriorityBadge priority={task.priority} />
            <StatusBadge status={task.status} />
          </div>
        </div>
      </Link>
    ))}
    <div className="grid grid-cols-2 gap-2 p-4 sm:flex sm:justify-end">
      <button type="button" onClick={() => setPage((old) => Math.max(old - 1, 0))} disabled={page === 0} className="min-h-10 rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 disabled:opacity-50">Trước</button>
      <button type="button" onClick={() => setPage((old) => old + 1)} disabled={pageData?.last !== false} className="min-h-10 rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 disabled:opacity-50">Sau</button>
    </div>
  </section>
);

const LoadingBlock = ({ message }) => <div className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white p-8 text-gray-500"><Loader2 size={20} className="animate-spin" />{message}</div>;
const EmptyChart = ({ message }) => <div className="flex h-72 items-center justify-center rounded-lg border border-dashed border-gray-300 text-sm text-gray-500">{message}</div>;

export default DepartmentDashboardPage;
