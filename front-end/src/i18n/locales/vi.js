const vi = {
translation: {
// =====================================================
// COMMON - Từ dùng chung toàn hệ thống
// Ví dụ dùng: t('common.search')
// =====================================================
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
  feedback: 'Phản hồi',
},

// =====================================================
// SIDEBAR - Thanh menu bên trái
// Ví dụ dùng: t('sidebar.dashboard')
// =====================================================
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

// =====================================================
// AUTH - Đăng nhập / Đăng ký
// Ví dụ dùng: t('auth.login')
// =====================================================
auth: {
  login: 'Đăng nhập',
  register: 'Đăng ký',
  email: 'Email',
  password: 'Mật khẩu',
  forgotPassword: 'Quên mật khẩu',
  loginGoogle: 'Đăng nhập với Google',
  loginTelegram: 'Đăng nhập với Telegram',
},

// =====================================================
// EVENT - Sự kiện
// Ví dụ dùng: t('event.create'), t('event.draft')
// =====================================================
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

  // Trạng thái sự kiện
  active: 'Đang diễn ra',
  draft: 'Bản nháp',
  done: 'Hoàn thành',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',

  // Thông tin liên quan sự kiện
  members: 'Thành viên',
  departments: 'Ban tổ chức',
  tasks: 'Công việc',
  myEvents: 'Sự kiện của bạn',
  feedback: 'Phản hồi',

  // Header trang danh sách sự kiện
  workspace: 'Không gian sự kiện',
  workspaceDescription:
    'Quản lý các sự kiện bạn tạo hoặc tham gia, mở không gian làm việc để theo dõi ban tổ chức, công việc và tổng quan.',

  templateLibrary: 'Thư viện mẫu',
  searchPlaceholder: 'Tìm sự kiện theo tên...',

  // Vai trò trong sự kiện
  leader: 'Trưởng nhóm',
  coordinator: 'Bạn điều phối',
  join: 'Bạn tham gia',

  // Card sự kiện
  openWorkspace: 'Mở workspace',
  noLocation: 'Chưa cập nhật địa điểm',

  // Sắp xếp
  upcoming: 'Gần nhất',
  newest: 'Mới tạo',
  oldest: 'Cũ nhất',
  nameAZ: 'Tên A-Z',
  nameZA: 'Tên Z-A',
  sortBy: 'Sắp xếp theo',

  // Phân trang / lọc
  previous: 'Trước',
  next: 'Sau',
  clearFilters: 'Xóa lọc',

  // Loading / Error / Empty
  loadingList: 'Đang tải danh sách sự kiện...',
  errorLoading: 'Không tải được danh sách sự kiện',
  notFound: 'Không tìm thấy sự kiện',
  noEvents: 'Bạn chưa có sự kiện nào',
  noEventsFilter:
    'Không có sự kiện nào khớp với bộ lọc hiện tại. Hãy thử xóa lọc hoặc đổi từ khóa tìm kiếm.',
  noEventsDescription:
    'Tạo sự kiện đầu tiên để bắt đầu quản lý ban tổ chức, công việc và tổng quan trên EventFlow.',

  // Admin / template / discount
  manageTemplates: 'Quản lý mẫu',
  discountCodes: 'Mã giảm giá',

  // AppLayout / sidebar event detail
  currentEvent: 'Sự kiện hiện tại',
  listDescription: 'Danh sách sự kiện',
},

// =====================================================
// STATUS - Map trạng thái từ API sang tiếng Việt
// Ví dụ dùng: t('status.DRAFT')
// =====================================================
status: {
  ACTIVE: 'Đang diễn ra',
  DRAFT: 'Bản nháp',
  DONE: 'Hoàn thành',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
  CANCELED: 'Đã hủy',

  TODO: 'Cần làm',
  IN_PROGRESS: 'Đang làm',
  IN_REVIEW: 'Chờ duyệt',
  OVERDUE: 'Quá hạn',

  PENDING: 'Chờ xử lý',
  UPCOMING: 'Sắp diễn ra',
},

// =====================================================
// ROLE - Map vai trò từ API sang tiếng Việt
// Ví dụ dùng: t('role.LEADER')
// =====================================================
role: {
  OWNER: 'Chủ sự kiện',
  LEADER: 'Trưởng nhóm',
  COORDINATOR: 'Bạn điều phối',
  MEMBER: 'Thành viên',
  PARTICIPANT: 'Bạn tham gia',
  GUEST: 'Khách mời',
  ADMIN: 'Quản trị viên',
  STAFF: 'Nhân sự',
},

