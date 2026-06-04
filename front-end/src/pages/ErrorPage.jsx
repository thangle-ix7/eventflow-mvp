import { AlertTriangle, ArrowLeft, FileQuestion, Home, LockKeyhole, RotateCcw, ServerCrash, WifiOff } from 'lucide-react';
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
    tone: 'indigo',
  },
};

const TONE_CLASSES = {
  amber: {
    shell: 'border-amber-200 bg-amber-50 text-amber-700',
    icon: 'bg-amber-100 text-amber-700',
    primary: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-200',
  },
  indigo: {
    shell: 'border-indigo-200 bg-indigo-50 text-indigo-700',
    icon: 'bg-indigo-100 text-indigo-700',
    primary: 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-200',
  },
  rose: {
    shell: 'border-rose-200 bg-rose-50 text-rose-700',
    icon: 'bg-rose-100 text-rose-700',
    primary: 'bg-rose-600 hover:bg-rose-700 focus:ring-rose-200',
  },
  sky: {
    shell: 'border-sky-200 bg-sky-50 text-sky-700',
    icon: 'bg-sky-100 text-sky-700',
    primary: 'bg-sky-600 hover:bg-sky-700 focus:ring-sky-200',
  },
  slate: {
    shell: 'border-slate-200 bg-slate-50 text-slate-700',
    icon: 'bg-slate-100 text-slate-700',
    primary: 'bg-slate-900 hover:bg-slate-800 focus:ring-slate-200',
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
  const tone = TONE_CLASSES[copy.tone] || TONE_CLASSES.indigo;

  const handleReload = () => {
    window.location.reload();
  };

  const containerClassName = fullScreen
    ? 'flex min-h-screen items-center bg-slate-50 px-4 py-10'
    : 'mx-auto flex min-h-[calc(100vh-9rem)] max-w-5xl items-center px-4 py-10';
  const contentClassName = fullScreen ? 'mx-auto w-full max-w-5xl' : 'w-full';

  return (
    <div className={containerClassName}>
      <div className={contentClassName}>
      <section className="w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className={`border-b px-5 py-3 text-sm font-bold ${tone.shell}`}>
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-current" />
            {copy.eyebrow}
          </span>
        </div>
        <div className="grid gap-6 p-6 md:grid-cols-[1fr_auto] md:items-start md:p-8">
          <div className="min-w-0">
            <div className={`mb-5 flex h-12 w-12 items-center justify-center rounded-xl ${tone.icon}`}>
              <Icon className="h-6 w-6" strokeWidth={1.8} />
            </div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              EventFlow request status
            </p>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
              {title || copy.title}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              {message || copy.message}
            </p>
            {requestUrl && (
              <p className="mt-4 max-w-2xl truncate rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500">
                Yêu cầu: {requestUrl}
              </p>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 text-left md:min-w-48">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Mã lỗi</p>
            <p className="mt-1 text-3xl font-black tracking-tight text-slate-950">{copy.statusLabel}</p>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              Nếu bạn nghĩ đây là nhầm lẫn, hãy liên hệ leader sự kiện hoặc quản trị hệ thống.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50 px-6 py-4 sm:flex-row sm:justify-end md:px-8">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 active:translate-y-px"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.8} />
            Quay lại
          </button>
          <Link
            to={homePath}
            className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition active:translate-y-px focus:outline-none focus:ring-2 ${tone.primary}`}
          >
            <Home className="h-4 w-4" strokeWidth={1.8} />
            Về trang chủ
          </Link>
          {showReload && (
            <button
              type="button"
              onClick={handleReload}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 active:translate-y-px"
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
