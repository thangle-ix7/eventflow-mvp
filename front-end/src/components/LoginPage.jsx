import { useEffect, useState } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  UserRound,
  UsersRound,
} from 'lucide-react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import authApi from '../api/authApi';
import Header from '../components/Header';
import LandingFooter from '../components/LandingFooter';

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
  const [showPassword, setShowPassword] = useState(false);
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
    setShowPassword(false);
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
      <div className="flex min-h-screen flex-col bg-[#F8FCFF] text-slate-950">
        <Header showNav={false} showLogin={false} ctaLabel="Về trang chủ" ctaTo="/" />

        <main className="relative flex flex-1 items-center justify-center overflow-hidden px-5 py-16">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-40 -top-40 h-[420px] w-[420px] rounded-full bg-sky-300/35 blur-3xl" />
            <div className="absolute right-[-160px] bottom-[-120px] h-[460px] w-[460px] rounded-full bg-emerald-300/30 blur-3xl" />
          </div>

          <div className="relative w-full max-w-md rounded-[2rem] border border-sky-100 bg-white/85 p-8 text-center shadow-2xl shadow-sky-100/80 backdrop-blur-2xl">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-sky-500 to-emerald-400 text-white shadow-xl shadow-cyan-200">
              <ShieldCheck className="h-8 w-8" />
            </div>
            <h1 className="text-2xl font-black text-slate-950">Đang xác thực email</h1>
            <p className="mt-3 text-sm font-medium leading-6 text-slate-500">
              Vui lòng chờ trong giây lát, EventFlow đang kiểm tra link xác thực của bạn.
            </p>
          </div>
        </main>

        <LandingFooter />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#F8FCFF] text-slate-950">
      <Header showNav={false} showLogin={false} ctaLabel="Về trang chủ" ctaTo="/" />

      <main className="relative flex-1 overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(14,165,233,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(14,165,233,0.08)_1px,transparent_1px)] bg-[size:48px_48px] opacity-70" />
          <div className="absolute -left-40 -top-40 h-[460px] w-[460px] rounded-full bg-sky-300/35 blur-3xl" />
          <div className="absolute right-[-180px] top-24 h-[520px] w-[520px] rounded-full bg-emerald-300/30 blur-3xl" />
          <div className="absolute bottom-[-220px] left-1/2 h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-cyan-300/25 blur-3xl" />
        </div>

        <div className="relative mx-auto grid w-full max-w-7xl items-center gap-10 px-5 py-12 sm:py-16 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-20">
          <section className="hidden lg:block">
            <div className="max-w-xl">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-white/80 px-4 py-2 text-sm font-black text-sky-600 shadow-lg shadow-sky-100/80 backdrop-blur">
                <Sparkles className="h-4 w-4 text-emerald-500" />
                Event operations workspace
              </div>

              <h1 className="text-5xl font-black leading-tight tracking-tight text-slate-950">
                Điều phối sự kiện rõ việc, rõ người, rõ tiến độ.
              </h1>

              <p className="mt-6 max-w-lg text-lg font-medium leading-8 text-slate-600">
                Theo dõi ban tổ chức, deadline và báo cáo công việc trong một giao diện tập trung,
                giúp đội nhóm vận hành sự kiện mượt hơn.
              </p>

              <div className="mt-9 grid max-w-lg grid-cols-3 gap-4">
                <InfoCard
                  icon={<CalendarDays className="h-5 w-5" />}
                  title="Sự kiện"
                  description="Quản lý tập trung"
                />
                <InfoCard
                  icon={<UsersRound className="h-5 w-5" />}
                  title="Ban tổ chức"
                  description="Rõ vai trò"
                />
                <InfoCard
                  icon={<CheckCircle2 className="h-5 w-5" />}
                  title="Công việc"
                  description="Rõ deadline"
                />
              </div>

              <div className="mt-8 rounded-[2rem] border border-sky-100 bg-white/80 p-5 shadow-2xl shadow-sky-100/70 backdrop-blur">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-black text-slate-950">
                      FPTU Music Festival
                    </p>
                    <p className="mt-1 text-xs font-bold text-slate-400">
                      48 tasks • 6 teams • 78% completed
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-600">
                    Đang chạy
                  </span>
                </div>

                <div className="mt-5 h-3 overflow-hidden rounded-full bg-sky-100">
                  <div className="h-full w-[78%] rounded-full bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400" />
                </div>
              </div>
            </div>
          </section>

          <section className="mx-auto w-full max-w-md">
            <div className="relative">
              <div className="absolute inset-0 rounded-[2.5rem] bg-gradient-to-br from-sky-300/70 via-cyan-200/50 to-emerald-300/60 blur-3xl" />

              <div className="relative rounded-[2.5rem] border border-white bg-white/75 p-3 shadow-[0_30px_90px_rgba(14,165,233,0.22)] backdrop-blur-2xl">
                <div className="rounded-[2rem] border border-sky-100 bg-white p-6 shadow-xl shadow-sky-100/60 sm:p-8">
                  <div className="mb-7">
                    <div className="mb-5 flex h-16 w-16 items-center justify-center overflow-hidden rounded-3xl border border-sky-100 bg-white shadow-lg shadow-sky-100">
                      <img
                        src="/event-flow-logo-mark.png"
                        alt="EventFlow logo"
                        className="h-12 w-12 object-contain"
                      />
                    </div>

                    <p className="text-sm font-black uppercase tracking-[0.22em] text-sky-500">
                      EventFlow
                    </p>

                    <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                      {title}
                    </h1>

                    <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                      {mode === 'forgot'
                        ? 'Nhập email để nhận link đặt lại mật khẩu.'
                        : mode === 'reset'
                        ? 'Tạo mật khẩu mới cho tài khoản của bạn.'
                        : 'Quản lý công việc Ban Tổ Chức trong một flow rõ ràng.'}
                    </p>
                  </div>

                  {mode !== 'reset' && (
                    <div className="mb-6 flex rounded-2xl bg-sky-50 p-1.5">
                      <button
                        type="button"
                        onClick={() => switchMode('login')}
                        className={`flex-1 rounded-xl py-2.5 text-sm font-black transition-all active:translate-y-px ${
                          mode === 'login'
                            ? 'bg-white text-slate-950 shadow-md shadow-sky-100'
                            : 'text-slate-500 hover:text-sky-600'
                        }`}
                      >
                        Đăng nhập
                      </button>

                      <button
                        type="button"
                        onClick={() => switchMode('signup')}
                        className={`flex-1 rounded-xl py-2.5 text-sm font-black transition-all active:translate-y-px ${
                          mode === 'signup'
                            ? 'bg-white text-slate-950 shadow-md shadow-sky-100'
                            : 'text-slate-500 hover:text-sky-600'
                        }`}
                      >
                        Đăng ký
                      </button>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-4">
                    {mode === 'signup' && (
                      <div>
                        <label htmlFor="name" className="mb-2 block text-sm font-bold text-slate-700">
                          Họ tên
                        </label>
                        <div className="relative">
                          <UserRound
                            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                            strokeWidth={1.8}
                          />
                          <input
                            id="name"
                            type="text"
                            name="name"
                            value={form.name}
                            onChange={handleChange}
                            placeholder="Nguyễn Văn A"
                            autoComplete="name"
                            required
                            className="min-h-12 w-full rounded-2xl border border-sky-100 bg-sky-50/60 px-11 py-3 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-cyan-300 focus:bg-white focus:ring-4 focus:ring-cyan-100"
                          />
                        </div>
                      </div>
                    )}

                    {mode !== 'reset' && (
                      <div>
                        <label htmlFor="email" className="mb-2 block text-sm font-bold text-slate-700">
                          Email
                        </label>
                        <div className="relative">
                          <Mail
                            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                            strokeWidth={1.8}
                          />
                          <input
                            id="email"
                            type="email"
                            name="email"
                            value={form.email}
                            onChange={handleChange}
                            placeholder="email@example.com"
                            autoComplete="email"
                            required
                            className="min-h-12 w-full rounded-2xl border border-sky-100 bg-sky-50/60 px-11 py-3 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-cyan-300 focus:bg-white focus:ring-4 focus:ring-cyan-100"
                          />
                        </div>
                      </div>
                    )}

                    {mode !== 'forgot' && (
                      <div>
                        <label htmlFor="password" className="mb-2 block text-sm font-bold text-slate-700">
                          {mode === 'reset' ? 'Mật khẩu mới' : 'Mật khẩu'}
                        </label>

                        <div className="relative">
                          <LockKeyhole
                            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                            strokeWidth={1.8}
                          />

                          <input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            name="password"
                            value={form.password}
                            onChange={handleChange}
                            placeholder="••••••••"
                            autoComplete={mode === 'reset' || mode === 'signup' ? 'new-password' : 'current-password'}
                            required
                            minLength={6}
                            className="min-h-12 w-full rounded-2xl border border-sky-100 bg-sky-50/60 px-11 py-3 pr-12 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-cyan-300 focus:bg-white focus:ring-4 focus:ring-cyan-100"
                          />

                          <button
                            type="button"
                            onClick={() => setShowPassword((prev) => !prev)}
                            className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-slate-400 transition hover:bg-white hover:text-sky-600"
                            aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" strokeWidth={2} />
                            ) : (
                              <Eye className="h-4 w-4" strokeWidth={2} />
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {error && (
                      <div className="whitespace-pre-line rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold leading-6 text-red-700">
                        {error}
                      </div>
                    )}

                    {message && (
                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold leading-6 text-emerald-700">
                        {message}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="min-h-12 w-full rounded-2xl bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400 py-3 font-black text-white shadow-xl shadow-cyan-200 transition hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-cyan-200 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {loading ? 'Đang xử lý...' : submitLabel}
                    </button>
                  </form>

                  {mode === 'login' && (
                    <div className="mt-5 flex flex-col gap-3 text-center text-sm">
                      <button
                        type="button"
                        onClick={() => switchMode('forgot')}
                        className="font-bold text-sky-600 transition hover:text-sky-700"
                      >
                        Quên mật khẩu?
                      </button>

                      <button
                        type="button"
                        onClick={handleResendVerification}
                        disabled={loading}
                        className="font-semibold text-slate-500 transition hover:text-slate-700 disabled:opacity-60"
                      >
                        Gửi lại email xác thực
                      </button>
                    </div>
                  )}

                  {mode === 'forgot' && (
                    <button
                      type="button"
                      onClick={() => switchMode('login')}
                      className="mt-5 w-full text-sm font-bold text-slate-500 transition hover:text-sky-600"
                    >
                      Quay lại đăng nhập
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
};

const InfoCard = ({ icon, title, description }) => (
  <div className="rounded-3xl border border-sky-100 bg-white/80 p-4 shadow-xl shadow-sky-100/70 backdrop-blur transition hover:-translate-y-1 hover:shadow-2xl hover:shadow-cyan-100">
    <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-emerald-400 text-white shadow-lg shadow-cyan-200">
      {icon}
    </div>
    <p className="text-sm font-black text-slate-950">{title}</p>
    <p className="mt-1 text-xs font-bold text-slate-500">{description}</p>
  </div>
);

export default LoginPage;