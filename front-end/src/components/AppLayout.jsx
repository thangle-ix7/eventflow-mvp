import TelegramOnboarding from './TelegramOnboarding';

const AppLayout = ({
  user,
  events,
  selectedEvent,
  onEventChange,
  onLogout,
  children,
}) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <TelegramOnboarding userId={user.userId} />

      <main className="max-w-6xl mx-auto p-6 md:p-12">
        <header className="mb-10 flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
              EventFlow
            </h1>
            <p className="text-gray-600 mt-2 text-lg">
              Quản lý công việc và nhắc nhở tự động cho Ban Tổ Chức.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mt-1">
            {events.length > 0 && (
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <span className="font-semibold">Sự kiện</span>
                <select
                  value={String(selectedEvent?.id || '')}
                  onChange={onEventChange}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-gray-800 outline-none transition-colors hover:bg-gray-50 focus:border-indigo-500"
                >
                  {events.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <span className="text-sm text-gray-600">
              Xin chào, <span className="font-semibold">{user.name}</span>
            </span>
            <button
              type="button"
              onClick={onLogout}
              className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Đăng xuất
            </button>
          </div>
        </header>

        {children}
      </main>
    </div>
  );
};

export default AppLayout;
