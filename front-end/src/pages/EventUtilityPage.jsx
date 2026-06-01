import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarDays,
  ClipboardList,
  FileJson,
  FileSpreadsheet,
  FileText,
  Printer,
  Settings,
  TrendingUp,
  Users,
} from 'lucide-react';
import AppLayout from '../components/AppLayout';
import {
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  MetricCard,
  PageHeader,
  Panel,
  StatusBadge,
} from '../components/ui';
import departmentApi from '../api/departmentApi';
import eventApi from '../api/eventApi';
import eventMemberApi from '../api/eventMemberApi';
import taskApi from '../api/taskApi';
import { formatDate } from '../utils/dateUtils';
import {
  buildDashboardReport,
  exportDashboardCsv,
  exportDashboardJson,
  openPrintableDashboardReport,
} from '../utils/reportExport';

const PAGE_CONFIG = {
  calendar: {
    title: 'Lịch',
    description: 'Xem mốc sự kiện và deadline công việc từ dữ liệu hiện có.',
    icon: CalendarDays,
  },
  documents: {
    title: 'Tài liệu',
    description: 'Truy cập tài liệu theo từng công việc. Chưa có API tổng hợp file toàn sự kiện.',
    icon: FileText,
  },
  reports: {
    title: 'Báo cáo',
    description: 'Tổng hợp nhanh tiến độ từ task hiện tại, chưa thay thế report analytics backend.',
    icon: TrendingUp,
  },
  settings: {
    title: 'Cài đặt',
    description: 'Thông tin cấu hình sự kiện và các giới hạn hiện có ở frontend.',
    icon: Settings,
  },
};
const EVENT_STATUS_LABELS = {
  ACTIVE: 'Đang diễn ra',
  DONE: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
};

const EventUtilityPage = ({ user, onLogout, type }) => {
  const { eventId } = useParams();
  const config = PAGE_CONFIG[type] || PAGE_CONFIG.calendar;
  const Icon = config.icon;
  const [now] = useState(() => Date.now());

  const eventQuery = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => eventApi.getEvent(eventId),
    enabled: Boolean(eventId),
  });
  const tasksQuery = useQuery({
    queryKey: ['eventUtilityTasks', eventId],
    queryFn: () => taskApi.getEventTaskPage({ eventId, size: 100, sort: 'deadline', direction: 'asc' }),
    enabled: Boolean(eventId),
  });
  const departmentsQuery = useQuery({
    queryKey: ['eventDepartments', eventId],
    queryFn: () => departmentApi.getEventDepartments(eventId),
    enabled: Boolean(eventId),
  });
  const membersQuery = useQuery({
    queryKey: ['eventMembers', eventId],
    queryFn: () => eventMemberApi.getMembers(eventId),
    enabled: Boolean(eventId),
  });

  const event = eventQuery.data;
  const tasks = useMemo(() => tasksQuery.data?.content || [], [tasksQuery.data]);
  const departments = useMemo(() => departmentsQuery.data || [], [departmentsQuery.data]);
  const members = useMemo(() => membersQuery.data || [], [membersQuery.data]);
  const error = eventQuery.error || tasksQuery.error || departmentsQuery.error || membersQuery.error;
  const isLoading = eventQuery.isLoading || tasksQuery.isLoading || departmentsQuery.isLoading || membersQuery.isLoading;

  const stats = useMemo(() => {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((task) => task.status === 'DONE').length;
    const overdueTasks = tasks.filter((task) => task.deadline && new Date(task.deadline).getTime() < now && task.status !== 'DONE').length;
    const progress = totalTasks ? Math.floor((completedTasks / totalTasks) * 100) : 0;

    return { totalTasks, completedTasks, overdueTasks, progress };
  }, [now, tasks]);

  return (
    <AppLayout user={user} events={event ? [event] : []} selectedEvent={event} onLogout={onLogout}>
      <div className="space-y-6">
        <Link to={`/events/${eventId}`} className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600">
          <ArrowLeft size={16} />
          Quay lại sự kiện
        </Link>

        <PageHeader
          eyebrow={event?.name || 'Sự kiện'}
          title={config.title}
          description={config.description}
          meta={
            <span className="inline-flex items-center gap-2">
              <Icon size={16} />
              Dữ liệu lấy từ event, task, ban và thành viên hiện có
            </span>
          }
        />

        {isLoading && <LoadingState message={`Đang tải ${config.title.toLowerCase()}...`} />}
        {error && <ErrorState error={error} title={`Không tải được ${config.title.toLowerCase()}`} />}

        {!isLoading && !error && (
          <>
            {type === 'calendar' && <CalendarContent event={event} tasks={tasks} />}
            {type === 'documents' && <DocumentsContent eventId={eventId} tasks={tasks} />}
            {type === 'reports' && <ReportsContent event={event} stats={stats} departments={departments} members={members} tasks={tasks} />}
            {type === 'settings' && <SettingsContent event={event} departments={departments} members={members} />}
          </>
        )}
      </div>
    </AppLayout>
  );
};

