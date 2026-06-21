import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import departmentApi from '../api/departmentApi';
import eventApi from '../api/eventApi';
import eventMemberApi from '../api/eventMemberApi';
import milestoneApi from '../api/milestoneApi';
import taskApi from '../api/taskApi';
import workloadApi from '../api/workloadApi';
import MilestoneCreateModal from '../components/MilestoneCreateModal';
import { Button, ErrorState, LoadingState, PageHeader, Panel, PriorityBadge, StatusBadge } from '../components/ui';
import { invalidateDashboardQueries } from '../utils/dashboardQueryUtils';

const toDatetimeLocal = (value) => (value ? value.slice(0, 16) : '');
const progressFromStatus = (status) => (status === 'DONE' ? 100 : 0);

const autoResizeTextarea = (element) => {
  element.style.height = 'auto';
  element.style.height = `${element.scrollHeight}px`;
};

const workloadText = (workload) => {
  if (!workload) return '';
  return ` - ${workload.assignedTasks} công việc - ${workload.workloadStatus}`;
};

const TaskEditPage = () => {
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

  if (taskQuery.isLoading) {
    return <LoadingState message="Đang tải công việc..." />;
  }

  if (taskQuery.error) {
    return <ErrorState error={taskQuery.error} title="Không tải được công việc" />;
  }

  if (!taskQuery.data) {
    return <ErrorState error="Không tìm thấy công việc này" title="Không tìm thấy công việc" />;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={eventQuery.data?.name || 'Công việc'}
        title="Chỉnh sửa công việc"
        meta={
          <>
            <StatusBadge status={taskQuery.data.status} />
            <PriorityBadge priority={taskQuery.data.priority} />
            <span className="inline-flex max-w-full items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-700 shadow-sm">
              {taskQuery.data.parentId ? 'Việc con' : 'Việc chính'}
            </span>
          </>
        }
      />

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
    </div>
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
    reminderOffsetHours: Number(((task.reminderOffsetMinutes ?? 1440) / 60).toFixed(2)),
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
    if (!form.departmentId) return [];
    return members.filter((member) => String(member.departmentId || '') === form.departmentId);
  }, [form.departmentId, members]);

  const workloadByMemberId = useMemo(() => {
    const workloadMembers = departmentWorkloadQuery.data?.members || [];
    return workloadMembers.reduce((map, member) => {
      map[String(member.memberId)] = member;
      return map;
    }, {});
  }, [departmentWorkloadQuery.data]);

  const selectedMemberWorkload = form.assigneeId ? workloadByMemberId[String(form.assigneeId)] : null;

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
        reminderOffsetMinutes: Math.round(Number(form.reminderOffsetHours || 0) * 60),
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
      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <Panel className="p-5">
          <form onSubmit={handleSubmit} className="grid gap-5">
            <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-sky-600">Thông tin</p>
                <h3 className="mt-1 text-lg font-black text-slate-950">{task.title}</h3>
              </div>
              <span className="text-sm font-bold text-slate-500">#{task.id}</span>
            </div>

            {mutation.error && (
              <ErrorState error={mutation.error} title="Không lưu được công việc" />
            )}

            <Field label="Tên công việc">
              <textarea
                name="title"
                value={form.title}
                onChange={handleChange}
                onInput={(event) => autoResizeTextarea(event.currentTarget)}
                required
                maxLength={255}
                rows={1}
                className={compactTextareaClassName}
                placeholder="Tên công việc"
              />
            </Field>

            <Field label="Mô tả công việc">
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                onInput={(event) => autoResizeTextarea(event.currentTarget)}
                maxLength={2000}
                rows={4}
                className={textareaClassName}
                placeholder="Mô tả"
              />
            </Field>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Cột mốc">
                <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                  <select
                    name="milestoneId"
                    value={form.milestoneId}
                    onChange={handleChange}
                    disabled={isSubtask}
                    className={inputClassName}
                  >
                    <option value="">Chưa gán cột mốc</option>
                    {milestonesQuery.data?.map((milestone) => (
                      <option key={milestone.id} value={milestone.id}>{milestone.name}</option>
                    ))}
                  </select>

                  {!isSubtask && (
                    <button
                      type="button"
                      onClick={() => setIsMilestoneModalOpen(true)}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                    >
                      Tạo
                    </button>
                  )}
                </div>
              </Field>

              <Field label="Ban phụ trách">
                <select
                  name="departmentId"
                  value={form.departmentId}
                  onChange={handleChange}
                  disabled={isSubtask}
                  className={inputClassName}
                >
                  <option value="">Chưa gán ban</option>
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>{department.name}</option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Người phụ trách">
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
                  <p className="mt-2 text-xs font-bold text-slate-500">Đang tải khối lượng...</p>
                )}

                {selectedMemberWorkload && (
                  <p className={`mt-2 rounded-lg border px-3 py-2 text-xs font-black ${getWorkloadClassName(selectedMemberWorkload.workloadStatus)}`}>
                    {selectedMemberWorkload.assignedTasks} công việc · {selectedMemberWorkload.workloadScore}% · {selectedMemberWorkload.workloadStatus}
                  </p>
                )}
              </Field>

              <Field label="Hạn">
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
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Cảnh báo trước hạn (giờ)">
                <input
                  name="reminderOffsetHours"
                  type="number"
                  min="0"
                  max="8760"
                  step="0.5"
                  value={form.reminderOffsetHours}
                  onChange={handleChange}
                  required
                  className={inputClassName}
                />
              </Field>

              <Field label="Trạng thái">
                <select name="status" value={form.status} onChange={handleChange} className={inputClassName}>
                  <option value="TODO">Cần làm</option>
                  <option value="IN_PROGRESS">Đang làm</option>
                  <option value="IN_REVIEW">Chờ duyệt</option>
                  <option value="DONE">Hoàn thành</option>
                </select>
              </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Ưu tiên">
                <select name="priority" value={form.priority} onChange={handleChange} className={inputClassName}>
                  <option value="LOW">Thấp</option>
                  <option value="MEDIUM">Trung bình</option>
                  <option value="HIGH">Cao</option>
                  <option value="URGENT">Khẩn cấp</option>
                </select>
              </Field>

              {!isSubtask && (
                <Field label="Tiến độ (%)">
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
            </div>

            <Button type="submit" disabled={mutation.isPending} className="w-full">
              {mutation.isPending && <Loader2 size={18} className="animate-spin" />}
              Lưu thay đổi
            </Button>
          </form>
        </Panel>

        <aside className="grid gap-5 content-start">
          <Panel className="p-5">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-sky-600">Ngữ cảnh</p>
            <div className="mt-4 grid gap-3">
              <SummaryItem label="Loại" value={isSubtask ? 'Việc con' : 'Việc chính'} />
              <SummaryItem label="Ban hiện tại" value={task.departmentName || 'Chưa gán ban'} />
              <SummaryItem label="Người phụ trách" value={task.assigneeName || 'Chưa phân công'} />
              <SummaryItem label="Cảnh báo" value={`${form.reminderOffsetHours || 0} giờ trước hạn`} />
            </div>
          </Panel>

          <Panel className="p-5">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-sky-600">Trạng thái</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <StatusBadge status={form.status} />
              <PriorityBadge priority={form.priority} />
            </div>
          </Panel>
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

const Field = ({ label, children }) => (
  <label className="block">
    <span className="text-sm font-black text-slate-700">{label}</span>
    <div className="mt-2">{children}</div>
  </label>
);

const SummaryItem = ({ label, value }) => (
  <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
    <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">{label}</p>
    <p className="mt-1 truncate text-sm font-black text-slate-950">{value}</p>
  </div>
);

const getWorkloadClassName = (status) => {
  if (status === 'OVERLOADED') return 'border-red-200 bg-red-50 text-red-700';
  if (status === 'HIGH') return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-slate-200 bg-slate-50 text-slate-600';
};

const inputClassName = 'min-h-11 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-4 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500';
const compactTextareaClassName = 'min-h-11 w-full min-w-0 resize-none overflow-hidden rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold leading-6 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-4 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500';
const textareaClassName = 'min-h-28 w-full min-w-0 resize-none overflow-hidden rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold leading-6 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-4 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500';

export default TaskEditPage;


