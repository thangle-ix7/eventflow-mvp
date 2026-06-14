import { useEffect, useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { Button, ErrorState, TextInput, SelectControl } from './ui';

const AdminTemplateTaskModal = ({
  isOpen,
  task,
  departments = [],
  isLoading,
  error,
  onSubmit,
  onClose,
}) => {
  const [formData, setFormData] = useState({
    title: task?.title || task?.name || '',
    description: task?.description || '',
    priority: task?.priority || 'MEDIUM',
    departmentId: task?.departmentId || '',
  });
  const [formError, setFormError] = useState('');

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setFormError('Tiêu đề task không được để trống');
      return;
    }

    const payload = {
      ...formData,
      departmentId: formData.departmentId ? Number(formData.departmentId) : null
    };

    onSubmit(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-md rounded-xl bg-white shadow-xl border border-slate-200 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-5">
          <h2 className="text-lg font-bold text-slate-950">
            {task ? 'Chỉnh sửa Task mẫu' : 'Thêm Task mới vào Template'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto max-h-[70vh]">
          {(error || formError) && (
            <ErrorState
              error={error || { message: formError }}
              title="Có lỗi xảy ra"
              onDismiss={() => setFormError('')}
            />
          )}

          <div className="flex flex-col gap-1">
            <label htmlFor="title" className="text-sm font-semibold text-slate-700">
              Tiêu đề Task *
            </label>
            <TextInput
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Nhập tiêu đề công việc"
              disabled={isLoading}
              required
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="description" className="text-sm font-semibold text-slate-700">
              Mô tả chi tiết
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Nhập mô tả yêu cầu công việc..."
              disabled={isLoading}
              rows={3}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="departmentId" className="text-sm font-semibold text-slate-700">
              Phòng ban phụ trách
            </label>
            <select
              id="departmentId"
              name="departmentId"
              value={formData.departmentId}
              onChange={handleChange}
              disabled={isLoading}
              className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50"
            >
              <option value="">-- Chọn phòng ban phụ trách --</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          <SelectControl
            label="Độ ưu tiên"
            name="priority"
            value={formData.priority}
            onChange={handleChange}
            disabled={isLoading}
          >
            <option value="LOW">Thấp (LOW)</option>
            <option value="MEDIUM">Trung bình (MEDIUM)</option>
            <option value="HIGH">Cao (HIGH)</option>
            <option value="URGENT">Khẩn cấp (URGENT)</option>
          </SelectControl>

          {/* Footer Actions */}
          <div className="flex gap-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading} className="flex-1">
              Hủy
            </Button>
            <Button type="submit" disabled={isLoading || !formData.title.trim()} className="flex-1">
              {isLoading && <Loader2 size={16} className="animate-spin" />}
              {task ? 'Cập nhật' : 'Lưu lại'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminTemplateTaskModal;