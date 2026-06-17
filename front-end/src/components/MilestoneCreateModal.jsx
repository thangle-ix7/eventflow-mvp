import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, CheckCircle2, Flag, Loader2, Plus, Sparkles, X } from 'lucide-react';
import aiSuggestionApi from '../api/aiSuggestionApi';
import milestoneApi from '../api/milestoneApi';

const MilestoneCreateModal = ({ eventId, isOpen, onCancel, onCreated }) => {
  const queryClient = useQueryClient();
  const [suggestionInstruction, setSuggestionInstruction] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [appliedSuggestionKey, setAppliedSuggestionKey] = useState('');
  const [form, setForm] = useState({
    name: '',
    description: '',
    expectedDeadline: '',
    expectedResult: '',
    priority: 'MEDIUM',
    status: 'TODO',
  });

  const createMutation = useMutation({
    mutationFn: milestoneApi.createMilestone,
    onSuccess: (milestone) => {
      queryClient.invalidateQueries({ queryKey: ['eventMilestones', eventId] });
      queryClient.invalidateQueries({ queryKey: ['leaderSnapshot', eventId] });
      onCreated?.(milestone);
      setForm({
        name: '',
        description: '',
        expectedDeadline: '',
        expectedResult: '',
        priority: 'MEDIUM',
        status: 'TODO',
      });
      setSuggestions([]);
      setSuggestionInstruction('');
      setAppliedSuggestionKey('');
    },
  });

  const suggestionMutation = useMutation({
    mutationFn: () => aiSuggestionApi.suggestMilestones({
      eventId,
      instruction: suggestionInstruction,
      count: 4,
    }),
    onSuccess: (data) => {
      setSuggestions(data?.milestones || []);
    },
  });

  if (!isOpen) return null;

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((old) => ({ ...old, [name]: value }));
  };

  const applySuggestion = (milestone, index) => {
    setForm({
      name: milestone.name || '',
      description: milestone.description || '',
      expectedDeadline: toDateTimeLocal(milestone.expectedDeadline),
      expectedResult: milestone.expectedResult || '',
      priority: milestone.priority || 'MEDIUM',
      status: milestone.status || 'TODO',
    });
    setAppliedSuggestionKey(getSuggestionKey(milestone, index));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    createMutation.mutate({
      eventId,
      payload: {
        name: form.name,
        description: form.description || null,
        expectedDeadline: form.expectedDeadline || null,
        expectedResult: form.expectedResult || null,
        priority: form.priority,
        status: form.status,
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-50">
      <form
        onSubmit={handleSubmit}
        className="flex h-full min-h-0 flex-col"
      >
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-sky-100 bg-white px-4 py-3 lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-600 text-white shadow-sm">
              <Flag className="h-5 w-5" strokeWidth={1.8} />
            </span>

            <h2 className="truncate text-lg font-black text-slate-950">
              Tạo milestone
            </h2>
          </div>

          <button
            type="button"
            onClick={onCancel}
            className="rounded-2xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={20} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 lg:px-6">
          <div className="mx-auto grid w-full max-w-7xl gap-5 xl:grid-cols-[390px_minmax(0,1fr)]">
            <aside className="space-y-4">
              <section className="rounded-3xl border border-sky-100 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-sky-600" strokeWidth={1.8} />
                  <h3 className="font-black text-slate-950">AI gợi ý</h3>
                </div>

                <label className="mt-4 block">
                  <span className="text-sm font-black text-slate-700">Định hướng</span>
                  <textarea
                    value={suggestionInstruction}
                    onChange={(event) => setSuggestionInstruction(event.target.value)}
                    className={`${inputClassName} min-h-28 resize-none py-3`}
                    placeholder="VD: chia theo setup, rehearsal, vận hành chính và tổng kết..."
                    disabled={suggestionMutation.isPending || createMutation.isPending}
                  />
                </label>

                <button
                  type="button"
                  onClick={() => suggestionMutation.mutate()}
                  disabled={suggestionMutation.isPending || createMutation.isPending}
                  className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-sky-100 bg-sky-600 px-4 py-2 text-sm font-black text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {suggestionMutation.isPending ? <Loader2 size={17} className="animate-spin" /> : <Sparkles size={17} />}
                  Tạo gợi ý
                </button>

                {suggestionMutation.error && (
                  <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                    {suggestionMutation.error.userMessage || suggestionMutation.error.message}
                  </div>
                )}
              </section>

              <section className="space-y-3">
                {suggestions.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-sky-200 bg-white p-5 text-sm font-semibold leading-6 text-slate-500">
                    AI sẽ đề xuất các milestone phù hợp với thông tin sự kiện, planning và task hiện có.
                  </div>
                ) : (
                  suggestions.map((milestone, index) => {
                    const suggestionKey = getSuggestionKey(milestone, index);
                    const isApplied = appliedSuggestionKey === suggestionKey;

                    return (
                      <article
                        key={suggestionKey}
                        className={`rounded-3xl border bg-white p-4 shadow-sm transition ${
                          isApplied ? 'border-emerald-200 ring-4 ring-emerald-50' : 'border-sky-100'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h4 className="font-black leading-5 text-slate-950">
                              {milestone.name || `Milestone ${index + 1}`}
                            </h4>
                            {milestone.description && (
                              <p className="mt-2 line-clamp-3 text-sm font-semibold leading-6 text-slate-600">
                                {milestone.description}
                              </p>
                            )}
                          </div>

                          {isApplied && (
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                              <CheckCircle2 size={18} />
                            </span>
                          )}
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-black text-sky-700">
                            {milestone.priority || 'MEDIUM'}
                          </span>
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600">
                            {milestone.status || 'TODO'}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700">
                            <CalendarDays size={13} />
                            {formatSuggestionDate(milestone.expectedDeadline)}
                          </span>
                        </div>

                        {milestone.expectedResult && (
                          <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
                            {milestone.expectedResult}
                          </p>
                        )}

                        <button
                          type="button"
                          onClick={() => applySuggestion(milestone, index)}
                          className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-2xl border border-sky-100 bg-white px-4 py-2 text-sm font-black text-sky-700 shadow-sm transition hover:bg-sky-50"
                        >
                          {isApplied ? <CheckCircle2 size={16} /> : <Plus size={16} />}
                          {isApplied ? 'Đã điền vào form' : 'Dùng gợi ý này'}
                        </button>
                      </article>
                    );
                  })
                )}
              </section>
            </aside>

            <main className="rounded-3xl border border-sky-100 bg-white p-4 shadow-sm lg:p-5">
              {createMutation.error && (
                <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
                  {createMutation.error.userMessage || createMutation.error.message}
                </div>
              )}

              <div className="grid gap-5">
                <label className="block">
                  <span className="text-sm font-black text-slate-700">Tên milestone *</span>
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    required
                    maxLength={255}
                    className={inputClassName}
                    placeholder="VD: Chuẩn bị trước sự kiện, Vận hành ngày diễn ra..."
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-black text-slate-700">Mô tả</span>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    maxLength={2000}
                    rows={5}
                    className={`${inputClassName} min-h-36 resize-y py-3`}
                    placeholder="Mục tiêu, phạm vi hoặc lưu ý của milestone..."
                  />
                </label>

                <div className="grid gap-4 lg:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-black text-slate-700">Deadline kỳ vọng</span>
                    <input
                      name="expectedDeadline"
                      type="datetime-local"
                      value={form.expectedDeadline}
                      onChange={handleChange}
                      className={inputClassName}
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-black text-slate-700">Kết quả kỳ vọng</span>
                    <input
                      name="expectedResult"
                      value={form.expectedResult}
                      onChange={handleChange}
                      maxLength={2000}
                      className={inputClassName}
                      placeholder="VD: Hoàn tất setup sân, nhân sự và truyền thông"
                    />
                  </label>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-black text-slate-700">Ưu tiên</span>
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
                  </label>

                  <label className="block">
                    <span className="text-sm font-black text-slate-700">Trạng thái</span>
                    <select
                      name="status"
                      value={form.status}
                      onChange={handleChange}
                      className={inputClassName}
                    >
                      <option value="TODO">TODO</option>
                      <option value="IN_PROGRESS">IN_PROGRESS</option>
                      <option value="DONE">DONE</option>
                      <option value="CANCELLED">CANCELLED</option>
                    </select>
                  </label>
                </div>
              </div>
            </main>
          </div>
        </div>

        <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-sky-100 bg-white px-4 py-3 sm:flex-row sm:justify-end lg:px-6">
          <button
            type="button"
            onClick={onCancel}
            disabled={createMutation.isPending}
            className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Hủy
          </button>

          <button
            type="submit"
            disabled={createMutation.isPending}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400 px-4 py-2 text-sm font-black text-white shadow-lg shadow-cyan-100 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {createMutation.isPending ? <Loader2 size={17} className="animate-spin" /> : <Plus size={17} />}
            Tạo milestone
          </button>
        </div>
      </form>
    </div>
  );
};

const inputClassName = 'mt-2 min-h-11 w-full min-w-0 rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-cyan-300 focus:bg-white focus:ring-4 focus:ring-cyan-100';

const toDateTimeLocal = (value) => (value ? String(value).slice(0, 16) : '');

const getSuggestionKey = (milestone, index) => `${milestone.name || 'milestone'}-${milestone.expectedDeadline || index}`;

const formatSuggestionDate = (value) => {
  if (!value) return 'Chưa có';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value).replace('T', ' ').slice(0, 16);
  }
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default MilestoneCreateModal;
