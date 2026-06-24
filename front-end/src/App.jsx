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
import EventCheckInPage from './pages/EventCheckInPage';
import EventCheckInSessionPage from './pages/EventCheckInSessionPage';
import EventDetailPage from './pages/EventDetailPage';
import EventEditPage from './pages/EventEditPage';
import EventListPage from './pages/EventListPage';
import EventMembersPage from './pages/EventMembersPage';
import EventMilestonePage from './pages/EventMilestonePage';
import EventMilestoneCreatePage from './pages/EventMilestoneCreatePage';
import EventUtilityPage from './pages/EventUtilityPage';
import ErrorPage from './pages/ErrorPage';
import InvitationConfirmPage from './pages/InvitationConfirmPage';
import LandingPage from './pages/LandingPage';
import MemberDetailPage from './pages/MemberDetailPage';
import ProfilePage from './pages/ProfilePage';
import PricingPage from './pages/PricingPage';
import TaskCreatePage from './pages/TaskCreatePage';
import TaskAttachmentsPage from './pages/TaskAttachmentsPage';
import TaskDetailPage from './pages/TaskDetailPage';
import TaskEditPage from './pages/TaskEditPage';
import TaskListPage from './pages/TaskListPage';
import TaskReportsPage from './pages/TaskReportsPage';
import TaskReviewsPage from './pages/TaskReviewsPage';
import TaskUpdatePage from './pages/TaskUpdatePage';
import TemplateListPage from './pages/TemplateListPage';
import TemplateDetailPage from './pages/TemplateDetailPage';
import TemplateSelectPage from './pages/TemplateSelectPage';
import AdminTemplateListPage from './pages/AdminTemplateListPage';
import AdminTemplateCreatePage from './pages/AdminTemplateCreatePage';
import AdminTemplateDetailPage from './pages/AdminTemplateDetailPage';
import AdminFeedbackPage from './pages/AdminFeedbackPage';
import AdminDiscountCodePage from './pages/AdminDiscountCodePage';
import AdminUserListPage from './pages/AdminUserListPage';
import AdminUserDetailPage from './pages/AdminUserDetailPage';
import eventApi from './api/eventApi';
import userApi from './api/userApi';
import { identifyUser, resetAnalytics, trackEvent, trackPageView } from './lib/analytics';

const EventDashboardPage = lazy(() => import('./pages/EventDashboardPage'));
const DepartmentDashboardPage = lazy(() => import('./pages/DepartmentDashboardPage'));

