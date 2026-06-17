import { useEffect, useMemo, useRef, useState } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  CalendarDays,
  Layers3,
  Plus,
  Search,
  UserRound,
  X,
} from 'lucide-react';
import AppLayout from '../components/AppLayout';
import InlineTaskCreator from '../components/InlineTaskCreator';
import {
  Button,
  ErrorState,
  LoadingState,
  Panel,
  PriorityBadge,
  ProgressBar,
} from '../components/ui';
import eventApi from '../api/eventApi';
import taskApi from '../api/taskApi';
import departmentApi from '../api/departmentApi';
import workloadApi from '../api/workloadApi';
import { formatDate } from '../utils/dateUtils';

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

const STATUS_COLUMNS = [
  { key: 'TODO', label: 'Cần làm', tone: 'border-slate-100 bg-slate-50 text-slate-700' },
  { key: 'IN_PROGRESS', label: 'Đang làm', tone: 'border-amber-100 bg-amber-50 text-amber-700' },
  { key: 'IN_REVIEW', label: 'Chờ duyệt', tone: 'border-violet-100 bg-violet-50 text-violet-700' },
  { key: 'DONE', label: 'Hoàn thành', tone: 'border-emerald-100 bg-emerald-50 text-emerald-700' },
];

const TaskListPage = ({ user, onLogout }) => {
  const { eventId } = useParams();
  const [searchParams] = useSearchParams();

  const [searchInput, setSearchInput] = useState(() => searchParams.get('search') || '');
  const [search, setSearch] = useState(() => searchParams.get('search') || '');
  const [status, setStatus] = useState(() => searchParams.get('status') || '');
  const [priority, setPriority] = useState(() => searchParams.get('priority') || '');
  const [fromDate, setFromDate] = useState(() => searchParams.get('fromDate') || '');
  const [toDate, setToDate] = useState(() => searchParams.get('toDate') || '');
  const [quickCreateStatus, setQuickCreateStatus] = useState('');
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

  const event = eventQuery.data;
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

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    setSearch(searchInput.trim());
  };

  const handleDepartmentFilterChange = (event) => {
    setDepartmentId(event.target.value);
  };

  const activeFilterCount = useMemo(
    () => [search, status, priority, departmentId, fromDate, toDate].filter(Boolean).length,
    [departmentId, fromDate, priority, search, status, toDate]
  );

  const resetFilters = () => {
    setSearchInput('');
    setSearch('');
    setStatus('');
    setPriority('');
    setDepartmentId('');
    setFromDate('');
    setToDate('');
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
        <Panel className="p-4">
          <div className="grid gap-4">
            <form
              onSubmit={handleSearchSubmit}
              className="grid w-full gap-3"
            >
              <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_auto_auto]">
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

                <button
                  type="submit"
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-sky-600 px-4 py-2 text-sm font-black text-white shadow-sm transition hover:bg-sky-700 active:translate-y-px lg:w-auto"
                >
                  <Search size={18} />
                  Tìm
                </button>

                {isLeader && (
                  <Button
                    type="button"
                    variant={quickCreateStatus ? 'secondary' : 'primary'}
                    onClick={() => setQuickCreateStatus((currentStatus) => (currentStatus ? '' : 'TODO'))}
                    className="min-h-11 w-full rounded-2xl lg:w-auto"
                  >
                    {quickCreateStatus ? <X size={18} /> : <Plus size={18} />}
                    {quickCreateStatus ? 'Đóng tạo nhanh' : 'Tạo task'}
                  </Button>
                )}
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[150px_150px_minmax(190px,1fr)_150px_150px_auto]">
                <select
                  aria-label="Lọc trạng thái công việc"
                  name="status"
                  value={status}
                  onChange={(event) => {
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
                    setFromDate(event.target.value);
                  }}
                  className={inputClassName}
                />

                <input
                  type="date"
                  aria-label="Đến ngày"
                  value={toDate}
                  onChange={(event) => {
                    setToDate(event.target.value);
                  }}
                  className={inputClassName}
                />

                <Button
                  type="button"
                  variant="secondary"
                  onClick={resetFilters}
                  disabled={activeFilterCount === 0}
                  className="min-h-11 w-full rounded-2xl xl:w-auto"
                >
                  <X size={16} />
                  Xóa lọc
                </Button>
              </div>
            </form>

            {activeFilterCount > 0 && (
              <p className="text-xs font-black uppercase tracking-[0.14em] text-sky-600">
                {activeFilterCount} bộ lọc đang áp dụng
              </p>
            )}
          </div>
        </Panel>

        {isLeader && quickCreateStatus && (
          <Panel className="p-4">
            <InlineTaskCreator
              key={`task-creator-${quickCreateStatus}`}
              eventId={eventId}
              event={event}
              departments={departments}
              departmentId={departmentId}
              lockedDepartment={Boolean(departmentId)}
              initialStatus={quickCreateStatus}
              defaultOpen
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
          </Panel>
        )}

        <Panel className="overflow-hidden">
          <StatusTaskBoard
            eventId={eventId}
            search={search}
            status={status}
            priority={priority}
            departmentId={departmentId}
            fromDate={fromDate}
            toDate={toDate}
            workloadByMemberId={workloadByMemberId}
            canCreate={isLeader}
            onCreateInStatus={setQuickCreateStatus}
          />
        </Panel>
      </div>
    </AppLayout>
  );
};

