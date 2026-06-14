import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  CalendarDays,
  ClipboardList,
  FileText,
  Layers3,
  Loader2,
  Save,
  Sparkles,
  TrendingUp,
  UserRound,
  Users,
} from 'lucide-react';
import AppLayout from '../components/AppLayout';
import aiSuggestionApi from '../api/aiSuggestionApi';
import departmentApi from '../api/departmentApi';
import eventApi from '../api/eventApi';
import eventMemberApi from '../api/eventMemberApi';
import taskApi from '../api/taskApi';
import workloadApi from '../api/workloadApi';
import { invalidateDashboardQueries } from '../utils/dashboardQueryUtils';

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
    deadline: '',
    status: 'TODO',
    priority: 'MEDIUM',
    progressPercentage: 0,
  });

  const [suggestionInstruction, setSuggestionInstruction] = useState('');

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
        deadline: form.deadline,
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
      deadline: normalizeSuggestedDeadline(task.deadline),
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

  return (
    <AppLayout
      user={user}
      events={eventQuery.data ? [eventQuery.data] : []}
      selectedEvent={eventQuery.data}
      onEventChange={() => {}}
      onLogout={onLogout}
    >
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="relative overflow-hidden rounded-[2rem] border border-sky-100 bg-white/85 p-6 shadow-xl shadow-sky-100/70 backdrop-blur-xl">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-sky-100 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 left-1/3 h-72 w-72 rounded-full bg-emerald-100/70 blur-3xl" />

          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br from-sky-500 to-emerald-400 text-white shadow-lg shadow-cyan-100">
                <ClipboardList size={28} strokeWidth={1.8} />
              </div>

              <div className="min-w-0">
                <p className="inline-flex rounded-full bg-sky-50 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-sky-600">
                  Task management
                </p>

                <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                  Tạo task mới
                </h2>

                <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-600">
                  Tạo công việc, gán ban phụ trách, phân công thành viên, đặt deadline và theo dõi workload trước khi giao task.
                </p>
              </div>
            </div>

            <div className="rounded-3xl border border-sky-100 bg-white/80 p-4 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                Event
              </p>
              <p className="mt-1 max-w-[240px] truncate text-sm font-black text-slate-950">
                {eventQuery.data?.name || 'Đang tải...'}
              </p>
            </div>
          </div>
        </section>

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
                    Thông tin task
                  </h3>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    Điền thông tin để tạo task trong sự kiện.
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
                label="Tên task"
                icon={<ClipboardList className="h-4 w-4" strokeWidth={1.8} />}
              >
                <input
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  required
                  maxLength={255}
                  className={inputClassName}
                  placeholder="Nhập tên task cần thực hiện"
                />
              </Field>

              <Field
                label="Mô tả task"
                icon={<FileText className="h-4 w-4" strokeWidth={1.8} />}
              >
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  maxLength={2000}
                  rows={5}
                  className={`${inputClassName} min-h-32 resize-none py-3`}
                  placeholder="Mô tả chi tiết công việc, yêu cầu đầu ra, ghi chú..."
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Department"
                  icon={<Layers3 className="h-4 w-4" strokeWidth={1.8} />}
                  hint={isDepartmentLocked ? 'Department đã được khóa theo URL hiện tại.' : ''}
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
                  label="Assignee"
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
                      Đang tải workload thành viên...
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
                      Workload hiện tại: {selectedMemberWorkload.assignedTasks} task chưa hoàn thành · {selectedMemberWorkload.workloadScore}% · {selectedMemberWorkload.workloadStatus}
                    </p>
                  )}
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Deadline"
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
                  label="Status"
                  icon={<ClipboardList className="h-4 w-4" strokeWidth={1.8} />}
                >
                  <select
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                    className={inputClassName}
                  >
                    <option value="TODO">TODO</option>
                    <option value="IN_PROGRESS">IN_PROGRESS</option>
                    <option value="IN_REVIEW">IN_REVIEW</option>
                    <option value="DONE">DONE</option>
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
                Tạo task
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
                    AI gợi ý task
                  </h3>
                  <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                    Nhập bối cảnh để AI đề xuất danh sách task phù hợp.
                  </p>
                </div>
              </div>

              <div className="relative mt-4 flex flex-col gap-2">
                <input
                  value={suggestionInstruction}
                  onChange={(event) => setSuggestionInstruction(event.target.value)}
                  className={inputClassName}
                  placeholder="Context cho AI, ví dụ: chuẩn bị workshop 100 người..."
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
                  Gợi ý task
                </button>
              </div>

              {suggestionMutation.error && (
                <div className="relative mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
                  {suggestionMutation.error.userMessage || suggestionMutation.error.message}
                </div>
              )}

              {suggestionMutation.data?.tasks?.length > 0 && (
                <div className="relative mt-4 space-y-3">
                  {suggestionMutation.data.tasks.map((task, index) => (
                    <div
                      key={`${task.title}-${index}`}
                      className="rounded-3xl border border-sky-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:bg-sky-50/60 hover:shadow-lg hover:shadow-sky-100"
                    >
                      <div className="flex flex-col gap-3">
                        <div>
                          <p className="text-sm font-black text-slate-950">
                            {task.title}
                          </p>

                          <p className="mt-1 line-clamp-3 text-xs font-semibold leading-5 text-slate-600">
                            {task.description || 'Không có mô tả'}
                          </p>

                          <p className="mt-2 text-xs font-black text-slate-500">
                            Ưu tiên: {task.priority || 'MEDIUM'} · Deadline: {normalizeSuggestedDeadline(task.deadline) || 'Chưa có'}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => applySuggestion(task)}
                          className="inline-flex min-h-10 items-center justify-center rounded-2xl border border-sky-100 bg-sky-50 px-3 py-2 text-xs font-black text-sky-700 transition hover:bg-sky-100"
                        >
                          Dùng gợi ý này
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-[2rem] border border-sky-100 bg-white p-5 shadow-xl shadow-sky-100/70">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
                  <Users size={20} strokeWidth={1.8} />
                </div>

                <div>
                  <h3 className="font-black text-slate-950">Workload hint</h3>
                  <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                    Chọn department trước để EventFlow tải workload và chỉ hiển thị thành viên thuộc ban đó.
                  </p>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </AppLayout>
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

const inputClassName = 'min-h-11 w-full min-w-0 rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-cyan-300 focus:bg-white focus:ring-4 focus:ring-cyan-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500';

export default TaskCreatePage;