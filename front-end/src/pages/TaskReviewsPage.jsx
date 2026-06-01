import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ClipboardCheck, Loader2, Save } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import eventApi from '../api/eventApi';
import taskApi from '../api/taskApi';
import { formatDate } from '../utils/dateUtils';
import { invalidateDashboardQueries } from '../utils/dashboardQueryUtils';

const TaskReviewsPage = ({ user, onLogout }) => {
  const { eventId, taskId } = useParams();
  const queryClient = useQueryClient();
  const [reviewForm, setReviewForm] = useState({ feedback: '', status: 'IN_PROGRESS' });

  const eventQuery = useQuery({ queryKey: ['event', eventId], queryFn: () => eventApi.getEvent(eventId), enabled: Boolean(eventId) });
  const taskQuery = useQuery({ queryKey: ['task', taskId], queryFn: () => taskApi.getTask(taskId), enabled: Boolean(taskId) });
  const reviewsQuery = useQuery({ queryKey: ['taskReviews', taskId], queryFn: () => taskApi.getTaskReviews(taskId), enabled: Boolean(taskId) });

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
    <AppLayout user={user} events={event ? [event] : []} selectedEvent={event} onEventChange={() => {}} onLogout={onLogout}>
      <div className="space-y-6">
        <Link to={`/events/${eventId}/tasks/${taskId}`} className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600">
          <ArrowLeft size={16} />
          Quay lại chi tiết task
        </Link>

        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Review task</h2>
              <p className="mt-1 text-sm text-gray-500">
                {task?.title || 'Task'} - leader feedback khi task đang IN_REVIEW và chọn trạng thái tiếp theo.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {task && <span className="w-fit rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">{task.status}</span>}
              <ClipboardCheck className="text-blue-600" size={24} />
            </div>
          </div>

          {canReview ? (
            <form onSubmit={handleReviewSubmit} className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_160px]">
              <textarea
                value={reviewForm.feedback}
                onChange={(event) => setReviewForm((old) => ({ ...old, feedback: event.target.value }))}
                rows={4}
                maxLength={2000}
                placeholder="Feedback cho người thực hiện task..."
                className="resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                required
              />
              <select
                value={reviewForm.status}
                onChange={(event) => setReviewForm((old) => ({ ...old, status: event.target.value }))}
                className="h-fit rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              >
                <option value="IN_PROGRESS">Yêu cầu sửa - IN_PROGRESS</option>
                <option value="TODO">Trả về TODO</option>
                <option value="DONE">Duyệt xong - DONE</option>
                <option value="IN_REVIEW">Giữ IN_REVIEW</option>
              </select>
              <button
                type="submit"
                disabled={reviewTaskMutation.isPending}
                className="inline-flex h-fit items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-blue-300"
              >
                {reviewTaskMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                Gửi review
              </button>
              {reviewTaskMutation.error && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 lg:col-span-3">
                  {reviewTaskMutation.error.userMessage || reviewTaskMutation.error.message}
                </div>
              )}
            </form>
          ) : (
            <div className="mt-4 rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
              Chỉ leader review được task đang IN_REVIEW.
            </div>
          )}
        </section>

        <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 p-4">
            <h3 className="text-lg font-semibold text-gray-900">Lịch sử review</h3>
          </div>
          {reviewsQuery.isLoading && <div className="flex items-center gap-2 p-4 text-sm text-gray-500"><Loader2 className="animate-spin" size={16} />Đang tải review...</div>}
          {!reviewsQuery.isLoading && reviews.length === 0 && <div className="p-4 text-sm text-gray-500">Chưa có review.</div>}
          <div className="divide-y divide-gray-100">
            {reviews.map((review) => (
              <div key={review.id} className="p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-gray-900">{review.reviewerName}</span>
                  <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-700">
                    {review.statusBefore} {'->'} {review.statusAfter}
                  </span>
                  <span className="text-xs text-gray-500">{formatDate(review.reviewedAt)}</span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-700">{review.feedback}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppLayout>
  );
};

export default TaskReviewsPage;
