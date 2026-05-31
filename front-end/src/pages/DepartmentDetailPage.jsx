import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, BarChart3, ClipboardList, Plus, Users } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import departmentApi from '../api/departmentApi';
import eventApi from '../api/eventApi';
import taskApi from '../api/taskApi';

const DepartmentDetailPage = ({ user, onLogout }) => {
  const { eventId, departmentId } = useParams();

  const eventQuery = useQuery({ queryKey: ['event', eventId], queryFn: () => eventApi.getEvent(eventId), enabled: Boolean(eventId) });
  const departmentQuery = useQuery({ queryKey: ['department', eventId, departmentId], queryFn: () => departmentApi.getDepartment({ eventId, departmentId }), enabled: Boolean(eventId && departmentId) });
  const membersQuery = useQuery({ queryKey: ['departmentMembers', eventId, departmentId], queryFn: () => departmentApi.getDepartmentMembers({ eventId, departmentId }), enabled: Boolean(eventId && departmentId) });
  const tasksQuery = useQuery({ queryKey: ['departmentTasksSummary', eventId, departmentId], queryFn: () => taskApi.getEventTaskPage({ eventId, departmentId, size: 1 }), enabled: Boolean(eventId && departmentId) });

  const event = eventQuery.data;
  const department = departmentQuery.data;
  const isLeader = event?.role === 'LEADER';
  const memberCount = membersQuery.data?.length ?? 0;
  const taskCount = tasksQuery.data?.totalElements ?? tasksQuery.data?.totalItems ?? 0;

  return (
    <AppLayout user={user} events={event ? [event] : []} selectedEvent={event} onEventChange={() => {}} onLogout={onLogout}>
      <div className="space-y-6">
        <Link to={`/events/${eventId}/departments`} className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600">
          <ArrowLeft size={16} />
          Quay lại departments
        </Link>

        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{department?.name || 'Department'}</h2>
              <p className="mt-1 text-sm text-gray-500">Tổng quan department và các khu vực quản lý riêng.</p>
            </div>
            {isLeader && (
              <Link to={`/events/${eventId}/tasks/new?departmentId=${departmentId}`} className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                <Plus size={18} />
                Tạo task
              </Link>
            )}
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <Link to={`/events/${eventId}/departments/${departmentId}/dashboard`} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-blue-200 hover:bg-blue-50/40">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-50 p-2 text-blue-600"><BarChart3 size={20} /></div>
              <div>
                <p className="font-semibold text-gray-900">Dashboard</p>
                <p className="text-sm text-gray-500">Tổng hợp tiến độ và phân bổ task.</p>
              </div>
            </div>
          </Link>

          <Link to={`/events/${eventId}/departments/${departmentId}/members`} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-blue-200 hover:bg-blue-50/40">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-50 p-2 text-green-700"><Users size={20} /></div>
              <div>
                <p className="font-semibold text-gray-900">Members</p>
                <p className="text-sm text-gray-500">{memberCount} thành viên trong department.</p>
              </div>
            </div>
          </Link>

          <Link to={`/events/${eventId}/departments/${departmentId}/tasks`} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-blue-200 hover:bg-blue-50/40">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-purple-50 p-2 text-purple-700"><ClipboardList size={20} /></div>
              <div>
                <p className="font-semibold text-gray-900">Tasks</p>
                <p className="text-sm text-gray-500">{taskCount} task thuộc department.</p>
              </div>
            </div>
          </Link>
        </section>
      </div>
    </AppLayout>
  );
};

export default DepartmentDetailPage;
