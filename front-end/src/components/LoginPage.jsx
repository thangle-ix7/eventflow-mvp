import { useEffect, useState } from 'react';
import { CalendarDays, LockKeyhole, Mail, UserRound } from 'lucide-react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import authApi from '../api/authApi';

const LoginPage = ({ onLoginSuccess }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const initialMode =
    location.pathname === '/reset-password' && token ? 'reset' : 'login';
  const redirectAfterLogin = location.state?.from?.pathname || '/';

  const [mode, setMode] = useState(initialMode); // login | signup | forgot | reset
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(() => {
    if (localStorage.getItem('sessionExpired') !== 'true') {
      return '';
    }

    localStorage.removeItem('sessionExpired');
    return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
  });
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (location.pathname !== '/verify-email' || !token) {
      return;
    }

    let active = true;
    const verifyEmail = async () => {
      setLoading(true);
      setError('');
      setMessage('');

      try {
        const data = await authApi.verifyEmail(token);
        if (active) {
          onLoginSuccess(data, '/');
        }
      } catch (err) {
        if (active) {
          setMode('login');
          setError(
            err.userMessage ||
              'Link xác thực email không hợp lệ hoặc đã hết hạn. Nếu tài khoản chưa xác thực, hãy nhập email rồi bấm "Gửi lại email xác thực".'
          );
          navigate('/login', { replace: true });
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    verifyEmail();
    return () => {
      active = false;
    };
  }, [location.pathname, navigate, onLoginSuccess, token]);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
    setMessage('');
  };

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setError('');
    setMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (mode === 'login') {
        const data = await authApi.login({
          email: form.email,
          password: form.password,
        });
        onLoginSuccess(data, redirectAfterLogin);
        return;
      }

      if (mode === 'signup') {
        const data = await authApi.signup({
          name: form.name,
          email: form.email,
          password: form.password,
        });
        setMessage(data.message || 'Đăng ký thành công. Vui lòng kiểm tra email.');
        setMode('login');
        return;
      }

      if (mode === 'forgot') {
        const data = await authApi.forgotPassword(form.email);
        setMessage(data.message || 'Nếu email tồn tại, hệ thống sẽ gửi link đặt lại mật khẩu.');
        return;
      }

      if (mode === 'reset') {
        const data = await authApi.resetPassword({
          token,
          newPassword: form.password,
        });
        setMessage(data.message || 'Đặt lại mật khẩu thành công.');
        setMode('login');
        navigate('/', { replace: true });
      }
    } catch (err) {
      setError(err.userMessage || err.message || 'Đã có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!form.email) {
      setError('Vui lòng nhập email để gửi lại link xác thực');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const data = await authApi.resendVerification(form.email);
      setMessage(data.message || 'Nếu email tồn tại, hệ thống sẽ gửi lại link xác thực.');
    } catch (err) {
      setError(err.userMessage || err.message || 'Không thể gửi lại link xác thực');
    } finally {
      setLoading(false);
    }
  };

  const title = mode === 'reset' ? 'Đặt lại mật khẩu' : 'Event Flow';
  const submitLabel =
    mode === 'login'
      ? 'Đăng nhập'
      : mode === 'signup'
      ? 'Đăng ký'
      : mode === 'forgot'
      ? 'Gửi link đặt lại'
      : 'Đặt lại mật khẩu';

  if (location.pathname === '/verify-email' && token && loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600 shadow-sm">
          Đang xác thực email...
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-5 sm:py-4 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white">
              <img src="/event-flow-logo-mark.png" alt="" className="h-9 w-9 object-contain" />
            </span>
            <div className="min-w-0">
              <p className="text-xl font-extrabold text-slate-950">Event Flow</p>
              <p className="text-sm text-slate-500">
                Nhóm EXE • Dự án hỗ trợ sự kiện FPTU
              </p>
            </div>
          </div>
          <a
            href="mailto:event.flow.corp.vn@gmail.com"
            className="hidden shrink-0 text-sm font-semibold text-indigo-600 hover:text-indigo-700 sm:block"
          >
            event.flow.corp.vn@gmail.com
          </a>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-7xl flex-1 items-center gap-8 px-4 py-5 sm:px-5 sm:py-8 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
        <section className="hidden lg:block">
          <div className="max-w-xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-sm font-semibold text-indigo-700">
              <CalendarDays className="h-4 w-4" strokeWidth={1.8} />
              Event operations workspace
            </div>
            <h1 className="text-5xl font-extrabold leading-tight tracking-tight text-slate-950">
              Điều phối sự kiện rõ việc, rõ người, rõ tiến độ.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-slate-600">
              Theo dõi ban tổ chức, deadline và báo cáo công việc trong một giao diện tập trung cho đội FPTU.
            </p>
            <div className="mt-8 grid max-w-lg grid-cols-3 gap-3">
              {['Sự kiện', 'Ban tổ chức', 'Công việc'].map((item) => (
                <div key={item} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-sm font-semibold text-slate-900">{item}</p>
                  <p className="mt-1 text-xs text-slate-500">Quản lý tập trung</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="mx-auto w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:rounded-2xl sm:p-8">
          <div className="mb-6 sm:mb-8">
            <div className="mb-4 flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <img src="/event-flow-logo-mark.png" alt="" className="h-12 w-12 object-contain" />
            </div>
            <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">
              Event Flow
            </p>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
              {title}
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Quản lý công việc Ban Tổ Chức
            </p>
          </div>

          {mode !== 'reset' && (
            <div className="mb-5 flex rounded-xl bg-slate-100 p-1 sm:mb-6">
            <button
              type="button"
              onClick={() => switchMode('login')}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all active:translate-y-px ${
                mode === 'login'
                  ? 'bg-white text-slate-950 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Đăng nhập
            </button>
            <button
              type="button"
              onClick={() => switchMode('signup')}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all active:translate-y-px ${
                mode === 'signup'
                  ? 'bg-white text-slate-950 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Đăng ký
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label htmlFor="name" className="mb-1 block text-sm font-medium text-slate-700">
                Họ tên
              </label>
              <div className="relative">
                <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" strokeWidth={1.8} />
                <input
                  id="name"
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Nguyễn Văn A"
                  autoComplete="name"
                  required
                  className="min-h-11 w-full rounded-xl border border-slate-300 px-10 py-2.5 text-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>
            </div>
          )}

          {mode !== 'reset' && (
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
                Email
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" strokeWidth={1.8} />
                <input
                  id="email"
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="email@example.com"
                  autoComplete="email"
                  required
                  className="min-h-11 w-full rounded-xl border border-slate-300 px-10 py-2.5 text-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>
            </div>
          )}

          {mode !== 'forgot' && (
            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
                {mode === 'reset' ? 'Mật khẩu mới' : 'Mật khẩu'}
              </label>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" strokeWidth={1.8} />
                <input
                  id="password"
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  autoComplete={mode === 'reset' || mode === 'signup' ? 'new-password' : 'current-password'}
                  required
                  minLength={6}
                  className="min-h-11 w-full rounded-xl border border-slate-300 px-10 py-2.5 text-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 whitespace-pre-line">
              {error}
            </div>
          )}

          {message && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="min-h-11 w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Đang xử lý...' : submitLabel}
          </button>
        </form>

        {mode === 'login' && (
          <div className="mt-4 flex flex-col gap-2 text-center text-sm">
            <button
              type="button"
              onClick={() => switchMode('forgot')}
              className="font-medium text-indigo-600 hover:text-indigo-700"
            >
              Quên mật khẩu?
            </button>
            <button
              type="button"
              onClick={handleResendVerification}
              disabled={loading}
              className="text-slate-500 hover:text-slate-700 disabled:opacity-60"
            >
              Gửi lại email xác thực
            </button>
          </div>
        )}

        {mode === 'forgot' && (
          <button
            type="button"
            onClick={() => switchMode('login')}
            className="mt-4 w-full text-sm text-slate-500 hover:text-slate-700"
          >
            Đăng nhập
          </button>
        )}
      </div>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-4 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-5 lg:px-8">
          <span>© Event Flow - Nhóm EXE, dự án hỗ trợ sự kiện FPTU.</span>
          <a
            href="mailto:event.flow.corp.vn@gmail.com"
            className="font-semibold text-slate-700 hover:text-indigo-600"
          >
            event.flow.corp.vn@gmail.com
          </a>
        </div>
      </footer>
    </div>
  );
};

export default LoginPage;
