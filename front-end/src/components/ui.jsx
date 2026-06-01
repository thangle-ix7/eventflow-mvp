import { AlertTriangle, CheckCircle2, Loader2, Search } from 'lucide-react';

const STATUS_META = {
  ACTIVE: { label: 'Đang diễn ra', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  DONE: { label: 'Hoàn thành', className: 'border-indigo-200 bg-indigo-50 text-indigo-700' },
  CANCELLED: { label: 'Đã hủy', className: 'border-slate-200 bg-slate-100 text-slate-600' },
  TODO: { label: 'Cần làm', className: 'border-slate-200 bg-slate-100 text-slate-700' },
  IN_PROGRESS: { label: 'Đang làm', className: 'border-amber-200 bg-amber-50 text-amber-700' },
  IN_REVIEW: { label: 'Chờ duyệt', className: 'border-violet-200 bg-violet-50 text-violet-700' },
  LEADER: { label: 'Trưởng nhóm', className: 'border-indigo-200 bg-indigo-50 text-indigo-700' },
  MEMBER: { label: 'Thành viên', className: 'border-slate-200 bg-slate-100 text-slate-700' },
  OVERDUE: { label: 'Quá hạn', className: 'border-red-200 bg-red-50 text-red-700' },
};

const baseControl =
  'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400';

export const PageHeader = ({ eyebrow, title, description, actions, meta }) => (
  <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
    <div className="min-w-0">
      {eyebrow && (
        <p className="text-sm font-semibold text-indigo-600">
          {eyebrow}
        </p>
      )}
      <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
        {title}
      </h2>
      {description && <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{description}</p>}
      {meta && <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-500">{meta}</div>}
    </div>
    {actions && <div className="flex flex-col gap-2 sm:flex-row sm:items-center">{actions}</div>}
  </section>
);

export const Button = ({ as: Component = 'button', variant = 'primary', className = '', children, ...props }) => {
  const variants = {
    primary: 'bg-indigo-600 text-white shadow-sm hover:bg-indigo-700',
    secondary: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
    subtle: 'text-indigo-700 hover:bg-indigo-50',
    danger: 'border border-red-200 bg-red-50 text-red-700 hover:bg-red-100',
  };

  return (
    <Component
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
};

export const Panel = ({ children, className = '' }) => (
  <section className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>
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
    {Icon && <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" strokeWidth={1.8} />}
    <input
      className={`${baseControl} w-full ${Icon ? 'pl-10' : ''} ${className}`}
      {...props}
    />
  </label>
);

export const SelectControl = ({ label, className = '', children, ...props }) => (
  <label className="flex min-w-0 flex-col gap-1 text-sm font-semibold text-slate-700">
    {label && <span>{label}</span>}
    <select className={`${baseControl} ${className}`} {...props}>
      {children}
    </select>
  </label>
);

export const StatusBadge = ({ status, children, className = '' }) => {
  const meta = STATUS_META[status] || { label: status || children || 'Chưa rõ', className: 'border-slate-200 bg-slate-100 text-slate-700' };

  return (
    <span className={`inline-flex w-fit items-center rounded-full border px-2.5 py-1 text-xs font-bold ${meta.className} ${className}`}>
      {children || meta.label}
    </span>
  );
};

export const MetricCard = ({ icon: Icon, label, value, hint, tone = 'indigo' }) => {
  const tones = {
    indigo: 'bg-indigo-50 text-indigo-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    red: 'bg-red-50 text-red-700',
    slate: 'bg-slate-100 text-slate-700',
    violet: 'bg-violet-50 text-violet-700',
  };

  return (
    <Panel className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">{value ?? 0}</p>
          {hint && <p className="mt-2 text-xs font-medium text-slate-500">{hint}</p>}
        </div>
        {Icon && (
          <div className={`rounded-xl p-3 ${tones[tone] || tones.indigo}`}>
            <Icon className="h-5 w-5" strokeWidth={1.8} />
          </div>
        )}
      </div>
    </Panel>
  );
};

export const LoadingState = ({ message = 'Đang tải dữ liệu...' }) => (
  <Panel className="flex items-center justify-center gap-2 p-8 text-sm font-medium text-slate-500">
    <Loader2 className="h-5 w-5 animate-spin" strokeWidth={1.8} />
    {message}
  </Panel>
);

export const EmptyState = ({ icon: Icon = CheckCircle2, title, description, actions }) => (
  <Panel className="p-8 text-center">
    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
      <Icon className="h-6 w-6" strokeWidth={1.8} />
    </div>
    <h3 className="mt-4 text-lg font-bold text-slate-950">{title}</h3>
    {description && <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{description}</p>}
    {actions && <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">{actions}</div>}
  </Panel>
);

export const ErrorState = ({ error, title = 'Không tải được dữ liệu', onDismiss }) => (
  <div className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
    <div className="flex min-w-0 items-start gap-3">
      <AlertTriangle className="mt-0.5 h-5 w-5 flex-none" strokeWidth={1.8} />
      <div>
        <p className="font-semibold">{title}</p>
        <p className="mt-1 text-sm leading-6">{error?.userMessage || error?.message || error}</p>
      </div>
    </div>
    {onDismiss && (
      <button type="button" onClick={onDismiss} className="text-sm font-semibold text-red-700 hover:text-red-800">
        Đóng
      </button>
    )}
  </div>
);

export const ProgressBar = ({ value = 0, tone = 'indigo' }) => {
  const colors = {
    indigo: 'bg-indigo-600',
    emerald: 'bg-emerald-600',
    amber: 'bg-amber-500',
    red: 'bg-red-600',
    violet: 'bg-violet-600',
  };

  return (
    <div className="h-2 rounded-full bg-slate-100">
      <div className={`h-2 rounded-full ${colors[tone] || colors.indigo}`} style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }} />
    </div>
  );
};
