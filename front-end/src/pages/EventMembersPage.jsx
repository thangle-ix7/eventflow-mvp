import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import {
  Building2,
  CalendarDays,
  CheckCircle2,
  Loader2,
  Mail,
  Search,
  Send,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react';
import AppLayout from '../components/AppLayout';
import UserAvatar from '../components/UserAvatar';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  Panel,
  StatusBadge,
  TextInput,
} from '../components/ui';
import departmentApi from '../api/departmentApi';
import eventApi from '../api/eventApi';
import eventMemberApi from '../api/eventMemberApi';
import { formatDate } from '../utils/dateUtils';

const EMPTY_MEMBERS = [];
const EMPTY_DEPARTMENTS = [];

const EventMembersPage = ({ user, onLogout }) => {
  const { eventId } = useParams();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ email: '', role: 'MEMBER' });
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');

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

  const addMemberMutation = useMutation({
    mutationFn: eventMemberApi.addMember,
    onSuccess: (invitation) => {
      setForm({ email: '', role: 'MEMBER' });
      setInviteSuccess(`Đã gửi lời mời tới ${invitation.email}`);
      queryClient.invalidateQueries({ queryKey: ['eventMembers', eventId] });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: eventMemberApi.updateRole,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['eventMembers', eventId] }),
  });

  const removeMemberMutation = useMutation({
    mutationFn: eventMemberApi.removeMember,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['eventMembers', eventId] }),
  });

  const event = eventQuery.data;
  const isLeader = event?.role === 'LEADER';
  const members = membersQuery.data || EMPTY_MEMBERS;
  const departments = departmentsQuery.data || EMPTY_DEPARTMENTS;

  const filteredMembers = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return members.filter((member) => {
      const searchable = [
        member.name,
        member.email,
        member.role,
        member.departmentName,
        member.telegramLinked ? 'telegram da ket noi' : 'telegram chua ket noi',
      ].filter(Boolean).join(' ').toLowerCase();
      const matchesKeyword = !keyword || searchable.includes(keyword);
      const matchesRole = !roleFilter || member.role === roleFilter;
      const matchesDepartment = !departmentFilter
        || (departmentFilter === '__none' ? !member.departmentId : String(member.departmentId || '') === departmentFilter);

      return matchesKeyword && matchesRole && matchesDepartment;
    });
  }, [departmentFilter, members, roleFilter, search]);

  const handleSubmit = (event) => {
    event.preventDefault();
    setInviteSuccess('');
    addMemberMutation.mutate({ eventId, payload: form });
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
                    Mời thành viên mới
                  </h3>
                  <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                    Nhập email và chọn role để gửi lời mời tham gia sự kiện.
                  </p>
                </div>
              </div>

              <form
                onSubmit={handleSubmit}
                className="grid w-full gap-3 lg:max-w-3xl md:grid-cols-[1fr_150px_auto]"
              >
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((old) => ({ ...old, email: event.target.value }))}
                  required
                  placeholder="member@example.com"
                  className={inputClassName}
                />

                <select
                  value={form.role}
                  onChange={(event) => setForm((old) => ({ ...old, role: event.target.value }))}
                  className={inputClassName}
                >
                  <option value="MEMBER">MEMBER</option>
                  <option value="LEADER">LEADER</option>
                </select>

                <button
                  type="submit"
                  disabled={addMemberMutation.isPending}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400 px-4 py-2 text-sm font-black text-white shadow-xl shadow-cyan-100 transition hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-cyan-200 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {addMemberMutation.isPending ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <UserPlus size={18} />
                  )}
                  Gửi lời mời
                </button>
              </form>
            </div>

            {inviteSuccess && (
              <div className="relative mt-4 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-black text-emerald-700">
                <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
                <span>{inviteSuccess}</span>
              </div>
            )}

            {addMemberMutation.error && (
              <div className="relative mt-4">
                <ErrorState error={addMemberMutation.error} title="Không gửi được lời mời" />
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
                  Tìm kiếm theo tên, email, ban hoặc trạng thái Telegram.
                </p>
              </div>
            </div>

            <div className={`grid w-full gap-2 ${isLeader ? 'lg:max-w-3xl lg:grid-cols-[minmax(220px,1fr)_150px_190px]' : 'lg:max-w-sm'}`}>
              <TextInput
                aria-label="Tìm kiếm thành viên"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm tên, email, ban..."
                className="rounded-2xl border-sky-100 bg-white font-semibold focus:border-cyan-300 focus:ring-cyan-100"
              />

              {isLeader && (
                <>
                  <select
                    aria-label="Lọc theo role"
                    value={roleFilter}
                    onChange={(event) => setRoleFilter(event.target.value)}
                    className={inputClassName}
                  >
                    <option value="">Tất cả role</option>
                    <option value="LEADER">LEADER</option>
                    <option value="MEMBER">MEMBER</option>
                  </select>

                  <select
                    aria-label="Lọc theo ban"
                    value={departmentFilter}
                    onChange={(event) => setDepartmentFilter(event.target.value)}
                    disabled={departmentsQuery.isLoading}
                    className={inputClassName}
                  >
                    <option value="">Tất cả ban</option>
                    <option value="__none">Chưa gán ban</option>
                    {departments.map((department) => (
                      <option key={department.id} value={department.id}>
                        {department.name}
                      </option>
                    ))}
                  </select>
                </>
              )}
            </div>
          </div>

          {membersQuery.isLoading && (
            <div className="p-5">
              <LoadingState message="Đang tải thành viên..." />
            </div>
          )}

          {membersQuery.error && (
            <div className="p-5">
              <ErrorState error={membersQuery.error} title="Không tải được thành viên" />
            </div>
          )}

          {!membersQuery.isLoading && !membersQuery.error && members.length === 0 && (
            <div className="p-5">
              <EmptyState
                icon={Users}
                title="Chưa có thành viên"
                description="Khi gửi lời mời hoặc có thành viên tham gia sự kiện, danh sách sẽ hiển thị tại đây."
              />
            </div>
          )}

          {!membersQuery.isLoading && !membersQuery.error && members.length > 0 && filteredMembers.length === 0 && (
            <div className="p-5">
              <EmptyState
                icon={Search}
                title="Không tìm thấy thành viên"
                description="Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc role/ban."
              />
            </div>
          )}

          {!membersQuery.isLoading && !membersQuery.error && filteredMembers.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1080px] text-left text-sm">
                <thead className="bg-sky-50/70 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                  <tr>
                    <th className="px-5 py-4">User</th>
                    <th className="px-5 py-4">Email</th>
                    <th className="px-5 py-4">Role</th>
                    <th className="px-5 py-4">Ban</th>
                    <th className="px-5 py-4">Telegram</th>
                    <th className="px-5 py-4">Tham gia event</th>
                    {isLeader && <th className="px-5 py-4 text-right">Thao tác</th>}
                  </tr>
                </thead>

                <tbody className="divide-y divide-sky-50">
                  {filteredMembers.map((member) => (
                    <MemberRow
                      key={member.id}
                      eventId={eventId}
                      member={member}
                      currentUserId={user.userId}
                      isLeader={isLeader}
                      updateRoleMutation={updateRoleMutation}
                      removeMemberMutation={removeMemberMutation}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </AppLayout>
  );
};

const MemberRow = ({
  eventId,
  member,
  currentUserId,
  isLeader,
  updateRoleMutation,
  removeMemberMutation,
}) => {
  const isCurrentUser = member.userId === currentUserId;
  const removingThisMember = removeMemberMutation.isPending && removeMemberMutation.variables?.userId === member.userId;

  return (
    <tr className="transition hover:bg-sky-50/70">
      <td className="px-5 py-4">
        <Link
          to={`/events/${eventId}/members/${member.userId}`}
          className="flex min-w-0 items-center gap-3 rounded-2xl p-1.5 transition hover:bg-white hover:shadow-sm"
        >
          <UserAvatar userId={member.userId} avatarUrl={member.avatarUrl} name={member.name} size="sm" />
          <span className="min-w-0">
            <span className="block truncate font-black text-slate-950">
              {member.name}
            </span>
          </span>
        </Link>
      </td>

      <td className="px-5 py-4">
        <span className="flex max-w-[240px] items-center gap-2 truncate font-semibold text-slate-600">
          <Mail size={15} className="shrink-0 text-sky-400" />
          <span className="truncate">{member.email}</span>
        </span>
      </td>

      <td className="px-5 py-4">
        {isLeader ? (
          <select
            value={member.role}
            onChange={(event) =>
              updateRoleMutation.mutate({
                eventId,
                userId: member.userId,
                role: event.target.value,
              })
            }
            disabled={updateRoleMutation.isPending}
            className="rounded-2xl border border-sky-100 bg-sky-50 px-3 py-2 text-sm font-black text-sky-700 outline-none transition focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="MEMBER">MEMBER</option>
            <option value="LEADER">LEADER</option>
          </select>
        ) : (
          <StatusBadge status={member.role} />
        )}
      </td>

      <td className="px-5 py-4">
        <span className="inline-flex items-center gap-2 font-semibold text-slate-700">
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

      <td className="px-5 py-4 font-semibold text-slate-600">
        <span className="inline-flex items-center gap-2">
          <CalendarDays size={15} className="text-emerald-500" />
          {formatDate(member.joinedAt)}
        </span>
      </td>

      {isLeader && (
        <td className="px-5 py-4 text-right">
          {!isCurrentUser && (
            <button
              type="button"
              onClick={() => removeMemberMutation.mutate({ eventId, userId: member.userId })}
              disabled={removingThisMember}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-black text-red-600 shadow-sm transition hover:-translate-y-0.5 hover:border-red-200 hover:bg-red-100 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
            >
              {removingThisMember ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Trash2 size={16} />
              )}
              Xóa
            </button>
          )}
        </td>
      )}
    </tr>
  );
};

const inputClassName = 'min-h-11 w-full min-w-0 rounded-2xl border border-sky-100 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-cyan-300 focus:bg-white focus:ring-4 focus:ring-cyan-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500';

export default EventMembersPage;
