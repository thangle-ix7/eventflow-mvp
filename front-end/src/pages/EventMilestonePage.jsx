import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CalendarClock, CheckCircle2, Flag, Plus, Target } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import milestoneApi from '../api/milestoneApi';
import eventApi from '../api/eventApi';
import { Button, EmptyState, ErrorState, LoadingState, PageHeader, Panel, PriorityBadge, ProgressBar, StatusBadge } from '../components/ui';
import { getEventPermissions } from '../utils/permissionUtils';

const EventMilestonePage = ({ user, onLogout }) => {
  const { eventId } = useParams();

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

  const event = eventQuery.data;
  const permissions = getEventPermissions(event);
  const milestones = useMemo(
    () => [...(milestonesQuery.data || [])].sort(compareMilestonesByDate),
    [milestonesQuery.data],
  );
  const completedCount = milestones.filter((milestone) => milestone.status === 'DONE').length;

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
            <Button as={Link} to={`/events/${eventId}/milestones/new`}>
              <Plus className="h-4 w-4" strokeWidth={2} />
              Tạo cột mốc
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

        {!eventQuery.isLoading && !milestonesQuery.isLoading && !eventQuery.error && !milestonesQuery.error && milestones.length === 0 && (
          <EmptyState
            icon={Flag}
            title="Chưa có cột mốc"
            description="Tạo các checkpoint để lộ trình sự kiện dễ theo dõi hơn."
            actions={permissions.canManageEvent && (
              <Button as={Link} to={`/events/${eventId}/milestones/new`}>
                <Plus className="h-4 w-4" strokeWidth={2} />
                Tạo cột mốc
              </Button>
            )}
          />
        )}

        {!eventQuery.isLoading && !milestonesQuery.isLoading && !eventQuery.error && !milestonesQuery.error && milestones.length > 0 && (
          <Panel className="overflow-hidden">
            <div className="border-b border-sky-100 bg-sky-50/70 px-4 py-3 sm:px-6">
              <div className="grid gap-2 text-xs font-black uppercase tracking-[0.16em] text-slate-500 sm:grid-cols-[8rem_minmax(0,1fr)_8rem]">
                <span>Ngày</span>
                <span>Cột mốc</span>
                <span className="hidden sm:block">Tiến độ</span>
              </div>
            </div>

            <div className="divide-y divide-sky-50">
              {milestones.map((milestone, index) => (
                <article
                  key={milestone.id}
                  className="grid gap-4 px-4 py-5 sm:grid-cols-[8rem_minmax(0,1fr)_8rem] sm:px-6"
                >
                  <div className="flex items-start gap-3 sm:block">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 sm:mb-3">
                      <CalendarClock className="h-5 w-5" strokeWidth={1.8} />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-950">
                        {formatMilestoneDate(milestone.expectedDeadline)}
                      </p>
                      <p className="mt-1 text-xs font-bold text-slate-400">
                        Mốc {index + 1}
                      </p>
                    </div>
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="min-w-0 break-words text-base font-black text-slate-950">
                        {milestone.name}
                      </h3>
                      <StatusBadge status={milestone.status} />
                      <PriorityBadge priority={milestone.priority} />
                    </div>

                    {milestone.description && (
                      <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                        {milestone.description}
                      </p>
                    )}

                    {milestone.expectedResult && (
                      <div className="mt-3 flex items-start gap-2 rounded-2xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
                        <Target className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.8} />
                        <span>{milestone.expectedResult}</span>
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center justify-between gap-2 sm:block">
                      <p className="text-sm font-black text-slate-950">
                        {milestone.progressPercentage || 0}%
                      </p>
                      <p className="text-xs font-bold text-slate-500 sm:mt-1">
                        {milestone.completedTasks || 0}/{milestone.totalTasks || 0} việc
                      </p>
                    </div>
                    <div className="mt-2">
                      <ProgressBar value={milestone.progressPercentage || 0} />
                    </div>
                    {milestone.status === 'DONE' && (
                      <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} />
                        Xong
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </Panel>
        )}
      </div>
    </AppLayout>
  );
};

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

const formatMilestoneDate = (value) => {
  if (!value) {
    return 'Chưa có hạn';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Chưa có hạn';
  }

  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

export default EventMilestonePage;