// =====================================================
// DEPARTMENT - Ban tổ chức
// Ví dụ dùng: t('department.title')
// =====================================================
department: {
  title: 'Ban tổ chức',
  create: 'Tạo ban',
  departmentName: 'Tên ban',
  leader: 'Trưởng ban',
  memberCount: 'Số thành viên',
  noDepartment: 'Chưa có ban tổ chức',
},

// =====================================================
// MEMBER - Thành viên
// Ví dụ dùng: t('member.invite')
// =====================================================
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

// =====================================================
// TASK - Công việc
// Ví dụ dùng: t('task.create')
// =====================================================
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

// =====================================================
// TERMINOLOGY - Thuật ngữ dùng chung
// Ví dụ dùng: t('terminology.dashboard')
// =====================================================
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

// =====================================================
// TASK STATUS - Trạng thái công việc
// Ví dụ dùng: t('taskStatus.IN_PROGRESS')
// =====================================================
taskStatus: {
  TODO: 'Cần làm',
  IN_PROGRESS: 'Đang làm',
  IN_REVIEW: 'Chờ duyệt',
  DONE: 'Hoàn thành',
},

// =====================================================
// PRIORITY - Mức độ ưu tiên
// Ví dụ dùng: t('priority.HIGH')
// =====================================================
priority: {
  LOW: 'Thấp',
  MEDIUM: 'Trung bình',
  HIGH: 'Cao',
  URGENT: 'Khẩn cấp',
},

// =====================================================
// CALENDAR - Lịch
// Ví dụ dùng: t('calendar.today')
// =====================================================
calendar: {
  title: 'Lịch',
  today: 'Hôm nay',
  month: 'Tháng',
  week: 'Tuần',
  day: 'Ngày',
  schedule: 'Lịch trình',
  upcoming: 'Sắp diễn ra',
},

// =====================================================
// DOCUMENT - Tài liệu
// Ví dụ dùng: t('document.upload')
// =====================================================
document: {
  title: 'Tài liệu',
  upload: 'Tải lên',
  download: 'Tải xuống',
  uploadedBy: 'Người tải lên',
  uploadedAt: 'Ngày tải lên',
  noDocument: 'Chưa có tài liệu',
},

// =====================================================
// REPORT - Báo cáo
// Ví dụ dùng: t('report.export')
// =====================================================
report: {
  title: 'Báo cáo',
  export: 'Xuất báo cáo',
  progress: 'Tiến độ',
  statistic: 'Thống kê',
  overview: 'Tổng quan',
},

// =====================================================
// UTILITY - Tiện ích trong sidebar sự kiện
// Ví dụ dùng: t('utility.eventTools')
// =====================================================
utility: {
  title: 'Tiện ích',
  calendar: 'Lịch',
  documents: 'Tài liệu',
  reports: 'Báo cáo',
  settings: 'Cài đặt',

  eventTools: 'Công cụ sự kiện',
  calendarDescription: 'Lịch vận hành',
  documentsDescription: 'Tệp và liên kết',
  reportsDescription: 'Theo dõi tiến độ',
  settingsDescription: 'Thiết lập sự kiện',
},

// =====================================================
// SETTINGS - Cài đặt
// Ví dụ dùng: t('settings.language')
// =====================================================
settings: {
  title: 'Cài đặt',
  appearance: 'Giao diện',
  language: 'Ngôn ngữ',
  notification: 'Thông báo',
  account: 'Tài khoản',
  security: 'Bảo mật',
},

// =====================================================
// NOTIFICATION - Thông báo
// Ví dụ dùng: t('notification.markAllRead')
// =====================================================
notification: {
  title: 'Thông báo',
  noNotification: 'Không có thông báo',
  markAllRead: 'Đánh dấu đã đọc',
  unreadCount: '{{count}} thông báo chưa đọc',
  unread: 'Chưa đọc',
},

// =====================================================
// USER MENU - Menu tài khoản
// Ví dụ dùng: t('userMenu.account')
// =====================================================
userMenu: {
  account: 'Tài khoản',
  profile: 'Hồ sơ cá nhân',
  logout: 'Đăng xuất',
  feedback: 'Phản hồi',
  notification: 'Thông báo',
  language: 'Ngôn ngữ',
},

