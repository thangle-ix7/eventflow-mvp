import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Loader2, X } from 'lucide-react';
import { Button, ErrorState, Panel, TextInput } from './ui';
import templateApi from '../api/templateApi';

const TemplateInstantiationModal = ({
  isOpen,
  template,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    startDate: '',
    endDate: '',
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (template?.name) {
      setFormData((prev) => ({
        ...prev,
        name: `${template.name} - $(new Date().toLocaleDateString('vi-VN')}`,
      }));
    }
  }, [template]);

  const instantiateMutation = useMutation({
    mutationFn: () =>
      templateApi.instantiateTemplate(template.id, {
        name: formData.name,
        startDate: formData.startDate,
        endDate: formData.endDate,
      }),
    onSuccess: (newEvent) => {
      setFormData({ name: '', startDate: '', endDate: '' });
      onSuccess(newEvent);
    },
  });

  if (!isOpen || !template) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Tên sự kiện không được để trống';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      instantiateMutation.mutate();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Panel className="relative w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 p-6">
          <h2 className="text-xl font-bold text-slate-950">Tạo sự kiện từ template</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {instantiateMutation.error && (
            <ErrorState
              error={instantiateMutation.error}
              title="Lỗi tạo sự kiện"
              onDismiss={() => instantiateMutation.reset()}
            />
          )}

          {/* Template Info */}
          <div className="rounded-lg bg-indigo-50 border border-indigo-200 p-3">
            <p className="text-xs font-semibold text-indigo-700">TEMPLATE</p>
            <p className="mt-1 font-medium text-indigo-900">{template.name}</p>
          </div>

          {/* Event Name */}
          <div className="flex flex-col gap-1">
            <label htmlFor="name" className="text-sm font-semibold text-slate-700">
              Tên sự kiện *
            </label>
            <TextInput
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              placeholder="Nhập tên sự kiện"
              disabled={instantiateMutation.isPending}
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && (
              <p className="text-xs text-red-600">{errors.name}</p>
            )}
          </div>

          {/* Start Date */}
          <div className="flex flex-col gap-1">
            <label htmlFor="startDate" className="text-sm font-semibold text-slate-700">
              Ngày bắt đầu (tùy chọn)
            </label>
            <TextInput
              id="startDate"
              name="startDate"
              type="date"
              value={formData.startDate}
              onChange={handleChange}
              disabled={instantiateMutation.isPending}
            />
          </div>

          {/* End Date */}
          <div className="flex flex-col gap-1">
            <label htmlFor="endDate" className="text-sm font-semibold text-slate-700">
              Ngày kết thúc (tùy chọn)
            </label>
            <TextInput
              id="endDate"
              name="endDate"
              type="date"
              value={formData.endDate}
              onChange={handleChange}
              disabled={instantiateMutation.isPending}
            />
          </div>

          {/* Note */}
          <p className="text-xs text-slate-500">
            Sự kiện sẽ được tạo với {template.departmentCount || 0} phòng ban và{' '}
            {template.taskCount || 0} task từ template này.
          </p>
        </form>

        {/* Footer */}
        <div className="flex gap-2 border-t border-slate-200 p-6">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={instantiateMutation.isPending}
            className="flex-1"
          >
            Hủy
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={instantiateMutation.isPending}
            className="flex-1"
          >
            {instantiateMutation.isPending && (
              <Loader2 size={18} className="animate-spin" />
            )}
            Tạo sự kiện
          </Button>
        </div>
      </Panel>
    </div>
  );
};

export default TemplateInstantiationModal;
