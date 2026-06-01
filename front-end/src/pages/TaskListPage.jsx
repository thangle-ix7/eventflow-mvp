import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, ChevronLeft, ChevronRight, Plus, UserRound } from 'lucide-react';
import AppLayout from '../components/AppLayout';
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
import { formatDate } from '../utils/dateUtils';

const PAGE_SIZE = 10;

const TaskListPage = ({ user, onLogout }) => {
  const { eventId } = useParams();
  const [searchParams] = useSearchParams();
  const [page, setPage] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
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
    queryKey: ['eventTaskPage', eventId, page, search, status, priority, departmentId],
    queryFn: () =>
      taskApi.getEventTaskPage({
        eventId,
        page,
        size: PAGE_SIZE,
        search,
        status,
        priority,
        departmentId,
      }),
    enabled: Boolean(eventId),
  });

  const event = eventQuery.data;
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
        <Link to={`/events/${eventId}`} className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600">
          <ArrowLeft size={16} />
          Quay lại sự kiện
        </Link>

        <Panel className="p-5">
          <PageHeader
            eyebrow={event?.name || 'Sự kiện'}
            title="Danh sách công việc"
            description="Theo dõi deadline, người phụ trách, tiến độ và trạng thái của mọi task trong sự kiện."
            actions={isLeader && (
              <Button as={Link} to={`/events/${eventId}/tasks/new${departmentId ? `?departmentId=${departmentId}` : ''}`}>
                <Plus size={18} />
                Tạo công việc
              </Button>
            )}
          />

          <form onSubmit={handleSearchSubmit} className="mt-4 grid gap-3 md:grid-cols-[1fr_150px_150px_190px_auto]">
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
          {!tasksQuery.isLoading && !tasksQuery.error && tasks.length === 0 && (
            <div className="p-4">
              <EmptyState title="Chưa có công việc phù hợp" description="Thử đổi bộ lọc hoặc tạo công việc mới nếu bạn là leader." />
            </div>
          )}
          {tasks.map((task) => (
            <Link key={task.id} to={`/events/${eventId}/tasks/${task.id}`} className="block border-b border-slate-100 p-4 transition last:border-b-0 hover:bg-indigo-50/50">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-950">{task.title}</p>
                    <StatusBadge status={task.status} />
                    <PriorityBadge priority={task.priority} />
                  </div>
                  {task.description && <p className="mt-1 line-clamp-2 text-sm text-slate-600">{task.description}</p>}
                  <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-500">
                    <span>{task.departmentName || 'Chưa gán ban'}</span>
                    <span className="inline-flex items-center gap-1.5"><UserRound size={15} />{task.assigneeName || 'Chưa phân công'}</span>
                    <span className="inline-flex items-center gap-1.5"><CalendarDays size={15} />{formatDate(task.deadline)}</span>
                  </div>
                  <div className="mt-3 max-w-xs">
                    <ProgressBar value={task.progressPercentage ?? 0} />
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      Tiến độ {task.progressPercentage ?? 0}%
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </Panel>

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
    </AppLayout>
  );
};

export default TaskListPage;
