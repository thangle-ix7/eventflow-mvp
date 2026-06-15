import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Layers3,
  Search,
  SlidersHorizontal,
  UserRound,
} from 'lucide-react';
import AppLayout from '../components/AppLayout';
import InlineTaskCreator from '../components/InlineTaskCreator';
import {
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  Panel,
  PriorityBadge,
  ProgressBar,
  StatusBadge,
} from '../components/ui';
import eventApi from '../api/eventApi';
import taskApi from '../api/taskApi';
import departmentApi from '../api/departmentApi';
import userApi from '../api/userApi';
import workloadApi from '../api/workloadApi';
import { formatDate } from '../utils/dateUtils';
import { normalizeTaskPageSize } from '../utils/paginationUtils';

const getWorkloadClassName = (status) => {
  if (status === 'OVERLOADED') {
    return 'text-red-600';
  }

  if (status === 'HIGH') {
    return 'text-amber-600';
  }

  if (status === 'NORMAL') {
    return 'text-emerald-600';
  }

  return 'text-slate-500';
};

const TaskListPage = ({ user, onLogout, onUserUpdate }) => {
  const { eventId } = useParams();
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
  const [departmentId, setDepartmentId] = useState(
    () => searchParams.get('departmentId') || ''
  );

  const eventQuery = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => eventApi.getEvent(eventId),
    enabled: Boolean(eventId),
  });

  const departmentsQuery = useQuery({
    queryKey: ['eventDepartments', eventId],
    queryFn: () => departmentApi.getEventDepartments(eventId),
    enabled: Boolean(eventId),
  });

  const tasksQuery = useQuery({
    queryKey: [
      'eventTaskPage',
      eventId,
      page,
      pageSize,
      search,
      status,
      priority,
      departmentId,
      fromDate,
      toDate,
    ],
    queryFn: () =>
      taskApi.getEventTaskPage({
        eventId,
        page,
        size: pageSize,
        search,
        status,
        priority,
        departmentId,
        fromDate,
        toDate,
      }),
    enabled: Boolean(eventId),
  });

  const event = eventQuery.data;
  const tasks = tasksQuery.data?.content || [];
  const departments = departmentsQuery.data || [];
  const isLeader = event?.role === 'LEADER';

  /*
   * Query workload toàn event.
   * Dùng để hiển thị workload ngay trong cột "Phụ trách" của danh sách task.
   * Chỉ Event Leader mới gọi API này vì backend đang phân quyền như vậy.
   */
  const eventWorkloadQuery = useQuery({
    queryKey: ['eventWorkload', eventId],
    queryFn: () => workloadApi.getEventWorkload(eventId),
    enabled: Boolean(eventId && isLeader),
  });

  /*
   * Map workload theo memberId để lookup nhanh khi render từng task.
   */
  const workloadByMemberId = useMemo(() => {
    const workloadDepartments = eventWorkloadQuery.data?.departments || [];

    return workloadDepartments.reduce((map, department) => {
      (department.members || []).forEach((member) => {
        map[String(member.memberId)] = member;
      });

      return map;
    }, {});
  }, [eventWorkloadQuery.data]);

  /*
   * Query workload theo department filter hiện tại.
   * Props này truyền xuống InlineTaskCreator để giữ tương thích với phần tạo task nhanh.
   * Nếu departmentId rỗng thì query này không chạy.
   */
  const departmentWorkloadQuery = useQuery({
    queryKey: ['departmentWorkload', eventId, departmentId],
    queryFn: () =>
      workloadApi.getDepartmentWorkload({
        eventId,
        departmentId,
      }),
    enabled: Boolean(eventId && departmentId),
  });

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

    if (
      nextPageSize !== normalizeTaskPageSize(user?.taskPageSize) &&
      !updatePreferencesMutation.isPending
    ) {
      updatePreferencesMutation.mutate({
        userId: user.userId,
        taskPageSize: nextPageSize,
      });
    }
  };

  const handlePageSizeSubmit = (event) => {
    event.preventDefault();
    applyPageSize();
  };

  const handleDepartmentFilterChange = (event) => {
    setPage(0);
    setDepartmentId(event.target.value);
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
        <PageHeader
          eyebrow={event?.name || 'Sự kiện'}
          title="Danh sách công việc"
          description="Quản lý task của sự kiện, theo dõi người phụ trách, ban phụ trách, deadline, trạng thái, ưu tiên và tiến độ thực hiện."
          meta={
            <>
              <span className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-white px-3 py-1.5 font-black text-sky-600 shadow-sm">
                <ClipboardList size={16} />
                {tasksQuery.data?.totalElements ?? tasksQuery.data?.totalItems ?? tasks.length} công việc
              </span>

              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-white px-3 py-1.5 font-black text-emerald-600 shadow-sm">
                <Layers3 size={16} />
                {departments.length} ban tổ chức
              </span>

              <span className="inline-flex items-center gap-2 rounded-full border border-cyan-100 bg-white px-3 py-1.5 font-black text-cyan-600 shadow-sm">
                <SlidersHorizontal size={16} />
                {isLeader ? 'Leader permission' : 'Member view'}
              </span>
            </>
          }
        />

        <Panel className="relative overflow-hidden p-5">
          <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-sky-100 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-emerald-100/70 blur-3xl" />

          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-emerald-400 text-white shadow-lg shadow-cyan-100">
                <SlidersHorizontal className="h-6 w-6" strokeWidth={1.8} />
              </div>             
                <h3 className="text-lg font-black text-slate-950">
                  Tìm kiếm 
                </h3>                           
            </div>

            <form
              onSubmit={handleSearchSubmit}
              className="grid w-full gap-3 lg:max-w-5xl"
            >
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-sky-400"
                  strokeWidth={1.8}
                />

                <input
                  id="task-search"
                  name="search"
                  aria-label="Tìm công việc"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Tìm theo tên công việc..."
                  className={`${inputClassName} pl-11`}
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[160px_160px_minmax(190px,1fr)_150px_150px_auto]">
                <select
                  aria-label="Lọc trạng thái công việc"
                  name="status"
                  value={status}
                  onChange={(event) => {
                    setPage(0);
                    setStatus(event.target.value);
                  }}
                  className={inputClassName}
                >
                  <option value="">Tất cả trạng thái</option>
                  <option value="TODO">Cần làm</option>
                  <option value="IN_PROGRESS">Đang làm</option>
                  <option value="IN_REVIEW">Chờ duyệt</option>
                  <option value="DONE">Hoàn thành</option>
                </select>

                <select
                  aria-label="Lọc ưu tiên công việc"
                  name="priority"
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

                <select
                  aria-label="Lọc theo ban"
                  name="departmentId"
                  value={departmentId}
                  onChange={handleDepartmentFilterChange}
                  disabled={departmentsQuery.isLoading}
                  className={inputClassName}
                >
                  <option value="">Tất cả ban</option>
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </select>

                <input
                  type="date"
                  aria-label="Từ ngày"
                  value={fromDate}
                  onChange={(event) => {
                    setPage(0);
                    setFromDate(event.target.value);
                  }}
                  className={inputClassName}
                />

                <input
                  type="date"
                  aria-label="Đến ngày"
                  value={toDate}
                  onChange={(event) => {
                    setPage(0);
                    setToDate(event.target.value);
                  }}
                  className={inputClassName}
                />

                <button
                  type="submit"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400 px-4 py-2 text-sm font-black text-white shadow-xl shadow-cyan-100 transition hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-cyan-200 active:translate-y-px"
                >
                  <Search size={18} />
                  Tìm kiếm
                </button>
              </div>
            </form>
          </div>
        </Panel>

        {isLeader && !tasksQuery.isLoading && !tasksQuery.error && (
          <Panel className="relative overflow-hidden p-0">
            <div className="border-b border-sky-100 bg-gradient-to-r from-sky-50 via-white to-emerald-50 px-5 py-5">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-emerald-400 text-white shadow-lg shadow-cyan-100">
                  <ClipboardList className="h-5 w-5" strokeWidth={1.8} />
                </div>

                <div>
                  <h2 className="text-lg font-black text-slate-950">
                    Thêm nhanh công việc
                  </h2>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    Tạo nhanh task trong sự kiện. Nếu đang lọc theo ban, task mới sẽ được khóa theo ban đó.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-sky-50/40 p-4">
              <InlineTaskCreator
                eventId={eventId}
                event={event}
                departments={departments}
                departmentId={departmentId}
                lockedDepartment={Boolean(departmentId)}
                departmentWorkload={departmentWorkloadQuery.data}
                departmentWorkloadLoading={departmentWorkloadQuery.isLoading}
                departmentWorkloadError={departmentWorkloadQuery.error}
                invalidateKeys={[
                  ['eventTaskPage', eventId],
                  ['departmentTaskPage', eventId, departmentId],
                  ['departmentWorkload', eventId, departmentId],
                  ['eventWorkload', eventId],
                ]}
              />
            </div>
          </Panel>
        )}

        <Panel className="overflow-hidden">
          <div className="flex flex-col gap-4 border-b border-sky-100 bg-gradient-to-r from-sky-50 via-white to-emerald-50 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-emerald-400 text-white shadow-lg shadow-cyan-100">
                <ClipboardList className="h-5 w-5" strokeWidth={1.8} />
              </div>

              <div>
                <h2 className="text-lg font-black text-slate-950">
                  Bảng công việc
                </h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  Xem task theo bộ lọc hiện tại và bấm vào từng dòng để mở chi tiết.
                </p>
              </div>
            </div>

            <span className="inline-flex w-fit rounded-full border border-sky-100 bg-white px-3 py-1.5 text-xs font-black text-sky-600 shadow-sm">
              Trang {page + 1}
            </span>
          </div>

          {tasksQuery.isLoading && (
            <div className="p-5">
              <LoadingState message="Đang tải công việc..." />
            </div>
          )}

          {tasksQuery.error && (
            <div className="p-5">
              <ErrorState
                error={tasksQuery.error}
                title="Không tải được danh sách công việc"
              />
            </div>
          )}

          {!tasksQuery.isLoading && !tasksQuery.error && tasks.length === 0 && (
            <div className="p-5">
              <EmptyState
                icon={ClipboardList}
                title="Chưa có công việc phù hợp"
                description="Thử thay đổi bộ lọc hoặc tạo task mới bằng khu vực thêm nhanh."
              />
            </div>
          )}

          {!tasksQuery.isLoading && !tasksQuery.error && tasks.length > 0 && (
            <div className="overflow-x-auto">
              <div className="min-w-[1060px]">
                <div className="grid grid-cols-[minmax(240px,1.5fr)_170px_190px_180px_130px_130px_120px] items-center gap-3 border-b border-sky-100 bg-sky-50/70 px-5 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                  <span>Công việc</span>
                  <span>Ban</span>
                  <span>Phụ trách</span>
                  <span>Deadline</span>
                  <span>Ưu tiên</span>
                  <span>Trạng thái</span>
                  <span>Tiến độ</span>
                </div>

                {tasks.map((task) => {
                  const assigneeWorkload = task.assigneeId
                    ? workloadByMemberId[String(task.assigneeId)]
                    : null;

                  return (
                    <Link
                      key={task.id}
                      to={`/events/${eventId}/tasks/${task.id}`}
                      className="grid grid-cols-[minmax(240px,1.5fr)_170px_190px_180px_130px_130px_120px] items-center gap-3 border-b border-sky-100 px-5 py-4 text-sm transition last:border-b-0 hover:bg-sky-50/70"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-black text-slate-950">
                          {task.title}
                        </span>
                      </span>

                      <span className="inline-flex min-w-0 items-center gap-2 truncate font-semibold text-slate-600">
                        <Layers3 size={15} className="shrink-0 text-emerald-500" />
                        <span className="truncate">{task.departmentName || 'Chưa gán ban'}</span>
                      </span>

                      <span className="min-w-0">
                        <span className="flex items-center gap-2 truncate font-semibold text-slate-600">
                          <UserRound size={15} className="shrink-0 text-sky-500" />
                          <span className="truncate">{task.assigneeName || 'Chưa phân công'}</span>
                        </span>

                        {assigneeWorkload && (
                          <span
                            className={`mt-1 block truncate text-[11px] font-black ${getWorkloadClassName(
                              assigneeWorkload.workloadStatus
                            )}`}
                            title={`${assigneeWorkload.assignedTasks} task chưa hoàn thành · ${assigneeWorkload.workloadScore}% · ${assigneeWorkload.workloadStatus}`}
                          >
                            {assigneeWorkload.assignedTasks} task · {assigneeWorkload.workloadStatus}
                          </span>
                        )}
                      </span>

                      <span className="inline-flex items-center gap-2 whitespace-nowrap font-semibold text-slate-600">
                        <CalendarDays size={15} className="text-emerald-500" />
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
                  );
                })}
              </div>
            </div>
          )}
        </Panel>

        <div className="flex flex-col gap-3 rounded-[2rem] border border-sky-100 bg-white p-4 shadow-xl shadow-sky-100/70 sm:flex-row sm:items-center sm:justify-between">
          <form
            onSubmit={handlePageSizeSubmit}
            className="flex flex-wrap items-center gap-2 text-sm text-slate-600"
          >
            <label htmlFor="task-page-size" className="font-black text-slate-700">
              Số dòng/trang
            </label>

            <input
              id="task-page-size"
              type="number"
              min="1"
              max="100"
              value={pageSizeInput}
              onChange={(event) => setPageSizeInput(event.target.value)}
              onBlur={applyPageSize}
              className="min-h-10 w-24 rounded-2xl border border-sky-100 bg-sky-50/60 px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-cyan-300 focus:bg-white focus:ring-4 focus:ring-cyan-100"
            />

            <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-slate-500">
              {updatePreferencesMutation.isPending ? 'Đang lưu...' : 'Lưu theo tài khoản'}
            </span>
          </form>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              onClick={() => setPage((old) => Math.max(old - 1, 0))}
              disabled={page === 0}
              variant="secondary"
              className="rounded-2xl"
            >
              <ChevronLeft size={16} />
              Trước
            </Button>

            <Button
              type="button"
              onClick={() => setPage((old) => old + 1)}
              disabled={tasksQuery.data?.last !== false}
              variant="secondary"
              className="rounded-2xl"
            >
              Sau
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

const inputClassName = 'min-h-11 w-full min-w-0 rounded-2xl border border-sky-100 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-cyan-300 focus:bg-white focus:ring-4 focus:ring-cyan-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500';

export default TaskListPage;