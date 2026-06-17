import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Edit,
  FileText,
  Layers3,
  Paperclip,
  RefreshCw,
  Sparkles,
  TrendingUp,
  UserRound,
} from 'lucide-react';
import AppLayout from '../components/AppLayout';
import InlineTaskCreator from '../components/InlineTaskCreator';
import {
  Button,
  ErrorState,
  LoadingState,
  PageHeader,
  Panel,
  PriorityBadge,
  ProgressBar,
  StatusBadge,
} from '../components/ui';
import departmentApi from '../api/departmentApi';
import eventApi from '../api/eventApi';
import taskApi from '../api/taskApi';
import workloadApi from '../api/workloadApi';
import { formatDate } from '../utils/dateUtils';

const SUBTASK_PAGE_SIZE = 8;

const getWorkloadClassName = (status) => {
  if (status === 'OVERLOADED') {
    return 'text-red-600';
  }

  if (status === 'HIGH') {
    return 'text-amber-600';
  }

  if (status === 'NORMAL') {
    return 'text-emerald-600';
  }

  return 'text-slate-500';
};

const TaskDetailPage = ({ user, onLogout }) => {
  const { eventId, taskId } = useParams();
  const [subtaskPage, setSubtaskPage] = useState(0);

  const eventQuery = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => eventApi.getEvent(eventId),
    enabled: Boolean(eventId),
  });

  const taskQuery = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => taskApi.getTask(taskId),
    enabled: Boolean(taskId),
  });

  const departmentsQuery = useQuery({
    queryKey: ['eventDepartments', eventId],
    queryFn: () => departmentApi.getEventDepartments(eventId),
    enabled: Boolean(eventId),
  });

  const subtasksQuery = useQuery({
    queryKey: ['subtasks', String(taskId), subtaskPage, SUBTASK_PAGE_SIZE],
    queryFn: () => taskApi.getSubtasks({ taskId, page: subtaskPage, size: SUBTASK_PAGE_SIZE }),
    enabled: Boolean(taskId),
  });

  const event = eventQuery.data;
  const task = taskQuery.data;
  const subtasks = subtasksQuery.data?.content || [];
  const subtaskTotal = subtasksQuery.data?.totalElements || 0;
  const isLeader = event?.role === 'LEADER';
  const isAssignee = task?.assigneeId === user?.userId;
  const isSubtask = Boolean(task?.parentId);
  const hasSubtasks = subtaskTotal > 0;
  const canCreateSubtasks = isLeader && task && !task.parentId;

  /*
   * Query workload toàn event để lấy workload của tất cả thành viên.
   * Hiện backend đang cho Event Leader xem toàn bộ workload.
   */
  const eventWorkloadQuery = useQuery({
    queryKey: ['eventWorkload', eventId],
    queryFn: () => workloadApi.getEventWorkload(eventId),
    enabled: Boolean(eventId && isLeader),
  });

  /*
   * Map workload theo memberId để render nhanh ở task chính và subtask.
   */
  const workloadByMemberId = useMemo(() => {
    const departments = eventWorkloadQuery.data?.departments || [];

    return departments.reduce((map, department) => {
      (department.members || []).forEach((member) => {
        map[String(member.memberId)] = member;
      });

      return map;
    }, {});
  }, [eventWorkloadQuery.data]);

  const getMemberWorkload = (memberId) => {
    if (!memberId) {
      return null;
    }

    return workloadByMemberId[String(memberId)] || null;
  };

  const taskAssigneeWorkload = getMemberWorkload(task?.assigneeId);

  return (
    <AppLayout
      user={user}
      events={event ? [event] : []}
      selectedEvent={event}
      onEventChange={() => {}}
      onLogout={onLogout}
    >
      <div className="space-y-6">
        {taskQuery.isLoading && <LoadingState message="Đang tải công việc..." />}
        {taskQuery.error && <ErrorState error={taskQuery.error} title="Không tải được công việc" />}

        {task && (
          <>
            <PageHeader
              eyebrow={event?.name || 'Sự kiện'}
              title={task.title}
              description={task.description || 'Công việc chưa có mô tả chi tiết.'}
              meta={
                <>
                  <span className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-white px-3 py-1.5 font-black text-sky-600 shadow-sm">
                    <StatusBadge status={task.status} />
                  </span>

                  <span className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-white px-3 py-1.5 font-black text-emerald-600 shadow-sm">
                    <Layers3 size={16} />
                    {task.departmentName || 'Chưa gán ban'}
                  </span>

                  <span className="inline-flex items-center gap-2 rounded-full border border-cyan-100 bg-white px-3 py-1.5 font-black text-cyan-600 shadow-sm">
                    <ClipboardCheck size={16} />
                    {isSubtask ? 'Subtask' : 'Task chính'}
                  </span>
                </>
              }
            />

            <Panel className="relative overflow-hidden p-0">
              <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-sky-100 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-emerald-100/70 blur-3xl" />

              <div className="relative border-b border-sky-100 bg-gradient-to-r from-sky-50 via-white to-emerald-50 px-5 py-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-emerald-400 text-white shadow-lg shadow-cyan-100">
                      <ClipboardCheck className="h-6 w-6" strokeWidth={1.8} />
                    </div>

                    <div>
                      <h3 className="text-lg font-black text-slate-950">
                        Thông tin công việc
                      </h3>
                      <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                        Xem người phụ trách, deadline, mức ưu tiên, workload và tiến độ hiện tại.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {isAssignee && !hasSubtasks && (
                      <Button
                        as={Link}
                        to={`/events/${eventId}/tasks/${taskId}/update`}
                        className="rounded-2xl"
                      >
                        <RefreshCw size={16} />
                        Cập nhật
                      </Button>
                    )}

                    {isLeader && (
                      <Button
                        as={Link}
                        to={`/events/${eventId}/tasks/${taskId}/edit`}
                        variant="secondary"
                        className="rounded-2xl border-sky-100 bg-white font-black text-sky-600 shadow-sm hover:bg-sky-50"
                      >
                        <Edit size={16} />
                        Chỉnh sửa
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div className="relative grid gap-4 p-5 lg:grid-cols-[1fr_360px]">
                <div className="grid gap-4 sm:grid-cols-2">
                  <InfoCard
                    icon={<UserRound size={18} />}
                    label="Người phụ trách"
                    value={task.assigneeName || 'Chưa phân công'}
                    helper={
                      taskAssigneeWorkload
                        ? `${taskAssigneeWorkload.assignedTasks} task · ${taskAssigneeWorkload.workloadStatus}`
                        : ''
                    }
                    helperClassName={taskAssigneeWorkload ? getWorkloadClassName(taskAssigneeWorkload.workloadStatus) : ''}
                  />

                  <InfoCard
                    icon={<CalendarDays size={18} />}
                    label="Deadline"
                    value={formatDate(task.deadline)}
                  />

                  <InfoCard
                    icon={<Layers3 size={18} />}
                    label="Ban phụ trách"
                    value={task.departmentName || 'Chưa gán ban'}
                  />

                  <InfoCard
                    icon={<ClipboardCheck size={18} />}
                    label="Loại công việc"
                    value={isSubtask ? 'Subtask' : 'Task chính'}
                  />
                </div>

                <div className="rounded-[1.5rem] border border-sky-100 bg-sky-50/60 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={task.status} />
                    <PriorityBadge priority={task.priority} />
                  </div>

                  {!isSubtask ? (
                    <div className="mt-5">
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="inline-flex items-center gap-2 font-black text-slate-700">
                          <TrendingUp size={16} className="text-sky-500" />
                          Tiến độ
                        </span>
                        <span className="font-black text-sky-600">
                          {task.progressPercentage ?? 0}%
                        </span>
                      </div>
                      <ProgressBar value={task.progressPercentage ?? 0} />
                    </div>
                  ) : (
                    <div className="mt-5 rounded-2xl border border-sky-100 bg-white p-3 text-sm font-semibold text-slate-500">
                      Subtask chỉ cập nhật trạng thái. Tiến độ được quy đổi theo trạng thái hoàn thành.
                    </div>
                  )}
                </div>
              </div>
            </Panel>

            <Panel className="overflow-hidden p-0">
              <div className="flex flex-col gap-4 border-b border-sky-100 bg-gradient-to-r from-sky-50 via-white to-emerald-50 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-emerald-400 text-white shadow-lg shadow-cyan-100">
                    <Layers3 className="h-5 w-5" strokeWidth={1.8} />
                  </div>

                  <div>
                    <h2 className="text-lg font-black text-slate-950">
                      Danh sách subtask
                    </h2>
                    <p className="mt-1 text-sm font-semibold text-slate-500">
                      Theo dõi các đầu việc con được tách ra từ task chính.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {subtasksQuery.isFetching && (
                    <span className="inline-flex rounded-full border border-sky-100 bg-white px-3 py-1.5 text-xs font-black text-slate-500 shadow-sm">
                      Đang cập nhật...
                    </span>
                  )}

                  <span className="inline-flex rounded-full border border-sky-100 bg-white px-3 py-1.5 text-xs font-black text-sky-600 shadow-sm">
                    {subtaskTotal} subtask
                  </span>
                </div>
              </div>

              {canCreateSubtasks && (
                <InlineTaskCreator
                  eventId={eventId}
                  parentTaskId={taskId}
                  event={event}
                  departments={departmentsQuery.data || []}
                  departmentId={task.departmentId || ''}
                  lockedDepartment
                  invalidateKeys={[
                    ['task', taskId],
                    ['subtasks', String(taskId)],
                    ['eventWorkload', eventId],
                    ['departmentWorkload', eventId, task.departmentId ? String(task.departmentId) : ''],
                  ]}
                  title="Thêm subtask theo danh sách"
                  saveLabel="Lưu subtask"
                  openLabel="Thêm subtask"
                />
              )}

              {subtasksQuery.error && (
                <div className="p-5">
                  <ErrorState error={subtasksQuery.error} title="Không tải được subtask" />
                </div>
              )}

              {subtasks.length > 0 ? (
                <div className="overflow-x-auto">
                  <div className="min-w-[980px]">
                    <div className="grid grid-cols-[minmax(220px,1.5fr)_170px_210px_140px_180px] items-center gap-3 border-b border-sky-100 bg-sky-50/70 px-5 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                      <span>Tên subtask</span>
                      <span>Ban</span>
                      <span>Phụ trách</span>
                      <span>Trạng thái</span>
                      <span>Deadline</span>
                    </div>

                    {subtasks.map((subtask) => {
                      const subtaskAssigneeWorkload = getMemberWorkload(subtask.assigneeId);

                      return (
                        <Link
                          key={subtask.id}
                          to={`/events/${eventId}/tasks/${subtask.id}`}
                          className="grid grid-cols-[minmax(220px,1.5fr)_170px_210px_140px_180px] items-center gap-3 border-b border-sky-100 px-5 py-4 text-sm transition last:border-b-0 hover:bg-sky-50/70"
                        >
                          <span className="min-w-0">
                            <span className="block truncate font-black text-slate-950">
                              {subtask.title}
                            </span>
                          </span>

                          <span className="inline-flex min-w-0 items-center gap-2 truncate font-semibold text-slate-600">
                            <Layers3 size={15} className="shrink-0 text-emerald-500" />
                            <span className="truncate">{subtask.departmentName || 'Chưa gán ban'}</span>
                          </span>

                          <span className="min-w-0">
                            <span className="flex items-center gap-2 truncate font-semibold text-slate-600">
                              <UserRound size={15} className="shrink-0 text-sky-500" />
                              <span className="truncate">{subtask.assigneeName || 'Chưa phân công'}</span>
                            </span>

                            {subtaskAssigneeWorkload && (
                              <span
                                className={`mt-1 block truncate text-[11px] font-black ${getWorkloadClassName(
                                  subtaskAssigneeWorkload.workloadStatus
                                )}`}
                                title={`${subtaskAssigneeWorkload.assignedTasks} task chưa hoàn thành · ${subtaskAssigneeWorkload.workloadScore}% · ${subtaskAssigneeWorkload.workloadStatus}`}
                              >
                                {subtaskAssigneeWorkload.assignedTasks} task · {subtaskAssigneeWorkload.workloadStatus}
                              </span>
                            )}
                          </span>

                          <span>
                            <StatusBadge status={subtask.status} />
                          </span>

                          <span className="inline-flex items-center gap-2 whitespace-nowrap font-semibold text-slate-600">
                            <CalendarDays size={15} className="text-emerald-500" />
                            {formatDate(subtask.deadline)}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="p-5">
                  <div className="rounded-2xl border border-sky-100 bg-sky-50/60 p-5 text-sm font-semibold text-slate-500">
                    Chưa có subtask.
                  </div>
                </div>
              )}

              {hasSubtasks && (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-sky-100 px-5 py-4 text-sm font-semibold text-slate-600">
                  <span>
                    Trang <span className="font-black text-slate-950">{subtaskPage + 1}</span>
                    {subtasksQuery.data?.totalPages ? ` / ${subtasksQuery.data.totalPages}` : ''} · {subtaskTotal} subtask
                  </span>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      onClick={() => setSubtaskPage((old) => Math.max(old - 1, 0))}
                      disabled={subtaskPage === 0 || subtasksQuery.isFetching}
                      variant="secondary"
                      className="rounded-2xl"
                    >
                      <ChevronLeft size={16} />
                      Trước
                    </Button>

                    <Button
                      type="button"
                      onClick={() => setSubtaskPage((old) => old + 1)}
                      disabled={subtasksQuery.data?.last !== false || subtasksQuery.isFetching}
                      variant="secondary"
                      className="rounded-2xl"
                    >
                      Sau
                      <ChevronRight size={16} />
                    </Button>
                  </div>
                </div>
              )}
            </Panel>

            <section className="grid gap-4 md:grid-cols-3">
              {!hasSubtasks && !isSubtask && (
                <TaskActionLink
                  to={`/events/${eventId}/tasks/${taskId}/reports`}
                  icon={<FileText size={22} />}
                  title="Report tiến độ"
                  description="Nộp report, mô tả tiến độ và ảnh minh chứng."
                />
              )}

              <TaskActionLink
                to={`/events/${eventId}/tasks/${taskId}/attachments`}
                icon={<Paperclip size={22} />}
                title="Attachment"
                description="Quản lý file, ảnh, ZIP hoặc link liên quan đến task."
              />

              {!hasSubtasks && (
                <TaskActionLink
                  to={`/events/${eventId}/tasks/${taskId}/reviews`}
                  icon={<ClipboardCheck size={22} />}
                  title="Review"
                  description="Xem hoặc gửi review khi task đang chờ duyệt."
                />
              )}
            </section>
          </>
        )}
      </div>
    </AppLayout>
  );
};

const InfoCard = ({ icon, label, value, helper, helperClassName = 'text-slate-400' }) => (
  <div className="rounded-[1.5rem] border border-sky-100 bg-white p-4 shadow-sm">
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
          {label}
        </p>
        <p className="mt-1 truncate text-sm font-black text-slate-950">
          {value || 'Không có dữ liệu'}
        </p>

        {helper && (
          <p className={`mt-1 truncate text-xs font-black ${helperClassName}`}>
            {helper}
          </p>
        )}
      </div>
    </div>
  </div>
);

const TaskActionLink = ({ to, icon, title, description }) => (
  <Link
    to={to}
    className="group relative overflow-hidden rounded-[2rem] border border-sky-100 bg-white p-5 shadow-xl shadow-sky-100/70 transition hover:-translate-y-1 hover:shadow-2xl hover:shadow-cyan-100"
  >
    <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-sky-100/80 opacity-0 blur-3xl transition group-hover:opacity-100" />

    <div className="relative">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-emerald-400 text-white shadow-lg shadow-cyan-100">
        {icon}
      </div>

      <h3 className="mt-4 font-black text-slate-950">
        {title}
      </h3>

      <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
        {description}
      </p>

      <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1.5 text-xs font-black text-sky-700 transition group-hover:bg-white">
        Mở
        <Sparkles size={13} />
      </div>
    </div>
  </Link>
);

export default TaskDetailPage;
