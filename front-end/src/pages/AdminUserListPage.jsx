import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  Activity,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Mail,
  Percent,
  ShieldCheck,
  UserCheck,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import { Button, EmptyState, ErrorState, LoadingState, PageHeader, StatusBadge } from '../components/ui';
import UserAvatar from '../components/UserAvatar';
import userApi from '../api/userApi';
import { formatDate } from '../utils/dateUtils';

const PAGE_SIZE = 10;
const EMPTY_USERS = [];

const AdminUserListPage = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setPage(0);
      setSearch(searchInput.trim());
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [searchInput]);

  const usersQuery = useQuery({
    queryKey: ['adminUsers', page, search],
    queryFn: () => userApi.getAdminUsers({ page, size: PAGE_SIZE, search }),
  });

  const metricsQuery = useQuery({
    queryKey: ['adminUserMetrics'],
    queryFn: userApi.getAdminUserMetrics,
  });

  const users = usersQuery.data?.content || EMPTY_USERS;
  const metrics = metricsQuery.data;
  const isLastPage = usersQuery.data?.last !== false;

  const openUser = (userId) => {
    navigate(`/admin/users/${userId}`);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <PageHeader
        eyebrow="Admin"
        title="Quản lý user"
        description="Xem danh sách tài khoản, phân trang từ backend và mở chi tiết từng user khi cần kiểm tra."
        meta={
          <span className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-white px-3 py-1 text-xs font-black text-sky-700 shadow-sm">
            <Users className="h-4 w-4" />
            {formatNumber(metrics?.totalUsers ?? usersQuery.data?.totalElements ?? 0)} user
          </span>
        }
      />

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={Users}
          label="Tổng users"
          value={metricsQuery.isLoading ? '...' : formatNumber(metrics?.totalUsers || 0)}
          helper="Tài khoản chưa xóa dữ liệu"
        />
        <MetricCard
          icon={UserCheck}
          label="Users active"
          value={metricsQuery.isLoading ? '...' : formatNumber(metrics?.activeUsers || 0)}
          helper="Đã xác thực email"
        />
        <MetricCard
          icon={Activity}
          label="DAU hôm nay"
          value={metricsQuery.isLoading ? '...' : formatNumber(metrics?.dailyActiveUsers || 0)}
          helper={`${formatPercent(metrics?.dailyActiveOnTotalRatio)} trên tổng users`}
        />
        <MetricCard
          icon={Percent}
          label="DAU/MAU"
          value={metricsQuery.isLoading ? '...' : formatPercent(metrics?.dauMauRatio)}
          helper={`${formatNumber(metrics?.monthlyActiveUsers || 0)} MAU tháng này`}
        />
      </section>

      {metricsQuery.error && (
        <ErrorState
          error={metricsQuery.error}
          title="Không tải được chỉ số user"
          onDismiss={() => metricsQuery.refetch()}
        />
      )}

      <section className="grid gap-4 xl:grid-cols-2">
        <ActivityLineChart
          title="DAU theo ngày"
          subtitle="User active từng ngày trong 30 ngày gần nhất"
          data={metrics?.dailyActiveSeries || EMPTY_USERS}
          isLoading={metricsQuery.isLoading}
          color="#0ea5e9"
        />
        <ActivityLineChart
          title="MAU theo tháng"
          subtitle="User active từng tháng trong 12 tháng gần nhất"
          data={metrics?.monthlyActiveSeries || EMPTY_USERS}
          isLoading={metricsQuery.isLoading}
          color="#10b981"
        />
      </section>

      <section className="flex flex-col gap-3 rounded-[2rem] border border-sky-100 bg-white p-4 shadow-xl shadow-sky-100/70 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-xl">
          <Mail
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-sky-400"
            strokeWidth={1.8}
          />
          <input
            id="admin-user-search"
            name="search"
            aria-label="Tìm kiếm user"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Tìm theo tên hoặc email"
            className="h-12 w-full rounded-2xl border border-sky-100 bg-sky-50/60 px-11 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-cyan-300 focus:bg-white focus:ring-4 focus:ring-cyan-100"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput('')}
              className="absolute right-3 top-1/2 rounded-xl p-1.5 text-slate-400 transition hover:bg-white hover:text-slate-700"
              aria-label="Xóa tìm kiếm"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <Button as={Link} to="/admin/users/email" variant="secondary" className="min-h-12 w-full md:w-auto">
          <Mail className="h-4 w-4" />
          Gửi email user
        </Button>
      </section>

      {usersQuery.isLoading ? (
        <LoadingState message="Đang tải danh sách user..." />
      ) : usersQuery.error ? (
        <ErrorState
          error={usersQuery.error}
          title="Không tải được danh sách user"
          onDismiss={() => usersQuery.refetch()}
        />
      ) : users.length === 0 ? (
        <EmptyState
          icon={UserRound}
          title={search ? 'Không tìm thấy user' : 'Chưa có user'}
          description={search ? 'Không có tài khoản nào khớp với từ khóa hiện tại.' : 'Khi người dùng đăng ký, tài khoản sẽ xuất hiện ở đây.'}
        />
      ) : (
        <section className="overflow-x-auto rounded-[2rem] border border-sky-100 bg-white shadow-xl shadow-sky-100/70">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-sky-100 bg-sky-50/70 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
              <tr>
                <th className="px-5 py-4">User</th>
                <th className="px-5 py-4">Liên hệ</th>
                <th className="px-5 py-4">Role</th>
                <th className="px-5 py-4">Xác thực</th>
                <th className="px-5 py-4">Ngày tạo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sky-50">
              {users.map((item) => (
                <tr
                  key={item.userId}
                  role="button"
                  tabIndex={0}
                  onClick={() => openUser(item.userId)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      openUser(item.userId);
                    }
                  }}
                  className="cursor-pointer transition hover:bg-sky-50/70 focus:bg-sky-50 focus:outline-none"
                >
                  <td className="px-5 py-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <UserAvatar
                        userId={item.userId}
                        avatarUrl={item.avatarUrl}
                        name={item.name}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <p className="truncate font-black text-slate-950">{item.name || 'Chưa cập nhật tên'}</p>
                        <p className="mt-1 text-xs font-bold text-slate-400">ID #{item.userId}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="min-w-0 text-slate-600">
                      <p className="flex min-w-0 items-center gap-2 font-semibold">
                        <Mail className="h-4 w-4 shrink-0 text-sky-500" />
                        <span className="truncate">{item.email}</span>
                      </p>
                      <p className="mt-1 truncate text-xs font-semibold text-slate-400">
                        {item.phoneNumber || 'Chưa có số điện thoại'}
                      </p>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={item.systemRole}>{formatRole(item.systemRole)}</StatusBadge>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-black ${item.emailVerified ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
                      <ShieldCheck className="h-4 w-4" />
                      {item.emailVerified ? 'Đã xác thực' : 'Chưa xác thực'}
                    </span>
                  </td>
                  <td className="px-5 py-4 font-semibold text-slate-600">
                    {formatDate(item.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {users.length > 0 && (
        <div className="flex items-center justify-between gap-4 rounded-[2rem] border border-sky-100 bg-white p-4 shadow-sm">
          <div className="text-sm font-semibold text-slate-600">
            Trang {page + 1} - Hiển thị {users.length} / {usersQuery.data?.totalElements || 0}
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => setPage((old) => Math.max(old - 1, 0))}
              disabled={page === 0}
              className="text-xs"
            >
              <ChevronLeft size={16} />
              Trước
            </Button>
            <Button
              variant="secondary"
              onClick={() => setPage((old) => old + 1)}
              disabled={isLastPage}
              className="text-xs"
            >
              Sau
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

const ActivityLineChart = ({ title, subtitle, data = EMPTY_USERS, isLoading, color }) => {
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const chartData = useMemo(() => data.filter((item) => item?.label), [data]);

  const width = Math.max(620, chartData.length * 54);
  const height = 280;
  const padding = { top: 26, right: 28, bottom: 44, left: 52 };
  const chartLeft = padding.left;
  const chartRight = width - padding.right;
  const chartTop = padding.top;
  const chartBottom = height - padding.bottom;
  const chartWidth = chartRight - chartLeft;
  const chartHeight = chartBottom - chartTop;
  const maxValue = Math.max(...chartData.map((item) => Number(item.activeUsers || 0)), 1);
  const yMax = Math.max(Math.ceil(maxValue / 5) * 5, 5);
  const yTicks = Array.from({ length: 5 }, (_, index) => Math.round((yMax / 4) * index));
  const labelStep = Math.max(Math.ceil(chartData.length / 6), 1);
  const points = chartData.map((item, index) => {
    const value = Number(item.activeUsers || 0);
    const x = chartLeft + (index * chartWidth) / Math.max(chartData.length - 1, 1);
    const y = chartBottom - (value / yMax) * chartHeight;
    return { label: item.label, value, x, y, index };
  });
  const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
  const latestValue = points.length ? points[points.length - 1].value : 0;

  return (
    <section className="overflow-hidden rounded-[1.5rem] border border-sky-100 bg-white shadow-xl shadow-sky-100/60">
      <div className="flex items-start justify-between gap-3 border-b border-sky-100 bg-slate-50/70 px-5 py-4">
        <div>
          <h2 className="text-base font-black text-slate-950">{title}</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">{subtitle}</p>
        </div>
        <span className="rounded-2xl border border-white bg-white px-3 py-2 text-sm font-black text-slate-800 shadow-sm">
          {isLoading ? '...' : formatNumber(latestValue)}
        </span>
      </div>

      {isLoading ? (
        <div className="flex h-72 items-center justify-center text-sm font-bold text-slate-500">Đang tải biểu đồ...</div>
      ) : chartData.length === 0 ? (
        <div className="flex h-72 items-center justify-center px-4 text-center text-sm font-bold text-slate-500">Chưa có dữ liệu activity.</div>
      ) : (
        <div className="overflow-x-auto p-3">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="h-72 max-w-none"
            style={{ width: `${width}px` }}
            role="img"
            aria-label={title}
          >
            {yTicks.map((tick) => {
              const y = chartBottom - (tick / yMax) * chartHeight;
              return (
                <g key={tick}>
                  <text x={chartLeft - 12} y={y + 4} textAnchor="end" fill="#475569" className="text-[11px] font-bold">
                    {tick}
                  </text>
                  <line x1={chartLeft} y1={y} x2={chartRight} y2={y} stroke={tick === 0 ? '#64748b' : '#dbeafe'} strokeDasharray={tick === 0 ? undefined : '6 8'} />
                </g>
              );
            })}

            <path d={path} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            <path d={`${path} L ${points[points.length - 1].x} ${chartBottom} L ${points[0].x} ${chartBottom} Z`} fill={color} opacity="0.08" />

            {points.map((point) => (
              <g key={`${title}-${point.label}`}>
                <circle cx={point.x} cy={point.y} r="5" fill={color} stroke="#ffffff" strokeWidth="2" />
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="14"
                  fill="transparent"
                  onMouseEnter={() => setHoveredPoint(point)}
                  onMouseLeave={() => setHoveredPoint(null)}
                  onFocus={() => setHoveredPoint(point)}
                  onBlur={() => setHoveredPoint(null)}
                />
              </g>
            ))}

            {points.filter((point) => point.index === 0 || point.index === points.length - 1 || point.index % labelStep === 0).map((point) => (
              <text key={`${title}-label-${point.label}`} x={point.x} y={height - 14} textAnchor="middle" fill="#64748b" className="text-[10px] font-bold">
                {formatChartLabel(point.label)}
              </text>
            ))}

            {hoveredPoint && (
              <g className="pointer-events-none">
                <rect
                  x={Math.min(Math.max(hoveredPoint.x - 72, 8), width - 152)}
                  y={Math.max(hoveredPoint.y - 74, 8)}
                  width="144"
                  height="54"
                  rx="14"
                  fill="#ffffff"
                  stroke="#bae6fd"
                />
                <text x={Math.min(Math.max(hoveredPoint.x, 80), width - 80)} y={Math.max(hoveredPoint.y - 52, 30)} textAnchor="middle" fill="#0f172a" className="text-[11px] font-black">
                  {hoveredPoint.label}
                </text>
                <text x={Math.min(Math.max(hoveredPoint.x, 80), width - 80)} y={Math.max(hoveredPoint.y - 34, 48)} textAnchor="middle" fill="#475569" className="text-[11px] font-semibold">
                  {formatNumber(hoveredPoint.value)} active user
                </text>
              </g>
            )}
          </svg>
        </div>
      )}
    </section>
  );
};
const MetricCard = ({ icon: Icon, label, value, helper }) => (
  <div className="rounded-[1.5rem] border border-sky-100 bg-white p-4 shadow-lg shadow-sky-100/60">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">{label}</p>
        <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
      </div>
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
        <Icon className="h-5 w-5" />
      </span>
    </div>
    <p className="mt-3 flex items-center gap-2 text-xs font-bold text-slate-500">
      <CalendarDays className="h-4 w-4 text-cyan-500" />
      {helper}
    </p>
  </div>
);

const formatChartLabel = (label) => (label?.length > 7 ? label.slice(5) : label);

const formatNumber = (value) => new Intl.NumberFormat('vi-VN').format(Number(value) || 0);

const formatPercent = (value) => `${((Number(value) || 0) * 100).toFixed(1)}%`;

const formatRole = (role) => (role === 'ADMIN' ? 'Admin' : 'User');

export default AdminUserListPage;



