import { useEffect, useState } from 'react';
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
  const [error, setError] = useState('');
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
          setError(err.userMessage || err.message || 'Không thể xác thực email');
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
  }, [location.pathname, onLoginSuccess, token]);

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

  const title = mode === 'reset' ? 'Đặt lại mật khẩu' : 'EventFlow';
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md text-center text-gray-600">
          Đang xác thực email...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900">{title}</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Quản lý công việc Ban Tổ Chức
          </p>
        </div>

        {mode !== 'reset' && (
          <div className="flex rounded-xl bg-gray-100 p-1 mb-6">
            <button
              type="button"
              onClick={() => switchMode('login')}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                mode === 'login'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Đăng nhập
            </button>
            <button
              type="button"
              onClick={() => switchMode('signup')}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                mode === 'signup'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Đăng ký
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Họ tên
              </label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Nguyễn Văn A"
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          )}

          {mode !== 'reset' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="email@example.com"
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          )}

          {mode !== 'forgot' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {mode === 'reset' ? 'Mật khẩu mới' : 'Mật khẩu'}
              </label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          )}

          {error && (
            <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 whitespace-pre-line">
              {error}
            </div>
          )}

          {message && (
            <div className="px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors shadow-sm"
          >
            {loading ? 'Đang xử lý...' : submitLabel}
          </button>
        </form>

        {mode === 'login' && (
          <div className="mt-4 flex flex-col gap-2 text-center text-sm">
            <button
              type="button"
              onClick={() => switchMode('forgot')}
              className="text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Quên mật khẩu?
            </button>
            <button
              type="button"
              onClick={handleResendVerification}
              disabled={loading}
              className="text-gray-500 hover:text-gray-700 disabled:opacity-60"
            >
              Gửi lại email xác thực
            </button>
          </div>
        )}

        {mode === 'forgot' && (
          <button
            type="button"
            onClick={() => switchMode('login')}
            className="mt-4 w-full text-sm text-gray-500 hover:text-gray-700"
          >
            Quay lại đăng nhập
          </button>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
