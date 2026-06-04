import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { BarChart3, CheckCircle2, ClipboardList, Clock3, ListTodo, Plus, TrendingUp } from 'lucide-react';
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

  const eventQuery = useQuery({ queryKey: ['event', eventId], queryFn: () => eventApi.getEvent(eventId), enabled: Boolean(eventId) });
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
  const isLoading = eventQuery.isLoading || (canViewDashboard && (departmentsQuery.isLoading || summaryQuery.isLoading || statusQuery.isLoading || trendQuery.isLoading || tasksQuery.isLoading));
  const error = eventQuery.error || departmentsQuery.error || summaryQuery.error || statusQuery.error || trendQuery.error || tasksQuery.error;

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
          message: 'Dashboard sự kiện chỉ dành cho leader. Bạn vẫn có thể xem các công việc, thành viên và thông tin sự kiện được phân quyền cho tài khoản của mình.',
          requestUrl: location.pathname,
        }}
      />
    );
  }

  return (
    <AppLayout user={user} events={event ? [event] : []} selectedEvent={event} onEventChange={() => {}} onLogout={onLogout}>
      <div className="space-y-6">
        <section className="space-y-4">
          <PageHeader
            eyebrow={`${event?.name || 'Sự kiện'} / ${selectedDepartment?.name || 'Toàn bộ ban'}`}
            title="Dashboard sự kiện"
            description="Tổng quan ngắn gọn về công việc hiện tại và những việc cần xử lý trong khoảng thời gian đang chọn."
          />
          <Panel className="p-4">
            <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
              <div className="grid gap-3 sm:grid-cols-2">
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
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Khoảng thời gian</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{weekRange.fromDate} - {weekRange.toDate}</p>
                </div>
              </div>
              <WeekControl weekIndex={weekIndex} setWeekIndex={(next) => { setPage(0); setWeekIndex(next); }} weekRange={weekRange} />
            </div>
          </Panel>
        </section>

        {canViewDashboard && summary && !error && (
          <>
            <section className="grid gap-4 md:grid-cols-4">
              <MetricCard icon={ListTodo} label="Tổng công việc" value={summary.totalTasks} tone="indigo" />
              <MetricCard icon={CheckCircle2} label="Đã hoàn thành" value={summary.completedTasks} tone="emerald" />
              <MetricCard icon={TrendingUp} label="Tiến độ" value={`${summary.progressPercentage || 0}%`} tone="violet" />
              <MetricCard icon={Clock3} label="Quá hạn chưa xong" value={summary.overdueTasksCount} tone={summary.overdueTasksCount > 0 ? 'red' : 'slate'} />
            </section>

            <section className="grid gap-4">
              <ChartPanel icon={<TrendingUp size={18} />} title="Line chart task theo ngày" description="Số lượng task theo deadline từng ngày, tách theo trạng thái hiện tại.">
                <StatusLineChart
                  data={trendQuery.data || []}
                  onPointClick={({ status, date }) => openFilteredTasks({ status, fromDate: date, toDate: date })}
                />
              </ChartPanel>
              <ChartPanel icon={<BarChart3 size={18} />} title="Trạng thái công việc" description="Bấm vào từng cột để xem danh sách task tương ứng.">
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

const WeekControl = ({ weekIndex, setWeekIndex }) => (
  <div className="flex flex-col gap-1">
    <div className="flex gap-2">
      <Button type="button" onClick={() => setWeekIndex(Math.max(weekIndex - 1, 0))} disabled={weekIndex === 0} variant="secondary">Tuần trước</Button>
      <Button type="button" onClick={() => setWeekIndex(weekIndex + 1)} variant="secondary">Tuần sau</Button>
    </div>
  </div>
);

const ChartPanel = ({ icon, title, description, children }) => (
  <Panel className="p-4">
    <div className="mb-4 flex items-start gap-3">
      <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">{icon}</div>
      <div>
        <h3 className="font-semibold text-slate-950">{title}</h3>
        <p className="text-sm text-slate-500">{description}</p>
      </div>
    </div>
    {children}
  </Panel>
);

const StatusLineChart = ({ data, onPointClick }) => {
  const [hoveredPoint, setHoveredPoint] = useState(null);
  if (!data.length) return <EmptyChart message="Chưa có dữ liệu cập nhật status." />;

  const width = 680;
  const height = 280;
  const padding = 36;
  const series = [
    { key: 'todoTasks', status: 'TODO', label: 'TODO', color: '#4f46e5', pointOffset: -9 },
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
    <div className="overflow-x-auto">
      <div className="mb-3 flex flex-wrap gap-3 text-xs font-semibold text-slate-600">
        {series.map((line) => (
          <span key={line.key} className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: line.color }} />
            {line.label}
          </span>
        ))}
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-72 min-w-[560px]">
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} className="stroke-slate-200" />
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} className="stroke-slate-200" />
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
                  <text x={point.x} y={point.y - 10} textAnchor="middle" className="fill-slate-700 text-[11px] font-semibold">
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
              className="fill-white/95 stroke-slate-200"
            />
            <text x={Math.min(Math.max(hoveredPoint.x, 86), width - 86)} y={Math.max(hoveredPoint.y - 50, 30)} textAnchor="middle" className="fill-slate-900 text-[11px] font-bold">
              {hoveredPoint.label}
            </text>
            <text x={Math.min(Math.max(hoveredPoint.x, 86), width - 86)} y={Math.max(hoveredPoint.y - 32, 48)} textAnchor="middle" className="fill-slate-600 text-[11px]">
              {hoveredPoint.statusLabel}: {hoveredPoint.value} task
            </text>
          </g>
        )}
        {pointsFor(series[0]).filter((point) => shouldShowXAxisLabel(point.index)).map((point) => (
          <text key={point.label} x={point.x} y={height - 10} textAnchor="middle" className="fill-slate-500 text-[10px]">
            {formatAxisLabel(point.label)}
          </text>
        ))}
      </svg>
    </div>
  );
};

