import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock3,
  ListTodo,
  Plus,
  TrendingUp,
  UserRound,
} from 'lucide-react';
import AppLayout from '../components/AppLayout';
import {
  Button,
  EmptyState,
  LoadingState,
  MetricCard,
  PageHeader,
  Panel,
  PriorityBadge,
  SelectControl,
  StatusBadge,
} from '../components/ui';
import dashboardApi from '../api/dashboardApi';
import departmentApi from '../api/departmentApi';
import eventApi from '../api/eventApi';
import taskApi from '../api/taskApi';
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

const EventDashboardPage = ({ user, onLogout }) => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [page, setPage] = useState(0);
  const [weekIndex, setWeekIndex] = useState(0);
  const [departmentId, setDepartmentId] = useState('');

  const eventQuery = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => eventApi.getEvent(eventId),
    enabled: Boolean(eventId),
  });

  const event = eventQuery.data;
  const permissions = getEventPermissions(event);
  const canViewDashboard = permissions.canViewEventDashboard;

  const weekRange = useMemo(
    () => getWeekRange(event?.startTime || event?.eventDate, weekIndex),
    [event?.eventDate, event?.startTime, weekIndex]
  );

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
    queryKey: ['eventTasksByStatus', eventId, selectedDepartmentId, weekRange.fromDate, weekRange.toDate],
    queryFn: () => selectedDepartmentId
      ? dashboardApi.getDepartmentTasksByStatus({ eventId, departmentId: selectedDepartmentId, ...weekRange })
      : dashboardApi.getTasksByStatus(eventId, weekRange),
    enabled: Boolean(eventId && canViewDashboard),
  });

  const trendQuery = useQuery({
    queryKey: ['eventTaskStatusTrend', eventId, selectedDepartmentId, weekRange.fromDate, weekRange.toDate],
    queryFn: () => selectedDepartmentId
      ? dashboardApi.getDepartmentTaskTrend({ eventId, departmentId: selectedDepartmentId, ...weekRange })
      : dashboardApi.getTaskTrend(eventId, weekRange),
    enabled: Boolean(eventId && canViewDashboard),
  });

  const tasksQuery = useQuery({
    queryKey: ['eventDashboardTasks', eventId, selectedDepartmentId, page, weekRange.fromDate, weekRange.toDate],
    queryFn: () => taskApi.getEventTaskPage({
      eventId,
      page,
      size: PAGE_SIZE,
      sort: 'deadline',
      direction: 'asc',
      departmentId: selectedDepartmentId,
      ...weekRange,
    }),
    enabled: Boolean(eventId && canViewDashboard),
  });

  const summary = summaryQuery.data;
  const departments = useMemo(() => departmentsQuery.data || [], [departmentsQuery.data]);
  const selectedDepartment = departments.find((department) => String(department.id) === String(selectedDepartmentId));
  const statusData = useMemo(() => normalizeStatusData(statusQuery.data), [statusQuery.data]);
  const tasks = useMemo(() => tasksQuery.data?.content || [], [tasksQuery.data]);

  const isLoading = eventQuery.isLoading || (canViewDashboard && (
    departmentsQuery.isLoading ||
    summaryQuery.isLoading ||
    statusQuery.isLoading ||
    trendQuery.isLoading ||
    tasksQuery.isLoading
  ));

  const error = eventQuery.error ||
    departmentsQuery.error ||
    summaryQuery.error ||
    statusQuery.error ||
    trendQuery.error ||
    tasksQuery.error;

  const handleDepartmentChange = (event) => {
    setPage(0);
    setDepartmentId(event.target.value);
  };

  const openFilteredTasks = ({ status, fromDate, toDate }) => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
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
        <PageHeader
          eyebrow={`${event?.name || 'Sự kiện'} / ${selectedDepartment?.name || 'Toàn bộ ban'}`}
          title="Dashboard sự kiện"
          description="Theo dõi tổng quan tiến độ, trạng thái task, xu hướng hoàn thành và các công việc sắp tới theo từng tuần."
          meta={
            <>
              <span className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-white px-3 py-1.5 font-black text-sky-600 shadow-sm">
                <CalendarDays className="h-4 w-4" strokeWidth={1.8} />
                {weekRange.fromDate} - {weekRange.toDate}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-white px-3 py-1.5 font-black text-emerald-600 shadow-sm">
                <BarChart3 className="h-4 w-4" strokeWidth={1.8} />
                {selectedDepartment?.name || 'Toàn bộ sự kiện'}
              </span>
            </>
          }
        />

        <Panel className="relative overflow-hidden p-5">
          <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-sky-100 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-emerald-100/70 blur-3xl" />

          <div className="relative grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="grid gap-4 sm:grid-cols-2">
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

              <div className="rounded-2xl border border-sky-100 bg-sky-50/70 px-4 py-3">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                  Khoảng thời gian
                </p>
                <p className="mt-1 flex items-center gap-2 text-sm font-black text-slate-900">
                  <CalendarDays className="h-4 w-4 text-sky-500" strokeWidth={1.8} />
                  {weekRange.fromDate} - {weekRange.toDate}
                </p>
              </div>
            </div>

            <WeekControl
              weekIndex={weekIndex}
              setWeekIndex={(next) => {
                setPage(0);
                setWeekIndex(next);
              }}
            />
          </div>
        </Panel>

        {canViewDashboard && summary && !error && (
          <>
            <section className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard icon={ListTodo} label="Tổng công việc" value={summary.totalTasks} tone="sky" />
              <MetricCard icon={CheckCircle2} label="Đã hoàn thành" value={summary.completedTasks} tone="emerald" />
              <MetricCard icon={TrendingUp} label="Tiến độ" value={`${summary.progressPercentage || 0}%`} tone="violet" />
              <MetricCard icon={Clock3} label="Quá hạn chưa xong" value={summary.overdueTasksCount} tone={summary.overdueTasksCount > 0 ? 'red' : 'slate'} />
            </section>

            <section className="grid gap-5">
              <ChartPanel icon={<TrendingUp size={18} />} title="Line chart task theo ngày">
                <StatusLineChart
                  data={trendQuery.data || []}
                  onPointClick={({ status, date }) => openFilteredTasks({ status, fromDate: date, toDate: date })}
                />
              </ChartPanel>

              <ChartPanel icon={<BarChart3 size={18} />} title="Trạng thái công việc">
                <StatusColumnChart
                  data={statusData}
                  onColumnClick={(status) => openFilteredTasks({ status, fromDate: weekRange.fromDate, toDate: weekRange.toDate })}
                />
              </ChartPanel>
            </section>

            <TaskListSection
              tasks={tasks}
              page={page}
              setPage={setPage}
              pageData={tasksQuery.data}
              eventId={eventId}
            />
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

const WeekControl = ({ weekIndex, setWeekIndex }) => (
  <div className="rounded-2xl border border-sky-100 bg-white/80 p-3 shadow-sm backdrop-blur">
    <div className="flex items-center gap-2 text-sm font-black text-slate-700">
      <CalendarDays className="h-4 w-4 text-sky-500" strokeWidth={1.8} />
      Tuần {weekIndex + 1}
    </div>

    <div className="mt-3 grid grid-cols-2 gap-2 sm:flex">
      <Button
        type="button"
        onClick={() => setWeekIndex(Math.max(weekIndex - 1, 0))}
        disabled={weekIndex === 0}
        variant="secondary"
        className="rounded-2xl"
      >
        <ChevronLeft className="h-4 w-4" strokeWidth={1.8} />
        Tuần trước
      </Button>

      <Button
        type="button"
        onClick={() => setWeekIndex(weekIndex + 1)}
        variant="primary"
        className="rounded-2xl"
      >
        Tuần sau
        <ChevronRight className="h-4 w-4" strokeWidth={1.8} />
      </Button>
    </div>
  </div>
);

const ChartPanel = ({ icon, title, children }) => (
  <Panel className="min-w-0 overflow-hidden">
    <div className="border-b border-sky-100 bg-gradient-to-r from-sky-50 via-white to-emerald-50 px-5 py-4">
      <div className="flex items-start gap-3">
        <div className="rounded-2xl bg-gradient-to-br from-sky-500 to-emerald-400 p-3 text-white shadow-lg shadow-cyan-100">
          {icon}
        </div>

        <div className="min-w-0">
          <h3 className="font-black text-slate-950">{title}</h3>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            Click vào điểm/cột để mở danh sách task tương ứng.
          </p>
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

  const width = 680;
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
          <span
            key={line.key}
            className="inline-flex items-center gap-1.5 rounded-full border border-sky-100 bg-white px-3 py-1 shadow-sm"
          >
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: line.color }} />
            {line.label}
          </span>
        ))}
      </div>

      <div className="overflow-hidden rounded-3xl border border-sky-100 bg-gradient-to-br from-white via-sky-50/40 to-emerald-50/40 p-2">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-64 w-full sm:h-72">
          <defs>
            <filter id="event-line-glow" x="-50%" y="-50%" width="200%" height="200%">
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
                  filter="url(#event-line-glow)"
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
  <Panel className="min-w-0 overflow-hidden">
    <div className="flex flex-col gap-3 border-b border-sky-100 bg-gradient-to-r from-sky-50 via-white to-emerald-50 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-emerald-400 text-white shadow-lg shadow-cyan-100">
          <ClipboardList size={18} />
        </div>

        <div>
          <h3 className="font-black text-slate-950">Công việc sắp tới</h3>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            {tasks.length} công việc trong khoảng thời gian đang chọn.
          </p>
        </div>
      </div>

      <Button as={Link} to={`/events/${eventId}/tasks/new`} className="sm:w-auto">
        <Plus size={16} />
        Tạo công việc
      </Button>
    </div>

    {tasks.length === 0 && (
      <div className="p-5">
        <EmptyState
          icon={ClipboardList}
          title="Chưa có công việc trong tuần này"
          description="Khi có task trong khoảng thời gian đang chọn, danh sách sẽ hiển thị tại đây."
        />
      </div>
    )}

    {tasks.length > 0 && (
      <>
        <div className="grid gap-3 p-4 sm:hidden">
          {tasks.map((task) => (
            <Link
              key={task.id}
              to={`/events/${eventId}/tasks/${task.id}`}
              className="rounded-3xl border border-sky-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:bg-sky-50 hover:shadow-lg hover:shadow-sky-100"
            >
              <p className="line-clamp-2 font-black text-slate-950">{task.title}</p>
              <p className="mt-2 text-sm font-semibold text-slate-600">
                {task.departmentName || 'Chưa gán ban'} • {task.assigneeName || 'Chưa phân công'}
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                {formatDate(task.deadline)}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <PriorityBadge priority={task.priority} />
                <StatusBadge status={task.status} />
              </div>
            </Link>
          ))}
        </div>

        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-sky-50/70 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
              <tr>
                <th className="px-5 py-4">Công việc</th>
                <th className="px-5 py-4">Ban / phụ trách</th>
                <th className="px-5 py-4">Hạn hoàn thành</th>
                <th className="px-5 py-4">Ưu tiên</th>
                <th className="px-5 py-4">Trạng thái</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-sky-50">
              {tasks.map((task) => (
                <tr key={task.id} className="transition hover:bg-sky-50/70">
                  <td className="px-5 py-4">
                    <Link
                      to={`/events/${eventId}/tasks/${task.id}`}
                      className="font-black text-slate-950 hover:text-sky-600"
                    >
                      {task.title}
                    </Link>
                  </td>

                  <td className="px-5 py-4 text-slate-600">
                    <p className="font-black text-slate-800">
                      {task.departmentName || 'Chưa gán ban'}
                    </p>
                    <p className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                      <UserRound className="h-3.5 w-3.5 text-sky-400" strokeWidth={1.8} />
                      {task.assigneeName || 'Chưa phân công'}
                    </p>
                  </td>

                  <td className="px-5 py-4 font-semibold text-slate-600">
                    <span className="inline-flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-emerald-500" strokeWidth={1.8} />
                      {formatDate(task.deadline)}
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    <PriorityBadge priority={task.priority} />
                  </td>

                  <td className="px-5 py-4">
                    <StatusBadge status={task.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    )}

    <div className="grid grid-cols-2 gap-2 border-t border-sky-100 bg-sky-50/50 p-4 sm:flex sm:justify-end">
      <Button
        type="button"
        onClick={() => setPage((old) => Math.max(old - 1, 0))}
        disabled={page === 0}
        variant="secondary"
        className="rounded-2xl"
      >
        <ChevronLeft className="h-4 w-4" strokeWidth={1.8} />
        Trước
      </Button>

      <Button
        type="button"
        onClick={() => setPage((old) => old + 1)}
        disabled={pageData?.last !== false}
        variant="secondary"
        className="rounded-2xl"
      >
        Sau
        <ChevronRight className="h-4 w-4" strokeWidth={1.8} />
      </Button>
    </div>
  </Panel>
);

const EmptyChart = ({ message }) => (
  <div className="flex h-72 items-center justify-center rounded-3xl border border-dashed border-sky-200 bg-sky-50/50 px-4 text-center text-sm font-bold text-slate-500">
    {message}
  </div>
);

export default EventDashboardPage;