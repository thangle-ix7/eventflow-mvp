import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Layers3,
  ListChecks,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import dashboardApi from '../api/dashboardApi';
import DonutChart from './DonutChart';

const Dashboard = ({ eventId }) => {
  const { data: summary, isLoading, error } = useQuery({
    queryKey: ['dashboardSummary', eventId],
    queryFn: () => dashboardApi.getSummary(eventId),
    enabled: Boolean(eventId),
    refetchInterval: 30000, // Smart polling: refetch every 30s
    refetchIntervalInBackground: false, // Stop when tab is hidden
  });

  const getCountdownTone = (days) => {
    if (days < 0) return 'border-slate-200 bg-white text-slate-700';
    if (days < 3) return 'border-red-200 bg-red-50 text-red-700';
    if (days < 7) return 'border-amber-200 bg-amber-50 text-amber-700';
    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  };

  const getDaysLabel = (days) => {
    if (days < 0) return `Sự kiện đã diễn ra ${Math.abs(days)} ngày`;
    if (days === 0) return 'Sự kiện diễn ra HÔM NAY!';
    if (days === 1) return 'Còn 1 ngày nữa!';
    return `Còn ${days} ngày nữa`;
  };

  if (isLoading) {
    return (
      <div className="space-y-6" aria-live="polite" aria-busy="true">
        <div className="relative overflow-hidden rounded-[2rem] border border-sky-100 bg-white/80 p-6 shadow-xl shadow-sky-100/70">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-sky-50 to-transparent" />
          <div className="relative space-y-4">
            <div className="h-5 w-36 animate-pulse rounded-full bg-sky-100" />
            <div className="h-10 w-72 max-w-full animate-pulse rounded-2xl bg-slate-100" />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="h-24 animate-pulse rounded-3xl bg-sky-50" />
              <div className="h-24 animate-pulse rounded-3xl bg-emerald-50" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="h-64 animate-pulse rounded-[2rem] border border-sky-100 bg-white shadow-xl shadow-sky-100/60" />
          <div className="h-64 animate-pulse rounded-[2rem] border border-sky-100 bg-white shadow-xl shadow-sky-100/60" />
          <div className="h-64 animate-pulse rounded-[2rem] border border-sky-100 bg-white shadow-xl shadow-sky-100/60" />
        </div>

        <div className="h-80 animate-pulse rounded-[2rem] border border-sky-100 bg-white shadow-xl shadow-sky-100/60" />
        <span className="sr-only">Đang tải dữ liệu dashboard...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative overflow-hidden rounded-[2rem] border border-red-100 bg-white p-6 text-red-700 shadow-xl shadow-red-100/60">
        <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-red-100 blur-3xl" />
        <div className="relative flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600">
            <AlertTriangle className="h-6 w-6" strokeWidth={1.8} />
          </div>

          <div>
            <p className="text-lg font-black">Không tải được dashboard</p>
            <p className="mt-1 text-sm font-semibold leading-6 text-red-600">
              {error.userMessage || error.message}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!summary) return null;

  const countdownTone = getCountdownTone(summary.daysUntilEvent);
  const daysLabel = getDaysLabel(summary.daysUntilEvent);
  const remainingTasks = (summary.totalTasks || 0) - (summary.completedTasks || 0);

  return (
    <div className="space-y-6">
      <div className={`relative overflow-hidden rounded-[2rem] border p-6 shadow-xl shadow-sky-100/70 ${countdownTone}`}>
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-white/70 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-cyan-100/60 blur-3xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-current/10 bg-white/70 px-4 py-2 text-sm font-black uppercase tracking-[0.18em] backdrop-blur">
              <Clock3 className="h-4 w-4" strokeWidth={1.8} />
              Sự kiện
            </p>

            <p className="mt-4 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
              {daysLabel}
            </p>

            <p className="mt-3 max-w-xl text-sm font-semibold leading-6 opacity-80">
              Dashboard tự động cập nhật mỗi 30 giây để team nắm tiến độ mới nhất.
            </p>
          </div>

          <div className="grid gap-3 sm:min-w-[360px] sm:grid-cols-2">
            <MetricCard
              label="Tổng công việc"
              value={summary.totalTasks}
              icon={<ListChecks className="h-5 w-5" strokeWidth={1.8} />}
            />

            <MetricCard
              label="Còn lại"
              value={remainingTasks}
              icon={<Clock3 className="h-5 w-5" strokeWidth={1.8} />}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="relative overflow-hidden rounded-[2rem] border border-sky-100 bg-white p-6 shadow-xl shadow-sky-100/70 transition hover:-translate-y-1 hover:shadow-2xl hover:shadow-cyan-100">
          <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-sky-100 blur-3xl" />

          <div className="relative flex flex-col items-center">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-sky-50 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-sky-600">
              <TrendingUp className="h-4 w-4" strokeWidth={1.8} />
              Tiến độ chung
            </div>

            <DonutChart percentage={summary.progressPercentage} />

            <p className="mt-5 text-center text-sm font-semibold text-slate-600">
              <span className="font-black text-slate-950">{summary.completedTasks}</span> / {summary.totalTasks} công việc hoàn thành
            </p>
          </div>
        </div>

        <div
          className={`relative flex flex-col items-center justify-center overflow-hidden rounded-[2rem] border p-6 shadow-xl transition hover:-translate-y-1 hover:shadow-2xl ${
            summary.overdueTasksCount > 0
              ? 'border-red-100 bg-red-50 shadow-red-100/70 hover:shadow-red-100'
              : 'border-emerald-100 bg-emerald-50 shadow-emerald-100/70 hover:shadow-emerald-100'
          }`}
        >
          <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-white/70 blur-3xl" />

          <div
            className={`relative mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-white shadow-lg ${
              summary.overdueTasksCount > 0 ? 'text-red-600 shadow-red-100' : 'text-emerald-600 shadow-emerald-100'
            }`}
          >
            {summary.overdueTasksCount > 0 ? (
              <AlertTriangle className="h-8 w-8" strokeWidth={1.8} />
            ) : (
              <CheckCircle2 className="h-8 w-8" strokeWidth={1.8} />
            )}
          </div>

          <div
            className={`relative text-6xl font-black tracking-tight ${
              summary.overdueTasksCount > 0 ? 'text-red-700' : 'text-emerald-700'
            }`}
          >
            {summary.overdueTasksCount}
          </div>

          <p
            className={`relative mt-3 text-center text-sm font-black leading-6 ${
              summary.overdueTasksCount > 0 ? 'text-red-700' : 'text-emerald-700'
            }`}
          >
            {summary.overdueTasksCount > 0 ? 'Công việc trễ hạn chưa xong' : 'Không có công việc trễ hạn chưa xong'}
          </p>

          {summary.overdueTasksCount > 0 && (
            <p className="relative mt-1 rounded-full bg-white/70 px-3 py-1 text-xs font-black text-red-600">
              Cần xử lý ngay
            </p>
          )}
        </div>

        <div className="relative overflow-hidden rounded-[2rem] border border-sky-100 bg-white p-6 shadow-xl shadow-sky-100/70 transition hover:-translate-y-1 hover:shadow-2xl hover:shadow-cyan-100">
          <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-emerald-100 blur-3xl" />

          <div className="relative">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-emerald-600">
              <Sparkles className="h-4 w-4" strokeWidth={1.8} />
              Thống kê nhanh
            </div>

            <div className="space-y-3">
              <QuickStat label="Tổng số ban" value={summary.departmentSummaries?.length || 0} />
              <QuickStat label="Hoàn thành" value={summary.completedTasks} tone="success" />
              <QuickStat label="Chưa hoàn thành" value={remainingTasks} tone="warning" />
              <QuickStat label="Trễ hạn chưa xong" value={summary.overdueTasksCount} tone="danger" />
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-[2rem] border border-sky-100 bg-white shadow-xl shadow-sky-100/70">
        <div className="border-b border-sky-100 bg-gradient-to-r from-sky-50 via-white to-emerald-50 px-6 py-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="flex items-center gap-2 text-xl font-black text-slate-950">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-emerald-400 text-white shadow-lg shadow-cyan-100">
                  <Layers3 className="h-5 w-5" strokeWidth={1.8} />
                </span>
                Thống kê theo Ban Tổ Chức
              </h3>
              <p className="mt-2 text-sm font-semibold text-slate-500">
                Theo dõi số lượng công việc và tình trạng trễ hạn của từng ban.
              </p>
            </div>
          </div>
        </div>

        <div className="divide-y divide-sky-50">
          {summary.departmentSummaries?.length === 0 ? (
            <div className="p-10 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-sky-50 text-sky-500">
                <Layers3 className="h-7 w-7" strokeWidth={1.8} />
              </div>
              <p className="text-sm font-bold text-slate-500">
                Chưa có dữ liệu ban nào
              </p>
            </div>
          ) : (
            summary.departmentSummaries.map((dept, idx) => (
              <div
                key={idx}
                className="flex flex-col gap-4 px-6 py-5 transition hover:bg-sky-50/70 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-4">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-sm font-black shadow-sm ${
                      dept.overdueTasksCount > 0
                        ? 'bg-red-50 text-red-700 ring-1 ring-red-100'
                        : 'bg-gradient-to-br from-sky-500 to-emerald-400 text-white shadow-cyan-100'
                    }`}
                  >
                    {dept.departmentName.charAt(0).toUpperCase()}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate font-black text-slate-950">
                      {dept.departmentName}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-500">
                      Tổng {dept.totalTasks} công việc
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  {dept.overdueTasksCount > 0 && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-black text-red-700">
                      <AlertTriangle className="h-3.5 w-3.5" strokeWidth={2} />
                      {dept.overdueTasksCount} trễ hạn chưa xong
                    </span>
                  )}

                  {dept.overdueTasksCount === 0 && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700">
                      <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} />
                      Đúng tiến độ
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const MetricCard = ({ label, value, icon }) => (
  <div className="rounded-3xl border border-current/10 bg-white/75 p-5 shadow-sm backdrop-blur transition hover:-translate-y-1 hover:bg-white">
    <div className="mb-3 flex items-center justify-between gap-3">
      <p className="text-sm font-black opacity-75">{label}</p>
      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white shadow-sm">
        {icon}
      </span>
    </div>
    <p className="text-4xl font-black tracking-tight">{value}</p>
  </div>
);

const QuickStat = ({ label, value, tone = 'default' }) => {
  const toneClass = {
    default: 'text-slate-950 bg-slate-50',
    success: 'text-emerald-700 bg-emerald-50',
    warning: 'text-amber-700 bg-amber-50',
    danger: 'text-red-700 bg-red-50',
  }[tone];

  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-sky-50 bg-slate-50/70 px-4 py-3">
      <span className="text-sm font-semibold text-slate-600">{label}</span>
      <span className={`rounded-full px-3 py-1 text-sm font-black ${toneClass}`}>
        {value}
      </span>
    </div>
  );
};

export default Dashboard;