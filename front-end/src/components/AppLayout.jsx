import TelegramOnboarding from './TelegramOnboarding';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import userApi from '../api/userApi';
import { getDepartmentHomePath, getEventPermissions } from '../utils/permissionUtils';
import {
  BarChart3,
  Bell,
  CalendarDays,
  ClipboardList,
  FileText,
  LogOut,
  Menu,
  Search,
  Settings,
  TrendingUp,
  Users,
  UserRound,
  Workflow,
} from 'lucide-react';

const AppLayoutContext = createContext(false);

const AppLayout = ({
  children,
  ...props
}) => {
  const hasParentLayout = useContext(AppLayoutContext);

  if (hasParentLayout) {
    return <>{children}</>;
  }

  return <AppLayoutFrame {...props}>{children}</AppLayoutFrame>;
};

const AppLayoutFrame = ({
  user,
  selectedEvent,
  events = [],
  onLogout,
  showTelegramOnboarding = true,
  children,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [globalSearch, setGlobalSearch] = useState('');
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [sidebarState, setSidebarState] = useState({ eventId: null, open: true });
  const notificationRef = useRef(null);
  const notificationCountKey = ['pendingNotificationCount', user.userId];
  const notificationListKey = ['notifications', user.userId];
  const notificationCountQuery = useQuery({
    queryKey: notificationCountKey,
    queryFn: () => userApi.getPendingNotificationCount(user.userId),
    enabled: Boolean(user?.userId),
    refetchInterval: 30000,
    retry: false,
  });
  const notificationListQuery = useQuery({
    queryKey: notificationListKey,
    queryFn: () => userApi.getNotifications(user.userId),
    enabled: Boolean(user?.userId && notificationOpen),
    retry: false,
  });
  const markNotificationReadMutation = useMutation({
    mutationFn: userApi.markNotificationAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationCountKey });
      queryClient.invalidateQueries({ queryKey: notificationListKey });
    },
  });
  const markAllNotificationsReadMutation = useMutation({
    mutationFn: userApi.markAllNotificationsAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationCountKey });
      queryClient.invalidateQueries({ queryKey: notificationListKey });
    },
  });
  const pendingNotificationCount = notificationCountQuery.data?.pendingCount || 0;
  const selectedEventId = selectedEvent?.id ? String(selectedEvent.id) : null;
  const sidebarOpen = Boolean(selectedEventId) && (
    sidebarState.eventId === selectedEventId ? sidebarState.open : true
  );
  const permissions = getEventPermissions(selectedEvent);
  const departmentHomePath = getDepartmentHomePath(selectedEvent);

  const eventNav = selectedEvent?.id
    ? [
      { to: `/events/${selectedEvent.id}`, label: 'Tổng quan', icon: Workflow },
      ...(permissions.canViewEventDashboard ? [{ to: `/events/${selectedEvent.id}/dashboard`, label: 'Dashboard', icon: BarChart3 }] : []),
      { to: `/events/${selectedEvent.id}/tasks`, label: 'Công việc', icon: ClipboardList },
      ...(departmentHomePath ? [{ to: departmentHomePath, label: 'Ban tổ chức', icon: Users }] : []),
      { to: `/events/${selectedEvent.id}/members`, label: 'Thành viên', icon: UserRound },
    ]
    : [];
  const secondaryNav = selectedEvent?.id ? [
    { to: `/events/${selectedEvent.id}/calendar`, label: 'Lịch', icon: CalendarDays },
    { to: `/events/${selectedEvent.id}/documents`, label: 'Tài liệu', icon: FileText },
    { to: `/events/${selectedEvent.id}/reports`, label: 'Báo cáo', icon: TrendingUp },
    { to: `/events/${selectedEvent.id}/settings`, label: permissions.canManageEvent ? 'Cài đặt' : 'Thông tin', icon: Settings },
  ] : [
    { to: '/', label: 'Sự kiện của bạn', icon: CalendarDays },
  ];
  const searchSuggestionBase = [
    { label: 'Sự kiện của bạn', description: '', to: '/' },
    { label: 'Tạo sự kiện', description: '', to: '/events/new' },
    { label: 'Templates', description: 'Xem templates sẵn có', to: '/events/templates' },
    ...(user?.systemRole === 'ADMIN' ? [{ label: 'Quản lý Templates', description: 'Admin panel', to: '/admin/templates' }] : []),
    { label: 'Hồ sơ cá nhân', description: '', to: '/profile' },
    ...events.map((event) => ({
      label: event.name,
      description: '',
      to: `/events/${event.id}`,
    })),
  ];

  if (selectedEvent?.id) {
    searchSuggestionBase.push(
      { label: 'Công việc', description: '', to: `/events/${selectedEvent.id}/tasks` },
      { label: 'Thành viên', description: '', to: `/events/${selectedEvent.id}/members` },
      { label: 'Lịch', description: '', to: `/events/${selectedEvent.id}/calendar` },
      { label: 'Tài liệu', description: '', to: `/events/${selectedEvent.id}/documents` },
      { label: 'Báo cáo', description: '', to: `/events/${selectedEvent.id}/reports` },
      { label: permissions.canManageEvent ? 'Cài đặt' : 'Thông tin', description: '', to: `/events/${selectedEvent.id}/settings` },
    );

    if (departmentHomePath) {
      searchSuggestionBase.push({ label: 'Ban tổ chức', description: '', to: departmentHomePath });
    }

    if (permissions.canViewEventDashboard) {
      searchSuggestionBase.push({ label: 'Dashboard sự kiện', description: '', to: `/events/${selectedEvent.id}/dashboard` });
    }
  }

  const searchNeedle = globalSearch.trim().toLowerCase();
  const searchSuggestions = searchNeedle
    ? searchSuggestionBase
      .filter((item) => `${item.label} ${item.description}`.toLowerCase().includes(searchNeedle))
      .slice(0, 8)
    : searchSuggestionBase.slice(0, 6);

  const handleGlobalSearchSubmit = (event) => {
    event.preventDefault();
    const first = searchSuggestions[0];
    if (first) {
      setGlobalSearch('');
      navigate(first.to);
    }
  };

  const isEventNavActive = (item) => {
    if (!selectedEvent?.id) return false;
    const eventRoot = `/events/${selectedEvent.id}`;
    if (item.to === eventRoot) {
      return location.pathname === eventRoot;
    }
    return location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
  };

  const closeSidebarOnMobile = () => {
    if (window.matchMedia('(max-width: 1023px)').matches) {
      setSidebarState({ eventId: selectedEventId, open: false });
    }
  };

  useEffect(() => {
    if (!notificationOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setNotificationOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setNotificationOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [notificationOpen]);

  const renderEventNavigation = () => (
    <div className="space-y-5 p-4">
      <nav className="space-y-1" aria-label="Điều hướng sự kiện">
        {eventNav.map((item) => {
          const Icon = item.icon;
          const active = isEventNavActive(item);

          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={closeSidebarOnMobile}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
                active
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950'
              }`}
            >
              <Icon className="h-4 w-4" strokeWidth={1.8} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <nav className="space-y-1 border-t border-slate-100 pt-4" aria-label="Tiện ích sự kiện">
        {secondaryNav.map((item) => {
          const Icon = item.icon;
          const active = location.pathname === item.to;
          return (
            <Link
              key={item.label}
              to={item.to}
              onClick={closeSidebarOnMobile}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
                active ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
              }`}
            >
              <Icon className="h-4 w-4" strokeWidth={1.8} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );

  return (
    <AppLayoutContext.Provider value>
    <div className="min-h-screen bg-slate-50 text-slate-950">
      {showTelegramOnboarding && <TelegramOnboarding userId={user.userId} />}

      <header className="sticky top-0 z-40 bg-slate-950 text-white shadow-sm">
        <div className="flex min-h-16 flex-nowrap items-center gap-2 px-3 py-3 sm:gap-3 sm:px-5 lg:h-16 lg:justify-between lg:gap-6 lg:px-6 lg:py-0">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3 lg:flex-none">
            {eventNav.length > 0 && (
              <button
                type="button"
                className="shrink-0 rounded-lg p-2 text-slate-300 hover:bg-white/10 hover:text-white"
                aria-label={sidebarOpen ? 'Ẩn thanh điều hướng' : 'Mở thanh điều hướng'}
                aria-expanded={sidebarOpen}
                onClick={() => setSidebarState({ eventId: selectedEventId, open: !sidebarOpen })}
              >
                <Menu className="h-5 w-5" strokeWidth={1.8} />
              </button>
            )}
            <Link to="/" className="flex min-w-0 items-center gap-2 sm:gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white ring-1 ring-white/10">
                <img src="/event-flow-logo-mark.png" alt="" className="h-8 w-8 object-contain" />
              </span>
              <span className="hidden min-w-0 sm:block">
                <span className="block truncate text-lg font-extrabold leading-tight tracking-tight sm:text-xl">Event Flow</span>
                <span className="block text-xs text-slate-400 lg:hidden">Nhóm EXE • FPTU</span>
              </span>
            </Link>
          </div>

          {selectedEvent?.id && (
          <form onSubmit={handleGlobalSearchSubmit} className="hidden min-w-0 flex-1 items-center lg:flex">
            <div className="relative w-full max-w-xl">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" strokeWidth={1.8} />
              <input
                type="search"
                id="global-search"
                name="globalSearch"
                aria-label="Tìm kiếm trong Event Flow"
                placeholder="Tìm kiếm sự kiện, công việc, ban..."
                value={globalSearch}
                onChange={(event) => setGlobalSearch(event.target.value)}
                className="h-10 w-full rounded-lg border border-white/10 bg-white/10 px-10 text-sm text-white outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20"
              />
              {globalSearch.trim() && (
                <div className="absolute left-0 right-0 top-12 z-50 overflow-hidden rounded-xl border border-slate-200 bg-white py-2 text-slate-900 shadow-xl">
                  {searchSuggestions.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-slate-500">Không tìm thấy kết quả phù hợp</div>
                  ) : (
                    searchSuggestions.map((item) => (
                      <button
                        key={`${item.to}-${item.label}`}
                        type="button"
                        onClick={() => {
                          setGlobalSearch('');
                          navigate(item.to);
                        }}
                        className="block w-full px-4 py-3 text-left hover:bg-indigo-50"
                      >
                        <span className="block text-sm font-semibold text-slate-950">{item.label}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </form>
          )}

          <div className="ml-auto flex min-w-0 items-center justify-end gap-2 lg:gap-3">
            <div className="flex items-center gap-1 text-slate-300">
              {selectedEvent?.id && (
              <Link to={`/events/${selectedEvent.id}/calendar`} className="hidden rounded-lg p-2 hover:bg-white/10 hover:text-white lg:inline-flex" aria-label="Lịch sự kiện">
                <CalendarDays className="h-5 w-5" strokeWidth={1.8} />
              </Link>
              )}
              <div className="relative" ref={notificationRef}>
                <button
                  type="button"
                  className="relative rounded-lg p-2 hover:bg-white/10 hover:text-white"
                  aria-label="Mở thông báo"
                  aria-expanded={notificationOpen}
                  onClick={() => setNotificationOpen((open) => !open)}
                >
                  <Bell className="h-5 w-5" strokeWidth={1.8} />
                  {pendingNotificationCount > 0 && (
                    <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-red-500 px-1.5 py-0.5 text-center text-[10px] font-bold leading-none text-white">
                      {pendingNotificationCount > 99 ? '99+' : pendingNotificationCount}
                    </span>
                  )}
                </button>
                {notificationOpen && (
                  <div className="fixed left-3 right-3 top-[4.75rem] z-50 max-h-[min(28rem,calc(100vh-5.5rem))] overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-900 shadow-xl sm:absolute sm:left-auto sm:right-0 sm:top-12 sm:max-h-none sm:w-[min(360px,calc(100vw-2rem))]">
                    <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
                      <div>
                        <p className="text-sm font-extrabold text-slate-950">Thông báo</p>
                        <p className="text-xs text-slate-500">{pendingNotificationCount} thông báo chưa đọc</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => markAllNotificationsReadMutation.mutate(user.userId)}
                        disabled={pendingNotificationCount === 0 || markAllNotificationsReadMutation.isPending}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-700 disabled:text-slate-300"
                      >
                        Đọc hết
                      </button>
                    </div>
                    <div className="max-h-[min(22rem,calc(100vh-10rem))] overflow-y-auto sm:max-h-96">
                      {notificationListQuery.isLoading && (
                        <div className="px-4 py-5 text-sm text-slate-500">Đang tải thông báo...</div>
                      )}
                      {notificationListQuery.error && (
                        <div className="px-4 py-5 text-sm text-red-600">Không tải được thông báo.</div>
                      )}
                      {!notificationListQuery.isLoading && !notificationListQuery.error && (notificationListQuery.data || []).length === 0 && (
                        <div className="px-4 py-5 text-sm text-slate-500">Chưa có thông báo nào.</div>
                      )}
                      {(notificationListQuery.data || []).map((notification) => {
                        const unread = !notification.readAt;
                        return (
                          <button
                            key={notification.id}
                            type="button"
                            onClick={() => {
                              if (unread) {
                                markNotificationReadMutation.mutate({ userId: user.userId, notificationId: notification.id });
                              }
                              const isCalendarNotification = notification.type?.startsWith('CALENDAR');
                              if (notification.eventId && notification.taskId) {
                                setNotificationOpen(false);
                                navigate(`/events/${notification.eventId}/tasks/${notification.taskId}`);
                              } else if (notification.eventId && (notification.calendarEventId || isCalendarNotification)) {
                                setNotificationOpen(false);
                                const params = new URLSearchParams();
                                if (notification.calendarEventId) {
                                  params.set('calendarEventId', String(notification.calendarEventId));
                                }
                                if (notification.calendarStartTime) {
                                  const calendarDate = new Date(notification.calendarStartTime);
                                  if (!Number.isNaN(calendarDate.getTime())) {
                                    params.set('year', String(calendarDate.getFullYear()));
                                    params.set('month', String(calendarDate.getMonth() + 1));
                                  }
                                }
                                const query = params.toString();
                                navigate(`/events/${notification.eventId}/calendar${query ? `?${query}` : ''}`);
                              }
                            }}
                            className="block w-full border-b border-slate-100 px-4 py-3 text-left last:border-b-0 hover:bg-indigo-50"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <span className="min-w-0">
                                <span className="block text-sm font-bold text-slate-950">{notification.title}</span>
                                <span className="mt-1 block text-xs leading-5 text-slate-600">{notification.message}</span>
                                <span className="mt-2 block text-[11px] font-semibold text-slate-400">
                                  {notification.eventName || 'Sự kiện'} • {formatNotificationTime(notification.createdAt)}
                                </span>
                              </span>
                              {unread && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-indigo-600" aria-label="Chưa đọc" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <Link to="/profile" className="hidden min-w-0 rounded-lg px-2 py-1 text-right text-sm text-slate-300 transition hover:bg-white/10 hover:text-white sm:block">
              <span className="block max-w-[7.5rem] truncate font-semibold text-white sm:max-w-[10rem] lg:max-w-[14rem]">{user.name}</span>
              <span className="hidden text-xs sm:block">
                {selectedEvent?.role ? (selectedEvent.role === 'LEADER' ? 'Trưởng nhóm' : 'Thành viên') : 'Tài khoản'}
              </span>
            </Link>
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-white/15 text-sm font-medium text-slate-100 transition-colors hover:bg-white/10 active:translate-y-px sm:w-auto sm:px-3"
              aria-label="Đăng xuất"
            >
              <LogOut className="h-4 w-4" strokeWidth={1.8} />
              <span className="hidden sm:inline">Đăng xuất</span>
            </button>
          </div>
        </div>
      </header>

      <div className={eventNav.length > 0 && sidebarOpen ? 'lg:grid lg:grid-cols-[264px_1fr]' : ''}>
        {eventNav.length > 0 && sidebarOpen && (
          <aside className="border-b border-slate-200 bg-white lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] lg:border-b-0 lg:border-r">
            {renderEventNavigation()}
          </aside>
        )}

        <main className="min-w-0 px-4 py-5 sm:p-6 md:p-8 lg:p-10">
          {children}
        </main>
      </div>

      {eventNav.length === 0 && (
        <footer className="border-t border-slate-200 bg-white">
          <div className="mx-auto grid max-w-7xl gap-6 px-5 py-8 text-sm text-slate-500 md:grid-cols-[1.35fr_0.95fr_0.85fr] lg:px-8">
            <div>
              <p className="text-base font-extrabold text-slate-900">Event Flow</p>
              <p className="mt-2 leading-6">
                Dự án EXE201 của nhóm sinh viên Trường Đại học FPT Hà Nội, cung cấp dịch vụ hỗ trợ tổ chức,
                điều phối và quản lý sự kiện trên nền tảng số cho câu lạc bộ, đội nhóm, doanh nghiệp nhỏ và
                các đơn vị tổ chức sự kiện.
              </p>
              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                EXE201 • FPT University Hanoi • Event Support Service
              </p>
            </div>

            <div>
              <p className="font-bold text-slate-800">Thông tin dự án</p>
              <div className="mt-2 space-y-1.5">
                <p>Nhóm dự án: Event Flow EXE201 Team</p>
                <p>Đơn vị học thuật: Trường Đại học FPT Hà Nội</p>
                <p>Trường Đại học FPT Hà Nội</p>
                <p>Khu Công nghệ cao Hòa Lạc, Hà Nội</p>
                <a href="mailto:event.flow.corp.vn@gmail.com" className="block pt-1 font-semibold text-indigo-600 hover:text-indigo-700">
                  event.flow.corp.vn@gmail.com
                </a>
              </div>
            </div>

            <div>
              <p className="font-bold text-slate-800">Kết nối với nhóm</p>
              <p className="mt-2 leading-6">
                Theo dõi tiến độ dự án, hình ảnh vận hành và thông báo dịch vụ trên các nền tảng xã hội của nhóm.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <a href="https://facebook.com/eventflow" className="rounded-full border border-slate-200 px-3 py-1.5 font-semibold text-slate-700 hover:border-indigo-200 hover:text-indigo-700">
                  Facebook
                </a>
                <a href="https://instagram.com/eventflow" className="rounded-full border border-slate-200 px-3 py-1.5 font-semibold text-slate-700 hover:border-indigo-200 hover:text-indigo-700">
                  Instagram
                </a>
                <a href="https://linkedin.com/company/eventflow" className="rounded-full border border-slate-200 px-3 py-1.5 font-semibold text-slate-700 hover:border-indigo-200 hover:text-indigo-700">
                  LinkedIn
                </a>
                <a href="https://github.com/eventflow" className="rounded-full border border-slate-200 px-3 py-1.5 font-semibold text-slate-700 hover:border-indigo-200 hover:text-indigo-700">
                  GitHub
                </a>
              </div>
              <p className="mt-4 text-xs text-slate-400">© 2026 Event Flow EXE201 Team. All rights reserved.</p>
            </div>
          </div>
        </footer>
      )}
    </div>
    </AppLayoutContext.Provider>
  );
};

const formatNotificationTime = (value) => {
  if (!value) {
    return 'Vừa tạo';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Vừa tạo';
  }

  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default AppLayout;
