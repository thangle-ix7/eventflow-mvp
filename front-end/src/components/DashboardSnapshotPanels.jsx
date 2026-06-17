import { useEffect, useRef, useState } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Gauge,
  ListTodo,
  MessageSquareWarning,
  Plus,
  Radio,
} from 'lucide-react';
import { ErrorState, LoadingState, Panel } from './ui';
import MilestoneCreateModal from './MilestoneCreateModal';
import leaderSnapshotApi from '../api/leaderSnapshotApi';
import taskApi from '../api/taskApi';
import { formatDate } from '../utils/dateUtils';

const PRIORITIES = ['URGENT', 'HIGH', 'MEDIUM', 'LOW'];

export const EventLeaderSnapshotPanel = ({ eventId, snapshot, isLoading, error }) => {
  const [isMilestoneModalOpen, setIsMilestoneModalOpen] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState(null);

  if (isLoading) {
    return (
      <Panel className="p-5">
        <LoadingState message="Đang tính sức khỏe sự kiện..." />
      </Panel>
    );
  }

  if (error) {
    return (
      <Panel className="p-5">
        <ErrorState error={error} title="Không tải được tổng quan trưởng nhóm" />
      </Panel>
    );
  }

  if (!snapshot) return null;

  const metrics = snapshot.metrics || {};
  const milestones = snapshot.milestoneProgress || [];

  return (
    <>
    <Panel className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-sky-100 bg-gradient-to-r from-sky-50 via-white to-emerald-50 px-5 py-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex items-start gap-3">
          <IconShell>
            <Gauge className="h-5 w-5" strokeWidth={1.8} />
          </IconShell>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-500">
              Tổng quan trưởng nhóm
            </p>
            <h2 className="mt-1 text-xl font-black text-slate-950">
              Tiến độ cột mốc và công việc ưu tiên
            </h2>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsMilestoneModalOpen(true)}
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-2xl border border-sky-100 bg-white px-4 py-2 text-sm font-black text-sky-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-sky-50 hover:shadow-lg hover:shadow-sky-100"
        >
          <Plus size={16} />
          Tạo cột mốc
        </button>
      </div>

      <div className="space-y-5 p-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <SnapshotMetric icon={ListTodo} label="Tổng tiến độ công việc" value={`${snapshot.overallProgress ?? 0}%`} detail={`${metrics.completedTasks || 0}/${metrics.totalTasks || 0} công việc hoàn thành`} tone="sky" />
          <SnapshotMetric icon={Gauge} label="Cột mốc" value={milestones.length} detail="Chặng triển khai của sự kiện" tone="emerald" />
          <SnapshotMetric icon={Clock3} label="Quá hạn" value={metrics.overdueTasks || 0} detail={`${metrics.dueSoonTasks || 0} công việc sát hạn`} tone="rose" />
        </div>

        <MilestoneProgressBoard
          milestones={milestones}
          selectedMilestone={selectedMilestone}
          onSelectMilestone={setSelectedMilestone}
        />
        <PriorityTaskBoard
          eventId={eventId}
          milestone={selectedMilestone}
          onClearMilestone={() => setSelectedMilestone(null)}
        />
      </div>
    </Panel>

    <MilestoneCreateModal
      eventId={eventId}
      isOpen={isMilestoneModalOpen}
      onCancel={() => setIsMilestoneModalOpen(false)}
      onCreated={() => setIsMilestoneModalOpen(false)}
    />
    </>
  );
};

