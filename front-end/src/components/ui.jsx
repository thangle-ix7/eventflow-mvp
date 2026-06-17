import { AlertTriangle, CheckCircle2, Loader2, Search } from 'lucide-react';

const STATUS_META = {
  ACTIVE: { label: 'Đang diễn ra', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  DONE: { label: 'Hoàn thành', className: 'border-sky-200 bg-sky-50 text-sky-700' },
  CANCELLED: { label: 'Đã hủy', className: 'border-slate-200 bg-slate-100 text-slate-600' },
  TODO: { label: 'Cần làm', className: 'border-slate-200 bg-slate-50 text-slate-700' },
  IN_PROGRESS: { label: 'Đang làm', className: 'border-amber-200 bg-amber-50 text-amber-700' },
  IN_REVIEW: { label: 'Chờ duyệt', className: 'border-violet-200 bg-violet-50 text-violet-700' },
  LEADER: { label: 'Trưởng nhóm', className: 'border-sky-200 bg-sky-50 text-sky-700' },
  MEMBER: { label: 'Thành viên', className: 'border-slate-200 bg-slate-50 text-slate-700' },
  OVERDUE: { label: 'Quá hạn', className: 'border-red-200 bg-red-50 text-red-700' },
};

const PRIORITY_META = {
  LOW: { label: 'Thấp', className: 'border-slate-200 bg-slate-50 text-slate-700' },
  MEDIUM: { label: 'Trung bình', className: 'border-amber-200 bg-amber-50 text-amber-700' },
  HIGH: { label: 'Cao', className: 'border-red-200 bg-red-50 text-red-700' },
  URGENT: { label: 'Khẩn cấp', className: 'border-rose-300 bg-rose-50 text-rose-700' },
};

const baseControl =
  'rounded-2xl border border-sky-100 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400';

export const PageHeader = ({ eyebrow, title, description, actions, meta }) => (
  <header className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
    <div className="min-w-0">
      {eyebrow && (
        <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-600">
          {eyebrow}
        </p>
      )}

      <h2 className={`${eyebrow ? 'mt-1' : ''} text-2xl font-black tracking-tight text-slate-950 sm:text-3xl`}>
        {title}
      </h2>

      {description && (
        <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
          {description}
        </p>
      )}

      {meta && (
        <div className="mt-3 flex flex-wrap gap-2 text-sm font-semibold text-slate-500">
          {meta}
        </div>
      )}
    </div>

    {actions && (
      <div className="flex flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
        {actions}
      </div>
    )}
  </header>
);

export const Button = ({ as: Component = 'button', variant = 'primary', className = '', children, ...props }) => {
  const variants = {
    primary: 'bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400 text-white shadow-lg shadow-cyan-100 hover:shadow-xl hover:shadow-cyan-200',
    secondary: 'border border-sky-100 bg-white text-slate-700 shadow-sm hover:bg-sky-50 hover:text-sky-700',
    subtle: 'text-sky-700 hover:bg-sky-50',
    danger: 'border border-red-200 bg-red-50 text-red-700 hover:bg-red-100',
  };

  return (
    <Component
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl px-4 py-2 text-sm font-black transition hover:-translate-y-0.5 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
};

export const Panel = ({ children, className = '' }) => (
  <section className={`rounded-[2rem] border border-sky-100 bg-white shadow-xl shadow-sky-100/70 ${className}`}>
    {children}
  </section>
);

export const Toolbar = ({ children, className = '' }) => (
  <Panel className={`p-4 ${className}`}>
    <div className="grid gap-3">{children}</div>
  </Panel>
);

export const TextInput = ({ icon: Icon = Search, className = '', ...props }) => (
  <label className="relative block">
    {props['aria-label'] && <span className="sr-only">{props['aria-label']}</span>}

    {Icon && (
      <Icon
        className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
        strokeWidth={1.8}
      />
    )}

    <input
      className={`${baseControl} w-full ${Icon ? 'pl-10' : ''} ${className}`}
      {...props}
    />
  </label>
);

export const SelectControl = ({ label, className = '', children, ...props }) => (
  <label className="flex min-w-0 flex-col gap-1.5 text-sm font-bold text-slate-700">
    {label && <span>{label}</span>}

    <select className={`${baseControl} ${className}`} {...props}>
      {children}
    </select>
  </label>
);

export const StatusBadge = ({ status, children, className = '' }) => {
  const meta = STATUS_META[status] || {
    label: status || children || 'Chưa rõ',
    className: 'border-slate-200 bg-slate-50 text-slate-700',
  };

  return (
    <span className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-black shadow-sm ${meta.className} ${className}`}>
      {children || meta.label}
    </span>
  );
};

export const PriorityBadge = ({ priority = 'MEDIUM', className = '' }) => {
  const meta = PRIORITY_META[priority] || PRIORITY_META.MEDIUM;

  return (
    <span className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-black shadow-sm ${meta.className} ${className}`}>
      {meta.label}
    </span>
  );
};

export const MetricCard = ({ icon: Icon, label, value, hint, tone = 'indigo' }) => {
  const tones = {
    indigo: 'bg-sky-50 text-sky-700',
    sky: 'bg-sky-50 text-sky-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    red: 'bg-red-50 text-red-700',
    slate: 'bg-slate-100 text-slate-700',
    violet: 'bg-violet-50 text-violet-700',
  };

  return (
    <Panel className="group relative overflow-hidden p-5 transition hover:-translate-y-1 hover:shadow-2xl hover:shadow-cyan-100">
      <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-sky-100/80 opacity-0 blur-2xl transition group-hover:opacity-100" />

      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-black tracking-tight text-slate-950">
            {value ?? 0}
          </p>
          {hint && <p className="mt-2 text-xs font-semibold text-slate-500">{hint}</p>}
        </div>

        {Icon && (
          <div className={`rounded-2xl p-3 shadow-sm ${tones[tone] || tones.indigo}`}>
            <Icon className="h-5 w-5" strokeWidth={1.8} />
          </div>
        )}
      </div>
    </Panel>
  );
};

export const LoadingState = ({ message = 'Đang tải dữ liệu...' }) => (
  <Panel className="relative flex items-center justify-center gap-3 overflow-hidden p-8 text-sm font-bold text-slate-500">
    <div className="pointer-events-none absolute -left-16 -top-16 h-40 w-40 rounded-full bg-sky-100 blur-3xl" />
    <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
      <Loader2 className="h-5 w-5 animate-spin" strokeWidth={1.8} />
    </div>
    <span className="relative">{message}</span>
  </Panel>
);

export const EmptyState = ({ icon: Icon = CheckCircle2, title, description, actions }) => (
  <Panel className="relative overflow-hidden p-6 text-center sm:p-9">
    <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-sky-100 blur-3xl" />
    <div className="pointer-events-none absolute -bottom-20 left-1/2 h-44 w-44 -translate-x-1/2 rounded-full bg-emerald-100/70 blur-3xl" />

    <div className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-gradient-to-br from-sky-500 to-emerald-400 text-white shadow-lg shadow-cyan-100">
      <Icon className="h-7 w-7" strokeWidth={1.8} />
    </div>

    <h3 className="relative mt-4 text-lg font-black text-slate-950">{title}</h3>

    {description && (
      <p className="relative mx-auto mt-2 max-w-md text-sm font-semibold leading-6 text-slate-500">
        {description}
      </p>
    )}

    {actions && (
      <div className="relative mt-5 flex flex-col justify-center gap-2 sm:flex-row">
        {actions}
      </div>
    )}
  </Panel>
);

export const ErrorState = ({ error, title = 'Không tải được dữ liệu', onDismiss }) => (
  <div className="flex items-start justify-between gap-3 rounded-[2rem] border border-red-200 bg-red-50 p-4 text-red-700 shadow-lg shadow-red-100/60">
    <div className="flex min-w-0 items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-red-600 shadow-sm">
        <AlertTriangle className="h-5 w-5" strokeWidth={1.8} />
      </div>

      <div>
        <p className="font-black">{title}</p>
        <p className="mt-1 text-sm font-semibold leading-6">
          {error?.userMessage || error?.message || error}
        </p>
      </div>
    </div>

    {onDismiss && (
      <button
        type="button"
        onClick={onDismiss}
        className="rounded-full px-3 py-1 text-sm font-black text-red-700 transition hover:bg-white hover:text-red-800"
      >
        Đóng
      </button>
    )}
  </div>
);

export const ProgressBar = ({ value = 0, tone = 'indigo' }) => {
  const colors = {
    indigo: 'bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400',
    sky: 'bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400',
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    red: 'bg-red-600',
    violet: 'bg-violet-600',
  };

  const safeValue = Math.min(Math.max(value, 0), 100);

  return (
    <div className="h-2.5 overflow-hidden rounded-full bg-sky-50 ring-1 ring-sky-100">
      <div
        className={`h-full rounded-full transition-all duration-700 ease-out ${colors[tone] || colors.indigo}`}
        style={{ width: `${safeValue}%` }}
      />
    </div>
  );
};
