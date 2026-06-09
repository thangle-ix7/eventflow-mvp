import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Loader2, Sparkles } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import aiSuggestionApi from '../api/aiSuggestionApi';
import departmentApi from '../api/departmentApi';
import eventApi from '../api/eventApi';
import eventMemberApi from '../api/eventMemberApi';
import taskApi from '../api/taskApi';
import { invalidateDashboardQueries } from '../utils/dashboardQueryUtils';

const pad = (value) => String(value).padStart(2, '0');
const toDateTimeLocalValue = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const normalizeSuggestedDeadline = (value) => (value ? toDateTimeLocalValue(value) || String(value).slice(0, 16) : '');

const TaskCreatePage = ({ user, onLogout }) => {
  const { eventId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const initialDepartmentId = searchParams.get('departmentId') || '';
  const isDepartmentLocked = Boolean(initialDepartmentId);
  const [form, setForm] = useState({
    title: '',
    description: '',
    departmentId: initialDepartmentId,
    assigneeId: '',
    deadline: '',
    status: 'TODO',
    priority: 'MEDIUM',
    progressPercentage: 0,
  });
  const [suggestionInstruction, setSuggestionInstruction] = useState('');

  const eventQuery = useQuery({ queryKey: ['event', eventId], queryFn: () => eventApi.getEvent(eventId), enabled: Boolean(eventId) });
  const departmentsQuery = useQuery({ queryKey: ['eventDepartments', eventId], queryFn: () => departmentApi.getEventDepartments(eventId), enabled: Boolean(eventId) });
  const membersQuery = useQuery({ queryKey: ['eventMembers', eventId], queryFn: () => eventMemberApi.getMembers(eventId), enabled: Boolean(eventId) });
  const maxDeadline = toDateTimeLocalValue(eventQuery.data?.endTime || eventQuery.data?.startTime || eventQuery.data?.eventDate);

  const assignableMembers = useMemo(() => {
    if (!form.departmentId) {
      return [];
    }

    return (membersQuery.data || []).filter((member) => String(member.departmentId || '') === form.departmentId);
  }, [form.departmentId, membersQuery.data]);

  const mutation = useMutation({
    mutationFn: taskApi.createTask,
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: ['eventTaskPage', eventId] });
      invalidateDashboardQueries(queryClient, eventId);
      navigate(`/events/${eventId}/tasks/${task.id}`, { replace: true });
    },
  });

  const suggestionMutation = useMutation({
    mutationFn: aiSuggestionApi.suggestTasks,
  });

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((old) => ({
      ...old,
      [name]: value,
      ...(name === 'departmentId' ? { assigneeId: '' } : {}),
      ...(name === 'status' && value === 'DONE' ? { progressPercentage: 100 } : {}),
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    mutation.mutate({
      eventId,
      payload: {
        title: form.title,
        description: form.description,
        departmentId: form.departmentId ? Number(form.departmentId) : null,
        assigneeId: form.assigneeId ? Number(form.assigneeId) : null,
        deadline: form.deadline,
        status: form.status,
        priority: form.priority,
        progressPercentage: Number(form.progressPercentage),
      },
    });
  };

  const applySuggestion = (task) => {
    const departmentId = task.departmentId ? String(task.departmentId) : initialDepartmentId;
    setForm({
      title: task.title || '',
      description: task.description || '',
      departmentId,
      assigneeId: task.assigneeId ? String(task.assigneeId) : '',
      deadline: normalizeSuggestedDeadline(task.deadline),
      status: task.status || 'TODO',
      priority: task.priority || 'MEDIUM',
      progressPercentage: task.progressPercentage ?? 0,
    });
  };

  const handleSuggestTasks = () => {
    suggestionMutation.mutate({
      eventId,
      instruction: suggestionInstruction,
      count: 5,
    });
  };

  return (
    <AppLayout user={user} events={eventQuery.data ? [eventQuery.data] : []} selectedEvent={eventQuery.data} onEventChange={() => {}} onLogout={onLogout}>
      <div className="mx-auto max-w-2xl space-y-6">
        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Tạo task</h2>
          </div>
          <div className="rounded-lg border border-indigo-100 bg-indigo-50/40 p-3">
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                value={suggestionInstruction}
                onChange={(event) => setSuggestionInstruction(event.target.value)}
                className="min-w-0 flex-1 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500"
                placeholder="Context cho AI"
              />
              <button
                type="button"
                onClick={handleSuggestTasks}
                disabled={suggestionMutation.isPending}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {suggestionMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                Gợi ý task
              </button>
            </div>
            {suggestionMutation.error && (
              <div className="mt-2 text-sm text-red-700">{suggestionMutation.error.userMessage || suggestionMutation.error.message}</div>
            )}
            {suggestionMutation.data?.tasks?.length > 0 && (
              <div className="mt-3 space-y-2">
                {suggestionMutation.data.tasks.map((task, index) => (
                  <div key={`${task.title}-${index}`} className="rounded-lg border border-indigo-100 bg-white p-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-bold text-slate-900">{task.title}</p>
                        <p className="mt-1 text-xs text-slate-600">{task.description || 'Không có mô tả'}</p>
                        <p className="mt-1 text-xs text-slate-500">Ưu tiên: {task.priority || 'MEDIUM'} · Deadline: {normalizeSuggestedDeadline(task.deadline) || 'Chưa có'}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => applySuggestion(task)}
                        className="shrink-0 rounded-lg border border-indigo-200 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
                      >
                        Dùng gợi ý này
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {mutation.error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{mutation.error.userMessage || mutation.error.message}</div>}
          <Field label="Tên task">
            <input name="title" value={form.title} onChange={handleChange} required maxLength={255} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
          </Field>
          <Field label="Mô tả task">
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              maxLength={2000}
              rows={4}
              className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              placeholder="Mô tả"
            />
          </Field>
          <Field label="Department">
            <select name="departmentId" value={form.departmentId} onChange={handleChange} disabled={isDepartmentLocked} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:bg-gray-50">
              <option value="">Chưa gán ban</option>
              {departmentsQuery.data?.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
            </select>
          </Field>
          <Field label="Assignee">
            <select name="assigneeId" value={form.assigneeId} onChange={handleChange} disabled={!form.departmentId} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:bg-gray-50">
              <option value="">Chưa phân công</option>
              {assignableMembers.map((member) => <option key={member.userId} value={member.userId}>{member.name} ({member.role})</option>)}
            </select>
          </Field>
          <Field label="Deadline">
            <input name="deadline" type="datetime-local" value={form.deadline} onChange={handleChange} max={maxDeadline || undefined} required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
          </Field>
          <Field label="Status">
            <select name="status" value={form.status} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500">
              <option value="TODO">TODO</option>
              <option value="IN_PROGRESS">IN_PROGRESS</option>
              <option value="IN_REVIEW">IN_REVIEW</option>
              <option value="DONE">DONE</option>
            </select>
          </Field>
          <Field label="Ưu tiên">
            <select name="priority" value={form.priority} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500">
              <option value="LOW">Thấp</option>
              <option value="MEDIUM">Trung bình</option>
              <option value="HIGH">Cao</option>
              <option value="URGENT">Khẩn cấp</option>
            </select>
          </Field>
          <Field label="Tiến độ (%)">
            <input
              name="progressPercentage"
              type="number"
              min="0"
              max="100"
              value={form.progressPercentage}
              onChange={handleChange}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </Field>
          <button type="submit" disabled={mutation.isPending} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
            {mutation.isPending && <Loader2 size={16} className="animate-spin" />}
            Tạo task
          </button>
        </form>
      </div>
    </AppLayout>
  );
};

const Field = ({ label, children }) => (
  <label className="block">
    <span className="text-sm font-medium text-gray-700">{label}</span>
    <div className="mt-1">{children}</div>
  </label>
);

export default TaskCreatePage;
