import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import AppLayout from './components/AppLayout';
import Dashboard from './components/Dashboard';
import TaskBoard from './components/TaskBoard';
import LoginPage from './components/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';
import eventApi from './api/eventApi';

const EMPTY_EVENTS = [];

function App() {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const handleLoginSuccess = (userData, redirectTo = '/') => {
    localStorage.setItem('token', userData.token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    navigate(redirectTo, { replace: true });
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    navigate('/', { replace: true });
  };

  return (
    <Routes>
      <Route
        path="/login"
        element={
          user ? (
            <Navigate to="/" replace />
          ) : (
            <LoginPage onLoginSuccess={handleLoginSuccess} />
          )
        }
      />
      <Route
        path="/verify-email"
        element={<LoginPage onLoginSuccess={handleLoginSuccess} />}
      />
      <Route
        path="/reset-password"
        element={<LoginPage onLoginSuccess={handleLoginSuccess} />}
      />
      <Route
        element={<ProtectedRoute user={user} />}
      >
        <Route
          path="/"
          element={<EventWorkspace user={user} onLogout={handleLogout} />}
        />
        <Route
          path="/events/:eventId"
          element={<EventWorkspace user={user} onLogout={handleLogout} />}
        />
      </Route>
      <Route path="*" element={<Navigate to={user ? '/' : '/login'} replace />} />
    </Routes>
  );
}

function EventWorkspace({ user, onLogout }) {
  const navigate = useNavigate();
  const { eventId } = useParams();

  const {
    data: events = EMPTY_EVENTS,
    isLoading: eventsLoading,
    error: eventsError,
  } = useQuery({
    queryKey: ['events'],
    queryFn: eventApi.getMyEvents,
    enabled: Boolean(user),
  });

  const selectedEvent = eventId
    ? events.find((event) => String(event.id) === String(eventId))
    : null;

  const canViewDashboard = selectedEvent?.role === 'LEADER';

  const handleEventChange = (event) => {
    navigate(`/events/${event.target.value}`);
  };

  if (!eventsLoading && !eventsError && events.length > 0 && !selectedEvent) {
    return <Navigate to={`/events/${events[0].id}`} replace />;
  }

  return (
    <AppLayout
      user={user}
      events={events}
      selectedEvent={selectedEvent}
      onEventChange={handleEventChange}
      onLogout={onLogout}
    >
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
              <Dashboard eventId={selectedEvent.id} />
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
            <TaskBoard eventId={selectedEvent.id} />
          </section>
        </>
      )}
    </AppLayout>
  );
}

export default App;
