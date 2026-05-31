import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, UserPlus } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import eventApi from '../api/eventApi';
import eventMemberApi from '../api/eventMemberApi';

const EventMembersPage = ({ user, onLogout }) => {
  const { eventId } = useParams();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ email: '', role: 'MEMBER' });

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
        <Link to={`/events/${eventId}`} className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600">
          <ArrowLeft size={16} />
          Quay lại sự kiện
        </Link>

        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900">Thành viên sự kiện</h2>
          <p className="mt-1 text-sm text-gray-500">Thêm thành viên bằng email tài khoản đã đăng ký EventFlow.</p>

          {isLeader && (
            <form onSubmit={handleSubmit} className="mt-4 grid gap-3 md:grid-cols-[1fr_160px_auto]">
              <input
                type="email"
                value={form.email}
                onChange={(event) => setForm((old) => ({ ...old, email: event.target.value }))}
                required
                placeholder="member@example.com"
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
              <select
                value={form.role}
                onChange={(event) => setForm((old) => ({ ...old, role: event.target.value }))}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              >
                <option value="MEMBER">MEMBER</option>
                <option value="LEADER">LEADER</option>
              </select>
              <button
                type="submit"
                disabled={addMemberMutation.isPending}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                <UserPlus size={18} />
                Thêm
              </button>
            </form>
          )}

          {addMemberMutation.error && (
            <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {addMemberMutation.error.userMessage || addMemberMutation.error.message}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
          {membersQuery.isLoading && (
            <div className="flex items-center justify-center gap-2 p-8 text-gray-500">
              <Loader2 size={20} className="animate-spin" />
              Đang tải thành viên...
            </div>
          )}
          {membersQuery.error && (
            <div className="p-4 text-red-700">{membersQuery.error.userMessage || membersQuery.error.message}</div>
          )}
          {membersQuery.data?.map((member) => (
            <div key={member.id} className="flex flex-col gap-3 border-b border-gray-100 p-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-gray-900">{member.name}</p>
                <p className="text-sm text-gray-500">{member.email}</p>
              </div>
              <div className="flex items-center gap-2">
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
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  >
                    <option value="MEMBER">MEMBER</option>
                    <option value="LEADER">LEADER</option>
                  </select>
                ) : (
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">{member.role}</span>
                )}
                {isLeader && member.userId !== user.userId && (
                  <button
                    type="button"
                    onClick={() => removeMemberMutation.mutate({ eventId, userId: member.userId })}
                    className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                  >
                    Xóa
                  </button>
                )}
              </div>
            </div>
          ))}
        </section>
      </div>
    </AppLayout>
  );
};

export default EventMembersPage;
