export const EVENT_GUIDE_STORAGE_PREFIX = 'eventflow:guide:seen';

export const EVENT_FLOW_GUIDE_ID = 'event-flow-main-tour';

export const createEventPath = (eventId, suffix = '') => {
  if (!eventId) {
    return '/events';
  }

  return `/events/${eventId}${suffix}`;
};

export const createEventFlowGuide = (eventId) => {
  const eventInfoPath = createEventPath(eventId);
  const eventDashboardPath = createEventPath(eventId, '/dashboard');
  const eventMilestonesPath = createEventPath(eventId, '/milestones');
  const eventTasksPath = createEventPath(eventId, '/tasks');
  const eventDepartmentsPath = createEventPath(eventId, '/departments');
  const eventMembersPath = createEventPath(eventId, '/members');

  return {
    id: EVENT_FLOW_GUIDE_ID,
    title: 'Hướng dẫn sự kiện',
    description: 'Luồng hướng dẫn hệ thống cho các khu vực chính trong trang sự kiện.',
    steps: [
      {
        id: 'open-event-info',
        stepLabel: 'Bước 1/21',
        target: '[data-guide-target="nav-event-info"]',
        title: 'Thông tin chung',
        content: 'Mở trang thông tin nền của sự kiện.',
        completionPath: eventInfoPath,
        actionLabel: 'Mở Thông tin chung',
      },
      {
        id: 'event-info-fields',
        stepLabel: 'Bước 2/21',
        path: eventInfoPath,
        target: '[data-guide-target="event-info-panel"]',
        title: 'Thông tin nền',
        content: 'Khu vực hiển thị mục tiêu, bối cảnh, thời gian và địa điểm của sự kiện.',
      },
      {
        id: 'event-hierarchy',
        stepLabel: 'Bước 3/21',
        path: eventInfoPath,
        target: '[data-guide-target="event-hierarchy-panel"]',
        title: 'Phân cấp phụ trách',
        content: 'Khu vực hiển thị leader, ban phụ trách và trưởng ban trong sự kiện.',
      },
      {
        id: 'open-event-dashboard',
        stepLabel: 'Bước 4/21',
        target: '[data-guide-target="nav-event-dashboard"]',
        title: 'Tổng quan',
        content: 'Mở trang theo dõi tiến độ và tình trạng công việc.',
        completionPath: eventDashboardPath,
        actionLabel: 'Mở Tổng quan',
      },
      {
        id: 'event-dashboard-milestones',
        stepLabel: 'Bước 5/21',
        path: eventDashboardPath,
        target: '[data-guide-target="dashboard-milestone-roadmap"]',
        title: 'Lộ trình cột mốc',
        content: 'Khu vực tổng hợp tiến độ từng cột mốc và số việc còn mở.',
      },
      {
        id: 'event-dashboard-priority-tasks',
        stepLabel: 'Bước 6/21',
        path: eventDashboardPath,
        target: '[data-guide-target="dashboard-priority-tasks"]',
        title: 'Việc ưu tiên',
        content: 'Khu vực liệt kê các công việc quan trọng cần được xử lý trước.',
      },
      {
        id: 'event-dashboard-burndown-chart',
        stepLabel: 'Bước 7/21',
        path: eventDashboardPath,
        target: '[data-guide-target="dashboard-burndown-chart"]',
        title: 'Burndown Chart',
        content: 'Biểu đồ thể hiện lượng công việc còn lại theo thời gian.',
      },
      {
        id: 'event-dashboard-cumulative-flow-chart',
        stepLabel: 'Bước 8/21',
        path: eventDashboardPath,
        target: '[data-guide-target="dashboard-cumulative-flow-chart"]',
        title: 'Cumulative Flow',
        content: 'Biểu đồ thể hiện luồng công việc qua các trạng thái.',
      },
      {
        id: 'open-event-milestones',
        stepLabel: 'Bước 9/21',
        target: '[data-guide-target="nav-event-milestones"]',
        title: 'Cột mốc',
        content: 'Mở trang quản lý lộ trình chính của sự kiện.',
        completionPath: eventMilestonesPath,
        actionLabel: 'Mở Cột mốc',
      },
      {
        id: 'event-milestone-create',
        stepLabel: 'Bước 10/21',
        path: eventMilestonesPath,
        target: '[data-guide-target="milestone-create-action"]',
        title: 'Tạo cột mốc',
        content: 'Nút tạo checkpoint mới cho lộ trình sự kiện.',
      },
      {
        id: 'event-milestone-list',
        stepLabel: 'Bước 11/21',
        path: eventMilestonesPath,
        target: '[data-guide-target="milestone-list"]',
        title: 'Danh sách cột mốc',
        content: 'Bảng hiển thị hạn, độ ưu tiên, trạng thái và tiến độ của từng cột mốc.',
      },
      {
        id: 'open-event-tasks',
        stepLabel: 'Bước 12/21',
        target: '[data-guide-target="nav-event-tasks"]',
        title: 'Công việc',
        content: 'Mở trang theo dõi toàn bộ task của sự kiện.',
        completionPath: eventTasksPath,
        actionLabel: 'Mở Công việc',
      },
      {
        id: 'event-task-create',
        stepLabel: 'Bước 13/21',
        path: eventTasksPath,
        target: '[data-guide-target="task-create-action"]',
        title: 'Tạo công việc',
        content: 'Nút tạo nhanh một công việc mới trong sự kiện.',
      },
      {
        id: 'event-task-board',
        stepLabel: 'Bước 14/21',
        path: eventTasksPath,
        target: '[data-guide-target="task-board-panel"]',
        title: 'Board công việc',
        content: 'Board nhóm các task theo trạng thái để theo dõi tiến độ xử lý.',
      },
      {
        id: 'event-task-todo-column',
        stepLabel: 'Bước 15/21',
        path: eventTasksPath,
        target: '[data-guide-target="task-column-TODO"]',
        title: 'Cột Cần làm',
        content: 'Cột chứa các công việc chưa bắt đầu.',
      },
      {
        id: 'open-event-departments',
        stepLabel: 'Bước 16/21',
        target: '[data-guide-target="nav-event-departments"]',
        title: 'Ban tổ chức',
        content: 'Mở trang quản lý các nhóm phụ trách trong sự kiện.',
        completionPath: eventDepartmentsPath,
        actionLabel: 'Mở Ban tổ chức',
      },
      {
        id: 'event-department-create',
        stepLabel: 'Bước 17/21',
        path: eventDepartmentsPath,
        target: '[data-guide-target="department-create-actions"]',
        title: 'Tạo ban',
        content: 'Khu vực tạo một hoặc nhiều ban theo quy mô sự kiện.',
      },
      {
        id: 'event-department-list',
        stepLabel: 'Bước 18/21',
        path: eventDepartmentsPath,
        target: '[data-guide-target="department-list"]',
        title: 'Danh sách ban',
        content: 'Danh sách dùng để xem thành viên, gán trưởng ban và chỉnh thông tin ban.',
      },
      {
        id: 'open-event-members',
        stepLabel: 'Bước 19/21',
        target: '[data-guide-target="nav-event-members"]',
        title: 'Thành viên',
        content: 'Mở trang mời và quản lý người tham gia sự kiện.',
        completionPath: eventMembersPath,
        actionLabel: 'Mở Thành viên',
      },
      {
        id: 'event-member-invite',
        stepLabel: 'Bước 20/21',
        path: eventMembersPath,
        target: '[data-guide-target="member-invite-area"]',
        title: 'Mời thành viên',
        content: 'Khu vực nhập email, chọn vai trò và gửi lời mời tham gia sự kiện.',
      },
      {
        id: 'event-member-list',
        stepLabel: 'Bước 21/21',
        path: eventMembersPath,
        target: '[data-guide-target="member-list"]',
        title: 'Danh sách thành viên',
        content: 'Danh sách hiển thị vai trò, ban phụ trách và trạng thái kết nối.',
      },
    ],
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
