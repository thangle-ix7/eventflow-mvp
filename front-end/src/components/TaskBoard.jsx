import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import departmentApi from '../api/departmentApi';
import taskApi from '../api/taskApi';
import { formatDate } from '../utils/dateUtils';

const TaskBoard = ({ eventId, canManage = false }) => {
  const queryClient = useQueryClient();
  const [statusError, setStatusError] = useState('');
  const [departmentName, setDepartmentName] = useState('');
  const [taskForm, setTaskForm] = useState({
    title: '',
    departmentId: '',
    deadline: '',
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
      queryClient.invalidateQueries({
        queryKey: ['dashboardSummary', eventId],
      });
    },
  });

  const createDepartmentMutation = useMutation({
    mutationFn: departmentApi.createDepartment,
    onSuccess: () => {
      setDepartmentName('');
      queryClient.invalidateQueries({ queryKey: ['eventDepartments', eventId] });
      queryClient.invalidateQueries({ queryKey: ['eventTasks', eventId] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary', eventId] });
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: taskApi.createTask,
    onSuccess: () => {
      setTaskForm({ title: '', departmentId: '', deadline: '', progressPercentage: 0 });
      queryClient.invalidateQueries({ queryKey: ['eventTasks', eventId] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary', eventId] });
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
        deadline: taskForm.deadline,
        progressPercentage: Number(taskForm.progressPercentage),
      },
    });
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-gray-500">
        Đang tải danh sách công việc...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-red-500">
        Lỗi tải dữ liệu: {error.userMessage || error.message}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {statusError && (
        <div className="flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{statusError}</span>
          <button
            type="button"
            onClick={() => setStatusError('')}
            className="font-semibold text-red-700 hover:text-red-800"
          >
            Đóng
          </button>
        </div>
      )}
      {canManage && (
        <div className="grid gap-4 lg:grid-cols-2">
          <form
            onSubmit={handleCreateDepartment}
            className="rounded-xl border border-gray-200 bg-white p-5"
          >
            <h3 className="font-bold text-gray-900">Tạo ban</h3>
            <p className="mt-1 text-sm text-gray-500">
              Ban là nhóm phụ trách công việc trong sự kiện.
            </p>
            {createDepartmentMutation.error && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                {createDepartmentMutation.error.userMessage || createDepartmentMutation.error.message}
              </div>
            )}
            <div className="mt-4 flex gap-2">
              <input
                value={departmentName}
                onChange={(event) => setDepartmentName(event.target.value)}
                required
                maxLength={100}
                placeholder="Ví dụ: Ban Hậu cần"
                className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                disabled={createDepartmentMutation.isPending}
                className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                Tạo
              </button>
            </div>
          </form>

          <form
            onSubmit={handleCreateTask}
            className="rounded-xl border border-gray-200 bg-white p-5"
          >
            <h3 className="font-bold text-gray-900">Tạo task</h3>
            <p className="mt-1 text-sm text-gray-500">
              Task mới sẽ ở trạng thái TODO và có thể phân công sau.
            </p>
            {createTaskMutation.error && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                {createTaskMutation.error.userMessage || createTaskMutation.error.message}
              </div>
            )}
            <div className="mt-4 grid gap-2 sm:grid-cols-4">
              <input
                value={taskForm.title}
                onChange={(event) => setTaskForm((old) => ({ ...old, title: event.target.value }))}
                required
                maxLength={255}
                placeholder="Tên task"
                className="rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-indigo-500"
              />
              <select
                value={taskForm.departmentId}
                onChange={(event) => setTaskForm((old) => ({ ...old, departmentId: event.target.value }))}
                className="rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-indigo-500"
              >
                <option value="">Chưa gán ban</option>
                {departmentOptions.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
              <input
                type="datetime-local"
                value={taskForm.deadline}
                onChange={(event) => setTaskForm((old) => ({ ...old, deadline: event.target.value }))}
                required
                className="rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-indigo-500"
              />
              <input
                type="number"
                min="0"
                max="100"
                value={taskForm.progressPercentage}
                onChange={(event) => setTaskForm((old) => ({ ...old, progressPercentage: event.target.value }))}
                required
                placeholder="Tiến độ %"
                className="rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-indigo-500"
              />
            </div>
            <button
              type="submit"
              disabled={createTaskMutation.isPending}
              className="mt-3 w-full rounded-lg bg-gray-900 px-4 py-2 font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Tạo task
            </button>
          </form>
        </div>
      )}

      {(!departments || departments.length === 0) && (
        <div className="p-8 text-center text-gray-500 bg-white rounded-xl border border-gray-200">
          {canManage
            ? 'Chưa có task nào. Bạn có thể tạo task trước rồi gán ban/người phụ trách sau.'
            : 'Chưa có dữ liệu công việc cho sự kiện này.'}
        </div>
      )}

      {departments.map((dept) => {
        const tasks = dept.tasks || [];

        return (
          <div
            key={dept.departmentId || 'unassigned'}
            className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
          >
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-800">
                {dept.departmentName || 'Chưa có tên ban'}
              </h3>
            </div>

            <div className="divide-y divide-gray-100">
              {tasks.length === 0 ? (
                <div className="p-6 text-center text-gray-400 italic">
                  Không có task nào trong ban này
                </div>
              ) : (
                tasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-4 hover:bg-gray-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">
                        {task.title || 'Không có tiêu đề'}
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                            />
                          </svg>
                          {task.assigneeName || 'Chưa phân công'}
                        </span>

                        <span className="flex items-center gap-1">
                          <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          {task.deadline
                            ? formatDate(task.deadline)
                            : 'Chưa có deadline'}
                        </span>
                      </div>
                      <div className="mt-3 max-w-xs">
                        <div className="h-2 rounded-full bg-gray-100">
                          <div
                            className="h-2 rounded-full bg-blue-600"
                            style={{ width: `${task.progressPercentage ?? 0}%` }}
                          />
                        </div>
                        <p className="mt-1 text-xs font-semibold text-gray-500">
                          Tiến độ {task.progressPercentage ?? 0}%
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <select
                        value={task.status || 'TODO'}
                        disabled={mutation.isPending}
                        onChange={(e) =>
                          mutation.mutate({
                            taskId: task.id,
                            status: e.target.value,
                          })
                        }
                        className={`text-sm font-semibold rounded-lg px-3 py-1.5 border transition-all outline-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed
                          ${task.status === 'DONE'
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : task.status === 'IN_REVIEW'
                              ? 'bg-violet-50 text-violet-700 border-violet-200'
                            : task.status === 'IN_PROGRESS'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-gray-50 text-gray-700 border-gray-200'
                          }
                        `}
                      >
                        <option value="TODO">TODO</option>
                        <option value="IN_PROGRESS">IN_PROGRESS</option>
                        <option value="IN_REVIEW">IN_REVIEW</option>
                        <option value="DONE">DONE</option>
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
