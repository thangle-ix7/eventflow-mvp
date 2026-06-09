import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Building2, CheckCircle2, Circle, Edit3, Loader2, Plus, Save, Sparkles, Trash2, UserRound, X } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import { Button, EmptyState, ErrorState, LoadingState, PageHeader, Panel } from '../components/ui';
import aiSuggestionApi from '../api/aiSuggestionApi';
import departmentApi from '../api/departmentApi';
import eventApi from '../api/eventApi';
import eventMemberApi from '../api/eventMemberApi';
import ErrorPage from './ErrorPage';
import { getDepartmentHomePath, getEventPermissions } from '../utils/permissionUtils';

const DepartmentListPage = ({ user, onLogout }) => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editingDepartmentId, setEditingDepartmentId] = useState(null);
  const [editingForm, setEditingForm] = useState({ name: '', description: '', leaderUserId: '' });
  const [aiInstruction, setAiInstruction] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const eventQuery = useQuery({ queryKey: ['event', eventId], queryFn: () => eventApi.getEvent(eventId), enabled: Boolean(eventId) });
  const event = eventQuery.data;
  const permissions = getEventPermissions(event);
  const isLeader = permissions.canManageDepartments;
  const departmentHomePath = getDepartmentHomePath(event);
  const departmentsQuery = useQuery({ queryKey: ['eventDepartments', eventId], queryFn: () => departmentApi.getEventDepartments(eventId), enabled: Boolean(eventId && isLeader) });
  const membersQuery = useQuery({ queryKey: ['eventMembers', eventId], queryFn: () => eventMemberApi.getMembers(eventId), enabled: Boolean(eventId && isLeader) });
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
  const aiSuggestionMutation = useMutation({
    mutationFn: () => aiSuggestionApi.suggestDepartments({
      eventId,
      instruction: aiInstruction,
      count: 8,
    }),
    onSuccess: (data) => {
      const existingNames = new Set(departments.map((department) => normalizeName(department.name)));
      const suggestions = (data?.departments || [])
        .filter((department) => department.name && !existingNames.has(normalizeName(department.name)))
        .map((department, index) => ({
          ...department,
          key: `${Date.now()}-${index}`,
          selected: true,
        }));
      setAiSuggestions(suggestions);
    },
  });
  const saveAiDepartmentsMutation = useMutation({
    mutationFn: async (suggestions) => {
      const selectedSuggestions = suggestions.filter((department) => department.selected);
      const savedDepartments = [];
      for (const department of selectedSuggestions) {
        savedDepartments.push(await departmentApi.createDepartment({
          eventId,
          payload: {
            name: department.name,
            description: department.description,
            leaderUserId: department.leaderUserId ? Number(department.leaderUserId) : null,
          },
        }));
      }
      return savedDepartments;
    },
    onSuccess: () => {
      setAiSuggestions([]);
      queryClient.invalidateQueries({ queryKey: ['eventDepartments', eventId] });
      queryClient.invalidateQueries({ queryKey: ['eventMembers', eventId] });
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

  const toggleAiSuggestion = (key) => {
    setAiSuggestions((old) => old.map((department) => (
      department.key === key ? { ...department, selected: !department.selected } : department
    )));
  };

  useEffect(() => {
    if (!event || isLeader || !departmentHomePath) {
      return;
    }

    navigate(departmentHomePath, { replace: true });
  }, [departmentHomePath, event, isLeader, navigate]);

  return (
    <AppLayout user={user} events={event ? [event] : []} selectedEvent={event} onEventChange={() => {}} onLogout={onLogout}>
      <div className="space-y-6">
        {!eventQuery.isLoading && event && !isLeader && !departmentHomePath && (
          <ErrorPage
            variant="unexpected"
            title="Không có quyền truy cập"
            message="Bạn chưa được gán vào ban nào trong sự kiện này."
          />
        )}

        {isLeader && (
        <>
        <PageHeader
          eyebrow={event?.name || 'Sự kiện'}
          title="Ban tổ chức"
          actions={isLeader && (
            <Button as={Link} to={`/events/${eventId}/departments/new`}>
              <Plus size={18} />
              Tạo ban
            </Button>
          )}
        />
        <DepartmentAiSuggestionPanel
          instruction={aiInstruction}
          setInstruction={setAiInstruction}
          suggestions={aiSuggestions}
          toggleSuggestion={toggleAiSuggestion}
          suggestMutation={aiSuggestionMutation}
          saveMutation={saveAiDepartmentsMutation}
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
              <EmptyState icon={Building2} title="Chưa có ban tổ chức" />
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
        </>
        )}
      </div>
    </AppLayout>
  );
};

const DepartmentAiSuggestionPanel = ({
  instruction,
  setInstruction,
  suggestions,
  toggleSuggestion,
  suggestMutation,
  saveMutation,
}) => {
  const selectedCount = suggestions.filter((department) => department.selected).length;

  return (
    <Panel className="p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-bold text-indigo-700">
            <Sparkles size={16} />
            AI gợi ý ban tổ chức
          </div>
        </div>
        <div className="flex w-full flex-col gap-2 lg:max-w-xl sm:flex-row">
          <input
            value={instruction}
            onChange={(event) => setInstruction(event.target.value)}
            placeholder="Context cho AI"
            className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />
          <Button type="button" variant="secondary" onClick={() => suggestMutation.mutate()} disabled={suggestMutation.isPending}>
            {suggestMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            Gợi ý
          </Button>
        </div>
      </div>

      {(suggestMutation.error || saveMutation.error) && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {(suggestMutation.error || saveMutation.error).userMessage || (suggestMutation.error || saveMutation.error).message}
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="mt-4 space-y-3">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {suggestions.map((department) => (
              <button
                key={department.key}
                type="button"
                onClick={() => toggleSuggestion(department.key)}
                className={[
                  'rounded-lg border p-3 text-left transition',
                  department.selected ? 'border-indigo-200 bg-indigo-50/70' : 'border-slate-200 bg-white hover:bg-slate-50',
                ].join(' ')}
              >
                <div className="flex items-start gap-2">
                  {department.selected ? <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-indigo-600" /> : <Circle size={18} className="mt-0.5 shrink-0 text-slate-300" />}
                  <div className="min-w-0">
                    <p className="font-bold text-slate-950">{department.name}</p>
                    {department.description && <p className="mt-1 line-clamp-3 text-sm text-slate-600">{department.description}</p>}
                  </div>
                </div>
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
            <p className="text-sm font-semibold text-slate-500">Đã chọn {selectedCount}/{suggestions.length}</p>
            <Button type="button" onClick={() => saveMutation.mutate(suggestions)} disabled={selectedCount === 0 || saveMutation.isPending}>
              {saveMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Lưu đã chọn
            </Button>
          </div>
        </div>
      )}
    </Panel>
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
      title={isEditing ? undefined : 'Mở chi tiết ban'}
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

const normalizeName = (value) => String(value || '').trim().toLowerCase();
