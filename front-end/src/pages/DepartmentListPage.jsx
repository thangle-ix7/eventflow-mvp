import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Building2, Edit3, Loader2, Plus, Save, Trash2, UserRound, X } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import { Button, EmptyState, ErrorState, LoadingState, PageHeader, Panel } from '../components/ui';
import departmentApi from '../api/departmentApi';
import eventApi from '../api/eventApi';
import eventMemberApi from '../api/eventMemberApi';

const DepartmentListPage = ({ user, onLogout }) => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editingDepartmentId, setEditingDepartmentId] = useState(null);
  const [editingForm, setEditingForm] = useState({ name: '', description: '', leaderUserId: '' });
  const eventQuery = useQuery({ queryKey: ['event', eventId], queryFn: () => eventApi.getEvent(eventId), enabled: Boolean(eventId) });
  const departmentsQuery = useQuery({ queryKey: ['eventDepartments', eventId], queryFn: () => departmentApi.getEventDepartments(eventId), enabled: Boolean(eventId) });
  const membersQuery = useQuery({ queryKey: ['eventMembers', eventId], queryFn: () => eventMemberApi.getMembers(eventId), enabled: Boolean(eventId) });
  const event = eventQuery.data;
  const isLeader = event?.role === 'LEADER';
  const departments = departmentsQuery.data || [];
  const members = membersQuery.data || [];

  const updateDepartmentMutation = useMutation({
    mutationFn: departmentApi.updateDepartment,
    onSuccess: () => {
      setEditingDepartmentId(null);
      setEditingForm({ name: '', description: '', leaderUserId: '' });
      queryClient.invalidateQueries({ queryKey: ['eventDepartments', eventId] });
      queryClient.invalidateQueries({ queryKey: ['eventMembers', eventId] });
    },
  });

  const deleteDepartmentMutation = useMutation({
    mutationFn: departmentApi.deleteDepartment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventDepartments', eventId] });
    },
  });

  const startEditing = (department) => {
    setEditingDepartmentId(department.id);
    setEditingForm({
      name: department.name || '',
      description: department.description || '',
      leaderUserId: department.leaderUserId ? String(department.leaderUserId) : '',
    });
  };

  const cancelEditing = () => {
    setEditingDepartmentId(null);
    setEditingForm({ name: '', description: '', leaderUserId: '' });
  };

  const submitEditing = (departmentId) => {
    const name = editingForm.name.trim();
    if (!name || updateDepartmentMutation.isPending) {
      return;
    }

    updateDepartmentMutation.mutate({
      eventId,
      departmentId,
      payload: {
        name,
        description: editingForm.description,
        leaderUserId: editingForm.leaderUserId ? Number(editingForm.leaderUserId) : null,
      },
    });
  };

  const handleDelete = (department) => {
    const confirmed = window.confirm(`Xóa ban "${department.name}"?`);
    if (!confirmed) {
      return;
    }

    deleteDepartmentMutation.mutate({ eventId, departmentId: department.id });
  };

  const openDepartment = (departmentId) => {
    navigate(`/events/${eventId}/departments/${departmentId}`);
  };

  return (
    <AppLayout user={user} events={event ? [event] : []} selectedEvent={event} onEventChange={() => {}} onLogout={onLogout}>
      <div className="space-y-6">
        <PageHeader
          eyebrow={event?.name || 'Sự kiện'}
          title="Ban tổ chức"
          description="Quản lý thông tin cơ bản của từng ban: phạm vi phụ trách, trưởng ban và ghi chú vận hành."
          actions={isLeader && (
            <Button as={Link} to={`/events/${eventId}/departments/new`}>
              <Plus size={18} />
              Tạo ban
            </Button>
          )}
        />
        <Panel>
          {departmentsQuery.isLoading && <LoadingState message="Đang tải danh sách ban..." />}
          {departmentsQuery.error && <div className="p-4"><ErrorState error={departmentsQuery.error} title="Không tải được danh sách ban" /></div>}
          {(updateDepartmentMutation.error || deleteDepartmentMutation.error) && (
            <div className="m-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {(updateDepartmentMutation.error || deleteDepartmentMutation.error).userMessage
                || (updateDepartmentMutation.error || deleteDepartmentMutation.error).message}
            </div>
          )}
          {!departmentsQuery.isLoading && departments.length === 0 && (
            <div className="p-4">
              <EmptyState icon={Building2} title="Chưa có ban tổ chức" description="Tạo ban đầu tiên để chia công việc theo nhóm phụ trách." />
            </div>
          )}
          {!departmentsQuery.isLoading && departments.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-[900px] w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Ban</th>
                    <th className="px-4 py-3">Trưởng ban</th>
                    <th className="px-4 py-3">Mô tả</th>
                    {isLeader && <th className="px-4 py-3 text-right">Thao tác</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {departments.map((department) => (
                    <DepartmentRow
                      key={department.id}
                      department={department}
                      isLeader={isLeader}
                      isEditing={editingDepartmentId === department.id}
                      editingForm={editingForm}
                      setEditingForm={setEditingForm}
                      members={members}
                      startEditing={startEditing}
                      cancelEditing={cancelEditing}
                      submitEditing={submitEditing}
                      handleDelete={handleDelete}
                      updateDepartmentMutation={updateDepartmentMutation}
                      deleteDepartmentMutation={deleteDepartmentMutation}
                      onOpen={openDepartment}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </AppLayout>
  );
};

const DepartmentRow = ({
  department,
  isLeader,
  isEditing,
  editingForm,
  setEditingForm,
  members,
  startEditing,
  cancelEditing,
  submitEditing,
  handleDelete,
  updateDepartmentMutation,
  deleteDepartmentMutation,
  onOpen,
}) => {
  const deletingThisDepartment = deleteDepartmentMutation.isPending && deleteDepartmentMutation.variables?.departmentId === department.id;

  return (
    <tr
      onClick={isEditing ? undefined : () => onOpen(department.id)}
      className={`transition ${isEditing ? '' : 'cursor-pointer hover:bg-indigo-50/50'}`}
      title={isEditing ? undefined : 'Mở dashboard ban'}
    >
      <td className="px-4 py-3">
        {isEditing ? (
          <input
            value={editingForm.name}
            onChange={(event) => setEditingForm((old) => ({ ...old, name: event.target.value }))}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                submitEditing(department.id);
              }
              if (event.key === 'Escape') {
                cancelEditing();
              }
            }}
            autoFocus
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        ) : (
          <div className="flex min-w-0 items-center gap-3 p-1">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <Building2 size={18} />
            </span>
            <span className="min-w-0 truncate font-semibold text-slate-950">{department.name}</span>
          </div>
        )}
      </td>
      <td className="px-4 py-3">
        {isEditing ? (
          <select
            value={editingForm.leaderUserId}
            onChange={(event) => setEditingForm((old) => ({ ...old, leaderUserId: event.target.value }))}
            onClick={(event) => event.stopPropagation()}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          >
            <option value="">Chưa chọn</option>
            {members.map((member) => (
              <option key={member.userId} value={member.userId}>{member.name}</option>
            ))}
          </select>
        ) : (
          <div className="flex min-w-0 items-center gap-2 text-slate-700">
            <UserRound size={16} className="shrink-0 text-slate-400" />
            <span className="min-w-0">
              <span className="block truncate font-semibold">{department.leaderName || 'Chưa có trưởng ban'}</span>
              {department.leaderEmail && <span className="block truncate text-xs text-slate-500">{department.leaderEmail}</span>}
            </span>
          </div>
        )}
      </td>
      <td className="px-4 py-3">
        {isEditing ? (
          <textarea
            value={editingForm.description}
            onChange={(event) => setEditingForm((old) => ({ ...old, description: event.target.value }))}
            onClick={(event) => event.stopPropagation()}
            maxLength={1000}
            rows={2}
            className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        ) : (
          <p className="line-clamp-2 max-w-xl text-slate-600">
            {department.description || 'Chưa có mô tả nhiệm vụ cho ban này.'}
          </p>
        )}
      </td>
      {isLeader && (
        <td className="px-4 py-3">
          <div className="flex justify-end gap-2">
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    submitEditing(department.id);
                  }}
                  disabled={!editingForm.name.trim() || updateDepartmentMutation.isPending}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-3 py-2 text-sm font-bold text-white shadow-sm transition hover:from-emerald-600 hover:to-teal-600 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {updateDepartmentMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Lưu
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    cancelEditing();
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 shadow-sm transition hover:bg-slate-50 active:translate-y-px"
                >
                  <X size={16} />
                  Hủy
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    startEditing(department);
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-2 text-sm font-bold text-indigo-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-100 active:translate-y-px"
                >
                  <Edit3 size={16} />
                  Sửa
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleDelete(department);
                  }}
                  disabled={deletingThisDepartment}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-red-100 bg-red-50 px-3 py-2 text-sm font-bold text-red-600 shadow-sm transition hover:border-red-200 hover:bg-red-100 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {deletingThisDepartment ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  Xóa
                </button>
              </>
            )}
          </div>
        </td>
      )}
    </tr>
  );
};

export default DepartmentListPage;
