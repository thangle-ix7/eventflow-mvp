import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Bell,
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
import AiSuggestionDetailModal from '../components/AiSuggestionDetailModal';
import aiSuggestionApi from '../api/aiSuggestionApi';
import departmentApi from '../api/departmentApi';
import eventApi from '../api/eventApi';
import eventMemberApi from '../api/eventMemberApi';
import milestoneApi from '../api/milestoneApi';
import taskApi from '../api/taskApi';
import workloadApi from '../api/workloadApi';
import MilestoneCreateModal from '../components/MilestoneCreateModal';
import { invalidateDashboardQueries } from '../utils/dashboardQueryUtils';
import { stripHiddenSuggestionKeys } from '../utils/aiSuggestionUtils';

const pad = (value) => String(value).padStart(2, '0');

const toDateTimeLocalValue = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const normalizeSuggestedDeadline = (value) => (value ? toDateTimeLocalValue(value) || String(value).slice(0, 16) : '');

const workloadText = (workload) => {
  if (!workload) return '';
  return ` - ${workload.assignedTasks} task - ${workload.workloadStatus}`;
};

const TaskCreatePage = ({ user, onLogout }) => {
  const { eventId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const initialDepartmentId = searchParams.get('departmentId') || '';
  const isDepartmentLocked = Boolean(initialDepartmentId);

  const [form, setForm] = useState({
    title: '',
    description: '',
    departmentId: initialDepartmentId,
    assigneeId: '',
    milestoneId: '',
    deadline: '',
    reminderOffsetHours: 24,
    status: 'TODO',
    priority: 'MEDIUM',
    progressPercentage: 0,
  });

  const [suggestionInstruction, setSuggestionInstruction] = useState('');
  const [suggestedTasks, setSuggestedTasks] = useState([]);
  const [detailSuggestion, setDetailSuggestion] = useState(null);
  const [isMilestoneModalOpen, setIsMilestoneModalOpen] = useState(false);

  const eventQuery = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => eventApi.getEvent(eventId),
    enabled: Boolean(eventId),
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

  const departmentWorkloadQuery = useQuery({
    queryKey: ['departmentWorkload', eventId, form.departmentId],
    queryFn: () => workloadApi.getDepartmentWorkload({ eventId, departmentId: form.departmentId }),
    enabled: Boolean(eventId && form.departmentId),
  });

  const maxDeadline = toDateTimeLocalValue(eventQuery.data?.endTime || eventQuery.data?.startTime || eventQuery.data?.eventDate);

  const assignableMembers = useMemo(() => {
    if (!form.departmentId) {
      return [];
    }

    return (membersQuery.data || []).filter((member) => String(member.departmentId || '') === form.departmentId);
  }, [form.departmentId, membersQuery.data]);

  const workloadByMemberId = useMemo(() => {
    const members = departmentWorkloadQuery.data?.members || [];
    return members.reduce((map, member) => {
      map[String(member.memberId)] = member;
      return map;
    }, {});
  }, [departmentWorkloadQuery.data]);

  const selectedMemberWorkload = form.assigneeId
    ? workloadByMemberId[String(form.assigneeId)]
    : null;

  const mutation = useMutation({
    mutationFn: taskApi.createTask,
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: ['eventTaskPage', eventId] });
      queryClient.invalidateQueries({ queryKey: ['departmentWorkload', eventId, form.departmentId] });
      invalidateDashboardQueries(queryClient, eventId);
      navigate(`/events/${eventId}/tasks/${task.id}`, { replace: true });
    },
  });

  const suggestionMutation = useMutation({
    mutationFn: aiSuggestionApi.suggestTasks,
    onSuccess: (data) => {
      setSuggestedTasks(data?.tasks || []);
    },
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

  const handleSubmit = (event) => {
    event.preventDefault();
    mutation.mutate({
      eventId,
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
        progressPercentage: Number(form.progressPercentage),
      },
    });
  };

  const applySuggestion = (task) => {
    const departmentId = task.departmentId ? String(task.departmentId) : initialDepartmentId;
    setForm({
      title: task.title || '',
      description: task.description || '',
      departmentId,
      assigneeId: task.assigneeId ? String(task.assigneeId) : '',
      milestoneId: task.milestoneId ? String(task.milestoneId) : '',
      deadline: normalizeSuggestedDeadline(task.deadline),
      reminderOffsetHours: 24,
      status: task.status || 'TODO',
      priority: task.priority || 'MEDIUM',
      progressPercentage: task.progressPercentage ?? 0,
    });
  };

  const handleSuggestTasks = () => {
    suggestionMutation.mutate({
      eventId,
      instruction: suggestionInstruction,
      count: 5,
    });
  };

  const handleMilestoneCreated = (milestone) => {
    setForm((old) => ({ ...old, milestoneId: String(milestone.id) }));
    setIsMilestoneModalOpen(false);
  };

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
                  Tạo task mới
                </h2>

  
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
                  maxLength={255}
                  className={inputClassName}
                  placeholder="Tên công việc"
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
                  placeholder="Mô tả"
                />
              </Field>

              <Field
                label="Cột mốc"
                icon={<Flag className="h-4 w-4" strokeWidth={1.8} />}
                hint="Không bắt buộc. Gắn công việc vào cột mốc để tổng quan tính tiến độ theo từng chặng."
              >
                <div className="flex flex-col gap-2 sm:flex-row">
                  <select
                    name="milestoneId"
                    value={form.milestoneId}
                    onChange={handleChange}
                    className={inputClassName}
                  >
                    <option value="">Chưa gán cột mốc</option>
                    {milestonesQuery.data?.map((milestone) => (
                      <option key={milestone.id} value={milestone.id}>
                        {milestone.name}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => setIsMilestoneModalOpen(true)}
                    className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-2xl border border-sky-100 bg-white px-4 py-2 text-sm font-black text-sky-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-sky-50 hover:shadow-lg hover:shadow-sky-100"
                  >
                    <Plus size={16} />
                    Tạo cột mốc
                  </button>
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
                  hint={isDepartmentLocked ? 'Ban đã được khóa theo URL hiện tại.' : ''}
                >
                  <select
                    name="departmentId"
                    value={form.departmentId}
                    onChange={handleChange}
                    disabled={isDepartmentLocked}
                    className={inputClassName}
                  >
                    <option value="">Chưa gán ban</option>
                    {departmentsQuery.data?.map((department) => (
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
                          {member.name} ({member.role}){workloadText(workload)}
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

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Hạn"
                  icon={<CalendarDays className="h-4 w-4" strokeWidth={1.8} />}
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

                <Field
                  label="Cảnh báo vàng trước hạn (giờ)"
                  icon={<Bell className="h-4 w-4" strokeWidth={1.8} />}
                >
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
              </div>

              <div className="grid gap-4 sm:grid-cols-2">

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
              </div>

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
                Tạo công việc
              </button>
            </div>
          </form>

          <aside className="space-y-5">
            <section className="relative overflow-hidden rounded-[2rem] border border-sky-100 bg-white p-5 shadow-xl shadow-sky-100/70">
              <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-sky-100 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-emerald-100/70 blur-3xl" />

              <div className="relative flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-emerald-400 text-white shadow-lg shadow-cyan-100">
                  <Sparkles size={22} strokeWidth={1.8} />
                </div>

                <div>
                  <h3 className="text-lg font-black text-slate-950">
                    AI gợi ý công việc
                  </h3>

                </div>
              </div>

              <div className="relative mt-4 flex flex-col gap-2">
                <input
                  value={suggestionInstruction}
                  onChange={(event) => setSuggestionInstruction(event.target.value)}
                  className={inputClassName}
                  placeholder="Bối cảnh AI"
                />

                <button
                  type="button"
                  onClick={handleSuggestTasks}
                  disabled={suggestionMutation.isPending}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-sky-100 bg-white px-4 py-2 text-sm font-black text-sky-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-sky-50 hover:shadow-lg hover:shadow-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {suggestionMutation.isPending ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Sparkles size={16} />
                  )}
                  Gợi ý công việc
                </button>
              </div>

              {suggestionMutation.error && (
                <div className="relative mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
                  {suggestionMutation.error.userMessage || suggestionMutation.error.message}
                </div>
              )}

              {suggestedTasks.length > 0 && (
                <div className="relative mt-4 space-y-3">
                  <div className="overflow-x-auto rounded-2xl border border-sky-100 bg-white">
                    <table className="w-full min-w-[780px] border-collapse text-left text-sm">
                      <thead className="bg-sky-50/70 text-xs font-black uppercase tracking-[0.08em] text-slate-500">
                        <tr>
                          <th className="px-3 py-3">Công việc</th>
                          <th className="px-3 py-3">Hạn</th>
                          <th className="px-3 py-3">Ưu tiên</th>
                          <th className="px-3 py-3">Mô tả</th>
                          <th className="w-32 px-3 py-3 text-right">Áp dụng</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-sky-50">
                        {suggestedTasks.map((task, index) => (
                          <tr
                            key={`${task.title}-${index}`}
                            role="button"
                            tabIndex={0}
                            onClick={() => setDetailSuggestion({ ...task, __suggestionIndex: index })}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                setDetailSuggestion({ ...task, __suggestionIndex: index });
                              }
                            }}
                            className="cursor-pointer bg-white transition hover:bg-sky-50/70"
                          >
                            <td className="px-3 py-3 align-top">
                              <p className="font-black text-slate-950">{task.title}</p>

                            </td>
                            <td className="px-3 py-3 align-top font-semibold text-slate-600">
                              {normalizeSuggestedDeadline(task.deadline) || 'Chưa có'}
                            </td>
                            <td className="px-3 py-3 align-top">
                              <span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-black text-sky-700">
                                {task.priority || 'MEDIUM'}
                              </span>
                            </td>
                            <td className="px-3 py-3 align-top">
                              <p className="line-clamp-2 font-semibold leading-6 text-slate-600">
                                {task.description || 'Không có mô tả'}
                              </p>
                            </td>
                            <td className="px-3 py-3 text-right align-top">
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  applySuggestion(task);
                                }}
                                className="inline-flex min-h-9 items-center justify-center rounded-xl border border-sky-100 bg-sky-50 px-3 py-1.5 text-xs font-black text-sky-700 transition hover:bg-sky-100"
                              >
                                Dùng
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>
          </aside>
        </div>
      </div>

      <MilestoneCreateModal
        eventId={eventId}
        isOpen={isMilestoneModalOpen}
        onCancel={() => setIsMilestoneModalOpen(false)}
        onCreated={handleMilestoneCreated}
      />
      <AiSuggestionDetailModal
        isOpen={Boolean(detailSuggestion)}
        title={detailSuggestion?.title || 'Chi tiết công việc gợi ý'}
        suggestion={detailSuggestion}
        onSave={(updatedSuggestion) => {
          const cleaned = stripHiddenSuggestionKeys(updatedSuggestion);
          setSuggestedTasks((old) => old.map((task, index) => (
            index === detailSuggestion.__suggestionIndex ? cleaned : task
          )));
        }}
        onClose={() => setDetailSuggestion(null)}
      />
    </AppLayout>
  );
};

const Field = ({ label, children }) => (
  <label className="block">
    <span className="text-sm font-black text-slate-700">{label}</span>
    <div className="mt-2">{children}</div>
  </label>
);

const inputClassName = 'min-h-11 w-full min-w-0 rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-cyan-300 focus:bg-white focus:ring-4 focus:ring-cyan-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500';

export default TaskCreatePage;

