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
} from 'lucide-react';
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
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="relative overflow-hidden rounded-[2rem] border border-sky-100 bg-white/85 p-6 shadow-xl shadow-sky-100/70 backdrop-blur-xl">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-sky-100 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 left-1/3 h-72 w-72 rounded-full bg-emerald-100/70 blur-3xl" />

          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br from-sky-500 to-emerald-400 text-white shadow-lg shadow-cyan-100">
                <CalendarPlus size={28} strokeWidth={1.8} />
              </div>

              <div>
                <p className="inline-flex rounded-full bg-sky-50 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-sky-600">
                  Event setup
                </p>

                <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                  Tạo sự kiện mới
                </h2>

                <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-600">
                  Bạn sẽ trở thành LEADER của sự kiện và có quyền tạo ban, tạo task,
                  xem dashboard và quản lý tiến độ.
                </p>
              </div>
            </div>

            <div className="rounded-3xl border border-emerald-100 bg-white/80 p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
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
          </div>
        </section>

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
                  <InfoItem title="2. Giao task" description="Tạo công việc, gán người phụ trách, deadline và mức ưu tiên." />
                  <InfoItem title="3. Theo dõi dashboard" description="Xem tiến độ, task quá hạn và hiệu suất từng ban." />
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