import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  CheckCircle2,
  ClipboardList,
  FileText,
  Loader2,
  Paperclip,
  RefreshCw,
  Save,
  Sparkles,
  TrendingUp,
  XCircle,
} from 'lucide-react';
import AppLayout from '../components/AppLayout';
import eventApi from '../api/eventApi';
import taskApi from '../api/taskApi';
import { invalidateDashboardQueries } from '../utils/dashboardQueryUtils';

const progressFromStatus = (status) => (status === 'DONE' ? 100 : 0);

const TaskUpdatePage = ({ user, onLogout }) => {
  const { eventId, taskId } = useParams();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

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
    <AppLayout
      user={user}
      events={eventQuery.data ? [eventQuery.data] : []}
      selectedEvent={eventQuery.data}
      onEventChange={() => {}}
      onLogout={onLogout}
    >
      <div className="mx-auto max-w-5xl space-y-6">
        <header>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-sky-600">
                  <RefreshCw size={15} strokeWidth={1.8} />
                  Task update
                </p>

                <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                  Update task
                </h2>

                <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-600">
                  {task?.title
                    ? `Cập nhật trạng thái và tiến độ cho task: ${task.title}.`
                    : 'Cập nhật trạng thái và tiến độ công việc được giao.'}
                </p>
              </div>

            <div className="rounded-2xl border border-sky-100 bg-sky-50/70 px-4 py-3">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                Quyền cập nhật
              </p>
              <p className={`mt-1 text-sm font-black ${canUpdate ? 'text-emerald-600' : 'text-slate-600'}`}>
                {canUpdate ? 'Assignee' : 'Không phải assignee'}
              </p>
            </div>
          </div>

          {(eventQuery.isLoading || taskQuery.isLoading) && (
            <div className="mt-4 flex items-center gap-2 rounded-2xl border border-sky-100 bg-sky-50 p-4 text-sm font-black text-slate-500">
              <Loader2 className="animate-spin text-sky-600" size={18} />
              Đang tải task...
            </div>
          )}

          {taskQuery.error && (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
              {taskQuery.error.userMessage || taskQuery.error.message}
            </div>
          )}
        </header>

        {task && (
          <>
            <TaskWorkUpdateForm
              task={task}
              taskId={taskId}
              canUpdate={canUpdate}
              mutation={mutation}
            />

            <section className="grid gap-4 md:grid-cols-2">
              {!isSubtask && (
                <TaskUpdateLink
                  to={`/events/${eventId}/tasks/${taskId}/reports`}
                  icon={<FileText size={22} />}
                  title="Report tiến độ"
                  description="Nộp báo cáo tiến độ chi tiết kèm mô tả và ảnh minh chứng."
                />
              )}

              <TaskUpdateLink
                to={`/events/${eventId}/tasks/${taskId}/attachments`}
                icon={<Paperclip size={22} />}
                title="Attachment"
                description="Upload file, ảnh, ZIP hoặc link tài liệu liên quan đến task."
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
    <form
      onSubmit={handleSubmit}
      className="overflow-hidden rounded-[2rem] border border-sky-100 bg-white shadow-xl shadow-sky-100/70"
    >
      <div className="flex flex-col gap-3 border-b border-sky-100 bg-gradient-to-r from-sky-50 via-white to-emerald-50 px-5 py-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-emerald-400 text-white shadow-lg shadow-cyan-100">
            <ClipboardList size={20} strokeWidth={1.8} />
          </div>

          <div>
            <h3 className="text-lg font-black text-slate-950">
              Cập nhật tiến độ
            </h3>
            <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
              {isSubtask
                ? 'Subtask tự tính tiến độ theo trạng thái: DONE = 100%, trạng thái khác = 0%.'
                : 'Task chính có thể cập nhật trạng thái và phần trăm tiến độ.'}
            </p>
          </div>
        </div>

        <PermissionBadge canUpdate={canUpdate} />
      </div>

      <div className="grid gap-5 p-5">
        {!canUpdate && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold leading-6 text-slate-600">
            Bạn không có quyền cập nhật task này. Chỉ người được phân công mới có thể update trạng thái và tiến độ.
          </div>
        )}

        {mutation.error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {mutation.error.userMessage || mutation.error.message}
          </div>
        )}

        <div className={`grid gap-4 ${isSubtask ? '' : 'md:grid-cols-2'}`}>
          <Field
            label="Status"
            icon={<ClipboardList className="h-4 w-4" strokeWidth={1.8} />}
          >
            <select
              name="status"
              value={form.status}
              onChange={handleChange}
              disabled={!canUpdate}
              className={inputClassName}
            >
              <option value="TODO">TODO</option>
              <option value="IN_PROGRESS">IN_PROGRESS</option>
              <option value="IN_REVIEW">IN_REVIEW</option>
              <option value="DONE">DONE</option>
            </select>

            <StatusHint status={form.status} isSubtask={isSubtask} />
          </Field>

          {!isSubtask && (
            <Field
              label="Tiến độ (%)"
              icon={<TrendingUp className="h-4 w-4" strokeWidth={1.8} />}
            >
              <input
                name="progressPercentage"
                type="number"
                min="0"
                max="100"
                value={form.progressPercentage}
                onChange={handleChange}
                disabled={!canUpdate}
                required
                className={inputClassName}
              />

              <div className="mt-3 rounded-2xl border border-sky-100 bg-sky-50/70 p-3">
                <div className="mb-2 flex items-center justify-between text-xs font-black text-slate-500">
                  <span>Preview progress</span>
                  <span>{form.progressPercentage || 0}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400 transition-all"
                    style={{ width: `${Math.min(Math.max(Number(form.progressPercentage || 0), 0), 100)}%` }}
                  />
                </div>
              </div>
            </Field>
          )}
        </div>

        <button
          type="submit"
          disabled={!canUpdate || mutation.isPending}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400 px-4 py-2 text-sm font-black text-white shadow-xl shadow-cyan-100 transition hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-cyan-200 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
        >
          {mutation.isPending ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Save size={16} />
          )}
          Lưu update
        </button>
      </div>
    </form>
  );
};

