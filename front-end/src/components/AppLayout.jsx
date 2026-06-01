import TelegramOnboarding from './TelegramOnboarding';
import { Link, useLocation } from 'react-router-dom';
import AiChatBox from './AiChatBox';
import {
  BarChart3,
  Bell,
  CalendarDays,
  ClipboardList,
  HelpCircle,
  LogOut,
  Menu,
  Search,
  Settings,
  Users,
  UserRound,
  Workflow,
} from 'lucide-react';

const AppLayout = ({
  user,
  selectedEvent,
  onLogout,
  showTelegramOnboarding = true,
  children,
}) => {
  const location = useLocation();
  const eventNav = selectedEvent?.id
    ? [
      { to: `/events/${selectedEvent.id}/dashboard`, label: 'Dashboard', icon: BarChart3 },
      { to: `/events/${selectedEvent.id}`, label: 'Tổng quan', icon: Workflow },
      { to: `/events/${selectedEvent.id}/tasks`, label: 'Công việc', icon: ClipboardList },
      { to: `/events/${selectedEvent.id}/departments`, label: 'Ban tổ chức', icon: Users },
      { to: `/events/${selectedEvent.id}/members`, label: 'Thành viên', icon: UserRound },
    ]
    : [];
  const secondaryNav = [
    { label: 'Lịch', icon: CalendarDays },
    { label: 'Thông báo', icon: Bell },
    { label: 'Cài đặt', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      {showTelegramOnboarding && <TelegramOnboarding userId={user.userId} />}

      <header className="sticky top-0 z-40 bg-slate-950 text-white shadow-sm">
        <div className="flex h-auto min-h-16 flex-col gap-3 px-5 py-3 lg:h-16 lg:flex-row lg:items-center lg:gap-6 lg:px-6 lg:py-0">
          <div className="flex items-center gap-3">
            <button type="button" className="rounded-lg p-2 text-slate-300 hover:bg-white/10 hover:text-white" aria-label="Mở menu">
              <Menu className="h-5 w-5" strokeWidth={1.8} />
            </button>
            <Link to="/" className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 font-black text-white">
                E
              </span>
              <span>
                <span className="block text-xl font-extrabold leading-tight tracking-tight">EventFlow</span>
                <span className="block text-xs text-slate-400 lg:hidden">Nhóm EXE • FPTU</span>
              </span>
            </Link>
          </div>

          <div className="hidden min-w-0 flex-1 items-center lg:flex">
            <div className="relative w-full max-w-xl">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" strokeWidth={1.8} />
              <input
                type="search"
                id="global-search"
                name="globalSearch"
                aria-label="Tìm kiếm trong EventFlow"
                placeholder="Tìm kiếm sự kiện, công việc, ban..."
                className="h-10 w-full rounded-lg border border-white/10 bg-white/10 px-10 text-sm text-white outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <div className="hidden items-center gap-1 text-slate-300 lg:flex">
              <button type="button" className="rounded-lg p-2 hover:bg-white/10 hover:text-white" aria-label="Lịch">
                <CalendarDays className="h-5 w-5" strokeWidth={1.8} />
              </button>
              <button type="button" className="relative rounded-lg p-2 hover:bg-white/10 hover:text-white" aria-label="Thông báo">
                <Bell className="h-5 w-5" strokeWidth={1.8} />
                <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />
              </button>
              <button type="button" className="rounded-lg p-2 hover:bg-white/10 hover:text-white" aria-label="Trợ giúp">
                <HelpCircle className="h-5 w-5" strokeWidth={1.8} />
              </button>
            </div>
            <div className="text-sm text-slate-300 lg:text-right">
              <span className="block font-semibold text-white">{user.name}</span>
              <span className="block text-xs">{selectedEvent?.role === 'LEADER' ? 'Trưởng nhóm' : 'Thành viên'}</span>
            </div>
            <Link
              to="/profile"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 px-3 py-1.5 text-sm font-medium text-slate-100 transition-colors hover:bg-white/10 active:translate-y-px"
            >
              <UserRound className="h-4 w-4" strokeWidth={1.8} />
              Profile
            </Link>
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 px-3 py-1.5 text-sm font-medium text-slate-100 transition-colors hover:bg-white/10 active:translate-y-px"
            >
              <LogOut className="h-4 w-4" strokeWidth={1.8} />
              Đăng xuất
            </button>
          </div>
        </div>
      </header>

      <div className={eventNav.length > 0 ? 'lg:grid lg:grid-cols-[264px_1fr]' : ''}>
        {eventNav.length > 0 && (
          <aside className="border-b border-slate-200 bg-white lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] lg:border-b-0 lg:border-r">
            <div className="space-y-5 p-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-bold text-slate-950">{selectedEvent?.name || 'Sự kiện'}</p>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                  {selectedEvent?.description || 'Workspace điều phối sự kiện'}
                </p>
                {selectedEvent?.role && (
                  <span className="mt-3 inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700">
                    {selectedEvent.role === 'LEADER' ? 'Trưởng nhóm' : 'Thành viên'}
                  </span>
                )}
              </div>

              <nav className="space-y-1" aria-label="Điều hướng sự kiện">
                {eventNav.map((item) => {
                  const Icon = item.icon;
                  const active = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);

                  return (
                    <Link
                      key={item.to}
                      to={item.to}
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

              <div className="space-y-1 border-t border-slate-100 pt-4">
                {secondaryNav.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-500">
                      <Icon className="h-4 w-4" strokeWidth={1.8} />
                      {item.label}
                    </div>
                  );
                })}
              </div>
            </div>
          </aside>
        )}

        <main className="min-w-0 p-5 md:p-8 lg:p-10">
          {children}
        </main>
      </div>

      {eventNav.length === 0 && (
        <footer className="border-t border-slate-200 bg-white">
          <div className="mx-auto grid max-w-7xl gap-3 px-5 py-5 text-sm text-slate-500 md:grid-cols-[1fr_auto] md:items-center lg:px-8">
          <div>
            <p className="font-semibold text-slate-800">EventFlow - Nhóm EXE</p>
            <p>Dự án hỗ trợ quản lý sự kiện FPTU.</p>
          </div>
          <div className="flex flex-col gap-1 md:text-right">
            <span className="font-medium text-slate-700">Liên hệ</span>
            <a
              href="mailto:event.flow.corp.vn@gmail.com"
              className="font-semibold text-indigo-600 hover:text-indigo-700"
            >
              event.flow.corp.vn@gmail.com
            </a>
          </div>
          </div>
        </footer>
      )}

      <AiChatBox />
    </div>
  );
};

export default AppLayout;
