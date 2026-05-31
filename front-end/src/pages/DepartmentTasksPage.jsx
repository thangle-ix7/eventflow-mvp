import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, ClipboardList, Loader2, Plus, Search } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import departmentApi from '../api/departmentApi';
import eventApi from '../api/eventApi';
import taskApi from '../api/taskApi';
import { formatDate } from '../utils/dateUtils';

const PAGE_SIZE = 10;

const DepartmentTasksPage = ({ user, onLogout }) => {
  const { eventId, departmentId } = useParams();
  const [page, setPage] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const eventQuery = useQuery({ queryKey: ['event', eventId], queryFn: () => eventApi.getEvent(eventId), enabled: Boolean(eventId) });
  const departmentQuery = useQuery({ queryKey: ['department', eventId, departmentId], queryFn: () => departmentApi.getDepartment({ eventId, departmentId }), enabled: Boolean(eventId && departmentId) });
  const tasksQuery = useQuery({
    queryKey: ['departmentTaskPage', eventId, departmentId, page, search, status],
    queryFn: () => taskApi.getEventTaskPage({ eventId, departmentId, page, size: PAGE_SIZE, search, status }),
    enabled: Boolean(eventId && departmentId),
  });

  const event = eventQuery.data;
  const department = departmentQuery.data;
  const tasks = tasksQuery.data?.content || [];
  const isLeader = event?.role === 'LEADER';

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    setPage(0);
    setSearch(searchInput.trim());
  };

  return (
    <AppLayout user={user} events={event ? [event] : []} selectedEvent={event} onEventChange={() => {}} onLogout={onLogout}>
      <div className="space-y-6">
        <Link to={`/events/${eventId}/departments/${departmentId}`} className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600">
          <ArrowLeft size={16} />
          Quay lại department
        </Link>

        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
                <ClipboardList size={22} />
                Task của {department?.name || 'department'}
              </h2>
              <p className="mt-1 text-sm text-gray-500">Danh sách task thuộc riêng department này.</p>
            </div>
            {isLeader && (
              <Link to={`/events/${eventId}/tasks/new?departmentId=${departmentId}`} className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                <Plus size={18} />
                Tạo task
              </Link>
            )}
          </div>

          <form onSubmit={handleSearchSubmit} className="mt-4 grid gap-3 md:grid-cols-[1fr_180px_auto]">
            <label className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Tìm task trong department" className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 text-sm outline-none focus:border-blue-500" />
            </label>
            <select value={status} onChange={(event) => { setPage(0); setStatus(event.target.value); }} className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500">
              <option value="">Tất cả status</option>
              <option value="TODO">TODO</option>
              <option value="IN_PROGRESS">IN_PROGRESS</option>
              <option value="IN_REVIEW">IN_REVIEW</option>
              <option value="DONE">DONE</option>
            </select>
            <button type="submit" className="rounded-lg border border-blue-600 px-4 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50">Tìm</button>
          </form>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
          {tasksQuery.isLoading && (
            <div className="flex items-center justify-center gap-2 p-8 text-gray-500">
              <Loader2 size={20} className="animate-spin" />
              Đang tải task...
            </div>
          )}
          {tasksQuery.error && <div className="p-4 text-red-700">{tasksQuery.error.userMessage || tasksQuery.error.message}</div>}
          {!tasksQuery.isLoading && !tasksQuery.error && tasks.length === 0 && <div className="p-8 text-center text-gray-500">Chưa có task phù hợp.</div>}
          {tasks.map((task) => (
            <Link key={task.id} to={`/events/${eventId}/tasks/${task.id}`} className="block border-b border-gray-100 p-4 transition last:border-b-0 hover:bg-blue-50/50">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-gray-900">{task.title}</p>
                  <p className="mt-1 text-sm text-gray-500">{task.assigneeName || 'Chưa phân công'} • Deadline {formatDate(task.deadline)}</p>
                </div>
                <span className="w-fit rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">{task.status}</span>
              </div>
            </Link>
          ))}
        </section>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => setPage((old) => Math.max(old - 1, 0))} disabled={page === 0} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 disabled:opacity-50">
            <ChevronLeft size={16} />
            Trước
          </button>
          <button type="button" onClick={() => setPage((old) => old + 1)} disabled={tasksQuery.data?.last !== false} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 disabled:opacity-50">
            Sau
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </AppLayout>
  );
};

export default DepartmentTasksPage;