const CalendarContent = ({ event, tasks }) => (
  <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
    <Panel className="p-5">
      <p className="text-sm font-semibold text-slate-500">Mốc sự kiện</p>
      <h3 className="mt-2 text-xl font-extrabold text-slate-950">{event?.name || 'Sự kiện'}</h3>
      <p className="mt-3 text-sm text-slate-600">{formatDate(event?.startTime || event?.eventDate)}</p>
      <p className="mt-1 text-sm text-slate-500">{event?.location || 'Chưa có địa điểm'}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <StatusBadge status={event?.role} />
        <StatusBadge status={event?.status || 'ACTIVE'} />
      </div>
    </Panel>

    <Panel>
      <div className="border-b border-slate-100 p-4">
        <h3 className="font-bold text-slate-950">Deadline công việc</h3>
        <p className="mt-1 text-sm text-slate-500">Sắp xếp theo deadline từ API task hiện có.</p>
      </div>
      {tasks.length === 0 ? (
        <div className="p-4">
          <EmptyState icon={CalendarDays} title="Chưa có deadline công việc" description="Khi có task, deadline sẽ xuất hiện ở đây." />
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {tasks.map((task) => (
            <Link key={task.id} to={`/events/${event?.id}/tasks/${task.id}`} className="flex flex-col gap-2 p-4 transition hover:bg-indigo-50/50 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-slate-950">{task.title}</p>
                <p className="text-sm text-slate-500">{task.departmentName || 'Chưa gán ban'} • {task.assigneeName || 'Chưa phân công'}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-slate-700">{formatDate(task.deadline)}</span>
                <StatusBadge status={task.status} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </Panel>
  </div>
);

const DocumentsContent = ({ eventId, tasks }) => (
  <Panel>
    <div className="border-b border-slate-100 p-4">
      <h3 className="font-bold text-slate-950">Tài liệu theo công việc</h3>
      <p className="mt-1 text-sm text-slate-500">
        Backend hiện hỗ trợ attachment ở cấp task; chưa có endpoint tổng hợp tài liệu toàn sự kiện.
      </p>
    </div>
    {tasks.length === 0 ? (
      <div className="p-4">
        <EmptyState icon={FileText} title="Chưa có công việc để xem tài liệu" description="Tạo task trước, sau đó upload attachment ở chi tiết task." />
      </div>
    ) : (
      <div className="divide-y divide-slate-100">
        {tasks.map((task) => (
          <div key={task.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-slate-950">{task.title}</p>
              <p className="text-sm text-slate-500">{task.departmentName || 'Chưa gán ban'} • {task.assigneeName || 'Chưa phân công'}</p>
            </div>
            <Button as={Link} to={`/events/${eventId}/tasks/${task.id}/attachments`} variant="secondary">
              Mở tài liệu
            </Button>
          </div>
        ))}
      </div>
    )}
  </Panel>
);

const ReportsContent = ({ event, stats, departments, members, tasks }) => {
  const statusData = useMemo(() => {
    const statuses = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];
    return statuses.map((status) => ({
      label: status,
      totalTasks: tasks.filter((task) => task.status === status).length,
    }));
  }, [tasks]);
  const report = useMemo(() => buildDashboardReport({
    event,
    summary: {
      totalTasks: stats.totalTasks,
      completedTasks: stats.completedTasks,
      progressPercentage: stats.progress,
      overdueTasksCount: stats.overdueTasks,
    },
    statusData,
    tasks,
    departments,
    members,
    note: 'Dữ liệu xuất từ trang Báo cáo frontend. So sánh tháng trước đang ẩn vì API hiện chưa có summary kỳ trước.',
  }), [departments, event, members, stats, statusData, tasks]);

  return (
    <div className="space-y-4">
      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard icon={ClipboardList} label="Tổng công việc" value={stats.totalTasks} />
        <MetricCard icon={TrendingUp} label="Tiến độ" value={`${stats.progress}%`} tone="violet" />
        <MetricCard icon={CalendarDays} label="Quá hạn" value={stats.overdueTasks} tone={stats.overdueTasks > 0 ? 'red' : 'slate'} />
        <MetricCard icon={Users} label="Thành viên" value={members.length} tone="emerald" />
      </section>
      <Panel className="p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="font-bold text-slate-950">Báo cáo nhanh</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Tổng hợp từ dữ liệu task, ban và thành viên hiện có trên frontend. So sánh tháng trước đang ẩn để tránh hiển thị số giả khi backend chưa có summary kỳ trước.
            </p>
          </div>
          <ReportDownloadButtons report={report} />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <SummaryPill label="Ban tổ chức" value={departments.length} />
          <SummaryPill label="Task hoàn thành" value={stats.completedTasks} />
          <SummaryPill label="Task đang mở" value={tasks.length - stats.completedTasks} />
        </div>
      </Panel>
    </div>
  );
};

const ReportDownloadButtons = ({ report }) => (
  <div className="flex flex-wrap gap-2">
    <Button type="button" variant="secondary" onClick={() => exportDashboardCsv(report)}>
      <FileSpreadsheet size={16} />
      CSV
    </Button>
    <Button type="button" variant="secondary" onClick={() => exportDashboardJson(report)}>
      <FileJson size={16} />
      JSON
    </Button>
    <Button type="button" onClick={() => openPrintableDashboardReport(report)}>
      <Printer size={16} />
      In / lưu PDF
    </Button>
  </div>
);

const SettingsContent = ({ event, departments, members }) => (
  <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
    <Panel className="p-5">
      <h3 className="font-bold text-slate-950">Thông tin sự kiện</h3>
      <dl className="mt-4 grid gap-4 sm:grid-cols-2">
        <InfoItem label="Tên sự kiện" value={event?.name} />
        <InfoItem label="Trạng thái" value={EVENT_STATUS_LABELS[event?.status] || event?.status || 'Đang diễn ra'} />
        <InfoItem label="Vai trò của bạn" value={event?.role === 'LEADER' ? 'Trưởng nhóm' : 'Thành viên'} />
        <InfoItem label="Ngày diễn ra" value={formatDate(event?.startTime || event?.eventDate)} />
        <InfoItem label="Địa điểm" value={event?.location || 'Chưa có địa điểm'} />
        <InfoItem label="Mô tả" value={event?.description || 'Chưa có mô tả'} />
      </dl>
    </Panel>
    <Panel className="p-5">
      <h3 className="font-bold text-slate-950">Cấu hình khả dụng</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Trang này là khung cài đặt frontend. Các thao tác cấu hình nâng cao cần API backend riêng.
      </p>
      <div className="mt-4 space-y-3">
        <SummaryPill label="Ban tổ chức" value={departments.length} />
        <SummaryPill label="Thành viên" value={members.length} />
      </div>
    </Panel>
  </div>
);

const SummaryPill = ({ label, value }) => (
  <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
    <p className="mt-1 text-2xl font-extrabold text-slate-950">{value ?? 0}</p>
  </div>
);

const InfoItem = ({ label, value }) => (
  <div>
    <dt className="text-sm font-semibold text-slate-500">{label}</dt>
    <dd className="mt-1 text-sm font-medium text-slate-950">{value || 'Không có dữ liệu'}</dd>
  </div>
);

export default EventUtilityPage;
