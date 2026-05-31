import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, BarChart3, ClipboardList, Loader2, TrendingUp } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import dashboardApi from '../api/dashboardApi';
import eventApi from '../api/eventApi';
import taskApi from '../api/taskApi';
import { formatDate } from '../utils/dateUtils';

const PAGE_SIZE = 8;

const EventDashboardPage = ({ user, onLogout }) => {
  const { eventId } = useParams();
  const [page, setPage] = useState(0);

  const eventQuery = useQuery({ queryKey: ['event', eventId], queryFn: () => eventApi.getEvent(eventId), enabled: Boolean(eventId) });
  const summaryQuery = useQuery({ queryKey: ['dashboardSummary', eventId], queryFn: () => dashboardApi.getSummary(eventId), enabled: Boolean(eventId) });
  const trendQuery = useQuery({ queryKey: ['eventTaskStatusTrend', eventId], queryFn: () => dashboardApi.getTaskTrend(eventId), enabled: Boolean(eventId) });
  const statusQuery = useQuery({ queryKey: ['eventTasksByStatus', eventId], queryFn: () => dashboardApi.getTasksByStatus(eventId), enabled: Boolean(eventId) });
  const tasksQuery = useQuery({
    queryKey: ['eventDashboardTasks', eventId, page],
    queryFn: () => taskApi.getEventTaskPage({ eventId, page, size: PAGE_SIZE, sort: 'deadline', direction: 'asc' }),
    enabled: Boolean(eventId),
  });

  const event = eventQuery.data;
  const summary = summaryQuery.data;
  const tasks = tasksQuery.data?.content || [];
  const isLoading = summaryQuery.isLoading || trendQuery.isLoading || statusQuery.isLoading || tasksQuery.isLoading;
  const error = summaryQuery.error || trendQuery.error || statusQuery.error || tasksQuery.error;

  return (
    <AppLayout user={user} events={event ? [event] : []} selectedEvent={event} onEventChange={() => {}} onLogout={onLogout}>
      <div className="space-y-6">
        <Link to={`/events/${eventId}`} className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600">
          <ArrowLeft size={16} />
          Quay lại sự kiện
        </Link>

        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Dashboard sự kiện</h2>
              <p className="mt-1 text-sm text-gray-500">Trực quan hóa trạng thái và danh sách task của toàn bộ sự kiện.</p>
            </div>
            <span className="h-fit w-fit rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">{event?.name || 'Event'}</span>
          </div>
        </section>

        {isLoading && <LoadingBlock message="Đang tải dashboard..." />}
        {error && <ErrorBlock error={error} />}

        {summary && !error && (
          <>
            <section className="grid gap-4 md:grid-cols-4">
              <MetricCard label="Tổng task" value={summary.totalTasks} />
              <MetricCard label="TODO" value={statusValue(statusQuery.data, 'TODO')} />
              <MetricCard label="IN_PROGRESS" value={statusValue(statusQuery.data, 'IN_PROGRESS')} />
              <MetricCard label="DONE" value={statusValue(statusQuery.data, 'DONE')} />
            </section>

            <section className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
              <ChartPanel icon={<TrendingUp size={18} />} title="Line chart task theo ngày" description="Số lượng task theo deadline từng ngày, tách theo trạng thái hiện tại.">
                <StatusLineChart data={trendQuery.data || []} />
              </ChartPanel>
              <ChartPanel icon={<BarChart3 size={18} />} title="Column chart task theo status" description="Số lượng task hiện tại theo từng trạng thái.">
                <StatusColumnChart data={normalizeStatusData(statusQuery.data)} />
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
const STATUS_ORDER = ['TODO', 'IN_PROGRESS', 'DONE'];
const normalizeStatusData = (data = []) => STATUS_ORDER.map((status) => ({
  label: status,
  totalTasks: statusValue(data, status),
}));

const MetricCard = ({ label, value }) => (
  <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
    <p className="text-sm font-medium text-gray-500">{label}</p>
    <p className="mt-2 text-3xl font-bold text-gray-900">{value ?? 0}</p>
  </div>
);

const ChartPanel = ({ icon, title, description, children }) => (
  <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
    <div className="mb-4 flex items-start gap-3">
      <div className="rounded-lg bg-blue-50 p-2 text-blue-600">{icon}</div>
      <div>
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
    </div>
    {children}
  </section>
);

const StatusLineChart = ({ data }) => {
  if (!data.length) return <EmptyChart message="Chưa có dữ liệu cập nhật status." />;

  const width = 680;
  const height = 280;
  const padding = 36;
  const series = [
    { key: 'todoTasks', label: 'TODO', color: '#2563eb' },
    { key: 'inProgressTasks', label: 'IN_PROGRESS', color: '#f59e0b' },
    { key: 'completedTasks', label: 'DONE', color: '#10b981' },
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
      <div className="mb-3 flex flex-wrap gap-3 text-xs font-semibold text-gray-600">
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
  const colorByStatus = { TODO: 'bg-blue-500', IN_PROGRESS: 'bg-amber-500', DONE: 'bg-emerald-500' };

  return (
    <div className="grid h-72 grid-cols-3 items-end gap-4 border-b border-gray-200 pb-3">
      {data.map((item) => (
        <div key={item.label} className="flex h-full flex-col items-center justify-end">
          <div className="flex h-52 w-full items-end justify-center">
            <div className={`w-14 rounded-t ${colorByStatus[item.label] || 'bg-gray-500'}`} style={{ height: `${Math.max(((item.totalTasks || 0) / maxValue) * 100, item.totalTasks ? 10 : 2)}%` }} />
          </div>
          <p className="mt-2 text-xs font-bold text-gray-700">{item.totalTasks || 0}</p>
          <p className="text-center text-xs font-semibold text-gray-500">{item.label}</p>
        </div>
      ))}
    </div>
  );
};

const TaskListSection = ({ tasks, page, setPage, pageData, eventId }) => (
  <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
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
            <p className="text-sm text-gray-500">{task.departmentName || 'Chưa gán ban'} • {task.assigneeName || 'Chưa phân công'} • {formatDate(task.deadline)}</p>
          </div>
          <span className="w-fit rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">{task.status}</span>
        </div>
      </Link>
    ))}
    <div className="flex justify-end gap-2 p-4">
      <button type="button" onClick={() => setPage((old) => Math.max(old - 1, 0))} disabled={page === 0} className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 disabled:opacity-50">Trước</button>
      <button type="button" onClick={() => setPage((old) => old + 1)} disabled={pageData?.last !== false} className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 disabled:opacity-50">Sau</button>
    </div>
  </section>
);

const LoadingBlock = ({ message }) => <div className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white p-8 text-gray-500"><Loader2 size={20} className="animate-spin" />{message}</div>;
const ErrorBlock = ({ error }) => <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error.userMessage || error.message}</div>;
const EmptyChart = ({ message }) => <div className="flex h-72 items-center justify-center rounded-lg border border-dashed border-gray-300 text-sm text-gray-500">{message}</div>;

export default EventDashboardPage;
