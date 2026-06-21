import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import eventApi from '../../api/eventApi';
import eventAttendeeApi from '../../api/eventAttendeeApi';
import { getEventPermissions } from '../../utils/permissionUtils';
import { downloadBlob } from './checkInUtils';
import { EMPTY_ATTENDEE } from './checkInConstants';

const useCheckInPageData = (eventId, sessionId) => {
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(EMPTY_ATTENDEE);
  const [importFile, setImportFile] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [checkInToken, setCheckInToken] = useState(() => searchParams.get('token') || searchParams.get('code') || '');
  const [lastCheckIn, setLastCheckIn] = useState(null);
  const [inviteResult, setInviteResult] = useState(null);

  const effectiveSessionId = sessionId ? String(sessionId) : '';

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

  const attendeesQuery = useQuery({
    queryKey: ['eventAttendees', eventId, effectiveSessionId, statusFilter],
    queryFn: () => eventAttendeeApi.getAttendees({
      eventId,
      status: statusFilter,
      sessionId: effectiveSessionId,
    }),
    enabled: Boolean(eventId && effectiveSessionId),
  });

  const sessions = useMemo(() => sessionsQuery.data || [], [sessionsQuery.data]);
  const selectedSession = sessions.find((session) => String(session.id) === effectiveSessionId);
  const event = eventQuery.data;
  const canManage = getEventPermissions(event).canManageEvent;
  const attendees = useMemo(() => attendeesQuery.data || [], [attendeesQuery.data]);
  const filteredAttendees = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const matchedAttendees = needle
      ? attendees.filter((attendee) => (
        `${attendee.fullName} ${attendee.email || ''} ${attendee.phone || ''}`.toLowerCase().includes(needle)
      ))
      : attendees;

    return [...matchedAttendees].sort((left, right) => {
      const leftCheckedIn = left.status === 'CHECKED_IN';
      const rightCheckedIn = right.status === 'CHECKED_IN';
      if (leftCheckedIn === rightCheckedIn) {
        return 0;
      }

      return leftCheckedIn ? 1 : -1;
    });
  }, [attendees, search]);

  const checkedInCount = attendees.filter((attendee) => attendee.status === 'CHECKED_IN').length;
  const confirmedCount = attendees.filter((attendee) => attendee.status === 'CONFIRMED').length;
  const checkInRate = attendees.length ? Math.round((checkedInCount / attendees.length) * 100) : 0;

  const invalidateAttendees = () => {
    queryClient.invalidateQueries({ queryKey: ['eventAttendees', eventId] });
    queryClient.invalidateQueries({ queryKey: ['checkInSessions', eventId] });
  };

  const sendInviteMutation = useMutation({
    mutationFn: eventAttendeeApi.sendAttendeeInvitation,
    onSuccess: (response) => setInviteResult(response),
  });

  const createAttendeeMutation = useMutation({
    mutationFn: eventAttendeeApi.createAttendee,
    onSuccess: (attendee) => {
      setForm(EMPTY_ATTENDEE);
      invalidateAttendees();
      if (attendee?.email) {
        sendInviteMutation.mutate({ eventId, attendeeId: attendee.id });
      } else {
        setInviteResult({
          sentCount: 0,
          skippedCount: 1,
          errors: ['Khách mời đã được tạo nhưng chưa gửi email vì chưa có địa chỉ email.'],
        });
      }
    },
  });

  const deleteAttendeeMutation = useMutation({
    mutationFn: eventAttendeeApi.deleteAttendee,
    onSuccess: invalidateAttendees,
  });

  const confirmAttendeeMutation = useMutation({
    mutationFn: eventAttendeeApi.confirmAttendee,
    onSuccess: invalidateAttendees,
  });

  const sendSessionInvitesMutation = useMutation({
    mutationFn: eventAttendeeApi.sendSessionInvitations,
    onSuccess: (response) => setInviteResult(response),
  });

  const checkInMutation = useMutation({
    mutationFn: eventAttendeeApi.checkIn,
    onSuccess: (response) => {
      setLastCheckIn(response);
      setCheckInToken('');
      invalidateAttendees();
    },
  });

  const importMutation = useMutation({
    mutationFn: eventAttendeeApi.importAttendees,
    onSuccess: (response) => {
      setImportResult(response);
      setImportFile(null);
      invalidateAttendees();
    },
  });

  const templateMutation = useMutation({
    mutationFn: eventAttendeeApi.downloadImportTemplate,
    onSuccess: (blob) => downloadBlob(blob, 'eventflow-checkin-attendees-template.xlsx'),
  });

  return {
    canManage,
    eventQuery,
    sessionsQuery,
    attendeesQuery,
    sessions,
    effectiveSessionId,
    selectedSession,
    attendees,
    filteredAttendees,
    metrics: {
      confirmedCount,
      checkedInCount,
      checkInRate,
    },
    attendeeInvite: {
      canManage,
      effectiveSessionId,
      form,
      setForm,
      createAttendeeMutation,
      eventId,
      templateMutation,
      importFile,
      setImportFile,
      importMutation,
      importResult,
    },
    checkInDesk: {
      canManage,
      effectiveSessionId,
      selectedSession,
      checkInToken,
      setCheckInToken,
      checkInMutation,
      lastCheckIn,
      inviteResult,
      sendInviteMutation,
      sendSessionInvitesMutation,
      search,
      setSearch,
      statusFilter,
      setStatusFilter,
      filteredAttendees,
      eventId,
      confirmAttendeeMutation,
      deleteAttendeeMutation,
    },
  };
};

export default useCheckInPageData;


