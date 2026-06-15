import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import {
  CalendarDays,
  FileImage,
  Loader2,
  Pencil,
  Save,
  TrendingUp,
  Upload,
  X,
} from 'lucide-react';
import AppLayout from '../components/AppLayout';
import eventApi from '../api/eventApi';
import taskApi from '../api/taskApi';
import { formatDate } from '../utils/dateUtils';
import { invalidateDashboardQueries } from '../utils/dashboardQueryUtils';

const emptyReportForm = {
  progressPercentage: '',
  description: '',
  image: null,
};

const TaskReportsPage = ({ user, onLogout }) => {
  const { eventId, taskId } = useParams();
  const queryClient = useQueryClient();
  const [reportForm, setReportForm] = useState(emptyReportForm);
  const [editingReportId, setEditingReportId] = useState(null);
  const [editForm, setEditForm] = useState(emptyReportForm);

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

  const reportsQuery = useQuery({
    queryKey: ['taskReports', taskId],
    queryFn: () => taskApi.getTaskReports(taskId),
    enabled: Boolean(taskId),
  });

  const event = eventQuery.data;
  const task = taskQuery.data;
  const reports = reportsQuery.data || [];
  const isLeader = event?.role === 'LEADER';
  const canReport = isLeader || task?.assigneeId === user?.userId;

  const invalidateTaskAndReports = () => {
    queryClient.invalidateQueries({ queryKey: ['task', taskId] });
    queryClient.invalidateQueries({ queryKey: ['taskReports', taskId] });
    queryClient.invalidateQueries({ queryKey: ['eventTaskPage', eventId] });
    invalidateDashboardQueries(queryClient, eventId);
  };

  const createReportMutation = useMutation({
    mutationFn: taskApi.createTaskReport,
    onSuccess: () => {
      setReportForm(emptyReportForm);
      invalidateTaskAndReports();
    },
  });

  const updateReportMutation = useMutation({
    mutationFn: taskApi.updateTaskReport,
    onSuccess: () => {
      setEditingReportId(null);
      setEditForm(emptyReportForm);
      invalidateTaskAndReports();
    },
  });

  const handleReportSubmit = (event) => {
    event.preventDefault();
    createReportMutation.mutate({
      taskId,
      progressPercentage: Number(reportForm.progressPercentage || task?.progressPercentage || 0),
      description: reportForm.description,
      image: reportForm.image,
    });
  };

  const startEditingReport = (report) => {
    setEditingReportId(report.id);
    setEditForm({
      progressPercentage: report.progressPercentage,
      description: report.description,
      image: null,
    });
  };

  const handleEditSubmit = (event, reportId) => {
    event.preventDefault();
    updateReportMutation.mutate({
      reportId,
      progressPercentage: Number(editForm.progressPercentage),
      description: editForm.description,
      image: editForm.image,
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
        <section className="relative overflow-hidden rounded-[2rem] border border-sky-100 bg-white/85 p-6 shadow-xl shadow-sky-100/70 backdrop-blur-xl">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-sky-100 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 left-1/3 h-72 w-72 rounded-full bg-emerald-100/70 blur-3xl" />

          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br from-sky-500 to-emerald-400 text-white shadow-lg shadow-cyan-100">
                <TrendingUp size={28} strokeWidth={1.8} />
              </div>

              <div className="min-w-0">
                <p className="inline-flex rounded-full bg-sky-50 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-sky-600">
                  Task report
                </p>

                <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                  Report tiến độ
                </h2>

                <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-600">
                  {task?.title
                    ? `Theo dõi lịch sử cập nhật tiến độ cho task: ${task.title}.`
                    : 'Theo dõi lịch sử cập nhật tiến độ và ảnh minh chứng của task.'}
                </p>
              </div>
            </div>

            <div className="rounded-3xl border border-sky-100 bg-white/80 p-4 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                Tổng report
              </p>
              <p className="mt-1 text-3xl font-black text-slate-950">
                {reports.length}
              </p>
            </div>
          </div>

          {(eventQuery.isLoading || taskQuery.isLoading) && (
            <div className="relative mt-5 flex items-center gap-2 rounded-2xl border border-sky-100 bg-sky-50 p-4 text-sm font-black text-slate-500">
              <Loader2 size={18} className="animate-spin text-sky-600" />
              Đang tải thông tin task...
            </div>
          )}
        </section>

        {task?.parentId ? (
          <section className="relative overflow-hidden rounded-[2rem] border border-amber-200 bg-amber-50 p-5 shadow-lg shadow-amber-100/70">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-amber-600 shadow-sm">
                <TrendingUp size={20} strokeWidth={1.8} />
              </div>

              <div>
                <h2 className="text-lg font-black text-amber-900">
                  Subtask chỉ cập nhật trạng thái
                </h2>
                <p className="mt-1 text-sm font-semibold leading-6 text-amber-700">
                  Report tiến độ chỉ áp dụng cho task chính. Với subtask, bạn cập nhật trạng thái trực tiếp ở màn hình cập nhật task.
                </p>
              </div>
            </div>
          </section>
        ) : (
          <>
            <section className="overflow-hidden rounded-[2rem] border border-sky-100 bg-white shadow-xl shadow-sky-100/70">
              <div className="flex flex-col gap-3 border-b border-sky-100 bg-gradient-to-r from-sky-50 via-white to-emerald-50 px-5 py-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-emerald-400 text-white shadow-lg shadow-cyan-100">
                    <Upload size={20} strokeWidth={1.8} />
                  </div>

                  <div>
                    <h3 className="text-lg font-black text-slate-950">
                      Nộp report mới
                    </h3>
                    <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                      Cập nhật phần trăm tiến độ, mô tả tình hình và ảnh minh chứng nếu có.
                    </p>
                  </div>
                </div>

                <span className="inline-flex w-fit rounded-full border border-sky-100 bg-white px-3 py-1.5 text-xs font-black text-sky-600 shadow-sm">
                  {canReport ? 'Có quyền nộp report' : 'Chỉ xem report'}
                </span>
              </div>

              {task && canReport ? (
                <form onSubmit={handleReportSubmit} className="grid gap-4 p-5 lg:grid-cols-[220px_minmax(0,1fr)_240px]">
                  <label className="grid gap-2 text-sm font-black text-slate-700">
                    Tiến độ (%)
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={reportForm.progressPercentage === '' ? task.progressPercentage ?? 0 : reportForm.progressPercentage}
                      onChange={(event) => setReportForm((old) => ({ ...old, progressPercentage: event.target.value }))}
                      className={inputClassName}
                      required
                    />
                  </label>

                  <label className="grid gap-2 text-sm font-black text-slate-700">
                    Mô tả report
                    <textarea
                      value={reportForm.description}
                      onChange={(event) => setReportForm((old) => ({ ...old, description: event.target.value }))}
                      rows={4}
                      className={`${inputClassName} min-h-32 resize-none py-3`}
                      placeholder="Ví dụ: đã hoàn thành phần setup, còn thiếu kiểm thử..."
                      required
                    />
                  </label>

                  <div className="space-y-3">
                    <label className="grid gap-2 text-sm font-black text-slate-700">
                      Ảnh minh chứng
                      <span className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-sky-200 bg-sky-50/70 px-4 py-3 text-sm font-black text-sky-600 transition hover:border-sky-300 hover:bg-sky-50">
                        <FileImage size={17} />
                        {reportForm.image ? reportForm.image.name : 'Chọn ảnh'}
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/gif"
                          onChange={(event) => setReportForm((old) => ({ ...old, image: event.target.files?.[0] || null }))}
                          className="sr-only"
                        />
                      </span>
                    </label>

                    <button
                      type="submit"
                      disabled={createReportMutation.isPending}
                      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400 px-4 py-2 text-sm font-black text-white shadow-xl shadow-cyan-100 transition hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {createReportMutation.isPending ? (
                        <Loader2 className="animate-spin" size={16} />
                      ) : (
                        <Save size={16} />
                      )}
                      Nộp report
                    </button>
                  </div>

                  {createReportMutation.error && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700 lg:col-span-3">
                      {createReportMutation.error.userMessage || createReportMutation.error.message}
                    </div>
                  )}
                </form>
              ) : (
                <div className="p-5">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-600">
                    Bạn không có quyền nộp report.
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
                      Lịch sử report
                    </h3>
                    <p className="mt-1 text-sm font-semibold text-slate-500">
                      Các lần cập nhật tiến độ đã được ghi nhận cho task này.
                    </p>
                  </div>
                </div>

                <span className="rounded-full border border-sky-100 bg-white px-3 py-1.5 text-xs font-black text-sky-600 shadow-sm">
                  {reports.length} report
                </span>
              </div>

              {reportsQuery.isLoading && (
                <div className="flex items-center gap-2 p-5 text-sm font-black text-slate-500">
                  <Loader2 className="animate-spin text-sky-600" size={18} />
                  Đang tải report...
                </div>
              )}

              {!reportsQuery.isLoading && reports.length === 0 && (
                <div className="p-8 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-sky-50 text-sky-600">
                    <TrendingUp size={26} strokeWidth={1.8} />
                  </div>
                  <p className="mt-4 text-sm font-black text-slate-700">
                    Chưa có report tiến độ.
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    Khi thành viên nộp report, lịch sử sẽ hiển thị tại đây.
                  </p>
                </div>
              )}

              <div className="divide-y divide-sky-100">
                {reports.map((report) => {
                  const canEditReport = isLeader || report.reporterId === user?.userId;
                  const isEditing = editingReportId === report.id;

                  return (
                    <div key={report.id} className="p-5 transition hover:bg-sky-50/40">
                      {isEditing ? (
                        <form onSubmit={(event) => handleEditSubmit(event, report.id)} className="grid gap-4 lg:grid-cols-[180px_minmax(0,1fr)_240px]">
                          <label className="grid gap-2 text-sm font-black text-slate-700">
                            Tiến độ (%)
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={editForm.progressPercentage}
                              onChange={(event) => setEditForm((old) => ({ ...old, progressPercentage: event.target.value }))}
                              className={inputClassName}
                              required
                            />
                          </label>

                          <label className="grid gap-2 text-sm font-black text-slate-700">
                            Mô tả report
                            <textarea
                              value={editForm.description}
                              onChange={(event) => setEditForm((old) => ({ ...old, description: event.target.value }))}
                              rows={4}
                              className={`${inputClassName} min-h-32 resize-none py-3`}
                              required
                            />
                          </label>

                          <div className="space-y-3">
                            <label className="grid gap-2 text-sm font-black text-slate-700">
                              Đổi ảnh
                              <span className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-sky-200 bg-sky-50/70 px-4 py-3 text-sm font-black text-sky-600 transition hover:border-sky-300 hover:bg-sky-50">
                                <FileImage size={17} />
                                {editForm.image ? editForm.image.name : 'Chọn ảnh'}
                                <input
                                  type="file"
                                  accept="image/png,image/jpeg,image/webp,image/gif"
                                  onChange={(event) => setEditForm((old) => ({ ...old, image: event.target.files?.[0] || null }))}
                                  className="sr-only"
                                />
                              </span>
                            </label>

                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => setEditingReportId(null)}
                                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl border border-sky-100 bg-white px-3 py-2 text-sm font-black text-slate-600 shadow-sm transition hover:bg-sky-50 hover:text-sky-600"
                              >
                                <X size={16} />
                                Hủy
                              </button>

                              <button
                                type="submit"
                                disabled={updateReportMutation.isPending}
                                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400 px-3 py-2 text-sm font-black text-white shadow-lg shadow-cyan-100 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {updateReportMutation.isPending ? (
                                  <Loader2 className="animate-spin" size={16} />
                                ) : (
                                  <Save size={16} />
                                )}
                                Lưu
                              </button>
                            </div>
                          </div>

                          {updateReportMutation.error && (
                            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700 lg:col-span-3">
                              {updateReportMutation.error.userMessage || updateReportMutation.error.message}
                            </div>
                          )}
                        </form>
                      ) : (
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-black text-slate-950">
                                {report.reporterName}
                              </span>

                              <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-black text-sky-700">
                                {report.progressPercentage}%
                              </span>

                              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1 text-xs font-black text-slate-500">
                                <CalendarDays size={13} />
                                {formatDate(report.createdAt)}
                              </span>
                            </div>

                            <p className="mt-3 whitespace-pre-wrap text-sm font-semibold leading-7 text-slate-700">
                              {report.description}
                            </p>

                            {report.updatedAt !== report.createdAt && (
                              <p className="mt-2 text-xs font-black text-slate-400">
                                Đã cập nhật: {formatDate(report.updatedAt)}
                              </p>
                            )}
                          </div>

                          <div className="flex flex-wrap items-start gap-3">
                            <TaskReportImage report={report} />

                            {canEditReport && (
                              <button
                                type="button"
                                onClick={() => startEditingReport(report)}
                                className="inline-flex min-h-10 items-center gap-2 rounded-2xl border border-sky-100 bg-white px-3 py-2 text-sm font-black text-slate-600 shadow-sm transition hover:bg-sky-50 hover:text-sky-600"
                              >
                                <Pencil size={16} />
                                Sửa
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </div>
    </AppLayout>
  );
};

const TaskReportImage = ({ report }) => {
  const [imageUrl, setImageUrl] = useState('');

  useEffect(() => {
    let objectUrl = '';
    let isMounted = true;

    if (report?.hasImage) {
      taskApi.getTaskReportImage(report.id)
        .then((blob) => {
          if (!isMounted) {
            return;
          }
          objectUrl = URL.createObjectURL(blob);
          setImageUrl(objectUrl);
        })
        .catch(() => {
          if (isMounted) {
            setImageUrl('');
          }
        });
    }

    return () => {
      isMounted = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [report?.hasImage, report?.id]);

  if (!report?.hasImage) {
    return null;
  }

  if (!imageUrl) {
    return (
      <div className="flex h-28 w-36 items-center justify-center rounded-2xl border border-dashed border-sky-200 bg-sky-50 text-sky-400">
        <FileImage size={24} />
      </div>
    );
  }

  return (
    <a
      href={imageUrl}
      target="_blank"
      rel="noreferrer"
      className="block h-28 w-36 overflow-hidden rounded-2xl border border-sky-100 bg-sky-50 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-sky-100"
    >
      <img
        src={imageUrl}
        alt={report.imageOriginalName || 'Ảnh report'}
        className="h-full w-full object-cover"
      />
    </a>
  );
};

const inputClassName = 'min-h-11 w-full min-w-0 rounded-2xl border border-sky-100 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-cyan-300 focus:bg-white focus:ring-4 focus:ring-cyan-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500';

export default TaskReportsPage;