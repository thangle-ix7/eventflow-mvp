import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, X } from 'lucide-react';
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

const initialForm = {
  name: '',
  description: '',
  expectedDeadline: '',
};

const MilestoneCreateModal = ({ eventId, event, isOpen, onCancel, onCreated }) => {
  const queryClient = useQueryClient();
  const [suggestionInstruction, setSuggestionInstruction] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [appliedSuggestionKey, setAppliedSuggestionKey] = useState('');
  const [detailSuggestion, setDetailSuggestion] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [fieldErrors, setFieldErrors] = useState({});
  const { startInput: eventStartInput, endInput: eventEndInput } = getEventTimeBounds(event);
  const eventTimeRangeLabel = formatDateTimeInputRange(eventStartInput, eventEndInput);

  const createMutation = useMutation({
    mutationFn: milestoneApi.createMilestone,
    onSuccess: (milestone) => {
      queryClient.invalidateQueries({ queryKey: ['eventMilestones', eventId] });
      queryClient.invalidateQueries({ queryKey: ['leaderSnapshot', eventId] });
      onCreated?.(milestone);
      setForm(initialForm);
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
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-white">
      <form onSubmit={handleSubmit} className="flex h-full min-h-0 flex-col">
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-sky-100 bg-white px-4 py-4 lg:px-8">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-600">
              Lộ trình sự kiện
            </p>
            <h2 className="truncate text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
              Tạo cột mốc
            </h2>
          </div>

          <button
            type="button"
            onClick={onCancel}
            className="rounded-2xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Đóng màn hình tạo cột mốc"
          >
            <X size={20} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto grid min-h-full w-full max-w-7xl xl:grid-cols-[340px_minmax(0,1fr)]">
            <aside className="border-b border-sky-100 bg-slate-50 p-5 xl:border-b-0 xl:border-r xl:p-6">
              <div className="xl:sticky xl:top-6">
                <div className="min-w-0">
                  <h3 className="font-black text-slate-950">AI gợi ý cột mốc</h3>
                  <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                    Nhập định hướng, chọn một gợi ý để đổ thẳng vào form.
                  </p>
                </div>

                <label className="mt-4 block">
                  <span className="text-sm font-black text-slate-700">Định hướng</span>
                  <textarea
                    value={suggestionInstruction}
                    onChange={(event) => setSuggestionInstruction(event.target.value)}
                    className={`${inputClassName} min-h-28 resize-none bg-white py-3`}
                    placeholder="Bối cảnh AI"
                    disabled={suggestionMutation.isPending || createMutation.isPending}
                  />
                </label>

                <button
                  type="button"
                  onClick={() => suggestionMutation.mutate()}
                  disabled={suggestionMutation.isPending || createMutation.isPending}
                  className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-sky-600 px-4 py-2 text-sm font-black text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {suggestionMutation.isPending ? <Loader2 size={17} className="mr-2 animate-spin" /> : null}
                  Tạo gợi ý
                </button>

                {suggestionMutation.error && (
                  <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                    {suggestionMutation.error.userMessage || suggestionMutation.error.message}
                  </div>
                )}

                <div className="mt-6 border-t border-sky-100 pt-4">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                    Gợi ý
                  </p>

                  {suggestions.length === 0 ? (
                    <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">
                      Chưa có gợi ý.
                    </p>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {suggestions.map((milestone, index) => {
                        const suggestionKey = getSuggestionKey(milestone, index);
                        const isApplied = appliedSuggestionKey === suggestionKey;

                        return (
                          <div
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
                            className={`cursor-pointer rounded-2xl border px-3 py-3 text-left transition hover:bg-white ${
                              isApplied
                                ? 'border-emerald-200 bg-emerald-50/80'
                                : 'border-transparent bg-white/70'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-black text-slate-950">
                                  {milestone.name || `Cột mốc ${index + 1}`}
                                </p>
                                <p className="mt-1 text-xs font-semibold text-slate-500">
                                  {formatSuggestionDate(milestone.expectedDeadline)}
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  applySuggestion(milestone, index);
                                }}
                                className="min-h-8 shrink-0 rounded-xl bg-sky-50 px-2.5 py-1 text-xs font-black text-sky-700 transition hover:bg-sky-100"
                              >
                                {isApplied ? 'Đã dùng' : 'Dùng'}
                              </button>
                            </div>

                            <p className="mt-2 line-clamp-2 text-xs font-semibold leading-5 text-slate-500">
                              {milestone.description || 'Chưa có mô tả'}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </aside>

            <main className="p-5 lg:p-8">
              {generalCreateError && (
                <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
                  {createMutation.error.userMessage || createMutation.error.message}
                </div>
              )}

              <div className="mb-6 border-b border-sky-100 pb-5">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                  {event?.name || 'Sự kiện'}
                </p>
                <h3 className="mt-1 text-lg font-black text-slate-950">
                  Thông tin cột mốc
                </h3>
              </div>

              <div className="grid gap-5">
                <label className="block max-w-3xl">
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

                <label className="block max-w-4xl">
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

                <label className="block max-w-md">
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
              </div>
            </main>
          </div>
        </div>

        <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-sky-100 bg-white px-4 py-3 sm:flex-row sm:justify-end lg:px-8">
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
            className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-sky-600 px-4 py-2 text-sm font-black text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {createMutation.isPending ? <Loader2 size={17} className="mr-2 animate-spin" /> : null}
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

const inputClassName = 'mt-2 min-h-11 w-full min-w-0 rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-cyan-300 focus:bg-white focus:ring-4 focus:ring-cyan-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500';

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
