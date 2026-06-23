import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import {
  Building2,
  Edit,
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
import { formatDate } from '../utils/dateUtils';
import { getEventTypeLabel } from '../utils/eventTypeUtils';
import { getEventPermissions } from '../utils/permissionUtils';

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
      <div className="border-b border-slate-200 bg-white px-5 py-4">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-600">
            Hệ thống phân cấp
          </p>
          <h3 className="text-lg font-black text-slate-950">
            Leader và department
          </h3>
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
            description="Department và trưởng ban sẽ hiển thị tại đây."
          />
        </div>
      )}

      {!isLoading && !error && departments.length > 0 && (
        <div className="p-5">
          <div className="grid gap-4">
            <HierarchyRoot eventId={eventId} event={event} eventLeaders={hierarchy.eventLeaders} />

            <div
              className="grid gap-3"
              style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 18rem), 1fr))' }}
            >
              {hierarchy.departmentNodes.map((department) => (
                <DepartmentHierarchyNode key={department.id} eventId={eventId} department={department} />
              ))}
            </div>
          </div>
        </div>
      )}
    </Panel>
  );
};

const HierarchyRoot = ({ eventId, event, eventLeaders }) => (
  <div className="rounded-lg border border-sky-100 bg-sky-50/60 p-4">
    <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-600">
        Event Leader
      </p>
      <h4 className="min-w-0 truncate text-base font-black text-slate-950">
        {event?.name || event?.title || 'Sự kiện'}
      </h4>
    </div>

    <div className="mt-3 grid gap-2 sm:grid-cols-2">
      {eventLeaders.length > 0 ? eventLeaders.map((leader) => (
        <MemberPill key={getMemberKey(leader)} eventId={eventId} member={leader} label="Event Leader" compact />
      )) : (
        <div className="col-span-full rounded-lg border border-dashed border-sky-200 bg-white px-3 py-2 text-sm font-bold text-slate-500">
          Chưa có Event Leader
        </div>
      )}
    </div>
  </div>
);

const DepartmentHierarchyNode = ({ eventId, department }) => (
  <div className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
    <div className="min-w-0">
      <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">
        Department
      </p>
      <h4 className="mt-1 break-words text-base font-black text-slate-950">
        {department.name}
      </h4>
      {department.description && (
        <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-slate-500">
          {department.description}
        </p>
      )}
    </div>

    <p className="mt-4 border-t border-slate-100 pt-3 text-[11px] font-black uppercase tracking-[0.14em] text-emerald-600">
      Trưởng ban
    </p>
    {department.leader ? (
      <MemberPill eventId={eventId} member={department.leader} label="Department Leader" highlight />
    ) : (
      <div className="mt-2 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-500">
        Chưa phân bổ trưởng ban
      </div>
    )}
  </div>
);

const MemberPill = ({ eventId, member, label, highlight = false, compact = false }) => {
  const memberId = member.userId || member.id;
  const canOpenDetail = Boolean(eventId && memberId);

  return (
    <div className={`mt-2 flex min-w-0 items-center gap-2 rounded-lg border px-3 py-2 ${highlight ? 'border-emerald-100 bg-emerald-50/80' : 'border-sky-100 bg-white'}`}>
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

const InfoRow = ({ label, value }) => (
  <div className="px-5 py-3 text-sm leading-6 text-slate-700">
    <span className="font-black text-slate-950">{label}: </span>
    <span className="whitespace-pre-line font-semibold">{value}</span>
  </div>
);


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
