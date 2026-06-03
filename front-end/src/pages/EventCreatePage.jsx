import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, CalendarPlus, Loader2 } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import eventApi from '../api/eventApi';

const EventCreatePage = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: '',
    description: '',
    location: '',
    startTime: '',
    endTime: '',
    status: 'ACTIVE',
  });

  const createEventMutation = useMutation({
    mutationFn: eventApi.createEvent,
    onSuccess: (createdEvent) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['eventsPage'] });
      navigate(`/events/${createdEvent.id}`, { replace: true });
    },
  });

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((old) => ({ ...old, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    createEventMutation.mutate({
      name: form.name,
      description: form.description,
      location: form.location,
      startTime: form.startTime,
      endTime: form.endTime,
      status: form.status,
    });
  };

  return (
    <AppLayout
      user={user}
      events={[]}
      selectedEvent={null}
      onEventChange={() => {}}
      onLogout={onLogout}
      showTelegramOnboarding={false}
    >
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
              <CalendarPlus size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Tạo sự kiện mới</h2>
              <p className="mt-1 text-sm text-gray-500">
                Bạn sẽ trở thành LEADER của sự kiện và có quyền tạo ban, task,
                xem dashboard.
              </p>
            </div>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
        >
          {createEventMutation.error && (
            <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <span>
                {createEventMutation.error.userMessage ||
                  createEventMutation.error.message}
              </span>
            </div>
          )}

          <label className="block">
            <span className="text-sm font-medium text-gray-700">Tên sự kiện</span>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              maxLength={255}
              placeholder="Ví dụ: Lễ tốt nghiệp K8 2026"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">Mô tả chi tiết</span>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={4}
              placeholder="Ví dụ: Sự kiện gồm lễ khai mạc, check-in khách mời, khu vực hậu cần, truyền thông và tổng kết."
              className="mt-1 w-full resize-y rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">Địa điểm</span>
            <input
              name="location"
              value={form.location}
              onChange={handleChange}
              maxLength={255}
              placeholder="Ví dụ: Hội trường A1, Trường Đại học..."
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">Thời gian bắt đầu</span>
            <input
              name="startTime"
              type="datetime-local"
              value={form.startTime}
              onChange={handleChange}
              required
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">Thời gian kết thúc</span>
            <input
              name="endTime"
              type="datetime-local"
              value={form.endTime}
              onChange={handleChange}
              min={form.startTime || undefined}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">Trạng thái</span>
            <select
              name="status"
              value={form.status}
              onChange={handleChange}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="DONE">DONE</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </label>

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Link
              to="/"
              className="rounded-lg border border-gray-300 px-4 py-2 text-center text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Hủy
            </Link>
            <button
              type="submit"
              disabled={createEventMutation.isPending}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {createEventMutation.isPending && (
                <Loader2 size={16} className="animate-spin" />
              )}
              Tạo sự kiện
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
};

export default EventCreatePage;
