import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import eventApi from '../../api/eventApi';
import eventAttendeeApi from '../../api/eventAttendeeApi';
import { getEventPermissions } from '../../utils/permissionUtils';
import { EMPTY_SESSION } from './checkInConstants';

const useCheckInSessionsData = (eventId) => {
  const queryClient = useQueryClient();
  const [sessionForm, setSessionForm] = useState(EMPTY_SESSION);

  const eventQuery = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => eventApi.getEvent(eventId),
    enabled: Boolean(eventId),
  });

  const sessionsQuery = useQuery({
    queryKey: ['checkInSessions', eventId],
    queryFn: () => eventAttendeeApi.getSessions(eventId),
    enabled: Boolean(eventId),
  });

  const sessions = useMemo(() => sessionsQuery.data || [], [sessionsQuery.data]);
  const canManage = getEventPermissions(eventQuery.data).canManageEvent;
  const attendeeCount = sessions.reduce((sum, session) => sum + (Number(session.attendeeCount) || 0), 0);
  const checkedInCount = sessions.reduce((sum, session) => sum + (Number(session.checkedInCount) || 0), 0);
  const checkInRate = attendeeCount ? Math.round((checkedInCount / attendeeCount) * 100) : 0;

  const createSessionMutation = useMutation({
    mutationFn: eventAttendeeApi.createSession,
    onSuccess: () => {
      setSessionForm(EMPTY_SESSION);
      queryClient.invalidateQueries({ queryKey: ['checkInSessions', eventId] });
    },
  });

  return {
    canManage,
    eventQuery,
    sessionsQuery,
    sessions,
    metrics: {
      sessionCount: sessions.length,
      attendeeCount,
      checkedInCount,
      checkInRate,
    },
    sessionForm,
    setSessionForm,
    createSessionMutation,
  };
};

export default useCheckInSessionsData;
