import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { FileText, Loader2, MapPin, Tag, Target, UsersRound, X } from 'lucide-react';
import { Button, ErrorState, Panel, TextInput } from './ui';
import templateApi from '../api/templateApi';
import departmentApi from '../api/departmentApi';
import taskApi from '../api/taskApi';
import { EVENT_TYPE_OPTIONS, getEventTypeLabel } from '../utils/eventTypeUtils';

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
    location: template?.location || '',
    eventType: template?.eventType || '',
    objective: template?.objective || '',
    expectedAttendees: template?.expectedAttendees ?? '',
    scale: template?.scale || '',
    contextDescription: template?.contextDescription || '',
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

  const departmentCount = getArrayCount(departmentsQuery.data, template?.departmentCount);
  const taskCount = getTaskCount(tasksQuery.data, template?.taskCount);


  const instantiateMutation = useMutation({
    mutationFn: () => {
      const formatDateTime = (dateTimeStr) => {
        if (!dateTimeStr) return null;
        return dateTimeStr;
      };

      return templateApi.instantiateTemplate(template.id, {
        name: formData.name,
        description: formData.description,
        location: formData.location,
        eventType: formData.eventType || null,
        objective: formData.objective,
        expectedAttendees: formData.expectedAttendees ? Number(formData.expectedAttendees) : null,
        scale: formData.scale,
        contextDescription: formData.contextDescription || formData.description,
        startTime: formatDateTime(formData.startTime),
        eventDate: formatDateTime(formData.startTime), // Use startTime for eventDate too
        endTime: formData.endTime ? formatDateTime(formData.endTime) : null,
      });
    },
    onSuccess: (newEvent) => {
      setFormData({
        name: '',
        description: '',
        location: '',
        eventType: '',
        objective: '',
        expectedAttendees: '',
        scale: '',
        contextDescription: '',
        startTime: '',
        endTime: '',
      });
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
      <Panel className="relative max-h-[90vh] w-full max-w-2xl overflow-hidden">
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
        <form onSubmit={handleSubmit} className="max-h-[calc(90vh-156px)] space-y-4 overflow-y-auto p-6">
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
            <p className="mt-1 text-xs font-semibold text-indigo-700">
              {getEventTypeLabel(template.eventType)} · {departmentCount} phòng ban · {taskCount} task
            </p>
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

          <FieldLabel htmlFor="eventType" icon={<Tag size={16} />}>
            Loại sự kiện
          </FieldLabel>
          <select
            id="eventType"
            name="eventType"
            value={formData.eventType}
            onChange={handleChange}
            disabled={instantiateMutation.isPending}
            className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
          >
            <option value="">-- Chọn loại sự kiện --</option>
            {EVENT_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <div className="flex flex-col gap-1">
            <FieldLabel htmlFor="description" icon={<FileText size={16} />}>
              Mô tả
            </FieldLabel>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              disabled={instantiateMutation.isPending}
              rows={3}
              className="resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
            />
          </div>

          <div className="flex flex-col gap-1">
            <FieldLabel htmlFor="location" icon={<MapPin size={16} />}>
              Địa điểm
            </FieldLabel>
            <TextInput
              id="location"
              name="location"
              type="text"
              value={formData.location}
              onChange={handleChange}
              placeholder="Nhập địa điểm nếu đã chốt"
              disabled={instantiateMutation.isPending}
            />
          </div>

          <div className="flex flex-col gap-1">
            <FieldLabel htmlFor="objective" icon={<Target size={16} />}>
              Mục tiêu sự kiện
            </FieldLabel>
            <textarea
              id="objective"
              name="objective"
              value={formData.objective}
              onChange={handleChange}
              disabled={instantiateMutation.isPending}
              rows={3}
              className="resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <FieldLabel htmlFor="expectedAttendees" icon={<UsersRound size={16} />}>
                Số người dự kiến
              </FieldLabel>
              <TextInput
                id="expectedAttendees"
                name="expectedAttendees"
                type="number"
                min="0"
                value={formData.expectedAttendees}
                onChange={handleChange}
                placeholder="Ví dụ: 200"
                disabled={instantiateMutation.isPending}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="scale" className="text-sm font-semibold text-slate-700">
                Quy mô
              </label>
              <TextInput
                id="scale"
                name="scale"
                type="text"
                value={formData.scale}
                onChange={handleChange}
                placeholder="Ví dụ: 16 đội - 2 ngày"
                disabled={instantiateMutation.isPending}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="contextDescription" className="text-sm font-semibold text-slate-700">
              Bối cảnh vận hành
            </label>
            <textarea
              id="contextDescription"
              name="contextDescription"
              value={formData.contextDescription}
              onChange={handleChange}
              disabled={instantiateMutation.isPending}
              rows={3}
              className="resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
            />
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

const getTaskCount = (rawTasks, fallback = 0) => {
  if (!rawTasks) return fallback || 0;
  if (Array.isArray(rawTasks) && rawTasks.some((item) => Array.isArray(item?.tasks))) {
    return rawTasks.flatMap((group) => group.tasks || []).length;
  }
  return rawTasks?.content?.length || rawTasks?.length || fallback || 0;
};

const getArrayCount = (data, fallback = 0) => data?.content?.length || data?.length || fallback || 0;

const FieldLabel = ({ htmlFor, icon, children }) => (
  <label htmlFor={htmlFor} className="flex items-center gap-2 text-sm font-semibold text-slate-700">
    <span className="text-indigo-500">{icon}</span>
    {children}
  </label>
);

export default TemplateInstantiationModal;
