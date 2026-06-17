import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import {
  CalendarDays,
  ClipboardList,
  FileText,
  Flag,
  Layers3,
  Loader2,
  Plus,
  Save,
  Sparkles,
  TrendingUp,
  UserRound,
} from 'lucide-react';
import AppLayout from '../components/AppLayout';
import departmentApi from '../api/departmentApi';
import eventApi from '../api/eventApi';
import eventMemberApi from '../api/eventMemberApi';
import milestoneApi from '../api/milestoneApi';
import taskApi from '../api/taskApi';
import workloadApi from '../api/workloadApi';
import MilestoneCreateModal from '../components/MilestoneCreateModal';
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

  const departmentsQuery = useQuery({
    queryKey: ['eventDepartments', eventId],
    queryFn: () => departmentApi.getEventDepartments(eventId),
    enabled: Boolean(eventId),
  });

  const membersQuery = useQuery({
    queryKey: ['eventMembers', eventId],
    queryFn: () => eventMemberApi.getMembers(eventId),
    enabled: Boolean(eventId),
  });

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
    <AppLayout
      user={user}
      events={eventQuery.data ? [eventQuery.data] : []}
      selectedEvent={eventQuery.data}
      onEventChange={() => {}}
      onLogout={onLogout}
    >
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-sky-600">
                  <ClipboardList size={15} strokeWidth={1.8} />
                  Task management
                </p>

                <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                  Cập nhật task
                </h2>

                <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-600">
                  Chỉnh sửa thông tin task, người phụ trách, deadline, trạng thái, độ ưu tiên và tiến độ.
                </p>
              </div>

            <div className="rounded-2xl border border-sky-100 bg-sky-50/70 px-4 py-3">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                Event
              </p>
              <p className="mt-1 max-w-[240px] truncate text-sm font-black text-slate-950">
                {eventQuery.data?.name || 'Đang tải...'}
              </p>
            </div>
        </header>

        {taskQuery.isLoading && (
          <div className="flex items-center gap-3 rounded-[2rem] border border-sky-100 bg-white p-5 text-sm font-black text-slate-500 shadow-xl shadow-sky-100/70">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
              <Loader2 size={20} className="animate-spin" />
            </span>
            Đang tải...
          </div>
        )}

        {taskQuery.error && (
          <div className="rounded-[2rem] border border-red-200 bg-red-50 p-5 text-sm font-semibold leading-6 text-red-700 shadow-lg shadow-red-100/70">
            {taskQuery.error.userMessage || taskQuery.error.message || 'Không tải được task'}
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
  const [isMilestoneModalOpen, setIsMilestoneModalOpen] = useState(false);
  const [form, setForm] = useState({
    title: task.title || '',
    description: task.description || '',
    departmentId: String(task.departmentId || ''),
    assigneeId: task.assigneeId ? String(task.assigneeId) : '',
    milestoneId: task.milestoneId ? String(task.milestoneId) : '',
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

  const milestonesQuery = useQuery({
    queryKey: ['eventMilestones', eventId],
    queryFn: () => milestoneApi.getEventMilestones(eventId),
    enabled: Boolean(eventId),
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
        milestoneId: form.milestoneId ? Number(form.milestoneId) : null,
        deadline: form.deadline,
        status: form.status,
        priority: form.priority,
        progressPercentage: isSubtask ? progressFromStatus(form.status) : Number(form.progressPercentage),
      },
    });
  };

  const handleMilestoneCreated = (milestone) => {
    setForm((old) => ({ ...old, milestoneId: String(milestone.id) }));
    setIsMilestoneModalOpen(false);
  };

  return (
    <>
    <div className="grid gap-6 lg:grid-cols-[1fr_0.72fr]">
      <form
        onSubmit={handleSubmit}
        className="overflow-hidden rounded-[2rem] border border-sky-100 bg-white shadow-xl shadow-sky-100/70"
      >
        <div className="border-b border-sky-100 bg-gradient-to-r from-sky-50 via-white to-emerald-50 px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-emerald-400 text-white shadow-lg shadow-cyan-100">
              <Save className="h-5 w-5" strokeWidth={1.8} />
            </div>

            <div>
              <h3 className="text-lg font-black text-slate-950">
                Thông tin công việc
              </h3>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                {isSubtask
                  ? 'Đây là việc con, ban sẽ được giữ theo công việc cha.'
                  : 'Cập nhật thông tin công việc chính trong sự kiện.'}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-5 p-5">
          {mutation.error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
              {mutation.error.userMessage || mutation.error.message}
            </div>
          )}

          <Field
            label="Tên công việc"
            icon={<ClipboardList className="h-4 w-4" strokeWidth={1.8} />}
          >
            <input
              name="title"
              value={form.title}
              onChange={handleChange}
              required
              className={inputClassName}
              placeholder="Nhập tên công việc"
            />
          </Field>

          <Field
            label="Mô tả công việc"
            icon={<FileText className="h-4 w-4" strokeWidth={1.8} />}
          >
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              maxLength={2000}
              rows={5}
              className={`${inputClassName} min-h-32 resize-none py-3`}
              placeholder="Mục tiêu, phạm vi, yêu cầu đầu ra của công việc..."
            />
          </Field>

          <Field
            label="Cột mốc"
            icon={<Flag className="h-4 w-4" strokeWidth={1.8} />}
            hint={isSubtask ? 'Việc con kế thừa cột mốc của công việc cha.' : 'Không bắt buộc. Dùng để tổng quan tính tiến độ theo từng chặng.'}
          >
            <div className="flex flex-col gap-2 sm:flex-row">
              <select
                name="milestoneId"
                value={form.milestoneId}
                onChange={handleChange}
                disabled={isSubtask}
                className={inputClassName}
              >
                <option value="">Chưa gán cột mốc</option>
                {milestonesQuery.data?.map((milestone) => (
                  <option key={milestone.id} value={milestone.id}>
                    {milestone.name}
                  </option>
                ))}
              </select>

              {!isSubtask && (
                <button
                  type="button"
                  onClick={() => setIsMilestoneModalOpen(true)}
                  className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-2xl border border-sky-100 bg-white px-4 py-2 text-sm font-black text-sky-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-sky-50 hover:shadow-lg hover:shadow-sky-100"
                >
                  <Plus size={16} />
                  Tạo cột mốc
                </button>
              )}
            </div>

            {milestonesQuery.isLoading && (
              <p className="mt-2 flex items-center gap-2 text-xs font-semibold text-slate-500">
                <Loader2 size={13} className="animate-spin text-sky-500" />
                Đang tải cột mốc...
              </p>
            )}
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Ban"
              icon={<Layers3 className="h-4 w-4" strokeWidth={1.8} />}
              hint={isSubtask ? 'Việc con luôn dùng ban của công việc cha.' : ''}
            >
              <select
                name="departmentId"
                value={form.departmentId}
                onChange={handleChange}
                disabled={isSubtask}
                className={inputClassName}
              >
                <option value="">Chưa gán ban</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              label="Người phụ trách"
              icon={<UserRound className="h-4 w-4" strokeWidth={1.8} />}
            >
              <select
                name="assigneeId"
                value={form.assigneeId}
                onChange={handleChange}
                disabled={!form.departmentId}
                className={inputClassName}
              >
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
                <p className="mt-2 flex items-center gap-2 text-xs font-semibold text-slate-500">
                  <Loader2 size={13} className="animate-spin text-sky-500" />
                  Đang tải khối lượng việc của thành viên...
                </p>
              )}

              {selectedMemberWorkload && (
                <p className={`mt-2 rounded-2xl border px-3 py-2 text-xs font-black ${
                  selectedMemberWorkload.workloadStatus === 'OVERLOADED'
                    ? 'border-red-200 bg-red-50 text-red-700'
                    : selectedMemberWorkload.workloadStatus === 'HIGH'
                      ? 'border-amber-200 bg-amber-50 text-amber-700'
                      : 'border-sky-100 bg-sky-50 text-slate-600'
                }`}>
                  Khối lượng hiện tại: {selectedMemberWorkload.assignedTasks} công việc chưa hoàn thành · {selectedMemberWorkload.workloadScore}% · {selectedMemberWorkload.workloadStatus}
                </p>
              )}
            </Field>
          </div>

          <Field
            label="Hạn"
            icon={<CalendarDays className="h-4 w-4" strokeWidth={1.8} />}
            hint={maxDeadline ? 'Công việc chỉ được đặt trước hoặc trong thời gian sự kiện.' : ''}
          >
            <input
              name="deadline"
              type="datetime-local"
              value={form.deadline}
              onChange={handleChange}
              max={maxDeadline || undefined}
              required
              className={inputClassName}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Trạng thái"
              icon={<ClipboardList className="h-4 w-4" strokeWidth={1.8} />}
            >
              <select
                name="status"
                value={form.status}
                onChange={handleChange}
                className={inputClassName}
              >
                <option value="TODO">Cần làm</option>
                <option value="IN_PROGRESS">Đang làm</option>
                <option value="IN_REVIEW">Chờ duyệt</option>
                <option value="DONE">Hoàn thành</option>
              </select>
            </Field>

            <Field
              label="Ưu tiên"
              icon={<Sparkles className="h-4 w-4" strokeWidth={1.8} />}
            >
              <select
                name="priority"
                value={form.priority}
                onChange={handleChange}
                className={inputClassName}
              >
                <option value="LOW">Thấp</option>
                <option value="MEDIUM">Trung bình</option>
                <option value="HIGH">Cao</option>
                <option value="URGENT">Khẩn cấp</option>
              </select>
            </Field>
          </div>

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
                required
                className={inputClassName}
              />
            </Field>
          )}

          <button
            type="submit"
            disabled={mutation.isPending}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400 px-4 py-2 text-sm font-black text-white shadow-xl shadow-cyan-100 transition hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-cyan-200 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
          >
            {mutation.isPending ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Save size={18} />
            )}
            Lưu thay đổi
          </button>
        </div>
      </form>

      <aside className="space-y-5">
        <section className="relative overflow-hidden rounded-[2rem] border border-sky-100 bg-white p-5 shadow-xl shadow-sky-100/70">
          <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-sky-100 blur-3xl" />

          <div className="relative">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-emerald-400 text-white shadow-lg shadow-cyan-100">
              <TrendingUp size={22} strokeWidth={1.8} />
            </div>

            <h3 className="mt-4 text-lg font-black text-slate-950">
              Kiểm tra khối lượng việc
            </h3>

            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
              Khi chọn ban, EventFlow sẽ tải khối lượng việc của thành viên để hỗ trợ phân công hợp lý hơn.
            </p>
          </div>
        </section>

        <section className="rounded-[2rem] border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-emerald-50 p-5 shadow-xl shadow-sky-100/70">
          <h3 className="font-black text-slate-950">
            Quy tắc cập nhật
          </h3>

          <div className="mt-4 space-y-3">
            <InfoBox
              label="Việc con"
              value="Việc con không được đổi ban, tiến độ tự tính theo trạng thái."
            />
            <InfoBox
              label="DONE"
              value="Khi đổi trạng thái sang hoàn thành, tiến độ sẽ tự đặt thành 100%."
            />
            <InfoBox
              label="Hạn"
              value="Hạn không nên vượt quá thời gian kết thúc sự kiện."
            />
          </div>
        </section>
      </aside>
    </div>

    <MilestoneCreateModal
      eventId={eventId}
      isOpen={isMilestoneModalOpen}
      onCancel={() => setIsMilestoneModalOpen(false)}
      onCreated={handleMilestoneCreated}
    />
    </>
  );
};

const Field = ({ label, icon, hint, children }) => (
  <label className="block">
    <span className="flex items-center gap-2 text-sm font-black text-slate-700">
      <span className="text-sky-500">{icon}</span>
      {label}
    </span>

    <div className="mt-2">{children}</div>

    {hint && (
      <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
        {hint}
      </p>
    )}
  </label>
);

const InfoBox = ({ label, value }) => (
  <div className="rounded-2xl border border-sky-100 bg-white/80 p-4 shadow-sm">
    <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
      {label}
    </p>
    <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
      {value}
    </p>
  </div>
);

const inputClassName = 'min-h-11 w-full min-w-0 rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-cyan-300 focus:bg-white focus:ring-4 focus:ring-cyan-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500';

export default TaskEditPage;
