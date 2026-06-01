import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, BarChart3, CheckCircle2, ClipboardList, Clock3, FileJson, FileSpreadsheet, ListTodo, Plus, Printer, TrendingUp } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import {
  Button,
  EmptyState,
  ErrorState,
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
import {
  buildDashboardReport,
  exportDashboardCsv,
  exportDashboardJson,
  openPrintableDashboardReport,
} from '../utils/reportExport';

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
  const [page, setPage] = useState(0);
  const [weekIndex, setWeekIndex] = useState(0);
  const [departmentId, setDepartmentId] = useState('');

  const eventQuery = useQuery({ queryKey: ['event', eventId], queryFn: () => eventApi.getEvent(eventId), enabled: Boolean(eventId) });
  const event = eventQuery.data;
  const weekRange = useMemo(
    () => getWeekRange(event?.startTime || event?.eventDate, weekIndex),
    [event?.eventDate, event?.startTime, weekIndex]
  );
  const selectedDepartmentId = departmentId || null;

  const departmentsQuery = useQuery({
    queryKey: ['departments', eventId],
    queryFn: () => departmentApi.getEventDepartments(eventId),
    enabled: Boolean(eventId && event),
  });

  const summaryQuery = useQuery({
    queryKey: ['dashboardSummary', eventId, selectedDepartmentId],
    queryFn: () => selectedDepartmentId
      ? dashboardApi.getDepartmentSummary({ eventId, departmentId: selectedDepartmentId })
      : dashboardApi.getSummary(eventId),
    enabled: Boolean(eventId),
  });
  const trendQuery = useQuery({
    queryKey: ['eventTaskStatusTrend', eventId, selectedDepartmentId, weekRange.fromDate, weekRange.toDate],
    queryFn: () => selectedDepartmentId
      ? dashboardApi.getDepartmentTaskTrend({ eventId, departmentId: selectedDepartmentId, ...weekRange })
      : dashboardApi.getTaskTrend(eventId, weekRange),
    enabled: Boolean(eventId && event),
  });
  const statusQuery = useQuery({
    queryKey: ['eventTasksByStatus', eventId, selectedDepartmentId, weekRange.fromDate, weekRange.toDate],
    queryFn: () => selectedDepartmentId
      ? dashboardApi.getDepartmentTasksByStatus({ eventId, departmentId: selectedDepartmentId, ...weekRange })
      : dashboardApi.getTasksByStatus(eventId, weekRange),
    enabled: Boolean(eventId && event),
  });
  const comparisonQuery = useQuery({
    queryKey: ['eventDashboardComparison', eventId, weekRange.fromDate, weekRange.toDate],
    queryFn: () => dashboardApi.getComparison(eventId, weekRange),
    enabled: Boolean(eventId && event && !selectedDepartmentId),
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
    enabled: Boolean(eventId && event),
  });

  const summary = summaryQuery.data;
  const departments = useMemo(() => departmentsQuery.data || [], [departmentsQuery.data]);
  const selectedDepartment = departments.find((department) => String(department.id) === String(selectedDepartmentId));
  const statusData = useMemo(() => normalizeStatusData(statusQuery.data), [statusQuery.data]);
  const tasks = useMemo(() => tasksQuery.data?.content || [], [tasksQuery.data]);
  const isLoading = eventQuery.isLoading || departmentsQuery.isLoading || summaryQuery.isLoading || trendQuery.isLoading || statusQuery.isLoading || comparisonQuery.isLoading || tasksQuery.isLoading;
  const error = departmentsQuery.error || summaryQuery.error || trendQuery.error || statusQuery.error || comparisonQuery.error || tasksQuery.error;

  const handleDepartmentChange = (event) => {
    setPage(0);
    setDepartmentId(event.target.value);
  };

  const reportData = useMemo(() => {
    if (!summary) return null;

    return buildDashboardReport({
      event,
      department: selectedDepartment,
      summary,
      trendData: trendQuery.data || [],
      statusData,
      tasks,
      departments,
      range: weekRange,
      note: 'Dữ liệu xuất từ dashboard frontend hiện tại. So sánh với tháng trước đang ẩn vì API summary chưa hỗ trợ kỳ trước.',
    });
  }, [departments, event, selectedDepartment, statusData, summary, tasks, trendQuery.data, weekRange]);

  return (
    <AppLayout user={user} events={event ? [event] : []} selectedEvent={event} onEventChange={() => {}} onLogout={onLogout}>
      <div className="space-y-6">
        <section className="space-y-4">
          <Link to={`/events/${eventId}`} className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600">
            <ArrowLeft size={16} />
            Quay lại sự kiện
          </Link>

          <PageHeader
            eyebrow={`${event?.name || 'Sự kiện'} / ${selectedDepartment?.name || 'Toàn bộ ban'}`}
            title="Dashboard sự kiện"
            description="Theo dõi tiến độ, trạng thái và công việc sắp tới theo tuần để biết ngay khu vực cần xử lý."
            actions={<ReportExportActions report={reportData} />}
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

        {isLoading && <LoadingState message="Đang tải dashboard..." />}
        {error && <ErrorState error={error} title="Không tải được dashboard" />}

        {summary && !error && (
          <>
            <section className="grid gap-4 md:grid-cols-4">
              <MetricCard icon={ListTodo} label="Tổng công việc" value={summary.totalTasks} tone="indigo" />
              <MetricCard icon={CheckCircle2} label="Đã hoàn thành" value={summary.completedTasks} tone="emerald" />
              <MetricCard icon={TrendingUp} label="Tiến độ" value={`${summary.progressPercentage || 0}%`} tone="violet" />
              <MetricCard icon={Clock3} label="Quá hạn" value={summary.overdueTasksCount} tone={summary.overdueTasksCount > 0 ? 'red' : 'slate'} />
            </section>

            <MonthComparisonNotice comparison={comparisonQuery.data} selectedDepartmentId={selectedDepartmentId} />

            <section className="grid gap-4">
              <ChartPanel icon={<TrendingUp size={18} />} title="Xu hướng công việc theo ngày" description="Số lượng công việc theo deadline từng ngày, tách theo trạng thái hiện tại.">
                <StatusLineChart data={trendQuery.data || []} />
              </ChartPanel>
              <ChartPanel icon={<BarChart3 size={18} />} title="Phân bổ theo trạng thái" description="Số lượng công việc hiện tại theo từng trạng thái.">
                <StatusColumnChart data={statusData} />
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

const ReportExportActions = ({ report }) => (
  <div className="flex flex-wrap gap-2">
    <Button
      type="button"
      onClick={() => report && exportDashboardCsv(report)}
      disabled={!report}
      variant="secondary"
    >
      <FileSpreadsheet size={16} />
      CSV
    </Button>
    <Button
      type="button"
      onClick={() => report && exportDashboardJson(report)}
      disabled={!report}
      variant="secondary"
    >
      <FileJson size={16} />
      JSON
    </Button>
    <Button
      type="button"
      onClick={() => report && openPrintableDashboardReport(report)}
      disabled={!report}
    >
      <Printer size={16} />
      In / lưu PDF
    </Button>
  </div>
);

const MonthComparisonNotice = ({ comparison, selectedDepartmentId }) => {
  if (selectedDepartmentId) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
        <span className="font-semibold text-slate-800">So với kỳ trước:</span>{' '}
        đang hiển thị cho toàn sự kiện. Bộ lọc theo từng ban cần endpoint comparison riêng theo department.
      </div>
    );
  }

  if (!comparison) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold text-slate-950">So với kỳ trước</p>
          <p className="text-xs text-slate-500">
            {comparison.fromDate} - {comparison.toDate} so với {comparison.previousFromDate} - {comparison.previousToDate}
          </p>
        </div>
        <p className="text-sm font-semibold text-slate-700">
          Tiến độ {formatSignedNumber(comparison.progressDeltaPoints, ' điểm')}
        </p>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <ComparisonPill label="Tổng công việc" metric={comparison.totalTasks} />
        <ComparisonPill label="Hoàn thành" metric={comparison.completedTasks} />
        <ComparisonPill label="Quá hạn" metric={comparison.overdueTasks} inverse />
      </div>
    </div>
  );
};

const ComparisonPill = ({ label, metric, inverse = false }) => {
  const delta = metric?.delta || 0;
  const isPositive = delta > 0;
  const isNegative = delta < 0;
  const tone = inverse
    ? (isPositive ? 'text-red-600' : isNegative ? 'text-emerald-600' : 'text-slate-500')
    : (isPositive ? 'text-emerald-600' : isNegative ? 'text-red-600' : 'text-slate-500');

  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-extrabold text-slate-950">{metric?.currentValue ?? 0}</p>
      <p className={`text-xs font-bold ${tone}`}>
        {formatSignedNumber(delta)} ({formatSignedNumber(metric?.deltaPercent || 0, '%')})
      </p>
    </div>
  );
};

