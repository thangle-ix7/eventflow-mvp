import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import departmentApi from '../api/departmentApi';
import eventApi from '../api/eventApi';
import eventMemberApi from '../api/eventMemberApi';
import taskApi from '../api/taskApi';

const toDatetimeLocal = (value) => (value ? value.slice(0, 16) : '');

const TaskEditPage = ({ user, onLogout }) => {
  const { eventId, taskId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const eventQuery = useQuery({ queryKey: ['event', eventId], queryFn: () => eventApi.getEvent(eventId), enabled: Boolean(eventId) });
  const taskQuery = useQuery({ queryKey: ['task', taskId], queryFn: () => taskApi.getTask(taskId), enabled: Boolean(taskId) });
  const departmentsQuery = useQuery({ queryKey: ['eventDepartments', eventId], queryFn: () => departmentApi.getEventDepartments(eventId), enabled: Boolean(eventId) });
  const membersQuery = useQuery({ queryKey: ['eventMembers', eventId], queryFn: () => eventMemberApi.getMembers(eventId), enabled: Boolean(eventId) });

  const mutation = useMutation({
    mutationFn: taskApi.updateTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
      queryClient.invalidateQueries({ queryKey: ['eventTaskPage', eventId] });
      navigate(`/events/${eventId}/tasks/${taskId}`, { replace: true });
    },
  });

  return (
    <AppLayout user={user} events={eventQuery.data ? [eventQuery.data] : []} selectedEvent={eventQuery.data} onEventChange={() => {}} onLogout={onLogout}>
      <div className="mx-auto max-w-2xl space-y-6">
        <Link to={`/events/${eventId}/tasks/${taskId}`} className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600">
          <ArrowLeft size={16} />
          Quay lại chi tiết task
        </Link>
        {taskQuery.isLoading && (
          <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-4 text-gray-500">
            <Loader2 size={18} className="animate-spin" />
            Đang tải...
          </div>
        )}
        {taskQuery.data && (
          <TaskEditForm
            key={taskQuery.data.id}
            task={taskQuery.data}
            departments={departmentsQuery.data || []}
            members={membersQuery.data || []}
            mutation={mutation}
            taskId={taskId}
          />
        )}
      </div>
    </AppLayout>
  );
};

const TaskEditForm = ({ task, departments, members, mutation, taskId }) => {
  const [form, setForm] = useState({
    title: task.title || '',
    departmentId: String(task.departmentId || ''),
    assigneeId: task.assigneeId ? String(task.assigneeId) : '',
    deadline: toDatetimeLocal(task.deadline),
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
      payload: {
        title: form.title,
        departmentId: form.departmentId ? Number(form.departmentId) : null,
        assigneeId: form.assigneeId ? Number(form.assigneeId) : null,
        deadline: form.deadline,
        status: form.status,
        progressPercentage: Number(form.progressPercentage),
      },
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="text-2xl font-bold text-gray-900">Cập nhật task</h2>
      {mutation.error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{mutation.error.userMessage || mutation.error.message}</div>}
      <Field label="Tên task"><input name="title" value={form.title} onChange={handleChange} required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" /></Field>
      <Field label="Department"><select name="departmentId" value={form.departmentId} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"><option value="">Chưa gán ban</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select></Field>
      <Field label="Assignee"><select name="assigneeId" value={form.assigneeId} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"><option value="">Chưa phân công</option>{members.map((member) => <option key={member.userId} value={member.userId}>{member.name}</option>)}</select></Field>
      <Field label="Deadline"><input name="deadline" type="datetime-local" value={form.deadline} onChange={handleChange} required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" /></Field>
      <Field label="Status"><select name="status" value={form.status} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"><option value="TODO">TODO</option><option value="IN_PROGRESS">IN_PROGRESS</option><option value="DONE">DONE</option></select></Field>
      <Field label="Tiến độ (%)"><input name="progressPercentage" type="number" min="0" max="100" value={form.progressPercentage} onChange={handleChange} required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" /></Field>
      <button type="submit" disabled={mutation.isPending} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
        {mutation.isPending && <Loader2 size={16} className="animate-spin" />}
        Lưu thay đổi
      </button>
    </form>
  );
};

const Field = ({ label, children }) => <label className="block"><span className="text-sm font-medium text-gray-700">{label}</span><div className="mt-1">{children}</div></label>;

export default TaskEditPage;
