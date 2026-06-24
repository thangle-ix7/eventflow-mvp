import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Mail,
  Send,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import { Button, EmptyState, ErrorState, LoadingState, PageHeader } from '../components/ui';
import UserAvatar from '../components/UserAvatar';
import userApi from '../api/userApi';

const PAGE_SIZE = 10;
const EMPTY_USERS = [];
const DEFAULT_EMAIL_FORM = {
  recipientMode: 'selected',
  subject: '',
  message: '',
};

const AdminUserEmailPage = () => {
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
    queryKey: ['adminEmailUsers', page, search],
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
  const selectedIds = useMemo(() => Array.from(selectedUserIds), [selectedUserIds]);
  const pageUserIds = users.map((item) => item.userId);
  const allPageSelected = pageUserIds.length > 0 && pageUserIds.every((id) => selectedUserIds.has(id));
  const isLastPage = usersQuery.data?.last !== false;
  const canSendSelected = emailForm.recipientMode === 'all' || selectedIds.length > 0;
  const canSubmitEmail = canSendSelected && emailForm.subject.trim() && emailForm.message.trim() && !sendEmailMutation.isPending;

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
        title="Gửi email cho user"
        description="Soạn email riêng cho các user được chọn hoặc gửi hàng loạt theo bộ lọc hiện tại."
        meta={
          <Button as={Link} to="/admin/users" variant="secondary" className="min-h-10 text-xs">
            <Users className="h-4 w-4" />
            Danh sách user
          </Button>
        }
      />

      <section className="grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(360px,1.05fr)]">
        <div className="space-y-4 rounded-[2rem] border border-sky-100 bg-white p-4 shadow-xl shadow-sky-100/70">
          <div className="relative">
            <Mail
              className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-sky-400"
              strokeWidth={1.8}
            />
            <input
              id="admin-email-user-search"
              name="search"
              aria-label="Tìm user để gửi email"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Tìm user theo tên hoặc email"
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

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sky-100 bg-sky-50/50 px-4 py-3 text-sm font-semibold text-slate-600">
            <span className="font-black text-slate-900">Đã chọn {selectedIds.length} user</span>
            <span>{emailForm.recipientMode === 'all' ? 'Đang gửi hàng loạt theo bộ lọc' : 'Tick user ở danh sách bên dưới'}</span>
          </div>

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
            <div className="overflow-hidden rounded-2xl border border-sky-100">
              <div className="flex items-center gap-3 border-b border-sky-100 bg-sky-50/70 px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                <input
                  type="checkbox"
                  checked={allPageSelected}
                  onChange={toggleCurrentPage}
                  aria-label="Chọn tất cả user trong trang"
                  className="h-4 w-4 rounded border-sky-200 accent-sky-500"
                />
                User trong trang này
              </div>

              <div className="divide-y divide-sky-50">
                {users.map((item) => (
                  <label
                    key={item.userId}
                    className="flex cursor-pointer items-center gap-3 px-4 py-3 transition hover:bg-sky-50/70"
                  >
                    <input
                      type="checkbox"
                      checked={selectedUserIds.has(item.userId)}
                      onChange={() => toggleUser(item.userId)}
                      aria-label={`Chọn ${item.name || item.email}`}
                      className="h-4 w-4 rounded border-sky-200 accent-sky-500"
                    />
                    <UserAvatar
                      userId={item.userId}
                      avatarUrl={item.avatarUrl}
                      name={item.name}
                      size="sm"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-black text-slate-950">{item.name || 'Chưa cập nhật tên'}</span>
                      <span className="mt-0.5 block truncate text-xs font-semibold text-slate-500">{item.email}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {users.length > 0 && (
            <div className="flex items-center justify-between gap-4">
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

        <form onSubmit={submitEmail} className="space-y-4 rounded-[2rem] border border-sky-100 bg-white p-5 shadow-xl shadow-sky-100/70 lg:sticky lg:top-24 lg:self-start">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-base font-black text-slate-950">Nội dung email</p>
              <p className="mt-1 text-sm font-semibold text-slate-500">Email được gửi qua SMTP cấu hình trong backend.</p>
            </div>
            <CheckSquare className="h-5 w-5 text-sky-500" />
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <label className="flex cursor-pointer items-center gap-2 rounded-2xl border border-sky-100 bg-sky-50/50 px-3 py-2 text-sm font-black text-slate-700">
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
            <label className="flex cursor-pointer items-center gap-2 rounded-2xl border border-sky-100 bg-sky-50/50 px-3 py-2 text-sm font-black text-slate-700">
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
            rows={8}
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
    </div>
  );
};

export default AdminUserEmailPage;
