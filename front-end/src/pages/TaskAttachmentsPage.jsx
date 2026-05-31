import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Download, Loader2, Paperclip, Upload } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import eventApi from '../api/eventApi';
import taskApi from '../api/taskApi';
import { formatDate } from '../utils/dateUtils';

const TaskAttachmentsPage = ({ user, onLogout }) => {
  const { eventId, taskId } = useParams();
  const queryClient = useQueryClient();
  const [attachmentFiles, setAttachmentFiles] = useState([]);

  const eventQuery = useQuery({ queryKey: ['event', eventId], queryFn: () => eventApi.getEvent(eventId), enabled: Boolean(eventId) });
  const taskQuery = useQuery({ queryKey: ['task', taskId], queryFn: () => taskApi.getTask(taskId), enabled: Boolean(taskId) });
  const attachmentsQuery = useQuery({ queryKey: ['taskAttachments', taskId], queryFn: () => taskApi.getTaskAttachments(taskId), enabled: Boolean(taskId) });

  const uploadAttachmentsMutation = useMutation({
    mutationFn: taskApi.uploadTaskAttachments,
    onSuccess: () => {
      setAttachmentFiles([]);
      queryClient.invalidateQueries({ queryKey: ['taskAttachments', taskId] });
    },
  });

  const event = eventQuery.data;
  const task = taskQuery.data;
  const attachments = attachmentsQuery.data || [];
  const canAttach = event?.role === 'LEADER' || task?.assigneeId === user?.userId;

  const handleAttachmentSubmit = (event) => {
    event.preventDefault();
    uploadAttachmentsMutation.mutate({ taskId, files: attachmentFiles });
  };

  const handleAttachmentDownload = async (attachment) => {
    const blob = await taskApi.downloadTaskAttachment(attachment.id);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = attachment.originalName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <AppLayout user={user} events={event ? [event] : []} selectedEvent={event} onEventChange={() => {}} onLogout={onLogout}>
      <div className="space-y-6">
        <Link to={`/events/${eventId}/tasks/${taskId}`} className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600">
          <ArrowLeft size={16} />
          Quay lại chi tiết task
        </Link>

        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Attachment</h2>
              <p className="mt-1 text-sm text-gray-500">{task?.title || 'Task'} - file liên quan đến task.</p>
            </div>
            <Paperclip className="text-blue-600" size={24} />
          </div>

          {canAttach && (
            <form onSubmit={handleAttachmentSubmit} className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
              <input
                type="file"
                multiple
                accept="image/png,image/jpeg,image/webp,image/gif,application/pdf,text/plain,.doc,.docx,.xls,.xlsx"
                onChange={(event) => setAttachmentFiles(Array.from(event.target.files || []))}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <button
                type="submit"
                disabled={uploadAttachmentsMutation.isPending || attachmentFiles.length === 0}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                {uploadAttachmentsMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
                Upload file
              </button>
              {uploadAttachmentsMutation.error && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 md:col-span-2">
                  {uploadAttachmentsMutation.error.userMessage || uploadAttachmentsMutation.error.message}
                </div>
              )}
            </form>
          )}
        </section>

        <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
          {attachmentsQuery.isLoading && <div className="flex items-center gap-2 p-4 text-sm text-gray-500"><Loader2 className="animate-spin" size={16} />Đang tải attachment...</div>}
          {!attachmentsQuery.isLoading && attachments.length === 0 && <div className="p-8 text-center text-sm text-gray-500">Chưa có attachment.</div>}
          {attachments.map((attachment) => (
            <div key={attachment.id} className="flex flex-col gap-3 border-b border-gray-100 p-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-gray-900">{attachment.originalName}</div>
                <div className="mt-1 text-xs text-gray-500">
                  {attachment.uploaderName} - {formatFileSize(attachment.sizeBytes)} - {formatDate(attachment.createdAt)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleAttachmentDownload(attachment)}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                <Download size={16} />
                Tải xuống
              </button>
            </div>
          ))}
        </section>
      </div>
    </AppLayout>
  );
};

const formatFileSize = (sizeBytes) => {
  if (!sizeBytes) {
    return '0 B';
  }
  if (sizeBytes < 1024 * 1024) {
    return `${Math.round(sizeBytes / 1024)} KB`;
  }
  return `${(sizeBytes / 1024 / 1024).toFixed(1)} MB`;
};

export default TaskAttachmentsPage;