function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const handleLoginSuccess = (userData, redirectTo = '/events') => {
    localStorage.setItem('token', userData.token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    identifyUser(userData);
    trackEvent('User Logged In', { user_id: String(userData.userId) });
    navigate(redirectTo, { replace: true });
  };

  const handleLogout = () => {
    trackEvent('User Logged Out', { user_id: user?.userId ? String(user.userId) : undefined });
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    resetAnalytics();
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

    identifyUser(user);
  }, [user]);

  useEffect(() => {
    trackPageView({
      pathname: location.pathname,
      search: location.search,
      userId: user?.userId,
      ...resolveRouteAnalyticsProperties(location.pathname),
    });
  }, [location.pathname, location.search, user?.userId]);

  useEffect(() => {
    const resizeTextarea = (textarea) => {
      if (!(textarea instanceof HTMLTextAreaElement) || textarea.offsetParent === null) {
        return;
      }

      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    };

    const resizeAllTextareas = () => {
      document.querySelectorAll('textarea').forEach(resizeTextarea);
    };

    const handleTextareaInput = (event) => {
      resizeTextarea(event.target);
    };

    const observer = new MutationObserver(() => {
      requestAnimationFrame(resizeAllTextareas);
    });

    requestAnimationFrame(resizeAllTextareas);
    document.addEventListener('input', handleTextareaInput, true);
    document.addEventListener('change', handleTextareaInput, true);
    window.addEventListener('resize', resizeAllTextareas);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      document.removeEventListener('input', handleTextareaInput, true);
      document.removeEventListener('change', handleTextareaInput, true);
      window.removeEventListener('resize', resizeAllTextareas);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!user?.userId) {
      return;
    }

    let cancelled = false;

    userApi
      .getProfile(user.userId, { preferCache: false })
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

  useEffect(() => {
    const handleApiError = (event) => {
      navigate('/error', {
        replace: false,
        state: event.detail,
      });
    };

    window.addEventListener('eventflow:api-error', handleApiError);
    return () => window.removeEventListener('eventflow:api-error', handleApiError);
  }, [navigate]);

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/pricing" element={<PricingPage user={user} />} />

      <Route
        path="/error"
        element={<ErrorRoutePage homePath={user ? '/events' : '/'} state={location.state} />}
      />

      <Route
        path="/login"
        element={
          user ? (
            <Navigate to="/events" replace />
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
        path="/invitations/confirm"
        element={<InvitationConfirmPage />}
      />

      <Route element={<ProtectedRoute user={user} />}>
        <Route element={<RootAppLayout {...protectedProps} />}>
          <Route path="/events" element={<EventListPage {...protectedProps} />} />
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
            path="/events/:eventId/check-in"
            element={<EventCheckInPage {...protectedProps} />}
          />

          <Route
            path="/events/:eventId/check-in/sessions/:sessionId"
            element={<EventCheckInSessionPage {...protectedProps} />}
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
            path="/events/:eventId/milestones"
            element={<EventMilestonePage {...protectedProps} />}
          />
          <Route
            path="/events/:eventId/milestones/new"
            element={<EventMilestoneCreatePage {...protectedProps} />}
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

          {/* Template User Routes */}
          <Route path="/events/templates" element={<TemplateListPage {...protectedProps} />} />
          <Route path="/events/templates/:templateId" element={<TemplateDetailPage {...protectedProps} />} />
          <Route path="/events/new/from-template" element={<TemplateSelectPage {...protectedProps} />} />
          
          {/* Template Admin Routes */}
          <Route path="/admin/templates" element={<AdminTemplateListPage {...protectedProps} />} />
          <Route path="/admin/templates/new" element={<AdminTemplateCreatePage {...protectedProps} />} />
          <Route path="/admin/templates/:templateId" element={<AdminTemplateDetailPage {...protectedProps} />} />
          <Route path="/admin/feedback" element={<AdminFeedbackPage {...protectedProps} />} />
          <Route path="/admin/discount-codes" element={<AdminDiscountCodePage {...protectedProps} />} />
          <Route path="/admin/users" element={<AdminUserListPage {...protectedProps} />} />
          <Route path="/admin/users/:userId" element={<AdminUserDetailPage {...protectedProps} />} />

          {/* Department Routes */}
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

      <Route
        path="*"
        element={
          <ErrorPage
            variant="notFound"
            showReload={false}
            homePath={user ? '/events' : '/'}
            fullScreen
          />
        }
      />
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
  const showTelegramOnboarding = location.pathname === '/profile';

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
  if (!match || match[1] === 'new' || match[1] === 'templates') {
    return null;
  }

  return match[1];
};

const resolveRouteAnalyticsProperties = (pathname) => {
  const segments = pathname.split('/').filter(Boolean);
  const properties = {};

  if (segments[0] === 'events' && segments[1] && segments[1] !== 'new') {
    properties.event_id = segments[1];
  }

  if (segments[2] === 'departments' && segments[3] && segments[3] !== 'new') {
    properties.department_id = segments[3];
  }

  if (segments[2] === 'tasks' && segments[3] && segments[3] !== 'new') {
    properties.task_id = segments[3];
  }

  return properties;
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

const ErrorRoutePage = ({ homePath, state }) => {
  const title = state?.title || resolveErrorTitle(state?.status);
  const message = state?.message || 'Event Flow chưa thể tải nội dung này. Vui lòng thử lại hoặc quay về trang trước.';

  return (
    <ErrorPage
      variant={resolveErrorVariant(state?.status)}
      title={title}
      message={message}
      homePath={homePath}
      requestUrl={state?.requestUrl}
      fullScreen
    />
  );
};

const resolveErrorVariant = (status) => {
  if (!status) {
    return 'offline';
  }

  if (status === 403) {
    return 'accessDenied';
  }

  if (status === 404) {
    return 'notFound';
  }

  if (status >= 500) {
    return 'serverError';
  }

  return 'unexpected';
};

const resolveErrorTitle = (status) => {
  if (!status) {
    return 'Không kết nối được hệ thống';
  }

  if (status === 403) {
    return 'Không có quyền truy cập';
  }

  if (status === 404) {
    return 'Không tìm thấy nội dung này';
  }

  if (status >= 500) {
    return 'Hệ thống đang gián đoạn';
  }

  return 'Có lỗi xảy ra';
};

export default App;








