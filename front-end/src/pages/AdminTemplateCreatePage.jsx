import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import {
  Button,
  ErrorState,
  SelectControl,
  TextInput,
} from '../components/ui';
import templateApi from '../api/templateApi';
import { EVENT_TYPE_OPTIONS } from '../utils/eventTypeUtils';

const AdminTemplateCreatePage = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'ACTIVE',
    eventType: '',
    objective: '',
    expectedAttendees: '',
    scale: '',
    contextDescription: '',
  });

  const createMutation = useMutation({
    mutationFn: (payload) => templateApi.createTemplate(payload),
    onSuccess: (template) => {
      navigate(`/admin/templates/${template.id}`);
    },
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.name.trim()) {
      createMutation.mutate({
        ...formData,
        eventType: formData.eventType || null,
        expectedAttendees: formData.expectedAttendees ? Number(formData.expectedAttendees) : null,
        contextDescription: formData.contextDescription || formData.description,
      });
    }
  };

  return (
    <AppLayout user={user} events={[]} selectedEvent={null} onLogout={onLogout}>
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Header */}
        <section className="flex items-center gap-4">
          <Button
            variant="subtle"
            onClick={() => navigate('/admin/templates')}
            className="flex-none"
          >
            <ArrowLeft size={18} />
            Quay lại
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-slate-950">Tạo Template</h1>
          </div>
        </section>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          {createMutation.error && (
            <ErrorState
              error={createMutation.error}
              title="Lỗi tạo template"
              onDismiss={() => createMutation.reset()}
            />
          )}

          {/* Name */}
          <div className="flex flex-col gap-1">
            <label htmlFor="name" className="text-sm font-semibold text-slate-700">
              Tên template *
            </label>
            <TextInput
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Nhập tên template"
              disabled={createMutation.isPending}
              required
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1">
            <label htmlFor="description" className="text-sm font-semibold text-slate-700">
              Mô tả
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Mô tả template (tùy chọn)"
              disabled={createMutation.isPending}
              rows={4}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 resize-none"
            />
          </div>

          {/* Status */}
          <SelectControl
            label="Trạng thái"
            name="status"
            value={formData.status}
            onChange={handleChange}
            disabled={createMutation.isPending}
          >
            <option value="ACTIVE">Kích hoạt</option>
            <option value="INACTIVE">Vô hiệu hóa</option>
          </SelectControl>

          <SelectControl
            label="Loại sự kiện"
            name="eventType"
            value={formData.eventType}
            onChange={handleChange}
            disabled={createMutation.isPending}
          >
            <option value="">-- Chọn loại sự kiện --</option>
            {EVENT_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectControl>

          <div className="flex flex-col gap-1">
            <label htmlFor="objective" className="text-sm font-semibold text-slate-700">
              Mục tiêu template
            </label>
            <textarea
              id="objective"
              name="objective"
              value={formData.objective}
              onChange={handleChange}
              placeholder="Template này giúp user đạt mục tiêu gì?"
              disabled={createMutation.isPending}
              rows={3}
              className="resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label htmlFor="expectedAttendees" className="text-sm font-semibold text-slate-700">
                Số người dự kiến
              </label>
              <TextInput
                id="expectedAttendees"
                name="expectedAttendees"
                type="number"
                min="0"
                value={formData.expectedAttendees}
                onChange={handleChange}
                placeholder="VD: 200"
                disabled={createMutation.isPending}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="scale" className="text-sm font-semibold text-slate-700">
                Quy mô
              </label>
              <TextInput
                id="scale"
                name="scale"
                value={formData.scale}
                onChange={handleChange}
                placeholder="VD: 16 đội - 2 ngày"
                disabled={createMutation.isPending}
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
              placeholder="Mô tả bối cảnh, ràng buộc, đối tượng và các hoạt động chính."
              disabled={createMutation.isPending}
              rows={3}
              className="resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 border-t border-slate-200 -mx-6 -mb-6 px-6 py-6">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate('/admin/templates')}
              disabled={createMutation.isPending}
              className="flex-1"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || !formData.name.trim()}
              className="flex-1"
            >
              {createMutation.isPending && (
                <Loader2 size={18} className="animate-spin" />
              )}
              Tạo Template
            </Button>
          </div>
        </form>

        {/* Info */}
        <div className="rounded-xl bg-blue-50 border border-blue-200 p-4">
          <p className="text-sm text-blue-900">
            <strong>Mẹo:</strong> Sau khi tạo template, bạn sẽ được chuyển đến trang chi tiết để thêm phòng ban và task.
          </p>
        </div>
      </div>
    </AppLayout>
  );
};

export default AdminTemplateCreatePage;
