import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Plus, Save, Sparkles, X } from 'lucide-react';
import aiSuggestionApi from '../api/aiSuggestionApi';
import eventMemberApi from '../api/eventMemberApi';
import taskApi from '../api/taskApi';
import { ErrorState } from './ui';
import { invalidateDashboardQueries } from '../utils/dashboardQueryUtils';

const pad = (value) => String(value).padStart(2, '0');

const toDateTimeLocalValue = (value) => {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const createEmptyRow = (departmentId = '', assigneeId = '') => ({
  id: crypto.randomUUID(),
  title: '',
  description: '',
  departmentId: departmentId ? String(departmentId) : '',
  assigneeId: assigneeId ? String(assigneeId) : '',
  deadline: '',
  status: 'TODO',
  priority: 'MEDIUM',
});

const normalizeSuggestedDeadline = (value) => (value ? toDateTimeLocalValue(value) || String(value).slice(0, 16) : '');

const InlineTaskCreator = ({
  eventId,
  parentTaskId,
  event,
  departments = [],
  departmentId = '',
  assigneeId = '',
  lockedDepartment = false,
  lockedAssignee = false,
  invalidateKeys = [],
  title = 'Thêm task theo danh sách',
  saveLabel = 'Save',
  openLabel,
}) => {
  const queryClient = useQueryClient();
  const defaultDeadline = useMemo(
    () => toDateTimeLocalValue(event?.startTime || event?.eventDate),
    [event?.eventDate, event?.startTime]
  );
  const maxDeadline = useMemo(
    () => toDateTimeLocalValue(event?.endTime || event?.startTime || event?.eventDate),
    [event?.endTime, event?.eventDate, event?.startTime]
  );
  const [rows, setRows] = useState([createEmptyRow(departmentId, assigneeId)]);
  const [localError, setLocalError] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [suggestionInstruction, setSuggestionInstruction] = useState('');
  const addButtonLabel = openLabel || (parentTaskId ? 'Thêm subtask' : 'Thêm task');
  const membersQuery = useQuery({
    queryKey: ['eventMembers', eventId],
    queryFn: () => eventMemberApi.getMembers(eventId),
    enabled: Boolean(eventId),
  });

  const mutation = useMutation({
    mutationFn: async (payloads) => Promise.all(payloads.map((payload) => (
      parentTaskId
        ? taskApi.createSubtask({ taskId: parentTaskId, payload })
        : taskApi.createTask({ eventId, payload })
    ))),
    onSuccess: () => {
      setRows([createEmptyRow(departmentId, assigneeId)]);
      setLocalError('');
      setIsOpen(false);
      invalidateKeys.forEach((queryKey) => {
        queryClient.invalidateQueries({ queryKey });
      });
      queryClient.invalidateQueries({ queryKey: ['eventTaskPage', eventId] });
      queryClient.invalidateQueries({ queryKey: ['eventTasks', eventId] });
      if (parentTaskId) {
        queryClient.invalidateQueries({ queryKey: ['subtasks', String(parentTaskId)] });
      }
      invalidateDashboardQueries(queryClient, eventId);
    },
  });

  const suggestionMutation = useMutation({
    mutationFn: parentTaskId ? aiSuggestionApi.suggestSubtasks : aiSuggestionApi.suggestTasks,
    onSuccess: (data) => {
      const suggestedItems = parentTaskId ? data?.subtasks : data?.tasks;
      if (!suggestedItems?.length) {
        setLocalError('AI chưa trả về gợi ý phù hợp.');
        return;
      }

      setLocalError('');
      setRows(suggestedItems.map((task) => ({
        id: crypto.randomUUID(),
        title: task.title || '',
        description: task.description || '',
        departmentId: task.departmentId ? String(task.departmentId) : String(departmentId || ''),
        assigneeId: task.assigneeId ? String(task.assigneeId) : String(assigneeId || ''),
        deadline: normalizeSuggestedDeadline(task.deadline),
        status: task.status || 'TODO',
        priority: task.priority || 'MEDIUM',
      })));
    },
  });

  const getEffectiveDepartmentId = (row) => (lockedDepartment ? String(departmentId || '') : row.departmentId);
  const getEffectiveAssigneeId = (row) => (lockedAssignee ? String(assigneeId || '') : row.assigneeId);

  const getAssignableMembers = (row) => {
    const effectiveDepartmentId = getEffectiveDepartmentId(row);
    if (!effectiveDepartmentId) {
      return [];
    }

    return (membersQuery.data || []).filter((member) => String(member.departmentId || '') === effectiveDepartmentId);
  };

  const updateRow = (rowId, name, value) => {
    setLocalError('');
    setRows((old) => old.map((row) => {
      if (row.id !== rowId) {
        return row;
      }

      return {
        ...row,
        [name]: value,
        ...(name === 'departmentId' ? { assigneeId: lockedAssignee ? String(assigneeId || '') : '' } : {}),
      };
    }));
  };

  const addRow = () => {
    setRows((old) => [...old, createEmptyRow(departmentId, assigneeId)]);
  };

  const removeRow = (rowId) => {
    setRows((old) => (
      old.length === 1
        ? [createEmptyRow(departmentId, assigneeId)]
        : old.filter((row) => row.id !== rowId)
    ));
  };

  const handleClose = () => {
    setRows([createEmptyRow(departmentId, assigneeId)]);
    setLocalError('');
    setIsOpen(false);
  };

  const handleSave = () => {
    const filledRows = rows.filter((row) => row.title.trim());
    if (filledRows.length === 0) {
      setLocalError('Cần nhập ít nhất một tên task trước khi lưu.');
      return;
    }

    const invalidDeadlineRow = filledRows.find((row) => {
      const deadline = row.deadline || defaultDeadline;
      return maxDeadline && deadline && deadline > maxDeadline;
    });
    if (invalidDeadlineRow) {
      setLocalError('Deadline task chỉ được nằm trước hoặc trong thời gian sự kiện.');
      return;
    }

    mutation.mutate(filledRows.map((row) => {
      const effectiveDepartmentId = getEffectiveDepartmentId(row);
      const effectiveAssigneeId = getEffectiveAssigneeId(row);

      return {
        title: row.title.trim(),
        description: row.description,
        departmentId: effectiveDepartmentId ? Number(effectiveDepartmentId) : null,
        assigneeId: effectiveAssigneeId ? Number(effectiveAssigneeId) : null,
        status: row.status,
        priority: row.priority,
        deadline: row.deadline || defaultDeadline,
        progressPercentage: 0,
      };
    }));
  };

  const handleSuggestTasks = () => {
    setLocalError('');
    if (parentTaskId) {
      suggestionMutation.mutate({
        taskId: parentTaskId,
        instruction: suggestionInstruction,
        count: 5,
      });
      return;
    }

    suggestionMutation.mutate({
      eventId,
      instruction: suggestionInstruction,
      count: 5,
    });
  };

  if (!isOpen) {
    return (
      <div className="border-b border-slate-100 bg-white px-4 py-3">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-100"
        >
          <Plus size={16} />
          {addButtonLabel}
        </button>
      </div>
    );
  }

  return (
    <div className="border-b border-slate-100 bg-indigo-50/30">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-100 px-4 py-3">
        <p className="text-sm font-bold text-slate-900">{title}</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={addRow}
            disabled={mutation.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 disabled:opacity-60"
          >
            <Plus size={16} />
            Thêm dòng
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={mutation.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {mutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saveLabel}
          </button>
          <button
            type="button"
            onClick={handleClose}
            disabled={mutation.isPending}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-white hover:text-slate-700 disabled:opacity-60"
            aria-label="Đóng form thêm task"
          >
            <X size={16} />
          </button>
        </div>
      </div>
      <div className="grid gap-2 border-b border-indigo-100 px-4 py-3 sm:grid-cols-[1fr_auto]">
        <input
          value={suggestionInstruction}
          onChange={(event) => setSuggestionInstruction(event.target.value)}
          disabled={suggestionMutation.isPending || mutation.isPending}
          className="min-w-0 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500"
          placeholder={parentTaskId ? 'Nhập yêu cầu để AI chia subtask...' : 'Nhập yêu cầu để AI gợi ý task...'}
        />
        <button
          type="button"
          onClick={handleSuggestTasks}
          disabled={suggestionMutation.isPending || mutation.isPending}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 disabled:opacity-60"
        >
          {suggestionMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          AI gợi ý
        </button>
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[980px]">
          <div className={taskCreatorGridHeaderClassName}>
            <span>#</span>
            <span>Tên task</span>
            <span>Mô tả</span>
            <span>Ban</span>
            <span>Phụ trách</span>
            <span>Deadline</span>
            <span>Ưu tiên</span>
            <span>Trạng thái</span>
            <span></span>
          </div>
          {rows.map((row, index) => {
            const effectiveDepartmentId = getEffectiveDepartmentId(row);
            const effectiveAssigneeId = getEffectiveAssigneeId(row);
            const assignableMembers = getAssignableMembers(row);

            return (
              <div
                key={row.id}
                className={taskCreatorGridRowClassName}
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 text-xs font-extrabold text-indigo-700">
                  {index + 1}
                </span>
                <input
                  value={row.title}
                  onChange={(event) => updateRow(row.id, 'title', event.target.value)}
                  disabled={mutation.isPending}
                  maxLength={255}
                  placeholder="Tên task"
                  aria-label="Tên task"
                  className={taskInputClassName}
                />
                <input
                  value={row.description}
                  onChange={(event) => updateRow(row.id, 'description', event.target.value)}
                  disabled={mutation.isPending}
                  maxLength={2000}
                  placeholder="Ghi chú"
                  aria-label="Mô tả"
                  className={taskInputClassName}
                />
                <select
                  value={effectiveDepartmentId}
                  onChange={(event) => updateRow(row.id, 'departmentId', event.target.value)}
                  disabled={lockedDepartment || mutation.isPending}
                  aria-label="Ban"
                  className={taskInputClassName}
                >
                  <option value="">Chưa gán ban</option>
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </select>
                <select
                  value={effectiveAssigneeId}
                  onChange={(event) => updateRow(row.id, 'assigneeId', event.target.value)}
                  disabled={!effectiveDepartmentId || lockedAssignee || mutation.isPending}
                  aria-label="Phụ trách"
                  className={taskInputClassName}
                >
                  <option value="">Chưa phân công</option>
                  {assignableMembers.map((member) => (
                    <option key={member.userId} value={member.userId}>
                      {member.name}
                    </option>
                  ))}
                </select>
                <input
                  type="datetime-local"
                  value={row.deadline || defaultDeadline}
                  onChange={(event) => updateRow(row.id, 'deadline', event.target.value)}
                  max={maxDeadline || undefined}
                  disabled={mutation.isPending}
                  aria-label="Deadline"
                  className={taskInputClassName}
                />
                <select
                  value={row.priority}
                  onChange={(event) => updateRow(row.id, 'priority', event.target.value)}
                  disabled={mutation.isPending}
                  aria-label="Ưu tiên"
                  className={taskInputClassName}
                >
                  <option value="LOW">Thấp</option>
                  <option value="MEDIUM">Trung bình</option>
                  <option value="HIGH">Cao</option>
                  <option value="URGENT">Khẩn cấp</option>
                </select>
                <select
                  value={row.status}
                  onChange={(event) => updateRow(row.id, 'status', event.target.value)}
                  disabled={mutation.isPending}
                  aria-label="Trạng thái"
                  className={taskInputClassName}
                >
                  <option value="TODO">Cần làm</option>
                  <option value="IN_PROGRESS">Đang làm</option>
                  <option value="IN_REVIEW">Chờ duyệt</option>
                  <option value="DONE">Hoàn thành</option>
                </select>
                <button
                  type="button"
                  onClick={() => removeRow(row.id)}
                  disabled={mutation.isPending}
                  className="inline-flex h-10 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-60"
                  aria-label="Xóa dòng task"
                >
                  <X size={16} />
                </button>
              </div>
            );
          })}
        </div>
      </div>
      {(localError || mutation.error) && (
        <div className="px-4 pb-3 pt-2">
          <ErrorState error={localError || mutation.error} title="Không tạo được công việc" />
        </div>
      )}
    </div>
  );
};

const taskCreatorGridColumns = 'grid-cols-[28px_minmax(150px,1.35fr)_minmax(100px,0.8fr)_110px_120px_180px_112px_104px_28px]';
const taskCreatorGridHeaderClassName = `grid min-w-[980px] ${taskCreatorGridColumns} items-center gap-1 border-b border-indigo-100 px-2 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-500`;
const taskCreatorGridRowClassName = `grid min-w-[980px] ${taskCreatorGridColumns} items-center gap-1 border-b border-indigo-100/70 px-2 py-3 last:border-b-0`;
const taskInputClassName = 'h-10 w-full min-w-0 rounded-lg border border-indigo-200 bg-white px-2 text-xs text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50 disabled:text-slate-500';

export default InlineTaskCreator;
