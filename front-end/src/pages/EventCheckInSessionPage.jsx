import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ClipboardCheck, Mail, UsersRound } from 'lucide-react';
import { Button, ErrorState, LoadingState, MetricCard, PageHeader, Panel } from '../components/ui';
import AttendeeInvitePanel from './check-in/AttendeeInvitePanel';
import CheckInDeskPanel from './check-in/CheckInDeskPanel';
import { STATUS_LABELS, TYPE_LABELS } from './check-in/checkInConstants';
import useCheckInPageData from './check-in/useCheckInPageData';

const TABS = [
  { id: 'guests', label: 'Khách mời' },
  { id: 'check-in', label: 'Check-in' },
];

const EventCheckInSessionPage = () => {
  const { eventId, sessionId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') === 'check-in' ? 'check-in' : 'guests';
  const {
    eventQuery,
    sessionsQuery,
    attendeesQuery,
    selectedSession,
    attendees,
    metrics,
    attendeeInvite,
    checkInDesk,
  } = useCheckInPageData(eventId, sessionId);

  const setActiveTab = (tab) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', tab);
    setSearchParams(next, { replace: true });
  };

  if (eventQuery.isLoading || sessionsQuery.isLoading) {
    return <LoadingState message="Đang tải session..." />;
  }

  if (eventQuery.error || sessionsQuery.error) {
    return <ErrorState error={eventQuery.error || sessionsQuery.error} title="Không tải được session" />;
  }

  if (!selectedSession) {
    return (
      <Panel className="p-6">
        <PageHeader
          eyebrow="Check-in"
          title="Không tìm thấy session"
          actions={<Button as={Link} to={`/events/${eventId}/check-in`} variant="secondary">Về danh sách</Button>}
        />
      </Panel>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Check-in session"
        title={selectedSession.name}
        meta={[
          <span key="location">{selectedSession.location || 'Chưa có vị trí'}</span>,
          <span key="status">{selectedSession.active ? 'Đang mở' : 'Tạm đóng'}</span>,
        ]}
        actions={<Button as={Link} to={`/events/${eventId}/check-in`} variant="secondary">Về danh sách</Button>}
      />

      <section className="grid gap-3 md:grid-cols-3">
        <MetricCard icon={UsersRound} label="Khách mời" value={attendees.length} hint="Trong session" tone="indigo" />
        <MetricCard icon={Mail} label="Đã xác nhận" value={metrics.confirmedCount} hint="Confirmed" tone="amber" />
        <MetricCard icon={ClipboardCheck} label="Đã check-in" value={`${metrics.checkedInCount} / ${attendees.length}`} hint={`${metrics.checkInRate}%`} tone={metrics.checkInRate >= 80 ? 'emerald' : 'sky'} />
      </section>

      <Panel className="p-2">
        <div className="grid grid-cols-2 gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`min-h-11 rounded-lg px-4 text-sm font-black transition ${activeTab === tab.id ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </Panel>

      {attendeesQuery.error && (
        <ErrorState error={attendeesQuery.error} title="Không tải được khách mời" />
      )}

      {activeTab === 'guests' ? (
        <AttendeeInvitePanel {...attendeeInvite} typeLabels={TYPE_LABELS} statusLabels={STATUS_LABELS} />
      ) : (
        <CheckInDeskPanel {...checkInDesk} typeLabels={TYPE_LABELS} statusLabels={STATUS_LABELS} />
      )}
    </div>
  );
};

export default EventCheckInSessionPage;
