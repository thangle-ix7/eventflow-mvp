import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Loader2,
  Mail,
  Search,
  Send,
  Trash2,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import AppLayout from '../components/AppLayout';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
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
const EMPTY_INVITATIONS = [];
const isEventClosed = (event) => ['CANCELLED', 'CANCELED', 'DONE'].includes(String(event?.status || '').toUpperCase());

const EventMembersPage = ({ user, onLogout }) => {
  const { eventId } = useParams();
  const queryClient = useQueryClient();
  const [inviteForm, setInviteForm] = useState({ emails: [], role: 'MEMBER' });
  const [inviteInput, setInviteInput] = useState('');
  const [inviteResult, setInviteResult] = useState(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

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

  const event = eventQuery.data;
  const isLeader = event?.role === 'LEADER';
  const eventClosed = isEventClosed(event);

  const invitationsQuery = useQuery({
    queryKey: ['eventInvitations', eventId],
    queryFn: () => eventMemberApi.getInvitations(eventId),
    enabled: Boolean(eventId && isLeader),
  });

  const bulkInviteMutation = useMutation({
    mutationFn: eventMemberApi.bulkInviteMembers,
    onSuccess: (result) => {
      setInviteResult(result);
      const failedEmails = (result.results || [])
        .filter((item) => item.status !== 'SENT')
        .map((item) => item.email)
        .filter(Boolean);
      setInviteForm((old) => ({ ...old, emails: uniqueEmails(failedEmails) }));
      setInviteInput('');
      queryClient.invalidateQueries({ queryKey: ['eventMembers', eventId] });
      queryClient.invalidateQueries({ queryKey: ['eventInvitations', eventId] });
    },
  });

  const cancelInvitationMutation = useMutation({
    mutationFn: eventMemberApi.cancelInvitation,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['eventInvitations', eventId] }),
  });

  const updateRoleMutation = useMutation({
    mutationFn: eventMemberApi.updateRole,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['eventMembers', eventId] }),
  });

  const removeMemberMutation = useMutation({
    mutationFn: eventMemberApi.removeMember,
    onSuccess: () => {
      setDeleteConfirm(null);
      queryClient.invalidateQueries({ queryKey: ['eventMembers', eventId] });
    },
  });

  const members = membersQuery.data || EMPTY_MEMBERS;
  const departments = departmentsQuery.data || EMPTY_DEPARTMENTS;
  const invitations = invitationsQuery.data || EMPTY_INVITATIONS;

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

  const addInviteEmails = (value) => {
    const parsedEmails = parseEmailList(value);
    if (!parsedEmails.length) {
      return;
    }

    setInviteForm((old) => ({
      ...old,
      emails: uniqueEmails([...old.emails, ...parsedEmails]),
    }));
    setInviteInput('');
  };

  const removeInviteEmail = (email) => {
    setInviteForm((old) => ({
      ...old,
      emails: old.emails.filter((item) => item !== email),
    }));
  };

  const handleInviteKeyDown = (event) => {
    if (!['Enter', 'Tab', ',', ';', ' '].includes(event.key)) {
      return;
    }

    if (!inviteInput.trim()) {
      return;
    }

    event.preventDefault();
    addInviteEmails(inviteInput);
  };

  const handleInvitePaste = (event) => {
    const pastedText = event.clipboardData.getData('text');
    const pastedEmails = parseEmailList(pastedText);
    if (pastedEmails.length <= 1) {
      return;
    }

    event.preventDefault();
    addInviteEmails(pastedText);
  };

  const handleInviteSubmit = (submitEvent) => {
    submitEvent.preventDefault();
    setInviteResult(null);
    const emails = uniqueEmails([...inviteForm.emails, ...parseEmailList(inviteInput)]);
    if (!emails.length || bulkInviteMutation.isPending) {
      return;
    }

    setInviteForm((old) => ({ ...old, emails }));
    setInviteInput('');
    bulkInviteMutation.mutate({
      eventId,
      payload: {
        emails,
        role: inviteForm.role,
      },
    });
  };

  const requestCancelInvitation = (invitation) => {
    setDeleteConfirm({
      type: 'invitation',
      title: 'Hủy lời mời thành viên',
      message: `Bạn có chắc chắn muốn hủy lời mời tới "${invitation.email}"? Người này sẽ không thể dùng link mời hiện tại để tham gia event.`,
      payload: { eventId, invitationId: invitation.id },
    });
  };

  const requestRemoveMember = (member) => {
    setDeleteConfirm({
      type: 'member',
      title: 'Xóa thành viên khỏi event',
      message: `Bạn có chắc chắn muốn xóa "${member.name || member.email}" khỏi event? Thành viên này sẽ mất quyền truy cập các công việc và dữ liệu nội bộ của event.`,
      payload: { eventId, userId: member.userId },
    });
  };

  const confirmDeleteAction = () => {
    if (!deleteConfirm) {
      return;
    }

    if (deleteConfirm.type === 'invitation') {
      cancelInvitationMutation.mutate(deleteConfirm.payload, {
        onSuccess: () => setDeleteConfirm(null),
      });
      return;
    }

    removeMemberMutation.mutate(deleteConfirm.payload);
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
        {isLeader && eventClosed && (
          <Panel className="border-amber-100 bg-amber-50/80 p-4 text-sm font-semibold leading-6 text-amber-800">
            Sự kiện đã đóng nên không thể mời, đổi vai trò hoặc xóa thành viên. Danh sách bên dưới chỉ còn ở chế độ xem.
          </Panel>
        )}

        {isLeader && !eventClosed && (
          <Panel className="p-5" data-guide-target="member-invite-area">
            <form onSubmit={handleInviteSubmit} className="grid gap-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <h3 className="text-lg font-black text-slate-950">
                  Mời thành viên
                </h3>

                <div className="grid gap-3 sm:grid-cols-[160px_minmax(180px,1fr)] lg:w-[460px]">
                  <select
                    value={inviteForm.role}
                    onChange={(event) => setInviteForm((old) => ({ ...old, role: event.target.value }))}
                    className={inputClassName}
                  >
                    <option value="MEMBER">MEMBER</option>
                    <option value="LEADER">LEADER</option>
                  </select>

                  <button
                    type="submit"
                    disabled={(!inviteForm.emails.length && !parseEmailList(inviteInput).length) || bulkInviteMutation.isPending}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400 px-4 py-2 text-sm font-black text-white shadow-xl shadow-cyan-100 transition hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-cyan-200 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {bulkInviteMutation.isPending ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Send size={18} />
                    )}
                    Gửi lời mời
                  </button>
                </div>
              </div>

              <div className="flex min-h-14 flex-wrap items-center gap-2 rounded-2xl border border-sky-100 bg-white px-3 py-2 focus-within:border-cyan-300 focus-within:ring-4 focus-within:ring-cyan-100">
                {inviteForm.emails.map((email) => (
                  <span
                    key={email}
                    className="inline-flex max-w-full items-center gap-2 rounded-full border border-sky-100 bg-sky-50 px-3 py-1.5 text-sm font-bold text-slate-700"
                  >
                    <Mail size={14} className="shrink-0 text-sky-500" />
                    <span className="max-w-[220px] truncate">{email}</span>
                    <button
                      type="button"
                      onClick={() => removeInviteEmail(email)}
                      disabled={bulkInviteMutation.isPending}
                      className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-white hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                      aria-label={`Xóa ${email}`}
                    >
                      <X size={13} />
                    </button>
                  </span>
                ))}

                <input
                  value={inviteInput}
                  onChange={(event) => setInviteInput(event.target.value)}
                  onKeyDown={handleInviteKeyDown}
                  onPaste={handleInvitePaste}
                  disabled={bulkInviteMutation.isPending}
                  placeholder={inviteForm.emails.length ? '' : 'Email'}
                  className="min-h-9 min-w-[220px] flex-1 border-0 bg-transparent px-1 text-sm font-semibold text-slate-800 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:text-slate-500"
                />
              </div>
            </form>

            {inviteResult && <BulkInviteResult result={inviteResult} />}

            {bulkInviteMutation.error && (
              <div className="mt-4">
                <ErrorState error={bulkInviteMutation.error} title="Không gửi được lời mời" />
              </div>
            )}
          </Panel>
        )}

        {isLeader && (
          <InvitationPanel
            invitations={invitations}
            isLoading={invitationsQuery.isLoading}
            error={invitationsQuery.error || cancelInvitationMutation.error}
            cancelInvitationMutation={cancelInvitationMutation}
            disabled={eventClosed}
            onRequestCancel={requestCancelInvitation}
          />
        )}

        <Panel className="overflow-hidden" data-guide-target="member-list">
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
                description="Khi lời mời được xác nhận, thành viên sẽ hiển thị tại đây."
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
                      disabledActions={eventClosed}
                      onRequestRemove={requestRemoveMember}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
      <DeleteConfirmModal
        isOpen={Boolean(deleteConfirm)}
        title={deleteConfirm?.title}
        message={deleteConfirm?.message}
        isLoading={cancelInvitationMutation.isPending || removeMemberMutation.isPending}
        onConfirm={confirmDeleteAction}
        onCancel={() => setDeleteConfirm(null)}
      />
    </AppLayout>
  );
};

