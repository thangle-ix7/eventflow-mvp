import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { CalendarDays, ClipboardCheck, Edit, FileText, Paperclip, RefreshCw, UserRound } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import InlineTaskCreator from '../components/InlineTaskCreator';
import { Button, ErrorState, LoadingState, PageHeader, Panel, PriorityBadge, ProgressBar, StatusBadge } from '../components/ui';
import departmentApi from '../api/departmentApi';
import eventApi from '../api/eventApi';
import taskApi from '../api/taskApi';
import { formatDate } from '../utils/dateUtils';

const SUBTASK_PAGE_SIZE = 8;

const TaskDetailPage = ({ user, onLogout }) => {
  const { eventId, taskId } = useParams();
  const [subtaskPage, setSubtaskPage] = useState(0);

  const eventQuery = useQuery({ queryKey: ['event', eventId], queryFn: () => eventApi.getEvent(eventId), enabled: Boolean(eventId) });
  const taskQuery = useQuery({ queryKey: ['task', taskId], queryFn: () => taskApi.getTask(taskId), enabled: Boolean(taskId) });
  const departmentsQuery = useQuery({ queryKey: ['eventDepartments', eventId], queryFn: () => departmentApi.getEventDepartments(eventId), enabled: Boolean(eventId) });
  const subtasksQuery = useQuery({
    queryKey: ['subtasks', String(taskId), subtaskPage, SUBTASK_PAGE_SIZE],
    queryFn: () => taskApi.getSubtasks({ taskId, page: subtaskPage, size: SUBTASK_PAGE_SIZE }),
    enabled: Boolean(taskId),
  });

  const event = eventQuery.data;
  const task = taskQuery.data;
  const subtasks = subtasksQuery.data?.content || [];
  const isLeader = event?.role === 'LEADER';
  const isAssignee = task?.assigneeId === user?.userId;
  const isSubtask = Boolean(task?.parentId);
  const hasSubtasks = (subtasksQuery.data?.totalElements || 0) > 0;
  const canCreateSubtasks = isLeader && task && !task.parentId;

  return (
    <AppLayout user={user} events={event ? [event] : []} selectedEvent={event} onEventChange={() => {}} onLogout={onLogout}>
      <div className="space-y-6">
        {taskQuery.isLoading && <LoadingState message="Đang tải công việc..." />}
        {taskQuery.error && <ErrorState error={taskQuery.error} title="Không tải được công việc" />}

        {task && (
          <>
            <Panel className="p-5">
              <div className="mb-4 flex flex-wrap gap-2">
                <StatusBadge status={task.status} />
                <PriorityBadge priority={task.priority} />
                {task.departmentName && <StatusBadge>{task.departmentName}</StatusBadge>}
              </div>
              <PageHeader
                title={task.title}
                description={task.description || 'Chưa có mô tả công việc.'}
                meta={
                  <>
                    <span className="inline-flex items-center gap-2"><UserRound size={16} />{task.assigneeName || 'Chưa phân công'}</span>
                    <span className="inline-flex items-center gap-2"><CalendarDays size={16} />Deadline {formatDate(task.deadline)}</span>
                  </>
                }
                actions={
                <div className="flex flex-wrap gap-2">
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
                </div>
                }
              />
              {!isSubtask && (
                <div className="mt-5 max-w-md">
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700">Tiến độ</span>
                    <span className="font-bold text-indigo-600">{task.progressPercentage ?? 0}%</span>
                  </div>
                  <ProgressBar value={task.progressPercentage ?? 0} />
                  {hasSubtasks && (
                    <p className="mt-2 text-xs font-medium text-slate-500">
                      Tiến độ task lớn được tính theo tỷ lệ subtask DONE.
                    </p>
                  )}
                </div>
              )}
            </Panel>

            <Panel className="overflow-hidden p-0">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
                <div>
                  <h2 className="text-base font-bold text-slate-950">Subtasks</h2>
                  <p className="text-sm text-slate-500">Các task nhỏ được tách ra từ task này.</p>
                </div>
                {subtasksQuery.isFetching && <span className="text-xs font-semibold text-slate-400">Đang cập nhật...</span>}
              </div>

              {subtasksQuery.error && (
                <div className="p-4">
                  <ErrorState error={subtasksQuery.error} title="Không tải được subtask" />
                </div>
              )}

              {subtasks.length > 0 ? (
                <div className="overflow-x-auto">
                  <div className="min-w-[780px]">
                    <div className="grid grid-cols-[minmax(180px,1.4fr)_120px_120px_120px_150px] gap-2 border-b border-slate-100 px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                      <span>Tên subtask</span>
                      <span>Ban</span>
                      <span>Phụ trách</span>
                      <span>Trạng thái</span>
                      <span>Deadline</span>
                    </div>
                    {subtasks.map((subtask) => (
                      <Link
                        key={subtask.id}
                        to={`/events/${eventId}/tasks/${subtask.id}`}
                        className="grid grid-cols-[minmax(180px,1.4fr)_120px_120px_120px_150px] gap-2 border-b border-slate-100 px-4 py-3 text-sm transition last:border-b-0 hover:bg-indigo-50/50"
                      >
                        <span className="min-w-0 font-semibold text-slate-900">{subtask.title}</span>
                        <span className="min-w-0 truncate text-slate-600">{subtask.departmentName || 'Chưa gán ban'}</span>
                        <span className="min-w-0 truncate text-slate-600">{subtask.assigneeName || 'Chưa phân công'}</span>
                        <span><StatusBadge status={subtask.status} /></span>
                        <span className="text-slate-600">{formatDate(subtask.deadline)}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="px-4 py-5 text-sm text-slate-500">Chưa có subtask.</div>
              )}

              {hasSubtasks && (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-600">
                  <span>
                    Trang <span className="font-semibold text-slate-950">{subtaskPage + 1}</span>
                    {subtasksQuery.data?.totalPages ? ` / ${subtasksQuery.data.totalPages}` : ''} · {subtasksQuery.data?.totalElements || 0} subtask
                  </span>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      onClick={() => setSubtaskPage((old) => Math.max(old - 1, 0))}
                      disabled={subtaskPage === 0 || subtasksQuery.isFetching}
                      variant="secondary"
                    >
                      Trước
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setSubtaskPage((old) => old + 1)}
                      disabled={subtasksQuery.data?.last !== false || subtasksQuery.isFetching}
                      variant="secondary"
                    >
                      Sau
                    </Button>
                  </div>
                </div>
              )}

              {canCreateSubtasks && (
                <InlineTaskCreator
                  eventId={eventId}
                  parentTaskId={taskId}
                  event={event}
                  departments={departmentsQuery.data || []}
                  departmentId={task.departmentId || ''}
                  lockedDepartment
                  invalidateKeys={[['task', taskId], ['subtasks', String(taskId)]]}
                  title="Thêm subtask theo danh sách"
                  saveLabel="Lưu subtask"
                />
              )}
            </Panel>

            <section className="grid gap-4 md:grid-cols-3">
              {!hasSubtasks && !isSubtask && (
                <TaskActionLink
                  to={`/events/${eventId}/tasks/${taskId}/reports`}
                  icon={<FileText size={22} />}
                  title="Report tiến độ"
                  description="Nộp report, xem lịch sử report và cập nhật tiến độ task."
                />
              )}
              <TaskActionLink
                to={`/events/${eventId}/tasks/${taskId}/attachments`}
                icon={<Paperclip size={22} />}
                title="Attachment"
                description="Upload và tải xuống file liên quan đến task."
              />
              {!hasSubtasks && (
                <TaskActionLink
                  to={`/events/${eventId}/tasks/${taskId}/reviews`}
                  icon={<ClipboardCheck size={22} />}
                  title="Review"
                  description="Leader feedback task IN_REVIEW và đổi trạng thái."
                />
              )}
            </section>
          </>
        )}
      </div>
    </AppLayout>
  );
};

const TaskActionLink = ({ to, icon, title, description }) => (
  <Link to={to} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50/60">
    <div className="text-indigo-600">{icon}</div>
    <h3 className="mt-3 font-semibold text-slate-950">{title}</h3>
    <p className="mt-1 text-sm text-slate-500">{description}</p>
  </Link>
);

export default TaskDetailPage;
