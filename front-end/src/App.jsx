import { useState } from 'react';
import TelegramOnboarding from './components/TelegramOnboarding';
import Dashboard from './components/Dashboard';
import TaskBoard from './components/TaskBoard';
import LoginPage from './components/LoginPage';

function App() {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // eventId tạm hardcode = 1 sau khi login
  // TODO: sau này lấy từ danh sách event của user
  const currentEventId = 1;

  const handleLoginSuccess = (userData) => {
    localStorage.setItem('token', userData.token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
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
          <div className="flex items-center gap-3 mt-1">
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

        {/* Dashboard */}
        <section className="mb-12">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <h2 className="text-2xl font-bold text-gray-800">
              Dashboard Tổng Quan
            </h2>
            <span className="w-fit px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-full uppercase">
              Event #{currentEventId}
            </span>
          </div>
          <Dashboard eventId={currentEventId} />
        </section>

        {/* Task Board */}
        <section>
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            Danh Sách Công Việc
          </h2>
          <TaskBoard eventId={currentEventId} />
        </section>
      </main>
    </div>
  );
}

export default App;
