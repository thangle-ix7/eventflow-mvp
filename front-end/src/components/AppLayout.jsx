import TelegramOnboarding from './TelegramOnboarding';
import FeedbackModal from './FeedbackModal';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import userApi from '../api/userApi';
import { getDepartmentHomePath, getEventPermissions } from '../utils/permissionUtils';
import LanguageSwitcher from './LanguageSwitcher';
import { useTranslation } from 'react-i18next';
import {
  BarChart3,
  Bell,
  CalendarDays,
  ClipboardList,
  FileText,
  Layers,
  LogOut,
  Menu,
  MessageSquareHeart,
  Search,
  Settings,
  TrendingUp,
  Users,
  UserRound,
  Workflow,
} from 'lucide-react';

const AppLayoutContext = createContext(false);

const AppLayout = ({ children, ...props }) => {
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
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [globalSearch, setGlobalSearch] = useState('');
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === 'undefined') {
      return true;
    }
    return window.matchMedia('(min-width: 1024px)').matches;
  });
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
  const permissions = getEventPermissions(selectedEvent);
  const departmentHomePath = getDepartmentHomePath(selectedEvent);

  const eventNav = selectedEvent?.id
    ? [
      { to: `/events/${selectedEvent.id}`, label: t('sidebar.dashboard'), icon: Workflow },
      ...(permissions.canViewEventDashboard ? [{ to: `/events/${selectedEvent.id}/dashboard`, label: 'Dashboard', icon: BarChart3 }] : []),
      { to: `/events/${selectedEvent.id}/plannings`, label: t('sidebar.plannings'), icon: Layers },
      { to: `/events/${selectedEvent.id}/tasks`, label: t('sidebar.tasks'), icon: ClipboardList },
      ...(departmentHomePath ? [{ to: departmentHomePath, label: t('sidebar.departments'), icon: Users }] : []),
      { to: `/events/${selectedEvent.id}/members`, label: t('sidebar.members'), icon: UserRound },
    ]
    : [];

  const secondaryNav = selectedEvent?.id
    ? [
      {
        to: `/events/${selectedEvent.id}/calendar`,
        label: t('utility.calendar'),
        description: 'Lịch vận hành',
        icon: CalendarDays,
      },
      {
        to: `/events/${selectedEvent.id}/documents`,
        label: t('utility.documents'),
        description: 'File & link',
        icon: FileText,
      },
      {
        to: `/events/${selectedEvent.id}/reports`,
        label: t('utility.reports'),
        description: t('description.progress'),
        icon: TrendingUp,
      },
      {
        to: `/events/${selectedEvent.id}/settings`,
        label: permissions.canManageEvent ? t('utility.settings') : t('common.view'),
        description: 'Thiết lập sự kiện',
        icon: Settings,
      },
    ]
    : [
      { to: '/', label: t('event.title'), description: 'Danh sách sự kiện', icon: CalendarDays },
    ];

  const sidebarOpen = Boolean(selectedEventId) && (
    sidebarState.eventId === selectedEventId ? sidebarState.open : isDesktop
  );

  const searchSuggestionBase = [
    { label: t('event.title'), description: '', to: '/' },
    { label: t('event.create'), description: '', to: '/events/new' },
    { label: 'Templates', description: 'Xem templates sẵn có', to: '/events/templates' },
    ...(user?.systemRole === 'ADMIN'
      ? [
        { label: 'Quản lý Templates', description: 'Admin panel', to: '/admin/templates' },
        { label: 'Feedback inbox', description: 'Góp ý người dùng', to: '/admin/feedback' },
      ]
      : []),
    { label: 'Hồ sơ cá nhân', description: '', to: '/profile' },
    ...events.map((event) => ({
      label: event.name,
      description: '',
      to: `/events/${event.id}`,
    })),
  ];

  if (selectedEvent?.id) {
    searchSuggestionBase.push(
      { label: t('sidebar.tasks'), description: '', to: `/events/${selectedEvent.id}/tasks` },
      { label: t('sidebar.plannings'), description: '', to: `/events/${selectedEvent.id}/plannings` },
      { label: t('sidebar.members'), description: '', to: `/events/${selectedEvent.id}/members` },
      { label: t('utility.calendar'), description: '', to: `/events/${selectedEvent.id}/calendar` },
      { label: t('utility.documents'), description: '', to: `/events/${selectedEvent.id}/documents` },
      { label: t('utility.reports'), description: '', to: `/events/${selectedEvent.id}/reports` },
      { label: permissions.canManageEvent ? t('utility.settings') : t('common.view'), description: '', to: `/events/${selectedEvent.id}/settings` },
    );

    if (departmentHomePath) {
      searchSuggestionBase.push({ label: t('sidebar.departments'), description: '', to: departmentHomePath });
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
    if (typeof window === 'undefined') {
      return;
    }

    if (window.matchMedia('(max-width: 1023px)').matches) {
      setSidebarState({ eventId: selectedEventId, open: false });
    }
  };

  const toggleSidebar = () => {
    setSidebarState({
      eventId: selectedEventId,
      open: !sidebarOpen,
    });
  };

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const mediaQuery = window.matchMedia('(min-width: 1024px)');

    const handleChange = () => {
      setIsDesktop(mediaQuery.matches);
    };

    handleChange();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

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
      {selectedEvent?.name && (
        <div className="relative overflow-hidden rounded-[2rem] border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-emerald-50 p-4 shadow-lg shadow-sky-100/60">
          <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-sky-100 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-12 left-1/2 h-32 w-32 rounded-full bg-emerald-100/70 blur-2xl" />

          <div className="relative">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-500">
              Current event
            </p>
            <p className="mt-2 line-clamp-2 text-sm font-black text-slate-950">
              {selectedEvent.name}
            </p>
            <p className="mt-1 text-xs font-black text-slate-500">
              {selectedEvent?.role ? (selectedEvent.role === 'LEADER' ? 'Trưởng nhóm' : 'Thành viên') : 'Tài khoản'}
            </p>
          </div>
        </div>
      )}

      <nav className="space-y-2" aria-label="Điều hướng sự kiện">
        {eventNav.map((item) => {
          const Icon = item.icon;
          const active = isEventNavActive(item);

          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={closeSidebarOnMobile}
              className={[
                'group relative flex min-h-14 items-center gap-3 overflow-hidden rounded-[1.35rem] border px-3.5 py-3 text-sm font-black transition-all',
                active
                  ? 'border-sky-200 bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400 text-white shadow-xl shadow-cyan-100'
                  : 'border-transparent bg-white/70 text-slate-600 hover:-translate-y-0.5 hover:border-sky-100 hover:bg-sky-50 hover:text-sky-600 hover:shadow-lg hover:shadow-sky-100/70',
              ].join(' ')}
            >
              {active && (
                <span className="absolute inset-y-3 left-0 w-1 rounded-r-full bg-white/90" />
              )}

              <span
                className={[
                  'relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl transition',
                  active
                    ? 'bg-white/20 text-white shadow-sm'
                    : 'bg-white text-slate-400 shadow-sm group-hover:text-sky-500',
                ].join(' ')}
              >
                <Icon className="h-5 w-5" strokeWidth={1.9} />
              </span>

              <span className="relative min-w-0 truncate">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sky-100 pt-5">
        <div className="mb-3 flex items-center justify-between gap-3 px-1">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
            Tiện ích
          </p>

          <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[10px] font-black text-sky-600">
            Event tools
          </span>
        </div>

        <nav className="space-y-2" aria-label="Tiện ích sự kiện">
          {secondaryNav.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);

            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={closeSidebarOnMobile}
                className={[
                  'group relative flex min-h-16 items-center gap-3 overflow-hidden rounded-[1.35rem] border px-3.5 py-3 text-sm font-black transition-all',
                  active
                    ? 'border-sky-200 bg-gradient-to-r from-sky-50 via-white to-emerald-50 text-sky-700 shadow-xl shadow-sky-100/80 ring-1 ring-sky-100'
                    : 'border-transparent bg-white/70 text-slate-500 hover:-translate-y-0.5 hover:border-sky-100 hover:bg-sky-50 hover:text-sky-600 hover:shadow-lg hover:shadow-sky-100/70',
                ].join(' ')}
              >
                {active && (
                  <>
                    <span className="absolute inset-y-3 left-0 w-1 rounded-r-full bg-gradient-to-b from-sky-500 to-emerald-400" />
                    <span className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-sky-100 blur-2xl" />
                  </>
                )}

                <span
                  className={[
                    'relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl transition',
                    active
                      ? 'bg-gradient-to-br from-sky-500 to-emerald-400 text-white shadow-lg shadow-cyan-100'
                      : 'bg-white text-slate-400 shadow-sm group-hover:text-sky-500',
                  ].join(' ')}
                >
                  <Icon className="h-5 w-5" strokeWidth={1.9} />
                </span>

                <span className="relative min-w-0 flex-1">
                  <span className="block truncate">
                    {item.label}
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] font-black text-slate-400 group-hover:text-sky-500">
                    {item.description}
                  </span>
                </span>

                {active && (
                  <span className="relative h-2.5 w-2.5 shrink-0 rounded-full bg-gradient-to-r from-sky-500 to-emerald-400 shadow-sm shadow-cyan-100" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );

  return (
    <AppLayoutContext.Provider value={true}>
      <div className="min-h-screen bg-[#F8FCFF] text-slate-950">
        {showTelegramOnboarding && <TelegramOnboarding userId={user.userId} />}

        <header className="sticky top-0 z-50 border-b border-sky-100/80 bg-white/85 shadow-sm shadow-sky-100/60 backdrop-blur-2xl">
          <div className="flex min-h-16 flex-nowrap items-center gap-2 px-3 py-3 sm:gap-3 sm:px-5 lg:h-16 lg:justify-between lg:gap-6 lg:px-6 lg:py-0">
            <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3 lg:flex-none">
              {eventNav.length > 0 && (
                <button
                  type="button"
                  className="shrink-0 rounded-2xl p-2 text-slate-500 transition hover:bg-sky-50 hover:text-sky-600 active:scale-95"
                  aria-label={sidebarOpen ? 'Ẩn thanh điều hướng' : 'Mở thanh điều hướng'}
                  aria-expanded={sidebarOpen}
                  onClick={toggleSidebar}
                >
                  <Menu className="h-5 w-5" strokeWidth={1.8} />
                </button>
              )}

              <Link to="/events" className="group flex min-w-0 items-center gap-2 sm:gap-3">
                <span className="relative flex h-11 w-11 shrink-0 items-center justify-center">
                  <span className="absolute inset-0 rounded-2xl bg-gradient-to-br from-sky-400 to-emerald-400 opacity-35 blur-md transition group-hover:opacity-70" />
                  <span className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-lg shadow-sky-100">
                    <img src="/event-flow-logo-mark.png" alt="" className="h-8 w-8 object-contain" />
                  </span>
                </span>

                <span className="hidden min-w-0 sm:block">
                  <span className="block truncate text-xl font-black leading-tight tracking-tight text-slate-950">
                    <span>Event</span>
                    <span className="bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                      Flow
                    </span>
                  </span>
                  <span className="block text-xs font-bold uppercase tracking-[0.18em] text-slate-400 lg:hidden">
                    AI Event Planning
                  </span>
                </span>
              </Link>
            </div>

            {selectedEvent?.id && (
              <form onSubmit={handleGlobalSearchSubmit} className="hidden min-w-0 flex-1 items-center lg:flex">
                <div className="relative w-full max-w-xl">
                  <Search
                    className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                    strokeWidth={1.8}
                  />

                  <input
                    type="search"
                    id="global-search"
                    name="globalSearch"
                    aria-label={t('common.search')}
                    placeholder={`${t('common.search')}...`}
                    value={globalSearch}
                    onChange={(event) => setGlobalSearch(event.target.value)}
                    className="h-11 w-full rounded-2xl border border-sky-100 bg-sky-50/70 px-11 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-cyan-300 focus:bg-white focus:ring-4 focus:ring-cyan-100"
                  />

                  {globalSearch.trim() && (
                    <div className="absolute left-0 right-0 top-13 z-50 mt-2 overflow-hidden rounded-3xl border border-sky-100 bg-white py-2 text-slate-900 shadow-2xl shadow-sky-100">
                      {searchSuggestions.length === 0 ? (
                        <div className="px-4 py-3 text-sm font-semibold text-slate-500">
                          {t('error.notFound')}
                        </div>
                      ) : (
                        searchSuggestions.map((item) => (
                          <button
                            key={`${item.to}-${item.label}`}
                            type="button"
                            onClick={() => {
                              setGlobalSearch('');
                              navigate(item.to);
                            }}
                            className="block w-full px-4 py-3 text-left transition hover:bg-sky-50"
                          >
                            <span className="block text-sm font-black text-slate-950">{item.label}</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </form>
            )}

            <div className="ml-auto flex min-w-0 items-center justify-end gap-2 lg:gap-3">
              <div className="flex items-center gap-1 text-slate-500">
                {selectedEvent?.id && (
                  <Link
                    to={`/events/${selectedEvent.id}/calendar`}
                    className="hidden rounded-2xl p-2 transition hover:bg-sky-50 hover:text-sky-600 lg:inline-flex"
                    aria-label={t('utility.calendar')}
                  >
                    <CalendarDays className="h-5 w-5" strokeWidth={1.8} />
                  </Link>
                )}

                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-2xl px-2.5 py-2 text-sm font-black transition hover:bg-sky-50 hover:text-sky-600"
                  aria-label="Gửi góp ý cho EventFlow"
                  title="Gửi góp ý cho EventFlow"
                  onClick={() => setFeedbackOpen(true)}
                >
                  <MessageSquareHeart className="h-5 w-5" strokeWidth={1.8} />
                  <span className="hidden xl:inline">Góp ý</span>
                </button>

                <div className="relative" ref={notificationRef}>
                  <button
                    type="button"
                    className="relative rounded-2xl p-2 transition hover:bg-sky-50 hover:text-sky-600"
                    aria-label={t('notification.title')}
                    aria-expanded={notificationOpen}
                    onClick={() => setNotificationOpen((open) => !open)}
                  >
                    <Bell className="h-5 w-5" strokeWidth={1.8} />
                    {pendingNotificationCount > 0 && (
                      <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-gradient-to-r from-rose-500 to-red-500 px-1.5 py-0.5 text-center text-[10px] font-black leading-none text-white shadow-lg shadow-red-200">
                        {pendingNotificationCount > 99 ? '99+' : pendingNotificationCount}
                      </span>
                    )}
                  </button>

                  {notificationOpen && (
                    <div className="fixed left-3 right-3 top-[4.75rem] z-50 max-h-[min(28rem,calc(100vh-5.5rem))] overflow-hidden rounded-3xl border border-sky-100 bg-white text-slate-900 shadow-2xl shadow-sky-100 sm:absolute sm:left-auto sm:right-0 sm:top-12 sm:max-h-none sm:w-[min(380px,calc(100vw-2rem))]">
                      <div className="flex items-center justify-between gap-3 border-b border-sky-100 bg-gradient-to-r from-sky-50 to-emerald-50 px-4 py-3">
                        <div>
                          <p className="text-sm font-black text-slate-950">{t('notification.title')}</p>
                          <p className="text-xs font-bold text-slate-500">
                            {pendingNotificationCount} thông báo chưa đọc
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => markAllNotificationsReadMutation.mutate(user.userId)}
                          disabled={pendingNotificationCount === 0 || markAllNotificationsReadMutation.isPending}
                          className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-sky-600 shadow-sm transition hover:text-sky-700 disabled:text-slate-300"
                        >
                          {t('notification.markAllRead')}
                        </button>
                      </div>

                      <div className="max-h-[min(22rem,calc(100vh-10rem))] overflow-y-auto sm:max-h-96">
                        {notificationListQuery.isLoading && (
                          <div className="px-4 py-5 text-sm font-semibold text-slate-500">
                            {t('common.loading')}...
                          </div>
                        )}

                        {notificationListQuery.error && (
                          <div className="px-4 py-5 text-sm font-semibold text-red-600">
                            {t('error.unexpected')}
                          </div>
                        )}

                        {!notificationListQuery.isLoading && !notificationListQuery.error && (notificationListQuery.data || []).length === 0 && (
                          <div className="px-4 py-5 text-sm font-semibold text-slate-500">
                            {t('notification.noNotification')}
                          </div>
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
                              className="block w-full border-b border-sky-50 px-4 py-3 text-left transition last:border-b-0 hover:bg-sky-50"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <span className="min-w-0">
                                  <span className="block text-sm font-black text-slate-950">{notification.title}</span>
                                  <span className="mt-1 block text-xs font-medium leading-5 text-slate-600">{notification.message}</span>
                                  <span className="mt-2 block text-[11px] font-bold text-slate-400">
                                    {notification.eventName || t('event.title')} • {formatNotificationTime(notification.createdAt, i18n.language)}
                                  </span>
                                </span>

                                {unread && (
                                  <span
                                    className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-gradient-to-r from-sky-500 to-emerald-400"
                                    aria-label="Chưa đọc"
                                  />
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <LanguageSwitcher />

              <Link
                to="/profile"
                className="hidden min-w-0 rounded-2xl px-3 py-2 text-right text-sm text-slate-500 transition hover:bg-sky-50 hover:text-sky-600 sm:block"
              >
                <span className="block max-w-[7.5rem] truncate font-black text-slate-950 sm:max-w-[10rem] lg:max-w-[14rem]">
                  {user.name}
                </span>
                <span className="hidden text-xs font-bold sm:block">
                  {selectedEvent?.role ? (selectedEvent.role === 'LEADER' ? 'Trưởng nhóm' : 'Thành viên') : 'Tài khoản'}
                </span>
              </Link>

              <button
                type="button"
                onClick={onLogout}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-2xl border border-sky-100 bg-white text-sm font-black text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:border-red-100 hover:bg-red-50 hover:text-red-600 active:translate-y-px sm:w-auto sm:px-3"
                aria-label={t('common.logout')}
              >
                <LogOut className="h-4 w-4" strokeWidth={1.8} />
                <span className="hidden sm:inline">{t('common.logout')}</span>
              </button>
            </div>
          </div>
        </header>

        <div className={eventNav.length > 0 && sidebarOpen ? 'lg:grid lg:grid-cols-[284px_minmax(0,1fr)]' : ''}>
          {eventNav.length > 0 && sidebarOpen && !isDesktop && (
            <button
              type="button"
              aria-label="Đóng thanh điều hướng"
              className="fixed inset-x-0 bottom-0 top-16 z-30 bg-slate-950/25 backdrop-blur-sm lg:hidden"
              onClick={() => setSidebarState({ eventId: selectedEventId, open: false })}
            />
          )}

          {eventNav.length > 0 && sidebarOpen && (
            <aside className="fixed left-3 right-3 top-[4.75rem] z-40 max-h-[calc(100dvh-5.5rem)] overflow-y-auto overscroll-contain rounded-[2rem] border border-sky-100 bg-white/95 shadow-2xl shadow-sky-200/70 backdrop-blur-2xl [scrollbar-width:thin] [scrollbar-color:#bae6fd_transparent] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-sky-200 [&::-webkit-scrollbar-track]:bg-transparent lg:sticky lg:left-auto lg:right-auto lg:top-16 lg:z-20 lg:h-[calc(100dvh-4rem)] lg:max-h-[calc(100dvh-4rem)] lg:rounded-none lg:border-b-0 lg:border-l-0 lg:border-r lg:border-t-0 lg:bg-white/85 lg:shadow-sm lg:shadow-sky-100/60">
              {renderEventNavigation()}
            </aside>
          )}

          <main className="min-w-0 px-4 py-5 sm:p-6 md:p-8 lg:p-10">
            {children}
          </main>
        </div>

        {eventNav.length === 0 && (
          <footer className="relative overflow-hidden border-t border-sky-100 bg-slate-950 text-white">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -left-32 top-0 h-80 w-80 rounded-full bg-sky-400/20 blur-3xl" />
              <div className="absolute bottom-[-140px] right-[-80px] h-96 w-96 rounded-full bg-emerald-400/20 blur-3xl" />
              <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:48px_48px]" />
            </div>

            <div className="relative mx-auto grid max-w-7xl gap-8 px-5 py-10 text-sm md:grid-cols-[1.35fr_0.95fr_0.85fr] lg:px-8">
              <div>
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/10">
                    <img src="/event-flow-logo-mark.png" alt="" className="h-8 w-8 object-contain" />
                  </span>
                  <div>
                    <p className="text-xl font-black text-white">
                      <span>Event</span>
                      <span className="bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                        Flow
                      </span>
                    </p>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                      AI Event Planning
                    </p>
                  </div>
                </div>

                <p className="mt-5 max-w-xl font-medium leading-7 text-slate-300">
                  {t('footer.project')}
                </p>

                <p className="mt-4 text-xs font-black uppercase tracking-[0.22em] text-cyan-300">
                  {t('footer.team')} • {t('footer.university')} • Event Support Service
                </p>
              </div>

              <div>
                <p className="font-black uppercase tracking-[0.18em] text-white">
                  Thông tin dự án
                </p>
                <div className="mt-4 space-y-2 font-semibold text-slate-300">
                  <p>Nhóm dự án: {t('footer.team')}</p>
                  <p>Đơn vị học thuật: {t('footer.university')}</p>
                  <p>Khu Công nghệ cao Hòa Lạc, Hà Nội</p>
                  <a
                    href="mailto:support@eventflow.vn"
                    className="block pt-1 font-black text-cyan-300 transition hover:text-emerald-300"
                  >
                    support@eventflow.vn
                  </a>
                </div>
              </div>

              <div>
                <p className="font-black uppercase tracking-[0.18em] text-white">
                  {t('footer.social')}
                </p>
                <p className="mt-4 font-medium leading-7 text-slate-300">
                  Theo dõi tiến độ dự án, hình ảnh vận hành và thông báo dịch vụ trên các nền tảng xã hội của nhóm.
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <a href="https://www.facebook.com/profile.php?id=61590613526088" className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5 font-black text-slate-200 transition hover:border-cyan-300 hover:text-cyan-300">
                    Facebook
                  </a>
                  <a href="https://instagram.com/eventflow" className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5 font-black text-slate-200 transition hover:border-cyan-300 hover:text-cyan-300">
                    Instagram
                  </a>
                  <a href="https://linkedin.com/company/eventflow" className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5 font-black text-slate-200 transition hover:border-cyan-300 hover:text-cyan-300">
                    LinkedIn
                  </a>
                  <a href="https://github.com/eventflow" className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5 font-black text-slate-200 transition hover:border-cyan-300 hover:text-cyan-300">
                    GitHub
                  </a>
                </div>

                <p className="mt-5 text-xs font-semibold text-slate-500">
                  {t('footer.copyright')}
                </p>
              </div>
            </div>
          </footer>
        )}

        <FeedbackModal
          isOpen={feedbackOpen}
          selectedEvent={selectedEvent}
          user={user}
          onClose={() => setFeedbackOpen(false)}
        />
      </div>
    </AppLayoutContext.Provider>
  );
};

const formatNotificationTime = (value, lang) => {
  if (!value) {
    return lang === 'en' ? 'Just now' : 'Vừa tạo';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return lang === 'en' ? 'Just now' : 'Vừa tạo';
  }

  return date.toLocaleString(lang === 'en' ? 'en-US' : 'vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default AppLayout;
