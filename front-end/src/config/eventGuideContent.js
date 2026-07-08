export const EVENT_GUIDE_STORAGE_PREFIX = 'eventflow:guide:seen';

export const EVENT_FLOW_GUIDE_ID = 'event-flow-main-tour';

export const createEventPath = (eventId, suffix = '') => {
  if (!eventId) {
    return '/events';
  }

  return `/events/${eventId}${suffix}`;
};

const renumberGuideSteps = (steps) => steps.map((step, index) => ({
  ...step,
  stepLabel: `Bước ${index + 1}/${steps.length}`,
}));

export const createEventFlowGuide = (eventId, options = {}) => {
  const {
    permissions = {},
    departmentHomePath,
    role,
  } = options;
  const isLeader = role === 'LEADER' || permissions.canManageEvent === true;
  const eventInfoPath = createEventPath(eventId);
  const eventDashboardPath = createEventPath(eventId, '/dashboard');
  const eventMilestonesPath = createEventPath(eventId, '/milestones');
  const eventTasksPath = createEventPath(eventId, '/tasks');
  const eventDepartmentsPath = departmentHomePath || createEventPath(eventId, '/departments');
  const eventMembersPath = createEventPath(eventId, '/members');

  const canViewEventDashboard = isLeader && permissions.canViewEventDashboard === true;
  const canManageEvent = isLeader && permissions.canManageEvent === true;
  const canCreateTasks = isLeader && permissions.canCreateTasks === true;
  const canViewDepartments = permissions.canViewDepartments === true && Boolean(departmentHomePath);
  const canManageDepartments = isLeader && permissions.canManageDepartments === true;
  const canManageMembers = isLeader && permissions.canManageMembers === true;

  const steps = [
    {
      id: 'open-event-info',
      target: '[data-guide-target="nav-event-info"]',
      title: 'Thông tin chung',
      content: 'Chọn Thông tin chung trên thanh điều hướng để mở thông tin nền của sự kiện.',
      completionPath: eventInfoPath,
      waitingLabel: 'Đang chờ mở Thông tin chung',
    },
    {
      id: 'event-info-fields',
      path: eventInfoPath,
      target: '[data-guide-target="event-info-panel"]',
      title: 'Thông tin nền',
      content: 'Khu vực hiển thị mục tiêu, bối cảnh, thời gian và địa điểm của sự kiện.',
    },
    {
      id: 'event-hierarchy',
      path: eventInfoPath,
      target: '[data-guide-target="event-hierarchy-panel"]',
      title: 'Phân cấp phụ trách',
      content: 'Khu vực hiển thị leader, ban phụ trách và trưởng ban trong sự kiện.',
    },
    canViewEventDashboard && {
      id: 'open-event-dashboard',
      target: '[data-guide-target="nav-event-dashboard"]',
      title: 'Tổng quan',
      content: 'Chọn Tổng quan trên thanh điều hướng để mở trang theo dõi tiến độ và tình trạng công việc.',
      completionPath: eventDashboardPath,
      waitingLabel: 'Đang chờ mở Tổng quan',
    },
    canViewEventDashboard && {
      id: 'event-dashboard-milestones',
      path: eventDashboardPath,
      target: '[data-guide-target="dashboard-milestone-roadmap"]',
      title: 'Lộ trình cột mốc',
      content: 'Khu vực tổng hợp tiến độ từng cột mốc và số việc còn mở.',
    },
    canViewEventDashboard && {
      id: 'event-dashboard-priority-tasks',
      path: eventDashboardPath,
      target: '[data-guide-target="dashboard-priority-tasks"]',
      title: 'Việc ưu tiên',
      content: 'Khu vực liệt kê các công việc quan trọng cần được xử lý trước.',
    },
    canViewEventDashboard && {
      id: 'event-dashboard-burndown-chart',
      path: eventDashboardPath,
      target: '[data-guide-target="dashboard-burndown-chart"]',
      title: 'Burndown Chart',
      content: 'Biểu đồ thể hiện lượng công việc còn lại theo thời gian.',
    },
    canViewEventDashboard && {
      id: 'event-dashboard-cumulative-flow-chart',
      path: eventDashboardPath,
      target: '[data-guide-target="dashboard-cumulative-flow-chart"]',
      title: 'Cumulative Flow',
      content: 'Biểu đồ thể hiện luồng công việc qua các trạng thái.',
    },
    {
      id: 'open-event-milestones',
      target: '[data-guide-target="nav-event-milestones"]',
      title: 'Cột mốc',
      content: 'Chọn Cột mốc trên thanh điều hướng để mở lộ trình chính của sự kiện.',
      completionPath: eventMilestonesPath,
      waitingLabel: 'Đang chờ mở Cột mốc',
    },
    canManageEvent && {
      id: 'event-milestone-create',
      path: eventMilestonesPath,
      target: '[data-guide-target="milestone-create-action"]',
      title: 'Tạo cột mốc',
      content: 'Nút tạo checkpoint mới cho lộ trình sự kiện.',
    },
    {
      id: 'event-milestone-list',
      path: eventMilestonesPath,
      target: '[data-guide-target="milestone-list"]',
      title: 'Danh sách cột mốc',
      content: 'Bảng hiển thị hạn, độ ưu tiên, trạng thái và tiến độ của từng cột mốc.',
    },
    {
      id: 'open-event-tasks',
      target: '[data-guide-target="nav-event-tasks"]',
      title: 'Công việc',
      content: 'Chọn Công việc trên thanh điều hướng để mở board task của sự kiện.',
      completionPath: eventTasksPath,
      waitingLabel: 'Đang chờ mở Công việc',
    },
    canCreateTasks && {
      id: 'event-task-create',
      path: eventTasksPath,
      target: '[data-guide-target="task-create-action"]',
      title: 'Tạo công việc',
      content: 'Nút tạo nhanh một công việc mới trong sự kiện.',
    },
    {
      id: 'event-task-board',
      path: eventTasksPath,
      target: '[data-guide-target="task-board-panel"]',
      title: 'Board công việc',
      content: 'Board nhóm các task theo trạng thái để theo dõi tiến độ xử lý.',
    },
    {
      id: 'event-task-todo-column',
      path: eventTasksPath,
      target: '[data-guide-target="task-column-TODO"]',
      title: 'Cột Cần làm',
      content: 'Cột chứa các công việc chưa bắt đầu.',
    },
    canViewDepartments && {
      id: 'open-event-departments',
      target: '[data-guide-target="nav-event-departments"]',
      title: 'Ban tổ chức',
      content: 'Chọn Ban tổ chức trên thanh điều hướng để mở khu vực ban được phép truy cập.',
      completionPath: eventDepartmentsPath,
      waitingLabel: 'Đang chờ mở Ban tổ chức',
    },
    canManageDepartments && {
      id: 'event-department-create',
      path: eventDepartmentsPath,
      target: '[data-guide-target="department-create-actions"]',
      title: 'Tạo ban',
      content: 'Khu vực tạo một hoặc nhiều ban theo quy mô sự kiện.',
    },
    canManageDepartments && {
      id: 'event-department-list',
      path: eventDepartmentsPath,
      target: '[data-guide-target="department-list"]',
      title: 'Danh sách ban',
      content: 'Danh sách dùng để xem thành viên, gán trưởng ban và chỉnh thông tin ban.',
    },
    canManageMembers && {
      id: 'open-event-members',
      target: '[data-guide-target="nav-event-members"]',
      title: 'Thành viên',
      content: 'Chọn Thành viên trên thanh điều hướng để mở trang mời và quản lý người tham gia.',
      completionPath: eventMembersPath,
      waitingLabel: 'Đang chờ mở Thành viên',
    },
    canManageMembers && {
      id: 'event-member-invite',
      path: eventMembersPath,
      target: '[data-guide-target="member-invite-area"]',
      title: 'Mời thành viên',
      content: 'Khu vực nhập email, chọn vai trò và gửi lời mời tham gia sự kiện.',
    },
    canManageMembers && {
      id: 'event-member-list',
      path: eventMembersPath,
      target: '[data-guide-target="member-list"]',
      title: 'Danh sách thành viên',
      content: 'Danh sách hiển thị vai trò, ban phụ trách và trạng thái kết nối.',
    },
  ].filter(Boolean);

  return {
    id: EVENT_FLOW_GUIDE_ID,
    title: 'Hướng dẫn sự kiện',
    description: 'Luồng hướng dẫn hệ thống cho các khu vực chính trong trang sự kiện.',
    steps: renumberGuideSteps(steps),
  };
};

export const dashboardMetricGuides = {
  totalTasks: {
    title: 'Tổng số công việc',
    content:
      'Hiển thị tổng số công việc đã được tạo trong sự kiện. Chỉ số này giúp kiểm tra mức độ chi tiết của kế hoạch.',
  },
  completedTasks: {
    title: 'Công việc đã hoàn thành',
    content:
      'Hiển thị số công việc đã được chuyển sang trạng thái hoàn thành. Chỉ số này phản ánh khối lượng đã xử lý xong.',
  },
  progressPercentage: {
    title: 'Tỷ lệ hoàn thành',
    content:
      'Hiển thị phần trăm tiến độ dựa trên số công việc đã hoàn thành so với tổng số công việc.',
  },
  overdueTasks: {
    title: 'Công việc trễ hạn',
    content:
      'Hiển thị số công việc đã quá deadline nhưng chưa hoàn thành. Nhóm này cần được kiểm tra và ưu tiên xử lý.',
  },
};
