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
    description: 'Hướng dẫn người dùng mở từng mục trên taskbar trước khi đi vào nội dung bên trong.',
    steps: [
      {
        id: 'open-event-info',
        stepLabel: 'Bước 1/21',
        target: '[data-guide-target="nav-event-info"]',
        title: 'Mở Thông tin chung',
        content: 'Chọn Thông tin chung để xem thông tin nền của sự kiện.',
        completionPath: eventInfoPath,
        waitingLabel: 'Đang chờ mở mục Thông tin chung',
      },
      {
        id: 'event-info-fields',
        stepLabel: 'Bước 2/21',
        path: eventInfoPath,
        target: '[data-guide-target="event-info-panel"]',
        title: 'Nắm thông tin nền',
        content: 'Kiểm tra mục tiêu, bối cảnh, thời gian và địa điểm.',
      },
      {
        id: 'event-hierarchy',
        stepLabel: 'Bước 3/21',
        path: eventInfoPath,
        target: '[data-guide-target="event-hierarchy-panel"]',
        title: 'Xem hệ thống phân cấp',
        content: 'Xem leader, department và trưởng ban phụ trách từng phần.',
      },
      {
        id: 'open-event-dashboard',
        stepLabel: 'Bước 4/21',
        target: '[data-guide-target="nav-event-dashboard"]',
        title: 'Mở Tổng quan',
        content: 'Chọn Tổng quan để xem tiến độ và tình trạng công việc.',
        completionPath: eventDashboardPath,
        waitingLabel: 'Đang chờ mở mục Tổng quan',
      },
      {
        id: 'event-dashboard-milestones',
        stepLabel: 'Bước 5/21',
        path: eventDashboardPath,
        target: '[data-guide-target="dashboard-milestone-roadmap"]',
        title: 'Xem cột mốc',
        content: 'Theo dõi tiến độ từng cột mốc và số việc còn mở.',
      },
      {
        id: 'event-dashboard-priority-tasks',
        stepLabel: 'Bước 6/21',
        path: eventDashboardPath,
        target: '[data-guide-target="dashboard-priority-tasks"]',
        title: 'Xem việc ưu tiên',
        content: 'Nhìn nhanh các việc quan trọng cần xử lý trước.',
      },
      {
        id: 'event-dashboard-burndown-chart',
        stepLabel: 'Bước 7/21',
        path: eventDashboardPath,
        target: '[data-guide-target="dashboard-burndown-chart"]',
        title: 'Xem Burndown Chart',
        content: 'Biểu đồ này cho biết lượng việc còn lại theo thời gian.',
      },
      {
        id: 'event-dashboard-cumulative-flow-chart',
        stepLabel: 'Bước 8/21',
        path: eventDashboardPath,
        target: '[data-guide-target="dashboard-cumulative-flow-chart"]',
        title: 'Xem Cumulative Flow',
        content: 'Biểu đồ này cho thấy luồng việc qua từng trạng thái.',
      },
      {
        id: 'open-event-milestones',
        stepLabel: 'Bước 9/21',
        target: '[data-guide-target="nav-event-milestones"]',
        title: 'Mở Cột mốc',
        content: 'Chọn Cột mốc để quản lý lộ trình chính của sự kiện.',
        completionPath: eventMilestonesPath,
        waitingLabel: 'Đang chờ mở mục Cột mốc',
      },
      {
        id: 'event-milestone-create',
        stepLabel: 'Bước 10/21',
        path: eventMilestonesPath,
        target: '[data-guide-target="milestone-create-action"]',
        title: 'Tạo cột mốc',
        content: 'Dùng nút này để thêm checkpoint mới cho lộ trình.',
      },
      {
        id: 'event-milestone-list',
        stepLabel: 'Bước 11/21',
        path: eventMilestonesPath,
        target: '[data-guide-target="milestone-list"]',
        title: 'Theo dõi cột mốc',
        content: 'Bảng này hiển thị hạn, ưu tiên, trạng thái và tiến độ.',
      },
      {
        id: 'open-event-tasks',
        stepLabel: 'Bước 12/21',
        target: '[data-guide-target="nav-event-tasks"]',
        title: 'Mở Công việc',
        content: 'Chọn Công việc để theo dõi toàn bộ task của sự kiện.',
        completionPath: eventTasksPath,
        waitingLabel: 'Đang chờ mở mục Công việc',
      },
      {
        id: 'event-task-create',
        stepLabel: 'Bước 13/21',
        path: eventTasksPath,
        target: '[data-guide-target="task-create-action"]',
        title: 'Tạo task',
        content: 'Dùng nút này để tạo nhanh công việc mới.',
      },
      {
        id: 'event-task-board',
        stepLabel: 'Bước 14/21',
        path: eventTasksPath,
        target: '[data-guide-target="task-board-panel"]',
        title: 'Xem board công việc',
        content: 'Board nhóm task theo trạng thái để dễ theo dõi tiến độ.',
      },
      {
        id: 'event-task-todo-column',
        stepLabel: 'Bước 15/21',
        path: eventTasksPath,
        target: '[data-guide-target="task-column-TODO"]',
        title: 'Cột Cần làm',
        content: 'Các việc chưa bắt đầu sẽ nằm ở cột này.',
      },
      {
        id: 'open-event-departments',
        stepLabel: 'Bước 16/21',
        target: '[data-guide-target="nav-event-departments"]',
        title: 'Mở Ban tổ chức',
        content: 'Chọn Ban tổ chức để quản lý các nhóm phụ trách.',
        completionPath: eventDepartmentsPath,
        waitingLabel: 'Đang chờ mở mục Ban tổ chức',
      },
      {
        id: 'event-department-create',
        stepLabel: 'Bước 17/21',
        path: eventDepartmentsPath,
        target: '[data-guide-target="department-create-actions"]',
        title: 'Tạo ban',
        content: 'Tạo một ban hoặc nhiều ban tùy theo quy mô sự kiện.',
      },
      {
        id: 'event-department-list',
        stepLabel: 'Bước 18/21',
        path: eventDepartmentsPath,
        target: '[data-guide-target="department-list"]',
        title: 'Quản lý ban',
        content: 'Danh sách này dùng để gán trưởng ban và chỉnh thông tin.',
      },
      {
        id: 'open-event-members',
        stepLabel: 'Bước 19/21',
        target: '[data-guide-target="nav-event-members"]',
        title: 'Mở Thành viên',
        content: 'Chọn Thành viên để mời và quản lý người tham gia.',
        completionPath: eventMembersPath,
        waitingLabel: 'Đang chờ mở mục Thành viên',
      },
      {
        id: 'event-member-invite',
        stepLabel: 'Bước 20/21',
        path: eventMembersPath,
        target: '[data-guide-target="member-invite-area"]',
        title: 'Mời thành viên',
        content: 'Nhập email, chọn role rồi gửi lời mời tham gia sự kiện.',
      },
      {
        id: 'event-member-list',
        stepLabel: 'Bước 21/21',
        path: eventMembersPath,
        target: '[data-guide-target="member-list"]',
        title: 'Quản lý thành viên',
        content: 'Danh sách này dùng để xem role, ban và trạng thái kết nối.',
      },
    ],
  };
};

