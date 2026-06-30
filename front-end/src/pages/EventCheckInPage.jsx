import { ClipboardCheck, ListChecks, UsersRound } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { ErrorState, LoadingState, MetricCard, PageHeader } from '../components/ui';
import SessionCreatePanel from './check-in/SessionCreatePanel';
import SessionListPanel from './check-in/SessionListPanel';
import useCheckInSessionsData from './check-in/useCheckInSessionsData';

const EventCheckInPage = () => {
  const { eventId } = useParams();
  const {
    canManage,
    eventQuery,
    sessionsQuery,
    sessions,
    metrics,
    sessionForm,
    setSessionForm,
    createSessionMutation,
  } = useCheckInSessionsData(eventId);

  if (eventQuery.isLoading || sessionsQuery.isLoading) {
    return <LoadingState message="Đang tải session check-in..." />;
  }

  if (eventQuery.error || sessionsQuery.error) {
    return <ErrorState error={eventQuery.error || sessionsQuery.error} title="Không tải được check-in" />;
  }

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Check-in" title="Session check-in" />

      <section className="grid gap-3 md:grid-cols-4">
        <MetricCard icon={ListChecks} label="Session" value={metrics.sessionCount} hint="Đã tạo" tone="sky" />
        <MetricCard icon={UsersRound} label="Khách mời" value={metrics.attendeeCount} hint="Tất cả session" tone="indigo" />
        <MetricCard icon={ClipboardCheck} label="Đã check-in" value={metrics.checkedInCount} hint="Tổng lượt" tone="emerald" />
        <MetricCard icon={ClipboardCheck} label="Tỷ lệ" value={`${metrics.checkInRate}%`} hint="Toàn bộ session" tone={metrics.checkInRate >= 80 ? 'emerald' : 'amber'} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.78fr_1.22fr]">
        <SessionCreatePanel
          canManage={canManage}
          event={eventQuery.data}
          eventId={eventId}
          sessionForm={sessionForm}
          setSessionForm={setSessionForm}
          createSessionMutation={createSessionMutation}
        />
        <SessionListPanel eventId={eventId} sessions={sessions} />
      </section>
    </div>
  );
};

export default EventCheckInPage;