const StatusTaskBoard = ({
  eventId,
  search,
  status,
  priority,
  departmentId,
  fromDate,
  toDate,
  workloadByMemberId,
  canCreate,
  onCreateInStatus,
}) => {
  const queryClient = useQueryClient();
  const [draggingTask, setDraggingTask] = useState(null);
  const visibleColumns = useMemo(
    () => (status ? STATUS_COLUMNS.filter((column) => column.key === status) : STATUS_COLUMNS),
    [status]
  );

  const updateStatusMutation = useMutation({
    mutationFn: taskApi.updateTaskStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventTaskPage', eventId] });
      queryClient.invalidateQueries({ queryKey: ['eventWorkload', eventId] });
      queryClient.invalidateQueries({ queryKey: ['leaderSnapshot', eventId] });
      queryClient.invalidateQueries({ queryKey: ['leaderPriorityTasks', eventId] });
    },
  });

  const handleDropTask = (nextStatus) => {
    if (!draggingTask || draggingTask.status === nextStatus || updateStatusMutation.isPending) {
      setDraggingTask(null);
      return;
    }

    updateStatusMutation.mutate({
      taskId: draggingTask.id,
      status: nextStatus,
    });
    setDraggingTask(null);
  };

  return (
    <div className="p-4">
      {updateStatusMutation.error && (
        <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {updateStatusMutation.error.userMessage || updateStatusMutation.error.message}
        </div>
      )}

      <div>
        <div className={`grid min-w-0 gap-3 ${visibleColumns.length === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-4'}`}>
          {visibleColumns.map((column) => (
            <StatusTaskColumn
              key={column.key}
              eventId={eventId}
              column={column}
              search={search}
              priority={priority}
              departmentId={departmentId}
              fromDate={fromDate}
              toDate={toDate}
              workloadByMemberId={workloadByMemberId}
              draggingTask={draggingTask}
              isUpdatingStatus={updateStatusMutation.isPending}
              onDragTask={setDraggingTask}
              onDropTask={handleDropTask}
              canCreate={canCreate}
              onCreateInStatus={onCreateInStatus}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const StatusTaskColumn = ({
  eventId,
  column,
  search,
  priority,
  departmentId,
  fromDate,
  toDate,
  workloadByMemberId,
  draggingTask,
  isUpdatingStatus,
  onDragTask,
  onDropTask,
  canCreate,
  onCreateInStatus,
}) => {
  const scrollerRef = useRef(null);
  const sentinelRef = useRef(null);
  const query = useInfiniteQuery({
    queryKey: [
      'eventTaskPage',
      eventId,
      'statusBoard',
      column.key,
      search,
      priority,
      departmentId,
      fromDate,
      toDate,
    ],
    queryFn: ({ pageParam = 0 }) => taskApi.getEventTaskPage({
      eventId,
      page: pageParam,
      size: 4,
      sort: 'deadline',
      direction: 'asc',
      status: column.key,
      priority,
      departmentId,
      search,
      fromDate,
      toDate,
    }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => (lastPage.last ? undefined : lastPage.page + 1),
    enabled: Boolean(eventId),
  });

  const tasks = query.data?.pages.flatMap((page) => page.content || []) || [];
  const total = query.data?.pages?.[0]?.totalElements ?? 0;
  const { fetchNextPage, hasNextPage, isFetchingNextPage } = query;

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasNextPage || isFetchingNextPage) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          fetchNextPage();
        }
      },
      {
        root: scrollerRef.current,
        rootMargin: '140px 0px',
      }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  return (
    <section
      className={`min-w-0 overflow-hidden rounded-2xl border border-sky-100 bg-white transition ${
        draggingTask && draggingTask.status !== column.key ? 'ring-4 ring-sky-100' : ''
      }`}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
      }}
      onDrop={() => onDropTask(column.key)}
    >
      <div className={`flex items-center justify-between gap-3 border-b px-4 py-3 ${column.tone}`}>
        <span className="text-sm font-black">{column.label}</span>
        <span className="flex items-center gap-2">
          <span className="rounded-full bg-white/80 px-2.5 py-1 text-xs font-black">
            {total}
          </span>
          {canCreate && (
            <button
              type="button"
              onClick={() => onCreateInStatus?.(column.key)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-sky-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-sky-50"
              aria-label={`Tạo task ${column.label.toLowerCase()}`}
              title={`Tạo task ${column.label.toLowerCase()}`}
            >
              <Plus size={16} />
            </button>
          )}
        </span>
      </div>

      <div ref={scrollerRef} className="max-h-[560px] overflow-y-auto">
        {query.isLoading && (
          <div className="p-4">
            <LoadingState message="Đang tải task..." />
          </div>
        )}

        {query.error && (
          <div className="p-4">
            <ErrorState error={query.error} title={`Không tải được ${column.label.toLowerCase()}`} />
          </div>
        )}

        {!query.isLoading && !query.error && tasks.length === 0 && (
          <p className="px-4 py-8 text-center text-xs font-bold text-slate-400">
            Không có task
          </p>
        )}

        {tasks.length > 0 && (
          <div className="divide-y divide-sky-50">
            {tasks.map((task) => (
              <StatusTaskCard
                key={task.id}
                eventId={eventId}
                task={task}
                assigneeWorkload={task.assigneeId ? workloadByMemberId[String(task.assigneeId)] : null}
                disabled={isUpdatingStatus}
                onDragStart={() => onDragTask(task)}
                onDragEnd={() => onDragTask(null)}
              />
            ))}
          </div>
        )}

        <div ref={sentinelRef} className="h-3" />

        {query.isFetchingNextPage && (
          <p className="border-t border-sky-50 px-4 py-3 text-center text-xs font-black text-sky-600">
            Đang tải thêm...
          </p>
        )}
      </div>
    </section>
  );
};

const StatusTaskCard = ({
  eventId,
  task,
  assigneeWorkload,
  disabled,
  onDragStart,
  onDragEnd,
}) => (
  <Link
    to={`/events/${eventId}/tasks/${task.id}`}
    draggable={!disabled}
    onDragStart={(event) => {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', String(task.id));
      onDragStart();
    }}
    onDragEnd={onDragEnd}
    onClick={(event) => {
      if (disabled) {
        event.preventDefault();
      }
    }}
    className={`block min-h-[132px] cursor-grab px-4 py-4 text-sm transition hover:bg-sky-50/70 active:cursor-grabbing ${
      disabled ? 'pointer-events-none opacity-60' : ''
    }`}
  >
    <div className="flex items-start justify-between gap-3">
      <span className="min-w-0">
        <span className="line-clamp-2 font-black leading-5 text-slate-950">
          {task.title}
        </span>
        <span className="mt-1 block truncate text-xs font-bold text-slate-500">
          {task.milestoneName || 'Chưa gán milestone'}
        </span>
      </span>
      <PriorityBadge priority={task.priority} className="shrink-0" />
    </div>

    <div className="mt-3 space-y-1.5 text-xs font-semibold text-slate-600">
      <span className="flex min-w-0 items-center gap-2">
        <Layers3 size={14} className="shrink-0 text-emerald-500" />
        <span className="truncate">{task.departmentName || 'Chưa gán ban'}</span>
      </span>

      <span className="flex min-w-0 items-center gap-2">
        <UserRound size={14} className="shrink-0 text-sky-500" />
        <span className="truncate">{task.assigneeName || 'Chưa phân công'}</span>
      </span>

      <span className="flex items-center gap-2 whitespace-nowrap">
        <CalendarDays size={14} className="text-emerald-500" />
        {formatDate(task.deadline)}
      </span>
    </div>

    {assigneeWorkload && (
      <p
        className={`mt-2 truncate text-[11px] font-black ${getWorkloadClassName(
          assigneeWorkload.workloadStatus
        )}`}
        title={`${assigneeWorkload.assignedTasks} task chưa hoàn thành · ${assigneeWorkload.workloadScore}% · ${assigneeWorkload.workloadStatus}`}
      >
        Workload: {assigneeWorkload.assignedTasks} task · {assigneeWorkload.workloadStatus}
      </p>
    )}

    <div className="mt-3">
      <ProgressBar value={task.progressPercentage ?? 0} />
      <span className="mt-1 block text-xs font-black text-slate-500">
        {task.progressPercentage ?? 0}%
      </span>
    </div>
  </Link>
);

const inputClassName = 'min-h-11 w-full min-w-0 rounded-2xl border border-sky-100 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-cyan-300 focus:bg-white focus:ring-4 focus:ring-cyan-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500';

export default TaskListPage;
