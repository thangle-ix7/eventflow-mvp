import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import {
  Building2,
  Crown,
  Edit,
  Layers,
  Network,
} from 'lucide-react';
import AppLayout from '../components/AppLayout';
import UserAvatar from '../components/UserAvatar';
import {
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  Panel,
} from '../components/ui';
import departmentApi from '../api/departmentApi';
import eventApi from '../api/eventApi';
import eventMemberApi from '../api/eventMemberApi';
import planningApi from '../api/planningApi';
import { formatDate } from '../utils/dateUtils';
import { getEventTypeLabel } from '../utils/eventTypeUtils';
import { getEventPermissions } from '../utils/permissionUtils';

const EMPTY_PLANNINGS = [];
const EMPTY_DEPARTMENTS = [];
const EMPTY_MEMBERS = [];

const EventDetailPage = ({ user, onLogout }) => {
  const { eventId } = useParams();

  const eventQuery = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => eventApi.getEvent(eventId),
    enabled: Boolean(eventId),
  });

  const event = eventQuery.data;
  const permissions = getEventPermissions(event);
  const isLeader = permissions.canManageEvent;

  const planningsQuery = useQuery({
    queryKey: ['eventPlannings', eventId],
    queryFn: () => planningApi.getPlannings(eventId),
    enabled: Boolean(eventId && event),
  });

  const departmentsQuery = useQuery({
    queryKey: ['eventDepartments', eventId],
    queryFn: () => departmentApi.getEventDepartments(eventId),
    enabled: Boolean(eventId && event),
  });

  const membersQuery = useQuery({
    queryKey: ['eventMembers', eventId],
    queryFn: () => eventMemberApi.getMembers(eventId),
    enabled: Boolean(eventId && event),
  });

  const plannings = useMemo(() => planningsQuery.data || EMPTY_PLANNINGS, [planningsQuery.data]);
  const departments = useMemo(() => departmentsQuery.data || EMPTY_DEPARTMENTS, [departmentsQuery.data]);
  const members = useMemo(() => membersQuery.data || EMPTY_MEMBERS, [membersQuery.data]);

  return (
    <AppLayout
      user={user}
      events={event ? [event] : []}
      selectedEvent={event}
      onEventChange={() => {}}
      onLogout={onLogout}
    >
      <div className="space-y-6">
        {eventQuery.isLoading && <LoadingState message="Đang tải tổng quan sự kiện..." />}

        {eventQuery.error && (
          <ErrorState error={eventQuery.error} title="Không tải được thông tin sự kiện" />
        )}

        {event && (
          <>
            <EventInfoPanel event={event} eventId={eventId} isLeader={isLeader} />

            <EventHierarchyPanel
              eventId={eventId}
              event={event}
              departments={departments}
              members={members}
              isLoading={departmentsQuery.isLoading || membersQuery.isLoading}
              error={departmentsQuery.error || membersQuery.error}
            />

            <PlanningOverview
              eventId={eventId}
              plannings={plannings}
              isLoading={planningsQuery.isLoading}
              error={planningsQuery.error}
            />
          </>
        )}
      </div>
    </AppLayout>
  );
};

