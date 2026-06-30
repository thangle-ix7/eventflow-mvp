import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AlertTriangle, FileText, Loader2, MapPin, Tag, Target, UsersRound, X } from 'lucide-react';
import { Button, Panel, TextInput } from './ui';
import templateApi from '../api/templateApi';
import departmentApi from '../api/departmentApi';
import taskApi from '../api/taskApi';
import { EVENT_TYPE_OPTIONS, getEventTypeLabel } from '../utils/eventTypeUtils';
import { formatDateOnly, formatDateTimeInput, nowDateTimeLocalValue } from '../utils/dateUtils';

const TemplateInstantiationModal = ({
  isOpen,
  template,
  onClose,
  onSuccess,
}) => {
  const minEventDateTime = nowDateTimeLocalValue();
  const [formData, setFormData] = useState(() => {
    const today = formatDateOnly(new Date());
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
  const [lastTimeField, setLastTimeField] = useState('endTime');

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
    onError: (error) => {
      const apiFieldErrors = mapEventApiErrorToFieldErrors(error);
      if (hasFieldErrors(apiFieldErrors)) {
        setErrors((old) => ({ ...old, ...apiFieldErrors }));
      }
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
    if (instantiateMutation.error) {
      instantiateMutation.reset();
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (name === 'startTime' || name === 'endTime') {
      setLastTimeField(name);
    }
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
    if ((name === 'startTime' || name === 'endTime') && (errors.startTime || errors.endTime)) {
      setErrors((prev) => ({ ...prev, startTime: '', endTime: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Tên sự kiện không được để trống';
    }
    if (!formData.startTime) {
      newErrors.startTime = 'Ngày bắt đầu không được để trống';
    } else if (formData.startTime < minEventDateTime) {
      newErrors.startTime = `Thời gian bắt đầu không được trước hiện tại (${formatDateTimeInput(minEventDateTime)})`;
    }
    if (formData.endTime && formData.endTime <= formData.startTime) {
      newErrors[lastTimeField === 'startTime' ? 'startTime' : 'endTime'] = 'Thời gian kết thúc phải sau thời gian bắt đầu';
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

  const apiFieldErrors = mapEventApiErrorToFieldErrors(instantiateMutation.error);
  const displayErrors = { ...apiFieldErrors, ...errors };
  const generalInstantiationError = instantiateMutation.error && !hasFieldErrors(apiFieldErrors);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Panel className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden">
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
        <form noValidate onSubmit={handleSubmit} className="min-h-0 flex-1 space-y-4 overflow-y-auto p-6">
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
              className={displayErrors.name ? invalidInputClassName : ''}
            />
            {displayErrors.name && (
              <FieldError>{displayErrors.name}</FieldError>
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
              min={minEventDateTime}
              required
              className={displayErrors.startTime ? invalidInputClassName : ''}
            />
            {displayErrors.startTime && (
              <FieldError>{displayErrors.startTime}</FieldError>
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
              min={formData.startTime || minEventDateTime}
              className={displayErrors.endTime ? invalidInputClassName : ''}
            />
            {displayErrors.endTime && (
              <FieldError>{displayErrors.endTime}</FieldError>
            )}
          </div>

          {/* Note */}
          <p className="text-xs text-slate-500">
            Sự kiện sẽ được tạo với {departmentCount} phòng ban và {taskCount} task từ template này.
          </p>
        </form>

        {/* Footer */}
        <div className="shrink-0 space-y-3 border-t border-slate-200 p-6">
          {generalInstantiationError && (
            <div className="max-h-40 overflow-y-auto rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-red-600 shadow-sm">
                    <AlertTriangle className="h-5 w-5" strokeWidth={1.8} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-black">Lỗi tạo sự kiện</p>
                    <p className="mt-1 whitespace-normal break-words text-sm font-semibold leading-6">
                      {instantiateMutation.error?.userMessage || instantiateMutation.error?.message}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => instantiateMutation.reset()}
                  className="self-end rounded-full px-3 py-1 text-sm font-black text-red-700 transition hover:bg-white hover:text-red-800 sm:self-start"
                >
                  Đóng
                </button>
              </div>
            </div>
          )}
          <div className="flex gap-2">
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

const invalidInputClassName = 'border-red-500 focus:border-red-500 focus:ring-red-100';

const FieldError = ({ children }) => (
  <p className="text-xs font-semibold text-red-600">{children}</p>
);

const getErrorMessage = (error) => error?.userMessage || error?.message || '';

const hasFieldErrors = (errors) => Object.values(errors || {}).some(Boolean);

const mapEventApiErrorToFieldErrors = (error) => {
  const message = getErrorMessage(error);
  const normalized = message.toLowerCase();
  const errors = {};
  if (!message) {
    return errors;
  }
  if (normalized.includes('tên') || normalized.includes('name')) {
    errors.name = message;
  }
  if (normalized.includes('bắt đầu') || normalized.includes('starttime') || normalized.includes('eventdate')) {
    errors.startTime = message;
  }
  if (normalized.includes('kết thúc') || normalized.includes('endtime')) {
    errors.endTime = message;
  }
  return errors;
};

const FieldLabel = ({ htmlFor, icon, children }) => (
  <label htmlFor={htmlFor} className="flex items-center gap-2 text-sm font-semibold text-slate-700">
    <span className="text-indigo-500">{icon}</span>
    {children}
  </label>
);

export default TemplateInstantiationModal;
