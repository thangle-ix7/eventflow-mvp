import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, CheckCircle2, Flag, Loader2, Plus, Sparkles, X } from 'lucide-react';
import aiSuggestionApi from '../api/aiSuggestionApi';
import milestoneApi from '../api/milestoneApi';
import AiSuggestionDetailModal from './AiSuggestionDetailModal';
import { stripHiddenSuggestionKeys } from '../utils/aiSuggestionUtils';
import {
  buildEventTimeRangeError,
  formatDate,
  formatDateTimeInputRange,
  getEventTimeBounds,
  toDateTimeLocalValue,
} from '../utils/dateUtils';

const MilestoneCreateModal = ({ eventId, event, isOpen, onCancel, onCreated }) => {
  const queryClient = useQueryClient();
  const [suggestionInstruction, setSuggestionInstruction] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [appliedSuggestionKey, setAppliedSuggestionKey] = useState('');
  const [detailSuggestion, setDetailSuggestion] = useState(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    expectedDeadline: '',
    expectedResult: '',
    priority: 'MEDIUM',
    status: 'TODO',
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const { startInput: eventStartInput, endInput: eventEndInput } = getEventTimeBounds(event);
  const eventTimeRangeLabel = formatDateTimeInputRange(eventStartInput, eventEndInput);

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
      setFieldErrors({});
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

  const apiExpectedDeadlineError = isExpectedDeadlineError(createMutation.error)
    ? getErrorMessage(createMutation.error)
    : '';
  const displayFieldErrors = {
    ...fieldErrors,
    expectedDeadline: fieldErrors.expectedDeadline || apiExpectedDeadlineError,
  };
  const generalCreateError = createMutation.error && !apiExpectedDeadlineError;

  const handleChange = (event) => {
    const { name, value } = event.target;
    if (createMutation.error) {
      createMutation.reset();
    }
    setFieldErrors((old) => ({ ...old, [name]: '' }));
    setForm((old) => ({ ...old, [name]: value }));
  };

  const applySuggestion = (milestone, index) => {
    setForm({
      name: milestone.name || '',
      description: milestone.description || '',
      expectedDeadline: toDateTimeLocalValue(milestone.expectedDeadline),
      expectedResult: milestone.expectedResult || '',
      priority: milestone.priority || 'MEDIUM',
      status: milestone.status || 'TODO',
    });
    setAppliedSuggestionKey(getSuggestionKey(milestone, index));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const validationErrors = validateMilestoneForm(form, eventStartInput, eventEndInput);
    if (Object.values(validationErrors).some(Boolean)) {
      setFieldErrors(validationErrors);
      return;
    }
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
              Tạo cột mốc
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
                    placeholder="Bối cảnh AI"
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
Chưa có gợi ý.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-sky-100 bg-white">
                    <table className="w-full min-w-[820px] border-collapse text-left text-sm">
                      <thead className="bg-sky-50/70 text-xs font-black uppercase tracking-[0.08em] text-slate-500">
                        <tr>
                          <th className="px-3 py-3">Cột mốc</th>
                          <th className="px-3 py-3">Hạn</th>
                          <th className="px-3 py-3">Trạng thái</th>
                          <th className="px-3 py-3">Kết quả</th>
                          <th className="w-32 px-3 py-3 text-right">Áp dụng</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-sky-50">
                        {suggestions.map((milestone, index) => {
                          const suggestionKey = getSuggestionKey(milestone, index);
                          const isApplied = appliedSuggestionKey === suggestionKey;

                          return (
                            <tr
                              key={suggestionKey}
                              role="button"
                              tabIndex={0}
                              onClick={() => setDetailSuggestion({ ...milestone, __suggestionIndex: index })}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                  event.preventDefault();
                                  setDetailSuggestion({ ...milestone, __suggestionIndex: index });
                                }
                              }}
                              className={`cursor-pointer transition hover:bg-sky-50/70 ${
                                isApplied ? 'bg-emerald-50/50' : 'bg-white'
                              }`}
                            >
                              <td className="px-3 py-3 align-top">
                                <div className="flex items-start gap-2">
                                  {isApplied && <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" />}
                                  <div className="min-w-0">
                                    <p className="font-black leading-5 text-slate-950">
                                      {milestone.name || `Cột mốc ${index + 1}`}
                                    </p>

                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-3 align-top font-semibold text-slate-600">
                                <span className="inline-flex items-center gap-1">
                                  <CalendarDays size={13} />
                                  {formatSuggestionDate(milestone.expectedDeadline)}
                                </span>
                              </td>
                              <td className="px-3 py-3 align-top">
                                <div className="flex flex-wrap gap-2">
                                  <span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-black text-sky-700">
                                    {milestone.priority || 'MEDIUM'}
                                  </span>
                                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600">
                                    {milestone.status || 'TODO'}
                                  </span>
                                </div>
                              </td>
                              <td className="px-3 py-3 align-top">
                                <p className="line-clamp-2 font-semibold leading-6 text-slate-600">
                                  {milestone.expectedResult || milestone.description || 'Chưa có kết quả kỳ vọng'}
                                </p>
                              </td>
                              <td className="px-3 py-3 text-right align-top">
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    applySuggestion(milestone, index);
                                  }}
                                  className="inline-flex min-h-9 items-center justify-center gap-2 rounded-xl border border-sky-100 bg-white px-3 py-1.5 text-xs font-black text-sky-700 shadow-sm transition hover:bg-sky-50"
                                >
                                  {isApplied ? <CheckCircle2 size={15} /> : <Plus size={15} />}
                                  {isApplied ? 'Đã dùng' : 'Dùng'}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </aside>

            <main className="rounded-3xl border border-sky-100 bg-white p-4 shadow-sm lg:p-5">
              {generalCreateError && (
                <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
                  {createMutation.error.userMessage || createMutation.error.message}
                </div>
              )}

              <div className="grid gap-5">
                <label className="block">
                  <span className="text-sm font-black text-slate-700">Tên cột mốc *</span>
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    required
                    maxLength={255}
                    className={inputClassName}
                    placeholder="Tên cột mốc"
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
                    placeholder="Mô tả"
                  />
                </label>

                <div className="grid gap-4 lg:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-black text-slate-700">Hạn kỳ vọng</span>
                    <input
                      name="expectedDeadline"
                      type="datetime-local"
                      value={form.expectedDeadline}
                      onChange={handleChange}
                      min={eventStartInput || undefined}
                      max={eventEndInput || undefined}
                      className={inputClassName}
                    />
                    <p className="mt-2 text-xs font-semibold text-slate-500">
                      Khoảng hợp lệ: {eventTimeRangeLabel}
                    </p>
                    <FieldError message={displayFieldErrors.expectedDeadline} />
                  </label>

                  <label className="block">
                    <span className="text-sm font-black text-slate-700">Kết quả kỳ vọng</span>
                    <input
                      name="expectedResult"
                      value={form.expectedResult}
                      onChange={handleChange}
                      maxLength={2000}
                      className={inputClassName}
                      placeholder="Kết quả"
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
                      <option value="TODO">Cần làm</option>
                      <option value="IN_PROGRESS">Đang làm</option>
                      <option value="DONE">Hoàn thành</option>
                      <option value="CANCELLED">Đã hủy</option>
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
            Tạo cột mốc
          </button>
        </div>
      </form>
      <AiSuggestionDetailModal
        isOpen={Boolean(detailSuggestion)}
        title={detailSuggestion?.name || 'Chi tiết cột mốc gợi ý'}
        suggestion={detailSuggestion}
        onSave={(updatedSuggestion) => {
          const cleaned = stripHiddenSuggestionKeys(updatedSuggestion);
          setSuggestions((old) => old.map((milestone, index) => (
            index === detailSuggestion.__suggestionIndex ? cleaned : milestone
          )));
        }}
        onClose={() => setDetailSuggestion(null)}
      />
    </div>
  );
};

const inputClassName = 'mt-2 min-h-11 w-full min-w-0 rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-cyan-300 focus:bg-white focus:ring-4 focus:ring-cyan-100';

const getSuggestionKey = (milestone, index) => `${milestone.name || 'milestone'}-${milestone.expectedDeadline || index}`;

const validateMilestoneForm = (form, eventStartInput, eventEndInput) => {
  const errors = {};
  if (form.expectedDeadline && eventStartInput && form.expectedDeadline < eventStartInput) {
    errors.expectedDeadline = buildEventTimeRangeError('Hạn kỳ vọng', eventStartInput, eventEndInput);
  }
  if (form.expectedDeadline && eventEndInput && form.expectedDeadline > eventEndInput) {
    errors.expectedDeadline = buildEventTimeRangeError('Hạn kỳ vọng', eventStartInput, eventEndInput);
  }
  return errors;
};

const getErrorMessage = (error) => error?.userMessage || error?.message || '';

const isExpectedDeadlineError = (error) => {
  const normalized = getErrorMessage(error).toLowerCase();
  return normalized.includes('hạn') || normalized.includes('deadline') || normalized.includes('expecteddeadline');
};

const FieldError = ({ message }) => (
  message ? <p className="mt-2 text-xs font-semibold text-red-600">{message}</p> : null
);

const formatSuggestionDate = (value) => formatDate(value, 'Chưa có');

export default MilestoneCreateModal;
