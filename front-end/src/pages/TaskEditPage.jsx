import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import departmentApi from '../api/departmentApi';
import eventApi from '../api/eventApi';
import eventMemberApi from '../api/eventMemberApi';
import taskApi from '../api/taskApi';
import workloadApi from '../api/workloadApi';
import { invalidateDashboardQueries } from '../utils/dashboardQueryUtils';

const toDatetimeLocal = (value) => (value ? value.slice(0, 16) : '');
const progressFromStatus = (status) => (status === 'DONE' ? 100 : 0);

const workloadText = (workload) => {
  if (!workload) return '';
  return ` - ${workload.assignedTasks} task - ${workload.workloadStatus}`;
};

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
      if (taskQuery.data?.parentId) {
        queryClient.invalidateQueries({ queryKey: ['task', String(taskQuery.data.parentId)] });
        queryClient.invalidateQueries({ queryKey: ['subtasks', String(taskQuery.data.parentId)] });
      }
      queryClient.invalidateQueries({ queryKey: ['eventTaskPage', eventId] });
      queryClient.invalidateQueries({ queryKey: ['departmentWorkload', eventId] });
      invalidateDashboardQueries(queryClient, eventId);
      navigate(`/events/${eventId}/tasks/${taskId}`, { replace: true });
    },
  });

  return (
    <AppLayout user={user} events={eventQuery.data ? [eventQuery.data] : []} selectedEvent={eventQuery.data} onEventChange={() => {}} onLogout={onLogout}>
      <div className="mx-auto max-w-2xl space-y-6">
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
            event={eventQuery.data}
            departments={departmentsQuery.data || []}
            members={membersQuery.data || []}
            mutation={mutation}
            taskId={taskId}
            eventId={eventId}
          />
        )}
      </div>
    </AppLayout>
  );
};

const TaskEditForm = ({ task, event, departments, members, mutation, taskId, eventId }) => {
  const maxDeadline = toDatetimeLocal(event?.endTime || event?.startTime || event?.eventDate);
  const isSubtask = Boolean(task.parentId);
  const [form, setForm] = useState({
    title: task.title || '',
    description: task.description || '',
    departmentId: String(task.departmentId || ''),
    assigneeId: task.assigneeId ? String(task.assigneeId) : '',
    deadline: toDatetimeLocal(task.deadline),
    status: task.status || 'TODO',
    priority: task.priority || 'MEDIUM',
    progressPercentage: task.progressPercentage ?? 0,
  });

  const departmentWorkloadQuery = useQuery({
    queryKey: ['departmentWorkload', eventId, form.departmentId],
    queryFn: () => workloadApi.getDepartmentWorkload({ eventId, departmentId: form.departmentId }),
    enabled: Boolean(eventId && form.departmentId),
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

  const assignableMembers = useMemo(() => {
    if (!form.departmentId) {
      return [];
    }

    return members.filter((member) => String(member.departmentId || '') === form.departmentId);
  }, [form.departmentId, members]);

  const workloadByMemberId = useMemo(() => {
    const workloadMembers = departmentWorkloadQuery.data?.members || [];
    return workloadMembers.reduce((map, member) => {
      map[String(member.memberId)] = member;
      return map;
    }, {});
  }, [departmentWorkloadQuery.data]);

  const selectedMemberWorkload = form.assigneeId
    ? workloadByMemberId[String(form.assigneeId)]
    : null;

  const handleSubmit = (event) => {
    event.preventDefault();
    mutation.mutate({
      taskId,
      payload: {
        title: form.title,
        description: form.description,
        departmentId: form.departmentId ? Number(form.departmentId) : null,
        assigneeId: form.assigneeId ? Number(form.assigneeId) : null,
        deadline: form.deadline,
        status: form.status,
        priority: form.priority,
        progressPercentage: isSubtask ? progressFromStatus(form.status) : Number(form.progressPercentage),
      },
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="text-2xl font-bold text-gray-900">Cập nhật task</h2>

      {mutation.error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{mutation.error.userMessage || mutation.error.message}</div>}

      <Field label="Tên task">
        <input name="title" value={form.title} onChange={handleChange} required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
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
        <select name="departmentId" value={form.departmentId} onChange={handleChange} disabled={isSubtask} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:bg-gray-50">
          <option value="">Chưa gán ban</option>
          {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
        </select>
        {isSubtask && <p className="mt-1 text-xs text-gray-500">Subtask luôn dùng ban của task cha.</p>}
      </Field>

      <Field label="Assignee">
        <select name="assigneeId" value={form.assigneeId} onChange={handleChange} disabled={!form.departmentId} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:bg-gray-50">
          <option value="">Chưa phân công</option>
          {assignableMembers.map((member) => {
            const workload = workloadByMemberId[String(member.userId)];
            return (
              <option key={member.userId} value={member.userId}>
                {member.name}{workloadText(workload)}
              </option>
            );
          })}
        </select>

        {departmentWorkloadQuery.isLoading && (
          <p className="mt-1 text-xs text-slate-500">Đang tải workload thành viên...</p>
        )}

        {selectedMemberWorkload && (
          <p className={`mt-1 text-xs font-medium ${
            selectedMemberWorkload.workloadStatus === 'OVERLOADED'
              ? 'text-red-600'
              : selectedMemberWorkload.workloadStatus === 'HIGH'
                ? 'text-amber-600'
                : 'text-slate-500'
          }`}>
            Workload hiện tại: {selectedMemberWorkload.assignedTasks} task chưa hoàn thành · {selectedMemberWorkload.workloadScore}% · {selectedMemberWorkload.workloadStatus}
          </p>
        )}
      </Field>

      <Field label="Deadline">
        <input name="deadline" type="datetime-local" value={form.deadline} onChange={handleChange} max={maxDeadline || undefined} required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
        {maxDeadline && <p className="mt-1 text-xs text-gray-500">Task chỉ được đặt trước hoặc trong thời gian sự kiện.</p>}
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

      {!isSubtask && (
        <Field label="Tiến độ (%)">
          <input name="progressPercentage" type="number" min="0" max="100" value={form.progressPercentage} onChange={handleChange} required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
        </Field>
      )}

      <button type="submit" disabled={mutation.isPending} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
        {mutation.isPending && <Loader2 size={16} className="animate-spin" />}
        Lưu thay đổi
      </button>
    </form>
  );
};

const Field = ({ label, children }) => (
  <label className="block">
    <span className="text-sm font-medium text-gray-700">{label}</span>
    <div className="mt-1">{children}</div>
  </label>
);

export default TaskEditPage;