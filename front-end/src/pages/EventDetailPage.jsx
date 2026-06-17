import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import {
  CalendarDays,
  ClipboardList,
  Edit,
  Layers,
  MapPin,
  Sparkles,
  Tag,
  Target,
  UsersRound,
} from 'lucide-react';
import AppLayout from '../components/AppLayout';
import {
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  Panel,
} from '../components/ui';
import eventApi from '../api/eventApi';
import planningApi from '../api/planningApi';
import { formatDate } from '../utils/dateUtils';
import { getEventTypeLabel } from '../utils/eventTypeUtils';
import { getEventPermissions } from '../utils/permissionUtils';

const EMPTY_PLANNINGS = [];

const EventDetailPage = ({ user, onLogout }) => {
  const { eventId } = useParams();

  const eventQuery = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => eventApi.getEvent(eventId),
    enabled: Boolean(eventId),
  });

  const event = eventQuery.data;
  const permissions = getEventPermissions(event);
  const isLeader = permissions.canManageEvent;

  const planningsQuery = useQuery({
    queryKey: ['eventPlannings', eventId],
    queryFn: () => planningApi.getPlannings(eventId),
    enabled: Boolean(eventId && event),
  });

  const plannings = useMemo(() => planningsQuery.data || EMPTY_PLANNINGS, [planningsQuery.data]);

  return (
    <AppLayout
      user={user}
      events={event ? [event] : []}
      selectedEvent={event}
      onEventChange={() => {}}
      onLogout={onLogout}
    >
      <div className="space-y-6">
        {eventQuery.isLoading && <LoadingState message="Đang tải tổng quan sự kiện..." />}

        {eventQuery.error && (
          <ErrorState error={eventQuery.error} title="Không tải được thông tin sự kiện" />
        )}

        {event && (
          <>
            <EventInfoPanel event={event} eventId={eventId} isLeader={isLeader} />

            <PlanningOverview
              eventId={eventId}
              plannings={plannings}
              isLoading={planningsQuery.isLoading}
              error={planningsQuery.error}
            />
          </>
        )}
      </div>
    </AppLayout>
  );
};