const TaskUpdateLink = ({ to, icon, title, description }) => (
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

const Field = ({ label, icon, children }) => (
  <label className="block">
    <span className="flex items-center gap-2 text-sm font-black text-slate-700">
      <span className="text-sky-500">{icon}</span>
      {label}
    </span>

    <div className="mt-2">{children}</div>
  </label>
);

const PermissionBadge = ({ canUpdate }) => (
  <span
    className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-black shadow-sm ${
      canUpdate
        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
        : 'border-slate-200 bg-white text-slate-600'
    }`}
  >
    {canUpdate ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
    {canUpdate ? 'Có thể cập nhật' : 'Không có quyền cập nhật'}
  </span>
);

const StatusHint = ({ status, isSubtask }) => {
  const meta = {
    TODO: {
      label: 'Task đang ở trạng thái cần làm.',
      className: 'border-slate-200 bg-slate-50 text-slate-700',
    },
    IN_PROGRESS: {
      label: 'Task đang được thực hiện.',
      className: 'border-amber-200 bg-amber-50 text-amber-700',
    },
    IN_REVIEW: {
      label: 'Task đã gửi chờ leader review.',
      className: 'border-sky-200 bg-sky-50 text-sky-700',
    },
    DONE: {
      label: 'Task hoàn thành. Progress sẽ là 100%.',
      className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    },
  }[status] || {
    label: status,
    className: 'border-slate-200 bg-slate-50 text-slate-700',
  };

  return (
    <div className={`mt-3 rounded-2xl border px-3 py-2 text-xs font-black ${meta.className}`}>
      {meta.label}
      {isSubtask && (
        <span className="mt-1 block font-semibold opacity-80">
          Subtask tự quy đổi progress theo status.
        </span>
      )}
    </div>
  );
};

const inputClassName = 'min-h-11 w-full min-w-0 rounded-2xl border border-sky-100 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-cyan-300 focus:bg-white focus:ring-4 focus:ring-cyan-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500';

export default TaskUpdatePage;
