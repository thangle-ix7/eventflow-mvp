import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import {
  CalendarDays,
  Loader2,
  Mail,
  Search,
  Send,
  ShieldCheck,
  UserMinus,
  UserPlus,
  Users,
} from 'lucide-react';
import AppLayout from '../components/AppLayout';
import UserAvatar from '../components/UserAvatar';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  Panel,
  TextInput,
} from '../components/ui';
import departmentApi from '../api/departmentApi';
import eventApi from '../api/eventApi';
import eventMemberApi from '../api/eventMemberApi';
import { formatDate } from '../utils/dateUtils';
import ErrorPage from './ErrorPage';
import { canAccessDepartment, getEventPermissions } from '../utils/permissionUtils';

const EMPTY_MEMBERS = [];

const DepartmentMembersPage = ({ user, onLogout }) => {
  const { eventId, departmentId } = useParams();
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

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

  const eventMembersQuery = useQuery({
    queryKey: ['eventMembers', eventId],
    queryFn: () => eventMemberApi.getMembers(eventId),
    enabled: Boolean(eventId && permissions.canManageDepartments),
  });

  const departmentMembersQuery = useQuery({
    queryKey: ['departmentMembers', eventId, departmentId],
    queryFn: () => departmentApi.getDepartmentMembers({ eventId, departmentId }),
    enabled: Boolean(eventId && departmentId && canReadDepartment),
  });

  const assignMemberMutation = useMutation({
    mutationFn: departmentApi.assignMember,
    onSuccess: () => {
      setSelectedUserId('');
      queryClient.invalidateQueries({ queryKey: ['departmentMembers', eventId, departmentId] });
      queryClient.invalidateQueries({ queryKey: ['eventMembers', eventId] });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: departmentApi.removeMember,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departmentMembers', eventId, departmentId] });
      queryClient.invalidateQueries({ queryKey: ['eventMembers', eventId] });
    },
  });

  const department = departmentQuery.data;
  const isLeader = permissions.canManageDepartments;
  const departmentMembers = departmentMembersQuery.data || EMPTY_MEMBERS;
  const pageTitle = isLeader
    ? `Quản lý thành viên ${department?.name || 'ban'}`
    : `Thông tin thành viên ${department?.name || 'ban'}`;

  const filteredMembers = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return departmentMembers.filter((member) => {
      const searchable = [
        member.name,
        member.email,
        String(member.userId) === String(department?.leaderUserId) ? 'team leader trưởng ban' : 'thành viên member',
        member.telegramLinked ? 'telegram da ket noi' : 'telegram chua ket noi',
      ].filter(Boolean).join(' ').toLowerCase();
      const matchesKeyword = !keyword || searchable.includes(keyword);
      const memberDepartmentRole = String(member.userId) === String(department?.leaderUserId) ? 'TEAM_LEADER' : 'MEMBER';
      const matchesRole = !roleFilter || memberDepartmentRole === roleFilter;

      return matchesKeyword && matchesRole;
    });
  }, [department?.leaderUserId, departmentMembers, roleFilter, search]);

  const assignableMembers = useMemo(() => {
    const assignedIds = new Set(departmentMembers.map((member) => member.userId));
    return (eventMembersQuery.data || []).filter((member) => !assignedIds.has(member.userId));
  }, [departmentMembers, eventMembersQuery.data]);

  const handleAssignMember = (event) => {
    event.preventDefault();
    if (!selectedUserId) return;
    assignMemberMutation.mutate({ eventId, departmentId, userId: Number(selectedUserId) });
  };

  return (
    <AppLayout
      user={user}
      events={event ? [event] : []}
      selectedEvent={event}
      onEventChange={() => {}}
      onLogout={onLogout}
    >
      <div className="space-y-6">
        {!eventQuery.isLoading && event && !canReadDepartment && (
          <ErrorPage
            variant="unexpected"
            title="Không có quyền truy cập"
            message="Bạn chỉ có thể xem thành viên của ban mà mình đang tham gia."
          />
        )}

        {canReadDepartment && (
          <>
            <PageHeader
              eyebrow={event?.name || 'Sự kiện'}
              title={pageTitle}
              description="Theo dõi thành viên trong ban, trạng thái Telegram và quản lý phân công nhân sự."
              meta={
                <>
                  <span className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-white px-3 py-1.5 font-black text-sky-600 shadow-sm">
                    <Users size={16} />
                    {departmentMembers.length} thành viên trong ban
                  </span>

                  <span className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-white px-3 py-1.5 font-black text-emerald-600 shadow-sm">
                    <ShieldCheck size={16} />
                    {isLeader ? 'Leader permission' : 'Member view'}
                  </span>
                </>
              }
            />

            {isLeader && (
              <Panel className="relative overflow-hidden p-5">
                <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-sky-100 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-emerald-100/70 blur-3xl" />

                <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-emerald-400 text-white shadow-lg shadow-cyan-100">
                      <UserPlus className="h-6 w-6" strokeWidth={1.8} />
                    </div>

                    <div>
                      <h3 className="text-lg font-black text-slate-950">
                        Gán thành viên vào ban
                      </h3>
                      <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                        Chọn thành viên đã thuộc sự kiện nhưng chưa nằm trong ban này.
                      </p>
                    </div>
                  </div>

                  <form
                    onSubmit={handleAssignMember}
                    className="grid w-full gap-3 lg:max-w-2xl md:grid-cols-[1fr_auto]"
                  >
                    <select
                      value={selectedUserId}
                      onChange={(event) => setSelectedUserId(event.target.value)}
                      disabled={eventMembersQuery.isLoading || assignMemberMutation.isPending}
                      className={inputClassName}
                    >
                      <option value="">Chọn thành viên để gán vào ban</option>
                      {assignableMembers.map((member) => (
                        <option key={member.userId} value={member.userId}>
                          {member.name} ({member.email})
                        </option>
                      ))}
                    </select>

                    <button
                      type="submit"
                      disabled={!selectedUserId || assignMemberMutation.isPending}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400 px-4 py-2 text-sm font-black text-white shadow-xl shadow-cyan-100 transition hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-cyan-200 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {assignMemberMutation.isPending ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <UserPlus size={16} />
                      )}
                      Gán vào ban
                    </button>
                  </form>
                </div>

                {(assignMemberMutation.error || removeMemberMutation.error) && (
                  <div className="relative mt-4">
                    <ErrorState
                      error={assignMemberMutation.error || removeMemberMutation.error}
                      title="Không cập nhật được thành viên"
                    />
                  </div>
                )}
              </Panel>
            )}

            <Panel className="overflow-hidden">
              <div className="flex flex-col gap-4 border-b border-sky-100 bg-gradient-to-r from-sky-50 via-white to-emerald-50 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-emerald-400 text-white shadow-lg shadow-cyan-100">
                    <Users className="h-5 w-5" strokeWidth={1.8} />
                  </div>

                  <div>
                    <h2 className="text-lg font-black text-slate-950">
                      Danh sách thành viên
                    </h2>
                    <p className="mt-1 text-sm font-semibold text-slate-500">
                      Tìm kiếm theo tên, email, role hoặc trạng thái Telegram.
                    </p>
                  </div>
                </div>

                <div className={`grid w-full gap-2 ${isLeader ? 'lg:max-w-xl lg:grid-cols-[minmax(220px,1fr)_150px]' : 'lg:max-w-sm'}`}>
                  <TextInput
                    aria-label="Tìm kiếm thành viên trong ban"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Tìm tên, email, role..."
                    className="rounded-2xl border-sky-100 bg-white font-semibold focus:border-cyan-300 focus:ring-cyan-100"
                  />

                  {isLeader && (
                    <select
                      aria-label="Lọc theo role"
                      value={roleFilter}
                      onChange={(event) => setRoleFilter(event.target.value)}
                      className={inputClassName}
                    >
                      <option value="">Tất cả role</option>
                      <option value="TEAM_LEADER">Team leader</option>
                      <option value="MEMBER">Thành viên</option>
                    </select>
                  )}
                </div>
              </div>

              {departmentMembersQuery.isLoading && (
                <div className="p-5">
                  <LoadingState message="Đang tải thành viên trong ban..." />
                </div>
              )}

              {departmentMembersQuery.error && (
                <div className="p-5">
                  <ErrorState error={departmentMembersQuery.error} title="Không tải được thành viên trong ban" />
                </div>
              )}

              {!departmentMembersQuery.isLoading && !departmentMembersQuery.error && departmentMembers.length === 0 && (
                <div className="p-5">
                  <EmptyState
                    icon={Users}
                    title="Chưa có thành viên trong ban"
                    description="Khi leader gán thành viên vào ban, danh sách sẽ hiển thị tại đây."
                  />
                </div>
              )}

              {!departmentMembersQuery.isLoading && !departmentMembersQuery.error && departmentMembers.length > 0 && filteredMembers.length === 0 && (
                <div className="p-5">
                  <EmptyState
                    icon={Search}
                    title="Không tìm thấy thành viên"
                    description="Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc role."
                  />
                </div>
              )}

              {!departmentMembersQuery.isLoading && !departmentMembersQuery.error && filteredMembers.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[920px] text-left text-sm">
                    <thead className="bg-sky-50/70 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                      <tr>
                        <th className="px-5 py-4">User</th>
                        <th className="px-5 py-4">Email</th>
                        <th className="px-5 py-4">Role</th>
                        <th className="px-5 py-4">Telegram</th>
                        <th className="px-5 py-4">Tham gia event</th>
                        {isLeader && <th className="px-5 py-4 text-right">Thao tác</th>}
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-sky-50">
                      {filteredMembers.map((member) => (
                        <DepartmentMemberRow
                          key={member.id}
                          eventId={eventId}
                          departmentId={departmentId}
                          member={member}
                          isLeader={isLeader}
                          departmentLeaderUserId={department?.leaderUserId}
                          removeMemberMutation={removeMemberMutation}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
          </>
        )}
      </div>
    </AppLayout>
  );
};

const DepartmentMemberRow = ({ eventId, departmentId, member, isLeader, departmentLeaderUserId, removeMemberMutation }) => {
  const removingThisMember = removeMemberMutation.isPending && removeMemberMutation.variables?.userId === member.userId;
  const isDepartmentLeader = String(member.userId) === String(departmentLeaderUserId);

  return (
    <tr className="transition hover:bg-sky-50/70">
      <td className="px-5 py-4">
        <Link
          to={`/events/${eventId}/members/${member.userId}`}
          className="flex min-w-0 items-center gap-3 rounded-2xl p-1.5 transition hover:bg-white hover:shadow-sm"
        >
          <UserAvatar userId={member.userId} avatarUrl={member.avatarUrl} name={member.name} size="sm" />
          <span className="min-w-0 truncate font-black text-slate-950">
            {member.name}
          </span>
        </Link>
      </td>

      <td className="px-5 py-4">
        <span className="flex max-w-[280px] items-center gap-2 truncate font-semibold text-slate-600">
          <Mail size={15} className="shrink-0 text-sky-400" />
          <span className="truncate">{member.email}</span>
        </span>
      </td>

      <td className="px-5 py-4">
        <DepartmentRoleBadge isLeader={isDepartmentLeader} />
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

      <td className="px-5 py-4 font-semibold text-slate-600">
        <span className="inline-flex items-center gap-2">
          <CalendarDays size={15} className="text-emerald-500" />
          {formatDate(member.joinedAt)}
        </span>
      </td>

      {isLeader && (
        <td className="px-5 py-4 text-right">
          <button
            type="button"
            onClick={() => removeMemberMutation.mutate({ eventId, departmentId, userId: member.userId })}
            disabled={removingThisMember}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-black text-red-600 shadow-sm transition hover:-translate-y-0.5 hover:border-red-200 hover:bg-red-100 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
          >
            {removingThisMember ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <UserMinus size={16} />
            )}
            Gỡ khỏi ban
          </button>
        </td>
      )}
    </tr>
  );
};

const DepartmentRoleBadge = ({ isLeader }) => (
  <span
    className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-black shadow-sm ${
      isLeader
        ? 'border-sky-200 bg-sky-50 text-sky-700'
        : 'border-slate-200 bg-slate-50 text-slate-700'
    }`}
  >
    {isLeader ? 'Team leader' : 'Thành viên'}
  </span>
);
const inputClassName = 'min-h-11 w-full min-w-0 rounded-2xl border border-sky-100 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-cyan-300 focus:bg-white focus:ring-4 focus:ring-cyan-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500';

export default DepartmentMembersPage;