import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  CheckCircle2,
  Mail,
  MessageCircle,
  Phone,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
  XCircle,
} from 'lucide-react';
import { Button, ErrorState, LoadingState, PageHeader, Panel, StatusBadge } from '../components/ui';
import UserAvatar from '../components/UserAvatar';
import userApi from '../api/userApi';
import { formatDate } from '../utils/dateUtils';

const AdminUserDetailPage = () => {
  const { userId } = useParams();

  const userQuery = useQuery({
    queryKey: ['adminUser', userId],
    queryFn: () => userApi.getAdminUser(userId),
    enabled: Boolean(userId),
  });

  if (userQuery.isLoading) {
    return <LoadingState message="Đang tải chi tiết user..." />;
  }

  if (userQuery.error) {
    return (
      <ErrorState
        error={userQuery.error}
        title="Không tải được chi tiết user"
        onDismiss={() => userQuery.refetch()}
      />
    );
  }

  const user = userQuery.data;

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <PageHeader
        eyebrow="Admin user"
        title={user?.name || 'Chi tiết user'}
        description="Thông tin tài khoản, trạng thái xác thực và cấu hình cá nhân hiện có của user."
        actions={
          <Button as={Link} to="/admin/users" variant="secondary">
            <ArrowLeft className="h-4 w-4" />
            Danh sách user
          </Button>
        }
      />

      <Panel className="overflow-hidden">
        <div className="border-b border-sky-100 bg-gradient-to-r from-sky-50 via-white to-emerald-50 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <UserAvatar userId={user.userId} avatarUrl={user.avatarUrl} name={user.name} size="lg" />
              <div className="min-w-0">
                <h1 className="break-words text-2xl font-black text-slate-950">{user.name || 'Chưa cập nhật tên'}</h1>
                <p className="mt-1 break-all text-sm font-bold text-slate-500">{user.email}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <StatusBadge status={user.systemRole}>{formatRole(user.systemRole)}</StatusBadge>
                  <VerifyBadge verified={user.emailVerified} />
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-white/80 bg-white/80 px-4 py-3 text-sm font-black text-slate-600 shadow-sm">
              ID #{user.userId}
            </div>
          </div>
        </div>

        <div className="grid gap-4 p-5 md:grid-cols-2">
          <InfoTile icon={Mail} label="Email" value={user.email} />
          <InfoTile icon={Phone} label="Số điện thoại" value={user.phoneNumber || 'Chưa cập nhật'} />
          <InfoTile icon={ShieldCheck} label="Role hệ thống" value={formatRole(user.systemRole)} />
          <InfoTile icon={MessageCircle} label="Telegram" value={user.telegramChatId ? 'Đã liên kết' : 'Chưa liên kết'} />
          <InfoTile icon={SlidersHorizontal} label="Page size task" value={`${user.taskPageSize || 10} task/trang`} />
          <InfoTile icon={UserRound} label="Ngày tạo tài khoản" value={formatDate(user.createdAt)} />
        </div>
      </Panel>
    </div>
  );
};

const InfoTile = ({ icon: Icon, label, value }) => (
  <div className="flex min-w-0 items-start gap-3 rounded-2xl border border-sky-100 bg-sky-50/40 p-4">
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-sky-600 shadow-sm">
      <Icon className="h-5 w-5" strokeWidth={1.8} />
    </span>
    <span className="min-w-0">
      <span className="block text-xs font-black uppercase tracking-[0.16em] text-slate-400">{label}</span>
      <span className="mt-1 block break-words text-sm font-black text-slate-800">{value}</span>
    </span>
  </div>
);

const VerifyBadge = ({ verified }) => (
  <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-black ${verified ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
    {verified ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
    {verified ? 'Đã xác thực email' : 'Chưa xác thực email'}
  </span>
);

const formatRole = (role) => (role === 'ADMIN' ? 'Admin' : 'User');

export default AdminUserDetailPage;
