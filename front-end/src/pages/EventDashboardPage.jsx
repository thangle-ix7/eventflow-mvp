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
              <ChartPanel title="Burndown Chart">
                <BurndownChart
                  data={trendQuery.data || []}
                  onPointClick={({ date }) => openFilteredTasks({ fromDate: date, toDate: date })}
                />
              </ChartPanel>

              <ChartPanel title="Cumulative Flow">
                <CumulativeFlowChart
                  data={trendQuery.data || []}
                  onStatusClick={({ status, deadlineStatus, date }) => openFilteredTasks({ status, deadlineStatus, fromDate: date, toDate: date })}
                />
              </ChartPanel>
            </section>
          </>
        )}
      </div>
    </AppLayout>
  );
};

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

export default EventDashboardPage;
