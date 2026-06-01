import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarDays,
  ClipboardList,
  Download,
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
  PriorityBadge,
  StatusBadge,
} from '../components/ui';
import departmentApi from '../api/departmentApi';
import eventApi from '../api/eventApi';
import eventMemberApi from '../api/eventMemberApi';
import eventUtilityApi from '../api/eventUtilityApi';
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
    description: 'Xem mốc sự kiện và deadline công việc từ API calendar tổng hợp.',
    icon: CalendarDays,
  },
  documents: {
    title: 'Tài liệu',
    description: 'Tổng hợp attachment của mọi công việc trong sự kiện.',
    icon: FileText,
  },
  reports: {
    title: 'Báo cáo',
    description: 'Tổng hợp report tiến độ thật từ các công việc.',
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
  const [calendarDate, setCalendarDate] = useState(() => {
    const today = new Date();
    return { year: today.getFullYear(), month: today.getMonth() + 1 };
  });
  const reportRange = useMemo(() => {
    const to = new Date();
    const from = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
    return {
      fromDate: from.toISOString().slice(0, 10),
      toDate: to.toISOString().slice(0, 10),
    };
  }, []);

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
  const calendarQuery = useQuery({
    queryKey: ['eventCalendar', eventId, calendarDate.year, calendarDate.month],
    queryFn: () => eventUtilityApi.getCalendarMonth({ eventId, ...calendarDate }),
    enabled: Boolean(eventId && type === 'calendar'),
  });
  const documentsQuery = useQuery({
    queryKey: ['eventDocuments', eventId],
    queryFn: () => eventUtilityApi.getDocuments(eventId),
    enabled: Boolean(eventId && type === 'documents'),
  });
  const reportsQuery = useQuery({
    queryKey: ['eventReports', eventId, reportRange.fromDate, reportRange.toDate],
    queryFn: () => eventUtilityApi.getReports({ eventId, ...reportRange }),
    enabled: Boolean(eventId && type === 'reports'),
  });

  const event = eventQuery.data;
  const tasks = useMemo(() => tasksQuery.data?.content || [], [tasksQuery.data]);
  const departments = useMemo(() => departmentsQuery.data || [], [departmentsQuery.data]);
  const members = useMemo(() => membersQuery.data || [], [membersQuery.data]);
  const utilityError = calendarQuery.error || documentsQuery.error || reportsQuery.error;
  const utilityLoading = calendarQuery.isLoading || documentsQuery.isLoading || reportsQuery.isLoading;
  const error = eventQuery.error || tasksQuery.error || departmentsQuery.error || membersQuery.error || utilityError;
  const isLoading = eventQuery.isLoading || tasksQuery.isLoading || departmentsQuery.isLoading || membersQuery.isLoading || utilityLoading;

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
              Dữ liệu đọc từ API tổng hợp của sự kiện
            </span>
          }
        />

        {isLoading && <LoadingState message={`Đang tải ${config.title.toLowerCase()}...`} />}
        {error && <ErrorState error={error} title={`Không tải được ${config.title.toLowerCase()}`} />}

        {!isLoading && !error && (
          <>
            {type === 'calendar' && <CalendarContent event={event} calendar={calendarQuery.data} calendarDate={calendarDate} setCalendarDate={setCalendarDate} />}
            {type === 'documents' && <DocumentsContent eventId={eventId} documents={documentsQuery.data || []} />}
            {type === 'reports' && <ReportsContent event={event} stats={stats} departments={departments} members={members} tasks={tasks} reportsData={reportsQuery.data} reportRange={reportRange} />}
            {type === 'settings' && <SettingsContent event={event} departments={departments} members={members} />}
          </>
        )}
      </div>
    </AppLayout>
  );
};

const CalendarContent = ({ event, calendar, calendarDate, setCalendarDate }) => {
  const days = calendar?.days || [];
  const items = days.flatMap((day) => day.items || []);
  const changeMonth = (offset) => {
    const next = new Date(calendarDate.year, calendarDate.month - 1 + offset, 1);
    setCalendarDate({ year: next.getFullYear(), month: next.getMonth() + 1 });
  };

  return (
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
      <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-bold text-slate-950">Lịch tháng {calendar?.month || calendarDate.month}/{calendar?.year || calendarDate.year}</h3>
          <p className="mt-1 text-sm text-slate-500">Gồm mốc sự kiện và deadline công việc trong tháng.</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={() => changeMonth(-1)}>Tháng trước</Button>
          <Button type="button" variant="secondary" onClick={() => changeMonth(1)}>Tháng sau</Button>
        </div>
      </div>
      {items.length === 0 ? (
        <div className="p-4">
          <EmptyState icon={CalendarDays} title="Chưa có lịch trong tháng này" description="Mốc sự kiện hoặc deadline task sẽ xuất hiện khi có dữ liệu." />
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {items.map((item) => (
            <Link key={`${item.type}-${item.id}`} to={item.taskId ? `/events/${event?.id}/tasks/${item.taskId}` : `/events/${event?.id}`} className="flex flex-col gap-2 p-4 transition hover:bg-indigo-50/50 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-slate-950">{item.title}</p>
                <p className="text-sm text-slate-500">{item.departmentName || 'Mốc sự kiện'} • {item.assigneeName || item.type}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-slate-700">{formatDate(item.date)}</span>
                {item.taskPriority && <PriorityBadge priority={item.taskPriority} />}
                {item.taskStatus ? <StatusBadge status={item.taskStatus} /> : <StatusBadge status={item.type} />}
              </div>
            </Link>
          ))}
        </div>
      )}
    </Panel>
  </div>
  );
};

