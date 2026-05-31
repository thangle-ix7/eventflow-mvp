import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import TelegramOnboarding from './components/TelegramOnboarding';
import Dashboard from './components/Dashboard';
import TaskBoard from './components/TaskBoard';
import LoginPage from './components/LoginPage';
import eventApi from './api/eventApi';

const EMPTY_EVENTS = [];

function App() {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [selectedEventId, setSelectedEventId] = useState(() => {
    return localStorage.getItem('selectedEventId') || '';
  });

  const {
    data: events = EMPTY_EVENTS,
    isLoading: eventsLoading,
    error: eventsError,
  } = useQuery({
    queryKey: ['events'],
    queryFn: eventApi.getMyEvents,
    enabled: Boolean(user),
  });

  const selectedEvent =
    events.find((event) => String(event.id) === String(selectedEventId)) ||
    events[0] ||
    null;

  const currentEventId = selectedEvent?.id;
  const canViewDashboard = selectedEvent?.role === 'LEADER';

  const handleLoginSuccess = (userData) => {
    localStorage.setItem('token', userData.token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('selectedEventId');
    setSelectedEventId('');
    setUser(null);
  };

  const handleEventChange = (event) => {
    const nextEventId = event.target.value;
    setSelectedEventId(nextEventId);
    localStorage.setItem('selectedEventId', nextEventId);
  };

  if (!user) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

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
                  value={String(currentEventId || '')}
                  onChange={handleEventChange}
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
              onClick={handleLogout}
              className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Đăng xuất
            </button>
          </div>
        </header>

        {eventsLoading && (
          <div className="p-8 text-center text-gray-500 bg-white rounded-xl border border-gray-200">
            Đang tải danh sách sự kiện...
          </div>
        )}

        {eventsError && (
          <div className="p-8 text-center text-red-600 bg-red-50 rounded-xl border border-red-200">
            Lỗi tải sự kiện: {eventsError.userMessage || eventsError.message}
          </div>
        )}

        {!eventsLoading && !eventsError && events.length === 0 && (
          <div className="p-8 text-center text-gray-500 bg-white rounded-xl border border-gray-200">
            Tài khoản này chưa thuộc sự kiện nào.
          </div>
        )}

        {!eventsLoading && !eventsError && selectedEvent && (
          <>
            {/* Dashboard */}
            <section className="mb-12">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                <h2 className="text-2xl font-bold text-gray-800">
                  Dashboard Tổng Quan
                </h2>
                <span className="w-fit px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-full uppercase">
                  {selectedEvent.name}
                </span>
              </div>
              {canViewDashboard ? (
                <Dashboard eventId={currentEventId} />
              ) : (
                <div className="p-6 bg-white rounded-xl border border-gray-200 text-gray-500">
                  Dashboard tổng quan chỉ dành cho LEADER của sự kiện.
                </div>
              )}
            </section>

            {/* Task Board */}
            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-6">
                Danh Sách Công Việc
              </h2>
              <TaskBoard eventId={currentEventId} />
            </section>
          </>
        )}
      </main>
    </div>
  );
}

export default App;
