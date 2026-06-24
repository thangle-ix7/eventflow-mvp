import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Mail,
  Send,
  ShieldCheck,
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
const DEFAULT_EMAIL_FORM = {
  recipientMode: 'selected',
  subject: '',
  message: '',
};

const AdminUserListPage = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState(() => new Set());
  const [emailForm, setEmailForm] = useState(DEFAULT_EMAIL_FORM);
  const [sendResult, setSendResult] = useState(null);

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

  const sendEmailMutation = useMutation({
    mutationFn: userApi.sendAdminEmail,
    onSuccess: (result) => {
      setSendResult(result);
      setEmailForm(DEFAULT_EMAIL_FORM);
      setSelectedUserIds(new Set());
    },
  });

  const users = usersQuery.data?.content || EMPTY_USERS;
  const isLastPage = usersQuery.data?.last !== false;
  const selectedIds = useMemo(() => Array.from(selectedUserIds), [selectedUserIds]);
  const pageUserIds = users.map((item) => item.userId);
  const allPageSelected = pageUserIds.length > 0 && pageUserIds.every((id) => selectedUserIds.has(id));
  const canSendSelected = emailForm.recipientMode === 'all' || selectedIds.length > 0;
  const canSubmitEmail = canSendSelected && emailForm.subject.trim() && emailForm.message.trim() && !sendEmailMutation.isPending;

  const openUser = (userId) => {
    navigate(`/admin/users/${userId}`);
  };

  const toggleUser = (userId) => {
    setSelectedUserIds((current) => {
      const next = new Set(current);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const toggleCurrentPage = () => {
    setSelectedUserIds((current) => {
      const next = new Set(current);
      if (allPageSelected) {
        pageUserIds.forEach((id) => next.delete(id));
      } else {
        pageUserIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const handleEmailFieldChange = (field) => (event) => {
    setSendResult(null);
    setEmailForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const submitEmail = (event) => {
    event.preventDefault();
    if (!canSubmitEmail) {
      return;
    }

    sendEmailMutation.mutate({
      sendAll: emailForm.recipientMode === 'all',
      userIds: emailForm.recipientMode === 'selected' ? selectedIds : [],
      search: emailForm.recipientMode === 'all' ? search : '',
      subject: emailForm.subject.trim(),
      message: emailForm.message.trim(),
    });
  };

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <PageHeader
        eyebrow="Admin"
        title="Quản lý user"
        description="Xem danh sách tài khoản, tick user cần liên hệ hoặc gửi email hàng loạt theo bộ lọc hiện tại."
        meta={
          <span className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-white px-3 py-1 text-xs font-black text-sky-700 shadow-sm">
            <Users className="h-4 w-4" />
            {usersQuery.data?.totalElements || 0} user
          </span>
        }
      />

      <section className="grid gap-4 rounded-[2rem] border border-sky-100 bg-white p-4 shadow-xl shadow-sky-100/70 lg:grid-cols-[minmax(0,0.9fr)_minmax(360px,1.1fr)]">
        <div className="space-y-3">
          <div className="relative max-w-xl">
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

          <div className="rounded-2xl border border-sky-100 bg-sky-50/50 p-4 text-sm font-semibold text-slate-600">
            <p className="font-black text-slate-900">Đã chọn {selectedIds.length} user</p>
            <p className="mt-1 leading-6">
              Chế độ hàng loạt sẽ gửi tới {search ? 'toàn bộ user khớp từ khóa hiện tại' : 'toàn bộ user trong hệ thống'}.
            </p>
          </div>
        </div>

        <form onSubmit={submitEmail} className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black text-slate-950">Gửi email cho user</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">Nội dung sẽ được gửi qua SMTP cấu hình trong backend.</p>
            </div>
            <CheckSquare className="h-5 w-5 text-sky-500" />
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <label className="flex cursor-pointer items-center gap-2 rounded-2xl border border-sky-100 bg-white px-3 py-2 text-sm font-black text-slate-700">
              <input
                type="radio"
                name="recipientMode"
                value="selected"
                checked={emailForm.recipientMode === 'selected'}
                onChange={handleEmailFieldChange('recipientMode')}
                className="h-4 w-4 accent-sky-500"
              />
              User được tick
            </label>
            <label className="flex cursor-pointer items-center gap-2 rounded-2xl border border-sky-100 bg-white px-3 py-2 text-sm font-black text-slate-700">
              <input
                type="radio"
                name="recipientMode"
                value="all"
                checked={emailForm.recipientMode === 'all'}
                onChange={handleEmailFieldChange('recipientMode')}
                className="h-4 w-4 accent-sky-500"
              />
              Hàng loạt
            </label>
          </div>

          <input
            value={emailForm.subject}
            onChange={handleEmailFieldChange('subject')}
            placeholder="Tiêu đề email"
            maxLength={160}
            className="h-11 w-full rounded-2xl border border-sky-100 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100"
          />
          <textarea
            value={emailForm.message}
            onChange={handleEmailFieldChange('message')}
            placeholder="Nội dung email"
            rows={5}
            maxLength={10000}
            className="w-full rounded-2xl border border-sky-100 bg-white px-3 py-3 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100"
          />

          {sendEmailMutation.error && (
            <ErrorState error={sendEmailMutation.error} title="Không gửi được email" onDismiss={() => sendEmailMutation.reset()} />
          )}

          {sendResult && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
              Đã gửi {sendResult.sentCount}/{sendResult.requestedCount} email
              {sendResult.failedCount > 0 ? `, lỗi ${sendResult.failedCount} email.` : '.'}
            </div>
          )}

          <Button type="submit" disabled={!canSubmitEmail} className="w-full">
            <Send className="h-4 w-4" />
            {sendEmailMutation.isPending ? 'Đang gửi...' : 'Gửi email'}
          </Button>
        </form>
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
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="border-b border-sky-100 bg-sky-50/70 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
              <tr>
                <th className="w-12 px-5 py-4">
                  <input
                    type="checkbox"
                    checked={allPageSelected}
                    onChange={toggleCurrentPage}
                    aria-label="Chọn tất cả user trong trang"
                    className="h-4 w-4 rounded border-sky-200 accent-sky-500"
                  />
                </th>
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
                  <td className="px-5 py-4" onClick={(event) => event.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedUserIds.has(item.userId)}
                      onChange={() => toggleUser(item.userId)}
                      aria-label={`Chọn ${item.name || item.email}`}
                      className="h-4 w-4 rounded border-sky-200 accent-sky-500"
                    />
                  </td>
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

const formatRole = (role) => (role === 'ADMIN' ? 'Admin' : 'User');

export default AdminUserListPage;
