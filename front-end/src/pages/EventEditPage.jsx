import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  CalendarPlus,
  Clock3,
  FileText,
  Loader2,
  MapPin,
  Save,
  Sparkles,
  Tag,
  Target,
  UsersRound,
} from 'lucide-react';
import AppLayout from '../components/AppLayout';
import { Button, ErrorState, LoadingState, Panel } from '../components/ui';
import eventApi from '../api/eventApi';
import { EVENT_TYPE_OPTIONS } from '../utils/eventTypeUtils';

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
    <AppLayout
      user={user}
      events={eventQuery.data ? [eventQuery.data] : []}
      selectedEvent={eventQuery.data}
      onEventChange={() => {}}
      onLogout={onLogout}
    >
      <div className="mx-auto max-w-5xl space-y-6">
        {eventQuery.isLoading && <LoadingState message="Đang tải thông tin sự kiện..." />}

        {eventQuery.error && (
          <ErrorState
            error={eventQuery.error}
            title="Không tải được thông tin sự kiện"
          />
        )}

        {!eventQuery.isLoading && eventQuery.data && !isLeader && (
          <ErrorState
            error="Chỉ leader của sự kiện mới được sửa thông tin sự kiện."
            title="Không có quyền sửa"
          />
        )}

        {!eventQuery.isLoading && eventQuery.data && isLeader && (
          <div>
            <Panel className="relative overflow-hidden">
              <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-sky-100 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-28 left-1/3 h-72 w-72 rounded-full bg-emerald-100/70 blur-3xl" />

              <div className="relative border-b border-sky-100 bg-gradient-to-r from-sky-50 via-white to-emerald-50 px-6 py-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br from-sky-500 to-emerald-400 text-white shadow-lg shadow-cyan-100">
                    <CalendarPlus className="h-7 w-7" strokeWidth={1.8} />
                  </div>

                  <div className="min-w-0">
                    <p className="inline-flex rounded-full bg-sky-50 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-sky-600">
                      Sửa sự kiện
                    </p>

                    <h2 className="mt-3 truncate text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                      {title}
                    </h2>
                  </div>
                </div>
              </div>

              <EventEditForm
                key={eventQuery.data.id}
                event={eventQuery.data}
                eventId={eventId}
                mutation={updateEventMutation}
              />
            </Panel>
          </div>
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
    eventType: event.eventType || '',
    objective: event.objective || '',
    expectedAttendees: event.expectedAttendees ?? '',
    scale: event.scale || '',
    contextDescription: event.contextDescription || '',
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
        eventType: form.eventType || null,
        objective: form.objective,
        expectedAttendees: form.expectedAttendees ? Number(form.expectedAttendees) : null,
        scale: form.scale,
        contextDescription: form.contextDescription || form.description,
        startTime: form.startTime,
        endTime: form.endTime || null,
        status: form.status,
      },
    });
  };

  return (
    <form onSubmit={handleSubmit} className="relative space-y-5 p-6">
      {(localError || mutation.error) && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-red-600 shadow-sm">
            <AlertCircle size={18} />
          </div>
          <span className="leading-6">
            {localError || mutation.error?.userMessage || mutation.error?.message}
          </span>
        </div>
      )}

      <Field
        label="Tên sự kiện"
        icon={<CalendarPlus className="h-4 w-4" strokeWidth={1.8} />}
        hint="Tên nên rõ ràng, dễ nhận diện với thành viên."
      >
        <input
          name="name"
          value={form.name}
          onChange={handleChange}
          required
          maxLength={255}
          className={inputClassName}
        />
      </Field>

      <Field
        label="Loại sự kiện"
        icon={<Tag className="h-4 w-4" strokeWidth={1.8} />}
        hint="Phân loại này sẽ được dùng cho template, AI planning và leader snapshot sau beta."
      >
        <select
          name="eventType"
          value={form.eventType}
          onChange={handleChange}
          className={inputClassName}
        >
          <option value="">-- Chọn loại sự kiện --</option>
          {EVENT_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </Field>

      <Field
        label="Mô tả chi tiết"
        icon={<FileText className="h-4 w-4" strokeWidth={1.8} />}
        hint="Mô tả mục tiêu, phạm vi và các hoạt động chính của sự kiện."
      >
        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
          maxLength={2000}
          rows={5}
          className={`${inputClassName} min-h-32 resize-y py-3`}
        />
      </Field>

      <Field
        label="Mục tiêu sự kiện"
        icon={<Target className="h-4 w-4" strokeWidth={1.8} />}
      >
        <textarea
          name="objective"
          value={form.objective}
          onChange={handleChange}
          maxLength={2000}
          rows={3}
          className={`${inputClassName} min-h-24 resize-y py-3`}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Số người dự kiến"
          icon={<UsersRound className="h-4 w-4" strokeWidth={1.8} />}
        >
          <input
            name="expectedAttendees"
            type="number"
            min="0"
            value={form.expectedAttendees}
            onChange={handleChange}
            className={inputClassName}
          />
        </Field>

        <Field
          label="Quy mô"
          icon={<Sparkles className="h-4 w-4" strokeWidth={1.8} />}
        >
          <input
            name="scale"
            value={form.scale}
            onChange={handleChange}
            maxLength={100}
            className={inputClassName}
          />
        </Field>
      </div>

      <Field
        label="Bối cảnh vận hành"
        icon={<FileText className="h-4 w-4" strokeWidth={1.8} />}
        hint="Thông tin bối cảnh giúp AI/template đưa ra gợi ý sát hơn."
      >
        <textarea
          name="contextDescription"
          value={form.contextDescription}
          onChange={handleChange}
          maxLength={2000}
          rows={3}
          className={`${inputClassName} min-h-24 resize-y py-3`}
        />
      </Field>

      <Field
        label="Địa điểm"
        icon={<MapPin className="h-4 w-4" strokeWidth={1.8} />}
      >
        <input
          name="location"
          value={form.location}
          onChange={handleChange}
          maxLength={255}
          className={inputClassName}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Thời gian bắt đầu"
          icon={<Clock3 className="h-4 w-4" strokeWidth={1.8} />}
        >
          <input
            name="startTime"
            type="datetime-local"
            value={form.startTime}
            onChange={handleChange}
            required
            className={inputClassName}
          />
        </Field>

        <Field
          label="Thời gian kết thúc"
          icon={<Clock3 className="h-4 w-4" strokeWidth={1.8} />}
        >
          <input
            name="endTime"
            type="datetime-local"
            value={form.endTime}
            onChange={handleChange}
            min={form.startTime || undefined}
            className={inputClassName}
          />
        </Field>
      </div>

      <Field
        label="Trạng thái"
        icon={<Sparkles className="h-4 w-4" strokeWidth={1.8} />}
      >
        <select
          name="status"
          value={form.status}
          onChange={handleChange}
          className={inputClassName}
        >
          <option value="ACTIVE">Đang diễn ra</option>
          <option value="DONE">Hoàn thành</option>
          <option value="CANCELLED">Đã hủy</option>
        </select>
      </Field>

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <Button
          as={Link}
          to={`/events/${eventId}`}
          variant="secondary"
          className="rounded-2xl border-sky-100 bg-white font-black text-slate-600 shadow-sm hover:bg-sky-50 hover:text-sky-600"
        >
          Hủy
        </Button>

        <Button
          type="submit"
          disabled={mutation.isPending}
          className="rounded-2xl bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400 font-black text-white shadow-xl shadow-cyan-100 transition hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-cyan-200"
        >
          {mutation.isPending ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Save size={16} />
          )}
          Lưu thay đổi
        </Button>
      </div>
    </form>
  );
};

const Field = ({ label, children }) => (
  <label className="block">
    <span className="text-sm font-black text-slate-700">{label}</span>
    <div className="mt-2">{children}</div>
  </label>
);


const inputClassName = 'w-full rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-cyan-300 focus:bg-white focus:ring-4 focus:ring-cyan-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500';

export default EventEditPage;
