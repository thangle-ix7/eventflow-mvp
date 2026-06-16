import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  CalendarPlus,
  Clock3,
  FileText,
  Loader2,
  MapPin,
  ShieldCheck,
  Sparkles,
  Tag,
  Target,
  UsersRound,
} from 'lucide-react';
import AppLayout from '../components/AppLayout';
import eventApi from '../api/eventApi';
import { EVENT_TYPE_OPTIONS } from '../utils/eventTypeUtils';

const EventCreatePage = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
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
      eventType: form.eventType || null,
      objective: form.objective,
      expectedAttendees: form.expectedAttendees ? Number(form.expectedAttendees) : null,
      scale: form.scale,
      contextDescription: form.contextDescription || form.description,
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
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Choice Section */}
        <div className="grid gap-3 sm:grid-cols-2 lg:max-w-2xl lg:mx-auto">
          <div className="rounded-xl border-2 border-blue-600 bg-blue-50 p-4">
            <p className="text-sm font-semibold text-blue-900">Chế độ hiện tại</p>
            <p className="mt-2 text-center text-lg font-bold text-blue-700">Tạo từ đầu</p>
          </div>
          <Link
            to="/events/new/from-template"
            className="rounded-xl border-2 border-slate-300 bg-white p-4 text-center transition hover:border-indigo-300 hover:bg-indigo-50"
          >
            <p className="text-sm font-semibold text-slate-600">Hoặc chọn</p>
            <p className="mt-2 text-lg font-bold text-slate-700">Dùng Template</p>
          </Link>
        </div>

        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div>
                <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-sky-600">
                  <CalendarPlus size={15} strokeWidth={1.8} />
                  Event setup
                </p>

                <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                  Tạo sự kiện mới
                </h2>

                <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-600">
                  Bạn sẽ trở thành LEADER của sự kiện và có quyền tạo ban, tạo task,
                  xem dashboard và quản lý tiến độ.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white text-emerald-600">
                  <ShieldCheck className="h-5 w-5" strokeWidth={1.8} />
                </div>

                <div>
                  <p className="text-sm font-black text-slate-950">Leader permission</p>
                  <p className="mt-1 max-w-xs text-xs font-semibold leading-5 text-slate-500">
                    Sau khi tạo, bạn có thể thiết lập ban tổ chức, thành viên và kế hoạch công việc.
                  </p>
                </div>
              </div>
            </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1fr_0.7fr]">
          <form
            onSubmit={handleSubmit}
            className="relative overflow-hidden rounded-[2rem] border border-sky-100 bg-white shadow-xl shadow-sky-100/70"
          >
            <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-sky-100 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-emerald-100/70 blur-3xl" />

            <div className="relative border-b border-sky-100 bg-gradient-to-r from-sky-50 via-white to-emerald-50 px-6 py-5">
              <h3 className="text-xl font-black text-slate-950">
                Thông tin sự kiện
              </h3>
              <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                Điền thông tin cơ bản để EventFlow tạo không gian quản lý sự kiện.
              </p>
            </div>

            <div className="relative space-y-5 p-6">
              {createEventMutation.error && (
                <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-red-600 shadow-sm">
                    <AlertCircle size={18} />
                  </div>
                  <span className="leading-6">
                    {createEventMutation.error.userMessage ||
                      createEventMutation.error.message}
                  </span>
                </div>
              )}

              <Field
                label="Tên sự kiện"
                icon={<CalendarPlus className="h-4 w-4" strokeWidth={1.8} />}
                hint="Tên nên rõ ràng, dễ nhận diện với thành viên."
              >
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  maxLength={255}
                  placeholder="Ví dụ: Lễ tốt nghiệp K8 2026"
                  className={inputClassName}
                />
              </Field>

              <Field
                label="Loại sự kiện"
                icon={<Tag className="h-4 w-4" strokeWidth={1.8} />}
                hint="Dùng để chọn template, phân loại dashboard và chuẩn bị leader snapshot sau beta."
              >
                <select
                  name="eventType"
                  value={form.eventType}
                  onChange={handleChange}
                  className={inputClassName}
                >
                  <option value="">-- Chọn loại sự kiện --</option>
                  {EVENT_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field
                label="Mô tả chi tiết"
                icon={<FileText className="h-4 w-4" strokeWidth={1.8} />}
                hint="Mô tả phạm vi, mục tiêu, các khu vực hoặc hoạt động chính của sự kiện."
              >
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={5}
                  placeholder="Ví dụ: Sự kiện gồm lễ khai mạc, check-in khách mời, khu vực hậu cần, truyền thông và tổng kết."
                  className={`${inputClassName} min-h-32 resize-y py-3`}
                />
              </Field>

              <Field
                label="Mục tiêu sự kiện"
                icon={<Target className="h-4 w-4" strokeWidth={1.8} />}
                hint="Một câu rõ ràng để ban tổ chức hiểu sự kiện cần đạt điều gì."
              >
                <textarea
                  name="objective"
                  value={form.objective}
                  onChange={handleChange}
                  rows={3}
                  maxLength={2000}
                  placeholder="Ví dụ: Tổ chức giải đấu công bằng, đúng lịch, an toàn và tạo trải nghiệm tốt cho 16 đội tham gia."
                  className={`${inputClassName} min-h-24 resize-y py-3`}
                />
              </Field>

              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  label="Số người dự kiến"
                  icon={<UsersRound className="h-4 w-4" strokeWidth={1.8} />}
                >
                  <input
                    name="expectedAttendees"
                    type="number"
                    min="0"
                    value={form.expectedAttendees}
                    onChange={handleChange}
                    placeholder="Ví dụ: 200"
                    className={inputClassName}
                  />
                </Field>

                <Field
                  label="Quy mô"
                  icon={<Sparkles className="h-4 w-4" strokeWidth={1.8} />}
                >
                  <input
                    name="scale"
                    value={form.scale}
                    onChange={handleChange}
                    maxLength={100}
                    placeholder="Ví dụ: 16 đội - 2 ngày"
                    className={inputClassName}
                  />
                </Field>
              </div>

              <Field
                label="Bối cảnh vận hành"
                icon={<FileText className="h-4 w-4" strokeWidth={1.8} />}
                hint="Thông tin này giúp AI/template hiểu ràng buộc chính của sự kiện."
              >
                <textarea
                  name="contextDescription"
                  value={form.contextDescription}
                  onChange={handleChange}
                  rows={3}
                  maxLength={2000}
                  placeholder="Ví dụ: Sự kiện diễn ra trong 2 ngày, có nhiều trận song song, cần cập nhật tỷ số nhanh và có phương án y tế."
                  className={`${inputClassName} min-h-24 resize-y py-3`}
                />
              </Field>

              <Field
                label="Địa điểm"
                icon={<MapPin className="h-4 w-4" strokeWidth={1.8} />}
              >
                <input
                  name="location"
                  value={form.location}
                  onChange={handleChange}
                  maxLength={255}
                  placeholder="Ví dụ: Hội trường A1, Trường Đại học..."
                  className={inputClassName}
                />
              </Field>

              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  label="Thời gian bắt đầu"
                  icon={<Clock3 className="h-4 w-4" strokeWidth={1.8} />}
                >
                  <input
                    name="startTime"
                    type="datetime-local"
                    value={form.startTime}
                    onChange={handleChange}
                    required
                    className={inputClassName}
                  />
                </Field>

                <Field
                  label="Thời gian kết thúc"
                  icon={<Clock3 className="h-4 w-4" strokeWidth={1.8} />}
                >
                  <input
                    name="endTime"
                    type="datetime-local"
                    value={form.endTime}
                    onChange={handleChange}
                    min={form.startTime || undefined}
                    className={inputClassName}
                  />
                </Field>
              </div>

              <Field
                label="Trạng thái"
                icon={<Sparkles className="h-4 w-4" strokeWidth={1.8} />}
              >
                <select
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  className={inputClassName}
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="DONE">DONE</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </Field>

              <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                <Link
                  to="/events"
                  className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-sky-100 bg-white px-4 py-2 text-center text-sm font-black text-slate-600 shadow-sm transition hover:bg-sky-50 hover:text-sky-600"
                >
                  Hủy
                </Link>

                <button
                  type="submit"
                  disabled={createEventMutation.isPending}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400 px-5 py-2 text-sm font-black text-white shadow-xl shadow-cyan-100 transition hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {createEventMutation.isPending && (
                    <Loader2 size={16} className="animate-spin" />
                  )}
                  Tạo sự kiện
                </button>
              </div>
            </div>
          </form>

          <aside className="space-y-4">
            <div className="relative overflow-hidden rounded-[2rem] border border-sky-100 bg-white p-6 shadow-xl shadow-sky-100/70">
              <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-sky-100 blur-3xl" />

              <div className="relative">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
                  <Sparkles className="h-6 w-6" strokeWidth={1.8} />
                </div>

                <h3 className="text-lg font-black text-slate-950">
                  Sau khi tạo sự kiện
                </h3>

                <div className="mt-4 space-y-3">
                  <InfoItem title="1. Tạo ban tổ chức" description="Chia sự kiện thành các ban như Hậu cần, Truyền thông, Nhân sự." />
                  <InfoItem title="2. Mời thành viên" description="Mời người tham gia, gán role và ban phụ trách để bắt đầu phối hợp." />
                  <InfoItem title="3. Giao task" description="Tạo công việc, gán người phụ trách, deadline và mức ưu tiên." />
                  <InfoItem title="4. Theo dõi dashboard" description="Xem tiến độ, task quá hạn và hiệu suất từng ban." />
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-emerald-100 bg-gradient-to-br from-sky-50 via-white to-emerald-50 p-6 shadow-xl shadow-sky-100/70">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-600">
                EventFlow AI
              </p>
              <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
                Sau khi có sự kiện, bạn có thể dùng AI để gợi ý ban tổ chức và danh sách task ban đầu.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </AppLayout>
  );
};

const Field = ({ label, icon, hint, children }) => (
  <label className="block">
    <span className="flex items-center gap-2 text-sm font-black text-slate-700">
      <span className="text-sky-500">{icon}</span>
      {label}
    </span>

    <div className="mt-2">{children}</div>

    {hint && (
      <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
        {hint}
      </p>
    )}
  </label>
);

const InfoItem = ({ title, description }) => (
  <div className="rounded-2xl border border-sky-100 bg-sky-50/60 p-4">
    <p className="font-black text-slate-950">{title}</p>
    <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
      {description}
    </p>
  </div>
);

const inputClassName = 'w-full rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-cyan-300 focus:bg-white focus:ring-4 focus:ring-cyan-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500';

export default EventCreatePage;
