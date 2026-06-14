import { useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { Button, ErrorState, Panel, TextInput } from './ui';

const AdminTemplateDepartmentModal = ({
  isOpen,
  department,
  isLoading,
  error,
  onSubmit,
  onClose,
}) => {
  const [formData, setFormData] = useState({
    name: department?.name || '',
    description: department?.description || '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault(); // Ngăn trình duyệt load lại trang
    onSubmit(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Panel className="relative w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 p-6">
          <h2 className="text-xl font-bold text-slate-950">
            {department ? 'Sửa phòng ban' : 'Thêm phòng ban'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {error && (
            <ErrorState
              error={error}
              title="Lỗi"
              onDismiss={() => {}}
            />
          )}

          <div className="flex flex-col gap-1">
            <label htmlFor="dept-name" className="text-sm font-semibold text-slate-700">
              Tên phòng ban *
            </label>
            <TextInput
              id="dept-name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Nhập tên phòng ban"
              disabled={isLoading}
              required
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="dept-description" className="text-sm font-semibold text-slate-700">
              Mô tả
            </label>
            <textarea
              id="dept-description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Mô tả phòng ban (tùy chọn)"
              disabled={isLoading}
              rows={3}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 resize-none"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="flex gap-2 border-t border-slate-200 p-6">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1"
          >
            Hủy
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !formData.name.trim()}
            className="flex-1"
          >
            {isLoading && <Loader2 size={18} className="animate-spin" />}
            {department ? 'Cập nhật' : 'Thêm'}
          </Button>
        </div>
      </Panel>
    </div>
  );
};

export default AdminTemplateDepartmentModal;
