import { useEffect, useMemo, useRef, useState } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  Plus,
  Search,
  X,
} from 'lucide-react';
import AppLayout from '../components/AppLayout';
import InlineTaskCreator from '../components/InlineTaskCreator';
import {
  Button,
  ErrorState,
  LoadingState,
  Panel,
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
  {
    key: 'TODO',
    label: 'Cần làm',
    chipClass: 'bg-slate-100 text-slate-700',
    borderClass: 'border-t-slate-300',
    dropClass: 'ring-slate-100',
    statusKey: 'TODO',
    deadlineStatus: 'ACTIVE',
  },
  {
    key: 'IN_PROGRESS',
    label: 'Đang làm',
    chipClass: 'bg-amber-100 text-amber-700',
    borderClass: 'border-t-amber-400',
    dropClass: 'ring-amber-100',
    statusKey: 'IN_PROGRESS',
    deadlineStatus: 'ACTIVE',
  },
  {
    key: 'IN_REVIEW',
    label: 'Chờ duyệt',
    chipClass: 'bg-violet-100 text-violet-700',
    borderClass: 'border-t-violet-400',
    dropClass: 'ring-violet-100',
    statusKey: 'IN_REVIEW',
    deadlineStatus: 'ACTIVE',
  },
  {
    key: 'DONE',
    label: 'Hoàn thành',
    chipClass: 'bg-emerald-100 text-emerald-700',
    borderClass: 'border-t-emerald-400',
    dropClass: 'ring-emerald-100',
    statusKey: 'DONE',
    deadlineStatus: 'ACTIVE',
  },
  {
    key: 'OVERDUE',
    label: 'Quá hạn',
    chipClass: 'bg-red-100 text-red-700',
    borderClass: 'border-t-red-500',
    dropClass: 'ring-red-100',
    statusKey: '',
    deadlineStatus: 'OVERDUE',
    readOnly: true,
  },
];

const PRIORITY_CARD_CLASS = {
  URGENT: 'border-l-rose-500',
  HIGH: 'border-l-orange-400',
  MEDIUM: 'border-l-sky-400',
  LOW: 'border-l-slate-300',
};

const PRIORITY_LABELS = {
  URGENT: 'Khẩn cấp',
  HIGH: 'Cao',
  MEDIUM: 'Trung bình',
  LOW: 'Thấp',
};

const getDeadlineCardClassName = (deadlineStatus) => {
  if (deadlineStatus === 'OVERDUE') {
    return 'border-red-300 bg-red-50/90 shadow-red-100';
  }

  if (deadlineStatus === 'DUE_SOON') {
    return 'border-amber-300 bg-amber-50/90 shadow-amber-100';
  }

  return 'bg-white';
};

const getDeadlineTextClassName = (deadlineStatus) => {
  if (deadlineStatus === 'OVERDUE') {
    return 'text-red-700';
  }

  if (deadlineStatus === 'DUE_SOON') {
    return 'text-amber-700';
  }

  return 'text-slate-500';
};

