import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  ClipboardList,
  Loader2,
  MapPin,
  Users,
} from 'lucide-react';
import AppLayout from '../components/AppLayout';
import eventApi from '../api/eventApi';
import { formatDate } from '../utils/dateUtils';

const EventDetailPage = ({ user, onLogout }) => {
  const { eventId } = useParams();

  const eventQuery = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => eventApi.getEvent(eventId),
    enabled: Boolean(eventId),
  });

  const event = eventQuery.data;
  const isLeader = event?.role === 'LEADER';

  return (
    <AppLayout
      user={user}
      events={event ? [event] : []}
      selectedEvent={event}
      onEventChange={() => {}}
      onLogout={onLogout}
    >
      <div className="space-y-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700"
        >
          <ArrowLeft size={16} />
          Quay lại danh sách sự kiện
        </Link>

        {eventQuery.isLoading && (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white p-8 text-gray-500">
            <Loader2 size={20} className="animate-spin" />
            Đang tải thông tin sự kiện...
          </div>
        )}

        {eventQuery.error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            {eventQuery.error.userMessage || eventQuery.error.message}
          </div>
        )}

        {event && (
          <>
            <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-2xl font-bold text-gray-900">{event.name}</h2>
                    <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                      {event.role}
                    </span>
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                      {event.status}
                    </span>
                  </div>
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">
                    {event.description || 'Chưa có mô tả cho sự kiện này.'}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-500">
                    <span className="inline-flex items-center gap-2">
                      <CalendarDays size={16} />
                      Bắt đầu: {formatDate(event.startTime || event.eventDate)}
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <MapPin size={16} />
                      {event.location || 'Chưa có địa điểm'}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <QuickLink
                to={`/events/${eventId}/tasks`}
                icon={<ClipboardList size={22} />}
                title="Tasks"
                description="Xem danh sách task, tạo, cập nhật, assign."
              />
              <QuickLink
                to={`/events/${eventId}/departments`}
                icon={<Users size={22} />}
                title="Departments"
                description="Quản lý ban và task theo từng ban."
              />
              <QuickLink
                to={`/events/${eventId}/members`}
                icon={<Users size={22} />}
                title="Members"
                description="Quản lý thành viên sự kiện."
              />
              <QuickLink
                to={`/events/${eventId}/dashboard`}
                icon={<BarChart3 size={22} />}
                title="Dashboard"
                description="Tổng quan, line chart và column chart."
                disabled={!isLeader}
              />
            </section>
          </>
        )}
      </div>
    </AppLayout>
  );
};

const QuickLink = ({ to, icon, title, description, disabled = false }) => {
  if (disabled) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4 opacity-60 shadow-sm">
        <div className="text-gray-400">{icon}</div>
        <h3 className="mt-3 font-semibold text-gray-900">{title}</h3>
        <p className="mt-1 text-sm text-gray-500">{description}</p>
      </div>
    );
  }

  return (
    <Link
      to={to}
      className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-blue-200 hover:bg-blue-50"
    >
      <div className="text-blue-600">{icon}</div>
      <h3 className="mt-3 font-semibold text-gray-900">{title}</h3>
      <p className="mt-1 text-sm text-gray-500">{description}</p>
    </Link>
  );
};

export default EventDetailPage;