const DocumentsContent = ({ eventId, documents }) => {
  const handleDownload = async (document) => {
    const blob = await taskApi.downloadTaskAttachment(document.id);
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement('a');
    link.href = url;
    link.download = document.originalName || 'eventflow-document';
    window.document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
  <Panel>
    <div className="border-b border-slate-100 p-4">
      <h3 className="font-bold text-slate-950">Tài liệu toàn sự kiện</h3>
      <p className="mt-1 text-sm text-slate-500">Danh sách attachment được tổng hợp từ mọi task trong sự kiện.</p>
    </div>
    {documents.length === 0 ? (
      <div className="p-4">
        <EmptyState icon={FileText} title="Chưa có tài liệu" description="Attachment upload ở task sẽ xuất hiện tại đây." />
      </div>
    ) : (
      <div className="divide-y divide-slate-100">
        {documents.map((document) => (
          <div key={document.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-slate-950">{document.originalName}</p>
              <p className="text-sm text-slate-500">{document.taskTitle} • {document.departmentName} • {document.uploaderName}</p>
              <p className="mt-1 text-xs text-slate-400">{formatFileSize(document.sizeBytes)} • {formatDate(document.createdAt)}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button as={Link} to={`/events/${eventId}/tasks/${document.taskId}/attachments`} variant="secondary">
                Mở task
              </Button>
              <Button type="button" onClick={() => handleDownload(document)}>
                <Download size={16} />
                Tải xuống
              </Button>
            </div>
          </div>
        ))}
      </div>
    )}
  </Panel>
  );
};

const formatFileSize = (sizeBytes) => {
  const size = Number(sizeBytes || 0);
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 102.4) / 10} KB`;
  return `${Math.round(size / 1024 / 102.4) / 10} MB`;
};

const ReportsContent = ({ event, stats, departments, members, tasks, reportsData, reportRange }) => {
  const reports = useMemo(() => reportsData?.reports || [], [reportsData]);
  const reportSummary = reportsData?.summary || {};
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
    range: reportRange,
    reportItems: reports,
    note: 'Dữ liệu xuất từ trang Báo cáo: task hiện tại và task reports thật trong khoảng ngày đã chọn.',
  }), [departments, event, members, reportRange, reports, stats, statusData, tasks]);

  return (
    <div className="space-y-4">
      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard icon={ClipboardList} label="Tổng công việc" value={stats.totalTasks} />
        <MetricCard icon={TrendingUp} label="Report tiến độ" value={reportSummary.totalReports || 0} tone="violet" />
        <MetricCard icon={CalendarDays} label="Task đã report" value={reportSummary.reportedTasks || 0} tone="emerald" />
        <MetricCard icon={Users} label="Thành viên" value={members.length} tone="emerald" />
      </section>
      <Panel>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="font-bold text-slate-950">Report tiến độ thật</h3>
            <p className="mt-1 text-sm text-slate-500">
              {reportsData?.fromDate || reportRange.fromDate} - {reportsData?.toDate || reportRange.toDate} • trung bình {Math.round(reportSummary.averageReportedProgress || 0)}%
            </p>
          </div>
          <ReportDownloadButtons report={report} />
        </div>
        {reports.length === 0 ? (
          <div className="p-4">
            <EmptyState icon={TrendingUp} title="Chưa có report trong kỳ" description="Khi thành viên cập nhật tiến độ task, report sẽ xuất hiện tại đây." />
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {reports.map((item) => (
              <Link key={item.id} to={`/events/${event?.id}/tasks/${item.taskId}/reports`} className="block p-4 transition hover:bg-indigo-50/50">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-semibold text-slate-950">{item.taskTitle}</p>
                    <p className="text-sm text-slate-500">{item.departmentName} • {item.reporterName} • {formatDate(item.createdAt)}</p>
                    <p className="mt-2 line-clamp-2 text-sm text-slate-600">{item.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <SummaryPill label="Tiến độ" value={`${item.progressPercentage}%`} />
                    <StatusBadge status={item.taskStatus} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
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
