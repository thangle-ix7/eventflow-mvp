import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Building2, Loader2, Plus } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import departmentApi from '../api/departmentApi';
import eventApi from '../api/eventApi';

const DepartmentListPage = ({ user, onLogout }) => {
  const { eventId } = useParams();
  const eventQuery = useQuery({ queryKey: ['event', eventId], queryFn: () => eventApi.getEvent(eventId), enabled: Boolean(eventId) });
  const departmentsQuery = useQuery({ queryKey: ['eventDepartments', eventId], queryFn: () => departmentApi.getEventDepartments(eventId), enabled: Boolean(eventId) });
  const event = eventQuery.data;
  const isLeader = event?.role === 'LEADER';

  return (
    <AppLayout user={user} events={event ? [event] : []} selectedEvent={event} onEventChange={() => {}} onLogout={onLogout}>
      <div className="space-y-6">
        <Link to={`/events/${eventId}`} className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600"><ArrowLeft size={16} />Quay lại sự kiện</Link>
        <section className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Departments</h2>
            <p className="mt-1 text-sm text-gray-500">Các ban phụ trách trong sự kiện.</p>
          </div>
          {isLeader && <Link to={`/events/${eventId}/departments/new`} className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"><Plus size={18} />Tạo department</Link>}
        </section>
        <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
          {departmentsQuery.isLoading && <div className="flex items-center justify-center gap-2 p-8 text-gray-500"><Loader2 size={20} className="animate-spin" />Đang tải departments...</div>}
          {departmentsQuery.error && <div className="p-4 text-red-700">{departmentsQuery.error.userMessage || departmentsQuery.error.message}</div>}
          {!departmentsQuery.isLoading && departmentsQuery.data?.length === 0 && <div className="p-8 text-center text-gray-500">Chưa có department.</div>}
          {departmentsQuery.data?.map((department) => (
            <Link key={department.id} to={`/events/${eventId}/departments/${department.id}`} className="flex items-center gap-3 border-b border-gray-100 p-4 last:border-b-0 hover:bg-blue-50/50">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600"><Building2 size={20} /></div>
              <div><p className="font-semibold text-gray-900">{department.name}</p><p className="text-sm text-gray-500">Xem task và dashboard của ban</p></div>
            </Link>
          ))}
        </section>
      </div>
    </AppLayout>
  );
};

export default DepartmentListPage;
