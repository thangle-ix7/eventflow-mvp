import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button, ErrorState, LoadingState, PageHeader, Panel, PriorityBadge, StatusBadge } from '../components/ui';
import departmentApi from '../api/departmentApi';
import eventApi from '../api/eventApi';
import eventMemberApi from '../api/eventMemberApi';
import milestoneApi from '../api/milestoneApi';
import taskApi from '../api/taskApi';
import { formatDate } from '../utils/dateUtils';
import { invalidateDashboardQueries } from '../utils/dashboardQueryUtils';


const STATUS_OPTIONS = [
  { value: 'TODO', label: 'Cần làm' },
  { value: 'IN_PROGRESS', label: 'Đang làm' },
  { value: 'IN_REVIEW', label: 'Chờ duyệt' },
  { value: 'DONE', label: 'Hoàn thành' },
];

const PRIORITY_OPTIONS = [
  { value: 'LOW', label: 'Thấp' },
  { value: 'MEDIUM', label: 'Trung bình' },
  { value: 'HIGH', label: 'Cao' },
  { value: 'URGENT', label: 'Khẩn cấp' },
];

const toDatetimeLocal = (value) => (value ? value.slice(0, 16) : '');
const toReminderHours = (minutes) => Number(((minutes ?? 1440) / 60).toFixed(2));

const createFormFromTask = (task) => ({
  title: task?.title || '',
  description: task?.description || '',
  departmentId: task?.departmentId ? String(task.departmentId) : '',
  assigneeId: task?.assigneeId ? String(task.assigneeId) : '',
  milestoneId: task?.milestoneId ? String(task.milestoneId) : '',
  deadline: toDatetimeLocal(task?.deadline),
  reminderOffsetHours: toReminderHours(task?.reminderOffsetMinutes),
  status: task?.status || 'TODO',
  priority: task?.priority || 'MEDIUM',
});



