import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Building2,
  FileText,
  Loader2,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import AppLayout from '../components/AppLayout';
import { Button, ErrorState, PageHeader, Panel } from '../components/ui';
import departmentApi from '../api/departmentApi';
import eventApi from '../api/eventApi';
import eventMemberApi from '../api/eventMemberApi';
import ErrorPage from './ErrorPage';
import { getEventPermissions } from '../utils/permissionUtils';

const DepartmentCreatePage = ({ user, onLogout }) => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: '', description: '', leaderUserId: '' });

  const eventQuery = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => eventApi.getEvent(eventId),
    enabled: Boolean(eventId),
  });

  const permissions = getEventPermissions(eventQuery.data);

  const membersQuery = useQuery({
    queryKey: ['eventMembers', eventId],
    queryFn: () => eventMemberApi.getMembers(eventId),
    enabled: Boolean(eventId && permissions.canManageDepartments),
  });

  const mutation = useMutation({
    mutationFn: departmentApi.createDepartment,
    onSuccess: (department) => {
      queryClient.invalidateQueries({ queryKey: ['eventDepartments', eventId] });
      queryClient.invalidateQueries({ queryKey: ['eventMembers', eventId] });
      navigate(`/events/${eventId}/departments/${department.id}`, { replace: true });
    },
  });

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((old) => ({ ...old, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    mutation.mutate({
      eventId,
      payload: {
        name: form.name,
        description: form.description,
        leaderUserId: form.leaderUserId ? Number(form.leaderUserId) : null,
      },
    });
  };

  return (
    <AppLayout
      user={user}
      events={eventQuery.data ? [eventQuery.data] : []}
      selectedEvent={eventQuery.data}
      onEventChange={() => {}}
      onLogout={onLogout}
    >
      <div className="mx-auto max-w-4xl space-y-6">
        {!eventQuery.isLoading && eventQuery.data && !permissions.canManageDepartments && (
          <ErrorPage
            variant="unexpected"
            title="Không có quyền truy cập"
            message="Chỉ leader của sự kiện mới được tạo ban tổ chức."
          />
        )}

        {permissions.canManageDepartments && (
          <>
            <PageHeader
              eyebrow={eventQuery.data?.name || 'Sự kiện'}
              title="Tạo ban tổ chức"
              description="Thiết lập một ban mới, mô tả nhiệm vụ và chọn trưởng ban để quản lý công việc trong sự kiện."
              meta={
                <>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-100 bg-white px-3 py-1.5 font-black text-sky-600 shadow-sm">
                    <Building2 className="h-4 w-4" strokeWidth={1.8} />
                    Department setup
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-white px-3 py-1.5 font-black text-emerald-600 shadow-sm">
                    <ShieldCheck className="h-4 w-4" strokeWidth={1.8} />
                    Leader permission
                  </span>
                </>
              }
            />

            <div className="grid gap-6 lg:grid-cols-[1fr_0.72fr]">
              <Panel className="relative overflow-hidden">
                <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-sky-100 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-emerald-100/70 blur-3xl" />

                <form onSubmit={handleSubmit} className="relative space-y-5 p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br from-sky-500 to-emerald-400 text-white shadow-lg shadow-cyan-100">
                      <Building2 className="h-7 w-7" strokeWidth={1.8} />
                    </div>

                    <div>
                      <h3 className="text-xl font-black text-slate-950">
                        Thông tin ban tổ chức
                      </h3>
                      <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                        Điền tên ban, mô tả nhiệm vụ và chọn người phụ trách chính.
                      </p>
                    </div>
                  </div>

                  {mutation.error && (
                    <ErrorState
                      error={mutation.error}
                      title="Không tạo được ban"
                    />
                  )}

                  <Field
                    label="Tên ban"
                    icon={<Building2 className="h-4 w-4" strokeWidth={1.8} />}
                    hint="Tên nên ngắn gọn, dễ hiểu, ví dụ: Ban Hậu cần, Ban Truyền thông."
                  >
                    <input
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      required
                      maxLength={100}
                      placeholder="Ví dụ: Ban Hậu cần"
                      className={inputClassName}
                    />
                  </Field>

                  <Field
                    label="Mô tả nhiệm vụ"
                    icon={<FileText className="h-4 w-4" strokeWidth={1.8} />}
                    hint="Mô tả phạm vi công việc để thành viên hiểu rõ vai trò của ban."
                  >
                    <textarea
                      name="description"
                      value={form.description}
                      onChange={handleChange}
                      maxLength={1000}
                      rows={5}
                      placeholder="Ví dụ: Phụ trách setup sân khấu, check-in, vật dụng, điều phối khu vực..."
                      className={`${inputClassName} min-h-32 resize-y py-3`}
                    />
                  </Field>

                  <Field
                    label="Trưởng ban"
                    icon={<Users className="h-4 w-4" strokeWidth={1.8} />}
                    hint="Tự gán trưởng ban vào ban sau khi tạo."
                  >
                    <select
                      name="leaderUserId"
                      value={form.leaderUserId}
                      onChange={handleChange}
                      disabled={membersQuery.isLoading}
                      className={`${inputClassName} disabled:bg-slate-50`}
                    >
                      <option value="">Chưa chọn trưởng ban</option>
                      {(membersQuery.data || []).map((member) => (
                        <option key={member.userId} value={member.userId}>
                          {member.name} ({member.email})
                        </option>
                      ))}
                    </select>

                    {membersQuery.isLoading && (
                      <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-slate-500">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.8} />
                        Đang tải danh sách thành viên...
                      </p>
                    )}
                  </Field>

                  <Button
                    type="submit"
                    disabled={mutation.isPending}
                    className="min-h-12 w-full rounded-2xl bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400 font-black text-white shadow-xl shadow-cyan-100 transition hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-cyan-200"
                  >
                    {mutation.isPending && <Loader2 size={16} className="animate-spin" />}
                    Tạo ban
                  </Button>
                </form>
              </Panel>

              <div className="space-y-4">
                <div className="relative overflow-hidden rounded-[2rem] border border-sky-100 bg-white p-6 shadow-xl shadow-sky-100/70">
                  <div className="pointer-events-none absolute -right-14 -top-14 h-40 w-40 rounded-full bg-emerald-100 blur-3xl" />

                  <div className="relative">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                      <Sparkles className="h-6 w-6" strokeWidth={1.8} />
                    </div>

                    <h3 className="text-lg font-black text-slate-950">
                      Gợi ý đặt tên ban
                    </h3>

                    <div className="mt-4 space-y-2">
                      {['Ban Hậu cần', 'Ban Truyền thông', 'Ban Nhân sự', 'Ban Tài chính'].map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => setForm((old) => ({ ...old, name: item }))}
                          className="block w-full rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-3 text-left text-sm font-black text-slate-700 transition hover:-translate-y-0.5 hover:bg-white hover:text-sky-600 hover:shadow-lg hover:shadow-sky-100"
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="rounded-[2rem] border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-emerald-50 p-6 shadow-xl shadow-sky-100/70">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-sky-500 shadow-sm">
                      <ShieldCheck className="h-5 w-5" strokeWidth={1.8} />
                    </div>

                    <div>
                      <p className="font-black text-slate-950">Lưu ý</p>
                      <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                        Sau khi tạo ban, bạn có thể thêm thành viên, giao task và theo dõi tiến độ theo từng ban.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
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

const inputClassName = 'w-full rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-cyan-300 focus:bg-white focus:ring-4 focus:ring-cyan-100';

export default DepartmentCreatePage;