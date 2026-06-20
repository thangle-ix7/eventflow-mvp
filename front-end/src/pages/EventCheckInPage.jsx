import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useSearchParams } from 'react-router-dom';
import { CheckCircle2, ClipboardCheck, Plus, QrCode, Search, Trash2, UsersRound } from 'lucide-react';
import eventApi from '../api/eventApi';
import eventAttendeeApi from '../api/eventAttendeeApi';
import {
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  MetricCard,
  PageHeader,
  Panel,
  SelectControl,
  StatusBadge,
  TextInput,
} from '../components/ui';
import { getEventPermissions } from '../utils/permissionUtils';

const emptyAttendee = {
  fullName: '',
  email: '',
  phone: '',
  attendeeType: 'GUEST',
  status: 'INVITED',
  note: '',
};

const statusLabels = {
  INVITED: 'Da moi',
  CONFIRMED: 'Da xac nhan',
  CHECKED_IN: 'Da check-in',
  NO_SHOW: 'Vang mat',
};

const typeLabels = {
  GUEST: 'Khach moi',
  VIP: 'VIP',
  SPEAKER: 'Speaker',
  SPONSOR: 'Sponsor',
  STAFF: 'Staff',
};

const EventCheckInPage = () => {
  const { eventId } = useParams();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(emptyAttendee);
  const [checkInToken, setCheckInToken] = useState(() => searchParams.get('token') || '');
  const [lastCheckIn, setLastCheckIn] = useState(null);

  const eventQuery = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => eventApi.getEvent(eventId),
    enabled: Boolean(eventId),
  });

  const attendeesQuery = useQuery({
    queryKey: ['eventAttendees', eventId, statusFilter],
    queryFn: () => eventAttendeeApi.getAttendees({ eventId, status: statusFilter }),
    enabled: Boolean(eventId),
  });

  const event = eventQuery.data;
  const canManage = getEventPermissions(event).canManageEvent;
  const attendees = useMemo(() => attendeesQuery.data || [], [attendeesQuery.data]);
  const filteredAttendees = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) {
      return attendees;
    }

    return attendees.filter((attendee) => (
      `${attendee.fullName} ${attendee.email || ''} ${attendee.phone || ''}`.toLowerCase().includes(needle)
    ));
  }, [attendees, search]);

  const checkedInCount = attendees.filter((attendee) => attendee.status === 'CHECKED_IN').length;
  const confirmedCount = attendees.filter((attendee) => attendee.status === 'CONFIRMED').length;
  const checkInRate = attendees.length ? Math.round((checkedInCount / attendees.length) * 100) : 0;

  const invalidateAttendees = () => {
    queryClient.invalidateQueries({ queryKey: ['eventAttendees', eventId] });
  };

  const createAttendeeMutation = useMutation({
    mutationFn: eventAttendeeApi.createAttendee,
    onSuccess: () => {
      setForm(emptyAttendee);
      invalidateAttendees();
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

  const checkInMutation = useMutation({
    mutationFn: eventAttendeeApi.checkIn,
    onSuccess: (response) => {
      setLastCheckIn(response);
      setCheckInToken('');
      invalidateAttendees();
    },
  });

  if (eventQuery.isLoading || attendeesQuery.isLoading) {
    return <LoadingState message="Dang tai danh sach check-in..." />;
  }

  if (eventQuery.error || attendeesQuery.error) {
    return <ErrorState error={eventQuery.error || attendeesQuery.error} title="Khong tai duoc check-in" />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Event tools"
        title="QR Check-in"
        description="Quan ly khach moi, token QR va check-in trong ngay su kien."
      />

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard icon={UsersRound} label="Khach moi" value={attendees.length} hint="Tong attendee" tone="indigo" />
        <MetricCard icon={CheckCircle2} label="Da xac nhan" value={confirmedCount} hint="RSVP/confirmed" tone="amber" />
        <MetricCard icon={ClipboardCheck} label="Da check-in" value={checkedInCount} hint="Co mat thuc te" tone="emerald" />
        <MetricCard icon={QrCode} label="Ty le check-in" value={`${checkInRate}%`} hint="Theo danh sach hien tai" tone={checkInRate >= 80 ? 'emerald' : 'violet'} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Panel className="p-5">
          <h3 className="text-lg font-extrabold text-slate-950">Quay check-in</h3>
          <form
            className="mt-4 grid gap-3"
            onSubmit={(eventSubmit) => {
              eventSubmit.preventDefault();
              checkInMutation.mutate({ eventId, payload: { qrToken: checkInToken.trim() } });
            }}
          >
            <TextInput
              icon={QrCode}
              value={checkInToken}
              placeholder="Quet hoac nhap QR token"
              onChange={(eventChange) => setCheckInToken(eventChange.target.value)}
            />
            <Button type="submit" disabled={!checkInToken.trim() || checkInMutation.isPending}>
              <ClipboardCheck className="h-4 w-4" />
              Check-in
            </Button>
          </form>

          {checkInMutation.error && (
            <div className="mt-4">
              <ErrorState error={checkInMutation.error} title="Check-in khong thanh cong" />
            </div>
          )}

          {lastCheckIn && (
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
              <p className="font-bold">{lastCheckIn.message}</p>
              <p className="mt-1 text-sm">{lastCheckIn.attendee?.fullName}</p>
            </div>
          )}

          {canManage && (
            <form
              className="mt-6 grid gap-3 border-t border-slate-100 pt-5"
              onSubmit={(eventSubmit) => {
                eventSubmit.preventDefault();
                createAttendeeMutation.mutate({ eventId, payload: form });
              }}
            >
              <h4 className="font-bold text-slate-950">Them khach moi</h4>
              <TextInput icon={null} value={form.fullName} placeholder="Ho ten" onChange={(eventChange) => setForm((old) => ({ ...old, fullName: eventChange.target.value }))} />
              <div className="grid gap-3 sm:grid-cols-2">
                <TextInput icon={null} type="email" value={form.email} placeholder="Email" onChange={(eventChange) => setForm((old) => ({ ...old, email: eventChange.target.value }))} />
                <TextInput icon={null} value={form.phone} placeholder="So dien thoai" onChange={(eventChange) => setForm((old) => ({ ...old, phone: eventChange.target.value }))} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <SelectControl label="Loai khach" value={form.attendeeType} onChange={(eventChange) => setForm((old) => ({ ...old, attendeeType: eventChange.target.value }))}>
                  {Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </SelectControl>
                <SelectControl label="Trang thai" value={form.status} onChange={(eventChange) => setForm((old) => ({ ...old, status: eventChange.target.value }))}>
                  {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </SelectControl>
              </div>
              <Button type="submit" disabled={!form.fullName.trim() || createAttendeeMutation.isPending}>
                <Plus className="h-4 w-4" />
                Them attendee
              </Button>
            </form>
          )}
        </Panel>

        <Panel className="p-5">
          <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
            <TextInput icon={Search} value={search} placeholder="Tim theo ten, email, so dien thoai" onChange={(eventChange) => setSearch(eventChange.target.value)} />
            <SelectControl value={statusFilter} onChange={(eventChange) => setStatusFilter(eventChange.target.value)}>
              <option value="">Tat ca trang thai</option>
              {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </SelectControl>
          </div>

          <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
            <div className="hidden grid-cols-[1.4fr_0.8fr_0.8fr_1fr_auto] gap-3 bg-slate-50 px-4 py-3 text-xs font-bold uppercase text-slate-500 md:grid">
              <span>Khach moi</span>
              <span>Loai</span>
              <span>Trang thai</span>
              <span>Ma check-in</span>
              <span />
            </div>
            <div className="divide-y divide-slate-100">
              {filteredAttendees.map((attendee) => (
                <div key={attendee.id} className="grid gap-3 px-4 py-4 md:grid-cols-[1.4fr_0.8fr_0.8fr_1fr_auto] md:items-center">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-950">{attendee.fullName}</p>
                    <p className="mt-1 truncate text-sm text-slate-500">{attendee.email || attendee.phone || 'Chua co lien he'}</p>
                  </div>
                  <span className="text-sm font-semibold text-slate-700">{typeLabels[attendee.attendeeType] || attendee.attendeeType}</span>
                  <StatusBadge status={attendee.status === 'CHECKED_IN' ? 'DONE' : attendee.status === 'CONFIRMED' ? 'ACTIVE' : 'TODO'}>
                    {statusLabels[attendee.status] || attendee.status}
                  </StatusBadge>
                  <code className="break-all rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{attendee.qrToken}</code>
                  <div className="flex items-center justify-end gap-2">
                    {attendee.status !== 'CHECKED_IN' && (
                      <Button type="button" variant="secondary" className="min-h-9 px-3" onClick={() => checkInMutation.mutate({ eventId, payload: { attendeeId: attendee.id } })}>
                        Check-in
                      </Button>
                    )}
                    {canManage && attendee.status === 'INVITED' && (
                      <button type="button" className="rounded-lg p-2 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600" onClick={() => confirmAttendeeMutation.mutate({ eventId, attendeeId: attendee.id })}>
                        <CheckCircle2 className="h-4 w-4" />
                      </button>
                    )}
                    {canManage && (
                      <button type="button" className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" onClick={() => deleteAttendeeMutation.mutate({ eventId, attendeeId: attendee.id })}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {filteredAttendees.length === 0 && (
                <div className="p-4">
                  <EmptyState icon={QrCode} title="Chua co attendee phu hop" description="Them khach moi de bat dau quy trinh QR check-in." />
                </div>
              )}
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
};

export default EventCheckInPage;
