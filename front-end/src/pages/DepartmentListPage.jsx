import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Building2,
  CheckCircle2,
  Circle,
  Edit3,
  Loader2,
  Plus,
  Save,
  Sparkles,
  Trash2,
  UserRound,
  X,
} from 'lucide-react';
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

  const eventQuery = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => eventApi.getEvent(eventId),
    enabled: Boolean(eventId),
  });

  const event = eventQuery.data;
  const permissions = getEventPermissions(event);
  const isLeader = permissions.canManageDepartments;
  const departmentHomePath = getDepartmentHomePath(event);

  const departmentsQuery = useQuery({
    queryKey: ['eventDepartments', eventId],
    queryFn: () => departmentApi.getEventDepartments(eventId),
    enabled: Boolean(eventId && isLeader),
  });

  const membersQuery = useQuery({
    queryKey: ['eventMembers', eventId],
    queryFn: () => eventMemberApi.getMembers(eventId),
    enabled: Boolean(eventId && isLeader),
  });

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
    <AppLayout
      user={user}
      events={event ? [event] : []}
      selectedEvent={event}
      onEventChange={() => {}}
      onLogout={onLogout}
    >
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
              description="Quản lý danh sách ban, trưởng ban và cơ cấu nhân sự cho sự kiện."
              actions={isLeader && (
                <Button
                  as={Link}
                  to={`/events/${eventId}/departments/new`}
                  className="min-h-11 rounded-2xl bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400 font-black text-white shadow-xl shadow-cyan-100"
                >
                  <Plus size={18} />
                  Tạo ban
                </Button>
              )}
              meta={
                <>
                  <span className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-white px-3 py-1.5 font-black text-sky-600 shadow-sm">
                    <Building2 size={16} />
                    {departments.length} ban tổ chức
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-white px-3 py-1.5 font-black text-emerald-600 shadow-sm">
                    <UserRound size={16} />
                    {members.length} thành viên sự kiện
                  </span>
                </>
              }
            />

            <DepartmentAiSuggestionPanel
              instruction={aiInstruction}
              setInstruction={setAiInstruction}
              suggestions={aiSuggestions}
              toggleSuggestion={toggleAiSuggestion}
              suggestMutation={aiSuggestionMutation}
              saveMutation={saveAiDepartmentsMutation}
            />

            <Panel className="overflow-hidden">
              <div className="flex flex-col gap-3 border-b border-sky-100 bg-gradient-to-r from-sky-50 via-white to-emerald-50 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-emerald-400 text-white shadow-lg shadow-cyan-100">
                    <Building2 className="h-5 w-5" strokeWidth={1.8} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-950">
                      Danh sách ban tổ chức
                    </h3>
                    <p className="mt-1 text-sm font-semibold text-slate-500">
                      Click vào một dòng để mở chi tiết ban.
                    </p>
                  </div>
                </div>

                <span className="inline-flex w-fit items-center rounded-full border border-sky-100 bg-white px-3 py-1.5 text-xs font-black text-sky-600 shadow-sm">
                  {departments.length} phòng ban
                </span>
              </div>

              {departmentsQuery.isLoading && (
                <div className="p-5">
                  <LoadingState message="Đang tải danh sách ban..." />
                </div>
              )}

              {departmentsQuery.error && (
                <div className="p-5">
                  <ErrorState error={departmentsQuery.error} title="Không tải được danh sách ban" />
                </div>
              )}

              {(updateDepartmentMutation.error || deleteDepartmentMutation.error) && (
                <div className="p-5">
                  <ErrorState
                    error={updateDepartmentMutation.error || deleteDepartmentMutation.error}
                    title="Không cập nhật được ban"
                  />
                </div>
              )}

              {!departmentsQuery.isLoading && departments.length === 0 && (
                <div className="p-5">
                  <EmptyState
                    icon={Building2}
                    title="Chưa có ban tổ chức"
                    description="Bạn có thể tạo thủ công hoặc dùng AI để gợi ý nhanh các ban phù hợp với sự kiện."
                    actions={
                      <Button as={Link} to={`/events/${eventId}/departments/new`}>
                        <Plus size={16} />
                        Tạo ban đầu tiên
                      </Button>
                    }
                  />
                </div>
              )}

              {!departmentsQuery.isLoading && departments.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[980px] text-left text-sm">
                    <thead className="bg-sky-50/70 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                      <tr>
                        <th className="px-5 py-4">Ban</th>
                        <th className="px-5 py-4">Trưởng ban</th>
                        <th className="px-5 py-4">Mô tả</th>
                        {isLeader && <th className="px-5 py-4 text-right">Thao tác</th>}
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-sky-50">
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
    <Panel className="relative overflow-hidden p-5">
      <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-sky-100 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-emerald-100/70 blur-3xl" />

      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-emerald-400 text-white shadow-lg shadow-cyan-100">
            <Sparkles size={22} strokeWidth={1.8} />
          </div>

          <div>
            <div className="text-sm font-black uppercase tracking-[0.18em] text-sky-600">
              AI gợi ý ban tổ chức
            </div>
            <p className="mt-1 max-w-xl text-sm font-semibold leading-6 text-slate-500">
              Nhập bối cảnh sự kiện để AI đề xuất các ban phù hợp, sau đó chọn ban cần lưu.
            </p>
          </div>
        </div>

        <div className="flex w-full flex-col gap-2 sm:flex-row lg:max-w-xl">
          <input
            value={instruction}
            onChange={(event) => setInstruction(event.target.value)}
            placeholder="Context cho AI, ví dụ: sự kiện âm nhạc 500 người, cần hậu cần, truyền thông..."
            className={inputClassName}
          />

          <Button
            type="button"
            variant="secondary"
            onClick={() => suggestMutation.mutate()}
            disabled={suggestMutation.isPending}
            className="shrink-0 rounded-2xl border-sky-100 bg-white font-black text-sky-600 shadow-sm hover:bg-sky-50"
          >
            {suggestMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            Gợi ý
          </Button>
        </div>
      </div>

      {(suggestMutation.error || saveMutation.error) && (
        <div className="relative mt-4">
          <ErrorState
            error={suggestMutation.error || saveMutation.error}
            title="Không xử lý được gợi ý AI"
          />
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="relative mt-5 space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {suggestions.map((department) => (
              <button
                key={department.key}
                type="button"
                onClick={() => toggleSuggestion(department.key)}
                className={[
                  'group rounded-3xl border p-4 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-xl',
                  department.selected
                    ? 'border-sky-200 bg-sky-50/80 shadow-sky-100'
                    : 'border-sky-100 bg-white hover:bg-sky-50/60 hover:shadow-sky-100',
                ].join(' ')}
              >
                <div className="flex items-start gap-3">
                  {department.selected ? (
                    <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-sky-600" />
                  ) : (
                    <Circle size={20} className="mt-0.5 shrink-0 text-slate-300" />
                  )}

                  <div className="min-w-0">
                    <p className="font-black text-slate-950">{department.name}</p>
                    {department.description && (
                      <p className="mt-2 line-clamp-3 text-sm font-semibold leading-6 text-slate-600">
                        {department.description}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-sky-100 pt-4">
            <p className="text-sm font-black text-slate-500">
              Đã chọn {selectedCount}/{suggestions.length}
            </p>

            <Button
              type="button"
              onClick={() => saveMutation.mutate(suggestions)}
              disabled={selectedCount === 0 || saveMutation.isPending}
              className="rounded-2xl bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400 font-black text-white shadow-xl shadow-cyan-100"
            >
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
      className={`transition ${isEditing ? 'bg-sky-50/60' : 'cursor-pointer hover:bg-sky-50/70'}`}
      title={isEditing ? undefined : 'Mở chi tiết ban'}
    >
      <td className="px-5 py-4">
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
            className={inputClassName}
          />
        ) : (
          <div className="flex min-w-0 items-center gap-3 rounded-2xl p-1.5 transition hover:bg-white hover:shadow-sm">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-emerald-400 text-white shadow-lg shadow-cyan-100">
              <Building2 size={19} />
            </span>
            <span className="min-w-0 truncate font-black text-slate-950">
              {department.name}
            </span>
          </div>
        )}
      </td>

      <td className="px-5 py-4">
        {isEditing ? (
          <select
            value={editingForm.leaderUserId}
            onChange={(event) => setEditingForm((old) => ({ ...old, leaderUserId: event.target.value }))}
            onClick={(event) => event.stopPropagation()}
            className={inputClassName}
          >
            <option value="">Chưa chọn</option>
            {members.map((member) => (
              <option key={member.userId} value={member.userId}>
                {member.name}
              </option>
            ))}
          </select>
        ) : (
          <div className="flex min-w-0 items-center gap-3 text-slate-700">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-500">
              <UserRound size={17} />
            </span>

            <span className="min-w-0">
              <span className="block truncate font-black text-slate-800">
                {department.leaderName || 'Chưa có trưởng ban'}
              </span>
              {department.leaderEmail && (
                <span className="block truncate text-xs font-semibold text-slate-500">
                  {department.leaderEmail}
                </span>
              )}
            </span>
          </div>
        )}
      </td>

      <td className="px-5 py-4">
        {isEditing ? (
          <textarea
            value={editingForm.description}
            onChange={(event) => setEditingForm((old) => ({ ...old, description: event.target.value }))}
            onClick={(event) => event.stopPropagation()}
            maxLength={1000}
            rows={2}
            className={`${inputClassName} min-h-20 resize-y py-3`}
          />
        ) : (
          <p className="line-clamp-2 max-w-xl font-semibold leading-6 text-slate-600">
            {department.description || 'Chưa có mô tả nhiệm vụ cho ban này.'}
          </p>
        )}
      </td>

      {isLeader && (
        <td className="px-5 py-4">
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
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 px-3 py-2 text-sm font-black text-white shadow-lg shadow-emerald-100 transition hover:-translate-y-0.5 hover:shadow-xl active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
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
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-sky-100 bg-white px-3 py-2 text-sm font-black text-slate-600 shadow-sm transition hover:bg-sky-50 hover:text-sky-600 active:translate-y-px"
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
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-sky-100 bg-sky-50 px-3 py-2 text-sm font-black text-sky-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-white hover:shadow-lg hover:shadow-sky-100 active:translate-y-px"
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
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-black text-red-600 shadow-sm transition hover:-translate-y-0.5 hover:border-red-200 hover:bg-red-100 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
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

const inputClassName = 'w-full rounded-2xl border border-sky-100 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-cyan-300 focus:bg-white focus:ring-4 focus:ring-cyan-100';

export default DepartmentListPage;

const normalizeName = (value) => String(value || '').trim().toLowerCase();