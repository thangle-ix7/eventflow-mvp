import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, ClipboardCheck, Edit, FileText, Paperclip, RefreshCw, UserRound } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import { Button, ErrorState, LoadingState, PageHeader, Panel, ProgressBar, StatusBadge } from '../components/ui';
import eventApi from '../api/eventApi';
import taskApi from '../api/taskApi';
import { formatDate } from '../utils/dateUtils';

const TaskDetailPage = ({ user, onLogout }) => {
  const { eventId, taskId } = useParams();

  const eventQuery = useQuery({ queryKey: ['event', eventId], queryFn: () => eventApi.getEvent(eventId), enabled: Boolean(eventId) });
  const taskQuery = useQuery({ queryKey: ['task', taskId], queryFn: () => taskApi.getTask(taskId), enabled: Boolean(taskId) });

  const event = eventQuery.data;
  const task = taskQuery.data;
  const isLeader = event?.role === 'LEADER';
  const isAssignee = task?.assigneeId === user?.userId;

  return (
    <AppLayout user={user} events={event ? [event] : []} selectedEvent={event} onEventChange={() => {}} onLogout={onLogout}>
      <div className="space-y-6">
        <Link to={`/events/${eventId}/tasks`} className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600">
          <ArrowLeft size={16} />
          Quay lại task
        </Link>

        {taskQuery.isLoading && <LoadingState message="Đang tải công việc..." />}
        {taskQuery.error && <ErrorState error={taskQuery.error} title="Không tải được công việc" />}

        {task && (
          <>
            <Panel className="p-5">
              <div className="mb-4 flex flex-wrap gap-2">
                <StatusBadge status={task.status} />
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
                  {isAssignee && (
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
              <div className="mt-5 max-w-md">
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700">Tiến độ</span>
                  <span className="font-bold text-indigo-600">{task.progressPercentage ?? 0}%</span>
                </div>
                <ProgressBar value={task.progressPercentage ?? 0} />
              </div>
            </Panel>

            <section className="grid gap-4 md:grid-cols-3">
              <TaskActionLink
                to={`/events/${eventId}/tasks/${taskId}/reports`}
                icon={<FileText size={22} />}
                title="Report tiến độ"
                description="Nộp report, xem lịch sử report và cập nhật tiến độ task."
              />
              <TaskActionLink
                to={`/events/${eventId}/tasks/${taskId}/attachments`}
                icon={<Paperclip size={22} />}
                title="Attachment"
                description="Upload và tải xuống file liên quan đến task."
              />
              <TaskActionLink
                to={`/events/${eventId}/tasks/${taskId}/reviews`}
                icon={<ClipboardCheck size={22} />}
                title="Review"
                description="Leader feedback task IN_REVIEW và đổi trạng thái."
              />
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