const BulkInviteResult = ({ result }) => {
  const failedItems = (result.results || []).filter((item) => item.status !== 'SENT');

  return (
    <div className="relative mt-4 rounded-2xl border border-sky-100 bg-white/85 p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-3 text-sm font-black">
        <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-700">
          <CheckCircle2 size={16} />
          {result.sentCount || 0} đã gửi
        </span>
        <span className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1.5 text-red-700">
          <XCircle size={16} />
          {result.failedCount || 0} lỗi
        </span>
      </div>

      {failedItems.length > 0 && (
        <div className="mt-3 overflow-x-auto rounded-2xl border border-red-100">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="bg-red-50 text-xs font-black uppercase tracking-[0.14em] text-red-500">
              <tr>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Lỗi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-red-50 bg-white">
              {failedItems.map((item, index) => (
                <tr key={`${item.email}-${index}`}>
                  <td className="px-4 py-3 font-bold text-slate-800">{item.email || '-'}</td>
                  <td className="px-4 py-3 font-semibold text-red-600">{item.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const InvitationPanel = ({ invitations, isLoading, error, cancelInvitationMutation, disabled = false, onRequestCancel }) => (
  <Panel className="overflow-hidden">
    <div className="flex items-center gap-3 border-b border-sky-100 bg-gradient-to-r from-sky-50 via-white to-emerald-50 px-5 py-5">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-emerald-400 text-white shadow-lg shadow-cyan-100">
        <Mail className="h-5 w-5" strokeWidth={1.8} />
      </div>
      <div>
        <h2 className="text-lg font-black text-slate-950">Lời mời thành viên</h2>
        <p className="mt-1 text-sm font-semibold text-slate-500">Theo dõi trạng thái và hủy lời mời đang chờ xác nhận.</p>
      </div>
    </div>

    {isLoading && (
      <div className="p-5">
        <LoadingState message="Đang tải lời mời..." />
      </div>
    )}

    {error && (
      <div className="p-5">
        <ErrorState error={error} title="Không thao tác được lời mời" />
      </div>
    )}

    {!isLoading && !error && invitations.length === 0 && (
      <div className="p-5">
        <EmptyState icon={Mail} title="Chưa có lời mời" description="Các lời mời đã gửi sẽ xuất hiện tại đây để bạn theo dõi trạng thái." />
      </div>
    )}

    {!isLoading && invitations.length > 0 && (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="bg-sky-50/70 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
            <tr>
              <th className="px-5 py-4">Email</th>
              <th className="px-5 py-4">Role</th>
              <th className="px-5 py-4">Trạng thái</th>
              <th className="px-5 py-4">Hết hạn</th>
              <th className="px-5 py-4 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sky-50">
            {invitations.map((invitation) => {
              const cancelling = cancelInvitationMutation.isPending
                && cancelInvitationMutation.variables?.invitationId === invitation.id;
              return (
                <tr key={invitation.id} className="transition hover:bg-sky-50/70">
                  <td className="px-5 py-4 font-bold text-slate-800">{invitation.email}</td>
                  <td className="px-5 py-4"><StatusBadge status={invitation.role} /></td>
                  <td className="px-5 py-4"><InvitationStatusBadge status={invitation.status} /></td>
                  <td className="px-5 py-4 font-semibold text-slate-600">{formatDate(invitation.expiresAt)}</td>
                  <td className="px-5 py-4 text-right">
                    {invitation.status === 'PENDING' && !disabled && (
                      <button
                        type="button"
                        onClick={() => onRequestCancel(invitation)}
                        disabled={cancelling}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-black text-red-600 shadow-sm transition hover:-translate-y-0.5 hover:border-red-200 hover:bg-red-100 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {cancelling ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                        Hủy
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    )}
  </Panel>
);

const InvitationStatusBadge = ({ status }) => {
  const meta = {
    PENDING: { label: 'Đang chờ', className: 'border-amber-200 bg-amber-50 text-amber-700', icon: Clock3 },
    ACCEPTED: { label: 'Đã tham gia', className: 'border-emerald-200 bg-emerald-50 text-emerald-700', icon: CheckCircle2 },
    CANCELLED: { label: 'Đã hủy', className: 'border-slate-200 bg-slate-50 text-slate-600', icon: XCircle },
    EXPIRED: { label: 'Hết hạn', className: 'border-red-200 bg-red-50 text-red-700', icon: AlertTriangle },
  }[status] || { label: status || 'Không rõ', className: 'border-slate-200 bg-slate-50 text-slate-600', icon: AlertTriangle };
  const Icon = meta.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-black shadow-sm ${meta.className}`}>
      <Icon size={13} />
      {meta.label}
    </span>
  );
};

const MemberRow = ({
  eventId,
  member,
  currentUserId,
  isLeader,
  updateRoleMutation,
  removeMemberMutation,
  disabledActions = false,
  onRequestRemove,
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
        {isLeader && !disabledActions ? (
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
          {!isCurrentUser && !disabledActions && (
            <button
              type="button"
              onClick={() => onRequestRemove(member)}
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

const parseEmailList = (value) => String(value || '')
  .split(/[\s,;]+/)
  .map((email) => email.trim())
  .filter(Boolean);

const uniqueEmails = (emails) => [...new Set(emails.map((email) => email.trim()).filter(Boolean))];

const inputClassName = 'min-h-11 w-full min-w-0 rounded-2xl border border-sky-100 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-cyan-300 focus:bg-white focus:ring-4 focus:ring-cyan-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500';

export default EventMembersPage;
