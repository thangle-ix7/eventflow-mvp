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
  Sparkles,
  UserRound,
  Users,
} from 'lucide-react';
import AppLayout from '../components/AppLayout';
import UserAvatar from '../components/UserAvatar';
import {
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  Panel,
  StatusBadge,
} from '../components/ui';
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
      <div className="space-y-6">
        {eventQuery.isLoading && <LoadingState message="Đang tải tổng quan sự kiện..." />}

        {eventQuery.error && (
          <ErrorState error={eventQuery.error} title="Không tải được thông tin sự kiện" />
        )}

        {event && (
          <>
            <PageHeader
              eyebrow="Event overview"
              title={event.name}
              description={event.description || 'Tổng quan thông tin sự kiện, thành viên, ban tổ chức và các lối tắt quản lý chính.'}
              actions={isLeader && (
                <Button
                  as={Link}
                  to={`/events/${eventId}/edit`}
                  variant="secondary"
                  className="rounded-2xl border-sky-100 bg-white font-black text-sky-600 shadow-sm hover:bg-sky-50"
                >
                  <Edit size={16} />
                  Sửa thông tin
                </Button>
              )}
              meta={
                <>
                  <StatusBadge status={event.role} />
                  <StatusBadge status={event.status || 'ACTIVE'} />

                  <span className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-white px-3 py-1.5 font-black text-sky-600 shadow-sm">
                    <CalendarDays size={16} />
                    {formatEventRange(event)}
                  </span>

                  <span className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-white px-3 py-1.5 font-black text-emerald-600 shadow-sm">
                    <MapPin size={16} />
                    {event.location || 'Chưa có địa điểm'}
                  </span>
                </>
              }
            />

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryCard
                icon={<Users className="h-5 w-5" strokeWidth={1.8} />}
                label="Thành viên"
                value={members.length}
                tone="sky"
              />

              <SummaryCard
                icon={<Building2 className="h-5 w-5" strokeWidth={1.8} />}
                label="Ban tổ chức"
                value={visibleDepartments.length}
                tone="emerald"
              />

              <SummaryCard
                icon={<ClipboardList className="h-5 w-5" strokeWidth={1.8} />}
                label="Tổng task"
                value={taskCount}
                tone="cyan"
              />

              <SummaryCard
                icon={<UserRound className="h-5 w-5" strokeWidth={1.8} />}
                label="Vai trò của bạn"
                value={event.role || 'MEMBER'}
                tone="violet"
              />
            </section>

            <Panel className="overflow-hidden">
              <div className="flex flex-col gap-3 border-b border-sky-100 bg-gradient-to-r from-sky-50 via-white to-emerald-50 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-emerald-400 text-white shadow-lg shadow-cyan-100">
                    <Users className="h-5 w-5" strokeWidth={1.8} />
                  </div>

                  <div>
                    <h3 className="text-lg font-black text-slate-950">
                      Thành viên sự kiện
                    </h3>
                    <p className="mt-1 text-sm font-semibold text-slate-500">
                      Danh sách người tham gia, role, ban phụ trách và trạng thái Telegram.
                    </p>
                  </div>
                </div>

                <Link
                  to={`/events/${eventId}/members`}
                  className="inline-flex w-fit items-center justify-center rounded-2xl border border-sky-100 bg-white px-4 py-2 text-sm font-black text-sky-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-sky-50 hover:shadow-lg hover:shadow-sky-100"
                >
                  {permissions.canManageMembers ? 'Quản lý thành viên' : 'Xem thành viên'}
                </Link>
              </div>

              {membersQuery.isLoading && (
                <div className="p-5">
                  <LoadingState message="Đang tải thành viên sự kiện..." />
                </div>
              )}

              {membersQuery.error && (
                <div className="p-5">
                  <ErrorState error={membersQuery.error} title="Không tải được thành viên sự kiện" />
                </div>
              )}

              {!membersQuery.isLoading && !membersQuery.error && members.length === 0 && (
                <div className="p-5">
                  <EmptyState
                    icon={Users}
                    title="Chưa có thành viên"
                    description="Khi có thành viên tham gia sự kiện, danh sách sẽ hiển thị tại đây."
                  />
                </div>
              )}

              {!membersQuery.isLoading && !membersQuery.error && members.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] text-left text-sm">
                    <thead className="bg-sky-50/70 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                      <tr>
                        <th className="px-5 py-4">Thành viên</th>
                        <th className="px-5 py-4">Email</th>
                        <th className="px-5 py-4">Role</th>
                        <th className="px-5 py-4">Ban</th>
                        <th className="px-5 py-4">Telegram</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-sky-50">
                      {members.map((member) => (
                        <tr key={member.id || member.userId} className="transition hover:bg-sky-50/70">
                          <td className="px-5 py-4">
                            <Link
                              to={`/events/${eventId}/members/${member.userId}`}
                              className="flex min-w-0 items-center gap-3 rounded-2xl p-1.5 transition hover:bg-white hover:shadow-sm"
                            >
                              <UserAvatar
                                userId={member.userId}
                                avatarUrl={member.avatarUrl}
                                name={member.name}
                                size="sm"
                              />
                              <span className="min-w-0 truncate font-black text-slate-950">
                                {member.name || 'Chưa có tên'}
                              </span>
                            </Link>
                          </td>

                          <td className="px-5 py-4">
                            <span className="flex max-w-[280px] items-center gap-2 truncate font-semibold text-slate-600">
                              <Mail size={15} className="shrink-0 text-sky-400" />
                              <span className="truncate">{member.email || 'Chưa có email'}</span>
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <StatusBadge status={member.role} />
                          </td>

                          <td className="px-5 py-4 font-semibold text-slate-700">
                            <span className="inline-flex items-center gap-2">
                              <Building2 size={15} className="text-emerald-500" />
                              {member.departmentName || 'Chưa gán ban'}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-black shadow-sm ${
                                member.telegramLinked
                                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                  : 'border-slate-200 bg-slate-50 text-slate-600'
                              }`}
                            >
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
                <div className="flex flex-col gap-3 border-b border-sky-100 bg-gradient-to-r from-sky-50 via-white to-emerald-50 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-emerald-400 text-white shadow-lg shadow-cyan-100">
                      <Building2 className="h-5 w-5" strokeWidth={1.8} />
                    </div>

                    <div>
                      <h3 className="text-lg font-black text-slate-950">
                        Ban tổ chức
                      </h3>
                      <p className="mt-1 text-sm font-semibold text-slate-500">
                        Các ban phụ trách trong sự kiện và trưởng ban tương ứng.
                      </p>
                    </div>
                  </div>

                  {departmentHomePath && (
                    <Link
                      to={departmentHomePath}
                      className="inline-flex w-fit items-center justify-center rounded-2xl border border-sky-100 bg-white px-4 py-2 text-sm font-black text-sky-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-sky-50 hover:shadow-lg hover:shadow-sky-100"
                    >
                      {isLeader ? 'Quản lý ban' : 'Xem ban của bạn'}
                    </Link>
                  )}
                </div>

                {departmentsQuery.isLoading && (
                  <div className="p-5">
                    <LoadingState message="Đang tải ban tổ chức..." />
                  </div>
                )}

                {departmentsQuery.error && (
                  <div className="p-5">
                    <ErrorState error={departmentsQuery.error} title="Không tải được ban tổ chức" />
                  </div>
                )}

                {!departmentsQuery.isLoading && !departmentsQuery.error && visibleDepartments.length === 0 && (
                  <div className="p-5">
                    <EmptyState
                      icon={Building2}
                      title="Chưa có ban tổ chức"
                      description="Khi leader tạo ban tổ chức, danh sách sẽ hiển thị tại đây."
                    />
                  </div>
                )}

                {!departmentsQuery.isLoading && !departmentsQuery.error && visibleDepartments.length > 0 && (
                  <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
                    {visibleDepartments.map((department) => (
                      <Link
                        key={department.id}
                        to={`/events/${eventId}/departments/${department.id}`}
                        className="group relative overflow-hidden rounded-[2rem] border border-sky-100 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:bg-sky-50/60 hover:shadow-xl hover:shadow-sky-100"
                      >
                        <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-sky-100/80 opacity-0 blur-3xl transition group-hover:opacity-100" />

                        <div className="relative flex items-start gap-3">
                          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-emerald-400 text-white shadow-lg shadow-cyan-100">
                            <Building2 size={20} />
                          </span>

                          <div className="min-w-0">
                            <p className="truncate font-black text-slate-950">
                              {department.name}
                            </p>

                            <p className="mt-3 flex items-center gap-2 text-sm font-bold text-slate-600">
                              <UserRound size={15} className="shrink-0 text-sky-400" />
                              <span className="truncate">
                                {department.leaderName || 'Chưa chọn trưởng ban'}
                              </span>
                            </p>

                            {department.leaderEmail && (
                              <p className="mt-1 truncate text-xs font-semibold text-slate-500">
                                {department.leaderEmail}
                              </p>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </Panel>
            )}

            <section className="grid gap-4 md:grid-cols-2">
              <OverviewAction
                to={`/events/${eventId}/tasks`}
                icon={<ClipboardList size={20} />}
                title="Task của sự kiện"
                description="Xem toàn bộ task, lọc trạng thái, deadline và người phụ trách."
              />

              {permissions.canViewEventDashboard && (
                <OverviewAction
                  to={`/events/${eventId}/dashboard`}
                  icon={<BarChart3 size={20} />}
                  title="Dashboard sự kiện"
                  description="Theo dõi tiến độ, biểu đồ trạng thái và công việc sắp tới."
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

const SummaryCard = ({ icon, label, value, tone }) => {
  const toneClass = {
    sky: 'bg-sky-50 text-sky-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    cyan: 'bg-cyan-50 text-cyan-600',
    violet: 'bg-violet-50 text-violet-600',
  }[tone];

  return (
    <div className="group relative overflow-hidden rounded-[2rem] border border-sky-100 bg-white p-5 shadow-xl shadow-sky-100/70 transition hover:-translate-y-1 hover:shadow-2xl hover:shadow-cyan-100">
      <div className="pointer-events-none absolute -right-14 -top-14 h-40 w-40 rounded-full bg-sky-100/70 opacity-0 blur-3xl transition group-hover:opacity-100" />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-black uppercase tracking-[0.16em] text-slate-400">
            {label}
          </p>
          <p className="mt-3 truncate text-2xl font-black text-slate-950">
            {value ?? 0}
          </p>
        </div>

        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-sm ${toneClass}`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

const OverviewAction = ({ to, icon, title, description }) => (
  <Link
    to={to}
    className="group relative overflow-hidden rounded-[2rem] border border-sky-100 bg-white p-5 shadow-xl shadow-sky-100/70 transition hover:-translate-y-1 hover:shadow-2xl hover:shadow-cyan-100"
  >
    <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-sky-100 blur-3xl transition group-hover:bg-emerald-100" />

    <div className="relative flex items-center gap-4">
      <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-emerald-400 text-white shadow-lg shadow-cyan-100">
        {icon}
      </span>

      <span className="min-w-0">
        <span className="block font-black text-slate-950">{title}</span>
        <span className="mt-1 block text-sm font-semibold leading-6 text-slate-500">
          {description}
        </span>
      </span>

      <span className="ml-auto hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-500 transition group-hover:bg-sky-100 sm:inline-flex">
        <Sparkles className="h-5 w-5" strokeWidth={1.8} />
      </span>
    </div>
  </Link>
);

export default EventDetailPage;