const getDeadlineLabel = (task) => {
  if (task.deadlineStatus === 'OVERDUE') {
    return 'Quá hạn';
  }

  if (task.deadlineStatus === 'DUE_SOON') {
    return 'Gần hạn';
  }

  return 'Hạn';
};
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
                  <option value="OVERDUE">Quá hạn</option>
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

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-50/70">
        <div className={`grid ${visibleColumns.length === 1 ? 'min-w-[320px] grid-cols-1' : 'min-w-[1200px] grid-cols-5'}`}>
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
      status: column.statusKey,
      deadlineStatus: column.deadlineStatus,
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
      className={`min-w-0 border-r border-slate-200 bg-slate-50/70 transition last:border-r-0 ${column.borderClass} ${
        draggingTask && !column.readOnly && draggingTask.status !== column.key ? `ring-4 ${column.dropClass}` : ''
      }`}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = column.readOnly ? 'none' : 'move';
      }}
      onDrop={() => { if (!column.readOnly) onDropTask(column.key); }}
    >
      <div className="flex min-h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white px-3 py-3 shadow-sm">
        <span className={`rounded-md px-3 py-1.5 text-xs font-black uppercase ${column.chipClass}`}>
          {column.label}
        </span>
        <span className="flex items-center gap-2">
          <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-black text-slate-600">
            {total}
          </span>
          {canCreate && !column.readOnly && (
            <button
              type="button"
              onClick={() => onCreateInStatus?.(column.key)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-sky-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-sky-50"
              aria-label={`Tạo task ${column.label.toLowerCase()}`}
              title={`Tạo task ${column.label.toLowerCase()}`}
            >
              <Plus size={16} />
            </button>
          )}
        </span>
      </div>

      <div ref={scrollerRef} className="max-h-[620px] space-y-3 overflow-y-auto p-3">
        {query.isLoading && (
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <LoadingState message="Đang tải task..." />
          </div>
        )}

        {query.error && (
          <div className="rounded-lg border border-rose-100 bg-rose-50 p-4">
            <ErrorState error={query.error} title={`Không tải được ${column.label.toLowerCase()}`} />
          </div>
        )}

        {!query.isLoading && !query.error && tasks.length === 0 && (
          <p className="rounded-lg border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-xs font-bold text-slate-400">
            Không có task
          </p>
        )}

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

        <div ref={sentinelRef} className="h-3" />

        {query.isFetchingNextPage && (
          <p className="border-t border-slate-100 px-4 py-3 text-center text-xs font-black text-sky-600">
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
}) => {
  const priorityClass = PRIORITY_CARD_CLASS[task.priority] || PRIORITY_CARD_CLASS.MEDIUM;
  const deadlineCardClass = getDeadlineCardClassName(task.deadlineStatus);
  const deadlineTextClass = getDeadlineTextClassName(task.deadlineStatus);

  return (
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
      className={`block min-h-[168px] cursor-grab rounded-lg border border-l-4 border-slate-200 p-4 text-sm shadow-sm transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-md active:cursor-grabbing ${priorityClass} ${deadlineCardClass} ${
        disabled ? 'pointer-events-none opacity-60' : ''
      }`}
    >
      <span className="block truncate text-[11px] font-semibold text-slate-400">
        {task.milestoneName || 'Chưa gán milestone'}
      </span>

      <span className="mt-1 block line-clamp-2 min-h-10 font-black leading-5 text-slate-950">
        {task.title}
      </span>

      <span className="mt-3 flex items-center justify-between gap-3 text-xs font-semibold text-slate-500">
        <span className={`truncate ${deadlineTextClass}`}>{getDeadlineLabel(task)} · {formatDate(task.deadline)}</span>
        <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-600">
          {PRIORITY_LABELS[task.priority] || task.priority || 'Trung bình'}
        </span>
      </span>

      <span className="mt-3 grid gap-1.5 text-xs font-semibold text-slate-600">
        <span className="grid grid-cols-[72px_minmax(0,1fr)] gap-2">
          <span className="text-slate-400">Ban</span>
          <span className="truncate">{task.departmentName || 'Chưa gán ban'}</span>
        </span>
        <span className="grid grid-cols-[72px_minmax(0,1fr)] gap-2">
          <span className="text-slate-400">Phụ trách</span>
          <span className="truncate">{task.assigneeName || 'Chưa phân công'}</span>
        </span>
      </span>

      <span className="mt-3 flex items-center justify-between gap-3 text-xs font-semibold text-slate-500">
        <span>{task.progressPercentage ?? 0}% hoàn thành</span>
        {assigneeWorkload && (
          <span
            className={`truncate text-[11px] font-black ${getWorkloadClassName(
              assigneeWorkload.workloadStatus
            )}`}
            title={`${assigneeWorkload.assignedTasks} task chưa hoàn thành · ${assigneeWorkload.workloadScore}% · ${assigneeWorkload.workloadStatus}`}
          >
            {assigneeWorkload.assignedTasks} task
          </span>
        )}
      </span>
    </Link>
  );
};

const inputClassName = 'min-h-11 w-full min-w-0 rounded-2xl border border-sky-100 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-cyan-300 focus:bg-white focus:ring-4 focus:ring-cyan-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500';

export default TaskListPage;



