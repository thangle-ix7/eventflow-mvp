import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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
  SelectControl,
  StatusBadge,
  TextInput,
} from '../components/ui';
import eventApi from '../api/eventApi';
import taskApi from '../api/taskApi';
import departmentApi from '../api/departmentApi';
import userApi from '../api/userApi';
import { formatDate } from '../utils/dateUtils';
import { normalizeTaskPageSize } from '../utils/paginationUtils';

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
    queryKey: ['eventTaskPage', eventId, page, pageSize, search, status, priority, departmentId, fromDate, toDate],
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
        <Panel className="p-5">
          <PageHeader
            eyebrow={event?.name || 'Sự kiện'}
            title="Danh sách công việc"
          />

          <form onSubmit={handleSearchSubmit} className="mt-4 grid gap-3 md:grid-cols-[1fr_150px_150px_190px_150px_150px_auto]">
            <TextInput
              id="task-search"
              name="search"
              aria-label="Tìm công việc"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Tìm theo tên công việc"
            />
            <SelectControl aria-label="Lọc trạng thái công việc" name="status" value={status} onChange={(event) => { setPage(0); setStatus(event.target.value); }}>
              <option value="">Tất cả trạng thái</option>
              <option value="TODO">Cần làm</option>
              <option value="IN_PROGRESS">Đang làm</option>
              <option value="IN_REVIEW">Chờ duyệt</option>
              <option value="DONE">Hoàn thành</option>
            </SelectControl>
            <SelectControl aria-label="Lọc ưu tiên công việc" name="priority" value={priority} onChange={(event) => { setPage(0); setPriority(event.target.value); }}>
              <option value="">Tất cả ưu tiên</option>
              <option value="LOW">Thấp</option>
              <option value="MEDIUM">Trung bình</option>
              <option value="HIGH">Cao</option>
              <option value="URGENT">Khẩn cấp</option>
            </SelectControl>
            <SelectControl aria-label="Lọc theo ban" name="departmentId" value={departmentId} onChange={(event) => { setPage(0); setDepartmentId(event.target.value); }}>
              <option value="">Tất cả ban</option>
              {departmentsQuery.data?.map((department) => (
                <option key={department.id} value={department.id}>{department.name}</option>
              ))}
            </SelectControl>
            <TextInput
              icon={null}
              type="date"
              aria-label="Từ ngày"
              value={fromDate}
              onChange={(event) => { setPage(0); setFromDate(event.target.value); }}
            />
            <TextInput
              icon={null}
              type="date"
              aria-label="Đến ngày"
              value={toDate}
              onChange={(event) => { setPage(0); setToDate(event.target.value); }}
            />
            <Button type="submit" variant="secondary">Tìm kiếm</Button>
          </form>
        </Panel>

        <Panel>
          {tasksQuery.isLoading && <LoadingState message="Đang tải công việc..." />}
          {tasksQuery.error && (
            <div className="p-4">
              <ErrorState error={tasksQuery.error} title="Không tải được danh sách công việc" />
            </div>
          )}
          {isLeader && !tasksQuery.isLoading && !tasksQuery.error && (
            <InlineTaskCreator
              eventId={eventId}
              event={event}
              departments={departmentsQuery.data || []}
              departmentId={departmentId}
              lockedDepartment={Boolean(departmentId)}
              invalidateKeys={[
                ['eventTaskPage', eventId],
                ['departmentTaskPage', eventId, departmentId],
              ]}
            />
          )}
          {!tasksQuery.isLoading && !tasksQuery.error && tasks.length === 0 && (
            <div className="p-4">
              <EmptyState title="Chưa có công việc phù hợp" />
            </div>
          )}
          {tasks.length > 0 && (
            <div className="overflow-x-auto">
              <div className="min-w-[980px]">
                <div className="grid grid-cols-[minmax(220px,1.5fr)_160px_160px_180px_130px_120px_100px] items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-500">
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
                    className="grid grid-cols-[minmax(220px,1.5fr)_160px_160px_180px_130px_120px_100px] items-center gap-2 border-b border-slate-100 px-4 py-3 text-sm transition last:border-b-0 hover:bg-indigo-50/50"
                  >
                    <span className="truncate font-semibold text-slate-950">{task.title}</span>
                    <span className="truncate text-slate-600">{task.departmentName || 'Chưa gán ban'}</span>
                    <span className="truncate text-slate-600">{task.assigneeName || 'Chưa phân công'}</span>
                    <span className="whitespace-nowrap text-slate-600">{formatDate(task.deadline)}</span>
                    <PriorityBadge priority={task.priority} />
                    <StatusBadge status={task.status} />
                    <span className="min-w-0">
                      <ProgressBar value={task.progressPercentage ?? 0} />
                      <span className="mt-1 block text-xs font-semibold text-slate-500">{task.progressPercentage ?? 0}%</span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </Panel>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <form onSubmit={handlePageSizeSubmit} className="flex items-center gap-2 text-sm text-slate-600">
            <label htmlFor="task-page-size" className="font-semibold">Số dòng/trang</label>
            <input
              id="task-page-size"
              type="number"
              min="1"
              max="100"
              value={pageSizeInput}
              onChange={(event) => setPageSizeInput(event.target.value)}
              onBlur={applyPageSize}
              className="w-20 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
            <span className="text-xs text-slate-500">
              {updatePreferencesMutation.isPending ? 'Đang lưu...' : 'Lưu theo tài khoản'}
            </span>
          </form>
          <div className="flex justify-end gap-2">
          <Button type="button" onClick={() => setPage((old) => Math.max(old - 1, 0))} disabled={page === 0} variant="secondary">
            <ChevronLeft size={16} />
            Trước
          </Button>
          <Button type="button" onClick={() => setPage((old) => old + 1)} disabled={tasksQuery.data?.last !== false} variant="secondary">
            Sau
            <ChevronRight size={16} />
          </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default TaskListPage;
