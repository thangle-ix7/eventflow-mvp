import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Flag, Loader2 } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import milestoneApi from '../api/milestoneApi';
import eventApi from '../api/eventApi';
import { Button, EmptyState, ErrorState, LoadingState, PageHeader, Panel, ProgressBar } from '../components/ui';
import { getEventPermissions } from '../utils/permissionUtils';
import {
  buildEventTimeRangeError,
  formatDate,
  formatDateTimeInputRange,
  getEventTimeBounds,
} from '../utils/dateUtils';

const createInitialForm = () => ({
  name: '',
  description: '',
  expectedDeadline: '',
});

const EventMilestonePage = ({ user, onLogout }) => {
  const { eventId } = useParams();
  const queryClient = useQueryClient();
  const [isCreatingInline, setIsCreatingInline] = useState(false);
  const [createForm, setCreateForm] = useState(createInitialForm);
  const [fieldError, setFieldError] = useState('');

  const eventQuery = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => eventApi.getEvent(eventId),
    enabled: Boolean(eventId),
  });

  const milestonesQuery = useQuery({
    queryKey: ['eventMilestones', eventId],
    queryFn: () => milestoneApi.getEventMilestones(eventId),
    enabled: Boolean(eventId),
  });

  const createMutation = useMutation({
    mutationFn: milestoneApi.createMilestone,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventMilestones', eventId] });
      queryClient.invalidateQueries({ queryKey: ['leaderSnapshot', eventId] });
      setCreateForm(createInitialForm());
      setFieldError('');
      setIsCreatingInline(false);
    },
  });

  const event = eventQuery.data;
  const permissions = getEventPermissions(event);
  const milestones = useMemo(
    () => [...(milestonesQuery.data || [])].sort(compareMilestonesByDate),
    [milestonesQuery.data],
  );
  const completedCount = milestones.filter((milestone) => (milestone.progressPercentage || 0) >= 100).length;
  const { startInput: eventStartInput, endInput: eventEndInput } = getEventTimeBounds(event);
  const eventTimeRangeLabel = formatDateTimeInputRange(eventStartInput, eventEndInput);
  const hasLoadedMilestones = !eventQuery.isLoading && !milestonesQuery.isLoading && !eventQuery.error && !milestonesQuery.error;
  const showMilestoneTable = hasLoadedMilestones && (milestones.length > 0 || permissions.canManageEvent);

  const openInlineCreator = () => {
    createMutation.reset();
    setFieldError('');
    setIsCreatingInline(true);
  };

  const cancelInlineCreator = () => {
    createMutation.reset();
    setCreateForm(createInitialForm());
    setFieldError('');
    setIsCreatingInline(false);
  };

  const handleInlineChange = (event) => {
    const { name, value } = event.target;
    if (createMutation.error) {
      createMutation.reset();
    }
    setFieldError('');
    setCreateForm((old) => ({ ...old, [name]: value }));
  };

  const handleInlineSubmit = (event) => {
    event.preventDefault();
    const name = createForm.name.trim();
    if (!name) {
      setFieldError('Nhập tên cột mốc trước khi lưu.');
      return;
    }
    if (createForm.expectedDeadline && eventStartInput && createForm.expectedDeadline < eventStartInput) {
      setFieldError(buildEventTimeRangeError('Hạn kỳ vọng', eventStartInput, eventEndInput));
      return;
    }
    if (createForm.expectedDeadline && eventEndInput && createForm.expectedDeadline > eventEndInput) {
      setFieldError(buildEventTimeRangeError('Hạn kỳ vọng', eventStartInput, eventEndInput));
      return;
    }

    createMutation.mutate({
      eventId,
      payload: {
        name,
        description: createForm.description.trim() || null,
        expectedDeadline: createForm.expectedDeadline || null,
      },
    });
  };

  return (
    <AppLayout
      user={user}
      events={event ? [event] : []}
      selectedEvent={event}
      onLogout={onLogout}
    >
      <div className="space-y-6">
        <PageHeader
          eyebrow="Lộ trình sự kiện"
          title="Cột mốc"
          description="Theo dõi các checkpoint chính của sự kiện theo thứ tự thời gian."
          meta={(
            <>
              <span>{milestones.length} cột mốc</span>
              <span>{completedCount} đã hoàn thành</span>
            </>
          )}
          actions={permissions.canManageEvent && (
            <Button
              type="button"
              onClick={openInlineCreator}
              disabled={isCreatingInline}
              data-guide-target="milestone-create-action"
            >
              Thêm dòng
            </Button>
          )}
        />

        {(eventQuery.isLoading || milestonesQuery.isLoading) && (
          <LoadingState message="Đang tải lộ trình cột mốc..." />
        )}

        {(eventQuery.error || milestonesQuery.error) && (
          <ErrorState
            title="Không tải được cột mốc"
            error={eventQuery.error || milestonesQuery.error}
          />
        )}

        {hasLoadedMilestones && milestones.length === 0 && !permissions.canManageEvent && (
          <EmptyState
            icon={Flag}
            title="Chưa có cột mốc"
            description="Các checkpoint của sự kiện sẽ hiển thị tại đây khi leader tạo."
          />
        )}

        {showMilestoneTable && (
          <Panel className="overflow-hidden" data-guide-target="milestone-list">
            <div className="overflow-x-auto">
              <div className="min-w-[860px]">
                <div className="grid grid-cols-[64px_minmax(300px,1.6fr)_170px_220px_140px] items-center gap-4 border-b border-sky-100 bg-sky-50/70 px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                  <span>STT</span>
                  <span>Cột mốc</span>
                  <span>Hạn</span>
                  <span>Tiến độ</span>
                  <span>Công việc</span>
                </div>

                <div className="divide-y divide-sky-50">
                  {isCreatingInline && (
                    <InlineMilestoneCreateRow
                      form={createForm}
                      onChange={handleInlineChange}
                      onSubmit={handleInlineSubmit}
                      onCancel={cancelInlineCreator}
                      isPending={createMutation.isPending}
                      error={fieldError || getMutationError(createMutation.error)}
                      minDeadline={eventStartInput}
                      maxDeadline={eventEndInput}
                      rangeLabel={eventTimeRangeLabel}
                      rowNumber={milestones.length + 1}
                    />
                  )}

                  {milestones.map((milestone, index) => (
                    <Link
                      key={milestone.id}
                      to={`/events/${eventId}/tasks?milestoneId=${milestone.id}`}
                      className="grid grid-cols-[64px_minmax(300px,1.6fr)_170px_220px_140px] items-center gap-4 px-5 py-4 text-sm transition hover:bg-sky-50/70"
                    >
                      <span className="font-black text-slate-400">
                        {index + 1}
                      </span>

                      <span className="min-w-0">
                        <span className="block truncate font-black text-slate-950">
                          {milestone.name}
                        </span>
                        {milestone.description && (
                          <span className="mt-1 block truncate text-xs font-semibold text-slate-500">
                            {milestone.description}
                          </span>
                        )}
                      </span>

                      <span className="font-semibold text-slate-600">
                        {formatMilestoneDate(milestone.expectedDeadline)}
                      </span>

                      <span className="min-w-0">
                        <span className="mb-1 block text-xs font-black text-slate-600">
                          {milestone.progressPercentage || 0}%
                        </span>
                        <ProgressBar value={milestone.progressPercentage || 0} />
                      </span>

                      <span className="font-black text-slate-700">
                        {milestone.completedTasks || 0}/{milestone.totalTasks || 0}
                      </span>
                    </Link>
                  ))}

                  {milestones.length === 0 && !isCreatingInline && permissions.canManageEvent && (
                    <div className="px-5 py-8 text-sm font-semibold text-slate-500">
                      Chưa có cột mốc. Bấm “Thêm dòng” để tạo checkpoint đầu tiên ngay tại danh sách này.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Panel>
        )}
      </div>
    </AppLayout>
  );
};

const InlineMilestoneCreateRow = ({
  form,
  onChange,
  onSubmit,
  onCancel,
  isPending,
  error,
  minDeadline,
  maxDeadline,
  rangeLabel,
  rowNumber,
}) => (
  <form onSubmit={onSubmit} className="bg-white">
    <div className="grid grid-cols-[64px_minmax(300px,1.6fr)_170px_220px_140px] items-start gap-4 px-5 py-4 text-sm">
      <span className="pt-3 font-black text-sky-600">{rowNumber}</span>

      <span className="min-w-0">
        <input
          name="name"
          value={form.name}
          onChange={onChange}
          disabled={isPending}
          required
          maxLength={255}
          className={inlineInputClassName}
          placeholder="Tên cột mốc"
          autoFocus
        />
        <input
          name="description"
          value={form.description}
          onChange={onChange}
          disabled={isPending}
          maxLength={2000}
          className={`${inlineInputClassName} mt-2 text-xs`}
          placeholder="Mô tả ngắn"
        />
        {error && <p className="mt-2 text-xs font-semibold leading-5 text-red-600">{error}</p>}
      </span>

      <span>
        <input
          name="expectedDeadline"
          type="datetime-local"
          value={form.expectedDeadline}
          onChange={onChange}
          min={minDeadline || undefined}
          max={maxDeadline || undefined}
          disabled={isPending}
          className={inlineInputClassName}
          aria-label="Hạn kỳ vọng"
        />
        <span className="mt-2 block text-[11px] font-semibold leading-4 text-slate-400">
          {rangeLabel}
        </span>
      </span>
      <span className="col-span-2 flex items-center justify-end gap-2 pt-1">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex min-h-10 items-center justify-center rounded-xl bg-sky-600 px-3 py-2 text-xs font-black text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? <Loader2 size={14} className="mr-1 animate-spin" /> : null}
          Lưu
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Hủy
        </button>
      </span>
    </div>
  </form>
);

const getMutationError = (error) => error?.userMessage || error?.message || '';

const inlineInputClassName = 'min-h-10 w-full min-w-0 rounded-xl border border-sky-100 bg-sky-50/60 px-3 py-2 text-sm font-bold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-cyan-300 focus:bg-white focus:ring-4 focus:ring-cyan-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500';

const compareMilestonesByDate = (a, b) => {
  const dateA = toTime(a.expectedDeadline);
  const dateB = toTime(b.expectedDeadline);

  if (dateA !== dateB) {
    return dateA - dateB;
  }

  return (a.id || 0) - (b.id || 0);
};

const toTime = (value) => {
  if (!value) {
    return Number.MAX_SAFE_INTEGER;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? Number.MAX_SAFE_INTEGER : date.getTime();
};

const formatMilestoneDate = (value) => formatDate(value, 'Chưa có hạn');

export default EventMilestonePage;