const StatusColumnChart = ({ data, onColumnClick }) => {
  const [hoveredColumn, setHoveredColumn] = useState(null);
  if (!data.length) return <EmptyChart message="Chưa có dữ liệu status." />;

  const maxValue = Math.max(...data.map((item) => item.totalTasks || 0), 1);
  const colorByStatus = { TODO: 'bg-indigo-500', IN_PROGRESS: 'bg-amber-500', IN_REVIEW: 'bg-violet-500', DONE: 'bg-emerald-500' };

  return (
    <div className="grid h-72 grid-cols-4 items-end gap-4 border-b border-gray-200 pb-3">
      {data.map((item) => (
        <button
          key={item.label}
          type="button"
          onMouseEnter={() => setHoveredColumn(item.label)}
          onMouseLeave={() => setHoveredColumn(null)}
          onFocus={() => setHoveredColumn(item.label)}
          onBlur={() => setHoveredColumn(null)}
          onClick={() => onColumnClick?.(item.label)}
          className="relative flex h-full flex-col items-center justify-end rounded-lg px-2 transition hover:bg-indigo-50"
          title={`Xem task ${STATUS_LABELS[item.label] || item.label}`}
        >
          {hoveredColumn === item.label && (
            <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-40 -translate-x-1/2 rounded-lg border border-slate-200 bg-white/90 px-3 py-2 text-center text-xs text-slate-900 shadow-lg backdrop-blur">
              <p className="font-bold">{STATUS_LABELS[item.label] || item.label}</p>
              <p className="mt-1 text-slate-600">{item.totalTasks || 0} task</p>
            </div>
          )}
          <div className="flex h-52 w-full items-end justify-center">
            <div className={`w-14 rounded-t ${colorByStatus[item.label] || 'bg-gray-500'}`} style={{ height: `${Math.max(((item.totalTasks || 0) / maxValue) * 100, item.totalTasks ? 10 : 2)}%` }} />
          </div>
          <p className="mt-2 text-xs font-bold text-slate-700">{item.totalTasks || 0}</p>
          <p className="text-center text-xs font-semibold text-slate-500">{STATUS_LABELS[item.label] || item.label}</p>
        </button>
      ))}
    </div>
  );
};

const TaskListSection = ({ tasks, page, setPage, pageData, eventId }) => (
  <Panel>
    <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <ClipboardList size={18} className="text-indigo-600" />
        <h3 className="font-semibold text-slate-950">Công việc sắp tới</h3>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">{tasks.length}</span>
      </div>
      <Button as={Link} to={`/events/${eventId}/tasks/new`} className="sm:w-auto">
        <Plus size={16} />
        Tạo công việc
      </Button>
    </div>
    {tasks.length === 0 && (
      <div className="p-4">
        <EmptyState title="Chưa có công việc trong tuần này" description="Đổi tuần hoặc bộ lọc ban để xem thêm công việc." />
      </div>
    )}
    {tasks.length > 0 && (
      <div className="overflow-x-auto">
        <table className="min-w-[760px] w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Công việc</th>
              <th className="px-4 py-3">Ban / phụ trách</th>
              <th className="px-4 py-3">Hạn hoàn thành</th>
              <th className="px-4 py-3">Ưu tiên</th>
              <th className="px-4 py-3">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tasks.map((task) => (
              <tr key={task.id} className="transition hover:bg-indigo-50/40">
                <td className="px-4 py-3">
                  <Link to={`/events/${eventId}/tasks/${task.id}`} className="font-semibold text-slate-950 hover:text-indigo-700">
                    {task.title}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  <p className="font-medium text-slate-800">{task.departmentName || 'Chưa gán ban'}</p>
                  <p className="text-xs text-slate-500">{task.assigneeName || 'Chưa phân công'}</p>
                </td>
                <td className="px-4 py-3 text-slate-600">{formatDate(task.deadline)}</td>
                <td className="px-4 py-3"><PriorityBadge priority={task.priority} /></td>
                <td className="px-4 py-3"><StatusBadge status={task.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
    <div className="flex justify-end gap-2 p-4">
      <Button type="button" onClick={() => setPage((old) => Math.max(old - 1, 0))} disabled={page === 0} variant="secondary">Trước</Button>
      <Button type="button" onClick={() => setPage((old) => old + 1)} disabled={pageData?.last !== false} variant="secondary">Sau</Button>
    </div>
  </Panel>
);

const EmptyChart = ({ message }) => <div className="flex h-72 items-center justify-center rounded-lg border border-dashed border-slate-300 text-sm text-slate-500">{message}</div>;

export default EventDashboardPage;