export const dashboardMetricGuides = {
  totalTasks: {
    title: 'Tổng số công việc',
    content:
      'Thông số này cho biết hiện có bao nhiêu công việc đã được tạo trong sự kiện. Người dùng dùng chỉ số này để đánh giá kế hoạch đã được tách thành đủ đầu việc hay chưa; nếu số lượng quá ít, sự kiện có thể vẫn còn nhiều phần chưa được cụ thể hóa.',
  },
  completedTasks: {
    title: 'Công việc đã hoàn thành',
    content:
      'Thông số này cho biết có bao nhiêu công việc đã được chuyển sang trạng thái hoàn thành. Người dùng dùng chỉ số này để biết đội đang thực sự xử lý được bao nhiêu việc, không chỉ tạo việc trên hệ thống.',
  },
  progressPercentage: {
    title: 'Tỷ lệ hoàn thành',
    content:
      'Thông số này thể hiện phần trăm tiến độ dựa trên số công việc đã hoàn thành so với tổng số công việc. Người dùng dùng chỉ số này để nhìn nhanh mức độ sẵn sàng của sự kiện và phát hiện liệu tiến độ tổng thể có đang chậm so với kế hoạch hay không.',
  },
  overdueTasks: {
    title: 'Công việc trễ hạn',
    content:
      'Thông số này cho biết có bao nhiêu công việc đã quá deadline nhưng chưa hoàn thành. Người dùng nên ưu tiên mở danh sách công việc trễ hạn để kiểm tra nguyên nhân, nhắc người phụ trách hoặc điều chỉnh kế hoạch trước khi ảnh hưởng tới các giai đoạn sau.',
  },
};