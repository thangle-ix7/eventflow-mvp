import { useState } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import LoginPage from './components/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';
import DepartmentCreatePage from './pages/DepartmentCreatePage';
import DepartmentDashboardPage from './pages/DepartmentDashboardPage';
import DepartmentDetailPage from './pages/DepartmentDetailPage';
import DepartmentListPage from './pages/DepartmentListPage';
import EventCreatePage from './pages/EventCreatePage';
import EventDashboardPage from './pages/EventDashboardPage';
import EventDetailPage from './pages/EventDetailPage';
import EventListPage from './pages/EventListPage';
import EventMembersPage from './pages/EventMembersPage';
import TaskCreatePage from './pages/TaskCreatePage';
import TaskDetailPage from './pages/TaskDetailPage';
import TaskEditPage from './pages/TaskEditPage';
import TaskListPage from './pages/TaskListPage';

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

  const protectedProps = { user, onLogout: handleLogout };

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
        <Route path="/events/new" element={<EventCreatePage {...protectedProps} />} />
        <Route path="/events/:eventId" element={<EventDetailPage {...protectedProps} />} />
        <Route
          path="/events/:eventId/dashboard"
          element={<EventDashboardPage {...protectedProps} />}
        />
        <Route
          path="/events/:eventId/members"
          element={<EventMembersPage {...protectedProps} />}
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
          element={<DepartmentDashboardPage {...protectedProps} />}
        />
      </Route>
      <Route path="*" element={<Navigate to={user ? '/' : '/login'} replace />} />
    </Routes>
  );
}

export default App;
