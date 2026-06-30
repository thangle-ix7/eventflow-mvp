import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import MilestoneCreateModal from '../components/MilestoneCreateModal';
import { ErrorState, LoadingState } from '../components/ui';
import eventApi from '../api/eventApi';
import { getEventPermissions } from '../utils/permissionUtils';

const EventMilestoneCreatePage = ({ user, onLogout }) => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const returnPath = `/events/${eventId}/milestones`;

  const eventQuery = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => eventApi.getEvent(eventId),
    enabled: Boolean(eventId),
  });

  const event = eventQuery.data;
  const permissions = getEventPermissions(event);

  const handleClose = () => {
    navigate(returnPath, { replace: true });
  };

  return (
    <AppLayout
      user={user}
      events={event ? [event] : []}
      selectedEvent={event}
      onEventChange={() => {}}
      onLogout={onLogout}
    >
      {eventQuery.isLoading && <LoadingState message="Đang tải sự kiện..." />}

      {eventQuery.error && (
        <ErrorState error={eventQuery.error} title="Không tải được sự kiện" />
      )}

      {!eventQuery.isLoading && event && !permissions.canManageEvent && (
        <ErrorState
          error="Chỉ leader của sự kiện mới được tạo cột mốc."
          title="Không có quyền tạo cột mốc"
        />
      )}

      {!eventQuery.isLoading && event && permissions.canManageEvent && (
        <MilestoneCreateModal
          eventId={eventId}
          event={event}
          isOpen
          onCancel={handleClose}
          onCreated={handleClose}
        />
      )}
    </AppLayout>
  );
};

export default EventMilestoneCreatePage;
