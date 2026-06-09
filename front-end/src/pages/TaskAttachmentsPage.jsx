import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { Download, ExternalLink, Loader2, Paperclip, Pencil, Trash2, Upload, X } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import eventApi from '../api/eventApi';
import taskApi from '../api/taskApi';
import { formatDate } from '../utils/dateUtils';

const TaskAttachmentsPage = ({ user, onLogout }) => {
  const { eventId, taskId } = useParams();
  const queryClient = useQueryClient();
  const [attachmentFiles, setAttachmentFiles] = useState([]);
  const [attachmentLinkUrl, setAttachmentLinkUrl] = useState('');
  const [attachmentLinkTitle, setAttachmentLinkTitle] = useState('');
  const [attachmentVisibility, setAttachmentVisibility] = useState('TASK_ONLY');
  const [editingAttachmentId, setEditingAttachmentId] = useState(null);
  const [editForm, setEditForm] = useState({ originalName: '', externalUrl: '', visibility: 'TASK_ONLY' });
  const [localError, setLocalError] = useState('');

  const eventQuery = useQuery({ queryKey: ['event', eventId], queryFn: () => eventApi.getEvent(eventId), enabled: Boolean(eventId) });
  const taskQuery = useQuery({ queryKey: ['task', taskId], queryFn: () => taskApi.getTask(taskId), enabled: Boolean(taskId) });
  const attachmentsQuery = useQuery({ queryKey: ['taskAttachments', taskId], queryFn: () => taskApi.getTaskAttachments(taskId), enabled: Boolean(taskId) });

  const uploadAttachmentsMutation = useMutation({
    mutationFn: taskApi.uploadTaskAttachments,
    onSuccess: () => {
      setAttachmentFiles([]);
      setAttachmentLinkUrl('');
      setAttachmentLinkTitle('');
      setAttachmentVisibility('TASK_ONLY');
      setLocalError('');
      queryClient.invalidateQueries({ queryKey: ['taskAttachments', taskId] });
    },
  });
  const updateAttachmentMutation = useMutation({
    mutationFn: taskApi.updateTaskAttachment,
    onSuccess: () => {
      setEditingAttachmentId(null);
      setEditForm({ originalName: '', externalUrl: '', visibility: 'TASK_ONLY' });
      queryClient.invalidateQueries({ queryKey: ['taskAttachments', taskId] });
    },
  });
  const deleteAttachmentMutation = useMutation({
    mutationFn: taskApi.deleteTaskAttachment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskAttachments', taskId] });
    },
  });

  const event = eventQuery.data;
  const task = taskQuery.data;
  const attachments = attachmentsQuery.data || [];
  const isLeader = event?.role === 'LEADER';
  const canAttach = isLeader || task?.assigneeId === user?.userId;

  const handleAttachmentSubmit = (event) => {
    event.preventDefault();
    const validationError = validateAttachmentInput(attachmentFiles, attachmentLinkUrl);
    if (validationError) {
      setLocalError(validationError);
      return;
    }
    setLocalError('');
    uploadAttachmentsMutation.mutate({
      taskId,
      files: attachmentFiles,
      linkUrl: attachmentLinkUrl,
      linkTitle: attachmentLinkTitle,
      visibility: isLeader ? attachmentVisibility : 'TASK_ONLY',
    });
  };

  const handleAttachmentFilesChange = (event) => {
    const files = Array.from(event.target.files || []);
    setAttachmentFiles(files);
    setLocalError(validateAttachmentInput(files, attachmentLinkUrl));
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

  const openEditAttachment = (attachment) => {
    setEditingAttachmentId(attachment.id);
    setEditForm({
      originalName: attachment.originalName || '',
      externalUrl: attachment.externalUrl || '',
      visibility: attachment.visibility || 'TASK_ONLY',
    });
  };

  const handleEditSubmit = (event, attachment) => {
    event.preventDefault();
    updateAttachmentMutation.mutate({
      attachmentId: attachment.id,
      originalName: editForm.originalName,
      externalUrl: attachment.attachmentType === 'LINK' ? editForm.externalUrl : undefined,
      visibility: isLeader ? editForm.visibility : undefined,
    });
  };

  const handleDeleteAttachment = (attachment) => {
    if (!window.confirm(`Xóa attachment "${attachment.originalName}"?`)) {
      return;
    }
    deleteAttachmentMutation.mutate(attachment.id);
  };

  return (
    <AppLayout user={user} events={event ? [event] : []} selectedEvent={event} onEventChange={() => {}} onLogout={onLogout}>
      <div className="space-y-6">
        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Attachment</h2>
            </div>
            <Paperclip className="text-blue-600" size={24} />
          </div>

          {canAttach && (
            <form onSubmit={handleAttachmentSubmit} className="mt-4 grid gap-3">
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
                <div>
                  <input
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp,.zip,application/zip,application/x-zip-compressed"
                    onChange={handleAttachmentFilesChange}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <button
                  type="submit"
                  disabled={uploadAttachmentsMutation.isPending || (!attachmentFiles.length && !attachmentLinkUrl.trim())}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                >
                  {uploadAttachmentsMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
                  Thêm attachment
                </button>
              </div>

              <div className="grid gap-3 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                <input
                  type="text"
                  value={attachmentLinkTitle}
                  onChange={(event) => setAttachmentLinkTitle(event.target.value)}
                  maxLength={255}
                  placeholder="Tên đường dẫn, ví dụ: Folder Google Drive"
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
                <input
                  type="url"
                  value={attachmentLinkUrl}
                  onChange={(event) => {
                    setAttachmentLinkUrl(event.target.value);
                    setLocalError(validateAttachmentInput(attachmentFiles, event.target.value));
                  }}
                  placeholder="Dán link nếu file lớn hoặc đã có trên Drive"
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              {isLeader && (
                <label className="grid gap-1 md:max-w-sm">
                  <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Phạm vi hiển thị</span>
                  <select
                    value={attachmentVisibility}
                    onChange={(event) => setAttachmentVisibility(event.target.value)}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700"
                  >
                    {ATTACHMENT_VISIBILITY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
              )}

              {(localError || uploadAttachmentsMutation.error) && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 md:col-span-2">
                  {localError || uploadAttachmentsMutation.error.userMessage || uploadAttachmentsMutation.error.message}
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
              {editingAttachmentId === attachment.id ? (
                <form onSubmit={(event) => handleEditSubmit(event, attachment)} className="grid flex-1 gap-3">
                  <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(180px,240px)]">
                    <input
                      value={editForm.originalName}
                      onChange={(event) => setEditForm((old) => ({ ...old, originalName: event.target.value }))}
                      maxLength={255}
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      placeholder="Tên attachment"
                    />
                    {isLeader && (
                      <select
                        value={editForm.visibility}
                        onChange={(event) => setEditForm((old) => ({ ...old, visibility: event.target.value }))}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700"
                      >
                        {ATTACHMENT_VISIBILITY_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  {attachment.attachmentType === 'LINK' && (
                    <input
                      value={editForm.externalUrl}
                      onChange={(event) => setEditForm((old) => ({ ...old, externalUrl: event.target.value }))}
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      placeholder="URL attachment"
                      type="url"
                    />
                  )}
                  {updateAttachmentMutation.error && (
                    <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                      {updateAttachmentMutation.error.userMessage || updateAttachmentMutation.error.message}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="submit"
                      disabled={updateAttachmentMutation.isPending}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-blue-300"
                    >
                      {updateAttachmentMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : <Pencil size={16} />}
                      Lưu thay đổi
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingAttachmentId(null)}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      <X size={16} />
                      Hủy
                    </button>
                  </div>
                </form>
              ) : (
              <>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-gray-900">{attachment.originalName}</div>
                <div className="mt-1 text-xs text-gray-500">
                  {attachment.uploaderName} - {attachment.attachmentType === 'LINK' ? 'Link ngoài' : formatFileSize(attachment.sizeBytes)} - {formatDate(attachment.createdAt)}
                </div>
                <div className="mt-2">
                  <AttachmentVisibilityBadge visibility={attachment.visibility} />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
              {attachment.attachmentType === 'LINK' ? (
                <a
                  href={attachment.externalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  <ExternalLink size={16} />
                  Mở link
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => handleAttachmentDownload(attachment)}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  <Download size={16} />
                  Tải xuống
                </button>
              )}
              {attachment.canEdit && (
                <button
                  type="button"
                  onClick={() => openEditAttachment(attachment)}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  <Pencil size={16} />
                  Sửa
                </button>
              )}
              {attachment.canDelete && (
                <button
                  type="button"
                  onClick={() => handleDeleteAttachment(attachment)}
                  disabled={deleteAttachmentMutation.isPending && deleteAttachmentMutation.variables === attachment.id}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
                >
                  {deleteAttachmentMutation.isPending && deleteAttachmentMutation.variables === attachment.id ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                  Xóa
                </button>
              )}
              </div>
              </>
              )}
            </div>
          ))}
        </section>
      </div>
    </AppLayout>
  );
};

const ATTACHMENT_VISIBILITY_OPTIONS = [
  { value: 'TASK_ONLY', label: 'Chỉ task này' },
  { value: 'DEPARTMENT', label: 'Ban phụ trách' },
  { value: 'EVENT_PUBLIC', label: 'Toàn sự kiện' },
];

const ATTACHMENT_VISIBILITY_META = {
  TASK_ONLY: { label: 'Chỉ task này', className: 'bg-slate-100 text-slate-700' },
  DEPARTMENT: { label: 'Ban phụ trách', className: 'bg-emerald-50 text-emerald-700' },
  EVENT_PUBLIC: { label: 'Toàn sự kiện', className: 'bg-indigo-50 text-indigo-700' },
};

const AttachmentVisibilityBadge = ({ visibility }) => {
  const meta = ATTACHMENT_VISIBILITY_META[visibility] || ATTACHMENT_VISIBILITY_META.TASK_ONLY;
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${meta.className}`}>
      {meta.label}
    </span>
  );
};

const MAX_FILES_PER_UPLOAD = 10;
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_ZIP_SIZE_BYTES = 50 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
const ALLOWED_ZIP_TYPES = ['application/zip', 'application/x-zip-compressed', 'multipart/x-zip', 'application/octet-stream'];

const validateAttachmentInput = (files, linkUrl = '') => {
  if (files.length > MAX_FILES_PER_UPLOAD) {
    return 'Chỉ được chọn tối đa 10 file mỗi lần.';
  }

  for (const file of files) {
    const filename = file.name.toLowerCase();
    const isImage = ALLOWED_IMAGE_TYPES.includes(file.type) && ALLOWED_IMAGE_EXTENSIONS.some((extension) => filename.endsWith(extension));
    const isZip = ALLOWED_ZIP_TYPES.includes(file.type) && filename.endsWith('.zip');
    if (!isImage && !isZip) {
      return 'Attachment chỉ hỗ trợ ảnh JPG/PNG/WebP hoặc file ZIP.';
    }
    if (isImage && file.size > MAX_IMAGE_SIZE_BYTES) {
      return `Ảnh "${file.name}" vượt quá 5 MB.`;
    }
    if (isZip && file.size > MAX_ZIP_SIZE_BYTES) {
      return `File ZIP "${file.name}" vượt quá 50 MB.`;
    }
  }

  if (linkUrl.trim()) {
    try {
      const url = new URL(linkUrl.trim());
      if (!['http:', 'https:'].includes(url.protocol)) {
        return 'Đường dẫn phải bắt đầu bằng http hoặc https.';
      }
    } catch {
      return 'Đường dẫn attachment không hợp lệ.';
    }
  }

  return '';
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
