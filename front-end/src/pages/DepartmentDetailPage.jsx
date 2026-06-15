import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import {
  BarChart3,
  Building2,
  ClipboardList,
  Mail,
  Plus,
  Send,
  ShieldCheck,
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
import taskApi from '../api/taskApi';
import ErrorPage from './ErrorPage';
import { canAccessDepartment, getEventPermissions } from '../utils/permissionUtils';

const EMPTY_MEMBERS = [];

const DepartmentDetailPage = ({ user, onLogout }) => {
  const { eventId, departmentId } = useParams();

  const eventQuery = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => eventApi.getEvent(eventId),
    enabled: Boolean(eventId),
  });

  const event = eventQuery.data;
  const permissions = getEventPermissions(event);
  const canReadDepartment = Boolean(event && canAccessDepartment(event, departmentId));

  const departmentQuery = useQuery({
    queryKey: ['department', eventId, departmentId],
    queryFn: () => departmentApi.getDepartment({ eventId, departmentId }),
    enabled: Boolean(eventId && departmentId && canReadDepartment),
  });

  const membersQuery = useQuery({
    queryKey: ['departmentMembers', eventId, departmentId],
    queryFn: () => departmentApi.getDepartmentMembers({ eventId, departmentId }),
    enabled: Boolean(eventId && departmentId && canReadDepartment),
  });

  const tasksQuery = useQuery({
    queryKey: ['departmentTasksSummary', eventId, departmentId],
    queryFn: () => taskApi.getEventTaskPage({ eventId, departmentId, size: 1 }),
    enabled: Boolean(eventId && departmentId && canReadDepartment),
  });

  const department = departmentQuery.data;
  const isLeader = permissions.canManageDepartments;
  const members = membersQuery.data || EMPTY_MEMBERS;
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
        {(eventQuery.isLoading || departmentQuery.isLoading) && (
          <LoadingState message="Đang tải tổng quan ban..." />
        )}

        {(eventQuery.error || departmentQuery.error) && (
          <ErrorState
            error={eventQuery.error || departmentQuery.error}
            title="Không tải được tổng quan ban"
          />
        )}

        {!eventQuery.isLoading && event && !canReadDepartment && (
          <ErrorPage
            variant="unexpected"
            title="Không có quyền truy cập"
            message="Bạn chỉ có thể xem ban mà mình đang tham gia."
          />
        )}

        {canReadDepartment && department && (
          <>
            <PageHeader
              eyebrow={event?.name || 'Sự kiện'}
              title={department.name || 'Ban tổ chức'}
              description={department.description || 'Theo dõi thành viên, vai trò và công việc của ban trong sự kiện.'}
              actions={isLeader && (
                <Button
                  as={Link}
                  to={`/events/${eventId}/tasks/new?departmentId=${departmentId}`}
                  className="min-h-11 rounded-2xl bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400 font-black text-white shadow-xl shadow-cyan-100"
                >
                  <Plus size={16} />
                  Tạo task
                </Button>
              )}
              meta={
                <>
                  <span className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-white px-3 py-1.5 font-black text-sky-600 shadow-sm">
                    <UserRound size={16} />
                    Trưởng ban: {department.leaderName || 'Chưa chọn'}
                  </span>

                  <span className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-white px-3 py-1.5 font-black text-emerald-600 shadow-sm">
                    <Users size={16} />
                    {members.length} thành viên
                  </span>

                  <span className="inline-flex items-center gap-2 rounded-full border border-cyan-100 bg-white px-3 py-1.5 font-black text-cyan-600 shadow-sm">
                    <ClipboardList size={16} />
                    {taskCount} task
                  </span>
                </>
              }
            />

            <section className="grid gap-4 md:grid-cols-3">
              <SummaryCard
                icon={<Building2 className="h-5 w-5" strokeWidth={1.8} />}
                label="Ban tổ chức"
                value={department.name || 'Chưa có tên'}
                tone="sky"
              />

              <SummaryCard
                icon={<Users className="h-5 w-5" strokeWidth={1.8} />}
                label="Thành viên"
                value={members.length}
                tone="emerald"
              />

              <SummaryCard
                icon={<ClipboardList className="h-5 w-5" strokeWidth={1.8} />}
                label="Tổng task"
                value={taskCount}
                tone="cyan"
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
                      Thành viên trong ban
                    </h3>
                    <p className="mt-1 text-sm font-semibold text-slate-500">
                      Danh sách thành viên, role và trạng thái kết nối Telegram.
                    </p>
                  </div>
                </div>

                <Link
                  to={`/events/${eventId}/departments/${departmentId}/members`}
                  className="inline-flex w-fit items-center justify-center rounded-2xl border border-sky-100 bg-white px-4 py-2 text-sm font-black text-sky-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-sky-50 hover:shadow-lg hover:shadow-sky-100"
                >
                  {isLeader ? 'Quản lý thành viên' : 'Thông tin thành viên'}
                </Link>
              </div>

              {membersQuery.isLoading && (
                <div className="p-5">
                  <LoadingState message="Đang tải thành viên trong ban..." />
                </div>
              )}

              {membersQuery.error && (
                <div className="p-5">
                  <ErrorState error={membersQuery.error} title="Không tải được thành viên trong ban" />
                </div>
              )}

              {!membersQuery.isLoading && !membersQuery.error && members.length === 0 && (
                <div className="p-5">
                  <EmptyState
                    icon={Users}
                    title="Chưa có thành viên trong ban"
                    description="Khi thêm thành viên vào ban, danh sách sẽ hiển thị tại đây."
                  />
                </div>
              )}

              {!membersQuery.isLoading && !membersQuery.error && members.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[780px] text-left text-sm">
                    <thead className="bg-sky-50/70 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                      <tr>
                        <th className="px-5 py-4">Thành viên</th>
                        <th className="px-5 py-4">Email</th>
                        <th className="px-5 py-4">Role</th>
                        <th className="px-5 py-4">Telegram</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-sky-50">
                      {members.map((member) => (
                        <tr
                          key={member.id || member.userId}
                          className="transition hover:bg-sky-50/70"
                        >
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

            <section className="grid gap-4 md:grid-cols-2">
              {isLeader && (
                <OverviewAction
                  to={`/events/${eventId}/departments/${departmentId}/dashboard`}
                  icon={<BarChart3 size={20} />}
                  title="Dashboard của ban"
                  description="Xem biểu đồ tiến độ, trạng thái task và hiệu suất theo tuần."
                />
              )}

              <OverviewAction
                to={`/events/${eventId}/departments/${departmentId}/tasks`}
                icon={<ClipboardList size={20} />}
                title="Task của ban"
                description="Xem danh sách task, lọc trạng thái và theo dõi deadline."
              />
            </section>
          </>
        )}
      </div>
    </AppLayout>
  );
};

const SummaryCard = ({ icon, label, value, tone }) => {
  const toneClass = {
    sky: 'bg-sky-50 text-sky-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    cyan: 'bg-cyan-50 text-cyan-600',
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
        <ShieldCheck className="h-5 w-5" strokeWidth={1.8} />
      </span>
    </div>
  </Link>
);

export default DepartmentDetailPage;