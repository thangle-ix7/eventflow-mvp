import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import {
  CalendarDays,
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
    <div className="flex flex-col gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <h3 className="text-base font-black text-slate-950">Kế hoạch</h3>
      <Button
        as={Link}
        to={`/events/${eventId}/plannings`}
        variant="secondary"
        className="min-h-9 w-fit rounded-md px-3 py-2"
      >
        Mở bảng
      </Button>
    </div>

    <div>
      {isLoading && <LoadingState message="Đang tải kế hoạch..." />}

      {!isLoading && error && (
        <ErrorState error={error} title="Không tải được kế hoạch" />
      )}

      {!isLoading && !error && plannings.length === 0 && (
        <div className="p-4">
          <EmptyState
            icon={Layers}
            title="Chưa có kế hoạch"
            description="Kế hoạch của sự kiện sẽ hiển thị tại đây sau khi được tạo."
          />
        </div>
      )}

      {!isLoading && !error && plannings.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
              <tr>
                <th className={overviewHeadCellClassName}>Kế hoạch</th>
                <th className={overviewHeadCellClassName}>#</th>
                <th className={overviewHeadCellClassName}>Giai đoạn</th>
                <th className={overviewHeadCellClassName}>Mục tiêu</th>
                <th className={overviewHeadCellClassName}>Mô tả</th>
              </tr>
            </thead>
            <tbody>
              {plannings.flatMap((planning) => {
                const phases = planning.phases || [];
                if (phases.length === 0) {
                  return [(
                    <tr key={`${planning.id}-empty`} className="hover:bg-slate-50">
                      <td className={overviewBodyCellClassName}>
                        <p className="font-black text-slate-950">{planning.title}</p>
                        {planning.description && <p className="mt-1 text-xs font-semibold text-slate-500">{planning.description}</p>}
                      </td>
                      <td className={overviewIndexCellClassName}>-</td>
                      <td className={overviewBodyCellClassName}>Chưa có giai đoạn</td>
                      <td className={overviewBodyCellClassName}>-</td>
                      <td className={overviewBodyCellClassName}>-</td>
                    </tr>
                  )];
                }

                return phases.map((phase, index) => (
                  <tr key={phase.id || `${planning.id}-${index}`} className="hover:bg-slate-50">
                    <td className={overviewBodyCellClassName}>
                      <p className="font-black text-slate-950">{planning.title}</p>
                      {index === 0 && planning.description && (
                        <p className="mt-1 text-xs font-semibold text-slate-500">{planning.description}</p>
                      )}
                    </td>
                    <td className={overviewIndexCellClassName}>{index + 1}</td>
                    <td className={overviewBodyCellClassName}>
                      <p className="font-bold text-slate-900">{phase.phaseName}</p>
                    </td>
                    <td className={overviewBodyCellClassName}>{phase.objective || '-'}</td>
                    <td className={overviewBodyCellClassName}>{phase.description || '-'}</td>
                  </tr>
                ));
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  </Panel>
);

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

const overviewHeadCellClassName = 'border-b border-slate-200 px-3 py-2';
const overviewBodyCellClassName = 'border-b border-slate-100 px-3 py-3 align-top font-semibold leading-6 text-slate-600';
const overviewIndexCellClassName = 'w-14 border-b border-slate-100 px-3 py-3 text-center text-xs font-black text-slate-400';

const formatEventRange = (event) => {
  const start = event?.startTime || event?.eventDate;
  const end = event?.endTime;
  if (!end || end === start) {
    return `Bắt đầu: ${formatDate(start)}`;
  }
  return `${formatDate(start)} - ${formatDate(end)}`;
};

export default EventDetailPage;
