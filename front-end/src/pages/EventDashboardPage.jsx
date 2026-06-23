import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import { EventLeaderSnapshotPanel } from '../components/DashboardSnapshotPanels';
import BurndownChart from '../components/BurndownChart';
import CumulativeFlowChart from '../components/CumulativeFlowChart';
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

const EventDashboardPage = ({ user, onLogout }) => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
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

  const dashboardRange = useMemo(
    () => getLatestWeekDateRange(event?.startTime || event?.eventDate, event?.endTime),
    [event?.endTime, event?.eventDate, event?.startTime]
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


  const trendQuery = useQuery({
    queryKey: ['eventTaskStatusTrend', eventId, selectedDepartmentId, dashboardRange.fromDate, dashboardRange.toDate],
    queryFn: () => selectedDepartmentId
      ? dashboardApi.getDepartmentTaskTrend({ eventId, departmentId: selectedDepartmentId, ...dashboardRange })
      : dashboardApi.getTaskTrend(eventId, dashboardRange),
    enabled: Boolean(eventId && canViewDashboard),
  });

  const summary = summaryQuery.data;
  const departments = useMemo(() => departmentsQuery.data || [], [departmentsQuery.data]);

  const isLoading = eventQuery.isLoading || (canViewDashboard && (
    departmentsQuery.isLoading ||
    summaryQuery.isLoading ||
    trendQuery.isLoading
  ));

  const error = eventQuery.error ||
    departmentsQuery.error ||
    summaryQuery.error ||
    trendQuery.error;

  const handleDepartmentChange = (event) => {
    setDepartmentId(event.target.value);
  };

  const openFilteredTasks = ({ status, deadlineStatus }) => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (deadlineStatus) params.set('deadlineStatus', deadlineStatus);
    if (selectedDepartmentId) params.set('departmentId', selectedDepartmentId);
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
          <div className="max-w-sm">
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
              <ChartPanel title="Burndown Chart">
                <BurndownChart data={trendQuery.data || []} />
              </ChartPanel>

              <ChartPanel title="Cumulative Flow">
                <CumulativeFlowChart
                  data={trendQuery.data || []}
                  onStatusClick={({ status, deadlineStatus }) => openFilteredTasks({ status, deadlineStatus })}
                />
              </ChartPanel>
            </section>
          </>
        )}
      </div>
    </AppLayout>
  );
};

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

export default EventDashboardPage;