// =====================================================
// SEARCH SUGGESTION - Gợi ý tìm kiếm trong AppLayout
// Ví dụ dùng: t('searchSuggestion.eventTemplate')
// =====================================================
searchSuggestion: {
  eventTemplate: 'Mẫu sự kiện',
  viewTemplates: 'Xem các mẫu có sẵn',
  manageTemplates: 'Quản lý mẫu',
  adminArea: 'Khu quản trị',
  feedbackInbox: 'Hộp thư góp ý',
  userFeedback: 'Góp ý người dùng',
  discountCodes: 'Mã giảm giá',
  discountDescription: 'Ưu đãi theo gói',
  profile: 'Hồ sơ cá nhân',
  eventOverview: 'Tổng quan sự kiện',
},

// =====================================================
// ERROR - Lỗi
// Ví dụ dùng: t('error.notFound')
// =====================================================
error: {
  forbidden: 'Bạn không có quyền truy cập',
  notFound: 'Không tìm thấy dữ liệu',
  server: 'Hệ thống đang gặp sự cố',
  network: 'Không có kết nối mạng',
  unexpected: 'Có lỗi xảy ra',
  retry: 'Thử lại',
},

// =====================================================
// FOOTER - Chân trang
// Ví dụ dùng: t('footer.project')
// =====================================================
footer: {
  project: 'Dự án EXE201 của nhóm sinh viên Trường Đại học FPT Hà Nội',
  team: 'Nhóm EventFlow EXE201',
  university: 'Trường Đại học FPT Hà Nội',
  social: 'Kết nối với nhóm',
  copyright: '© 2026 EventFlow EXE201 Team. All rights reserved.',

  projectInfo: 'Thông tin dự án',
  projectGroup: 'Nhóm dự án',
  academicUnit: 'Đơn vị học thuật',
  campusAddress: 'Khu Công nghệ cao Hòa Lạc, Hà Nội',
  supportService: 'Dịch vụ hỗ trợ sự kiện',
  socialDescription:
    'Theo dõi tiến độ dự án, hình ảnh vận hành và thông báo dịch vụ trên các nền tảng xã hội của nhóm.',
},

// =====================================================
// DESCRIPTION - Mô tả dùng chung
// Ví dụ dùng: t('description.progress')
// =====================================================
description: {
  progress: 'Theo dõi tiến độ',
},

// =====================================================
// HEADER - Header trang landing
// Ví dụ dùng: t('header.features')
// =====================================================
header: {
  features: 'Tính năng',
  workflow: 'Quy trình',
  audience: 'Người dùng',
  value: 'Giá trị',
  contact: 'Liên hệ',
  loginBtn: 'Đăng nhập',
  startBtn: 'Bắt đầu',
},

// =====================================================
// LANDING - Trang giới thiệu
// Ví dụ dùng: t('landing.title')
// =====================================================
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

// =====================================================
// DELETE MODAL - Modal xác nhận xóa
// Ví dụ dùng: t('delete.title')
// =====================================================
delete: {
  title: 'Xác nhận xóa',
  message: 'Bạn có chắc chắn muốn xóa?',
  cancel: 'Hủy',
  delete: 'Xóa',
},

// =====================================================
// MODAL - Các nút trong modal
// Ví dụ dùng: t('modal.save')
// =====================================================
modal: {
  cancel: 'Hủy',
  save: 'Lưu',
  create: 'Tạo',
  confirm: 'Xác nhận',
},

// =====================================================
// TEMPLATE - Mẫu sự kiện
// Ví dụ dùng: t('template.create')
// =====================================================
template: {
  title: 'Mẫu',
  create: 'Tạo mẫu',
  instantiate: 'Tạo sự kiện từ mẫu',
  eventCreatedSuccess:
    'Sự kiện sẽ được tạo với {{departmentCount}} phòng ban và {{taskCount}} công việc từ mẫu này.',
  error: 'Lỗi tạo sự kiện',
},

// =====================================================
// MILESTONE - Cột mốc
// Ví dụ dùng: t('milestone.create')
// =====================================================
milestone: {
  create: 'Tạo cột mốc',
  suggestion: 'Tạo gợi ý',
  noNumber: 'Chưa có số người',
  noScale: 'Chưa có quy mô',
  created: 'Tạo',
},

// =====================================================
// PLANNING - Kế hoạch
// Ví dụ dùng: t('planning.title')
// =====================================================
planning: {
  title: 'Kế hoạch',
},

},
};

export default vi;
