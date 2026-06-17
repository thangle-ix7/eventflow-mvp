import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import {
  Download,
  ExternalLink,
  FileText,
  Loader2,
  Paperclip,
  Pencil,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
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
                  <Paperclip size={15} strokeWidth={1.8} />
                  Task attachments
                </p>

                <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                  Attachment
                </h2>

                <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-600">
                  {task?.title
                    ? `Quản lý file và link đính kèm cho task: ${task.title}.`
                    : 'Quản lý file và link đính kèm của task.'}
                </p>
              </div>

            <div className="rounded-2xl border border-sky-100 bg-sky-50/70 px-4 py-3">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                Tổng attachment
              </p>
              <p className="mt-1 text-2xl font-black text-slate-950">
                {attachments.length}
              </p>
            </div>
          </div>

          {(eventQuery.isLoading || taskQuery.isLoading) && (
            <div className="mt-4 flex items-center gap-2 rounded-2xl border border-sky-100 bg-sky-50 p-4 text-sm font-black text-slate-500">
              <Loader2 size={18} className="animate-spin text-sky-600" />
              Đang tải thông tin task...
            </div>
          )}
        </header>

        {canAttach && (
          <section className="relative overflow-hidden rounded-[2rem] border border-sky-100 bg-white shadow-xl shadow-sky-100/70">
            <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-sky-100 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-28 left-1/3 h-72 w-72 rounded-full bg-emerald-100/70 blur-3xl" />

            <div className="relative border-b border-sky-100 bg-gradient-to-r from-sky-50 via-white to-emerald-50 px-5 py-5">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-emerald-400 text-white shadow-lg shadow-cyan-100">
                  <Upload size={20} strokeWidth={1.8} />
                </div>

                <div>
                  <h3 className="text-lg font-black text-slate-950">
                    Thêm attachment
                  </h3>
                  <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                    Upload ảnh/ZIP hoặc dán link Drive, tài liệu ngoài.
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleAttachmentSubmit} className="relative grid gap-4 p-5">
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
                <label className="group flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-sky-200 bg-sky-50/70 px-4 py-3 text-sm font-black text-sky-600 transition hover:border-sky-300 hover:bg-sky-50">
                  <Paperclip size={18} />
                  {attachmentFiles.length > 0
                    ? `${attachmentFiles.length} file đã chọn`
                    : 'Chọn file JPG/PNG/WebP hoặc ZIP'}
                  <input
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp,.zip,application/zip,application/x-zip-compressed"
                    onChange={handleAttachmentFilesChange}
                    className="sr-only"
                  />
                </label>

                <button
                  type="submit"
                  disabled={uploadAttachmentsMutation.isPending || (!attachmentFiles.length && !attachmentLinkUrl.trim())}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400 px-4 py-2 text-sm font-black text-white shadow-xl shadow-cyan-100 transition hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {uploadAttachmentsMutation.isPending ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : (
                    <Upload size={16} />
                  )}
                  Thêm attachment
                </button>
              </div>

              {attachmentFiles.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {attachmentFiles.map((file) => (
                    <span
                      key={`${file.name}-${file.size}`}
                      className="inline-flex max-w-full items-center gap-2 rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-xs font-black text-slate-600"
                    >
                      <FileText size={13} className="shrink-0 text-sky-500" />
                      <span className="truncate">{file.name}</span>
                    </span>
                  ))}
                </div>
              )}

              <div className="grid gap-3 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                <input
                  type="text"
                  value={attachmentLinkTitle}
                  onChange={(event) => setAttachmentLinkTitle(event.target.value)}
                  maxLength={255}
                  placeholder="Tên đường dẫn, ví dụ: Folder Google Drive"
                  className={inputClassName}
                />

                <input
                  type="url"
                  value={attachmentLinkUrl}
                  onChange={(event) => {
                    setAttachmentLinkUrl(event.target.value);
                    setLocalError(validateAttachmentInput(attachmentFiles, event.target.value));
                  }}
                  placeholder="Dán link nếu file lớn hoặc đã có trên Drive"
                  className={inputClassName}
                />
              </div>

              {isLeader && (
                <label className="grid gap-2 md:max-w-sm">
                  <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                    Phạm vi hiển thị
                  </span>

                  <select
                    value={attachmentVisibility}
                    onChange={(event) => setAttachmentVisibility(event.target.value)}
                    className={inputClassName}
                  >
                    {ATTACHMENT_VISIBILITY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {(localError || uploadAttachmentsMutation.error) && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700 md:col-span-2">
                  {localError || uploadAttachmentsMutation.error.userMessage || uploadAttachmentsMutation.error.message}
                </div>
              )}
            </form>
          </section>
        )}

        <section className="overflow-hidden rounded-[2rem] border border-sky-100 bg-white shadow-xl shadow-sky-100/70">
          <div className="flex items-center justify-between gap-3 border-b border-sky-100 bg-gradient-to-r from-sky-50 via-white to-emerald-50 px-5 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-emerald-400 text-white shadow-lg shadow-cyan-100">
                <Paperclip className="h-5 w-5" strokeWidth={1.8} />
              </div>

              <div>
                <h3 className="text-lg font-black text-slate-950">
                  Danh sách attachment
                </h3>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  File, link ngoài và phạm vi hiển thị của task.
                </p>
              </div>
            </div>
          </div>

          {attachmentsQuery.isLoading && (
            <div className="flex items-center gap-2 p-5 text-sm font-black text-slate-500">
              <Loader2 className="animate-spin text-sky-600" size={18} />
              Đang tải attachment...
            </div>
          )}

          {!attachmentsQuery.isLoading && attachments.length === 0 && (
            <div className="p-8 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-sky-50 text-sky-600">
                <Paperclip size={26} strokeWidth={1.8} />
              </div>
              <p className="mt-4 text-sm font-black text-slate-700">
                Chưa có attachment.
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                Khi có file hoặc link đính kèm, danh sách sẽ hiển thị tại đây.
              </p>
            </div>
          )}

          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex flex-col gap-3 border-b border-sky-100 p-5 transition last:border-b-0 hover:bg-sky-50/50 sm:flex-row sm:items-center sm:justify-between"
            >
              {editingAttachmentId === attachment.id ? (
                <form onSubmit={(event) => handleEditSubmit(event, attachment)} className="grid flex-1 gap-3">
                  <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(180px,240px)]">
                    <input
                      value={editForm.originalName}
                      onChange={(event) => setEditForm((old) => ({ ...old, originalName: event.target.value }))}
                      maxLength={255}
                      className={inputClassName}
                      placeholder="Tên attachment"
                    />

                    {isLeader && (
                      <select
                        value={editForm.visibility}
                        onChange={(event) => setEditForm((old) => ({ ...old, visibility: event.target.value }))}
                        className={inputClassName}
                      >
                        {ATTACHMENT_VISIBILITY_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {attachment.attachmentType === 'LINK' && (
                    <input
                      value={editForm.externalUrl}
                      onChange={(event) => setEditForm((old) => ({ ...old, externalUrl: event.target.value }))}
                      className={inputClassName}
                      placeholder="URL attachment"
                      type="url"
                    />
                  )}

                  {updateAttachmentMutation.error && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
                      {updateAttachmentMutation.error.userMessage || updateAttachmentMutation.error.message}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="submit"
                      disabled={updateAttachmentMutation.isPending}
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400 px-3 py-2 text-sm font-black text-white shadow-lg shadow-cyan-100 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {updateAttachmentMutation.isPending ? (
                        <Loader2 className="animate-spin" size={16} />
                      ) : (
                        <Pencil size={16} />
                      )}
                      Lưu thay đổi
                    </button>

                    <button
                      type="button"
                      onClick={() => setEditingAttachmentId(null)}
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl border border-sky-100 bg-white px-3 py-2 text-sm font-black text-slate-600 shadow-sm transition hover:bg-sky-50 hover:text-sky-600"
                    >
                      <X size={16} />
                      Hủy
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
                      {attachment.attachmentType === 'LINK' ? (
                        <ExternalLink size={18} strokeWidth={1.8} />
                      ) : (
                        <FileText size={18} strokeWidth={1.8} />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="truncate text-sm font-black text-slate-950">
                        {attachment.originalName}
                      </div>

                      <div className="mt-1 text-xs font-semibold text-slate-500">
                        {attachment.uploaderName} • {attachment.attachmentType === 'LINK' ? 'Link ngoài' : formatFileSize(attachment.sizeBytes)} • {formatDate(attachment.createdAt)}
                      </div>

                      <div className="mt-2">
                        <AttachmentVisibilityBadge visibility={attachment.visibility} />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {attachment.attachmentType === 'LINK' ? (
                      <a
                        href={attachment.externalUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl border border-sky-100 bg-white px-3 py-2 text-sm font-black text-slate-600 shadow-sm transition hover:bg-sky-50 hover:text-sky-600"
                      >
                        <ExternalLink size={16} />
                        Mở link
                      </a>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleAttachmentDownload(attachment)}
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl border border-sky-100 bg-white px-3 py-2 text-sm font-black text-slate-600 shadow-sm transition hover:bg-sky-50 hover:text-sky-600"
                      >
                        <Download size={16} />
                        Tải xuống
                      </button>
                    )}

                    {attachment.canEdit && (
                      <button
                        type="button"
                        onClick={() => openEditAttachment(attachment)}
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl border border-sky-100 bg-white px-3 py-2 text-sm font-black text-slate-600 shadow-sm transition hover:bg-sky-50 hover:text-sky-600"
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
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-black text-red-700 shadow-sm transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {deleteAttachmentMutation.isPending && deleteAttachmentMutation.variables === attachment.id ? (
                          <Loader2 className="animate-spin" size={16} />
                        ) : (
                          <Trash2 size={16} />
                        )}
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
  TASK_ONLY: { label: 'Chỉ task này', className: 'border-slate-200 bg-slate-50 text-slate-700' },
  DEPARTMENT: { label: 'Ban phụ trách', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  EVENT_PUBLIC: { label: 'Toàn sự kiện', className: 'border-sky-200 bg-sky-50 text-sky-700' },
};

const AttachmentVisibilityBadge = ({ visibility }) => {
  const meta = ATTACHMENT_VISIBILITY_META[visibility] || ATTACHMENT_VISIBILITY_META.TASK_ONLY;
  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black shadow-sm ${meta.className}`}>
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

const inputClassName = 'min-h-11 w-full min-w-0 rounded-2xl border border-sky-100 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-cyan-300 focus:bg-white focus:ring-4 focus:ring-cyan-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500';

export default TaskAttachmentsPage;
