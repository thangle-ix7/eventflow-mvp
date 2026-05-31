import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import departmentApi from '../api/departmentApi';
import eventApi from '../api/eventApi';
import eventMemberApi from '../api/eventMemberApi';
import taskApi from '../api/taskApi';

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
    progressPercentage: 0,
  });

  const eventQuery = useQuery({ queryKey: ['event', eventId], queryFn: () => eventApi.getEvent(eventId), enabled: Boolean(eventId) });
  const departmentsQuery = useQuery({ queryKey: ['eventDepartments', eventId], queryFn: () => departmentApi.getEventDepartments(eventId), enabled: Boolean(eventId) });
  const membersQuery = useQuery({ queryKey: ['eventMembers', eventId], queryFn: () => eventMemberApi.getMembers(eventId), enabled: Boolean(eventId) });

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
      navigate(`/events/${eventId}/tasks/${task.id}`, { replace: true });
    },
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
        progressPercentage: Number(form.progressPercentage),
      },
    });
  };

  return (
    <AppLayout user={user} events={eventQuery.data ? [eventQuery.data] : []} selectedEvent={eventQuery.data} onEventChange={() => {}} onLogout={onLogout}>
      <div className="mx-auto max-w-2xl space-y-6">
        <Link to={`/events/${eventId}/tasks`} className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600">
          <ArrowLeft size={16} />
          Quay lại danh sách task
        </Link>
        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Tạo task</h2>
            <p className="mt-1 text-sm text-gray-500">Chỉ cần tên task và deadline. Department hoặc assignee có thể gán sau.</p>
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
              placeholder="Mục tiêu, phạm vi, yêu cầu đầu ra của task..."
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
            <input name="deadline" type="datetime-local" value={form.deadline} onChange={handleChange} required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
          </Field>
          <Field label="Status">
            <select name="status" value={form.status} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500">
              <option value="TODO">TODO</option>
              <option value="IN_PROGRESS">IN_PROGRESS</option>
              <option value="IN_REVIEW">IN_REVIEW</option>
              <option value="DONE">DONE</option>
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