const EventInfoPanel = ({ event, eventId, isLeader }) => {
  const infoRows = [
    {
      label: 'Mục tiêu',
      value: event.objective || 'Chưa có mục tiêu. Leader có thể bổ sung để ban tổ chức thống nhất tiêu chí hoàn thành.',
    },
    ...(event.contextDescription ? [{ label: 'Bối cảnh', value: event.contextDescription }] : []),
    ...(event.description ? [{ label: 'Mô tả', value: event.description }] : []),
    { label: 'Loại sự kiện', value: getEventTypeLabel(event.eventType) },
    {
      label: 'Số người dự kiến',
      value: event.expectedAttendees ? `${event.expectedAttendees} người` : 'Chưa nhập',
    },
    { label: 'Quy mô', value: event.scale || 'Chưa nhập' },
    { label: 'Thời gian', value: formatEventRange(event) },
    { label: 'Địa điểm', value: event.location || 'Chưa có địa điểm' },
  ];

  return (
    <Panel className="overflow-hidden">
      <div className="border-b border-sky-100 bg-gradient-to-r from-sky-50 via-white to-emerald-50 px-5 py-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">

            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-500">
                Thông tin sự kiện
              </p>
              <h3 className="mt-1 text-xl font-black text-slate-950">
                Mục tiêu và bối cảnh
              </h3>
            </div>
          </div>

          {isLeader && (
            <Button
              as={Link}
              to={`/events/${eventId}/edit`}
              variant="secondary"
              className="w-fit rounded-2xl border-sky-100 bg-white font-black text-sky-600 shadow-sm hover:bg-sky-50"
            >
              <Edit size={16} />
              Sửa thông tin
            </Button>
          )}
        </div>
      </div>

      <div className="divide-y divide-sky-50">
        {infoRows.map((item) => (
          <InfoRow key={item.label} {...item} />
        ))}
      </div>
    </Panel>
  );
};

