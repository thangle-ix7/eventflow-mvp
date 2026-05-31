import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Edit, Loader2 } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import departmentApi from '../api/departmentApi';
import eventApi from '../api/eventApi';
import eventMemberApi from '../api/eventMemberApi';
import taskApi from '../api/taskApi';
import { formatDate } from '../utils/dateUtils';

const TaskDetailPage = ({ user, onLogout }) => {
  const { eventId, taskId } = useParams();
  const queryClient = useQueryClient();

  const eventQuery = useQuery({ queryKey: ['event', eventId], queryFn: () => eventApi.getEvent(eventId), enabled: Boolean(eventId) });
  const taskQuery = useQuery({ queryKey: ['task', taskId], queryFn: () => taskApi.getTask(taskId), enabled: Boolean(taskId) });
  const departmentsQuery = useQuery({ queryKey: ['eventDepartments', eventId], queryFn: () => departmentApi.getEventDepartments(eventId), enabled: Boolean(eventId) });
  const membersQuery = useQuery({ queryKey: ['eventMembers', eventId], queryFn: () => eventMemberApi.getMembers(eventId), enabled: Boolean(eventId) });

  const assignmentMutation = useMutation({
    mutationFn: taskApi.updateTaskAssignment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
      queryClient.invalidateQueries({ queryKey: ['eventTaskPage', eventId] });
    },
  });

  const statusMutation = useMutation({
    mutationFn: taskApi.updateTaskStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
      queryClient.invalidateQueries({ queryKey: ['eventTaskPage', eventId] });
    },
  });

  const event = eventQuery.data;
  const task = taskQuery.data;
  const isLeader = event?.role === 'LEADER';
  const assignableMembers = task?.departmentId
    ? (membersQuery.data || []).filter((member) => member.departmentId === task.departmentId)
    : [];

  const resolveAssigneeForDepartment = (departmentId) => {
    if (!departmentId || !task?.assigneeId) {
      return null;
    }

    const currentAssignee = membersQuery.data?.find((member) => member.userId === task.assigneeId);
    return currentAssignee?.departmentId === departmentId ? task.assigneeId : null;
  };

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
          <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{task.title}</h2>
                <p className="mt-2 text-sm text-gray-500">Department: {task.departmentName || 'Chưa gán ban'}</p>
                <p className="mt-1 text-sm text-gray-500">Assignee: {task.assigneeName || 'Chưa phân công'}</p>
                <p className="mt-1 text-sm text-gray-500">Deadline: {formatDate(task.deadline)}</p>
                <div className="mt-4 max-w-sm">
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-700">Tiến độ</span>
                    <span className="font-bold text-blue-600">{task.progressPercentage ?? 0}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100">
                    <div
                      className="h-2 rounded-full bg-blue-600"
                      style={{ width: `${task.progressPercentage ?? 0}%` }}
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <span className="h-fit rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">{task.status}</span>
                {isLeader && (
                  <Link to={`/events/${eventId}/tasks/${taskId}/edit`} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                    <Edit size={16} />
                    Sửa
                  </Link>
                )}
              </div>
            </div>
          </section>
        )}

        {task && (
          <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900">Cập nhật nhanh</h3>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <select
                defaultValue={task.status}
                onChange={(event) => statusMutation.mutate({ taskId, status: event.target.value })}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              >
                <option value="TODO">TODO</option>
                <option value="IN_PROGRESS">IN_PROGRESS</option>
                <option value="DONE">DONE</option>
              </select>
              {isLeader && (
                <>
                  <select
                    defaultValue={task.departmentId || ''}
                    onChange={(event) => {
                      const nextDepartmentId = event.target.value ? Number(event.target.value) : null;
                      assignmentMutation.mutate({
                        taskId,
                        departmentId: nextDepartmentId,
                        assigneeId: resolveAssigneeForDepartment(nextDepartmentId),
                      });
                    }}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  >
                    <option value="">Chưa gán ban</option>
                    {departmentsQuery.data?.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
                  </select>
                  <select
                    defaultValue={task.assigneeId || ''}
                    disabled={!task.departmentId}
                    onChange={(event) => assignmentMutation.mutate({ taskId, departmentId: task.departmentId, assigneeId: event.target.value ? Number(event.target.value) : null })}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:bg-gray-50"
                  >
                    <option value="">Chưa phân công</option>
                    {assignableMembers.map((member) => <option key={member.userId} value={member.userId}>{member.name}</option>)}
                  </select>
                </>
              )}
            </div>
          </section>
        )}
      </div>
    </AppLayout>
  );
};

export default TaskDetailPage;
