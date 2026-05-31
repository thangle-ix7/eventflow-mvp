import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ClipboardCheck, Edit, FileText, Loader2, Paperclip, RefreshCw } from 'lucide-react';
import AppLayout from '../components/AppLayout';
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

        {taskQuery.isLoading && <div className="flex items-center gap-2 rounded-xl bg-white p-8 text-gray-500"><Loader2 className="animate-spin" size={20} />Đang tải task...</div>}
        {taskQuery.error && <div className="rounded-xl bg-red-50 p-4 text-red-700">{taskQuery.error.userMessage || taskQuery.error.message}</div>}

        {task && (
          <>
            <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{task.title}</h2>
                  <p className="mt-2 text-sm text-gray-500">Department: {task.departmentName || 'Chưa gán ban'}</p>
                  <p className="mt-1 text-sm text-gray-500">Assignee: {task.assigneeName || 'Chưa phân công'}</p>
                  <p className="mt-1 text-sm text-gray-500">Deadline: {formatDate(task.deadline)}</p>
                  <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-gray-700">
                    {task.description || 'Chưa có mô tả task.'}
                  </p>
                  <div className="mt-4 max-w-sm">
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-700">Tiến độ</span>
                      <span className="font-bold text-blue-600">{task.progressPercentage ?? 0}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100">
                      <div className="h-2 rounded-full bg-blue-600" style={{ width: `${task.progressPercentage ?? 0}%` }} />
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="h-fit rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">{task.status}</span>
                  {isAssignee && (
                    <Link to={`/events/${eventId}/tasks/${taskId}/update`} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                      <RefreshCw size={16} />
                      Update
                    </Link>
                  )}
                  {isLeader && (
                    <Link to={`/events/${eventId}/tasks/${taskId}/edit`} className="inline-flex items-center gap-2 rounded-lg border border-blue-600 px-3 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50">
                      <Edit size={16} />
                      Edit
                    </Link>
                  )}
                </div>
              </div>
            </section>

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
  <Link to={to} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-blue-200 hover:bg-blue-50">
    <div className="text-blue-600">{icon}</div>
    <h3 className="mt-3 font-semibold text-gray-900">{title}</h3>
    <p className="mt-1 text-sm text-gray-500">{description}</p>
  </Link>
);

export default TaskDetailPage;
