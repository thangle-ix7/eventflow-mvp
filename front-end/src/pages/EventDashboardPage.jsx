import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, BarChart3, Clock, Loader2, TrendingUp } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import dashboardApi from '../api/dashboardApi';
import eventApi from '../api/eventApi';

const EventDashboardPage = ({ user, onLogout }) => {
  const { eventId } = useParams();

  const eventQuery = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => eventApi.getEvent(eventId),
    enabled: Boolean(eventId),
  });

  const summaryQuery = useQuery({
    queryKey: ['dashboardSummary', eventId],
    queryFn: () => dashboardApi.getSummary(eventId),
    enabled: Boolean(eventId),
  });

  const trendQuery = useQuery({
    queryKey: ['eventTaskTrend', eventId],
    queryFn: () => dashboardApi.getTaskTrend(eventId),
    enabled: Boolean(eventId),
  });

  const departmentQuery = useQuery({
    queryKey: ['eventTasksByDepartment', eventId],
    queryFn: () => dashboardApi.getTasksByDepartment(eventId),
    enabled: Boolean(eventId),
  });

  const assigneeQuery = useQuery({
    queryKey: ['eventTasksByAssignee', eventId],
    queryFn: () => dashboardApi.getTasksByAssignee(eventId),
    enabled: Boolean(eventId),
  });

  const event = eventQuery.data;
  const summary = summaryQuery.data;
  const isLoading =
    summaryQuery.isLoading ||
    trendQuery.isLoading ||
    departmentQuery.isLoading ||
    assigneeQuery.isLoading;
  const error =
    summaryQuery.error ||
    trendQuery.error ||
    departmentQuery.error ||
    assigneeQuery.error;

  return (
    <AppLayout
      user={user}
      events={event ? [event] : []}
      selectedEvent={event}
      onEventChange={() => {}}
      onLogout={onLogout}
    >
      <div className="space-y-6">
        <Link
          to={`/events/${eventId}`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600"
        >
          <ArrowLeft size={16} />
          Quay lại sự kiện
        </Link>

        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Dashboard sự kiện</h2>
              <p className="mt-1 text-sm text-gray-500">
                Tính toán toàn bộ task thuộc sự kiện này.
              </p>
            </div>
            <span className="h-fit w-fit rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
              {event?.name || 'Event'}
            </span>
          </div>
        </section>

        {isLoading && (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white p-8 text-gray-500">
            <Loader2 size={20} className="animate-spin" />
            Đang tải dashboard...
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error.userMessage || error.message}
          </div>
        )}

        {summary && !error && (
          <>
            <section className="grid gap-4 md:grid-cols-4">
              <MetricCard label="Tổng task" value={summary.totalTasks} />
              <MetricCard label="Hoàn thành" value={summary.completedTasks} />
              <MetricCard
                label="Tiến độ"
                value={`${summary.progressPercentage || 0}%`}
              />
              <MetricCard label="Quá hạn" value={summary.overdueTasksCount} />
            </section>

            <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <ChartPanel
                icon={<TrendingUp size={18} />}
                title="Line chart task toàn sự kiện"
                description="Số task theo deadline từng ngày của toàn bộ sự kiện."
              >
                <LineChart data={trendQuery.data || []} />
              </ChartPanel>
              <ChartPanel
                icon={<Clock size={18} />}
                title="Ngày còn lại"
                description="Tính từ hôm nay đến thời gian bắt đầu sự kiện."
              >
                <div className="flex h-64 items-center justify-center">
                  <div className="text-center">
                    <p className="text-5xl font-bold text-blue-600">
                      {summary.daysUntilEvent ?? 'N/A'}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-gray-500">
                      ngày tới sự kiện
                    </p>
                  </div>
                </div>
              </ChartPanel>
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              <ChartPanel
                icon={<BarChart3 size={18} />}
                title="Column chart theo department"
                description="Tổng task, task hoàn thành và task quá hạn của toàn sự kiện."
              >
                <ColumnChart data={departmentQuery.data || []} />
              </ChartPanel>
              <ChartPanel
                icon={<BarChart3 size={18} />}
                title="Column chart theo assignee"
                description="So sánh khối lượng task theo người phụ trách trong toàn sự kiện."
              >
                <ColumnChart data={assigneeQuery.data || []} />
              </ChartPanel>
            </section>
          </>
        )}
      </div>
    </AppLayout>
  );
};

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

const LineChart = ({ data }) => {
  if (!data.length) {
    return <EmptyChart message="Chưa có dữ liệu line chart." />;
  }

  const width = 640;
  const height = 260;
  const padding = 34;
  const maxValue = Math.max(...data.map((item) => item.totalTasks || 0), 1);
  const points = data.map((item, index) => {
    const x =
      padding +
      (index * (width - padding * 2)) / Math.max(data.length - 1, 1);
    const y =
      height -
      padding -
      ((item.totalTasks || 0) / maxValue) * (height - padding * 2);
    return { x, y, label: item.label, value: item.totalTasks || 0 };
  });
  const path = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-64 min-w-[520px]">
        <line
          x1={padding}
          y1={height - padding}
          x2={width - padding}
          y2={height - padding}
          className="stroke-gray-200"
        />
        <line
          x1={padding}
          y1={padding}
          x2={padding}
          y2={height - padding}
          className="stroke-gray-200"
        />
        <path d={path} fill="none" strokeWidth="3" className="stroke-blue-600" />
        {points.map((point) => (
          <g key={`${point.label}-${point.x}`}>
            <circle cx={point.x} cy={point.y} r="4" className="fill-blue-600" />
            <text
              x={point.x}
              y={point.y - 10}
              textAnchor="middle"
              className="fill-gray-600 text-[11px] font-semibold"
            >
              {point.value}
            </text>
            <text
              x={point.x}
              y={height - 10}
              textAnchor="middle"
              className="fill-gray-500 text-[10px]"
            >
              {point.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
};

const ColumnChart = ({ data }) => {
  if (!data.length) {
    return <EmptyChart message="Chưa có dữ liệu column chart." />;
  }

  const maxValue = Math.max(...data.map((item) => item.totalTasks || 0), 1);

  return (
    <div className="flex h-64 items-end gap-3 overflow-x-auto border-b border-gray-200 pb-2">
      {data.map((item) => (
        <div key={item.label} className="flex min-w-[72px] flex-1 flex-col items-center">
          <div className="flex h-48 w-full items-end justify-center gap-1">
            <Bar value={item.totalTasks} maxValue={maxValue} color="bg-blue-500" />
            <Bar
              value={item.completedTasks}
              maxValue={maxValue}
              color="bg-emerald-500"
            />
            <Bar
              value={item.overdueTasksCount}
              maxValue={maxValue}
              color="bg-red-500"
            />
          </div>
          <p className="mt-2 line-clamp-2 text-center text-xs font-semibold text-gray-600">
            {item.label}
          </p>
        </div>
      ))}
    </div>
  );
};

const Bar = ({ value = 0, maxValue, color }) => (
  <div
    title={String(value || 0)}
    className={`w-4 rounded-t ${color}`}
    style={{ height: `${Math.max(((value || 0) / maxValue) * 100, value ? 8 : 2)}%` }}
  />
);

const EmptyChart = ({ message }) => (
  <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-gray-300 text-sm text-gray-500">
    {message}
  </div>
);

export default EventDashboardPage;
