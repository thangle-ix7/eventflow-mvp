import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  Plus,
  Search,
  X,
} from 'lucide-react';
import AppLayout from '../components/AppLayout';
import InlineTaskCreator from '../components/InlineTaskCreator';
import {
  Button,
  Panel,
} from '../components/ui';
import departmentApi from '../api/departmentApi';
import eventApi from '../api/eventApi';
import milestoneApi from '../api/milestoneApi';
import workloadApi from '../api/workloadApi';
import ErrorPage from './ErrorPage';
import { canAccessDepartment, getEventPermissions } from '../utils/permissionUtils';
import { StatusFilterBoxes, StatusTaskBoard } from './TaskListPage';

const DepartmentTasksPage = ({ user, onLogout }) => {
  const { eventId, departmentId } = useParams();
  const [searchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState(() => searchParams.get('search') || '');
  const [search, setSearch] = useState(() => searchParams.get('search') || '');
  const [selectedStatuses, setSelectedStatuses] = useState(() => {
    const initialStatus = searchParams.get('status');
    return initialStatus ? [initialStatus] : [];
  });
  const [priority, setPriority] = useState(() => searchParams.get('priority') || '');
  const [milestoneId, setMilestoneId] = useState(() => searchParams.get('milestoneId') || '');
  const [quickCreateStatus, setQuickCreateStatus] = useState('');

  const eventQuery = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => eventApi.getEvent(eventId),
    enabled: Boolean(eventId),
  });

  const event = eventQuery.data;
  const permissions = getEventPermissions(event);
  const canReadDepartment = Boolean(event && canAccessDepartment(event, departmentId));
  const isLeader = permissions.canCreateTasks;

  const departmentQuery = useQuery({
    queryKey: ['department', eventId, departmentId],
    queryFn: () => departmentApi.getDepartment({ eventId, departmentId }),
    enabled: Boolean(eventId && departmentId && canReadDepartment),
  });

  const departmentsQuery = useQuery({
    queryKey: ['eventDepartments', eventId],
    queryFn: () => departmentApi.getEventDepartments(eventId),
    enabled: Boolean(eventId && canReadDepartment),
  });

  const milestonesQuery = useQuery({
    queryKey: ['eventMilestones', eventId],
    queryFn: () => milestoneApi.getEventMilestones(eventId),
    enabled: Boolean(eventId && canReadDepartment),
  });

  const departmentWorkloadQuery = useQuery({
    queryKey: ['departmentWorkload', eventId, departmentId],
    queryFn: () => workloadApi.getDepartmentWorkload({ eventId, departmentId }),
    enabled: Boolean(eventId && departmentId && canReadDepartment),
  });

  const department = departmentQuery.data;
  const departments = departmentsQuery.data || [];
  const milestones = milestonesQuery.data || [];

  const workloadByMemberId = useMemo(() => {
    const members = departmentWorkloadQuery.data?.members || [];
    return members.reduce((map, member) => {
      map[String(member.memberId)] = member;
      return map;
    }, {});
  }, [departmentWorkloadQuery.data]);

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    setSearch(searchInput.trim());
  };

  const activeFilterCount = useMemo(
    () => [search, priority, milestoneId].filter(Boolean).length + (selectedStatuses.length ? 1 : 0),
    [milestoneId, priority, search, selectedStatuses.length]
  );

  const resetFilters = () => {
    setSearchInput('');
    setSearch('');
    setSelectedStatuses([]);
    setPriority('');
    setMilestoneId('');
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
            <Panel className="p-4">
              <div className="grid gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-600">
                    Department tasks
                  </p>
                  <h2 className="mt-1 truncate text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                    Task của {department?.name || 'department'}
                  </h2>
                </div>

                <form onSubmit={handleSearchSubmit} className="grid w-full gap-3">
                  <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_auto_auto]">
                    <div className="relative">
                      <Search
                        className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-sky-400"
                        strokeWidth={1.8}
                      />

                      <input
                        id="department-task-search"
                        name="search"
                        aria-label="Tìm công việc trong ban"
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

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[220px_150px_minmax(170px,1fr)_auto]">
                    <StatusFilterBoxes
                      selectedStatuses={selectedStatuses}
                      onToggleStatus={(nextStatus) => {
                        setSelectedStatuses((currentStatuses) => (
                          currentStatuses.includes(nextStatus)
                            ? currentStatuses.filter((item) => item !== nextStatus)
                            : [...currentStatuses, nextStatus]
                        ));
                      }}
                    />
                    <select
                      aria-label="Lọc ưu tiên công việc"
                      name="priority"
                      value={priority}
                      onChange={(event) => setPriority(event.target.value)}
                      className={inputClassName}
                    >
                      <option value="">Tất cả ưu tiên</option>
                      <option value="LOW">Thấp</option>
                      <option value="MEDIUM">Trung bình</option>
                      <option value="HIGH">Cao</option>
                      <option value="URGENT">Khẩn cấp</option>
                    </select>

                    <select
                      aria-label="Lọc theo cột mốc"
                      name="milestoneId"
                      value={milestoneId}
                      onChange={(event) => setMilestoneId(event.target.value)}
                      disabled={milestonesQuery.isLoading}
                      className={inputClassName}
                    >
                      <option value="">Tất cả cột mốc</option>
                      {milestones.map((milestone) => (
                        <option key={milestone.id} value={milestone.id}>
                          {milestone.name}
                        </option>
                      ))}
                    </select>

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
                  key={`department-task-creator-${quickCreateStatus}`}
                  eventId={eventId}
                  event={event}
                  departments={departments}
                  departmentId={departmentId}
                  lockedDepartment
                  initialStatus={quickCreateStatus}
                  defaultOpen
                  departmentWorkload={departmentWorkloadQuery.data}
                  departmentWorkloadLoading={departmentWorkloadQuery.isLoading}
                  departmentWorkloadError={departmentWorkloadQuery.error}
                  invalidateKeys={[
                    ['departmentTaskPage', eventId, departmentId],
                    ['eventTaskPage', eventId],
                    ['departmentWorkload', eventId, departmentId],
                    ['departmentLeaderSnapshot', eventId, departmentId],
                  ]}
                />
              </Panel>
            )}

            <Panel className="overflow-hidden">
              <StatusTaskBoard
                eventId={eventId}
                search={search}
                selectedStatuses={selectedStatuses}
                priority={priority}
                departmentId={departmentId}
                milestoneId={milestoneId}
                workloadByMemberId={workloadByMemberId}
                canCreate={isLeader}
                onCreateInStatus={setQuickCreateStatus}
              />
            </Panel>
          </>
        )}
      </div>
    </AppLayout>
  );
};

const inputClassName = 'min-h-11 w-full min-w-0 rounded-2xl border border-sky-100 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-cyan-300 focus:bg-white focus:ring-4 focus:ring-cyan-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500';

export default DepartmentTasksPage;