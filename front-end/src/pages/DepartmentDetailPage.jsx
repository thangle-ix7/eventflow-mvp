import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, BarChart3, ClipboardList, Loader2, Plus, UserMinus, UserPlus, Users } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import departmentApi from '../api/departmentApi';
import eventApi from '../api/eventApi';
import eventMemberApi from '../api/eventMemberApi';
import taskApi from '../api/taskApi';
import { formatDate } from '../utils/dateUtils';

const EMPTY_MEMBERS = [];

const DepartmentDetailPage = ({ user, onLogout }) => {
  const { eventId, departmentId } = useParams();
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState('');
  const eventQuery = useQuery({ queryKey: ['event', eventId], queryFn: () => eventApi.getEvent(eventId), enabled: Boolean(eventId) });
  const departmentQuery = useQuery({ queryKey: ['department', eventId, departmentId], queryFn: () => departmentApi.getDepartment({ eventId, departmentId }), enabled: Boolean(eventId && departmentId) });
  const eventMembersQuery = useQuery({ queryKey: ['eventMembers', eventId], queryFn: () => eventMemberApi.getMembers(eventId), enabled: Boolean(eventId) });
  const departmentMembersQuery = useQuery({ queryKey: ['departmentMembers', eventId, departmentId], queryFn: () => departmentApi.getDepartmentMembers({ eventId, departmentId }), enabled: Boolean(eventId && departmentId) });
  const tasksQuery = useQuery({ queryKey: ['departmentTasks', eventId, departmentId], queryFn: () => taskApi.getEventTaskPage({ eventId, departmentId, size: 20 }), enabled: Boolean(eventId && departmentId) });

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
  const assignableMembers = useMemo(() => {
    const assignedIds = new Set(departmentMembers.map((member) => member.userId));
    return (eventMembersQuery.data || []).filter((member) => !assignedIds.has(member.userId));
  }, [departmentMembers, eventMembersQuery.data]);
  const tasks = tasksQuery.data?.content || [];

  const handleAssignMember = (event) => {
    event.preventDefault();
    if (!selectedUserId) return;
    assignMemberMutation.mutate({ eventId, departmentId, userId: Number(selectedUserId) });
  };

  return (
    <AppLayout user={user} events={event ? [event] : []} selectedEvent={event} onEventChange={() => {}} onLogout={onLogout}>
      <div className="space-y-6">
        <Link to={`/events/${eventId}/departments`} className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600"><ArrowLeft size={16} />Quay lại departments</Link>
        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900">{department?.name || 'Department'}</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link to={`/events/${eventId}/departments/${departmentId}/dashboard`} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"><BarChart3 size={16} />Dashboard ban</Link>
            {isLeader && <Link to={`/events/${eventId}/tasks/new?departmentId=${departmentId}`} className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700"><Plus size={16} />Tạo task cho ban</Link>}
            <Link to={`/events/${eventId}/tasks?departmentId=${departmentId}`} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"><ClipboardList size={16} />Xem trong task list</Link>
          </div>
        </section>
        <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-gray-100 p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="flex items-center gap-2 font-semibold text-gray-900"><Users size={18} />Thành viên department</h3>
              <p className="mt-1 text-sm text-gray-500">Gán thành viên sự kiện vào department để dễ theo dõi phạm vi công việc.</p>
            </div>
            {isLeader && (
              <form onSubmit={handleAssignMember} className="flex flex-col gap-2 sm:flex-row">
                <select
                  value={selectedUserId}
                  onChange={(event) => setSelectedUserId(event.target.value)}
                  disabled={eventMembersQuery.isLoading || assignMemberMutation.isPending}
                  className="min-w-56 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:bg-gray-50"
                >
                  <option value="">Chọn thành viên</option>
                  {assignableMembers.map((member) => (
                    <option key={member.userId} value={member.userId}>
                      {member.name} ({member.email})
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={!selectedUserId || assignMemberMutation.isPending}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {assignMemberMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                  Gán
                </button>
              </form>
            )}
          </div>
          {(assignMemberMutation.error || removeMemberMutation.error) && (
            <div className="m-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {(assignMemberMutation.error || removeMemberMutation.error).userMessage || (assignMemberMutation.error || removeMemberMutation.error).message}
            </div>
          )}
          {departmentMembersQuery.isLoading && (
            <div className="flex items-center justify-center gap-2 p-8 text-gray-500">
              <Loader2 size={20} className="animate-spin" />
              Đang tải thành viên department...
            </div>
          )}
          {departmentMembersQuery.error && (
            <div className="p-4 text-red-700">{departmentMembersQuery.error.userMessage || departmentMembersQuery.error.message}</div>
          )}
          {!departmentMembersQuery.isLoading && departmentMembers.length === 0 && (
            <div className="p-8 text-center text-gray-500">Chưa có thành viên trong department này.</div>
          )}
          {departmentMembers.map((member) => (
            <div key={member.id} className="flex flex-col gap-3 border-b border-gray-100 p-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-gray-900">{member.name}</p>
                <p className="text-sm text-gray-500">{member.email} • {member.role}</p>
              </div>
              {isLeader && (
                <button
                  type="button"
                  onClick={() => removeMemberMutation.mutate({ eventId, departmentId, userId: member.userId })}
                  disabled={removeMemberMutation.isPending}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
                >
                  <UserMinus size={16} />
                  Gỡ khỏi department
                </button>
              )}
            </div>
          ))}
        </section>
        <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 p-4"><h3 className="font-semibold text-gray-900">Task của department</h3></div>
          {tasks.length === 0 && <div className="p-8 text-center text-gray-500">Chưa có task trong department này.</div>}
          {tasks.map((task) => (
            <Link key={task.id} to={`/events/${eventId}/tasks/${task.id}`} className="block border-b border-gray-100 p-4 last:border-b-0 hover:bg-blue-50/50">
              <p className="font-semibold text-gray-900">{task.title}</p>
              <p className="mt-1 text-sm text-gray-500">{task.assigneeName || 'Chưa phân công'} • {task.status} • {formatDate(task.deadline)}</p>
            </Link>
          ))}
        </section>
      </div>
    </AppLayout>
  );
};

export default DepartmentDetailPage;
