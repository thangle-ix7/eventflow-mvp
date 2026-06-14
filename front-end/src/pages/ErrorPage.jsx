import {
  AlertTriangle,
  ArrowLeft,
  FileQuestion,
  Home,
  LockKeyhole,
  RotateCcw,
  ServerCrash,
  WifiOff,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const ERROR_COPY = {
  accessDenied: {
    eyebrow: 'Truy cập bị từ chối',
    title: 'Bạn không có quyền truy cập',
    message: 'Tài khoản hiện tại chưa được cấp quyền để xem nội dung này.',
    statusLabel: '403',
    icon: LockKeyhole,
    tone: 'amber',
  },
  notFound: {
    eyebrow: 'Trang không khả dụng',
    title: 'Không tìm thấy nội dung này',
    message: 'Đường dẫn có thể đã thay đổi, bị xóa hoặc bạn chưa có quyền truy cập.',
    statusLabel: '404',
    icon: FileQuestion,
    tone: 'slate',
  },
  offline: {
    eyebrow: 'Không thể kết nối',
    title: 'Không kết nối được hệ thống',
    message: 'Vui lòng kiểm tra mạng hoặc thử lại sau ít phút.',
    statusLabel: 'NETWORK',
    icon: WifiOff,
    tone: 'sky',
  },
  serverError: {
    eyebrow: 'Dịch vụ tạm thời gián đoạn',
    title: 'Hệ thống đang gặp sự cố',
    message: 'EventFlow chưa thể xử lý yêu cầu này. Vui lòng thử lại sau.',
    statusLabel: '5xx',
    icon: ServerCrash,
    tone: 'rose',
  },
  unexpected: {
    eyebrow: 'Có lỗi xảy ra',
    title: 'Có lỗi xảy ra',
    message: 'EventFlow chưa thể hiển thị nội dung này. Bạn có thể thử tải lại hoặc quay về trang trước.',
    statusLabel: 'ERROR',
    icon: AlertTriangle,
    tone: 'sky',
  },
};

const TONE_CLASSES = {
  amber: {
    shell: 'border-amber-200 bg-amber-50 text-amber-700',
    icon: 'bg-amber-50 text-amber-600 ring-amber-100',
    primary: 'bg-gradient-to-r from-amber-500 to-orange-400 shadow-amber-100 hover:shadow-amber-200',
    glow: 'bg-amber-200/50',
    code: 'text-amber-600',
  },
  sky: {
    shell: 'border-sky-200 bg-sky-50 text-sky-700',
    icon: 'bg-sky-50 text-sky-600 ring-sky-100',
    primary: 'bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400 shadow-cyan-100 hover:shadow-cyan-200',
    glow: 'bg-sky-200/60',
    code: 'text-sky-600',
  },
  rose: {
    shell: 'border-rose-200 bg-rose-50 text-rose-700',
    icon: 'bg-rose-50 text-rose-600 ring-rose-100',
    primary: 'bg-gradient-to-r from-rose-500 to-red-500 shadow-rose-100 hover:shadow-rose-200',
    glow: 'bg-rose-200/50',
    code: 'text-rose-600',
  },
  slate: {
    shell: 'border-slate-200 bg-slate-50 text-slate-700',
    icon: 'bg-slate-100 text-slate-700 ring-slate-200',
    primary: 'bg-slate-950 shadow-slate-200 hover:bg-slate-800 hover:shadow-slate-300',
    glow: 'bg-slate-200/70',
    code: 'text-slate-700',
  },
};

const ErrorPage = ({
  variant = 'unexpected',
  title,
  message,
  showReload = true,
  homePath = '/',
  requestUrl,
  fullScreen = false,
}) => {
  const navigate = useNavigate();
  const copy = ERROR_COPY[variant] || ERROR_COPY.unexpected;
  const Icon = copy.icon;
  const tone = TONE_CLASSES[copy.tone] || TONE_CLASSES.sky;

  const handleReload = () => {
    window.location.reload();
  };

  const containerClassName = fullScreen
    ? 'flex min-h-screen items-center bg-[#F8FCFF] px-4 py-10'
    : 'mx-auto flex min-h-[calc(100vh-9rem)] max-w-6xl items-center px-4 py-10';

  const contentClassName = fullScreen ? 'mx-auto w-full max-w-6xl' : 'w-full';

  return (
    <div className={containerClassName}>
      <div className={contentClassName}>
        <section className="relative overflow-hidden rounded-[2rem] border border-sky-100 bg-white/90 shadow-2xl shadow-sky-100/80 backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-0">
            <div className={`absolute -left-24 -top-24 h-72 w-72 rounded-full ${tone.glow} blur-3xl`} />
            <div className="absolute -bottom-28 right-0 h-80 w-80 rounded-full bg-emerald-200/40 blur-3xl" />
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(14,165,233,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(14,165,233,0.06)_1px,transparent_1px)] bg-[size:44px_44px]" />
          </div>

          <div className={`relative border-b px-5 py-4 text-sm font-black ${tone.shell}`}>
            <span className="inline-flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-current shadow-sm" />
              {copy.eyebrow}
            </span>
          </div>

          <div className="relative grid gap-8 p-6 md:grid-cols-[1fr_16rem] md:items-start md:p-8 lg:p-10">
            <div className="min-w-0">
              <Link to="/" className="mb-7 inline-flex items-center gap-3">
                <span className="relative flex h-12 w-12 items-center justify-center">
                  <span className="absolute inset-0 rounded-2xl bg-gradient-to-br from-sky-400 to-emerald-400 opacity-40 blur-md" />
                  <span className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-lg shadow-sky-100">
                    <img src="/event-flow-logo-mark.png" alt="" className="h-8 w-8 object-contain" />
                  </span>
                </span>

                <span>
                  <span className="block text-xl font-black tracking-tight text-slate-950">
                    <span>Event</span>
                    <span className="bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                      Flow
                    </span>
                  </span>
                  <span className="block text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                    Request status
                  </span>
                </span>
              </Link>

              <div className={`mb-6 flex h-16 w-16 items-center justify-center rounded-3xl ring-1 shadow-lg ${tone.icon}`}>
                <Icon className="h-8 w-8" strokeWidth={1.8} />
              </div>

              <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-600">
                EventFlow request status
              </p>

              <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl lg:text-5xl">
                {title || copy.title}
              </h1>

              <p className="mt-4 max-w-2xl text-sm font-semibold leading-7 text-slate-600 sm:text-base">
                {message || copy.message}
              </p>

              {requestUrl && (
                <div className="mt-6 max-w-2xl overflow-hidden rounded-2xl border border-sky-100 bg-sky-50/70">
                  <div className="border-b border-sky-100 px-4 py-2">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                      Request URL
                    </p>
                  </div>
                  <p className="truncate px-4 py-3 font-mono text-xs font-semibold text-slate-600">
                    {requestUrl}
                  </p>
                </div>
              )}
            </div>

            <div className="relative overflow-hidden rounded-[2rem] border border-sky-100 bg-white/85 p-5 shadow-xl shadow-sky-100/70">
              <div className={`pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full ${tone.glow} blur-3xl`} />

              <div className="relative">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                  Mã lỗi
                </p>

                <p className={`mt-2 text-5xl font-black tracking-tight ${tone.code}`}>
                  {copy.statusLabel}
                </p>

                <p className="mt-4 text-sm font-semibold leading-6 text-slate-500">
                  Nếu bạn nghĩ đây là nhầm lẫn, hãy liên hệ leader sự kiện hoặc quản trị hệ thống.
                </p>

                <div className="mt-5 rounded-2xl border border-sky-100 bg-sky-50/70 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-600">
                    Gợi ý xử lý
                  </p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                    Thử quay lại trang trước, về trang chủ hoặc tải lại trang để đồng bộ dữ liệu mới nhất.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative flex flex-col gap-2 border-t border-sky-100 bg-sky-50/60 px-6 py-5 sm:flex-row sm:justify-end md:px-8 lg:px-10">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-sky-100 bg-white px-4 py-2 text-sm font-black text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-sky-50 hover:text-sky-600 active:translate-y-px"
            >
              <ArrowLeft className="h-4 w-4" strokeWidth={1.8} />
              Quay lại
            </button>

            <Link
              to={homePath}
              className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-4 py-2 text-sm font-black text-white shadow-xl transition hover:-translate-y-0.5 active:translate-y-px ${tone.primary}`}
            >
              <Home className="h-4 w-4" strokeWidth={1.8} />
              Về trang chủ
            </Link>

            {showReload && (
              <button
                type="button"
                onClick={handleReload}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-sky-100 bg-white px-4 py-2 text-sm font-black text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-sky-50 hover:text-sky-600 active:translate-y-px"
              >
                <RotateCcw className="h-4 w-4" strokeWidth={1.8} />
                Thử lại
              </button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default ErrorPage;