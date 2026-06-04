export const isEventLeader = (event) => event?.role === 'LEADER';

export const getEventPermissions = (event) => {
  const isLeader = isEventLeader(event);
  const hasDepartment = Boolean(event?.departmentId);

  return {
    canViewEventDashboard: isLeader,
    canViewDepartmentDashboard: isLeader,
    canManageEvent: isLeader,
    canManageDepartments: isLeader,
    canManageMembers: isLeader,
    canCreateTasks: isLeader,
    canCreateCalendarItems: isLeader,
    canViewDepartments: isLeader || hasDepartment,
    ownDepartmentId: event?.departmentId || null,
  };
};

export const canAccessDepartment = (event, departmentId) => {
  if (isEventLeader(event)) {
    return true;
  }

  return Boolean(event?.departmentId && String(event.departmentId) === String(departmentId));
};

export const getDepartmentHomePath = (event) => {
  if (!event?.id) {
    return null;
  }

  if (isEventLeader(event)) {
    return `/events/${event.id}/departments`;
  }

  if (event.departmentId) {
    return `/events/${event.id}/departments/${event.departmentId}`;
  }

  return null;
};
