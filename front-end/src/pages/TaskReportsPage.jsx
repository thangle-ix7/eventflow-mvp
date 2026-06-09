import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { FileImage, Loader2, Pencil, Save, Upload, X } from 'lucide-react';
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

  const eventQuery = useQuery({ queryKey: ['event', eventId], queryFn: () => eventApi.getEvent(eventId), enabled: Boolean(eventId) });
  const taskQuery = useQuery({ queryKey: ['task', taskId], queryFn: () => taskApi.getTask(taskId), enabled: Boolean(taskId) });
  const reportsQuery = useQuery({ queryKey: ['taskReports', taskId], queryFn: () => taskApi.getTaskReports(taskId), enabled: Boolean(taskId) });

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
    <AppLayout user={user} events={event ? [event] : []} selectedEvent={event} onEventChange={() => {}} onLogout={onLogout}>
      <div className="space-y-6">
        {task?.parentId ? (
          <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900">Subtask chỉ cập nhật trạng thái</h2>
          </section>
        ) : (
          <>
        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Report tiến độ</h2>
            </div>
            <Upload className="text-blue-600" size={24} />
          </div>

          {task && canReport ? (
            <form onSubmit={handleReportSubmit} className="mt-4 grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)_220px]">
              <label className="space-y-2 text-sm font-medium text-gray-700">
                Tiến độ (%)
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={reportForm.progressPercentage === '' ? task.progressPercentage ?? 0 : reportForm.progressPercentage}
                  onChange={(event) => setReportForm((old) => ({ ...old, progressPercentage: event.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  required
                />
              </label>
              <label className="space-y-2 text-sm font-medium text-gray-700">
                Mô tả report
                <textarea
                  value={reportForm.description}
                  onChange={(event) => setReportForm((old) => ({ ...old, description: event.target.value }))}
                  rows={3}
                  className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  placeholder="Ví dụ: đã hoàn thành phần setup, còn thiếu kiểm thử..."
                  required
                />
              </label>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Ảnh minh chứng</label>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={(event) => setReportForm((old) => ({ ...old, image: event.target.files?.[0] || null }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
                <button
                  type="submit"
                  disabled={createReportMutation.isPending}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                >
                  {createReportMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                  Nộp report
                </button>
              </div>
              {createReportMutation.error && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 lg:col-span-3">
                  {createReportMutation.error.userMessage || createReportMutation.error.message}
                </div>
              )}
            </form>
          ) : (
            <div className="mt-4 rounded-lg bg-gray-50 p-3 text-sm text-gray-600">Bạn không có quyền nộp report.</div>
          )}
        </section>

        <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 p-4">
            <h3 className="text-lg font-semibold text-gray-900">Lịch sử report</h3>
          </div>
          {reportsQuery.isLoading && <div className="flex items-center gap-2 p-4 text-sm text-gray-500"><Loader2 className="animate-spin" size={16} />Đang tải report...</div>}
          {!reportsQuery.isLoading && reports.length === 0 && <div className="p-4 text-sm text-gray-500">Chưa có report tiến độ.</div>}
          <div className="divide-y divide-gray-100">
            {reports.map((report) => {
              const canEditReport = isLeader || report.reporterId === user?.userId;
              const isEditing = editingReportId === report.id;

              return (
                <div key={report.id} className="p-4">
                  {isEditing ? (
                    <form onSubmit={(event) => handleEditSubmit(event, report.id)} className="grid gap-4 lg:grid-cols-[180px_minmax(0,1fr)_220px]">
                      <label className="space-y-2 text-sm font-medium text-gray-700">
                        Tiến độ (%)
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={editForm.progressPercentage}
                          onChange={(event) => setEditForm((old) => ({ ...old, progressPercentage: event.target.value }))}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                          required
                        />
                      </label>
                      <label className="space-y-2 text-sm font-medium text-gray-700">
                        Mô tả report
                        <textarea
                          value={editForm.description}
                          onChange={(event) => setEditForm((old) => ({ ...old, description: event.target.value }))}
                          rows={3}
                          className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                          required
                        />
                      </label>
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Đổi ảnh</label>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/gif"
                          onChange={(event) => setEditForm((old) => ({ ...old, image: event.target.files?.[0] || null }))}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <button type="button" onClick={() => setEditingReportId(null)} className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                            <X size={16} />
                            Hủy
                          </button>
                          <button type="submit" disabled={updateReportMutation.isPending} className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-blue-300">
                            {updateReportMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                            Lưu
                          </button>
                        </div>
                      </div>
                      {updateReportMutation.error && (
                        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 lg:col-span-3">
                          {updateReportMutation.error.userMessage || updateReportMutation.error.message}
                        </div>
                      )}
                    </form>
                  ) : (
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-gray-900">{report.reporterName}</span>
                          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">{report.progressPercentage}%</span>
                          <span className="text-xs text-gray-500">{formatDate(report.createdAt)}</span>
                        </div>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-700">{report.description}</p>
                        {report.updatedAt !== report.createdAt && <p className="mt-2 text-xs text-gray-400">Đã cập nhật: {formatDate(report.updatedAt)}</p>}
                      </div>
                      <div className="flex items-start gap-3">
                        <TaskReportImage report={report} />
                        {canEditReport && (
                          <button type="button" onClick={() => startEditingReport(report)} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
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
      <div className="flex h-28 w-36 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 text-gray-400">
        <FileImage size={24} />
      </div>
    );
  }

  return (
    <a href={imageUrl} target="_blank" rel="noreferrer" className="block h-28 w-36 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
      <img src={imageUrl} alt={report.imageOriginalName || 'Ảnh report'} className="h-full w-full object-cover" />
    </a>
  );
};

export default TaskReportsPage;
