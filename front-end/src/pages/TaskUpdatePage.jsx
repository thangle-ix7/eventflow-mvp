import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, FileText, Loader2, Paperclip, Save } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import eventApi from '../api/eventApi';
import taskApi from '../api/taskApi';
import { invalidateDashboardQueries } from '../utils/dashboardQueryUtils';

const progressFromStatus = (status) => (status === 'DONE' ? 100 : 0);

const TaskUpdatePage = ({ user, onLogout }) => {
  const { eventId, taskId } = useParams();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const eventQuery = useQuery({ queryKey: ['event', eventId], queryFn: () => eventApi.getEvent(eventId), enabled: Boolean(eventId) });
  const taskQuery = useQuery({ queryKey: ['task', taskId], queryFn: () => taskApi.getTask(taskId), enabled: Boolean(taskId) });
  const task = taskQuery.data;
  const canUpdate = task?.assigneeId === user?.userId;
  const isSubtask = Boolean(task?.parentId);

  const mutation = useMutation({
    mutationFn: taskApi.updateTaskWork,
    onSuccess: (updatedTask) => {
      queryClient.setQueryData(['task', taskId], updatedTask);
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
      if (updatedTask?.parentId) {
        queryClient.invalidateQueries({ queryKey: ['task', String(updatedTask.parentId)] });
        queryClient.invalidateQueries({ queryKey: ['subtasks', String(updatedTask.parentId)] });
      }
      queryClient.invalidateQueries({ queryKey: ['eventTaskPage', eventId] });
      invalidateDashboardQueries(queryClient, eventId);
      navigate(`/events/${eventId}/tasks/${taskId}`, { replace: true });
    },
  });

  return (
    <AppLayout user={user} events={eventQuery.data ? [eventQuery.data] : []} selectedEvent={eventQuery.data} onEventChange={() => {}} onLogout={onLogout}>
      <div className="mx-auto max-w-3xl space-y-6">
        <Link to={`/events/${eventId}/tasks/${taskId}`} className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600">
          <ArrowLeft size={16} />
          Quay lại chi tiết task
        </Link>

        {taskQuery.isLoading && <div className="flex items-center gap-2 rounded-xl bg-white p-6 text-gray-500"><Loader2 className="animate-spin" size={18} />Đang tải task...</div>}
        {taskQuery.error && <div className="rounded-xl bg-red-50 p-4 text-red-700">{taskQuery.error.userMessage || taskQuery.error.message}</div>}
        {task && (
          <>
            <TaskWorkUpdateForm task={task} taskId={taskId} canUpdate={canUpdate} mutation={mutation} />

            <section className="grid gap-4 md:grid-cols-2">
              {!isSubtask && (
                <TaskUpdateLink
                  to={`/events/${eventId}/tasks/${taskId}/reports`}
                  icon={<FileText size={22} />}
                  title="Report tiến độ"
                  description="Nộp report kèm mô tả và ảnh minh chứng."
                />
              )}
              <TaskUpdateLink
                to={`/events/${eventId}/tasks/${taskId}/attachments`}
                icon={<Paperclip size={22} />}
                title="Attachment"
                description="Upload file liên quan đến task."
              />
            </section>
          </>
        )}
      </div>
    </AppLayout>
  );
};

const TaskWorkUpdateForm = ({ task, taskId, canUpdate, mutation }) => {
  const isSubtask = Boolean(task.parentId);
  const [form, setForm] = useState({
    status: task.status || 'TODO',
    progressPercentage: task.progressPercentage ?? 0,
  });

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((old) => ({
      ...old,
      [name]: value,
      ...(name === 'status' && value === 'DONE' ? { progressPercentage: 100 } : {}),
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    mutation.mutate({
      taskId,
      status: form.status,
      progressPercentage: isSubtask ? progressFromStatus(form.status) : Number(form.progressPercentage),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Update task</h2>
        <p className="mt-1 text-sm text-gray-500">
          {isSubtask ? 'Subtask chỉ cần cập nhật trạng thái.' : 'Dành cho người được assign cập nhật trạng thái và tiến độ công việc.'}
        </p>
      </div>
      {!canUpdate && <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600">Chỉ người được assign task mới update phần này.</div>}
      {mutation.error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{mutation.error.userMessage || mutation.error.message}</div>}
      <div className={`grid gap-3 ${isSubtask ? '' : 'md:grid-cols-2'}`}>
        <Field label="Status">
          <select name="status" value={form.status} onChange={handleChange} disabled={!canUpdate} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:bg-gray-50">
            <option value="TODO">TODO</option>
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="IN_REVIEW">IN_REVIEW</option>
            <option value="DONE">DONE</option>
          </select>
        </Field>
        {!isSubtask && (
          <Field label="Tiến độ (%)">
            <input
              name="progressPercentage"
              type="number"
              min="0"
              max="100"
              value={form.progressPercentage}
              onChange={handleChange}
              disabled={!canUpdate}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:bg-gray-50"
            />
          </Field>
        )}
      </div>
      <button type="submit" disabled={!canUpdate || mutation.isPending} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300">
        {mutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
        Lưu update
      </button>
    </form>
  );
};

const TaskUpdateLink = ({ to, icon, title, description }) => (
  <Link to={to} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-blue-200 hover:bg-blue-50">
    <div className="text-blue-600">{icon}</div>
    <h3 className="mt-3 font-semibold text-gray-900">{title}</h3>
    <p className="mt-1 text-sm text-gray-500">{description}</p>
  </Link>
);

const Field = ({ label, children }) => (
  <label className="block">
    <span className="text-sm font-medium text-gray-700">{label}</span>
    <div className="mt-1">{children}</div>
  </label>
);

export default TaskUpdatePage;