const EventHierarchyPanel = ({ eventId, event, departments, members, isLoading, error }) => {
  const hierarchy = useMemo(
    () => buildHierarchy({ departments, members }),
    [departments, members]
  );

  return (
    <Panel className="overflow-hidden">
      <div className="border-b border-sky-100 bg-gradient-to-r from-slate-950 via-sky-950 to-emerald-950 px-5 py-5 text-white">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-cyan-100 ring-1 ring-white/15">
              <Network className="h-5 w-5" strokeWidth={1.8} />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200">
                Hệ thống phân cấp
              </p>
              <h3 className="mt-1 text-xl font-black tracking-tight">
                Sơ đồ phân bổ leader theo department
              </h3>
              <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-300">
                Event Leader điều phối tổng, các trưởng ban chịu trách nhiệm theo từng department.
              </p>
            </div>
          </div>
        </div>
      </div>

      {isLoading && <LoadingState message="Đang tải sơ đồ phân cấp..." />}

      {!isLoading && error && (
        <ErrorState error={error} title="Không tải được sơ đồ phân cấp" />
      )}

      {!isLoading && !error && departments.length === 0 && (
        <div className="p-5">
          <EmptyState
            icon={Building2}
            title="Chưa có department"
            description="Khi leader tạo department và gán trưởng ban, sơ đồ phân cấp sẽ hiển thị tại đây."
          />
        </div>
      )}

      {!isLoading && !error && departments.length > 0 && (
        <div className="p-5">
          <div className="overflow-x-auto pb-2">
            <div className="min-w-[920px] rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-emerald-50 p-5">
              <div className="flex justify-center">
                <HierarchyRoot eventId={eventId} event={event} eventLeaders={hierarchy.eventLeaders} />
              </div>

              <div className="mx-auto h-10 w-px bg-sky-200" />

              <div className="relative pt-6">
                <div className="absolute left-12 right-12 top-0 h-px bg-sky-200" />
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {hierarchy.departmentNodes.map((department) => (
                    <DepartmentHierarchyNode key={department.id} eventId={eventId} department={department} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Panel>
  );
};

const HierarchyRoot = ({ eventId, event, eventLeaders }) => (
  <div className="w-full max-w-xl rounded-2xl border border-sky-200 bg-white p-4 text-center shadow-xl shadow-sky-100/80">
    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-emerald-400 text-white shadow-lg shadow-cyan-100">
      <Crown className="h-6 w-6" strokeWidth={1.8} />
    </div>
    <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-500">
      Event Leader
    </p>
    <h4 className="mt-1 truncate text-lg font-black text-slate-950">
      {event?.name || event?.title || 'Sự kiện'}
    </h4>

    <div className="mt-3 grid gap-2 sm:grid-cols-2">
      {eventLeaders.length > 0 ? eventLeaders.map((leader) => (
        <MemberPill key={getMemberKey(leader)} eventId={eventId} member={leader} label="Event Leader" compact />
      )) : (
        <div className="col-span-full rounded-2xl bg-sky-50 px-3 py-2 text-sm font-bold text-slate-500">
          Chưa có dữ liệu Event Leader trong danh sách thành viên
        </div>
      )}
    </div>
  </div>
);

const DepartmentHierarchyNode = ({ eventId, department }) => (
  <div className="relative min-w-0 rounded-2xl border border-sky-100 bg-white p-4 shadow-lg shadow-sky-100/70">
    <div className="absolute left-1/2 top-[-25px] h-6 w-px -translate-x-1/2 bg-sky-200" />

    <div className="flex items-start gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 ring-1 ring-sky-100">
        <Building2 className="h-5 w-5" strokeWidth={1.8} />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
          Department
        </p>
        <h4 className="mt-1 truncate text-base font-black text-slate-950">
          {department.name}
        </h4>
        {department.description && (
          <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-slate-500">
            {department.description}
          </p>
        )}
      </div>
    </div>

    <div className="my-4 flex items-center gap-2">
      <span className="h-px flex-1 bg-sky-100" />
      <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-emerald-600">
        Trưởng ban
      </span>
      <span className="h-px flex-1 bg-sky-100" />
    </div>

    {department.leader ? (
      <MemberPill eventId={eventId} member={department.leader} label="Department Leader" highlight />
    ) : (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-500">
        Chưa phân bổ trưởng ban
      </div>
    )}
  </div>
);

const MemberPill = ({ eventId, member, label, highlight = false, compact = false }) => {
  const memberId = member.userId || member.id;
  const canOpenDetail = Boolean(eventId && memberId);

  return (
    <div className={`flex min-w-0 items-center gap-2 rounded-2xl border px-3 py-2 ${highlight ? 'border-emerald-100 bg-emerald-50/80' : 'border-sky-100 bg-white'}`}>
      <UserAvatar
        userId={memberId}
        avatarUrl={member.avatarUrl}
        name={member.name || member.email}
        size="sm"
      />
      <span className="min-w-0 flex-1 text-left">
        <span className={`${compact ? 'text-xs' : 'text-sm'} block truncate font-black text-slate-800`}>
          {member.name || 'Chưa có tên'}
        </span>
        <span className="block truncate text-xs font-bold text-slate-400">
          {label || member.email || 'Leader'}
        </span>
      </span>

      {canOpenDetail && (
        <Link
          to={`/events/${eventId}/members/${memberId}`}
          className="shrink-0 rounded-full border border-sky-100 bg-sky-50 px-3 py-1.5 text-xs font-black text-sky-600 transition hover:border-sky-200 hover:bg-white"
        >
          Chi tiết
        </Link>
      )}
    </div>
  );
};

const PlanningOverview = ({ eventId, plannings, isLoading, error }) => (
  <Panel className="overflow-hidden">
    <div className="flex flex-col gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <h3 className="text-base font-black text-slate-950">Kế hoạch</h3>
      <Button
        as={Link}
        to={`/events/${eventId}/plannings`}
        variant="secondary"
        className="min-h-9 w-fit rounded-md px-3 py-2"
      >
        Mở bảng
      </Button>
    </div>

    <div>
      {isLoading && <LoadingState message="Đang tải kế hoạch..." />}

      {!isLoading && error && (
        <ErrorState error={error} title="Không tải được kế hoạch" />
      )}

      {!isLoading && !error && plannings.length === 0 && (
        <div className="p-4">
          <EmptyState
            icon={Layers}
            title="Chưa có kế hoạch"
            description="Kế hoạch của sự kiện sẽ hiển thị tại đây sau khi được tạo."
          />
        </div>
      )}

      {!isLoading && !error && plannings.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
              <tr>
                <th className={overviewHeadCellClassName}>Kế hoạch</th>
                <th className={overviewHeadCellClassName}>#</th>
                <th className={overviewHeadCellClassName}>Giai đoạn</th>
                <th className={overviewHeadCellClassName}>Mục tiêu</th>
                <th className={overviewHeadCellClassName}>Mô tả</th>
              </tr>
            </thead>
            <tbody>
              {plannings.flatMap((planning) => {
                const phases = planning.phases || [];
                if (phases.length === 0) {
                  return [(
                    <tr key={`${planning.id}-empty`} className="hover:bg-slate-50">
                      <td className={overviewBodyCellClassName}>
                        <p className="font-black text-slate-950">{planning.title}</p>
                        {planning.description && <p className="mt-1 text-xs font-semibold text-slate-500">{planning.description}</p>}
                      </td>
                      <td className={overviewIndexCellClassName}>-</td>
                      <td className={overviewBodyCellClassName}>Chưa có giai đoạn</td>
                      <td className={overviewBodyCellClassName}>-</td>
                      <td className={overviewBodyCellClassName}>-</td>
                    </tr>
                  )];
                }

                return phases.map((phase, index) => (
                  <tr key={phase.id || `${planning.id}-${index}`} className="hover:bg-slate-50">
                    <td className={overviewBodyCellClassName}>
                      <p className="font-black text-slate-950">{planning.title}</p>
                      {index === 0 && planning.description && (
                        <p className="mt-1 text-xs font-semibold text-slate-500">{planning.description}</p>
                      )}
                    </td>
                    <td className={overviewIndexCellClassName}>{index + 1}</td>
                    <td className={overviewBodyCellClassName}>
                      <p className="font-bold text-slate-900">{phase.phaseName}</p>
                    </td>
                    <td className={overviewBodyCellClassName}>{phase.objective || '-'}</td>
                    <td className={overviewBodyCellClassName}>{phase.description || '-'}</td>
                  </tr>
                ));
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  </Panel>
);

const InfoRow = ({ label, value }) => (
  <div className="px-5 py-3 text-sm leading-6 text-slate-700">
    <span className="font-black text-slate-950">{label}: </span>
    <span className="whitespace-pre-line font-semibold">{value}</span>
  </div>
);

const overviewHeadCellClassName = 'border-b border-slate-200 px-3 py-2';
const overviewBodyCellClassName = 'border-b border-slate-100 px-3 py-3 align-top font-semibold leading-6 text-slate-600';
const overviewIndexCellClassName = 'w-14 border-b border-slate-100 px-3 py-3 text-center text-xs font-black text-slate-400';

const buildHierarchy = ({ departments, members }) => {
  const memberById = new Map(
    members
      .filter((member) => member.userId || member.id)
      .map((member) => [String(member.userId || member.id), member])
  );

  const departmentNodes = departments.map((department) => ({
    ...department,
    leader: getDepartmentLeader(
      department,
      memberById,
      members.filter((member) => String(member.departmentId || '') === String(department.id))
    ),
  }));

  const eventLeaders = members.filter((member) => member.role === 'LEADER');

  return {
    departmentNodes,
    eventLeaders,
  };
};

const getDepartmentLeader = (department, memberById, departmentMembers) => {
  if (department.leaderUserId && memberById.has(String(department.leaderUserId))) {
    return memberById.get(String(department.leaderUserId));
  }

  const matchedByEmail = department.leaderEmail
    ? departmentMembers.find((member) => member.email === department.leaderEmail)
    : null;
  if (matchedByEmail) {
    return matchedByEmail;
  }

  if (department.leaderUserId || department.leaderName || department.leaderEmail) {
    return {
      userId: department.leaderUserId,
      name: department.leaderName || department.leaderEmail || 'Trưởng ban',
      email: department.leaderEmail,
      role: 'LEADER',
    };
  }

  return null;
};

const getMemberKey = (member) => String(member.userId || member.id || member.email || member.name);


const formatEventRange = (event) => {
  const start = event?.startTime || event?.eventDate;
  const end = event?.endTime;
  if (!end || end === start) {
    return `Bắt đầu: ${formatDate(start)}`;
  }
  return `${formatDate(start)} - ${formatDate(end)}`;
};

export default EventDetailPage;
