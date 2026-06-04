import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2, Users } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import { Button, PageHeader, Panel } from '../components/ui';
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
  const eventQuery = useQuery({ queryKey: ['event', eventId], queryFn: () => eventApi.getEvent(eventId), enabled: Boolean(eventId) });
  const permissions = getEventPermissions(eventQuery.data);
  const membersQuery = useQuery({ queryKey: ['eventMembers', eventId], queryFn: () => eventMemberApi.getMembers(eventId), enabled: Boolean(eventId && permissions.canManageDepartments) });
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
    <AppLayout user={user} events={eventQuery.data ? [eventQuery.data] : []} selectedEvent={eventQuery.data} onEventChange={() => {}} onLogout={onLogout}>
      <div className="mx-auto max-w-2xl space-y-6">
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
          description="Khai báo thông tin vận hành cơ bản để ban có người phụ trách và phạm vi công việc rõ ràng."
        />

        <Panel>
          <form onSubmit={handleSubmit} className="space-y-4 p-5">
          {mutation.error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{mutation.error.userMessage || mutation.error.message}</div>}
            <Field label="Tên ban">
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                maxLength={100}
                placeholder="Ví dụ: Hậu cần, Truyền thông, Kỹ thuật"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </Field>
            <Field label="Mô tả nhiệm vụ">
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                maxLength={1000}
                rows={4}
                placeholder="Mô tả phạm vi công việc, trách nhiệm chính, đầu mối phối hợp của ban..."
                className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </Field>
            <Field label="Trưởng ban">
              <select
                name="leaderUserId"
                value={form.leaderUserId}
                onChange={handleChange}
                disabled={membersQuery.isLoading}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50"
              >
                <option value="">Chưa chọn trưởng ban</option>
                {(membersQuery.data || []).map((member) => (
                  <option key={member.userId} value={member.userId}>{member.name} ({member.email})</option>
                ))}
              </select>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                <Users size={14} />
                Trưởng ban sẽ tự được gán vào ban này nếu chưa thuộc ban.
              </p>
            </Field>
            <Button type="submit" disabled={mutation.isPending} className="w-full">
              {mutation.isPending && <Loader2 size={16} className="animate-spin" />}
              Tạo ban
            </Button>
          </form>
        </Panel>
        </>
        )}
      </div>
    </AppLayout>
  );
};

const Field = ({ label, children }) => (
  <label className="block">
    <span className="text-sm font-semibold text-slate-700">{label}</span>
    <div className="mt-1">{children}</div>
  </label>
);

export default DepartmentCreatePage;
