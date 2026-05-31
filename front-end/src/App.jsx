import { Suspense, lazy, useState } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import LoginPage from './components/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';
import DepartmentCreatePage from './pages/DepartmentCreatePage';
import DepartmentDetailPage from './pages/DepartmentDetailPage';
import DepartmentListPage from './pages/DepartmentListPage';
import DepartmentMembersPage from './pages/DepartmentMembersPage';
import DepartmentTasksPage from './pages/DepartmentTasksPage';
import EventCreatePage from './pages/EventCreatePage';
import EventDetailPage from './pages/EventDetailPage';
import EventListPage from './pages/EventListPage';
import EventMembersPage from './pages/EventMembersPage';
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
        <Route path="/" element={<EventListPage {...protectedProps} />} />
        <Route path="/profile" element={<ProfilePage {...protectedProps} />} />
        <Route path="/events/new" element={<EventCreatePage {...protectedProps} />} />
        <Route path="/events/:eventId" element={<EventDetailPage {...protectedProps} />} />
        <Route
          path="/events/:eventId/dashboard"
          element={
            <LazyPageFallback>
              <EventDashboardPage {...protectedProps} />
            </LazyPageFallback>
          }
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
      <Route path="*" element={<Navigate to={user ? '/' : '/login'} replace />} />
    </Routes>
  );
}

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