export const DepartmentLeaderSnapshotPanel = ({ eventId, departmentId, snapshot, isLoading, error }) => {
  if (isLoading) {
    return (
      <Panel className="p-5">
        <LoadingState message="Đang tính snapshot của ban..." />
      </Panel>
    );
  }

  if (error) {
    return (
      <Panel className="p-5">
        <ErrorState error={error} title="Không tải được tổng quan trưởng ban" />
      </Panel>
    );
  }

  if (!snapshot) return null;

  const brief = snapshot.departmentBrief || {};
  const backlog = snapshot.backlog || {};

  return (
    <Panel className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-sky-100 bg-gradient-to-r from-sky-50 via-white to-emerald-50 px-5 py-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-start gap-3">
          <IconShell>
            <Radio className="h-5 w-5" strokeWidth={1.8} />
          </IconShell>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-500">
              Tổng quan trưởng ban
            </p>
            <h2 className="mt-1 text-xl font-black text-slate-950">
              {brief.departmentName || 'Tổng quan ban'}
            </h2>
          </div>
        </div>

        <div className="grid gap-2 text-sm font-bold text-slate-500 sm:grid-cols-2 xl:text-right">
          <span>Trưởng ban: <strong className="text-slate-800">{brief.leaderName || 'Chưa chọn'}</strong></span>
          <span>{brief.memberCount || 0} thành viên</span>
        </div>
      </div>

      <div className="grid gap-4 p-5 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <SnapshotMetric icon={ListTodo} label="Công việc mở" value={backlog.openTasks || 0} detail={`${backlog.totalTasks || 0} tổng công việc`} tone="sky" />
            <SnapshotMetric icon={CheckCircle2} label="Tiến độ ban" value={`${backlog.progress || 0}%`} detail={`${backlog.completedTasks || 0}/${backlog.totalTasks || 0} hoàn thành`} tone="emerald" />
            <SnapshotMetric icon={Clock3} label="Quá hạn" value={snapshot.overdueCount || 0} detail="Công việc chưa hoàn thành đã quá hạn" tone="rose" />
            <SnapshotMetric icon={MessageSquareWarning} label="Chờ duyệt" value={backlog.inReviewTasks || 0} detail={`${backlog.inProgressTasks || 0} công việc đang làm`} tone="amber" />
          </div>

          <MemberStatusList members={snapshot.memberStatus || []} />
        </div>

        <div className="space-y-4">
          <CriticalList
            title="Công việc rủi ro của ban"
            items={snapshot.criticalTasks || []}
            emptyText="Ban chưa có công việc rủi ro nổi bật."
            eventId={eventId}
            viewAllPath={`/events/${eventId}/departments/${departmentId}/tasks`}
          />

          <DueSoonList items={snapshot.dueSoonTasks || []} eventId={eventId} />
          <WorkloadList items={snapshot.workload || []} />
        </div>
      </div>

      <QuickActions actions={snapshot.quickActions || []} />
    </Panel>
  );
};

const IconShell = ({ children }) => (
  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-sky-600 shadow-sm">
    {children}
  </span>
);

const SnapshotMetric = ({ icon: Icon, label, value, detail, tone }) => {
  const toneClass = {
    sky: 'bg-sky-50 text-sky-700 border-sky-100',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    rose: 'bg-rose-50 text-rose-700 border-rose-100',
  }[tone] || 'bg-slate-50 text-slate-700 border-slate-100';

  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <Icon className="h-5 w-5" strokeWidth={1.8} />
      <p className="mt-3 text-xs font-black uppercase tracking-[0.16em] opacity-75">{label}</p>
      <p className="mt-2 text-3xl font-black">{value}</p>
      <p className="mt-1 text-sm font-bold opacity-80">{detail}</p>
    </div>
  );
};

const MilestoneProgressBoard = ({ milestones, selectedMilestone, onSelectMilestone }) => (
  <section className="rounded-2xl border border-sky-100 bg-white p-4">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h3 className="font-black text-slate-950">Tiến độ cột mốc</h3>
      </div>
      {selectedMilestone && (
        <button
          type="button"
          onClick={() => onSelectMilestone(null)}
          className="inline-flex min-h-10 items-center justify-center rounded-2xl border border-sky-100 bg-white px-3 py-2 text-xs font-black text-sky-700 transition hover:bg-sky-50"
        >
          Xem toàn bộ sự kiện
        </button>
      )}
    </div>

    {milestones.length === 0 ? (
      <p className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-500">
        Chưa có cột mốc.
      </p>
    ) : (
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {milestones.map((milestone) => (
          <button
            key={milestone.milestoneId}
            type="button"
            onClick={() => onSelectMilestone(milestone)}
            className={`rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:border-sky-200 hover:bg-sky-50 hover:shadow-lg hover:shadow-sky-100 ${
              selectedMilestone?.milestoneId === milestone.milestoneId
                ? 'border-sky-300 bg-sky-50 shadow-lg shadow-sky-100'
                : 'border-slate-100 bg-slate-50'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-black text-slate-950">{milestone.name}</p>
                <p className="mt-1 text-xs font-bold text-slate-500">
                  {milestone.expectedDeadline ? formatDate(milestone.expectedDeadline) : 'Chưa có hạn'} · {milestone.status}
                </p>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-black ${priorityTone(milestone.priority)}`}>
                {milestone.priority || 'MEDIUM'}
              </span>
            </div>

            <div className="mt-4">
              <ProgressLine
                label={`${milestone.progress || 0}%`}
                value={milestone.progress || 0}
                detail={`${milestone.completedTasks || 0}/${milestone.totalTasks || 0} công việc hoàn thành`}
              />
            </div>

            <p className="mt-3 text-xs font-bold text-slate-500">
              {milestone.openTasks || 0} công việc mở · {milestone.overdueTasks || 0} quá hạn
            </p>
          </button>
        ))}
      </div>
    )}
  </section>
);

