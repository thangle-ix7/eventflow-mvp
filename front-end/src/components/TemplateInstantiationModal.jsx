import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Loader2, X } from 'lucide-react';
import { Button, ErrorState, Panel, TextInput } from './ui';
import templateApi from '../api/templateApi';
import departmentApi from '../api/departmentApi';
import taskApi from '../api/taskApi';

const TemplateInstantiationModal = ({
  isOpen,
  template,
  onClose,
  onSuccess,
}) => {
const [formData, setFormData] = useState(() => {
  const today = new Date().toLocaleDateString('vi-VN');
  return {
    name: template?.name ? `${template.name} - ${today}` : '',
    description: template?.description || '',
    startTime: '',
    endTime: '',
  };
});
  const [errors, setErrors] = useState({});

  // Fetch departments for this template
  const departmentsQuery = useQuery({
    queryKey: ['departments', template?.id],
    queryFn: () => departmentApi.getEventDepartments(template?.id),
    enabled: !!template?.id && isOpen,
  });

  // Fetch tasks for this template
  const tasksQuery = useQuery({
    queryKey: ['tasks', template?.id],
    queryFn: () => taskApi.getEventTasks(template?.id),
    enabled: !!template?.id && isOpen,
  });

  const departmentCount = departmentsQuery.data?.length || template?.departmentCount || 0;
  const taskCount = tasksQuery.data?.length || template?.taskCount || 0;


  const instantiateMutation = useMutation({
    mutationFn: () => {
      // Format datetime values to ISO 8601 format for backend
      const formatDateTime = (dateTimeStr) => {
        if (!dateTimeStr) return null;
        const dt = new Date(dateTimeStr);
        return dt.toISOString();
      };

      return templateApi.instantiateTemplate(template.id, {
        name: formData.name,
        startTime: formatDateTime(formData.startTime),
        eventDate: formatDateTime(formData.startTime), // Use startTime for eventDate too
        endTime: formData.endTime ? formatDateTime(formData.endTime) : null,
      });
    },
    onSuccess: (newEvent) => {
      setFormData({ name: '', startTime: '', endTime: '' });
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
    if (!formData.startTime) {
      newErrors.startTime = 'Ngày bắt đầu không được để trống';
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

          {/* Start Time */}
          <div className="flex flex-col gap-1">
            <label htmlFor="startTime" className="text-sm font-semibold text-slate-700">
              Ngày bắt đầu *
            </label>
            <TextInput
              id="startTime"
              name="startTime"
              type="datetime-local"
              value={formData.startTime}
              onChange={handleChange}
              disabled={instantiateMutation.isPending}
              required
              className={errors.startTime ? 'border-red-500' : ''}
            />
            {errors.startTime && (
              <p className="text-xs text-red-600">{errors.startTime}</p>
            )}
          </div>

          {/* End Time */}
          <div className="flex flex-col gap-1">
            <label htmlFor="endTime" className="text-sm font-semibold text-slate-700">
              Ngày kết thúc
            </label>
            <TextInput
              id="endTime"
              name="endTime"
              type="datetime-local"
              value={formData.endTime}
              onChange={handleChange}
              disabled={instantiateMutation.isPending}
            />
          </div>

          {/* Note */}
          <p className="text-xs text-slate-500">
            Sự kiện sẽ được tạo với {departmentCount} phòng ban và {taskCount} task từ template này.
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
