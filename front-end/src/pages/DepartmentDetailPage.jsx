import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import {
  BarChart3,
  ClipboardList,
  Mail,
  Plus,
  Send,
  UserRound,
  Users,
} from 'lucide-react';
import AppLayout from '../components/AppLayout';
import UserAvatar from '../components/UserAvatar';
import { Button, EmptyState, ErrorState, LoadingState, PageHeader, Panel, StatusBadge } from '../components/ui';
import departmentApi from '../api/departmentApi';
import eventApi from '../api/eventApi';
import taskApi from '../api/taskApi';

const EMPTY_MEMBERS = [];

const DepartmentDetailPage = ({ user, onLogout }) => {
  const { eventId, departmentId } = useParams();

  const eventQuery = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => eventApi.getEvent(eventId),
    enabled: Boolean(eventId),
  });
  const departmentQuery = useQuery({
    queryKey: ['department', eventId, departmentId],
    queryFn: () => departmentApi.getDepartment({ eventId, departmentId }),
    enabled: Boolean(eventId && departmentId),
  });
  const membersQuery = useQuery({
    queryKey: ['departmentMembers', eventId, departmentId],
    queryFn: () => departmentApi.getDepartmentMembers({ eventId, departmentId }),
    enabled: Boolean(eventId && departmentId),
  });
  const tasksQuery = useQuery({
    queryKey: ['departmentTasksSummary', eventId, departmentId],
    queryFn: () => taskApi.getEventTaskPage({ eventId, departmentId, size: 1 }),
    enabled: Boolean(eventId && departmentId),
  });

  const event = eventQuery.data;
  const department = departmentQuery.data;
  const isLeader = event?.role === 'LEADER';
  const members = membersQuery.data || EMPTY_MEMBERS;
  const taskCount = tasksQuery.data?.totalElements ?? tasksQuery.data?.totalItems ?? 0;

  return (
    <AppLayout user={user} events={event ? [event] : []} selectedEvent={event} onEventChange={() => {}} onLogout={onLogout}>
      <div className="space-y-5">
        {(eventQuery.isLoading || departmentQuery.isLoading) && (
          <LoadingState message="Đang tải tổng quan ban..." />
        )}

        {(eventQuery.error || departmentQuery.error) && (
          <ErrorState
            error={eventQuery.error || departmentQuery.error}
            title="Không tải được tổng quan ban"
          />
        )}

        {department && (
          <>
            <Panel className="p-5">
              <PageHeader
                eyebrow={event?.name || 'Sự kiện'}
                title={department.name || 'Ban tổ chức'}
                description={department.description || 'Chưa có mô tả nhiệm vụ cho ban này.'}
                actions={isLeader && (
                  <Button as={Link} to={`/events/${eventId}/tasks/new?departmentId=${departmentId}`}>
                    <Plus size={16} />
                    Tạo task
                  </Button>
                )}
                meta={
                  <>
                    <span className="inline-flex items-center gap-2">
                      <UserRound size={16} />
                      Trưởng ban: {department.leaderName || 'Chưa chọn'}
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
                  <h3 className="text-lg font-bold text-slate-950">Thành viên trong ban</h3>
                  <p className="text-sm text-slate-500">Danh sách người đang trực tiếp phụ trách công việc của ban.</p>
                </div>
                <Link
                  to={`/events/${eventId}/departments/${departmentId}/members`}
                  className="inline-flex w-fit items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  Quản lý thành viên
                </Link>
              </div>

              {membersQuery.isLoading && <LoadingState message="Đang tải thành viên trong ban..." />}
              {membersQuery.error && (
                <div className="p-4">
                  <ErrorState error={membersQuery.error} title="Không tải được thành viên trong ban" />
                </div>
              )}
              {!membersQuery.isLoading && !membersQuery.error && members.length === 0 && (
                <div className="p-4">
                  <EmptyState
                    icon={Users}
                    title="Chưa có thành viên trong ban"
                    description="Khi gán người vào ban, họ sẽ xuất hiện tại đây để leader theo dõi nhanh."
                  />
                </div>
              )}
              {!membersQuery.isLoading && !membersQuery.error && members.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Thành viên</th>
                        <th className="px-4 py-3">Email</th>
                        <th className="px-4 py-3">Role</th>
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

            <section className="grid gap-3 md:grid-cols-2">
              <OverviewAction
                to={`/events/${eventId}/departments/${departmentId}/dashboard`}
                icon={<BarChart3 size={18} />}
                title="Dashboard của ban"
                description="Xem tiến độ và trạng thái công việc theo ban."
              />
              <OverviewAction
                to={`/events/${eventId}/departments/${departmentId}/tasks`}
                icon={<ClipboardList size={18} />}
                title="Task của ban"
                description="Đi tới danh sách task đang giao cho ban này."
              />
            </section>
          </>
        )}
      </div>
    </AppLayout>
  );
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

export default DepartmentDetailPage;
