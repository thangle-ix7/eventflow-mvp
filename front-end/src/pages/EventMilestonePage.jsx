import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Flag } from 'lucide-react';
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
                Tạo cột mốc
              </Button>
            )}
          />
        )}

        {!eventQuery.isLoading && !milestonesQuery.isLoading && !eventQuery.error && !milestonesQuery.error && milestones.length > 0 && (
          <Panel className="overflow-hidden">
            <div className="overflow-x-auto">
              <div className="min-w-[980px]">
                <div className="grid grid-cols-[64px_minmax(240px,1.5fr)_140px_130px_130px_180px_120px] items-center gap-4 border-b border-sky-100 bg-sky-50/70 px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                  <span>STT</span>
                  <span>Cột mốc</span>
                  <span>Hạn</span>
                  <span>Ưu tiên</span>
                  <span>Trạng thái</span>
                  <span>Tiến độ</span>
                  <span>Công việc</span>
                </div>

                <div className="divide-y divide-sky-50">
                  {milestones.map((milestone, index) => (
                    <Link
                      key={milestone.id}
                      to={`/events/${eventId}/tasks?milestoneId=${milestone.id}`}
                      className="grid grid-cols-[64px_minmax(240px,1.5fr)_140px_130px_130px_180px_120px] items-center gap-4 px-5 py-4 text-sm transition hover:bg-sky-50/70"
                    >
                      <span className="font-black text-slate-400">
                        {index + 1}
                      </span>

                      <span className="min-w-0">
                        <span className="block truncate font-black text-slate-950">
                          {milestone.name}
                        </span>
                        {(milestone.description || milestone.expectedResult) && (
                          <span className="mt-1 block truncate text-xs font-semibold text-slate-500">
                            {milestone.expectedResult || milestone.description}
                          </span>
                        )}
                      </span>

                      <span className="font-semibold text-slate-600">
                        {formatMilestoneDate(milestone.expectedDeadline)}
                      </span>

                      <PriorityBadge priority={milestone.priority} />
                      <StatusBadge status={milestone.status} />

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
                </div>
              </div>
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