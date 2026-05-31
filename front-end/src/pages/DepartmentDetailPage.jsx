import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, BarChart3, ClipboardList } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import departmentApi from '../api/departmentApi';
import eventApi from '../api/eventApi';
import taskApi from '../api/taskApi';
import { formatDate } from '../utils/dateUtils';

const DepartmentDetailPage = ({ user, onLogout }) => {
  const { eventId, departmentId } = useParams();
  const eventQuery = useQuery({ queryKey: ['event', eventId], queryFn: () => eventApi.getEvent(eventId), enabled: Boolean(eventId) });
  const departmentQuery = useQuery({ queryKey: ['department', eventId, departmentId], queryFn: () => departmentApi.getDepartment({ eventId, departmentId }), enabled: Boolean(eventId && departmentId) });
  const tasksQuery = useQuery({ queryKey: ['departmentTasks', eventId, departmentId], queryFn: () => taskApi.getEventTaskPage({ eventId, departmentId, size: 20 }), enabled: Boolean(eventId && departmentId) });
  const event = eventQuery.data;
  const department = departmentQuery.data;
  const tasks = tasksQuery.data?.content || [];
  return (
    <AppLayout user={user} events={event ? [event] : []} selectedEvent={event} onEventChange={() => {}} onLogout={onLogout}>
      <div className="space-y-6">
        <Link to={`/events/${eventId}/departments`} className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600"><ArrowLeft size={16} />Quay lại departments</Link>
        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900">{department?.name || 'Department'}</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link to={`/events/${eventId}/departments/${departmentId}/dashboard`} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"><BarChart3 size={16} />Dashboard ban</Link>
            <Link to={`/events/${eventId}/tasks?departmentId=${departmentId}`} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"><ClipboardList size={16} />Xem trong task list</Link>
          </div>
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