const TaskDetailPage = ({ user }) => {
  const { eventId, taskId } = useParams();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [editingField, setEditingField] = useState(null);
  const [form, setForm] = useState(null);

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

  const milestonesQuery = useQuery({
    queryKey: ['eventMilestones', eventId],
    queryFn: () => milestoneApi.getEventMilestones(eventId),
    enabled: Boolean(eventId),
  });


  const task = taskQuery.data;
  const event = eventQuery.data;
  const departments = departmentsQuery.data || [];
  const members = useMemo(() => membersQuery.data || [], [membersQuery.data]);
  const milestones = milestonesQuery.data || [];
  const isSubtask = Boolean(task?.parentId);
  const isEventLeader = event?.role === 'LEADER';
  const isTeamLeader = departments.some((department) => (
    String(department.id) === String(task?.departmentId) && String(department.leaderUserId) === String(user?.userId)
  ));
  const canEditTask = Boolean(task && (isEventLeader || isTeamLeader));
  const isAssignee = String(task?.assigneeId || '') === String(user?.userId || '');
  const currentForm = form || createFormFromTask(task);

  const assignableMembers = useMemo(() => {
    if (!currentForm.departmentId) return [];
    return members.filter((member) => String(member.departmentId || '') === currentForm.departmentId);
  }, [currentForm.departmentId, members]);

  const updateTaskMutation = useMutation({
    mutationFn: taskApi.updateTask,
    onSuccess: (updatedTask) => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
      if (task?.parentId) {
        queryClient.invalidateQueries({ queryKey: ['task', String(task.parentId)] });
      }
      queryClient.invalidateQueries({ queryKey: ['eventTaskPage', eventId] });
      queryClient.invalidateQueries({ queryKey: ['eventDepartments', eventId] });
      queryClient.invalidateQueries({ queryKey: ['eventMembers', eventId] });
      invalidateDashboardQueries(queryClient, eventId);
      setForm(createFormFromTask(updatedTask));
      setEditingField(null);
    },
  });


  const approveTaskMutation = useMutation({
    mutationFn: taskApi.updateTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
      queryClient.invalidateQueries({ queryKey: ['eventTaskPage', eventId] });
      invalidateDashboardQueries(queryClient, eventId);
      navigate(`/events/${eventId}/tasks`, { replace: true });
    },
  });

  const handleFieldChange = (name, value) => {
    setForm((old) => ({
      ...old,
      [name]: value,
      ...(name === 'departmentId' ? { assigneeId: '' } : {}),
    }));
  };

  const buildTaskPayload = (overrides = {}) => ({
    title: currentForm.title.trim(),
    description: currentForm.description,
    departmentId: currentForm.departmentId ? Number(currentForm.departmentId) : null,
    assigneeId: currentForm.assigneeId ? Number(currentForm.assigneeId) : null,
    milestoneId: currentForm.milestoneId ? Number(currentForm.milestoneId) : null,
    deadline: currentForm.deadline,
    reminderOffsetMinutes: Math.round(Number(currentForm.reminderOffsetHours || 0) * 60),
    status: currentForm.status,
    priority: currentForm.priority,
    ...overrides,
  });

  const saveField = () => {
    if (!task || !canEditTask || updateTaskMutation.isPending) return;
    const payload = buildTaskPayload();

    if (!payload.title || !payload.deadline) return;
    updateTaskMutation.mutate({ taskId, payload });
  };

  const approveTask = () => {
    if (!task || !canEditTask || task.status !== 'IN_REVIEW' || approveTaskMutation.isPending) return;
    approveTaskMutation.mutate({
      taskId,
      payload: buildTaskPayload({ status: 'DONE' }),
    });
  };

  const cancelEditing = () => {
    setForm(createFormFromTask(task));
    setEditingField(null);
  };

  if (taskQuery.isLoading) {
    return <LoadingState message="Đang tải công việc..." />;
  }

  if (taskQuery.error) {
    return <ErrorState error={taskQuery.error} title="Không tải được công việc" />;
  }

  if (!task) {
    return <ErrorState error="Không tìm thấy công việc này" title="Không tìm thấy công việc" />;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={event?.name || 'Sự kiện'}
        title={task.title}
        meta={
          <>
            <StatusBadge status={task.status} />
            <PriorityBadge priority={task.priority} />
            {canEditTask && (
              <span className="inline-flex max-w-full items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                Có thể sửa trực tiếp
              </span>
            )}
          </>
        }
        actions={
          <>
            {canEditTask && task.status === 'IN_REVIEW' && (
              <Button type="button" onClick={approveTask} disabled={approveTaskMutation.isPending}>
                {approveTaskMutation.isPending ? 'Đang duyệt...' : 'Duyệt'}
              </Button>
            )}
            {isAssignee && (
              <Button as={Link} to={`/events/${eventId}/tasks/${taskId}/update`} variant="secondary">
                Cập nhật tiến độ
              </Button>
            )}
          </>
        }
      />

      <Panel className="overflow-hidden p-0">
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="text-lg font-black text-slate-950">Thông tin công việc</h3>
          {canEditTask && (
            <p className="mt-1 text-sm font-semibold text-slate-500">Nhấn vào dòng dữ liệu để sửa, không hiển thị ID task.</p>
          )}
        </div>

        {(updateTaskMutation.error || approveTaskMutation.error) && (
          <div className="px-5 py-4">
            <ErrorState error={updateTaskMutation.error || approveTaskMutation.error} title="Không lưu được công việc" />
          </div>
        )}

        <div className="overflow-x-auto">
          <div className="min-w-[780px] divide-y divide-slate-100">
            <EditableRow label="Tên công việc" field="title" value={task.title} editingField={editingField} setEditingField={setEditingField} canEdit={canEditTask} onSave={saveField} onCancel={cancelEditing} isSaving={updateTaskMutation.isPending}>
              <textarea value={currentForm.title} onChange={(event) => handleFieldChange('title', event.target.value)} rows={2} maxLength={255} className={textareaClassName} autoFocus />
            </EditableRow>

            <EditableRow label="Mô tả" field="description" value={task.description || 'Chưa có mô tả'} multiline editingField={editingField} setEditingField={setEditingField} canEdit={canEditTask} onSave={saveField} onCancel={cancelEditing} isSaving={updateTaskMutation.isPending}>
              <textarea value={currentForm.description} onChange={(event) => handleFieldChange('description', event.target.value)} rows={5} maxLength={2000} className={textareaClassName} autoFocus />
            </EditableRow>
            {isSubtask && <ReadonlyRow label="Task cha" value={<Link className="font-black text-sky-700 hover:underline" to={`/events/${eventId}/tasks/${task.parentId}`}>Mở task cha</Link>} />}
            <ReadonlyRow label="Sự kiện" value={event?.name || `Event ${task.eventId}`} />

            <EditableRow label="Cột mốc" field="milestoneId" value={task.milestoneName || 'Chưa gán cột mốc'} editingField={editingField} setEditingField={setEditingField} canEdit={canEditTask} onSave={saveField} onCancel={cancelEditing} isSaving={updateTaskMutation.isPending}>
              <select value={currentForm.milestoneId} onChange={(event) => handleFieldChange('milestoneId', event.target.value)} className={inputClassName} autoFocus>
                <option value="">Chưa gán cột mốc</option>
                {milestones.map((milestone) => <option key={milestone.id} value={milestone.id}>{milestone.name}</option>)}
              </select>
            </EditableRow>

            <EditableRow label="Ban phụ trách" field="departmentId" value={task.departmentName || 'Chưa gán ban'} editingField={editingField} setEditingField={setEditingField} canEdit={canEditTask && !isSubtask} onSave={saveField} onCancel={cancelEditing} isSaving={updateTaskMutation.isPending}>
              <select value={currentForm.departmentId} onChange={(event) => handleFieldChange('departmentId', event.target.value)} className={inputClassName} autoFocus>
                <option value="">Chưa gán ban</option>
                {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
              </select>
            </EditableRow>

            <EditableRow label="Người phụ trách" field="assigneeId" value={task.assigneeName || 'Chưa phân công'} editingField={editingField} setEditingField={setEditingField} canEdit={canEditTask} onSave={saveField} onCancel={cancelEditing} isSaving={updateTaskMutation.isPending}>
              <select value={currentForm.assigneeId} onChange={(event) => handleFieldChange('assigneeId', event.target.value)} disabled={!currentForm.departmentId} className={inputClassName} autoFocus>
                <option value="">Chưa phân công</option>
                {assignableMembers.map((member) => <option key={member.userId} value={member.userId}>{member.name}</option>)}
              </select>
            </EditableRow>

            <EditableRow label="Trạng thái" field="status" value={<StatusBadge status={task.status} />} editingField={editingField} setEditingField={setEditingField} canEdit={canEditTask} onSave={saveField} onCancel={cancelEditing} isSaving={updateTaskMutation.isPending}>
              <select value={currentForm.status} onChange={(event) => handleFieldChange('status', event.target.value)} className={inputClassName} autoFocus>
                {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </EditableRow>

            <EditableRow label="Ưu tiên" field="priority" value={<PriorityBadge priority={task.priority} />} editingField={editingField} setEditingField={setEditingField} canEdit={canEditTask} onSave={saveField} onCancel={cancelEditing} isSaving={updateTaskMutation.isPending}>
              <select value={currentForm.priority} onChange={(event) => handleFieldChange('priority', event.target.value)} className={inputClassName} autoFocus>
                {PRIORITY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </EditableRow>

            <EditableRow label="Deadline" field="deadline" value={formatDate(task.deadline)} editingField={editingField} setEditingField={setEditingField} canEdit={canEditTask} onSave={saveField} onCancel={cancelEditing} isSaving={updateTaskMutation.isPending}>
              <input type="datetime-local" value={currentForm.deadline} onChange={(event) => handleFieldChange('deadline', event.target.value)} className={inputClassName} autoFocus />
            </EditableRow>

            <EditableRow label="Nhắc trước hạn" field="reminderOffsetHours" value={`${toReminderHours(task.reminderOffsetMinutes)} giờ`} editingField={editingField} setEditingField={setEditingField} canEdit={canEditTask} onSave={saveField} onCancel={cancelEditing} isSaving={updateTaskMutation.isPending}>
              <input type="number" min="0" max="8760" step="0.5" value={currentForm.reminderOffsetHours} onChange={(event) => handleFieldChange('reminderOffsetHours', event.target.value)} className={inputClassName} autoFocus />
            </EditableRow>
          </div>
        </div>
      </Panel>


      <Panel className="overflow-hidden p-0">
        <div className="grid divide-y divide-slate-100 md:grid-cols-3 md:divide-x md:divide-y-0">
          {!isSubtask && <TaskActionLink to={`/events/${eventId}/tasks/${taskId}/reports`} title="Báo cáo" />}
          <TaskActionLink to={`/events/${eventId}/tasks/${taskId}/attachments`} title="Tệp đính kèm" />
          <TaskActionLink to={`/events/${eventId}/tasks/${taskId}/reviews`} title="Review" />
        </div>
      </Panel>
    </div>
  );
};

const EditableRow = ({ label, field, value, multiline = false, editingField, setEditingField, canEdit, onSave, onCancel, isSaving, children }) => {
  const isEditing = editingField === field;

  if (isEditing) {
    return (
      <div className="grid gap-3 px-5 py-4 md:grid-cols-[220px_1fr] md:items-start">
        <div className="text-sm font-black text-slate-500">{label}</div>
        <div className="space-y-3">
          {children}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onSave} disabled={isSaving} className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-black text-white disabled:opacity-60">
              {isSaving ? 'Đang lưu...' : 'Lưu'}
            </button>
            <button type="button" onClick={onCancel} disabled={isSaving} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-600">
              Hủy
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        if (canEdit) {
          setEditingField(field);
        }
      }}
      disabled={!canEdit}
      className={`grid w-full gap-3 px-5 py-4 text-left md:grid-cols-[220px_1fr] ${canEdit ? 'transition hover:bg-sky-50/70' : ''}`}
    >
      <span className="text-sm font-black text-slate-500">{label}</span>
      <span className={`${multiline ? 'whitespace-pre-line' : ''} min-w-0 text-sm font-semibold leading-6 text-slate-800`}>
        {value || 'Không có dữ liệu'}
      </span>
    </button>
  );
};

const ReadonlyRow = ({ label, value }) => (
  <div className="grid gap-3 px-5 py-4 md:grid-cols-[220px_1fr]">
    <span className="text-sm font-black text-slate-500">{label}</span>
    <span className="min-w-0 text-sm font-semibold leading-6 text-slate-800">{value || 'Không có dữ liệu'}</span>
  </div>
);

const TaskActionLink = ({ to, title }) => (
  <Link to={to} className="flex min-h-14 items-center justify-between px-5 py-4 text-sm font-black text-slate-800 transition hover:bg-slate-50">
    <span>{title}</span>
    <span className="text-slate-400">Mở</span>
  </Link>
);


const inputClassName = 'min-h-11 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-4 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500';
const textareaClassName = 'min-h-24 w-full min-w-0 resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold leading-6 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-4 focus:ring-sky-100';

export default TaskDetailPage;