const EventInfoPanel = ({ event, eventId, isLeader }) => {
  const infoItems = [
    {
      icon: <Tag className="h-5 w-5" strokeWidth={1.8} />,
      label: 'Loại sự kiện',
      value: getEventTypeLabel(event.eventType),
    },
    {
      icon: <UsersRound className="h-5 w-5" strokeWidth={1.8} />,
      label: 'Số người dự kiến',
      value: event.expectedAttendees ? `${event.expectedAttendees} người` : 'Chưa nhập',
    },
    {
      icon: <Sparkles className="h-5 w-5" strokeWidth={1.8} />,
      label: 'Quy mô',
      value: event.scale || 'Chưa nhập',
    },
    {
      icon: <CalendarDays className="h-5 w-5" strokeWidth={1.8} />,
      label: 'Thời gian',
      value: formatEventRange(event),
    },
    {
      icon: <MapPin className="h-5 w-5" strokeWidth={1.8} />,
      label: 'Địa điểm',
      value: event.location || 'Chưa có địa điểm',
    },
  ];

  return (
    <Panel className="overflow-hidden">
      <div className="border-b border-sky-100 bg-gradient-to-r from-sky-50 via-white to-emerald-50 px-5 py-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-sky-600 shadow-sm">
              <Target className="h-5 w-5" strokeWidth={1.8} />
            </span>

            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-500">
                Thông tin sự kiện
              </p>
              <h3 className="mt-1 text-xl font-black text-slate-950">
                Mục tiêu và bối cảnh
              </h3>
            </div>
          </div>

          {isLeader && (
            <Button
              as={Link}
              to={`/events/${eventId}/edit`}
              variant="secondary"
              className="w-fit rounded-2xl border-sky-100 bg-white font-black text-sky-600 shadow-sm hover:bg-sky-50"
            >
              <Edit size={16} />
              Sửa thông tin
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_0.95fr]">
        <div className="space-y-4">
          <InfoBlock
            label="Mục tiêu"
            value={event.objective || 'Chưa có mục tiêu. Leader có thể bổ sung để ban tổ chức thống nhất tiêu chí hoàn thành.'}
          />

          {event.contextDescription && (
            <InfoBlock label="Bối cảnh" value={event.contextDescription} />
          )}

          {event.description && (
            <InfoBlock label="Mô tả" value={event.description} />
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          {infoItems.map((item) => (
            <div
              key={item.label}
              className="flex min-w-0 items-center gap-3 rounded-2xl border border-sky-100 bg-sky-50/50 px-4 py-3"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-sky-600 shadow-sm">
                {item.icon}
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                  {item.label}
                </span>
                <span className="mt-1 block truncate text-sm font-black text-slate-800">
                  {item.value}
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
};

const PlanningOverview = ({ eventId, plannings, isLoading, error }) => (
  <Panel className="overflow-hidden">
    <div className="flex flex-col gap-3 border-b border-sky-100 bg-gradient-to-r from-sky-50 via-white to-emerald-50 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-sky-600 shadow-sm">
          <ClipboardList className="h-5 w-5" strokeWidth={1.8} />
        </span>

        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-500">
            Planning
          </p>
          <h3 className="mt-1 text-xl font-black text-slate-950">
            Kế hoạch triển khai
          </h3>
        </div>
      </div>

      <Button
        as={Link}
        to={`/events/${eventId}/plannings`}
        variant="secondary"
        className="w-fit"
      >
        Xem planning
      </Button>
    </div>

    <div className="p-5">
      {isLoading && <LoadingState message="Đang tải planning..." />}

      {!isLoading && error && (
        <ErrorState error={error} title="Không tải được planning" />
      )}

      {!isLoading && !error && plannings.length === 0 && (
        <EmptyState
          icon={Layers}
          title="Chưa có planning"
          description="Planning của sự kiện sẽ hiển thị tại đây sau khi được tạo."
        />
      )}

      {!isLoading && !error && plannings.length > 0 && (
        <div className="space-y-4">
          {plannings.map((planning) => (
            <PlanningSummaryCard key={planning.id} planning={planning} />
          ))}
        </div>
      )}
    </div>
  </Panel>
);

const PlanningSummaryCard = ({ planning }) => {
  const phases = planning.phases || [];

  return (
    <article className="overflow-hidden rounded-2xl border border-sky-100 bg-white">
      <div className="border-b border-slate-100 p-4">
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-400">
          <Layers size={14} />
          {phases.length} phase
        </div>
        <h4 className="mt-1 text-lg font-black text-slate-950">{planning.title}</h4>
        {planning.description && (
          <p className="mt-2 max-w-4xl text-sm font-semibold leading-6 text-slate-600">
            {planning.description}
          </p>
        )}
        <p className="mt-3 text-xs font-semibold text-slate-400">
          Tạo bởi {planning.createdByName || 'Leader'} - {formatDate(planning.createdAt)}
        </p>
      </div>

      {phases.length > 0 && (
        <div className="divide-y divide-slate-100 bg-slate-50/50">
          {phases.map((phase, index) => (
            <div key={phase.id || `${planning.id}-${index}`} className="grid gap-3 px-4 py-3 md:grid-cols-[72px_minmax(0,1fr)]">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-xs font-black text-slate-700 shadow-sm">
                  {index + 1}
                </span>
                <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                  Phase
                </span>
              </div>

              <div className="min-w-0">
                <p className="font-black text-slate-950">{phase.phaseName}</p>
                {phase.objective && (
                  <p className="mt-1 text-sm font-bold text-sky-700">{phase.objective}</p>
                )}
                {phase.description && (
                  <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">
                    {phase.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </article>
  );
};

const InfoBlock = ({ label, value }) => (
  <div className="rounded-2xl border border-sky-100 bg-white px-4 py-3">
    <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
      {label}
    </p>
    <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
      {value}
    </p>
  </div>
);

const formatEventRange = (event) => {
  const start = event?.startTime || event?.eventDate;
  const end = event?.endTime;
  if (!end || end === start) {
    return `Bắt đầu: ${formatDate(start)}`;
  }
  return `${formatDate(start)} - ${formatDate(end)}`;
};

export default EventDetailPage;
