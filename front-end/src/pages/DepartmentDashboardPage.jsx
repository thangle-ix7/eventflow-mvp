import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Loader2,
  TrendingUp,
  Users,
} from 'lucide-react';
import AppLayout from '../components/AppLayout';
import { DepartmentLeaderSnapshotPanel } from '../components/DashboardSnapshotPanels';
import BurndownChart from '../components/BurndownChart';
import CumulativeFlowChart from '../components/CumulativeFlowChart';
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
const getLatestWeekDateRange = (eventStart, eventEnd) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = eventStart ? new Date(eventStart) : null;
  const end = eventEnd ? new Date(eventEnd) : null;
  const hasStart = start && !Number.isNaN(start.getTime());
  const hasEnd = end && !Number.isNaN(end.getTime());
  const to = hasEnd && end < today ? end : today;
  to.setHours(0, 0, 0, 0);

  const latestFrom = addDays(to, -6);
  const from = hasStart && start > latestFrom ? start : latestFrom;
  from.setHours(0, 0, 0, 0);

  return { fromDate: toDateInput(from), toDate: toDateInput(to) };
};

const DepartmentDashboardPage = ({ user, onLogout }) => {
  const { eventId, departmentId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [page, setPage] = useState(0);

  const eventQuery = useQuery({ queryKey: ['event', eventId], queryFn: () => eventApi.getEvent(eventId), enabled: Boolean(eventId) });
  const event = eventQuery.data;
  const permissions = getEventPermissions(event);
  const canViewDashboard = Boolean(event && permissions.canViewDepartmentDashboard && canAccessDepartment(event, departmentId));
  const dashboardRange = getLatestWeekDateRange(event?.startTime || event?.eventDate, event?.endTime);
  const leaderSnapshotQuery = useQuery({
    queryKey: ['departmentLeaderSnapshot', eventId, departmentId],
    queryFn: () => leaderSnapshotApi.getDepartmentLeaderSnapshot({ eventId, departmentId }),
    enabled: Boolean(eventId && departmentId && canViewDashboard),
  });
  const summaryQuery = useQuery({ queryKey: ['departmentDashboardSummary', eventId, departmentId], queryFn: () => dashboardApi.getDepartmentSummary({ eventId, departmentId }), enabled: Boolean(eventId && departmentId && canViewDashboard) });
  const trendQuery = useQuery({ queryKey: ['departmentTaskStatusTrend', eventId, departmentId, dashboardRange.fromDate, dashboardRange.toDate], queryFn: () => dashboardApi.getDepartmentTaskTrend({ eventId, departmentId, ...dashboardRange }), enabled: Boolean(eventId && departmentId && canViewDashboard) });
  const tasksQuery = useQuery({
    queryKey: ['departmentDashboardTasks', eventId, departmentId, page, dashboardRange.fromDate, dashboardRange.toDate],
    queryFn: () => taskApi.getEventTaskPage({ eventId, departmentId, page, size: PAGE_SIZE, sort: 'deadline', direction: 'asc', ...dashboardRange }),
    enabled: Boolean(eventId && departmentId && canViewDashboard),
  });

  const summary = summaryQuery.data;
  const tasks = tasksQuery.data?.content || [];
  const isLoading = eventQuery.isLoading || (canViewDashboard && (summaryQuery.isLoading || trendQuery.isLoading || tasksQuery.isLoading));
  const error = eventQuery.error || summaryQuery.error || trendQuery.error || tasksQuery.error;
  const openFilteredTasks = ({ status, deadlineStatus }) => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (deadlineStatus) params.set('deadlineStatus', deadlineStatus);
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
              <ChartPanel icon={<TrendingUp size={18} />} title="Burndown Chart">
                <BurndownChart data={trendQuery.data || []} />
              </ChartPanel>

              <ChartPanel icon={<BarChart3 size={18} />} title="Cumulative Flow">
                <CumulativeFlowChart
                  data={trendQuery.data || []}
                  onStatusClick={({ status, deadlineStatus }) => openFilteredTasks({ status, deadlineStatus })}
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

const TaskListSection = ({ tasks, page, setPage, pageData, eventId }) => (
  <section className="min-w-0 overflow-hidden rounded-[2rem] border border-sky-100 bg-white shadow-xl shadow-sky-100/70">
    <div className="flex items-center gap-3 border-b border-sky-100 bg-gradient-to-r from-sky-50 via-white to-emerald-50 px-5 py-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-emerald-400 text-white shadow-lg shadow-cyan-100">
        <ClipboardList size={18} />
      </div>
      <div>
        <h3 className="font-black text-slate-950">Danh sách công việc</h3>
        <p className="mt-1 text-xs font-semibold text-slate-500">Các task trong tuần gần nhất.</p>
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


export default DepartmentDashboardPage;
