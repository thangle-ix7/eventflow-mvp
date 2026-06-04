import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import {
  BarChart3,
  Building2,
  CalendarDays,
  ClipboardList,
  Edit,
  Mail,
  MapPin,
  Send,
  UserRound,
  Users,
} from 'lucide-react';
import AppLayout from '../components/AppLayout';
import UserAvatar from '../components/UserAvatar';
import { Button, EmptyState, ErrorState, LoadingState, PageHeader, Panel, StatusBadge } from '../components/ui';
import departmentApi from '../api/departmentApi';
import eventApi from '../api/eventApi';
import eventMemberApi from '../api/eventMemberApi';
import taskApi from '../api/taskApi';
import { formatDate } from '../utils/dateUtils';
import { getDepartmentHomePath, getEventPermissions } from '../utils/permissionUtils';

const EMPTY_DEPARTMENTS = [];
const EMPTY_MEMBERS = [];

const EventDetailPage = ({ user, onLogout }) => {
  const { eventId } = useParams();

  const eventQuery = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => eventApi.getEvent(eventId),
    enabled: Boolean(eventId),
  });
  const membersQuery = useQuery({
    queryKey: ['eventMembers', eventId],
    queryFn: () => eventMemberApi.getMembers(eventId),
    enabled: Boolean(eventId),
  });
  const departmentsQuery = useQuery({
    queryKey: ['eventDepartments', eventId],
    queryFn: () => departmentApi.getEventDepartments(eventId),
    enabled: Boolean(eventId),
  });
  const tasksQuery = useQuery({
    queryKey: ['eventTasksSummary', eventId],
    queryFn: () => taskApi.getEventTaskPage({ eventId, size: 1 }),
    enabled: Boolean(eventId),
  });

  const event = eventQuery.data;
  const permissions = getEventPermissions(event);
  const isLeader = permissions.canManageEvent;
  const members = membersQuery.data || EMPTY_MEMBERS;
  const departments = departmentsQuery.data || EMPTY_DEPARTMENTS;
  const visibleDepartments = isLeader
    ? departments
    : departments.filter((department) => String(department.id) === String(permissions.ownDepartmentId));
  const departmentHomePath = getDepartmentHomePath(event);
  const taskCount = tasksQuery.data?.totalElements ?? tasksQuery.data?.totalItems ?? 0;

  return (
    <AppLayout
      user={user}
      events={event ? [event] : []}
      selectedEvent={event}
      onEventChange={() => {}}
      onLogout={onLogout}
    >
      <div className="space-y-5">
        {eventQuery.isLoading && <LoadingState message="Đang tải tổng quan sự kiện..." />}

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
                actions={isLeader && (
                  <Button as={Link} to={`/events/${eventId}/edit`} variant="secondary">
                    <Edit size={16} />
                    Sửa thông tin
                  </Button>
                )}
                meta={
                  <>
                    <span className="inline-flex items-center gap-2">
                      <CalendarDays size={16} />
                      {formatEventRange(event)}
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <MapPin size={16} />
                      {event.location || 'Chưa có địa điểm'}
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <Users size={16} />
                      {members.length} thành viên
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <ClipboardList size={16} />
                      {taskCount} task
                    </span>
                  </>
                }
              />
            </Panel>

            <Panel className="overflow-hidden">
              <div className="flex flex-col gap-2 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-950">Thành viên sự kiện</h3>
                  <p className="text-sm text-slate-500">Những tài khoản đang tham gia và có thể được phân công trong sự kiện.</p>
                </div>
                <Link
                  to={`/events/${eventId}/members`}
                  className="inline-flex w-fit items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  {permissions.canManageMembers ? 'Quản lý thành viên' : 'Xem thành viên'}
                </Link>
              </div>

              {membersQuery.isLoading && <LoadingState message="Đang tải thành viên sự kiện..." />}
              {membersQuery.error && (
                <div className="p-4">
                  <ErrorState error={membersQuery.error} title="Không tải được thành viên sự kiện" />
                </div>
              )}
              {!membersQuery.isLoading && !membersQuery.error && members.length === 0 && (
                <div className="p-4">
                  <EmptyState
                    icon={Users}
                    title="Chưa có thành viên"
                    description="Khi thêm thành viên vào sự kiện, danh sách sẽ hiển thị tại đây."
                  />
                </div>
              )}
              {!membersQuery.isLoading && !membersQuery.error && members.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[860px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Thành viên</th>
                        <th className="px-4 py-3">Email</th>
                        <th className="px-4 py-3">Role</th>
                        <th className="px-4 py-3">Ban</th>
                        <th className="px-4 py-3">Telegram</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {members.map((member) => (
                        <tr key={member.id || member.userId} className="transition hover:bg-indigo-50/40">
                          <td className="px-4 py-3">
                            <Link to={`/events/${eventId}/members/${member.userId}`} className="flex min-w-0 items-center gap-3 rounded-lg p-1 transition hover:bg-white">
                              <UserAvatar userId={member.userId} avatarUrl={member.avatarUrl} name={member.name} size="sm" />
                              <span className="min-w-0 truncate font-semibold text-slate-950">{member.name || 'Chưa có tên'}</span>
                            </Link>
                          </td>
                          <td className="px-4 py-3">
                            <span className="flex max-w-[260px] items-center gap-2 truncate text-slate-600">
                              <Mail size={15} className="shrink-0 text-slate-400" />
                              <span className="truncate">{member.email || 'Chưa có email'}</span>
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={member.role} />
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {member.departmentName || 'Chưa gán ban'}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
                              member.telegramLinked ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                            }`}>
                              <Send size={13} />
                              {member.telegramLinked ? 'Đã kết nối' : 'Chưa kết nối'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>

            {permissions.canViewDepartments && (
            <Panel className="overflow-hidden">
              <div className="flex flex-col gap-2 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-950">Ban tổ chức</h3>
                  <p className="text-sm text-slate-500">
                    {isLeader ? 'Chỉ hiển thị trưởng ban để người xem biết đầu mối liên hệ.' : 'Ban mà bạn đang tham gia trong sự kiện này.'}
                  </p>
                </div>
                {departmentHomePath && (
                  <Link
                    to={departmentHomePath}
                    className="inline-flex w-fit items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                  >
                    {isLeader ? 'Quản lý ban' : 'Xem ban của bạn'}
                  </Link>
                )}
              </div>

              {departmentsQuery.isLoading && <LoadingState message="Đang tải ban tổ chức..." />}
              {departmentsQuery.error && (
                <div className="p-4">
                  <ErrorState error={departmentsQuery.error} title="Không tải được ban tổ chức" />
                </div>
              )}
              {!departmentsQuery.isLoading && !departmentsQuery.error && visibleDepartments.length === 0 && (
                <div className="p-4">
                  <EmptyState
                    icon={Building2}
                    title="Chưa có ban tổ chức"
                    description="Tạo ban để chia đầu mối phụ trách rõ hơn cho sự kiện."
                  />
                </div>
              )}
              {!departmentsQuery.isLoading && !departmentsQuery.error && visibleDepartments.length > 0 && (
                <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
                  {visibleDepartments.map((department) => (
                    <Link
                      key={department.id}
                      to={`/events/${eventId}/departments/${department.id}`}
                      className="rounded-lg border border-slate-200 bg-white p-4 transition hover:border-indigo-200 hover:bg-indigo-50/40"
                    >
                      <div className="flex items-start gap-3">
                        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                          <Building2 size={18} />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-bold text-slate-950">{department.name}</p>
                          <p className="mt-2 flex items-center gap-2 text-sm font-medium text-slate-600">
                            <UserRound size={15} className="shrink-0 text-slate-400" />
                            <span className="truncate">{department.leaderName || 'Chưa chọn trưởng ban'}</span>
                          </p>
                          {department.leaderEmail && (
                            <p className="mt-1 truncate text-xs text-slate-500">{department.leaderEmail}</p>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </Panel>
            )}

            <section className="grid gap-3 md:grid-cols-2">
              <OverviewAction
                to={`/events/${eventId}/tasks`}
                icon={<ClipboardList size={18} />}
                title="Task của sự kiện"
                description="Đi tới danh sách công việc và phân công."
              />
              {permissions.canViewEventDashboard && (
                <OverviewAction
                  to={`/events/${eventId}/dashboard`}
                  icon={<BarChart3 size={18} />}
                  title="Dashboard sự kiện"
                  description="Xem tiến độ tổng quan khi cần theo dõi sâu hơn."
                />
              )}
            </section>
          </>
        )}
      </div>
    </AppLayout>
  );
};

const formatEventRange = (event) => {
  const start = event?.startTime || event?.eventDate;
  const end = event?.endTime;
  if (!end || end === start) {
    return `Bắt đầu: ${formatDate(start)}`;
  }
  return `${formatDate(start)} - ${formatDate(end)}`;
};

const OverviewAction = ({ to, icon, title, description }) => (
  <Link
    to={to}
    className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50/50"
  >
    <div className="flex items-center gap-3">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block font-bold text-slate-950">{title}</span>
        <span className="mt-1 block text-sm text-slate-500">{description}</span>
      </span>
    </div>
  </Link>
);

export default EventDetailPage;
