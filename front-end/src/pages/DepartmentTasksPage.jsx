import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Filter,
  Loader2,
  Search,
  SlidersHorizontal,
  UserRound,
} from 'lucide-react';
import AppLayout from '../components/AppLayout';
import InlineTaskCreator from '../components/InlineTaskCreator';
import departmentApi from '../api/departmentApi';
import eventApi from '../api/eventApi';
import taskApi from '../api/taskApi';
import userApi from '../api/userApi';
import { PriorityBadge, ProgressBar, StatusBadge } from '../components/ui';
import { formatDate } from '../utils/dateUtils';
import { normalizeTaskPageSize } from '../utils/paginationUtils';
import ErrorPage from './ErrorPage';
import { canAccessDepartment, getEventPermissions } from '../utils/permissionUtils';

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

  const eventQuery = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => eventApi.getEvent(eventId),
    enabled: Boolean(eventId),
  });

  const event = eventQuery.data;
  const permissions = getEventPermissions(event);
  const canReadDepartment = Boolean(event && canAccessDepartment(event, departmentId));

  const departmentQuery = useQuery({
    queryKey: ['department', eventId, departmentId],
    queryFn: () => departmentApi.getDepartment({ eventId, departmentId }),
    enabled: Boolean(eventId && departmentId && canReadDepartment),
  });

  const departmentsQuery = useQuery({
    queryKey: ['eventDepartments', eventId],
    queryFn: () => departmentApi.getEventDepartments(eventId),
    enabled: Boolean(eventId && permissions.canManageDepartments),
  });

  const tasksQuery = useQuery({
    queryKey: ['departmentTaskPage', eventId, departmentId, page, pageSize, search, status, priority, fromDate, toDate],
    queryFn: () => taskApi.getEventTaskPage({ eventId, departmentId, page, size: pageSize, search, status, priority, fromDate, toDate }),
    enabled: Boolean(eventId && departmentId && canReadDepartment),
  });

  const department = departmentQuery.data;
  const tasks = tasksQuery.data?.content || [];
  const isLeader = permissions.canCreateTasks;

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
        {!eventQuery.isLoading && event && !canReadDepartment && (
          <ErrorPage
            variant="unexpected"
            title="Không có quyền truy cập"
            message="Bạn chỉ có thể xem công việc trong ban mà mình đang tham gia."
          />
        )}

        {canReadDepartment && (
          <>
            <section className="relative overflow-hidden rounded-[2rem] border border-sky-100 bg-white/85 p-6 shadow-xl shadow-sky-100/70 backdrop-blur-xl">
              <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-sky-100 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-28 left-1/3 h-72 w-72 rounded-full bg-emerald-100/70 blur-3xl" />

              <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <p className="inline-flex rounded-full bg-sky-50 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-sky-600">
                    Department tasks
                  </p>

                  <h2 className="mt-4 flex items-center gap-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-emerald-400 text-white shadow-lg shadow-cyan-100">
                      <ClipboardList size={22} />
                    </span>
                    <span className="min-w-0 truncate">
                      Task của {department?.name || 'department'}
                    </span>
                  </h2>

                  <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-600">
                    Tìm kiếm, lọc theo trạng thái, độ ưu tiên, deadline và theo dõi tiến độ công việc của ban.
                  </p>
                </div>

                <div className="grid gap-3 rounded-3xl border border-sky-100 bg-white/80 p-4 shadow-sm sm:min-w-72">
                  <div className="flex items-center gap-2 text-sm font-black text-slate-700">
                    <SlidersHorizontal className="h-4 w-4 text-sky-500" strokeWidth={1.8} />
                    Thiết lập hiển thị
                  </div>

                  <form onSubmit={handlePageSizeSubmit} className="flex items-center gap-2 text-sm text-slate-600">
                    <label htmlFor="department-task-page-size" className="shrink-0 font-black">
                      Số dòng/trang
                    </label>

                    <input
                      id="department-task-page-size"
                      type="number"
                      min="1"
                      max="100"
                      value={pageSizeInput}
                      onChange={(event) => setPageSizeInput(event.target.value)}
                      onBlur={applyPageSize}
                      className="h-10 w-20 rounded-2xl border border-sky-100 bg-sky-50/70 px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-cyan-300 focus:bg-white focus:ring-4 focus:ring-cyan-100"
                    />

                    <span className="text-xs font-semibold text-slate-500">
                      {updatePreferencesMutation.isPending ? 'Đang lưu...' : 'Lưu theo tài khoản'}
                    </span>
                  </form>
                </div>
              </div>

              <form
                onSubmit={handleSearchSubmit}
                className="relative mt-6 grid gap-3 md:grid-cols-[1fr_150px_150px_150px_150px_auto]"
              >
                <label className="relative">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-sky-400" />
                  <input
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    placeholder="Tìm task trong department"
                    className={`${inputClassName} pl-11`}
                  />
                </label>

                <select
                  value={status}
                  onChange={(event) => {
                    setPage(0);
                    setStatus(event.target.value);
                  }}
                  className={inputClassName}
                >
                  <option value="">Tất cả status</option>
                  <option value="TODO">TODO</option>
                  <option value="IN_PROGRESS">IN_PROGRESS</option>
                  <option value="IN_REVIEW">IN_REVIEW</option>
                  <option value="DONE">DONE</option>
                </select>

                <select
                  value={priority}
                  onChange={(event) => {
                    setPage(0);
                    setPriority(event.target.value);
                  }}
                  className={inputClassName}
                >
                  <option value="">Tất cả ưu tiên</option>
                  <option value="LOW">Thấp</option>
                  <option value="MEDIUM">Trung bình</option>
                  <option value="HIGH">Cao</option>
                  <option value="URGENT">Khẩn cấp</option>
                </select>

                <input
                  type="date"
                  value={fromDate}
                  onChange={(event) => {
                    setPage(0);
                    setFromDate(event.target.value);
                  }}
                  aria-label="Từ ngày"
                  className={inputClassName}
                />

                <input
                  type="date"
                  value={toDate}
                  onChange={(event) => {
                    setPage(0);
                    setToDate(event.target.value);
                  }}
                  aria-label="Đến ngày"
                  className={inputClassName}
                />

                <button
                  type="submit"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400 px-4 py-2 text-sm font-black text-white shadow-xl shadow-cyan-100 transition hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-cyan-200"
                >
                  <Filter size={16} />
                  Tìm
                </button>
              </form>
            </section>

            <section className="overflow-hidden rounded-[2rem] border border-sky-100 bg-white shadow-xl shadow-sky-100/70">
              <div className="flex flex-col gap-3 border-b border-sky-100 bg-gradient-to-r from-sky-50 via-white to-emerald-50 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-emerald-400 text-white shadow-lg shadow-cyan-100">
                    <ClipboardList className="h-5 w-5" strokeWidth={1.8} />
                  </div>

                  <div>
                    <h3 className="text-lg font-black text-slate-950">
                      Danh sách task
                    </h3>
                    <p className="mt-1 text-sm font-semibold text-slate-500">
                      {tasksQuery.data?.totalElements ?? tasksQuery.data?.totalItems ?? tasks.length} task phù hợp với bộ lọc hiện tại.
                    </p>
                  </div>
                </div>

                <span className="inline-flex w-fit items-center rounded-full border border-sky-100 bg-white px-3 py-1.5 text-xs font-black text-sky-600 shadow-sm">
                  Trang {page + 1}
                </span>
              </div>

              {tasksQuery.isLoading && (
                <div className="flex items-center justify-center gap-3 p-10 text-sm font-black text-slate-500">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
                    <Loader2 size={20} className="animate-spin" />
                  </span>
                  Đang tải task...
                </div>
              )}

              {tasksQuery.error && (
                <div className="p-5">
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
                    {tasksQuery.error.userMessage || tasksQuery.error.message}
                  </div>
                </div>
              )}

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

              {!tasksQuery.isLoading && !tasksQuery.error && tasks.length === 0 && (
                <div className="p-10 text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-sky-50 text-sky-500">
                    <ClipboardList className="h-7 w-7" strokeWidth={1.8} />
                  </div>
                  <p className="text-sm font-bold text-slate-500">
                    Chưa có task phù hợp.
                  </p>
                </div>
              )}

              {tasks.length > 0 && (
                <div className="overflow-x-auto">
                  <div className="min-w-[1060px]">
                    <div className="grid grid-cols-[minmax(240px,1.5fr)_170px_170px_180px_130px_130px_130px] items-center gap-3 border-b border-sky-100 bg-sky-50/70 px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
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
                        className="grid grid-cols-[minmax(240px,1.5fr)_170px_170px_180px_130px_130px_130px] items-center gap-3 border-b border-sky-50 px-5 py-4 text-sm transition last:border-b-0 hover:bg-sky-50/70"
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-black text-slate-950">
                            {task.title}
                          </span>
                          <span className="mt-1 block text-xs font-semibold text-slate-400">
                            ID #{task.id}
                          </span>
                        </span>

                        <span className="truncate font-semibold text-slate-600">
                          {task.departmentName || department?.name || 'Chưa gán ban'}
                        </span>

                        <span className="inline-flex min-w-0 items-center gap-2 truncate font-semibold text-slate-600">
                          <UserRound className="h-4 w-4 shrink-0 text-sky-400" strokeWidth={1.8} />
                          <span className="truncate">{task.assigneeName || 'Chưa phân công'}</span>
                        </span>

                        <span className="inline-flex items-center gap-2 whitespace-nowrap font-semibold text-slate-600">
                          <CalendarDays className="h-4 w-4 text-emerald-500" strokeWidth={1.8} />
                          {formatDate(task.deadline)}
                        </span>

                        <PriorityBadge priority={task.priority} />
                        <StatusBadge status={task.status} />

                        <span className="min-w-0">
                          <ProgressBar value={task.progressPercentage ?? 0} />
                          <span className="mt-1 block text-xs font-black text-slate-500">
                            {task.progressPercentage ?? 0}%
                          </span>
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </section>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <form onSubmit={handlePageSizeSubmit} className="flex items-center gap-2 text-sm text-slate-600 sm:hidden">
                <label htmlFor="department-task-page-size-mobile" className="font-black">
                  Số dòng/trang
                </label>
                <input
                  id="department-task-page-size-mobile"
                  type="number"
                  min="1"
                  max="100"
                  value={pageSizeInput}
                  onChange={(event) => setPageSizeInput(event.target.value)}
                  onBlur={applyPageSize}
                  className="w-20 rounded-2xl border border-sky-100 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100"
                />
                <span className="text-xs font-semibold text-slate-500">
                  {updatePreferencesMutation.isPending ? 'Đang lưu...' : 'Lưu theo tài khoản'}
                </span>
              </form>

              <div className="hidden text-sm font-semibold text-slate-500 sm:block">
                {updatePreferencesMutation.isPending ? 'Đang lưu tùy chọn hiển thị...' : 'Tùy chọn số dòng được lưu theo tài khoản'}
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPage((old) => Math.max(old - 1, 0))}
                  disabled={page === 0}
                  className="inline-flex min-h-10 items-center gap-2 rounded-2xl border border-sky-100 bg-white px-4 py-2 text-sm font-black text-slate-600 shadow-sm transition hover:bg-sky-50 hover:text-sky-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ChevronLeft size={16} />
                  Trước
                </button>

                <button
                  type="button"
                  onClick={() => setPage((old) => old + 1)}
                  disabled={tasksQuery.data?.last !== false}
                  className="inline-flex min-h-10 items-center gap-2 rounded-2xl border border-sky-100 bg-white px-4 py-2 text-sm font-black text-slate-600 shadow-sm transition hover:bg-sky-50 hover:text-sky-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Sau
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
};

const inputClassName = 'min-h-11 w-full rounded-2xl border border-sky-100 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-cyan-300 focus:bg-white focus:ring-4 focus:ring-cyan-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500';

export default DepartmentTasksPage;