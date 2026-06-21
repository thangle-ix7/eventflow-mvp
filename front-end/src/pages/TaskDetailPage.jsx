import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Edit,
  FileText,
  Paperclip,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';
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

const getDeadlineStatusLabel = (deadlineStatus) => {
  if (deadlineStatus === 'OVERDUE') return 'Quá hạn';
  if (deadlineStatus === 'DUE_SOON') return 'Gần hạn';
  return '';
};

const getDeadlineStatusClassName = (deadlineStatus) => {
  if (deadlineStatus === 'OVERDUE') return 'text-red-600';
  if (deadlineStatus === 'DUE_SOON') return 'text-amber-600';
  return 'text-slate-400';
};

const getWorkloadClassName = (status) => {
  if (status === 'OVERLOADED') return 'text-red-600';
  if (status === 'HIGH') return 'text-amber-600';
  if (status === 'NORMAL') return 'text-emerald-600';
  return 'text-slate-500';
};

const TaskDetailPage = ({ user }) => {
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

  const eventWorkloadQuery = useQuery({
    queryKey: ['eventWorkload', eventId],
    queryFn: () => workloadApi.getEventWorkload(eventId),
    enabled: Boolean(eventId && isLeader),
  });

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

  if (taskQuery.isLoading) {
    return <LoadingState message="Đang tải công việc..." />;
  }

  if (taskQuery.error) {
    return <ErrorState error={taskQuery.error} title="Không tải được công việc" />;
  }

  if (!task) {
    return <ErrorState error="Không tìm thấy công việc này" title="Không tìm thấy công việc" />;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={event?.name || 'Sự kiện'}
        title={task.title}
        meta={
          <>
            <StatusBadge status={task.status} />
            <PriorityBadge priority={task.priority} />
            {task.deadlineStatus === 'OVERDUE' && <StatusBadge status="OVERDUE" />}
            {task.deadlineStatus === 'DUE_SOON' && <StatusBadge status="DUE_SOON">Gần hạn</StatusBadge>}
            <span className="inline-flex max-w-full items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-700 shadow-sm">
              {isSubtask ? 'Việc con' : 'Việc chính'}
            </span>
          </>
        }
        actions={
          <>
            {isAssignee && !hasSubtasks && (
              <Button as={Link} to={`/events/${eventId}/tasks/${taskId}/update`}>
                <RefreshCw size={16} />
                Cập nhật
              </Button>
            )}

            {isLeader && (
              <Button as={Link} to={`/events/${eventId}/tasks/${taskId}/edit`} variant="secondary">
                <Edit size={16} />
                Chỉnh sửa
              </Button>
            )}
          </>
        }
      />

      <section className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <Panel className="p-5">
          <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-sky-600">Thông tin</p>
              <h3 className="mt-1 text-lg font-black text-slate-950">Chi tiết công việc</h3>
            </div>
            <span className="text-sm font-bold text-slate-500">#{task.id}</span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <InfoRow label="Người phụ trách" value={task.assigneeName || 'Chưa phân công'} helper={taskAssigneeWorkload ? `${taskAssigneeWorkload.assignedTasks} công việc · ${taskAssigneeWorkload.workloadStatus}` : ''} helperClassName={taskAssigneeWorkload ? getWorkloadClassName(taskAssigneeWorkload.workloadStatus) : ''} />
            <InfoRow label="Deadline" value={formatDate(task.deadline)} helper={getDeadlineStatusLabel(task.deadlineStatus)} helperClassName={getDeadlineStatusClassName(task.deadlineStatus)} />
            <InfoRow label="Ban phụ trách" value={task.departmentName || 'Chưa gán ban'} />
            <InfoRow label="Loại công việc" value={isSubtask ? 'Việc con' : 'Việc chính'} />
          </div>

          <div className="mt-5 border-t border-slate-100 pt-4">
            <h4 className="font-black text-slate-950">Mô tả</h4>
            <p className="mt-2 whitespace-pre-line text-sm font-semibold leading-6 text-slate-600">
              {task.description || 'Công việc chưa có mô tả.'}
            </p>
          </div>
        </Panel>

        <Panel className="p-5">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-sky-600">Tiến độ</p>
              <h3 className="mt-1 text-lg font-black text-slate-950">Trạng thái</h3>
            </div>
            <span className="text-2xl font-black text-slate-950">{task.progressPercentage ?? 0}%</span>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <StatusBadge status={task.status} />
            <PriorityBadge priority={task.priority} />
          </div>

          {!isSubtask ? (
            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between text-sm font-black text-slate-700">
                <span className="inline-flex items-center gap-2">
                  <TrendingUp size={16} className="text-sky-500" />
                  Hoàn thành
                </span>
                <span>{task.progressPercentage ?? 0}%</span>
              </div>
              <ProgressBar value={task.progressPercentage ?? 0} />
            </div>
          ) : (
            <p className="mt-5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">
              Việc con cập nhật theo trạng thái hoàn thành.
            </p>
          )}
        </Panel>
      </section>

      <Panel className="overflow-hidden p-0">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-sky-600">Subtask</p>
            <h3 className="mt-1 text-lg font-black text-slate-950">Việc con</h3>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {subtasksQuery.isFetching && <span className="text-xs font-black text-slate-500">Đang cập nhật...</span>}
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-700">{subtaskTotal} việc con</span>
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
            title="Thêm việc con"
            saveLabel="Lưu việc con"
            openLabel="Thêm việc con"
          />
        )}

        {subtasksQuery.error && (
          <div className="p-5">
            <ErrorState error={subtasksQuery.error} title="Không tải được việc con" />
          </div>
        )}

        {subtasks.length > 0 ? (
          <div className="overflow-x-auto">
            <div className="min-w-[900px]">
              <div className="grid grid-cols-[minmax(220px,1.4fr)_170px_210px_140px_160px] items-center gap-3 border-b border-slate-100 bg-slate-50 px-5 py-3 text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">
                <span>Tên việc</span>
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
                    className="grid grid-cols-[minmax(220px,1.4fr)_170px_210px_140px_160px] items-center gap-3 border-b border-slate-100 px-5 py-4 text-sm transition last:border-b-0 hover:bg-slate-50"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-black text-slate-950">{subtask.title}</span>
                    </span>

                    <span className="truncate font-semibold text-slate-600">{subtask.departmentName || 'Chưa gán ban'}</span>

                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-slate-600">{subtask.assigneeName || 'Chưa phân công'}</span>
                      {subtaskAssigneeWorkload && (
                        <span className={`mt-1 block truncate text-[11px] font-black ${getWorkloadClassName(subtaskAssigneeWorkload.workloadStatus)}`}>
                          {subtaskAssigneeWorkload.assignedTasks} công việc · {subtaskAssigneeWorkload.workloadStatus}
                        </span>
                      )}
                    </span>

                    <span><StatusBadge status={subtask.status} /></span>
                    <span className="whitespace-nowrap font-semibold text-slate-600">{formatDate(subtask.deadline)}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="px-5 py-8 text-center text-sm font-bold text-slate-500">
            Chưa có việc con.
          </div>
        )}

        {hasSubtasks && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4 text-sm font-semibold text-slate-600">
            <span>
              Trang <span className="font-black text-slate-950">{subtaskPage + 1}</span>
              {subtasksQuery.data?.totalPages ? ` / ${subtasksQuery.data.totalPages}` : ''} · {subtaskTotal} việc con
            </span>

            <div className="flex gap-2">
              <Button type="button" onClick={() => setSubtaskPage((old) => Math.max(old - 1, 0))} disabled={subtaskPage === 0 || subtasksQuery.isFetching} variant="secondary" className="min-h-9 px-3">
                <ChevronLeft size={16} />
                Trước
              </Button>
              <Button type="button" onClick={() => setSubtaskPage((old) => old + 1)} disabled={subtasksQuery.data?.last !== false || subtasksQuery.isFetching} variant="secondary" className="min-h-9 px-3">
                Sau
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        )}
      </Panel>

      <section className="grid gap-3 md:grid-cols-3">
        {!hasSubtasks && !isSubtask && (
          <TaskActionLink to={`/events/${eventId}/tasks/${taskId}/reports`} icon={<FileText size={18} />} title="Báo cáo" />
        )}
        <TaskActionLink to={`/events/${eventId}/tasks/${taskId}/attachments`} icon={<Paperclip size={18} />} title="Tệp đính kèm" />
        {!hasSubtasks && (
          <TaskActionLink to={`/events/${eventId}/tasks/${taskId}/reviews`} icon={<ClipboardCheck size={18} />} title="Review" />
        )}
      </section>
    </div>
  );
};

const InfoRow = ({ label, value, helper, helperClassName = 'text-slate-400' }) => (
  <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
    <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">{label}</p>
    <p className="mt-1 truncate text-sm font-black text-slate-950">{value || 'Không có dữ liệu'}</p>
    {helper && <p className={`mt-1 truncate text-xs font-black ${helperClassName}`}>{helper}</p>}
  </div>
);

const TaskActionLink = ({ to, icon, title }) => (
  <Link
    to={to}
    className="flex min-h-14 items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-800 shadow-sm transition hover:bg-slate-50"
  >
    <span className="inline-flex items-center gap-2">
      <span className="text-sky-600">{icon}</span>
      {title}
    </span>
    <span className="text-slate-400">Mở</span>
  </Link>
);

export default TaskDetailPage;


