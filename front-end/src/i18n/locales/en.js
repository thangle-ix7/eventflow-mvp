const en = {
translation: {
// =====================================================
// COMMON - Shared words used across the system
// Example: t('common.search')
// =====================================================
common: {
search: 'Search',
save: 'Save',
cancel: 'Cancel',
create: 'Create',
edit: 'Edit',
delete: 'Delete',
update: 'Update',
loading: 'Loading',
settings: 'Settings',
language: 'Language',
logout: 'Logout',

  back: 'Back',
  view: 'View',
  close: 'Close',
  retry: 'Retry',

  yes: 'Yes',
  no: 'No',
  all: 'All',

  active: 'Active',
  completed: 'Completed',

  noData: 'No data available',
  confirm: 'Confirm',
  send: 'Send',
  refresh: 'Refresh',
  feedback: 'Feedback',
},

// =====================================================
// SIDEBAR - Left sidebar navigation
// Example: t('sidebar.dashboard')
// =====================================================
sidebar: {
  dashboard: 'Dashboard',
  events: 'Events',
  departments: 'Departments',
  members: 'Members',
  plannings: 'Plans',
  tasks: 'Tasks',
  calendar: 'Calendar',
  documents: 'Documents',
  reports: 'Reports',
  settings: 'Settings',
},

// =====================================================
// AUTH - Login / Register
// Example: t('auth.login')
// =====================================================
auth: {
  login: 'Login',
  register: 'Register',
  email: 'Email',
  password: 'Password',
  forgotPassword: 'Forgot password',
  loginGoogle: 'Continue with Google',
  loginTelegram: 'Continue with Telegram',
},

// =====================================================
// EVENT - Event pages
// Example: t('event.create'), t('event.draft')
// =====================================================
event: {
  title: 'Events',
  create: 'Create Event',
  edit: 'Edit Event',
  eventName: 'Event Name',
  description: 'Description',
  location: 'Location',
  startTime: 'Start Time',
  endTime: 'End Time',
  status: 'Status',

  // Event status
  active: 'Ongoing',
  draft: 'Draft',
  done: 'Completed',
  completed: 'Completed',
  cancelled: 'Cancelled',

  // Event-related information
  members: 'Members',
  departments: 'Departments',
  tasks: 'Tasks',
  myEvents: 'Your Events',
  feedback: 'Feedback',

  // Event list page header
  workspace: 'Event Workspace',
  workspaceDescription:
    'Manage the events you created or joined, open a workspace to track departments, tasks and dashboards.',

  templateLibrary: 'Template Library',
  searchPlaceholder: 'Search events by name...',

  // Event roles
  leader: 'Team Leader',
  coordinator: 'You are the coordinator',
  join: 'You are a member',

  // Event card/button
  openWorkspace: 'Open Workspace',
  noLocation: 'Location not updated',

  // Sorting
  upcoming: 'Upcoming',
  newest: 'Newest',
  oldest: 'Oldest',
  nameAZ: 'Name A-Z',
  nameZA: 'Name Z-A',
  sortBy: 'Sort By',

  // Pagination / filters
  previous: 'Previous',
  next: 'Next',
  clearFilters: 'Clear Filters',

  // Loading / error / empty state
  loadingList: 'Loading event list...',
  errorLoading: 'Cannot load event list',
  notFound: 'No events found',
  noEvents: 'You have no events yet',
  noEventsFilter:
    'No events match the current filter. Try clearing the filter or changing your search keyword.',
  noEventsDescription:
    'Create your first event to start managing departments, tasks and dashboards on EventFlow.',

  // Admin / template / discount
  manageTemplates: 'Manage Templates',
  discountCodes: 'Discount codes',

  // AppLayout / event detail sidebar
  currentEvent: 'Current event',
  listDescription: 'Event list',
},

// =====================================================
// STATUS - Map API status values to English labels
// Example: t('status.DRAFT')
// =====================================================
status: {
  ACTIVE: 'Ongoing',
  DRAFT: 'Draft',
  DONE: 'Completed',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  CANCELED: 'Canceled',

  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review',
  OVERDUE: 'Overdue',

  PENDING: 'Pending',
  UPCOMING: 'Upcoming',
},

// =====================================================
// ROLE - Map API role values to English labels
// Example: t('role.LEADER')
// =====================================================
role: {
  OWNER: 'Event owner',
  LEADER: 'Team leader',
  COORDINATOR: 'Coordinator',
  MEMBER: 'Member',
  PARTICIPANT: 'Participant',
  GUEST: 'Guest',
  ADMIN: 'Administrator',
  STAFF: 'Staff',
},


// =====================================================
// DEPARTMENT - Departments
// Example: t('department.title')
// =====================================================
department: {
  title: 'Departments',
  create: 'Create Department',
  departmentName: 'Department Name',
  leader: 'Leader',
  memberCount: 'Members',
  noDepartment: 'No departments available',
},

// =====================================================
// MEMBER - Members
// Example: t('member.invite')
// =====================================================
member: {
  title: 'Members',
  invite: 'Invite Member',
  memberList: 'Member List',
  email: 'Email',
  role: 'Role',
  department: 'Department',
  telegram: 'Telegram',
  joinedAt: 'Joined At',
  accountCreated: 'Account Created',
  connected: 'Connected',
  notConnected: 'Not Connected',
},

// =====================================================
// TASK - Tasks
// Example: t('task.create')
// =====================================================
task: {
  title: 'Task List',
  create: 'Create Task',
  update: 'Update Task',
  review: 'Task Review',
  search: 'Search Task',
  searchPlaceholder: 'Search by task name...',
  filter: 'Task Filters',
  status: 'Status',
  priority: 'Priority',
  assignee: 'Assignee',
  deadline: 'Deadline',
  progress: 'Progress',
  attachment: 'Attachments',
  report: 'Reports',
  reviewHistory: 'Review History',
},

// =====================================================
// TERMINOLOGY - Shared domain terms
// Example: t('terminology.dashboard')
// =====================================================
terminology: {
  dashboard: 'Dashboard',
  planning: 'Plan',
  milestone: 'Milestone',
  task: 'Task',
  subtask: 'Subtask',
  department: 'Department',
  member: 'Member',
  template: 'Template',
  deadline: 'Deadline',
  report: 'Report',
  workload: 'Workload',
  preview: 'Preview',
  suggestion: 'Suggestion',
},

// =====================================================
// TASK STATUS - Task status labels
// Example: t('taskStatus.IN_PROGRESS')
// =====================================================
taskStatus: {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review',
  DONE: 'Done',
},

// =====================================================
// PRIORITY - Task priority labels
// Example: t('priority.HIGH')
// =====================================================
priority: {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Urgent',
},

// =====================================================
// CALENDAR - Calendar
// Example: t('calendar.today')
// =====================================================
calendar: {
  title: 'Calendar',
  today: 'Today',
  month: 'Month',
  week: 'Week',
  day: 'Day',
  schedule: 'Schedule',
  upcoming: 'Upcoming',
},

// =====================================================
// DOCUMENT - Documents
// Example: t('document.upload')
// =====================================================
document: {
  title: 'Documents',
  upload: 'Upload',
  download: 'Download',
  uploadedBy: 'Uploaded By',
  uploadedAt: 'Uploaded At',
  noDocument: 'No documents available',
},

// =====================================================
// REPORT - Reports
// Example: t('report.export')
// =====================================================
report: {
  title: 'Reports',
  export: 'Export Report',
  progress: 'Progress',
  statistic: 'Statistics',
  overview: 'Overview',
},

// =====================================================
// UTILITY - Event sidebar utilities
// Example: t('utility.eventTools')
// =====================================================
utility: {
  title: 'Utilities',
  calendar: 'Calendar',
  documents: 'Documents',
  reports: 'Reports',
  settings: 'Settings',

  eventTools: 'Event tools',
  calendarDescription: 'Operation calendar',
  documentsDescription: 'Files and links',
  reportsDescription: 'Track progress',
  settingsDescription: 'Event settings',
},

// =====================================================
// SETTINGS - Settings
// Example: t('settings.language')
// =====================================================
settings: {
  title: 'Settings',
  appearance: 'Appearance',
  language: 'Language',
  notification: 'Notifications',
  account: 'Account',
  security: 'Security',
},

// =====================================================
// NOTIFICATION - Notifications
// Example: t('notification.markAllRead')
// =====================================================
notification: {
  title: 'Notifications',
  noNotification: 'No notifications',
  markAllRead: 'Mark all as read',
  unreadCount: '{{count}} unread notification',
  unreadCount_plural: '{{count}} unread notifications',
  unread: 'Unread',
},

// =====================================================
// USER MENU - Account menu
// Example: t('userMenu.account')
// =====================================================
userMenu: {
  account: 'Account',
  profile: 'Profile',
  logout: 'Logout',
  feedback: 'Feedback',
  notification: 'Notifications',
  language: 'Language',
},

// =====================================================
// SEARCH SUGGESTION - Suggestions in AppLayout search
// Example: t('searchSuggestion.eventTemplate')
// =====================================================
searchSuggestion: {
  eventTemplate: 'Event templates',
  viewTemplates: 'View available templates',
  manageTemplates: 'Manage templates',
  adminArea: 'Admin area',
  feedbackInbox: 'Feedback inbox',
  userFeedback: 'User feedback',
  discountCodes: 'Discount codes',
  discountDescription: 'Package promotions',
  profile: 'Profile',
  eventOverview: 'Event overview',
},

// =====================================================
// ERROR - System errors
// Example: t('error.notFound')
// =====================================================
error: {
  forbidden: 'Access denied',
  notFound: 'Data not found',
  server: 'System error',
  network: 'No internet connection',
  unexpected: 'Something went wrong',
  retry: 'Try again',
},

// =====================================================
// FOOTER - Footer content
// Example: t('footer.project')
// =====================================================
footer: {
  project: 'EXE201 project developed by FPT University Hanoi students',
  team: 'EventFlow EXE201 Team',
  university: 'FPT University Hanoi',
  social: 'Connect with the team',
  copyright: '© 2026 EventFlow EXE201 Team. All rights reserved.',

  projectInfo: 'Project information',
  projectGroup: 'Project team',
  academicUnit: 'Academic unit',
  campusAddress: 'Hoa Lac Hi-Tech Park, Hanoi',
  supportService: 'Event support service',
  socialDescription:
    'Follow project progress, operation photos, and service updates on the team social platforms.',
},

// =====================================================
// DESCRIPTION - Shared descriptions
// Example: t('description.progress')
// =====================================================
description: {
  progress: 'Track work and event progress',
},

// =====================================================
// HEADER - Landing page header
// Example: t('header.features')
// =====================================================
header: {
  features: 'Features',
  workflow: 'Workflow',
  audience: 'Users',
  value: 'Value',
  contact: 'Contact',
  loginBtn: 'Login',
  startBtn: 'Get Started',
},

// =====================================================
// LANDING - Landing page
// Example: t('landing.title')
// =====================================================
landing: {
  title: 'AI Event Planning',
  subtitle: 'Support organizing, coordinating and managing events on a digital platform.',
  start: 'Get Started',
  login: 'Login',
  features: 'Features',
  workflow: 'Workflow',
  audience: 'Users',
  value: 'Value',
},

// =====================================================
// DELETE MODAL - Delete confirmation modal
// Example: t('delete.title')
// =====================================================
delete: {
  title: 'Confirm Delete',
  message: 'Are you sure you want to delete?',
  cancel: 'Cancel',
  delete: 'Delete',
},

// =====================================================
// MODAL - Modal buttons
// Example: t('modal.save')
// =====================================================
modal: {
  cancel: 'Cancel',
  save: 'Save',
  create: 'Create',
  confirm: 'Confirm',
},

// =====================================================
// TEMPLATE - Event templates
// Example: t('template.create')
// =====================================================
template: {
  title: 'Templates',
  create: 'Create Template',
  instantiate: 'Create Event from Template',
  eventCreatedSuccess:
    'Event created with {{departmentCount}} departments and {{taskCount}} tasks from this template.',
  error: 'Error creating event',
},

// =====================================================
// MILESTONE - Planning milestones
// Example: t('milestone.create')
// =====================================================
milestone: {
  create: 'Create Milestone',
  suggestion: 'Create Suggestion',
  noNumber: 'No people',
  noScale: 'No scale',
  created: 'Created',
},

// =====================================================
// PLANNING - Planning
// Example: t('planning.title')
// =====================================================
planning: {
  title: 'Planning',
},

},
};

export default en;