const PriorityTaskBoard = ({ eventId, milestone, onClearMilestone }) => {
  const queryClient = useQueryClient();
  const [draggingTask, setDraggingTask] = useState(null);
  const updatePriorityMutation = useMutation({
    mutationFn: taskApi.updateTaskPriority,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaderPriorityTasks', eventId] });
      queryClient.invalidateQueries({ queryKey: ['leaderSnapshot', eventId] });
    },
  });

  const handleDropTask = (priority) => {
    if (!draggingTask || draggingTask.priority === priority || updatePriorityMutation.isPending) {
      setDraggingTask(null);
      return;
    }

    updatePriorityMutation.mutate({
      taskId: draggingTask.taskId,
      priority,
    });
    setDraggingTask(null);
  };

  return (
    <section className="rounded-2xl border border-sky-100 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="font-black text-slate-950">Công việc theo độ ưu tiên</h3>
          {updatePriorityMutation.error && (
            <p className="mt-2 text-sm font-semibold text-rose-600">
              {updatePriorityMutation.error.userMessage || updatePriorityMutation.error.message}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {milestone && (
            <span className="inline-flex min-h-10 items-center rounded-2xl border border-sky-100 bg-white px-3 py-2 text-xs font-black text-sky-700">
              {milestone.name}
            </span>
          )}
          {milestone && (
            <button
              type="button"
              onClick={onClearMilestone}
              className="inline-flex min-h-10 items-center justify-center rounded-2xl border border-sky-100 bg-sky-50 px-3 py-2 text-xs font-black text-sky-700 transition hover:bg-sky-100"
            >
              Bỏ lọc cột mốc
            </button>
          )}
          <Link to={`/events/${eventId}/tasks`} className="text-sm font-black text-sky-600 hover:text-sky-700">
            Xem tất cả công việc
          </Link>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-100">
        <div className="grid grid-cols-1 bg-white sm:grid-cols-2 xl:grid-cols-4">
          {PRIORITIES.map((priority, index) => (
            <PriorityTaskColumn
              key={`${milestone?.milestoneId || 'all'}-${priority}`}
              eventId={eventId}
              priority={priority}
              milestoneId={milestone?.milestoneId}
              draggingTask={draggingTask}
              isUpdatingPriority={updatePriorityMutation.isPending}
              isLast={index === PRIORITIES.length - 1}
              onDragTask={setDraggingTask}
              onDropTask={handleDropTask}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

const PriorityTaskColumn = ({
  eventId,
  priority,
  milestoneId,
  draggingTask,
  isUpdatingPriority,
  isLast,
  onDragTask,
  onDropTask,
}) => {
  const scrollerRef = useRef(null);
  const sentinelRef = useRef(null);
  const query = useInfiniteQuery({
    queryKey: ['leaderPriorityTasks', eventId, priority, milestoneId || 'all'],
    queryFn: ({ pageParam = 0 }) => leaderSnapshotApi.getPriorityTasks({
      eventId,
      priority,
      milestoneId,
      page: pageParam,
      size: 8,
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
    <div
      className={`${isLast ? '' : 'xl:border-r xl:border-slate-100'} min-w-0 border-b border-slate-100 transition even:sm:border-r-0 sm:border-r xl:border-b-0 ${
        draggingTask && draggingTask.priority !== priority ? 'bg-sky-50/40' : ''
      }`}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
      }}
      onDrop={() => onDropTask(priority)}
    >
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-3 py-3">
        <span className={`rounded-full px-2.5 py-1 text-xs font-black ${priorityTone(priority)}`}>
          {priorityLabel(priority)}
        </span>
        <span className="text-xs font-black text-slate-400">{total}</span>
      </div>

      <div ref={scrollerRef} className="max-h-[520px] overflow-y-auto">
        {query.isLoading && (
          <div className="divide-y divide-slate-100">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="px-3 py-3">
                <div className="h-4 w-4/5 animate-pulse rounded bg-slate-100" />
                <div className="mt-2 h-3 w-3/5 animate-pulse rounded bg-slate-100" />
              </div>
            ))}
          </div>
        )}

        {query.error && (
          <p className="px-3 py-4 text-sm font-semibold text-rose-600">
            Không tải được công việc {priorityLabel(priority).toLowerCase()}.
          </p>
        )}

        {!query.isLoading && !query.error && tasks.length === 0 && (
          <p className="px-3 py-8 text-center text-xs font-bold text-slate-400">
            Không có công việc
          </p>
        )}

        {tasks.length > 0 && (
          <div className="divide-y divide-slate-100">
            {tasks.map((item) => (
              <PriorityTaskRow
                key={item.taskId}
                eventId={eventId}
                item={item}
                disabled={isUpdatingPriority}
                onDragStart={() => onDragTask(item)}
                onDragEnd={() => onDragTask(null)}
              />
            ))}
          </div>
        )}

        <div ref={sentinelRef} className="h-3" />

        {query.isFetchingNextPage && (
          <p className="border-t border-slate-100 px-3 py-3 text-center text-xs font-black text-sky-600">
            Đang tải thêm...
          </p>
        )}
      </div>
    </div>
  );
};

const PriorityTaskRow = ({ eventId, item, disabled, onDragStart, onDragEnd }) => (
  <Link
    to={`/events/${eventId}/tasks/${item.taskId}`}
    draggable={!disabled}
    onDragStart={(event) => {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', String(item.taskId));
      onDragStart();
    }}
    onDragEnd={onDragEnd}
    onClick={(event) => {
      if (disabled) {
        event.preventDefault();
      }
    }}
    className={`grid min-h-[92px] cursor-grab grid-cols-[1fr_auto] gap-3 px-3 py-3 text-sm transition hover:bg-sky-50 active:cursor-grabbing ${
      disabled ? 'pointer-events-none opacity-60' : ''
    }`}
  >
    <span className="min-w-0">
      <span className="line-clamp-2 font-black leading-5 text-slate-950">{item.title}</span>
      <span className="mt-1 block truncate text-xs font-bold text-slate-500">
        {item.milestoneName || 'Chưa gán cột mốc'}
      </span>
      <span className="mt-1 block truncate text-xs font-semibold text-slate-500">
        {item.departmentName || 'Chưa gán ban'} · {item.assigneeName || 'Chưa phân công'}
      </span>
    </span>

    <span className="flex min-w-[92px] flex-col items-end gap-1 text-right">
      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-black text-slate-600">
        {item.status}
      </span>
      {item.reason && item.reason !== 'OPEN' && (
        <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-black text-rose-600">
          {item.reason}
        </span>
      )}
      <span className="mt-auto text-[11px] font-bold text-slate-400">
        {item.deadline ? formatDate(item.deadline) : 'Chưa có hạn'}
      </span>
    </span>
  </Link>
);

const ProgressLine = ({ label, value, detail }) => (
  <div>
    <div className="mb-1 flex items-center justify-between gap-3 text-sm font-bold">
      <span className="text-slate-700">{label}</span>
      <span className="text-slate-500">{detail}</span>
    </div>
    <div className="h-2 overflow-hidden rounded-full bg-white">
      <div
        className="h-full rounded-full bg-gradient-to-r from-sky-500 to-emerald-400"
        style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
      />
    </div>
  </div>
);

const CriticalList = ({ title, items, emptyText, eventId, viewAllPath }) => (
  <div className="rounded-2xl border border-sky-100 bg-white p-4">
    <div className="flex items-center justify-between gap-3">
      <h3 className="font-black text-slate-950">{title}</h3>
      <Link to={viewAllPath} className="text-sm font-black text-sky-600 hover:text-sky-700">
        Xem công việc
      </Link>
    </div>

    <div className="mt-3 space-y-2">
      {items.length === 0 ? (
        <p className="text-sm font-semibold text-slate-500">{emptyText}</p>
      ) : (
        items.slice(0, 5).map((item) => (
          <Link
            key={item.taskId}
            to={`/events/${eventId}/tasks/${item.taskId}`}
            className="block rounded-2xl border border-slate-100 bg-slate-50 p-3 transition hover:border-sky-100 hover:bg-sky-50"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="min-w-0">
                <span className="block truncate font-black text-slate-950">{item.title}</span>
                <span className="mt-1 block text-xs font-bold text-slate-500">
                  {item.assigneeName || 'Chưa phân công'} · {item.reason}
                </span>
              </span>
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-rose-600">
                {item.priority}
              </span>
            </div>
          </Link>
        ))
      )}
    </div>
  </div>
);

const DueSoonList = ({ items, eventId }) => (
  <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-4">
    <h3 className="font-black text-slate-950">Sắp đến hạn 72 giờ</h3>
    <div className="mt-3 space-y-2">
      {items.length === 0 ? (
        <p className="text-sm font-semibold text-slate-500">Không có công việc sát hạn trong 72 giờ.</p>
      ) : (
        items.slice(0, 4).map((item) => (
          <Link key={item.taskId} to={`/events/${eventId}/tasks/${item.taskId}`} className="block rounded-2xl bg-white px-3 py-2 text-sm font-bold text-slate-700">
            <span className="block truncate text-slate-950">{item.title}</span>
            <span className="mt-1 block text-xs text-slate-500">{formatDate(item.deadline)} · {item.assigneeName}</span>
          </Link>
        ))
      )}
    </div>
  </div>
);

const WorkloadList = ({ items }) => (
  <div className="rounded-2xl border border-sky-100 bg-white p-4">
    <h3 className="font-black text-slate-950">Khối lượng việc</h3>
    <div className="mt-3 space-y-2">
      {items.length === 0 ? (
        <p className="text-sm font-semibold text-slate-500">Chưa có công việc để phân bổ khối lượng.</p>
      ) : (
        items.slice(0, 5).map((item) => (
          <div key={item.userId || 'unassigned'} className="rounded-2xl bg-slate-50 px-3 py-2">
            <div className="flex items-center justify-between gap-3 text-sm font-black">
              <span className="truncate text-slate-800">{item.userName}</span>
              <span className="text-sky-600">{item.openTasks || 0} đang mở</span>
            </div>
            <p className="mt-1 text-xs font-bold text-slate-500">
              {item.overdueTasks || 0} quá hạn · {item.urgentOrHighTasks || 0} ưu tiên cao/khẩn cấp
            </p>
          </div>
        ))
      )}
    </div>
  </div>
);

const MemberStatusList = ({ members }) => (
  <div className="rounded-2xl border border-sky-100 bg-white p-4">
    <h3 className="font-black text-slate-950">Trạng thái thành viên</h3>
    <div className="mt-3 space-y-2">
      {members.length === 0 ? (
        <p className="text-sm font-semibold text-slate-500">Ban chưa có thành viên.</p>
      ) : (
        members.slice(0, 6).map((member) => (
          <div key={member.userId} className="rounded-2xl bg-slate-50 px-3 py-2">
            <div className="flex items-center justify-between gap-3">
              <span className="truncate text-sm font-black text-slate-800">
                {member.userName}{member.leader ? ' · Trưởng ban' : ''}
              </span>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-black ${member.telegramLinked ? 'bg-sky-50 text-sky-700' : 'bg-slate-100 text-slate-500'}`}>
                {member.telegramLinked ? 'Telegram' : 'Chưa có Telegram'}
              </span>
            </div>
            <p className="mt-1 text-xs font-bold text-slate-500">
              {member.assignedOpenTasks || 0} công việc mở · {member.overdueTasks || 0} quá hạn
            </p>
          </div>
        ))
      )}
    </div>
  </div>
);

const QuickActions = ({ actions }) => {
  if (!actions.length) return null;

  return (
    <div className="border-t border-sky-100 bg-slate-50/70 p-5">
      <h3 className="font-black text-slate-950">Hành động nhanh</h3>
      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {actions.map((action) => (
          <Link
            key={`${action.type}-${action.path}`}
            to={action.path}
            className="group flex items-start gap-3 rounded-2xl border border-sky-100 bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-sky-100"
          >
            <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${getSeverityDot(action.severity)}`} />
            <span className="min-w-0">
              <span className="block font-black text-slate-950">{action.label}</span>
              <span className="mt-1 block text-sm font-semibold leading-5 text-slate-500">
                {action.description}
              </span>
            </span>
            <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-1 group-hover:text-sky-500" />
          </Link>
        ))}
      </div>
    </div>
  );
};

const getSeverityDot = (severity) => {
  if (severity === 'HIGH') return 'bg-rose-500';
  if (severity === 'MEDIUM') return 'bg-amber-400';
  return 'bg-emerald-400';
};

const priorityTone = (priority) => {
  if (priority === 'URGENT') return 'bg-rose-100 text-rose-700';
  if (priority === 'HIGH') return 'bg-orange-100 text-orange-700';
  if (priority === 'MEDIUM') return 'bg-sky-100 text-sky-700';
  return 'bg-slate-100 text-slate-600';
};

const priorityLabel = (priority) => {
  if (priority === 'URGENT') return 'Khẩn cấp';
  if (priority === 'HIGH') return 'Cao';
  if (priority === 'MEDIUM') return 'Trung bình';
  return 'Thấp';
};
