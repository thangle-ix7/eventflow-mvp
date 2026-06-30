export const EVENT_GUIDE_STORAGE_PREFIX = 'eventflow:guide:seen';

export const EVENT_FLOW_GUIDE_ID = 'event-flow-main-tour';

export const createEventPath = (eventId, suffix = '') => {
  if (!eventId) {
    return '/events';
  }

  return `/events/${eventId}${suffix}`;
};

export const createEventFlowGuide = () => ({
  id: EVENT_FLOW_GUIDE_ID,
  title: 'Quy trình tổ chức sự kiện',
  description: 'Hướng dẫn nhanh các bước chính để tổ chức một sự kiện trong EventFlow.',
  steps: [
    {
      id: 'event-info',
      stepLabel: 'Bước 1/7',
      target: '[data-guide-target="nav-event-info"]',
      title: 'Xem thông tin sự kiện',
      featureContent:
        'Mục Thông tin chung hiển thị dữ liệu nền của sự kiện: tên, mục tiêu, loại sự kiện, quy mô, thời gian, địa điểm và mô tả.',
      content:
        'Người dùng nên kiểm tra mục này trước khi điều phối để chắc chắn cả đội đang hiểu đúng bối cảnh sự kiện. Thông tin chung càng rõ thì các bước lập kế hoạch và giao việc càng ít bị lệch mục tiêu.',
    },
    {
      id: 'event-milestones',
      stepLabel: 'Bước 2/7',
      target: '[data-guide-target="nav-event-milestones"]',
      title: 'Khởi tạo cột mốc',
      featureContent:
        'Mục Cột mốc dùng để quản lý các giai đoạn lớn như chuẩn bị, truyền thông, tổng duyệt, ngày diễn ra và hậu kỳ.',
      content:
        'Người dùng tạo cột mốc để chia kế hoạch thành từng chặng rõ ràng. Các công việc sau đó có thể được gắn với cột mốc tương ứng để đội biết việc nào phục vụ giai đoạn nào và cần hoàn thành trước thời điểm nào.',
    },
    {
      id: 'event-departments',
      stepLabel: 'Bước 3/7',
      target: '[data-guide-target="nav-event-departments"]',
      title: 'Khởi tạo ban tổ chức',
      featureContent:
        'Mục Ban tổ chức là nơi tạo và quản lý các nhóm phụ trách như hậu cần, truyền thông, nội dung, kỹ thuật hoặc nhân sự.',
      content:
        'Người dùng tạo ban tổ chức để phân chia phạm vi trách nhiệm trước khi giao việc. Khi mỗi ban có vai trò rõ ràng, leader dễ theo dõi nhóm nào đang phụ trách phần nào trong sự kiện.',
    },
    {
      id: 'event-members',
      stepLabel: 'Bước 4/7',
      target: '[data-guide-target="nav-event-members"]',
      title: 'Mời thành viên tham gia tổ chức',
      featureContent:
        'Mục Thành viên quản lý danh sách người tham gia sự kiện, email mời, vai trò và trạng thái tham gia.',
      content:
        'Người dùng mời thành viên để đưa đội tổ chức vào cùng một không gian làm việc. Sau khi thành viên tham gia, họ có thể được phân công công việc, cập nhật tiến độ và phối hợp với các ban liên quan.',
    },
    {
      id: 'task-create',
      stepLabel: 'Bước 5/7',
      target: '[data-guide-target="nav-event-tasks"]',
      title: 'Tạo các công việc',
      featureContent:
        'Mục Công việc là nơi tạo danh sách task cần thực hiện cho sự kiện, bao gồm tên việc, deadline, mức ưu tiên, ban phụ trách và mô tả nếu cần.',
      content:
        'Người dùng tạo công việc để biến kế hoạch thành các đầu việc cụ thể có thể theo dõi. Mỗi task nên đủ rõ để thành viên biết cần làm gì, làm trước khi nào và thuộc phần việc nào của sự kiện.',
    },
    {
      id: 'task-assign',
      stepLabel: 'Bước 6/7',
      target: '[data-guide-target="nav-event-tasks"]',
      title: 'Giao công việc cho thành viên',
      featureContent:
        'Trong mục Công việc, mỗi task có thể được gắn ban phụ trách và người phụ trách để xác định ai chịu trách nhiệm xử lý.',
      content:
        'Người dùng giao việc sau khi đã có thành viên và ban tổ chức. Việc phân công rõ người phụ trách giúp leader biết ai đang làm gì, giảm tình trạng bỏ sót task và giúp thành viên tập trung vào phần việc của mình.',
    },
    {
      id: 'task-review',
      stepLabel: 'Bước 7/7',
      target: '[data-guide-target="nav-event-tasks"]',
      title: 'Review công việc',
      featureContent:
        'Mục Công việc cũng hỗ trợ theo dõi trạng thái xử lý như cần làm, đang làm, chờ duyệt, hoàn thành hoặc quá hạn.',
      content:
        'Người dùng review công việc khi task đã được thành viên cập nhật hoặc gửi chờ duyệt. Leader kiểm tra kết quả, phản hồi nếu cần chỉnh sửa, hoặc xác nhận hoàn thành để tiến độ sự kiện được cập nhật chính xác.',
    },
  ],
});

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
