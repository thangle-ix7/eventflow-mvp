import { Suspense, lazy, useEffect, useState } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import AppLayout from './components/AppLayout';
import LoginPage from './components/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';
import DepartmentCreatePage from './pages/DepartmentCreatePage';
import DepartmentDetailPage from './pages/DepartmentDetailPage';
import DepartmentListPage from './pages/DepartmentListPage';
import DepartmentMembersPage from './pages/DepartmentMembersPage';
import DepartmentTasksPage from './pages/DepartmentTasksPage';
import EventCreatePage from './pages/EventCreatePage';
import EventDetailPage from './pages/EventDetailPage';
import EventEditPage from './pages/EventEditPage';
import EventListPage from './pages/EventListPage';
import EventMembersPage from './pages/EventMembersPage';
import EventUtilityPage from './pages/EventUtilityPage';
import MemberDetailPage from './pages/MemberDetailPage';
import ProfilePage from './pages/ProfilePage';
import TaskCreatePage from './pages/TaskCreatePage';
import TaskAttachmentsPage from './pages/TaskAttachmentsPage';
import TaskDetailPage from './pages/TaskDetailPage';
import TaskEditPage from './pages/TaskEditPage';
import TaskListPage from './pages/TaskListPage';
import TaskReportsPage from './pages/TaskReportsPage';
import TaskReviewsPage from './pages/TaskReviewsPage';
import TaskUpdatePage from './pages/TaskUpdatePage';
import eventApi from './api/eventApi';
import userApi from './api/userApi';

const EventDashboardPage = lazy(() => import('./pages/EventDashboardPage'));
const DepartmentDashboardPage = lazy(() => import('./pages/DepartmentDashboardPage'));

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

  const handleUserUpdate = (nextUser) => {
    localStorage.setItem('user', JSON.stringify(nextUser));
    setUser(nextUser);
  };

  useEffect(() => {
    if (!user?.userId) {
      return;
    }

    let cancelled = false;
    userApi.getProfile(user.userId, { preferCache: false })
      .then((profile) => {
        if (!cancelled) {
          setUser((oldUser) => {
            if (!oldUser || oldUser.userId !== profile.userId) {
              return oldUser;
            }

            const nextUser = { ...oldUser, ...profile };
            localStorage.setItem('user', JSON.stringify(nextUser));
            return nextUser;
          });
        }
      })
      .catch(() => {
        // Token expiry is handled globally by apiClient; keep cached user for transient failures.
      });

    return () => {
      cancelled = true;
    };
  }, [user?.userId]);

  const protectedProps = {
    user,
    onLogout: handleLogout,
    onUserUpdate: handleUserUpdate,
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
      <Route element={<ProtectedRoute user={user} />}>
        <Route element={<RootAppLayout {...protectedProps} />}>
        <Route path="/" element={<EventListPage {...protectedProps} />} />
        <Route path="/profile" element={<ProfilePage {...protectedProps} />} />
        <Route path="/events/new" element={<EventCreatePage {...protectedProps} />} />
        <Route path="/events/:eventId" element={<EventDetailPage {...protectedProps} />} />
        <Route path="/events/:eventId/edit" element={<EventEditPage {...protectedProps} />} />
        <Route
          path="/events/:eventId/dashboard"
          element={
            <LazyPageFallback>
              <EventDashboardPage {...protectedProps} />
            </LazyPageFallback>
          }
        />
        <Route
          path="/events/:eventId/calendar"
          element={<EventUtilityPage {...protectedProps} type="calendar" />}
        />
        <Route
          path="/events/:eventId/documents"
          element={<EventUtilityPage {...protectedProps} type="documents" />}
        />
        <Route
          path="/events/:eventId/reports"
          element={<EventUtilityPage {...protectedProps} type="reports" />}
        />
        <Route
          path="/events/:eventId/settings"
          element={<EventUtilityPage {...protectedProps} type="settings" />}
        />
        <Route
          path="/events/:eventId/members"
          element={<EventMembersPage {...protectedProps} />}
        />
        <Route
          path="/events/:eventId/members/:userId"
          element={<MemberDetailPage {...protectedProps} />}
        />
        <Route
          path="/events/:eventId/tasks"
          element={<TaskListPage {...protectedProps} />}
        />
        <Route
          path="/events/:eventId/tasks/new"
          element={<TaskCreatePage {...protectedProps} />}
        />
        <Route
          path="/events/:eventId/tasks/:taskId"
          element={<TaskDetailPage {...protectedProps} />}
        />
        <Route
          path="/events/:eventId/tasks/:taskId/attachments"
          element={<TaskAttachmentsPage {...protectedProps} />}
        />
        <Route
          path="/events/:eventId/tasks/:taskId/reports"
          element={<TaskReportsPage {...protectedProps} />}
        />
        <Route
          path="/events/:eventId/tasks/:taskId/update"
          element={<TaskUpdatePage {...protectedProps} />}
        />
        <Route
          path="/events/:eventId/tasks/:taskId/reviews"
          element={<TaskReviewsPage {...protectedProps} />}
        />
        <Route
          path="/events/:eventId/tasks/:taskId/edit"
          element={<TaskEditPage {...protectedProps} />}
        />
        <Route
          path="/events/:eventId/departments"
          element={<DepartmentListPage {...protectedProps} />}
        />
        <Route
          path="/events/:eventId/departments/new"
          element={<DepartmentCreatePage {...protectedProps} />}
        />
        <Route
          path="/events/:eventId/departments/:departmentId"
          element={<DepartmentDetailPage {...protectedProps} />}
        />
        <Route
          path="/events/:eventId/departments/:departmentId/dashboard"
          element={
            <LazyPageFallback>
              <DepartmentDashboardPage {...protectedProps} />
            </LazyPageFallback>
          }
        />
        <Route
          path="/events/:eventId/departments/:departmentId/members"
          element={<DepartmentMembersPage {...protectedProps} />}
        />
        <Route
          path="/events/:eventId/departments/:departmentId/tasks"
          element={<DepartmentTasksPage {...protectedProps} />}
        />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to={user ? '/' : '/login'} replace />} />
    </Routes>
  );
}

const RootAppLayout = ({ user, onLogout }) => {
  const location = useLocation();
  const eventId = resolveEventIdFromPath(location.pathname);
  const eventsQuery = useQuery({
    queryKey: ['events', 'layout'],
    queryFn: () => eventApi.getMyEvents(),
    enabled: Boolean(user?.userId),
    staleTime: 60_000,
  });
  const selectedEventQuery = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => eventApi.getEvent(eventId),
    enabled: Boolean(eventId),
  });
  const events = eventsQuery.data || [];
  const selectedEvent = selectedEventQuery.data || events.find((event) => String(event.id) === String(eventId)) || null;
  const showTelegramOnboarding = !['/profile', '/events/new'].includes(location.pathname);

  return (
    <AppLayout
      user={user}
      events={events}
      selectedEvent={selectedEvent}
      onLogout={onLogout}
      showTelegramOnboarding={showTelegramOnboarding}
    >
      <Outlet />
    </AppLayout>
  );
};

const resolveEventIdFromPath = (pathname) => {
  const match = pathname.match(/^\/events\/([^/]+)/);
  if (!match || match[1] === 'new') {
    return null;
  }
  return match[1];
};

const LazyPageFallback = ({ children }) => (
  <Suspense
    fallback={
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 text-sm font-semibold text-gray-600">
        Đang tải trang...
      </div>
    }
  >
    {children}
  </Suspense>
);

export default App;