const formatSignedNumber = (value, suffix = '') => {
  const number = Number(value || 0);
  const rounded = Math.round(number * 10) / 10;
  return `${number > 0 ? '+' : ''}${rounded}${suffix}`;
};

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

const StatusLineChart = ({ data }) => {
  if (!data.length) return <EmptyChart message="Chưa có dữ liệu cập nhật status." />;

  const width = 680;
  const height = 280;
  const padding = 36;
  const series = [
    { key: 'todoTasks', label: 'Cần làm', color: '#4f46e5' },
    { key: 'inProgressTasks', label: 'Đang làm', color: '#f59e0b' },
    { key: 'inReviewTasks', label: 'Chờ duyệt', color: '#8b5cf6' },
    { key: 'completedTasks', label: 'Hoàn thành', color: '#10b981' },
  ];
  const maxValue = Math.max(...data.flatMap((item) => series.map((line) => item[line.key] || 0)), 1);
  const labelStep = Math.max(Math.ceil(data.length / 8), 1);
  const shouldShowXAxisLabel = (index) => index === 0 || index === data.length - 1 || index % labelStep === 0;
  const formatAxisLabel = (label) => label?.slice(5) || label;
  const pointsFor = (key) => data.map((item, index) => {
    const x = padding + (index * (width - padding * 2)) / Math.max(data.length - 1, 1);
    const y = height - padding - ((item[key] || 0) / maxValue) * (height - padding * 2);
    return { x, y, label: item.label, value: item[key] || 0, index };
  });

  return (
    <div className="overflow-x-auto">
      <div className="mb-3 flex flex-wrap gap-3 text-xs font-semibold text-slate-600">
        {series.map((line) => <span key={line.key} className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: line.color }} />{line.label}</span>)}
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-72 min-w-[560px]">
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} className="stroke-gray-200" />
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} className="stroke-gray-200" />
        {series.map((line) => {
          const points = pointsFor(line.key);
          const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
          return (
            <g key={line.key}>
              <path d={path} fill="none" stroke={line.color} strokeWidth="3" />
              {points.filter((point) => point.value > 0).map((point) => (
                <g key={`${line.key}-${point.label}`}>
                  <circle cx={point.x} cy={point.y} r="4" fill={line.color} />
                  <text x={point.x} y={point.y - 10} textAnchor="middle" className="fill-gray-700 text-[11px] font-semibold">
                    {point.value}
                  </text>
                </g>
              ))}
            </g>
          );
        })}
        {pointsFor('todoTasks').filter((point) => shouldShowXAxisLabel(point.index)).map((point) => (
          <text key={point.label} x={point.x} y={height - 10} textAnchor="middle" className="fill-gray-500 text-[10px]">{formatAxisLabel(point.label)}</text>
        ))}
      </svg>
    </div>
  );
};

const StatusColumnChart = ({ data }) => {
  if (!data.length) return <EmptyChart message="Chưa có dữ liệu status." />;
  const maxValue = Math.max(...data.map((item) => item.totalTasks || 0), 1);
  const colorByStatus = { TODO: 'bg-indigo-500', IN_PROGRESS: 'bg-amber-500', IN_REVIEW: 'bg-violet-500', DONE: 'bg-emerald-500' };

  return (
    <div className="grid h-72 grid-cols-4 items-end gap-4 border-b border-gray-200 pb-3">
      {data.map((item) => (
        <div key={item.label} className="flex h-full flex-col items-center justify-end">
          <div className="flex h-52 w-full items-end justify-center">
            <div className={`w-14 rounded-t ${colorByStatus[item.label] || 'bg-gray-500'}`} style={{ height: `${Math.max(((item.totalTasks || 0) / maxValue) * 100, item.totalTasks ? 10 : 2)}%` }} />
          </div>
          <p className="mt-2 text-xs font-bold text-slate-700">{item.totalTasks || 0}</p>
          <p className="text-center text-xs font-semibold text-slate-500">{STATUS_LABELS[item.label] || item.label}</p>
        </div>
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
