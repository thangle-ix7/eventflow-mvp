import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FolderPlus,
  PlusCircle,
  UserRound,
} from 'lucide-react';
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
        <div className="overflow-hidden rounded-[2rem] border border-red-100 bg-white shadow-xl shadow-red-100/60">
          <ErrorState
            error={statusError}
            title="Không cập nhật được trạng thái"
            onDismiss={() => setStatusError('')}
          />
        </div>
      )}

      {canManage && (
        <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
          <form
            onSubmit={handleCreateDepartment}
            className="group relative overflow-hidden rounded-[2rem] border border-sky-100 bg-white p-6 shadow-xl shadow-sky-100/70 transition hover:-translate-y-1 hover:shadow-2xl hover:shadow-cyan-100"
          >
            <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-sky-100 blur-3xl transition group-hover:bg-cyan-100" />

            <div className="relative">
              <div className="mb-5 flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-emerald-400 text-white shadow-lg shadow-cyan-100">
                  <FolderPlus className="h-6 w-6" strokeWidth={1.8} />
                </div>

                <div>
                  <h3 className="text-lg font-black text-slate-950">Tạo ban</h3>
                  <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                    Ban là nhóm phụ trách công việc trong sự kiện.
                  </p>
                </div>
              </div>

              {createDepartmentMutation.error && (
                <div className="mb-4">
                  <ErrorState error={createDepartmentMutation.error} title="Không tạo được ban" />
                </div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  name="departmentName"
                  value={departmentName}
                  onChange={(event) => setDepartmentName(event.target.value)}
                  required
                  maxLength={100}
                  placeholder="Ví dụ: Ban Hậu cần"
                  className={inputClassName}
                />

                <Button
                  type="submit"
                  disabled={createDepartmentMutation.isPending}
                  className="shrink-0 rounded-2xl bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400 px-5 font-black text-white shadow-lg shadow-cyan-100 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-cyan-200"
                >
                  {createDepartmentMutation.isPending ? 'Đang tạo...' : 'Tạo'}
                </Button>
              </div>
            </div>
          </form>

          <form
            onSubmit={handleCreateTask}
            className="group relative overflow-hidden rounded-[2rem] border border-sky-100 bg-white p-6 shadow-xl shadow-sky-100/70 transition hover:-translate-y-1 hover:shadow-2xl hover:shadow-cyan-100"
          >
            <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-emerald-100 blur-3xl transition group-hover:bg-cyan-100" />

            <div className="relative">
              <div className="mb-5 flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-emerald-400 text-white shadow-lg shadow-cyan-100">
                  <PlusCircle className="h-6 w-6" strokeWidth={1.8} />
                </div>

                <div>
                  <h3 className="text-lg font-black text-slate-950">Tạo công việc</h3>
                  <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                    Tạo nhanh công việc mới và gán vào ban phụ trách.
                  </p>
                </div>
              </div>

              {createTaskMutation.error && (
                <div className="mb-4">
                  <ErrorState error={createTaskMutation.error} title="Không tạo được công việc" />
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <input
                  name="taskTitle"
                  value={taskForm.title}
                  onChange={(event) => setTaskForm((old) => ({ ...old, title: event.target.value }))}
                  required
                  maxLength={255}
                  placeholder="Tên công việc"
                  className={inputClassName}
                />

                <select
                  name="departmentId"
                  value={taskForm.departmentId}
                  onChange={(event) => setTaskForm((old) => ({ ...old, departmentId: event.target.value }))}
                  className={inputClassName}
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
                  className={inputClassName}
                />

                <select
                  name="priority"
                  value={taskForm.priority}
                  onChange={(event) => setTaskForm((old) => ({ ...old, priority: event.target.value }))}
                  className={inputClassName}
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
                  className={inputClassName}
                />
              </div>

              <Button
                type="submit"
                disabled={createTaskMutation.isPending}
                className="mt-4 w-full rounded-2xl bg-slate-950 py-3 font-black text-white shadow-xl shadow-slate-200 transition hover:-translate-y-0.5 hover:bg-slate-800"
              >
                {createTaskMutation.isPending ? 'Đang tạo công việc...' : 'Tạo công việc'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {(!departments || departments.length === 0) && (
        <div className="overflow-hidden rounded-[2rem] border border-sky-100 bg-white p-8 shadow-xl shadow-sky-100/70">
          <EmptyState
            title={canManage ? 'Chưa có công việc nào' : 'Chưa có dữ liệu công việc'}
          />
        </div>
      )}

      <div className="space-y-6">
        {departments.map((dept) => {
          const tasks = dept.tasks || [];

          return (
            <div
              key={dept.departmentId || 'unassigned'}
              className="overflow-hidden rounded-[2rem] border border-sky-100 bg-white shadow-xl shadow-sky-100/70"
            >
              <div className="border-b border-sky-100 bg-gradient-to-r from-sky-50 via-white to-emerald-50 px-6 py-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-emerald-400 text-white shadow-lg shadow-cyan-100">
                      <ClipboardList className="h-5 w-5" strokeWidth={1.8} />
                    </div>

                    <div>
                      <h3 className="text-lg font-black text-slate-950">
                        {dept.departmentName || 'Chưa có tên ban'}
                      </h3>
                      <p className="mt-1 text-sm font-semibold text-slate-500">
                        {tasks.length} công việc trong ban này
                      </p>
                    </div>
                  </div>

                  <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-sky-100 bg-white px-3 py-1.5 text-xs font-black text-sky-600 shadow-sm">
                    <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} />
                    Task board
                  </span>
                </div>
              </div>

              <div className="divide-y divide-sky-50">
                {tasks.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-sky-50 text-sky-500">
                      <ClipboardList className="h-7 w-7" strokeWidth={1.8} />
                    </div>
                    <p className="text-sm font-bold text-slate-500">
                      Không có task nào trong ban này
                    </p>
                  </div>
                ) : (
                  tasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex flex-col justify-between gap-5 p-5 transition hover:bg-sky-50/70 lg:flex-row lg:items-center"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-base font-black text-slate-950">
                          {task.title || 'Không có tiêu đề'}
                        </div>

                        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-slate-500">
                          <span className="inline-flex items-center gap-1.5">
                            <UserRound className="h-4 w-4 text-sky-500" strokeWidth={1.8} />
                            {task.assigneeName || 'Chưa phân công'}
                          </span>

                          <span className="inline-flex items-center gap-1.5">
                            <CalendarDays className="h-4 w-4 text-emerald-500" strokeWidth={1.8} />
                            {task.deadline
                              ? formatDate(task.deadline)
                              : 'Chưa có deadline'}
                          </span>
                        </div>

                        <div className="mt-4 max-w-md">
                          <ProgressBar value={task.progressPercentage ?? 0} />
                          <p className="mt-2 text-xs font-black text-slate-500">
                            Tiến độ {task.progressPercentage ?? 0}%
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 lg:justify-end">
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
                          className={`cursor-pointer rounded-2xl border px-4 py-2 text-sm font-black outline-none transition-all disabled:cursor-not-allowed disabled:opacity-60
                            ${task.status === 'DONE'
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : task.status === 'IN_REVIEW'
                                ? 'border-violet-200 bg-violet-50 text-violet-700'
                                : task.status === 'IN_PROGRESS'
                                  ? 'border-amber-200 bg-amber-50 text-amber-700'
                                  : 'border-slate-200 bg-slate-50 text-slate-700'
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
    </div>
  );
};

const inputClassName = 'min-h-11 w-full min-w-0 rounded-2xl border border-sky-100 bg-sky-50/60 px-3 py-2 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-cyan-300 focus:bg-white focus:ring-4 focus:ring-cyan-100';

export default TaskBoard;