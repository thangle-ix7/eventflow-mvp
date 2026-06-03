import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, Loader2, Save } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import { Button, ErrorState, LoadingState, Panel } from '../components/ui';
import eventApi from '../api/eventApi';

const pad = (value) => String(value).padStart(2, '0');

const toDateTimeLocalValue = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const EventEditPage = ({ user, onLogout }) => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const eventQuery = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => eventApi.getEvent(eventId),
    enabled: Boolean(eventId),
  });

  const updateEventMutation = useMutation({
    mutationFn: eventApi.updateEvent,
    onSuccess: (updatedEvent) => {
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['eventsPage'] });
      navigate(`/events/${updatedEvent.id}`, { replace: true });
    },
  });

  const isLeader = eventQuery.data?.role === 'LEADER';
  const title = useMemo(() => eventQuery.data?.name || 'Sự kiện', [eventQuery.data?.name]);

  return (
    <AppLayout user={user} events={eventQuery.data ? [eventQuery.data] : []} selectedEvent={eventQuery.data} onEventChange={() => {}} onLogout={onLogout}>
      <div className="mx-auto max-w-2xl space-y-6">
        {eventQuery.isLoading && <LoadingState message="Đang tải thông tin sự kiện..." />}
        {eventQuery.error && <ErrorState error={eventQuery.error} title="Không tải được thông tin sự kiện" />}

        {!eventQuery.isLoading && eventQuery.data && !isLeader && (
          <ErrorState error="Chỉ leader của sự kiện mới được sửa thông tin sự kiện." title="Không có quyền sửa" />
        )}

        {!eventQuery.isLoading && eventQuery.data && isLeader && (
          <Panel className="overflow-hidden">
            <div className="border-b border-slate-100 bg-indigo-50/60 p-5">
              <p className="text-sm font-semibold text-indigo-600">Sửa sự kiện</p>
              <h2 className="mt-1 text-2xl font-extrabold text-slate-950">{title}</h2>
            </div>

            <EventEditForm
              key={eventQuery.data.id}
              event={eventQuery.data}
              eventId={eventId}
              mutation={updateEventMutation}
            />
          </Panel>
        )}
      </div>
    </AppLayout>
  );
};

const EventEditForm = ({ event, eventId, mutation }) => {
  const [localError, setLocalError] = useState('');
  const [form, setForm] = useState({
    name: event.name || '',
    description: event.description || '',
    location: event.location || '',
    startTime: toDateTimeLocalValue(event.startTime || event.eventDate),
    endTime: toDateTimeLocalValue(event.endTime),
    status: event.status || 'ACTIVE',
  });

  const handleChange = (changeEvent) => {
    const { name, value } = changeEvent.target;
    setLocalError('');
    setForm((old) => ({ ...old, [name]: value }));
  };

  const handleSubmit = (submitEvent) => {
    submitEvent.preventDefault();
    if (form.endTime && form.startTime && form.endTime < form.startTime) {
      setLocalError('Thời gian kết thúc phải sau thời gian bắt đầu.');
      return;
    }

    mutation.mutate({
      eventId,
      payload: {
        name: form.name,
        description: form.description,
        location: form.location,
        startTime: form.startTime,
        endTime: form.endTime || null,
        status: form.status,
      },
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-5">
      {(localError || mutation.error) && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <span>{localError || mutation.error.userMessage || mutation.error.message}</span>
        </div>
      )}

      <Field label="Tên sự kiện">
        <input
          name="name"
          value={form.name}
          onChange={handleChange}
          required
          maxLength={255}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        />
      </Field>

      <Field label="Mô tả chi tiết">
        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
          maxLength={2000}
          rows={4}
          className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        />
      </Field>

      <Field label="Địa điểm">
        <input
          name="location"
          value={form.location}
          onChange={handleChange}
          maxLength={255}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Thời gian bắt đầu">
          <input
            name="startTime"
            type="datetime-local"
            value={form.startTime}
            onChange={handleChange}
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        </Field>

        <Field label="Thời gian kết thúc">
          <input
            name="endTime"
            type="datetime-local"
            value={form.endTime}
            onChange={handleChange}
            min={form.startTime || undefined}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        </Field>
      </div>

      <Field label="Trạng thái">
        <select
          name="status"
          value={form.status}
          onChange={handleChange}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        >
          <option value="ACTIVE">Đang diễn ra</option>
          <option value="DONE">Hoàn thành</option>
          <option value="CANCELLED">Đã hủy</option>
        </select>
      </Field>

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <Button as={Link} to={`/events/${eventId}`} variant="secondary">
          Hủy
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Lưu thay đổi
        </Button>
      </div>
    </form>
  );
};

const Field = ({ label, children }) => (
  <label className="block">
    <span className="text-sm font-semibold text-slate-700">{label}</span>
    <div className="mt-1">{children}</div>
  </label>
);

export default EventEditPage;
