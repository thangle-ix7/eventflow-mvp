import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { CalendarDays, Loader2, Mail, Search, Send, Trash2, UserPlus, Users } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import UserAvatar from '../components/UserAvatar';
import { EmptyState, ErrorState, LoadingState, PageHeader, Panel, StatusBadge, TextInput } from '../components/ui';
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
    onSuccess: () => {
      setForm({ email: '', role: 'MEMBER' });
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
  const memberPageTitle = isLeader ? 'Thành viên sự kiện' : 'Thành viên trong phạm vi của bạn';
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
        <Panel className="p-4">
          <PageHeader
            eyebrow={event?.name || 'Sự kiện'}
            title={memberPageTitle}
          />

          {isLeader && (
            <form onSubmit={handleSubmit} className="mt-4 grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 md:grid-cols-[1fr_150px_auto]">
              <input
                type="email"
                value={form.email}
                onChange={(event) => setForm((old) => ({ ...old, email: event.target.value }))}
                required
                placeholder="member@example.com"
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
              <select
                value={form.role}
                onChange={(event) => setForm((old) => ({ ...old, role: event.target.value }))}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              >
                <option value="MEMBER">MEMBER</option>
                <option value="LEADER">LEADER</option>
              </select>
              <button
                type="submit"
                disabled={addMemberMutation.isPending}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:from-indigo-700 hover:to-blue-700 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
              >
                {addMemberMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <UserPlus size={18} />}
                Thêm
              </button>
            </form>
          )}

          {addMemberMutation.error && (
            <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {addMemberMutation.error.userMessage || addMemberMutation.error.message}
            </div>
          )}
        </Panel>

        <Panel className="overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-950">Danh sách thành viên</h2>
            </div>
            <div className={`grid w-full gap-2 ${isLeader ? 'lg:max-w-3xl lg:grid-cols-[minmax(220px,1fr)_150px_190px]' : 'lg:max-w-sm'}`}>
              <TextInput
                aria-label="Tìm kiếm thành viên"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm tên, email, ban..."
              />
              {isLeader && (
                <>
                  <select
                    aria-label="Lọc theo role"
                    value={roleFilter}
                    onChange={(event) => setRoleFilter(event.target.value)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
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
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50"
                  >
                    <option value="">Tất cả ban</option>
                    <option value="__none">Chưa gán ban</option>
                    {departments.map((department) => (
                      <option key={department.id} value={department.id}>{department.name}</option>
                    ))}
                  </select>
                </>
              )}
            </div>
          </div>

          {membersQuery.isLoading && <LoadingState message="Đang tải thành viên..." />}
          {membersQuery.error && <div className="p-4"><ErrorState error={membersQuery.error} title="Không tải được thành viên" /></div>}
          {!membersQuery.isLoading && !membersQuery.error && members.length === 0 && (
            <div className="p-4">
              <EmptyState
                icon={Users}
                title="Chưa có thành viên"
              />
            </div>
          )}
          {!membersQuery.isLoading && !membersQuery.error && members.length > 0 && filteredMembers.length === 0 && (
            <div className="p-4">
              <EmptyState icon={Search} title="Không tìm thấy thành viên" />
            </div>
          )}
          {!membersQuery.isLoading && !membersQuery.error && filteredMembers.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-[1040px] w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Ban</th>
                    <th className="px-4 py-3">Telegram</th>
                    <th className="px-4 py-3">Tham gia event</th>
                    {isLeader && <th className="px-4 py-3 text-right">Thao tác</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
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
    <tr className="transition hover:bg-indigo-50/40">
      <td className="px-4 py-3">
        <Link to={`/events/${eventId}/members/${member.userId}`} className="flex min-w-0 items-center gap-3 rounded-lg p-1 transition hover:bg-white">
          <UserAvatar userId={member.userId} avatarUrl={member.avatarUrl} name={member.name} size="sm" />
          <span className="min-w-0">
            <span className="block truncate font-semibold text-slate-950">{member.name}</span>
          </span>
        </Link>
      </td>
      <td className="px-4 py-3">
        <span className="flex max-w-[220px] items-center gap-2 truncate text-slate-600">
          <Mail size={15} className="shrink-0 text-slate-400" />
          <span className="truncate">{member.email}</span>
        </span>
      </td>
      <td className="px-4 py-3">
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
            className="rounded-full border border-indigo-100 bg-indigo-50 px-3 py-2 text-sm font-bold text-indigo-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:opacity-60"
          >
            <option value="MEMBER">MEMBER</option>
            <option value="LEADER">LEADER</option>
          </select>
        ) : (
          <StatusBadge status={member.role} />
        )}
      </td>
      <td className="px-4 py-3">
        <span className="font-medium text-slate-700">{member.departmentName || 'Chưa gán ban'}</span>
      </td>
      <td className="px-4 py-3">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
          member.telegramLinked ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
        }`}>
          <Send size={13} />
          {member.telegramLinked ? 'Đã kết nối' : 'Chưa kết nối'}
        </span>
      </td>
      <td className="px-4 py-3 text-slate-600">
        <span className="inline-flex items-center gap-2">
          <CalendarDays size={15} className="text-slate-400" />
          {formatDate(member.joinedAt)}
        </span>
      </td>
      {isLeader && (
        <td className="px-4 py-3 text-right">
          {!isCurrentUser && (
            <button
              type="button"
              onClick={() => removeMemberMutation.mutate({ eventId, userId: member.userId })}
              disabled={removingThisMember}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-red-100 bg-red-50 px-3 py-2 text-sm font-bold text-red-600 shadow-sm transition hover:border-red-200 hover:bg-red-100 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
            >
              {removingThisMember ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              Xóa
            </button>
          )}
        </td>
      )}
    </tr>
  );
};

export default EventMembersPage;
