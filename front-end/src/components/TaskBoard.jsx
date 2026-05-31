import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import taskApi from '../api/taskApi';
import { formatDate } from '../utils/dateUtils';

const TaskBoard = ({ eventId }) => {
  const queryClient = useQueryClient();

  const {
    data: departments = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['eventTasks', eventId],
    queryFn: () => taskApi.getEventTasks(eventId),
    enabled: Boolean(eventId),
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

      alert(
        `Lỗi cập nhật trạng thái: ${err.userMessage || err.message || 'Vui lòng thử lại'
        }`
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

  if (!departments || departments.length === 0) {
    return (
      <div className="p-8 text-center text-gray-400 italic bg-white rounded-xl border border-gray-200">
        Chưa có dữ liệu công việc cho sự kiện này.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {departments.map((dept) => {
        const tasks = dept.tasks || [];

        return (
          <div
            key={dept.departmentId}
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
                            : task.status === 'IN_PROGRESS'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-gray-50 text-gray-700 border-gray-200'
                          }
                        `}
                      >
                        <option value="TODO">TODO</option>
                        <option value="IN_PROGRESS">IN_PROGRESS</option>
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
