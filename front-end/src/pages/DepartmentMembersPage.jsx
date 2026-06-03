import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { CalendarDays, Loader2, Mail, Search, Send, UserMinus, UserPlus, Users } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import UserAvatar from '../components/UserAvatar';
import { EmptyState, ErrorState, LoadingState, PageHeader, Panel, StatusBadge, TextInput } from '../components/ui';
import departmentApi from '../api/departmentApi';
import eventApi from '../api/eventApi';
import eventMemberApi from '../api/eventMemberApi';
import { formatDate } from '../utils/dateUtils';

const EMPTY_MEMBERS = [];

const DepartmentMembersPage = ({ user, onLogout }) => {
  const { eventId, departmentId } = useParams();
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  const eventQuery = useQuery({ queryKey: ['event', eventId], queryFn: () => eventApi.getEvent(eventId), enabled: Boolean(eventId) });
  const departmentQuery = useQuery({ queryKey: ['department', eventId, departmentId], queryFn: () => departmentApi.getDepartment({ eventId, departmentId }), enabled: Boolean(eventId && departmentId) });
  const eventMembersQuery = useQuery({ queryKey: ['eventMembers', eventId], queryFn: () => eventMemberApi.getMembers(eventId), enabled: Boolean(eventId) });
  const departmentMembersQuery = useQuery({ queryKey: ['departmentMembers', eventId, departmentId], queryFn: () => departmentApi.getDepartmentMembers({ eventId, departmentId }), enabled: Boolean(eventId && departmentId) });

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

  const event = eventQuery.data;
  const department = departmentQuery.data;
  const isLeader = event?.role === 'LEADER';
  const departmentMembers = departmentMembersQuery.data || EMPTY_MEMBERS;
  const filteredMembers = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return departmentMembers.filter((member) => {
      const searchable = [
        member.name,
        member.email,
        member.role,
        member.telegramLinked ? 'telegram da ket noi' : 'telegram chua ket noi',
      ].filter(Boolean).join(' ').toLowerCase();
      const matchesKeyword = !keyword || searchable.includes(keyword);
      const matchesRole = !roleFilter || member.role === roleFilter;

      return matchesKeyword && matchesRole;
    });
  }, [departmentMembers, roleFilter, search]);
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
    <AppLayout user={user} events={event ? [event] : []} selectedEvent={event} onEventChange={() => {}} onLogout={onLogout}>
      <div className="space-y-6">
        <Panel className="p-4">
          <PageHeader
            eyebrow={event?.name || 'Sự kiện'}
            title={`Thành viên ${department?.name || 'ban'}`}
            description="Quản lý thành viên thuộc ban, trạng thái kết nối và thao tác gỡ khỏi ban."
          />

          {isLeader && (
            <form onSubmit={handleAssignMember} className="mt-4 grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 md:grid-cols-[1fr_auto]">
              <select
                value={selectedUserId}
                onChange={(event) => setSelectedUserId(event.target.value)}
                disabled={eventMembersQuery.isLoading || assignMemberMutation.isPending}
                className="min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50"
              >
                <option value="">Chọn thành viên để gán vào ban</option>
                {assignableMembers.map((member) => (
                  <option key={member.userId} value={member.userId}>
                    {member.name} ({member.email})
                  </option>
                ))}
              </select>
              <button type="submit" disabled={!selectedUserId || assignMemberMutation.isPending} className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:from-indigo-700 hover:to-blue-700 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60">
                {assignMemberMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                Gán vào ban
              </button>
            </form>
          )}

          {(assignMemberMutation.error || removeMemberMutation.error) && (
            <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {(assignMemberMutation.error || removeMemberMutation.error).userMessage || (assignMemberMutation.error || removeMemberMutation.error).message}
            </div>
          )}
        </Panel>

        <Panel className="overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-950">Danh sách user</h2>
              <p className="text-sm text-slate-500">Các thành viên hiện đang thuộc ban này.</p>
            </div>
            <div className="grid w-full gap-2 lg:max-w-xl lg:grid-cols-[minmax(220px,1fr)_150px]">
              <TextInput
                aria-label="Tìm kiếm thành viên trong ban"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm tên, email, role..."
              />
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
            </div>
          </div>

          {departmentMembersQuery.isLoading && <LoadingState message="Đang tải thành viên trong ban..." />}
          {departmentMembersQuery.error && (
            <div className="p-4">
              <ErrorState error={departmentMembersQuery.error} title="Không tải được thành viên trong ban" />
            </div>
          )}
          {!departmentMembersQuery.isLoading && !departmentMembersQuery.error && departmentMembers.length === 0 && (
            <div className="p-4">
              <EmptyState icon={Users} title="Chưa có thành viên trong ban" description="Gán thành viên từ danh sách sự kiện vào ban này." />
            </div>
          )}
          {!departmentMembersQuery.isLoading && !departmentMembersQuery.error && departmentMembers.length > 0 && filteredMembers.length === 0 && (
            <div className="p-4">
              <EmptyState icon={Search} title="Không tìm thấy thành viên" description="Thử đổi từ khóa tìm kiếm." />
            </div>
          )}
          {!departmentMembersQuery.isLoading && !departmentMembersQuery.error && filteredMembers.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-[880px] w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Telegram</th>
                    <th className="px-4 py-3">Tham gia event</th>
                    {isLeader && <th className="px-4 py-3 text-right">Thao tác</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredMembers.map((member) => (
                    <DepartmentMemberRow
                      key={member.id}
                      eventId={eventId}
                      departmentId={departmentId}
                      member={member}
                      isLeader={isLeader}
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

const DepartmentMemberRow = ({ eventId, departmentId, member, isLeader, removeMemberMutation }) => {
  const removingThisMember = removeMemberMutation.isPending && removeMemberMutation.variables?.userId === member.userId;

  return (
    <tr className="transition hover:bg-indigo-50/40">
      <td className="px-4 py-3">
        <Link to={`/events/${eventId}/members/${member.userId}`} className="flex min-w-0 items-center gap-3 rounded-lg p-1 transition hover:bg-white">
          <UserAvatar userId={member.userId} avatarUrl={member.avatarUrl} name={member.name} size="sm" />
          <span className="min-w-0 truncate font-semibold text-slate-950">{member.name}</span>
        </Link>
      </td>
      <td className="px-4 py-3">
        <span className="flex max-w-[260px] items-center gap-2 truncate text-slate-600">
          <Mail size={15} className="shrink-0 text-slate-400" />
          <span className="truncate">{member.email}</span>
        </span>
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={member.role} />
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
          <button
            type="button"
            onClick={() => removeMemberMutation.mutate({ eventId, departmentId, userId: member.userId })}
            disabled={removingThisMember}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-red-100 bg-red-50 px-3 py-2 text-sm font-bold text-red-600 shadow-sm transition hover:border-red-200 hover:bg-red-100 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
          >
            {removingThisMember ? <Loader2 size={16} className="animate-spin" /> : <UserMinus size={16} />}
            Gỡ khỏi ban
          </button>
        </td>
      )}
    </tr>
  );
};

export default DepartmentMembersPage;
