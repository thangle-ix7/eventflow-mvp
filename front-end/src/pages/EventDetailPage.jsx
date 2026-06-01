import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  ClipboardList,
  MapPin,
  Users,
} from 'lucide-react';
import AppLayout from '../components/AppLayout';
import { ErrorState, LoadingState, PageHeader, Panel, StatusBadge } from '../components/ui';
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

        {eventQuery.isLoading && <LoadingState message="Đang tải thông tin sự kiện..." />}

        {eventQuery.error && (
          <ErrorState error={eventQuery.error} title="Không tải được thông tin sự kiện" />
        )}

        {event && (
          <>
            <Panel className="p-5">
              <div className="mb-4 flex flex-wrap gap-2">
                <StatusBadge status={event.role} />
                <StatusBadge status={event.status || 'ACTIVE'} />
              </div>
              <PageHeader
                title={event.name}
                description={event.description || 'Chưa có mô tả cho sự kiện này.'}
                meta={
                  <>
                    <span className="inline-flex items-center gap-2">
                      <CalendarDays size={16} />
                      Bắt đầu: {formatDate(event.startTime || event.eventDate)}
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <MapPin size={16} />
                      {event.location || 'Chưa có địa điểm'}
                    </span>
                  </>
                }
              />
            </Panel>

            <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <QuickLink
                to={`/events/${eventId}/tasks`}
                icon={<ClipboardList size={22} />}
                title="Công việc"
                description="Xem danh sách, tạo mới, cập nhật tiến độ và phân công."
              />
              <QuickLink
                to={`/events/${eventId}/departments`}
                icon={<Users size={22} />}
                title="Ban tổ chức"
                description="Quản lý ban phụ trách và công việc theo từng nhóm."
              />
              <QuickLink
                to={`/events/${eventId}/members`}
                icon={<Users size={22} />}
                title="Thành viên"
                description="Quản lý thành viên sự kiện."
              />
              <QuickLink
                to={`/events/${eventId}/dashboard`}
                icon={<BarChart3 size={22} />}
                title="Dashboard"
                description="Tổng quan tiến độ, trạng thái và công việc sắp tới."
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
      <div className="rounded-xl border border-slate-200 bg-white p-4 opacity-60 shadow-sm">
        <div className="text-slate-400">{icon}</div>
        <h3 className="mt-3 font-semibold text-slate-950">{title}</h3>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
    );
  }

  return (
    <Link
      to={to}
      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50/60"
    >
      <div className="text-indigo-600">{icon}</div>
      <h3 className="mt-3 font-semibold text-slate-950">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </Link>
  );
};

export default EventDetailPage;
