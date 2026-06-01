import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, Clock3, Layers3 } from 'lucide-react';
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
        <div className="h-32 animate-pulse rounded-2xl border border-slate-200 bg-white" />
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="h-56 animate-pulse rounded-2xl border border-slate-200 bg-white" />
          <div className="h-56 animate-pulse rounded-2xl border border-slate-200 bg-white" />
          <div className="h-56 animate-pulse rounded-2xl border border-slate-200 bg-white" />
        </div>
        <div className="h-72 animate-pulse rounded-2xl border border-slate-200 bg-white" />
        <span className="sr-only">Đang tải dữ liệu dashboard...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-5 text-red-700">
        <AlertTriangle className="mt-0.5 h-5 w-5 flex-none" strokeWidth={1.8} />
        <div>
          <p className="font-semibold">Không tải được dashboard</p>
          <p className="mt-1 text-sm">{error.userMessage || error.message}</p>
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
      <div className={`rounded-2xl border p-5 shadow-sm ${countdownTone}`}>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide">
              <Clock3 className="h-4 w-4" strokeWidth={1.8} />
              Sự kiện
            </p>
            <p className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
              {daysLabel}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:min-w-72">
            <div className="rounded-xl border border-current/15 bg-white/70 p-4">
              <p className="text-sm opacity-80">Tổng công việc</p>
              <p className="mt-1 text-3xl font-bold">{summary.totalTasks}</p>
            </div>
            <div className="rounded-xl border border-current/15 bg-white/70 p-4">
              <p className="text-sm opacity-80">Còn lại</p>
              <p className="mt-1 text-3xl font-bold">{remainingTasks}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Tiến độ chung
          </h3>
          <DonutChart percentage={summary.progressPercentage} />
          <p className="mt-4 text-sm text-slate-600">
            <span className="font-bold text-slate-950">{summary.completedTasks}</span> / {summary.totalTasks} công việc hoàn thành
          </p>
        </div>

        <div className={`rounded-2xl shadow-sm border p-6 flex flex-col items-center justify-center ${
          summary.overdueTasksCount > 0
            ? 'bg-red-50 border-red-200'
            : 'bg-emerald-50 border-emerald-200'
        }`}>
          <div className={`mb-3 rounded-full p-3 ${
            summary.overdueTasksCount > 0 ? 'text-red-600' : 'text-emerald-600'
          }`}>
            {summary.overdueTasksCount > 0 ? (
              <AlertTriangle className="h-8 w-8" strokeWidth={1.8} />
            ) : (
              <CheckCircle2 className="h-8 w-8" strokeWidth={1.8} />
            )}
          </div>
          <div className={`text-5xl font-extrabold ${
            summary.overdueTasksCount > 0 ? 'text-red-700' : 'text-emerald-700'
          }`}>
            {summary.overdueTasksCount}
          </div>
          <p className={`mt-2 text-sm font-semibold ${
            summary.overdueTasksCount > 0 ? 'text-red-700' : 'text-emerald-700'
          }`}>
            {summary.overdueTasksCount > 0 ? 'Công việc bị trễ hạn' : 'Không có công việc trễ hạn'}
          </p>
          {summary.overdueTasksCount > 0 && <p className="mt-1 text-xs text-red-600">Cần xử lý ngay</p>}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Thống kê nhanh
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Tổng số ban</span>
              <span className="font-bold text-slate-950">{summary.departmentSummaries?.length || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Hoàn thành</span>
              <span className="font-bold text-emerald-600">{summary.completedTasks}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Chưa hoàn thành</span>
              <span className="font-bold text-amber-600">
                {remainingTasks}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Trễ hạn</span>
              <span className="font-bold text-red-600">{summary.overdueTasksCount}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
          <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <Layers3 className="h-5 w-5 text-indigo-600" strokeWidth={1.8} />
            Thống kê theo Ban Tổ Chức
          </h3>
        </div>
        <div className="divide-y divide-slate-100">
          {summary.departmentSummaries?.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              Chưa có dữ liệu ban nào
            </div>
          ) : (
            summary.departmentSummaries.map((dept, idx) => (
              <div key={idx} className="flex items-center justify-between gap-4 px-6 py-4 transition-colors hover:bg-slate-50">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${
                    dept.overdueTasksCount > 0
                      ? 'bg-red-100 text-red-700'
                      : 'bg-indigo-100 text-indigo-700'
                  }`}>
                    {dept.departmentName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-950">{dept.departmentName}</p>
                    <p className="text-sm text-slate-500">
                      Tổng {dept.totalTasks} công việc
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {dept.overdueTasksCount > 0 && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">
                      <AlertTriangle className="h-3 w-3" strokeWidth={2} />
                      {dept.overdueTasksCount} trễ hạn
                    </span>
                  )}
                  {dept.overdueTasksCount === 0 && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
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

export default Dashboard;
