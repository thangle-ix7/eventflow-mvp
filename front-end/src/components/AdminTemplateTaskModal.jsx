import { useState, useEffect } from 'react';
import { Loader2, X } from 'lucide-react';
import { Button, ErrorState, Panel, TextInput, SelectControl } from './ui';

const PRIORITY_OPTIONS = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
const STATUS_OPTIONS = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];

const AdminTemplateTaskModal = ({
  isOpen,
  task,
  isLoading,
  error,
  onSubmit,
  onClose,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    priority: 'MEDIUM',
    status: 'TODO',
    departmentId: '',
  });

  useEffect(() => {
    if (task) {
      setFormData({
        name: task.name || '',
        description: task.description || '',
        priority: task.priority || 'MEDIUM',
        status: task.status || 'TODO',
        departmentId: task.departmentId || '',
      });
    } else {
      setFormData({
        name: '',
        description: '',
        priority: 'MEDIUM',
        status: 'TODO',
        departmentId: '',
      });
    }
  }, [task, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Panel className="relative w-full max-w-md max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 p-6">
          <h2 className="text-xl font-bold text-slate-950">
            {task ? 'Sửa task' : 'Thêm task'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 p-6">
          {error && (
            <ErrorState
              error={error}
              title="Lỗi"
              onDismiss={() => {}}
            />
          )}

          <div className="flex flex-col gap-1">
            <label htmlFor="task-name" className="text-sm font-semibold text-slate-700">
              Tên task *
            </label>
            <TextInput
              id="task-name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Nhập tên task"
              disabled={isLoading}
              required
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="task-description" className="text-sm font-semibold text-slate-700">
              Mô tả
            </label>
            <textarea
              id="task-description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Mô tả task (tùy chọn)"
              disabled={isLoading}
              rows={2}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 resize-none"
            />
          </div>

          <SelectControl
            label="Độ ưu tiên"
            name="priority"
            value={formData.priority}
            onChange={handleChange}
            disabled={isLoading}
          >
            {PRIORITY_OPTIONS.map((priority) => (
              <option key={priority} value={priority}>
                {priority === 'LOW' && 'Thấp'}
                {priority === 'MEDIUM' && 'Trung bình'}
                {priority === 'HIGH' && 'Cao'}
                {priority === 'URGENT' && 'Khẩn cấp'}
              </option>
            ))}
          </SelectControl>

          <SelectControl
            label="Trạng thái"
            name="status"
            value={formData.status}
            onChange={handleChange}
            disabled={isLoading}
          >
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status === 'TODO' && 'Cần làm'}
                {status === 'IN_PROGRESS' && 'Đang làm'}
                {status === 'IN_REVIEW' && 'Chờ duyệt'}
                {status === 'DONE' && 'Hoàn thành'}
              </option>
            ))}
          </SelectControl>
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
            {task ? 'Cập nhật' : 'Thêm'}
          </Button>
        </div>
      </Panel>
    </div>
  );
};

export default AdminTemplateTaskModal;
