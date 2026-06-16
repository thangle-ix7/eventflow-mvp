import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft,
  ChevronRight,
  Mail,
  MessageSquareHeart,
  Reply,
  ShieldCheck,
} from 'lucide-react';
import { Button, EmptyState, ErrorState, LoadingState } from '../components/ui';
import feedbackApi from '../api/feedbackApi';
import { formatDate } from '../utils/dateUtils';

const PAGE_SIZE = 10;
const EMPTY_FEEDBACK = [];
const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả' },
  { value: 'OPEN', label: 'Open' },
  { value: 'REVIEWING', label: 'Đang xem' },
  { value: 'RESPONDED', label: 'Đã phản hồi' },
  { value: 'CLOSED', label: 'Đã đóng' },
];

const AdminFeedbackPage = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState('');
  const [responseDrafts, setResponseDrafts] = useState({});
  const [nextStatuses, setNextStatuses] = useState({});

  const feedbackQuery = useQuery({
    queryKey: ['adminFeedback', status, page],
    queryFn: () => feedbackApi.getAdminFeedback({ status, page, size: PAGE_SIZE }),
  });

  const respondMutation = useMutation({
    mutationFn: ({ feedbackId, payload }) => feedbackApi.respondToFeedback(feedbackId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminFeedback'] });
    },
  });

  const feedbackItems = feedbackQuery.data?.content || EMPTY_FEEDBACK;
  const isLastPage = feedbackQuery.data?.last !== false;

  const statusCounts = useMemo(() => {
    const counts = { OPEN: 0, REVIEWING: 0, RESPONDED: 0, CLOSED: 0 };
    feedbackItems.forEach((item) => {
      if (counts[item.status] !== undefined) counts[item.status] += 1;
    });
    return counts;
  }, [feedbackItems]);

  const handleStatusChange = (event) => {
    setStatus(event.target.value);
    setPage(0);
  };

  const submitResponse = (item) => {
    const responseMessage = (responseDrafts[item.id] ?? item.responseMessage ?? '').trim();
    const nextStatus = nextStatuses[item.id] || (responseMessage ? 'RESPONDED' : item.status);

    respondMutation.mutate({
      feedbackId: item.id,
      payload: {
        responseMessage: responseMessage || null,
        status: nextStatus,
      },
    });
  };

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-500">
            Admin feedback
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
            Hộp thư góp ý sản phẩm
          </h1>
          <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-600">
            Đọc nhu cầu, lỗi flow và phản hồi của người dùng. Feedback ẩn danh vẫn có thể được xử lý nội bộ,
            chỉ hiện email liên hệ nếu user chủ động để lại.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {Object.entries(statusCounts).map(([key, value]) => (
            <div key={key} className="rounded-2xl border border-sky-100 bg-white px-4 py-3 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">{key}</p>
              <p className="mt-1 text-xl font-black text-slate-950">{value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
        <label htmlFor="feedback-status-filter" className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
          Lọc trạng thái
        </label>
        <select
          id="feedback-status-filter"
          value={status}
          onChange={handleStatusChange}
          className="mt-2 h-11 w-full rounded-xl border border-sky-100 bg-sky-50/70 px-3 text-sm font-black text-slate-800 outline-none transition focus:border-cyan-300 focus:bg-white focus:ring-4 focus:ring-cyan-100 sm:max-w-xs"
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value || 'all'} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </section>

      {feedbackQuery.isLoading ? (
        <LoadingState message="Đang tải feedback..." />
      ) : feedbackQuery.error ? (
        <ErrorState
          error={feedbackQuery.error}
          title="Không tải được feedback"
          onDismiss={() => feedbackQuery.refetch()}
        />
      ) : feedbackItems.length === 0 ? (
        <EmptyState
          title="Chưa có feedback"
          description="Khi user gửi góp ý từ header, phản hồi sẽ xuất hiện ở đây."
          icon={MessageSquareHeart}
        />
      ) : (
        <div className="space-y-4">
          {feedbackItems.map((item) => {
            const draft = responseDrafts[item.id] ?? item.responseMessage ?? '';
            const nextStatus = nextStatuses[item.id] || item.status;
            const isSaving = respondMutation.isPending && respondMutation.variables?.feedbackId === item.id;

            return (
              <article key={item.id} className="overflow-hidden rounded-3xl border border-sky-100 bg-white shadow-sm">
                <div className="flex flex-col gap-3 border-b border-sky-100 bg-gradient-to-r from-sky-50 via-white to-emerald-50 px-5 py-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-sky-700 shadow-sm">
                        {item.category}
                      </span>
                      <span className={`rounded-full px-3 py-1 text-xs font-black ${getStatusTone(item.status)}`}>
                        {item.status}
                      </span>
                      {item.publicVisible && (
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                          Public allowed
                        </span>
                      )}
                      {item.anonymous && (
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                          Ẩn danh
                        </span>
                      )}
                    </div>

                    <p className="mt-3 text-sm font-semibold leading-6 text-slate-700">
                      {item.message}
                    </p>
                  </div>

                  <div className="shrink-0 text-sm font-bold text-slate-500 lg:text-right">
                    <p>{formatDate(item.createdAt)}</p>
                    <p className="mt-1">{item.eventName || 'Không gắn event'}</p>
                  </div>
                </div>

                <div className="grid gap-4 p-5 lg:grid-cols-[0.8fr_1.2fr]">
                  <div className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <InfoRow
                      icon={<ShieldCheck className="h-4 w-4" />}
                      label="Người gửi"
                      value={item.anonymous ? 'Ẩn danh' : item.userName || 'Không rõ'}
                    />
                    <InfoRow
                      icon={<Mail className="h-4 w-4" />}
                      label="Email liên hệ"
                      value={item.contactEmail || item.userEmail || 'Không có'}
                    />
                    {item.responseMessage && (
                      <div className="rounded-2xl bg-white p-3 text-sm font-semibold leading-6 text-slate-600">
                        <p className="mb-1 text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                          Phản hồi đã gửi
                        </p>
                        {item.responseMessage}
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <textarea
                      value={draft}
                      onChange={(event) =>
                        setResponseDrafts((old) => ({ ...old, [item.id]: event.target.value }))
                      }
                      rows={4}
                      placeholder="Nhập phản hồi nội bộ hoặc nội dung trả lời user..."
                      className="w-full rounded-2xl border border-sky-100 bg-sky-50/50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-cyan-300 focus:bg-white focus:ring-4 focus:ring-cyan-100"
                    />

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <select
                        value={nextStatus}
                        onChange={(event) =>
                          setNextStatuses((old) => ({ ...old, [item.id]: event.target.value }))
                        }
                        className="h-11 rounded-xl border border-sky-100 bg-white px-3 text-sm font-black text-slate-800 outline-none transition focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100"
                      >
                        {STATUS_OPTIONS.filter((option) => option.value).map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>

                      <Button onClick={() => submitResponse(item)} disabled={isSaving}>
                        <Reply size={16} />
                        {isSaving ? 'Đang lưu...' : 'Lưu phản hồi'}
                      </Button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {feedbackItems.length > 0 && (
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
          <div className="text-sm font-semibold text-slate-600">
            Trang {page + 1} - Hiển thị {feedbackItems.length} / {feedbackQuery.data?.totalElements || 0}
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

const InfoRow = ({ icon, label, value }) => (
  <div className="flex items-start gap-3 text-sm">
    <span className="mt-0.5 text-sky-600">{icon}</span>
    <span className="min-w-0">
      <span className="block text-xs font-black uppercase tracking-[0.14em] text-slate-400">
        {label}
      </span>
      <span className="mt-1 block break-words font-black text-slate-800">{value}</span>
    </span>
  </div>
);

const getStatusTone = (status) => {
  if (status === 'OPEN') return 'bg-rose-50 text-rose-700';
  if (status === 'REVIEWING') return 'bg-amber-50 text-amber-700';
  if (status === 'RESPONDED') return 'bg-emerald-50 text-emerald-700';
  return 'bg-slate-100 text-slate-600';
};

export default AdminFeedbackPage;
