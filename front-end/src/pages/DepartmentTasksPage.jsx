import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, ClipboardList, Loader2, Search } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import InlineTaskCreator from '../components/InlineTaskCreator';
import departmentApi from '../api/departmentApi';
import eventApi from '../api/eventApi';
import taskApi from '../api/taskApi';
import userApi from '../api/userApi';
import { PriorityBadge, ProgressBar, StatusBadge } from '../components/ui';
import { formatDate } from '../utils/dateUtils';
import { normalizeTaskPageSize } from '../utils/paginationUtils';

const DepartmentTasksPage = ({ user, onLogout, onUserUpdate }) => {
  const { eventId, departmentId } = useParams();
  const [searchParams] = useSearchParams();
  const [page, setPage] = useState(0);
  const initialPageSize = normalizeTaskPageSize(user?.taskPageSize);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [pageSizeInput, setPageSizeInput] = useState(() => String(initialPageSize));
  const [searchInput, setSearchInput] = useState(() => searchParams.get('search') || '');
  const [search, setSearch] = useState(() => searchParams.get('search') || '');
  const [status, setStatus] = useState(() => searchParams.get('status') || '');
  const [priority, setPriority] = useState(() => searchParams.get('priority') || '');
  const [fromDate, setFromDate] = useState(() => searchParams.get('fromDate') || '');
  const [toDate, setToDate] = useState(() => searchParams.get('toDate') || '');

  const eventQuery = useQuery({ queryKey: ['event', eventId], queryFn: () => eventApi.getEvent(eventId), enabled: Boolean(eventId) });
  const departmentQuery = useQuery({ queryKey: ['department', eventId, departmentId], queryFn: () => departmentApi.getDepartment({ eventId, departmentId }), enabled: Boolean(eventId && departmentId) });
  const departmentsQuery = useQuery({ queryKey: ['eventDepartments', eventId], queryFn: () => departmentApi.getEventDepartments(eventId), enabled: Boolean(eventId) });
  const tasksQuery = useQuery({
    queryKey: ['departmentTaskPage', eventId, departmentId, page, pageSize, search, status, priority, fromDate, toDate],
    queryFn: () => taskApi.getEventTaskPage({ eventId, departmentId, page, size: pageSize, search, status, priority, fromDate, toDate }),
    enabled: Boolean(eventId && departmentId),
  });

  const event = eventQuery.data;
  const department = departmentQuery.data;
  const tasks = tasksQuery.data?.content || [];
  const isLeader = event?.role === 'LEADER';
  const updatePreferencesMutation = useMutation({
    mutationFn: userApi.updatePreferences,
    onSuccess: (profile) => {
      onUserUpdate?.({ ...user, taskPageSize: profile.taskPageSize });
    },
  });

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    setPage(0);
    setSearch(searchInput.trim());
  };

  const applyPageSize = () => {
    const nextPageSize = normalizeTaskPageSize(pageSizeInput);
    setPage(0);
    setPageSize(nextPageSize);
    setPageSizeInput(String(nextPageSize));
    if (nextPageSize !== normalizeTaskPageSize(user?.taskPageSize) && !updatePreferencesMutation.isPending) {
      updatePreferencesMutation.mutate({ userId: user.userId, taskPageSize: nextPageSize });
    }
  };

  const handlePageSizeSubmit = (event) => {
    event.preventDefault();
    applyPageSize();
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
              <p className="mt-1 text-sm text-gray-500">Danh sách task thuộc riêng department này. Leader nhập task mới ngay trong dòng đầu danh sách.</p>
            </div>
          </div>

          <form onSubmit={handleSearchSubmit} className="mt-4 grid gap-3 md:grid-cols-[1fr_150px_150px_150px_150px_auto]">
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
            <select value={priority} onChange={(event) => { setPage(0); setPriority(event.target.value); }} className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500">
              <option value="">Tất cả ưu tiên</option>
              <option value="LOW">Thấp</option>
              <option value="MEDIUM">Trung bình</option>
              <option value="HIGH">Cao</option>
              <option value="URGENT">Khẩn cấp</option>
            </select>
            <input
              type="date"
              value={fromDate}
              onChange={(event) => { setPage(0); setFromDate(event.target.value); }}
              aria-label="Từ ngày"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
            <input
              type="date"
              value={toDate}
              onChange={(event) => { setPage(0); setToDate(event.target.value); }}
              aria-label="Đến ngày"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
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
          {isLeader && !tasksQuery.isLoading && !tasksQuery.error && (
            <InlineTaskCreator
              eventId={eventId}
              event={event}
              departments={departmentsQuery.data || []}
              departmentId={departmentId}
              lockedDepartment
              invalidateKeys={[
                ['departmentTaskPage', eventId, departmentId],
                ['eventTaskPage', eventId],
                ['departmentTasksSummary', eventId, departmentId],
              ]}
            />
          )}
          {!tasksQuery.isLoading && !tasksQuery.error && tasks.length === 0 && <div className="p-8 text-center text-gray-500">Chưa có task phù hợp.</div>}
          {tasks.length > 0 && (
            <div className="overflow-x-auto">
              <div className="min-w-[980px]">
                <div className="grid grid-cols-[minmax(220px,1.5fr)_160px_160px_180px_130px_120px_100px] items-center gap-2 border-b border-gray-100 bg-gray-50 px-4 py-2 text-xs font-bold uppercase tracking-wide text-gray-500">
                  <span>Công việc</span>
                  <span>Ban</span>
                  <span>Phụ trách</span>
                  <span>Deadline</span>
                  <span>Ưu tiên</span>
                  <span>Trạng thái</span>
                  <span>Tiến độ</span>
                </div>
                {tasks.map((task) => (
                  <Link
                    key={task.id}
                    to={`/events/${eventId}/tasks/${task.id}`}
                    className="grid grid-cols-[minmax(220px,1.5fr)_160px_160px_180px_130px_120px_100px] items-center gap-2 border-b border-gray-100 px-4 py-3 text-sm transition last:border-b-0 hover:bg-blue-50/50"
                  >
                    <span className="truncate font-semibold text-gray-900">{task.title}</span>
                    <span className="truncate text-gray-600">{task.departmentName || department?.name || 'Chưa gán ban'}</span>
                    <span className="truncate text-gray-600">{task.assigneeName || 'Chưa phân công'}</span>
                    <span className="whitespace-nowrap text-gray-600">{formatDate(task.deadline)}</span>
                    <PriorityBadge priority={task.priority} />
                    <StatusBadge status={task.status} />
                    <span className="min-w-0">
                      <ProgressBar value={task.progressPercentage ?? 0} />
                      <span className="mt-1 block text-xs font-semibold text-gray-500">{task.progressPercentage ?? 0}%</span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </section>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <form onSubmit={handlePageSizeSubmit} className="flex items-center gap-2 text-sm text-gray-600">
            <label htmlFor="department-task-page-size" className="font-semibold">Số dòng/trang</label>
            <input
              id="department-task-page-size"
              type="number"
              min="1"
              max="100"
              value={pageSizeInput}
              onChange={(event) => setPageSizeInput(event.target.value)}
              onBlur={applyPageSize}
              className="w-20 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
            <span className="text-xs text-gray-500">
              {updatePreferencesMutation.isPending ? 'Đang lưu...' : 'Lưu theo tài khoản'}
            </span>
          </form>
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
      </div>
    </AppLayout>
  );
};

export default DepartmentTasksPage;
