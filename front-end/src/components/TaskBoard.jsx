import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, UserRound } from 'lucide-react';
import departmentApi from '../api/departmentApi';
import taskApi from '../api/taskApi';
import { formatDate } from '../utils/dateUtils';
import { Button, EmptyState, ErrorState, LoadingState, PriorityBadge, ProgressBar } from './ui';
import { invalidateDashboardQueries } from '../utils/dashboardQueryUtils';

const TaskBoard = ({ eventId, canManage = false }) => {
  const queryClient = useQueryClient();
  const [statusError, setStatusError] = useState('');
  const [departmentName, setDepartmentName] = useState('');
  const [taskForm, setTaskForm] = useState({
    title: '',
    departmentId: '',
    deadline: '',
    priority: 'MEDIUM',
    progressPercentage: 0,
  });

  const {
    data: departments = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['eventTasks', eventId],
    queryFn: () => taskApi.getEventTasks(eventId),
    enabled: Boolean(eventId),
  });

  const {
    data: departmentOptions = [],
  } = useQuery({
    queryKey: ['eventDepartments', eventId],
    queryFn: () => departmentApi.getEventDepartments(eventId),
    enabled: Boolean(eventId) && canManage,
  });

  const mutation = useMutation({
    mutationFn: taskApi.updateTaskStatus,

    // Cập nhật UI trước khi backend trả response
    onMutate: async ({ taskId, status }) => {
      await queryClient.cancelQueries({
        queryKey: ['eventTasks', eventId],
      });

      const previousTasks = queryClient.getQueryData(['eventTasks', eventId]);

      queryClient.setQueryData(['eventTasks', eventId], (oldDepartments) => {
        if (!oldDepartments) return [];

        return oldDepartments.map((dept) => ({
          ...dept,
          tasks: (dept.tasks || []).map((task) =>
            task.id === taskId
              ? {
                ...task,
                status,
                progressPercentage: status === 'DONE' ? 100 : task.progressPercentage,
              }
              : task
          ),
        }));
      });

      return { previousTasks };
    },

    // Nếu backend lỗi thì rollback UI về dữ liệu cũ
    onError: (err, variables, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(
          ['eventTasks', eventId],
          context.previousTasks
        );
      }

      setStatusError(
        `Lỗi cập nhật trạng thái: ${err.userMessage || err.message || 'Vui lòng thử lại'}`
      );
    },

    // Sau cùng refetch lại để đồng bộ chắc chắn với backend
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ['eventTasks', eventId],
      });
      invalidateDashboardQueries(queryClient, eventId);
    },
  });

  const createDepartmentMutation = useMutation({
    mutationFn: departmentApi.createDepartment,
    onSuccess: () => {
      setDepartmentName('');
      queryClient.invalidateQueries({ queryKey: ['eventDepartments', eventId] });
      queryClient.invalidateQueries({ queryKey: ['eventTasks', eventId] });
      invalidateDashboardQueries(queryClient, eventId);
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: taskApi.createTask,
    onSuccess: () => {
      setTaskForm({ title: '', departmentId: '', deadline: '', priority: 'MEDIUM', progressPercentage: 0 });
      queryClient.invalidateQueries({ queryKey: ['eventTasks', eventId] });
      invalidateDashboardQueries(queryClient, eventId);
    },
  });

  const handleCreateDepartment = (event) => {
    event.preventDefault();
    createDepartmentMutation.mutate({
      eventId,
      payload: { name: departmentName },
    });
  };

  const handleCreateTask = (event) => {
    event.preventDefault();
    createTaskMutation.mutate({
      eventId,
      payload: {
        title: taskForm.title,
        departmentId: taskForm.departmentId ? Number(taskForm.departmentId) : null,
        assigneeId: null,
        status: 'TODO',
        priority: taskForm.priority,
        deadline: taskForm.deadline,
        progressPercentage: Number(taskForm.progressPercentage),
      },
    });
  };

  if (isLoading) {
    return <LoadingState message="Đang tải danh sách công việc..." />;
  }

  if (error) {
    return <ErrorState error={error} title="Không tải được danh sách công việc" />;
  }

  return (
    <div className="space-y-8">
      {statusError && (
        <ErrorState error={statusError} title="Không cập nhật được trạng thái" onDismiss={() => setStatusError('')} />
      )}
      {canManage && (
        <div className="grid gap-4 lg:grid-cols-2">
          <form
            onSubmit={handleCreateDepartment}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <h3 className="font-bold text-slate-950">Tạo ban</h3>
            <p className="mt-1 text-sm text-slate-500">
              Ban là nhóm phụ trách công việc trong sự kiện.
            </p>
            {createDepartmentMutation.error && (
              <div className="mt-3"><ErrorState error={createDepartmentMutation.error} title="Không tạo được ban" /></div>
            )}
            <div className="mt-4 flex gap-2">
              <input
                name="departmentName"
                value={departmentName}
                onChange={(event) => setDepartmentName(event.target.value)}
                required
                maxLength={100}
                placeholder="Ví dụ: Ban Hậu cần"
                className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
              <Button
                type="submit"
                disabled={createDepartmentMutation.isPending}
              >
                Tạo
              </Button>
            </div>
          </form>

          <form
            onSubmit={handleCreateTask}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <h3 className="font-bold text-slate-950">Tạo công việc</h3>
            <p className="mt-1 text-sm text-slate-500">
              Công việc mới sẽ ở trạng thái cần làm và có thể phân công sau.
            </p>
            {createTaskMutation.error && (
              <div className="mt-3"><ErrorState error={createTaskMutation.error} title="Không tạo được công việc" /></div>
            )}
            <div className="mt-4 grid gap-2 sm:grid-cols-5">
              <input
                name="taskTitle"
                value={taskForm.title}
                onChange={(event) => setTaskForm((old) => ({ ...old, title: event.target.value }))}
                required
                maxLength={255}
                placeholder="Tên công việc"
                className="rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
              <select
                name="departmentId"
                value={taskForm.departmentId}
                onChange={(event) => setTaskForm((old) => ({ ...old, departmentId: event.target.value }))}
                className="rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              >
                <option value="">Chưa gán ban</option>
                {departmentOptions.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
              <input
                name="deadline"
                type="datetime-local"
                value={taskForm.deadline}
                onChange={(event) => setTaskForm((old) => ({ ...old, deadline: event.target.value }))}
                required
                className="rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
              <select
                name="priority"
                value={taskForm.priority}
                onChange={(event) => setTaskForm((old) => ({ ...old, priority: event.target.value }))}
                className="rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              >
                <option value="LOW">Thấp</option>
                <option value="MEDIUM">Trung bình</option>
                <option value="HIGH">Cao</option>
                <option value="URGENT">Khẩn cấp</option>
              </select>
              <input
                name="progressPercentage"
                type="number"
                min="0"
                max="100"
                value={taskForm.progressPercentage}
                onChange={(event) => setTaskForm((old) => ({ ...old, progressPercentage: event.target.value }))}
                required
                placeholder="Tiến độ %"
                className="rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
            <Button
              type="submit"
              disabled={createTaskMutation.isPending}
              className="mt-3 w-full"
            >
              Tạo công việc
            </Button>
          </form>
        </div>
      )}

      {(!departments || departments.length === 0) && (
        <EmptyState
          title={canManage ? 'Chưa có công việc nào' : 'Chưa có dữ liệu công việc'}
          description={canManage
            ? 'Bạn có thể tạo công việc trước rồi gán ban hoặc người phụ trách sau.'
            : 'Sự kiện này chưa có dữ liệu công việc để hiển thị.'}
        />
      )}

      {departments.map((dept) => {
        const tasks = dept.tasks || [];

        return (
          <div
            key={dept.departmentId || 'unassigned'}
            className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
          >
            <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
              <h3 className="text-lg font-bold text-slate-900">
                {dept.departmentName || 'Chưa có tên ban'}
              </h3>
            </div>

            <div className="divide-y divide-slate-100">
              {tasks.length === 0 ? (
                <div className="p-6 text-center text-sm text-slate-500">
                  Không có task nào trong ban này
                </div>
              ) : (
                tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex flex-col justify-between gap-4 p-4 transition-colors hover:bg-indigo-50/40 sm:flex-row sm:items-center"
                  >
                    <div className="flex-1">
                      <div className="font-semibold text-slate-950">
                        {task.title || 'Không có tiêu đề'}
                      </div>

                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                          <UserRound className="h-3.5 w-3.5" strokeWidth={1.8} />
                          {task.assigneeName || 'Chưa phân công'}
                        </span>

                        <span className="flex items-center gap-1">
                          <CalendarDays className="h-3.5 w-3.5" strokeWidth={1.8} />
                          {task.deadline
                            ? formatDate(task.deadline)
                            : 'Chưa có deadline'}
                        </span>
                      </div>
                      <div className="mt-3 max-w-xs">
                        <ProgressBar value={task.progressPercentage ?? 0} />
                        <p className="mt-1 text-xs font-semibold text-slate-500">
                          Tiến độ {task.progressPercentage ?? 0}%
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <PriorityBadge priority={task.priority} />
                      <select
                        value={task.status || 'TODO'}
                        disabled={mutation.isPending}
                        onChange={(e) =>
                          mutation.mutate({
                            taskId: task.id,
                            status: e.target.value,
                          })
                        }
                        className={`cursor-pointer rounded-lg border px-3 py-1.5 text-sm font-semibold outline-none transition-all disabled:cursor-not-allowed disabled:opacity-60
                          ${task.status === 'DONE'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : task.status === 'IN_REVIEW'
                              ? 'bg-violet-50 text-violet-700 border-violet-200'
                            : task.status === 'IN_PROGRESS'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-slate-50 text-slate-700 border-slate-200'
                          }
                        `}
                      >
                        <option value="TODO">Cần làm</option>
                        <option value="IN_PROGRESS">Đang làm</option>
                        <option value="IN_REVIEW">Chờ duyệt</option>
                        <option value="DONE">Hoàn thành</option>
                      </select>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TaskBoard;
