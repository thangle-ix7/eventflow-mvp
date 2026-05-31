import { useQuery } from '@tanstack/react-query';
import dashboardApi from '../api/dashboardApi';
import DonutChart from './DonutChart';

const Dashboard = ({ eventId }) => {
  const { data: summary, isLoading, error } = useQuery({
    queryKey: ['dashboardSummary', eventId],
    queryFn: () => dashboardApi.getSummary(eventId),
    refetchInterval: 30000,        // Smart polling: refetch every 30s
    refetchIntervalInBackground: false, // Stop when tab is hidden
  });

  const getDaysColor = (days) => {
    if (days < 0) return 'text-gray-500';   // Event passed
    if (days < 3) return 'text-red-600 animate-pulse'; // Critical
    if (days < 7) return 'text-amber-500';  // Warning
    return 'text-emerald-600';              // Safe
  };

  const getDaysLabel = (days) => {
    if (days < 0) return `Sự kiện đã diễn ra ${Math.abs(days)} ngày`;
    if (days === 0) return 'Sự kiện diễn ra HÔM NAY!';
    if (days === 1) return 'Còn 1 ngày nữa!';
    return `Còn ${days} ngày nữa`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-gray-500 text-lg">Đang tải dữ liệu dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-600">
        Lỗi tải dữ liệu: {error.message}
      </div>
    );
  }

  if (!summary) return null;

  const daysColor = getDaysColor(summary.daysUntilEvent);
  const daysLabel = getDaysLabel(summary.daysUntilEvent);

  return (
    <div className="space-y-8">
      {/* ── Event Countdown Banner ── */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="text-indigo-100 text-sm font-medium uppercase tracking-wider">Sự kiện</p>
            <p className={`text-4xl font-extrabold mt-1 ${daysColor}`}>
              {daysLabel}
            </p>
          </div>
          <div className="text-right">
            <p className="text-indigo-100 text-sm">Tổng công việc</p>
            <p className="text-3xl font-bold">{summary.totalTasks}</p>
          </div>
        </div>
      </div>

      {/* ── Stats Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Donut Chart Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col items-center">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Tiến độ chung</h3>
          <DonutChart percentage={summary.progressPercentage} />
          <p className="mt-4 text-sm text-gray-600">
            <span className="font-bold text-gray-900">{summary.completedTasks}</span> / {summary.totalTasks} công việc hoàn thành
          </p>
        </div>

        {/* Overdue Alert Card */}
        <div className={`rounded-2xl shadow-sm border p-6 flex flex-col items-center justify-center ${
          summary.overdueTasksCount > 0
            ? 'bg-red-50 border-red-200'
            : 'bg-emerald-50 border-emerald-200'
        }`}>
          <div className={`text-5xl font-extrabold ${
            summary.overdueTasksCount > 0 ? 'text-red-600' : 'text-emerald-600'
          }`}>
            {summary.overdueTasksCount}
          </div>
          <p className={`mt-2 text-sm font-semibold ${
            summary.overdueTasksCount > 0 ? 'text-red-700' : 'text-emerald-700'
          }`}>
            {summary.overdueTasksCount > 0 ? 'Công việc bị trễ hạn' : 'Không có công việc trễ hạn'}
          </p>
          {summary.overdueTasksCount > 0 && (
            <p className="mt-1 text-xs text-red-500">Cần xử lý ngay!</p>
          )}
        </div>

        {/* Quick Stats Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Thống kê nhanh</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600 text-sm">Tổng số ban</span>
              <span className="font-bold text-gray-900">{summary.departmentSummaries?.length || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 text-sm">Hoàn thành</span>
              <span className="font-bold text-emerald-600">{summary.completedTasks}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 text-sm">Chưa hoàn thành</span>
              <span className="font-bold text-amber-600">
                {(summary.totalTasks || 0) - (summary.completedTasks || 0)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 text-sm">Trễ hạn</span>
              <span className="font-bold text-red-600">{summary.overdueTasksCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Department Summaries ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-bold text-gray-800">Thống kê theo Ban Tổ Chức</h3>
        </div>
        <div className="divide-y divide-gray-100">
          {summary.departmentSummaries?.length === 0 ? (
            <div className="p-8 text-center text-gray-400 italic">Chưa có dữ liệu ban nào</div>
          ) : (
            summary.departmentSummaries.map((dept, idx) => (
              <div key={idx} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${
                    dept.overdueTasksCount > 0
                      ? 'bg-red-100 text-red-700'
                      : 'bg-indigo-100 text-indigo-700'
                  }`}>
                    {dept.departmentName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{dept.departmentName}</p>
                    <p className="text-sm text-gray-500">
                      Tổng {dept.totalTasks} công việc
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {dept.overdueTasksCount > 0 && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
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
