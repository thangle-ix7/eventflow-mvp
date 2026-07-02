import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
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
  const [deleteTarget, setDeleteTarget] = useState(null);

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
      setDeleteTarget(null);
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
    setDeleteTarget(attachment);
  };

  const confirmDeleteAttachment = () => {
    if (!deleteTarget) {
      return;
    }
    deleteAttachmentMutation.mutate(deleteTarget.id);
  };

  return (
    <AppLayout
      user={user}
      events={event ? [event] : []}
      selectedEvent={event}
      onEventChange={() => {}}
      onLogout={onLogout}
    >
      <div className="space-y-5">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-600">Tệp đính kèm</p>
            <h2 className="mt-1 truncate text-2xl font-black text-slate-950">
              {task?.title || 'Attachment của task'}
            </h2>
          </div>
          <p className="text-sm font-bold text-slate-500">{attachments.length} tài liệu</p>
        </header>

        {(eventQuery.isLoading || taskQuery.isLoading) && (
          <div className="flex items-center gap-2 rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm font-bold text-slate-600">
            <Loader2 size={16} className="animate-spin text-sky-600" />
            Đang tải thông tin task...
          </div>
        )}

        {canAttach && (
          <section className="rounded-xl border border-sky-100 bg-white">
            <div className="border-b border-sky-100 px-4 py-3">
              <h3 className="text-base font-black text-slate-950">Thêm tài liệu</h3>
            </div>

            <form onSubmit={handleAttachmentSubmit} className="grid gap-3 p-4">
              <div className="grid gap-3 xl:grid-cols-[minmax(240px,1fr)_minmax(180px,0.8fr)_minmax(260px,1.2fr)_170px_auto]">
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp,.zip,application/zip,application/x-zip-compressed"
                  onChange={handleAttachmentFilesChange}
                  className={inputClassName}
                />

                <input
                  type="text"
                  value={attachmentLinkTitle}
                  onChange={(event) => setAttachmentLinkTitle(event.target.value)}
                  maxLength={255}
                  placeholder="Tên link"
                  className={inputClassName}
                />

                <input
                  type="url"
                  value={attachmentLinkUrl}
                  onChange={(event) => {
                    setAttachmentLinkUrl(event.target.value);
                    setLocalError(validateAttachmentInput(attachmentFiles, event.target.value));
                  }}
                  placeholder="Link tài liệu"
                  className={inputClassName}
                />

                {isLeader ? (
                  <select
                    value={attachmentVisibility}
                    onChange={(event) => setAttachmentVisibility(event.target.value)}
                    className={inputClassName}
                  >
                    {ATTACHMENT_VISIBILITY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                ) : (
                  <div className="flex min-h-10 items-center rounded-lg border border-sky-100 bg-slate-50 px-3 text-sm font-semibold text-slate-500">
                    Chỉ task này
                  </div>
                )}

                <button
                  type="submit"
                  disabled={uploadAttachmentsMutation.isPending || (!attachmentFiles.length && !attachmentLinkUrl.trim())}
                  className={primaryButtonClassName}
                >
                  {uploadAttachmentsMutation.isPending ? 'Đang thêm...' : 'Thêm'}
                </button>
              </div>

              {attachmentFiles.length > 0 && (
                <p className="text-xs font-semibold text-slate-500">
                  Đã chọn: {attachmentFiles.map((file) => file.name).join(', ')}
                </p>
              )}

              {(localError || uploadAttachmentsMutation.error) && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                  {localError || uploadAttachmentsMutation.error.userMessage || uploadAttachmentsMutation.error.message}
                </div>
              )}
            </form>
          </section>
        )}

        <section className="overflow-hidden rounded-xl border border-sky-100 bg-white">
          <div className="flex items-center justify-between border-b border-sky-100 px-4 py-3">
            <h3 className="text-base font-black text-slate-950">Danh sách tài liệu</h3>
            {attachmentsQuery.isLoading && (
              <span className="flex items-center gap-2 text-sm font-bold text-slate-500">
                <Loader2 size={15} className="animate-spin text-sky-600" />
                Đang tải
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[980px] w-full border-collapse text-left text-sm">
              <thead className="bg-sky-50/80 text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                <tr>
                  <th className={thClassName}>Tên tài liệu</th>
                  <th className={thClassName}>Loại</th>
                  <th className={thClassName}>Người tải</th>
                  <th className={thClassName}>Ngày</th>
                  <th className={thClassName}>Phạm vi</th>
                  <th className={`${thClassName} text-right`}>Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sky-100">
                {!attachmentsQuery.isLoading && attachments.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm font-semibold text-slate-500">
                      Chưa có tài liệu đính kèm.
                    </td>
                  </tr>
                )}

                {attachments.map((attachment) => (
                  editingAttachmentId === attachment.id ? (
                    <tr key={attachment.id}>
                      <td colSpan={6} className="bg-sky-50/40 px-4 py-3">
                        <form onSubmit={(event) => handleEditSubmit(event, attachment)} className="grid gap-3">
                          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
                            <input
                              value={editForm.originalName}
                              onChange={(event) => setEditForm((old) => ({ ...old, originalName: event.target.value }))}
                              maxLength={255}
                              className={inputClassName}
                              placeholder="Tên tài liệu"
                            />

                            {isLeader && (
                              <select
                                value={editForm.visibility}
                                onChange={(event) => setEditForm((old) => ({ ...old, visibility: event.target.value }))}
                                className={inputClassName}
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
                              className={inputClassName}
                              placeholder="URL tài liệu"
                              type="url"
                            />
                          )}

                          {updateAttachmentMutation.error && (
                            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                              {updateAttachmentMutation.error.userMessage || updateAttachmentMutation.error.message}
                            </div>
                          )}

                          <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => setEditingAttachmentId(null)} className={secondaryButtonClassName}>Hủy</button>
                            <button type="submit" disabled={updateAttachmentMutation.isPending} className={primaryButtonClassName}>
                              {updateAttachmentMutation.isPending ? 'Đang lưu...' : 'Lưu'}
                            </button>
                          </div>
                        </form>
                      </td>
                    </tr>
                  ) : (
                    <tr key={attachment.id} className="hover:bg-sky-50/50">
                      <td className={tdClassName}>
                        <div className="max-w-[360px] truncate font-black text-slate-900" title={attachment.originalName}>
                          {attachment.originalName}
                        </div>
                        {attachment.attachmentType === 'LINK' && attachment.externalUrl && (
                          <div className="mt-1 max-w-[360px] truncate text-xs font-semibold text-slate-500" title={attachment.externalUrl}>
                            {attachment.externalUrl}
                          </div>
                        )}
                      </td>
                      <td className={tdClassName}>{attachment.attachmentType === 'LINK' ? 'Link' : formatFileSize(attachment.sizeBytes)}</td>
                      <td className={tdClassName}>{attachment.uploaderName || 'Không rõ'}</td>
                      <td className={tdClassName}>{formatDate(attachment.createdAt)}</td>
                      <td className={tdClassName}><AttachmentVisibilityBadge visibility={attachment.visibility} /></td>
                      <td className={`${tdClassName} text-right`}>
                        <div className="flex flex-wrap justify-end gap-2">
                          {attachment.attachmentType === 'LINK' ? (
                            <a href={attachment.externalUrl} target="_blank" rel="noreferrer" className={secondaryButtonClassName}>Mở link</a>
                          ) : (
                            <button type="button" onClick={() => handleAttachmentDownload(attachment)} className={secondaryButtonClassName}>Tải xuống</button>
                          )}

                          {attachment.canEdit && (
                            <button type="button" onClick={() => openEditAttachment(attachment)} className={secondaryButtonClassName}>Sửa</button>
                          )}

                          {attachment.canDelete && (
                            <button
                              type="button"
                              onClick={() => handleDeleteAttachment(attachment)}
                              disabled={deleteAttachmentMutation.isPending && deleteAttachmentMutation.variables === attachment.id}
                              className={dangerButtonClassName}
                            >
                              {deleteAttachmentMutation.isPending && deleteAttachmentMutation.variables === attachment.id ? 'Đang xóa...' : 'Xóa'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
      <DeleteConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Xóa tài liệu đính kèm"
        message={`Bạn có chắc chắn muốn xóa "${deleteTarget?.originalName || 'tài liệu này'}"? File/link này sẽ không còn hiển thị trong task.`}
        isLoading={deleteAttachmentMutation.isPending}
        onConfirm={confirmDeleteAttachment}
        onCancel={() => setDeleteTarget(null)}
      />
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
  return <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-black ${meta.className}`}>{meta.label}</span>;
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
  if (!sizeBytes) return '0 B';
  if (sizeBytes < 1024 * 1024) return `${Math.round(sizeBytes / 1024)} KB`;
  return `${(sizeBytes / 1024 / 1024).toFixed(1)} MB`;
};

const inputClassName = 'min-h-10 w-full min-w-0 rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500';
const thClassName = 'whitespace-nowrap px-4 py-3';
const tdClassName = 'align-middle px-4 py-3 text-sm font-semibold text-slate-700';
const primaryButtonClassName = 'inline-flex min-h-10 items-center justify-center rounded-lg bg-sky-600 px-4 py-2 text-sm font-black text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60';
const secondaryButtonClassName = 'inline-flex min-h-9 items-center justify-center rounded-lg border border-sky-100 bg-white px-3 py-1.5 text-sm font-black text-slate-600 transition hover:bg-sky-50 hover:text-sky-700';
const dangerButtonClassName = 'inline-flex min-h-9 items-center justify-center rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-black text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60';

export default TaskAttachmentsPage;
