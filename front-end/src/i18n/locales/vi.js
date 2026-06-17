const vi = {
  translation: {
    common: {
      search: 'Tìm kiếm',
      save: 'Lưu',
      cancel: 'Hủy',
      create: 'Tạo',
      edit: 'Chỉnh sửa',
      delete: 'Xóa',
      update: 'Cập nhật',
      loading: 'Đang tải',
      settings: 'Cài đặt',
      language: 'Ngôn ngữ',
      logout: 'Đăng xuất',

      back: 'Quay lại',
      view: 'Xem',
      close: 'Đóng',
      retry: 'Thử lại',

      yes: 'Có',
      no: 'Không',

      all: 'Tất cả',

      active: 'Đang hoạt động',
      completed: 'Hoàn thành',

      noData: 'Chưa có dữ liệu',

      confirm: 'Xác nhận',

      send: 'Gửi',

      refresh: 'Làm mới',

      feedback: 'Góp ý',
    },

    sidebar: {
      dashboard: 'Tổng quan',

      events: 'Sự kiện',

      departments: 'Ban tổ chức',

      members: 'Thành viên',

      plannings: 'Kế hoạch',

      tasks: 'Công việc',

      calendar: 'Lịch',

      documents: 'Tài liệu',

      reports: 'Báo cáo',

      settings: 'Cài đặt',
    },

    landing: {
      title: 'Trợ lý tổ chức sự kiện',

      subtitle:
        'Hỗ trợ tổ chức, điều phối và quản lý sự kiện trên nền tảng số.',

      start: 'Bắt đầu',

      login: 'Đăng nhập',
    },

    auth: {
      login: 'Đăng nhập',

      register: 'Đăng ký',

      email: 'Email',

      password: 'Mật khẩu',

      forgotPassword: 'Quên mật khẩu',

      loginGoogle: 'Đăng nhập với Google',

      loginTelegram: 'Đăng nhập với Telegram',
    },

    event: {
  title: 'Sự kiện',

  create: 'Tạo sự kiện',

  edit: 'Chỉnh sửa sự kiện',

  eventName: 'Tên sự kiện',

  description: 'Mô tả',

  location: 'Địa điểm',

  startTime: 'Thời gian bắt đầu',

  endTime: 'Thời gian kết thúc',

  status: 'Trạng thái',

  active: 'Đang diễn ra',

  done: 'Hoàn thành',

  cancelled: 'Đã hủy',

  members: 'Thành viên',

  departments: 'Ban tổ chức',

  tasks: 'Công việc',

  myEvents: 'Sự kiện của bạn',

  // Bổ sung

  workspace: 'Không gian sự kiện',

  workspaceDescription:
    'Quản lý các sự kiện bạn tạo hoặc tham gia, mở workspace để theo dõi ban tổ chức, task và dashboard.',

  templateLibrary: 'Thư viện mẫu',

  searchPlaceholder: 'Tìm sự kiện theo tên...',

  draft: 'Bản nháp',

  leader: 'Trưởng nhóm',

  coordinator: 'Bạn điều phối',

  openWorkspace: 'Mở workspace',

  upcoming: 'Gần nhất',

  newest: 'Mới tạo',

  nameAZ: 'Tên A-Z',

  previous: 'Trước',

  next: 'Sau',

  clearFilters: 'Xóa lọc',

  loadingList: 'Đang tải danh sách sự kiện...',

  errorLoading: 'Không tải được danh sách sự kiện',

  notFound: 'Không tìm thấy sự kiện',

  noEvents: 'Bạn chưa có sự kiện nào',

  noEventsFilter: 'Không có sự kiện nào khớp với bộ lọc hiện tại. Hãy thử xóa lọc hoặc đổi từ khóa tìm kiếm.',

  noLocation: 'Chưa cập nhật địa điểm',

  join: 'Bạn tham gia',

  manageTemplates: 'Quản lý Mẫu',

  noEventsDescription: 'Tạo sự kiện đầu tiên để bắt đầu quản lý ban tổ chức, task và dashboard trên EventFlow.',

  sortBy: 'Sắp xếp theo',

  feedback: 'Phản hồi',
},

    department: {
      title: 'Ban tổ chức',

      create: 'Tạo ban',

      departmentName: 'Tên ban',

      leader: 'Trưởng ban',

      memberCount: 'Số thành viên',

      noDepartment: 'Chưa có ban tổ chức',
    },

    member: {
      title: 'Thành viên',

      invite: 'Mời thành viên',

      memberList: 'Danh sách thành viên',

      email: 'Email',

      role: 'Vai trò',

      department: 'Ban',

      telegram: 'Telegram',

      joinedAt: 'Ngày tham gia',

      accountCreated: 'Ngày tạo tài khoản',

      connected: 'Đã kết nối',

      notConnected: 'Chưa kết nối',
    },

    task: {
      title: 'Danh sách công việc',

      create: 'Tạo công việc',

      update: 'Cập nhật công việc',

      review: 'Duyệt công việc',

      search: 'Tìm công việc',

      searchPlaceholder: 'Tìm theo tên công việc...',

      filter: 'Bộ lọc công việc',

      status: 'Trạng thái',

      priority: 'Mức độ ưu tiên',

      assignee: 'Người phụ trách',

      deadline: 'Hạn chót',

      progress: 'Tiến độ',

      attachment: 'Tệp đính kèm',

      report: 'Báo cáo',

      reviewHistory: 'Lịch sử review',
    },

    terminology: {
      dashboard: 'Tổng quan',
      planning: 'Kế hoạch',
      milestone: 'Cột mốc',
      task: 'Công việc',
      subtask: 'Việc con',
      department: 'Ban',
      member: 'Thành viên',
      template: 'Mẫu',
      deadline: 'Hạn',
      report: 'Báo cáo',
      workload: 'Khối lượng việc',
      preview: 'Xem trước',
      suggestion: 'Gợi ý',
    },

    taskStatus: {
      TODO: 'Cần làm',

      IN_PROGRESS: 'Đang làm',

      IN_REVIEW: 'Chờ duyệt',

      DONE: 'Hoàn thành',
    },

    priority: {
      LOW: 'Thấp',

      MEDIUM: 'Trung bình',

      HIGH: 'Cao',

      URGENT: 'Khẩn cấp',
    },

    calendar: {
      title: 'Lịch',

      today: 'Hôm nay',

      month: 'Tháng',

      week: 'Tuần',

      day: 'Ngày',

      schedule: 'Lịch trình',

      upcoming: 'Sắp diễn ra',
    },

    document: {
      title: 'Tài liệu',

      upload: 'Tải lên',

      download: 'Tải xuống',

      uploadedBy: 'Người tải lên',

      uploadedAt: 'Ngày tải lên',

      noDocument: 'Chưa có tài liệu',
    },

    report: {
      title: 'Báo cáo',

      export: 'Xuất báo cáo',

      progress: 'Tiến độ',

      statistic: 'Thống kê',

      overview: 'Tổng quan',
    },

    utility: {
      title: 'Tiện ích',

      calendar: 'Lịch',

      documents: 'Tài liệu',

      reports: 'Báo cáo',

      settings: 'Cài đặt',
    },

    settings: {
      title: 'Cài đặt',

      appearance: 'Giao diện',

      language: 'Ngôn ngữ',

      notification: 'Thông báo',

      account: 'Tài khoản',

      security: 'Bảo mật',
    },

    notification: {
      title: 'Thông báo',

      noNotification: 'Không có thông báo',

      markAllRead: 'Đánh dấu đã đọc',
    },

    error: {
      forbidden: 'Bạn không có quyền truy cập',

      notFound: 'Không tìm thấy dữ liệu',

      server: 'Hệ thống đang gặp sự cố',

      network: 'Không có kết nối mạng',

      unexpected: 'Có lỗi xảy ra',

      retry: 'Thử lại',
    },

    footer: {
      project: 'Dự án EXE201 của nhóm sinh viên Trường Đại học FPT Hà Nội',

      team: 'Nhóm EventFlow EXE201',

      university: 'Trường Đại học FPT Hà Nội',

      social: 'Kết nối với nhóm',

      copyright:
        '© 2026 EventFlow EXE201 Team. All rights reserved.',
    },

    description: {
      progress: 'Theo dõi tiến độ',
    },

    header: {
      features: 'Tính năng',
      workflow: 'Quy trình',
      audience: 'Người dùng',
      value: 'Giá trị',
      contact: 'Liên hệ',
      loginBtn: 'Đăng nhập',
      startBtn: 'Bắt đầu',
    },

    landing: {
      title: 'Trợ lý tổ chức sự kiện',
      subtitle: 'Hỗ trợ tổ chức, điều phối và quản lý sự kiện trên nền tảng số.',
      start: 'Bắt đầu',
      login: 'Đăng nhập',
      features: 'Tính năng',
      workflow: 'Quy trình',
      audience: 'Người dùng',
      value: 'Giá trị',
    },

    delete: {
      title: 'Xác nhận xóa',
      message: 'Bạn có chắc chắn muốn xóa?',
      cancel: 'Hủy',
      delete: 'Xóa',
    },

    modal: {
      cancel: 'Hủy',
      save: 'Lưu',
      create: 'Tạo',
      confirm: 'Xác nhận',
    },

    template: {
      title: 'Mẫu',
      create: 'Tạo mẫu',
      instantiate: 'Tạo sự kiện từ template',
      eventCreatedSuccess: 'Sự kiện sẽ được tạo với {departmentCount} phòng ban và {taskCount} task từ template này.',
      error: 'Lỗi tạo sự kiện',
    },

    milestone: {
      create: 'Tạo cột mốc',
      suggestion: 'Tạo gợi ý',
      noNumber: 'Chưa có số người',
      noScale: 'Chưa có quy mô',
      created: 'Tạo',
    },

    planning: {
      title: 'Kế hoạch',
    },
    
  },
};

export default vi;
