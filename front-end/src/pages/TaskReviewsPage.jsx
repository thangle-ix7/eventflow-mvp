import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import {
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  MessageSquareText,
  RotateCcw,
  Save,
  Send,
  XCircle,
} from 'lucide-react';
import AppLayout from '../components/AppLayout';
import eventApi from '../api/eventApi';
import taskApi from '../api/taskApi';
import { formatDate } from '../utils/dateUtils';
import { invalidateDashboardQueries } from '../utils/dashboardQueryUtils';

const TaskReviewsPage = ({ user, onLogout }) => {
  const { eventId, taskId } = useParams();
  const queryClient = useQueryClient();
  const [reviewForm, setReviewForm] = useState({ feedback: '', status: 'IN_PROGRESS' });

  const eventQuery = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => eventApi.getEvent(eventId),
    enabled: Boolean(eventId),
  });

  const taskQuery = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => taskApi.getTask(taskId),
    enabled: Boolean(taskId),
  });

  const reviewsQuery = useQuery({
    queryKey: ['taskReviews', taskId],
    queryFn: () => taskApi.getTaskReviews(taskId),
    enabled: Boolean(taskId),
  });

  const event = eventQuery.data;
  const task = taskQuery.data;
  const reviews = reviewsQuery.data || [];
  const isLeader = event?.role === 'LEADER';
  const canReview = isLeader && task?.status === 'IN_REVIEW';

  const invalidateTaskReviews = () => {
    queryClient.invalidateQueries({ queryKey: ['task', taskId] });
    queryClient.invalidateQueries({ queryKey: ['taskReviews', taskId] });
    queryClient.invalidateQueries({ queryKey: ['eventTaskPage', eventId] });
    invalidateDashboardQueries(queryClient, eventId);
  };

  const reviewTaskMutation = useMutation({
    mutationFn: taskApi.reviewTask,
    onSuccess: () => {
      setReviewForm({ feedback: '', status: 'IN_PROGRESS' });
      invalidateTaskReviews();
    },
  });

  const handleReviewSubmit = (event) => {
    event.preventDefault();
    reviewTaskMutation.mutate({
      taskId,
      feedback: reviewForm.feedback,
      status: reviewForm.status,
    });
  };

  return (
    <AppLayout
      user={user}
      events={event ? [event] : []}
      selectedEvent={event}
      onEventChange={() => {}}
      onLogout={onLogout}
    >
      <div className="space-y-6">
        <header>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-sky-600">
                  <ClipboardCheck size={15} strokeWidth={1.8} />
                  Task review
                </p>

                <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                  Review task
                </h2>

                <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-600">
                  {task?.title
                    ? `Duyệt kết quả, gửi feedback và cập nhật trạng thái cho task: ${task.title}.`
                    : 'Duyệt kết quả, gửi feedback và cập nhật trạng thái cho task.'}
                </p>
              </div>

            <div className="rounded-2xl border border-sky-100 bg-sky-50/70 px-4 py-3">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                Trạng thái hiện tại
              </p>
              <p className="mt-1 text-lg font-black text-slate-950">
                {task?.status || 'Đang tải...'}
              </p>
            </div>
          </div>

          {(eventQuery.isLoading || taskQuery.isLoading) && (
            <div className="mt-4 flex items-center gap-2 rounded-2xl border border-sky-100 bg-sky-50 p-4 text-sm font-black text-slate-500">
              <Loader2 size={18} className="animate-spin text-sky-600" />
              Đang tải thông tin task...
            </div>
          )}

          {(eventQuery.error || taskQuery.error) && (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
              {eventQuery.error?.userMessage || taskQuery.error?.userMessage || 'Không tải được thông tin task'}
            </div>
          )}
        </header>

        <section className="overflow-hidden rounded-[2rem] border border-sky-100 bg-white shadow-xl shadow-sky-100/70">
          <div className="flex flex-col gap-3 border-b border-sky-100 bg-gradient-to-r from-sky-50 via-white to-emerald-50 px-5 py-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-emerald-400 text-white shadow-lg shadow-cyan-100">
                <MessageSquareText size={20} strokeWidth={1.8} />
              </div>

              <div>
                <h3 className="text-lg font-black text-slate-950">
                  Gửi review
                </h3>
                <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                  Leader có thể duyệt task khi task đang ở trạng thái IN_REVIEW.
                </p>
              </div>
            </div>

            <ReviewPermissionBadge canReview={canReview} taskStatus={task?.status} />
          </div>

          {canReview ? (
            <form onSubmit={handleReviewSubmit} className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_260px_170px]">
              <label className="grid gap-2 text-sm font-black text-slate-700">
                Feedback cho người thực hiện
                <textarea
                  value={reviewForm.feedback}
                  onChange={(event) => setReviewForm((old) => ({ ...old, feedback: event.target.value }))}
                  rows={5}
                  maxLength={2000}
                  placeholder="Ví dụ: cần bổ sung ảnh minh chứng, sửa lại timeline, hoặc task đã đạt yêu cầu..."
                  className={`${inputClassName} min-h-36 resize-none py-3`}
                  required
                />
              </label>

              <label className="grid h-fit gap-2 text-sm font-black text-slate-700">
                Trạng thái sau review
                <select
                  value={reviewForm.status}
                  onChange={(event) => setReviewForm((old) => ({ ...old, status: event.target.value }))}
                  className={inputClassName}
                >
                  <option value="IN_PROGRESS">Yêu cầu sửa - IN_PROGRESS</option>
                  <option value="TODO">Trả về TODO</option>
                  <option value="DONE">Duyệt xong - DONE</option>
                  <option value="IN_REVIEW">Giữ IN_REVIEW</option>
                </select>

                <StatusPreview status={reviewForm.status} />
              </label>

              <button
                type="submit"
                disabled={reviewTaskMutation.isPending}
                className="inline-flex h-fit min-h-11 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400 px-4 py-2 text-sm font-black text-white shadow-xl shadow-cyan-100 transition hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {reviewTaskMutation.isPending ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <Save size={16} />
                )}
                Gửi review
              </button>

              {reviewTaskMutation.error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700 lg:col-span-3">
                  {reviewTaskMutation.error.userMessage || reviewTaskMutation.error.message}
                </div>
              )}
            </form>
          ) : (
            <div className="p-5">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold leading-6 text-slate-600">
                Bạn không có quyền review task này. Task cần ở trạng thái <span className="font-black text-slate-900">IN_REVIEW</span> và tài khoản cần là <span className="font-black text-slate-900">Leader</span>.
              </div>
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-[2rem] border border-sky-100 bg-white shadow-xl shadow-sky-100/70">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sky-100 bg-gradient-to-r from-sky-50 via-white to-emerald-50 px-5 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-emerald-400 text-white shadow-lg shadow-cyan-100">
                <CalendarDays size={20} strokeWidth={1.8} />
              </div>

              <div>
                <h3 className="text-lg font-black text-slate-950">
                  Lịch sử review
                </h3>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  Các lần leader phản hồi và thay đổi trạng thái task.
                </p>
              </div>
            </div>

            <span className="rounded-full border border-sky-100 bg-white px-3 py-1.5 text-xs font-black text-sky-600 shadow-sm">
              {reviews.length} review
            </span>
          </div>

          {reviewsQuery.isLoading && (
            <div className="flex items-center gap-2 p-5 text-sm font-black text-slate-500">
              <Loader2 className="animate-spin text-sky-600" size={18} />
              Đang tải review...
            </div>
          )}

          {!reviewsQuery.isLoading && reviews.length === 0 && (
            <div className="p-8 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-sky-50 text-sky-600">
                <ClipboardCheck size={26} strokeWidth={1.8} />
              </div>
              <p className="mt-4 text-sm font-black text-slate-700">
                Chưa có review.
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                Khi leader gửi review, lịch sử sẽ hiển thị tại đây.
              </p>
            </div>
          )}

          <div className="divide-y divide-sky-100">
            {reviews.map((review) => (
              <div key={review.id} className="p-5 transition hover:bg-sky-50/40">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-black text-slate-950">
                        {review.reviewerName}
                      </span>

                      <StatusTransitionPill
                        before={review.statusBefore}
                        after={review.statusAfter}
                      />

                      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1 text-xs font-black text-slate-500">
                        <CalendarDays size={13} />
                        {formatDate(review.reviewedAt)}
                      </span>
                    </div>

                    <p className="mt-3 whitespace-pre-wrap text-sm font-semibold leading-7 text-slate-700">
                      {review.feedback}
                    </p>
                  </div>

                  <ReviewResultIcon status={review.statusAfter} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppLayout>
  );
};

const ReviewPermissionBadge = ({ canReview, taskStatus }) => (
  <span
    className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-black shadow-sm ${
      canReview
        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
        : 'border-slate-200 bg-white text-slate-600'
    }`}
  >
    {canReview ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
    {canReview ? 'Có thể review' : `Không thể review${taskStatus ? ` · ${taskStatus}` : ''}`}
  </span>
);

const StatusPreview = ({ status }) => {
  const meta = {
    TODO: {
      label: 'Task sẽ được trả về TODO',
      className: 'border-slate-200 bg-slate-50 text-slate-700',
      icon: RotateCcw,
    },
    IN_PROGRESS: {
      label: 'Task sẽ quay lại đang làm',
      className: 'border-amber-200 bg-amber-50 text-amber-700',
      icon: RotateCcw,
    },
    IN_REVIEW: {
      label: 'Task vẫn giữ chờ duyệt',
      className: 'border-sky-200 bg-sky-50 text-sky-700',
      icon: ClipboardCheck,
    },
    DONE: {
      label: 'Task sẽ được duyệt hoàn thành',
      className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      icon: CheckCircle2,
    },
  }[status] || {
    label: status,
    className: 'border-slate-200 bg-slate-50 text-slate-700',
    icon: ClipboardCheck,
  };

  const Icon = meta.icon;

  return (
    <span className={`inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-black ${meta.className}`}>
      <Icon size={14} />
      {meta.label}
    </span>
  );
};

const StatusTransitionPill = ({ before, after }) => (
  <span className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-xs font-black text-sky-700">
    <span>{before}</span>
    <Send size={12} />
    <span>{after}</span>
  </span>
);

const ReviewResultIcon = ({ status }) => {
  const isDone = status === 'DONE';
  const isReturned = status === 'TODO' || status === 'IN_PROGRESS';

  return (
    <div
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-sm ${
        isDone
          ? 'bg-emerald-50 text-emerald-600'
          : isReturned
            ? 'bg-amber-50 text-amber-600'
            : 'bg-sky-50 text-sky-600'
      }`}
    >
      {isDone ? (
        <CheckCircle2 size={20} strokeWidth={1.8} />
      ) : isReturned ? (
        <RotateCcw size={20} strokeWidth={1.8} />
      ) : (
        <ClipboardCheck size={20} strokeWidth={1.8} />
      )}
    </div>
  );
};

const inputClassName = 'min-h-11 w-full min-w-0 rounded-2xl border border-sky-100 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-cyan-300 focus:bg-white focus:ring-4 focus:ring-cyan-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500';

export default TaskReviewsPage;
