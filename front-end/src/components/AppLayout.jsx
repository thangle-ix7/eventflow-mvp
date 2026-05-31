import TelegramOnboarding from './TelegramOnboarding';
import { Link } from 'react-router-dom';

const AppLayout = ({
  user,
  selectedEvent,
  onLogout,
  showTelegramOnboarding = true,
  children,
}) => {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {showTelegramOnboarding && <TelegramOnboarding userId={user.userId} />}

      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
              EventFlow
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Nhóm EXE • Dự án hỗ trợ sự kiện FPTU
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {selectedEvent?.role && (
              <span className="w-fit rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
                Role: {selectedEvent.role}
              </span>
            )}
            <span className="text-sm text-gray-600">
              Xin chào, <span className="font-semibold">{user.name}</span>
            </span>
            <Link
              to="/profile"
              className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Profile
            </Link>
            <button
              type="button"
              onClick={onLogout}
              className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Đăng xuất
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 p-6 md:p-12">
        {children}
      </main>

      <footer className="border-t border-gray-200 bg-white">
        <div className="mx-auto grid max-w-6xl gap-3 px-6 py-5 text-sm text-gray-500 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="font-semibold text-gray-800">EventFlow - Nhóm EXE</p>
            <p>Dự án hỗ trợ quản lý sự kiện FPTU.</p>
          </div>
          <div className="flex flex-col gap-1 md:text-right">
            <span className="font-medium text-gray-700">Liên hệ</span>
            <a
              href="mailto:event.flow.corp.vn@gmail.com"
              className="font-semibold text-indigo-600 hover:text-indigo-700"
            >
              event.flow.corp.vn@gmail.com
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AppLayout;
