import { useCallback, useMemo, useState } from 'react';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Plus, Save, Sparkles, X } from 'lucide-react';
import aiSuggestionApi from '../api/aiSuggestionApi';
import AiSuggestionDetailModal from './AiSuggestionDetailModal';
import eventMemberApi from '../api/eventMemberApi';
import taskApi from '../api/taskApi';
import workloadApi from '../api/workloadApi';
import { ErrorState } from './ui';
import { invalidateDashboardQueries } from '../utils/dashboardQueryUtils';
import { stripHiddenSuggestionKeys } from '../utils/aiSuggestionUtils';

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

const createEmptyRow = (departmentId = '', assigneeId = '', status = 'TODO') => ({
  id: crypto.randomUUID(),
  title: '',
  description: '',
  departmentId: departmentId ? String(departmentId) : '',
  assigneeId: assigneeId ? String(assigneeId) : '',
  deadline: '',
  status,
  priority: 'MEDIUM',
});

const normalizeSuggestedDeadline = (value) => (value ? toDateTimeLocalValue(value) || String(value).slice(0, 16) : '');

const workloadText = (workload) => {
  if (!workload) {
    return '';
  }

  return ` - ${workload.assignedTasks} công việc - ${workload.workloadStatus}`;
};

const workloadHintClassName = (status) => {
  if (status === 'OVERLOADED') {
    return 'text-red-600';
  }

  if (status === 'HIGH') {
    return 'text-amber-600';
  }

  return 'text-slate-500';
};

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
  initialStatus = 'TODO',
  defaultOpen = false,
  title = 'Thêm công việc theo danh sách',
  saveLabel = 'Lưu',
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
  const [rows, setRows] = useState([createEmptyRow(departmentId, assigneeId, initialStatus)]);
  const [localError, setLocalError] = useState('');
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [suggestionInstruction, setSuggestionInstruction] = useState('');
  const [detailSuggestion, setDetailSuggestion] = useState(null);
  const addButtonLabel = openLabel || (parentTaskId ? 'Thêm việc con' : 'Thêm công việc');

  const membersQuery = useQuery({
    queryKey: ['eventMembers', eventId],
    queryFn: () => eventMemberApi.getMembers(eventId),
    enabled: Boolean(eventId),
  });

  const getEffectiveDepartmentId = useCallback(
    (row) => (lockedDepartment ? String(departmentId || '') : row.departmentId),
    [lockedDepartment, departmentId]
  );

  const getEffectiveAssigneeId = useCallback(
    (row) => (lockedAssignee ? String(assigneeId || '') : row.assigneeId),
    [lockedAssignee, assigneeId]
  );

  /*
   * Lấy danh sách departmentId đang được dùng trong các dòng.
   * Vì mỗi dòng có thể chọn một ban khác nhau, workload phải query theo từng ban.
   */
  const selectedDepartmentIds = useMemo(() => {
    const ids = rows
      .map((row) => getEffectiveDepartmentId(row))
      .filter(Boolean);

    return [...new Set(ids)];
  }, [rows, getEffectiveDepartmentId]);

  /*
   * Query workload cho từng department đang được chọn.
   * Không dùng query khối lượng việc từ trang danh sách công việc vì khi lọc là "Tất cả ban",
   * mỗi dòng vẫn có thể chọn department riêng.
   */
  const departmentWorkloadQueries = useQueries({
    queries: selectedDepartmentIds.map((selectedDepartmentId) => ({
      queryKey: ['departmentWorkload', eventId, selectedDepartmentId],
      queryFn: () => workloadApi.getDepartmentWorkload({
        eventId,
        departmentId: selectedDepartmentId,
      }),
      enabled: Boolean(eventId && selectedDepartmentId),
    })),
  });

  /*
   * Map workload theo departmentId:
   * {
   *   "9101": departmentWorkloadResponse
   * }
   */
  const workloadByDepartmentId = useMemo(() => {
    return selectedDepartmentIds.reduce((map, selectedDepartmentId, index) => {
      const data = departmentWorkloadQueries[index]?.data;
      if (data) {
        map[String(selectedDepartmentId)] = data;
      }
      return map;
    }, {});
  }, [selectedDepartmentIds, departmentWorkloadQueries]);

  const getDepartmentWorkload = (departmentIdValue) => {
    if (!departmentIdValue) {
      return null;
    }

    return workloadByDepartmentId[String(departmentIdValue)] || null;
  };

  const getMemberWorkload = (departmentIdValue, memberId) => {
    const departmentWorkload = getDepartmentWorkload(departmentIdValue);
    const workloadMembers = departmentWorkload?.members || [];

    return workloadMembers.find((member) => String(member.memberId) === String(memberId)) || null;
  };

  const isDepartmentWorkloadLoading = (departmentIdValue) => {
    if (!departmentIdValue) {
      return false;
    }

    const index = selectedDepartmentIds.findIndex((id) => String(id) === String(departmentIdValue));
    return departmentWorkloadQueries[index]?.isLoading || false;
  };

  const getAssignableMembers = (row) => {
    const effectiveDepartmentId = getEffectiveDepartmentId(row);
    if (!effectiveDepartmentId) {
      return [];
    }

    return (membersQuery.data || []).filter((member) => String(member.departmentId || '') === effectiveDepartmentId);
  };

  const mutation = useMutation({
    mutationFn: async (payloads) => Promise.all(payloads.map((payload) => (
      parentTaskId
        ? taskApi.createSubtask({ taskId: parentTaskId, payload })
        : taskApi.createTask({ eventId, payload })
    ))),
    onSuccess: () => {
      setRows([createEmptyRow(departmentId, assigneeId, initialStatus)]);
      setLocalError('');
      setIsOpen(false);
      invalidateKeys.forEach((queryKey) => {
        queryClient.invalidateQueries({ queryKey });
      });
      queryClient.invalidateQueries({ queryKey: ['eventTaskPage', eventId] });
      queryClient.invalidateQueries({ queryKey: ['eventTasks', eventId] });
      selectedDepartmentIds.forEach((selectedDepartmentId) => {
        queryClient.invalidateQueries({ queryKey: ['departmentWorkload', eventId, selectedDepartmentId] });
      });
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
        status: task.status || initialStatus,
        priority: task.priority || 'MEDIUM',
        aiSuggestion: task,
      })));
    },
  });

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
    setRows((old) => [...old, createEmptyRow(departmentId, assigneeId, initialStatus)]);
  };

  const removeRow = (rowId) => {
    setRows((old) => (
      old.length === 1
        ? [createEmptyRow(departmentId, assigneeId, initialStatus)]
        : old.filter((row) => row.id !== rowId)
    ));
  };

  const handleClose = () => {
    setRows([createEmptyRow(departmentId, assigneeId, initialStatus)]);
    setLocalError('');
    setIsOpen(false);
  };

  const handleSave = () => {
    const filledRows = rows.filter((row) => row.title.trim());
    if (filledRows.length === 0) {
      setLocalError('Cần nhập ít nhất một tên công việc trước khi lưu.');
      return;
    }

    const invalidDeadlineRow = filledRows.find((row) => {
      const deadline = row.deadline || defaultDeadline;
      return maxDeadline && deadline && deadline > maxDeadline;
    });
    if (invalidDeadlineRow) {
      setLocalError('Hạn công việc chỉ được nằm trước hoặc trong thời gian sự kiện.');
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

  return (
    <>
      <div className="border-b border-sky-100 bg-gradient-to-r from-white via-sky-50/60 to-emerald-50/60 px-4 py-4">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="group inline-flex items-center gap-2 rounded-2xl border border-sky-100 bg-white px-4 py-2.5 text-sm font-black text-sky-600 shadow-sm shadow-sky-100 transition hover:-translate-y-0.5 hover:border-cyan-200 hover:bg-sky-50 hover:text-sky-700 hover:shadow-lg hover:shadow-cyan-100 active:translate-y-px"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-emerald-400 text-white shadow-md shadow-cyan-100">
            <Plus size={16} />
          </span>
          {addButtonLabel}
        </button>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm sm:p-5">
          <div className="flex max-h-[92vh] w-full max-w-[1500px] flex-col overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-2xl shadow-slate-950/20">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sky-100 bg-white px-5 py-4">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-600">
                  Nhập theo dòng
                </p>
                <h3 className="mt-1 text-xl font-black text-slate-950">{title}</h3>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={addRow}
                  disabled={mutation.isPending}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-sky-100 bg-white px-3 py-2 text-sm font-black text-sky-600 shadow-sm transition hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Plus size={16} />
                  Thêm dòng
                </button>

                <button
                  type="button"
                  onClick={handleClose}
                  disabled={mutation.isPending}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label="Đóng form thêm công việc"
                >
                  <X size={17} />
                </button>
              </div>
            </div>

            <div className="grid shrink-0 gap-3 border-b border-sky-100 bg-sky-50/40 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_auto]">
              <div className="relative">
                <Sparkles
                  size={16}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sky-500"
                />
                <input
                  value={suggestionInstruction}
                  onChange={(event) => setSuggestionInstruction(event.target.value)}
                  disabled={suggestionMutation.isPending || mutation.isPending}
                  className="min-h-11 w-full min-w-0 rounded-xl border border-sky-100 bg-white px-10 py-2.5 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100 disabled:bg-slate-50 disabled:text-slate-500"
                  placeholder="Bối cảnh cho AI, ví dụ: sự kiện âm nhạc 200 người, cần chia việc hậu cần..."
                />
              </div>

              <button
                type="button"
                onClick={handleSuggestTasks}
                disabled={suggestionMutation.isPending || mutation.isPending}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-sky-100 bg-white px-4 py-2.5 text-sm font-black text-sky-600 shadow-sm transition hover:bg-sky-50 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {suggestionMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                AI gợi ý
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-auto bg-gradient-to-br from-white via-sky-50/25 to-emerald-50/30">
              <div className="min-w-[1400px]">
                <div className={taskCreatorGridHeaderClassName}>
                  <span>#</span>
                  <span>Tên công việc</span>
                  <span>Mô tả</span>
                  <span>Ban</span>
                  <span>Phụ trách</span>
                  <span>Hạn</span>
                  <span>Ưu tiên</span>
                  <span>Trạng thái</span>
                  <span></span>
                </div>

                {rows.map((row, index) => {
                  const effectiveDepartmentId = getEffectiveDepartmentId(row);
                  const effectiveAssigneeId = getEffectiveAssigneeId(row);
                  const assignableMembers = getAssignableMembers(row);
                  const selectedWorkload = effectiveAssigneeId
                    ? getMemberWorkload(effectiveDepartmentId, effectiveAssigneeId)
                    : null;
                  const isWorkloadLoading = isDepartmentWorkloadLoading(effectiveDepartmentId);

                  return (
                    <div
                      key={row.id}
                      className={taskCreatorGridRowClassName}
                    >
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-emerald-400 text-xs font-black text-white shadow-md shadow-cyan-100">
                        {index + 1}
                      </span>

                      <input
                        value={row.title}
                        onChange={(event) => updateRow(row.id, 'title', event.target.value)}
                        disabled={mutation.isPending}
                        maxLength={255}
                        placeholder="Tên công việc"
                        aria-label="Tên công việc"
                        className={taskInputClassName}
                      />

                      <textarea
                        value={row.description}
                        onChange={(event) => updateRow(row.id, 'description', event.target.value)}
                        disabled={mutation.isPending}
                        maxLength={2000}
                        placeholder="Ghi chú"
                        aria-label="Mô tả"
                        rows={1}
                        className={`${taskInputClassName} min-h-10 resize-y py-2 leading-5`}
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

                      <div className="min-w-0">
                        <select
                          value={effectiveAssigneeId}
                          onChange={(event) => updateRow(row.id, 'assigneeId', event.target.value)}
                          disabled={!effectiveDepartmentId || lockedAssignee || mutation.isPending}
                          aria-label="Phụ trách"
                          className={taskInputClassName}
                        >
                          <option value="">Chưa phân công</option>
                          {assignableMembers.map((member) => {
                            const workload = getMemberWorkload(effectiveDepartmentId, member.userId);

                            return (
                              <option key={member.userId} value={member.userId}>
                                {member.name}{workloadText(workload)}
                              </option>
                            );
                          })}
                        </select>

                        {isWorkloadLoading && (
                          <p className="mt-1 truncate text-[10px] font-bold text-slate-500">
                            Đang tải khối lượng...
                          </p>
                        )}

                        {selectedWorkload && (
                          <p className={`mt-1 truncate text-[10px] font-black ${workloadHintClassName(selectedWorkload.workloadStatus)}`}>
                            {selectedWorkload.assignedTasks} công việc · {selectedWorkload.workloadScore}% · {selectedWorkload.workloadStatus}
                          </p>
                        )}
                      </div>

                      <input
                        type="datetime-local"
                        value={row.deadline || defaultDeadline}
                        onChange={(event) => updateRow(row.id, 'deadline', event.target.value)}
                        max={maxDeadline || undefined}
                        disabled={mutation.isPending}
                        aria-label="Hạn"
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

                      <div className="flex items-center gap-1">
                        {row.aiSuggestion && (
                          <button
                            type="button"
                            onClick={() => setDetailSuggestion({ ...row.aiSuggestion, __rowId: row.id })}
                            disabled={mutation.isPending}
                            className="inline-flex h-10 w-9 items-center justify-center rounded-xl text-sky-500 transition hover:bg-sky-50 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
                            aria-label="Xem chi tiết gợi ý AI"
                          >
                            <Sparkles size={15} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => removeRow(row.id)}
                          disabled={mutation.isPending}
                          className="inline-flex h-10 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                          aria-label="Xóa dòng công việc"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {(localError || mutation.error) && (
              <div className="shrink-0 border-t border-red-100 bg-red-50/80 px-5 py-3">
                <ErrorState error={localError || mutation.error} title="Không tạo được công việc" />
              </div>
            )}

            <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-sky-100 bg-white px-5 py-4">
              <p className="text-sm font-black text-slate-500">
                {rows.length} dòng đang nhập
              </p>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={addRow}
                  disabled={mutation.isPending}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-sky-100 bg-white px-3 py-2 text-sm font-black text-sky-600 shadow-sm transition hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Plus size={16} />
                  Thêm dòng
                </button>

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={mutation.isPending}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400 px-4 py-2 text-sm font-black text-white shadow-lg shadow-cyan-100 transition hover:shadow-xl hover:shadow-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {mutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {saveLabel}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <AiSuggestionDetailModal
        isOpen={Boolean(detailSuggestion)}
        title={detailSuggestion?.title || 'Chi tiết gợi ý AI'}
        suggestion={detailSuggestion}
        onSave={(updatedSuggestion) => {
          const cleaned = stripHiddenSuggestionKeys(updatedSuggestion);
          setRows((old) => old.map((row) => (
            row.id === detailSuggestion.__rowId
              ? {
                ...row,
                title: cleaned.title || '',
                description: cleaned.description || '',
                departmentId: cleaned.departmentId ? String(cleaned.departmentId) : row.departmentId,
                assigneeId: cleaned.assigneeId ? String(cleaned.assigneeId) : row.assigneeId,
                deadline: normalizeSuggestedDeadline(cleaned.deadline) || row.deadline,
                status: cleaned.status || row.status,
                priority: cleaned.priority || row.priority,
                aiSuggestion: cleaned,
              }
              : row
          )));
        }}
        onClose={() => setDetailSuggestion(null)}
      />
    </>
  );
};

const taskCreatorGridColumns = 'grid-cols-[36px_minmax(220px,1.05fr)_minmax(280px,1.25fr)_170px_250px_190px_120px_118px_82px]';
const taskCreatorGridHeaderClassName = `grid min-w-[1400px] ${taskCreatorGridColumns} items-center gap-2 border-b border-sky-100 bg-sky-50/80 px-5 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500`;
const taskCreatorGridRowClassName = `grid min-w-[1400px] ${taskCreatorGridColumns} items-start gap-2 border-b border-sky-100/70 bg-white/80 px-5 py-3 transition hover:bg-sky-50/70 last:border-b-0`;
const taskInputClassName = 'h-10 w-full min-w-0 rounded-xl border border-sky-100 bg-white px-3 text-xs font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100 disabled:bg-slate-50 disabled:text-slate-500';

export default InlineTaskCreator;
