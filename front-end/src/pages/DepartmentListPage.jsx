import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import AiSuggestionDetailModal from '../components/AiSuggestionDetailModal';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import { Button, ErrorState, LoadingState, Panel } from '../components/ui';
import aiSuggestionApi from '../api/aiSuggestionApi';
import departmentApi from '../api/departmentApi';
import eventApi from '../api/eventApi';
import eventMemberApi from '../api/eventMemberApi';
import ErrorPage from './ErrorPage';
import { getDepartmentHomePath, getEventPermissions } from '../utils/permissionUtils';
import { stripHiddenSuggestionKeys } from '../utils/aiSuggestionUtils';

const DepartmentListPage = ({ user, onLogout }) => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editingDepartmentId, setEditingDepartmentId] = useState(null);
  const [editingForm, setEditingForm] = useState({ name: '', description: '', leaderUserId: '' });
  const [aiInstruction, setAiInstruction] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [isBulkCreateOpen, setIsBulkCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

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
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['eventDepartments', eventId] });
    },
  });

  const assignLeaderMutation = useMutation({
    mutationFn: ({ department, leaderUserId }) => departmentApi.updateDepartment({
      eventId,
      departmentId: department.id,
      payload: {
        name: department.name,
        description: department.description || '',
        leaderUserId: leaderUserId ? Number(leaderUserId) : null,
      },
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventDepartments', eventId] });
      queryClient.invalidateQueries({ queryKey: ['eventMembers', eventId] });
      queryClient.invalidateQueries({ queryKey: ['leaderSnapshot', eventId] });
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
    setDeleteTarget(department);
  };

  const confirmDeleteDepartment = () => {
    if (!deleteTarget) {
      return;
    }

    deleteDepartmentMutation.mutate({ eventId, departmentId: deleteTarget.id });
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
            <div className="flex flex-wrap justify-end gap-2" data-guide-target="department-create-actions">
              <Button
                type="button"
                onClick={() => setIsBulkCreateOpen((old) => !old)}
                variant="secondary"
                className="min-h-11 rounded-2xl border-sky-100 bg-white font-black text-sky-700 shadow-sm"
              >
                Tạo nhiều ban
              </Button>
              <Button
                as={Link}
                to={`/events/${eventId}/departments/new`}
                className="min-h-11 rounded-2xl bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400 font-black text-white shadow-xl shadow-cyan-100"
              >
                Tạo 1 ban
              </Button>
            </div>

            {isBulkCreateOpen && (
              <DepartmentBulkCreatePanel
                eventId={eventId}
                members={members}
                queryClient={queryClient}
                onClose={() => setIsBulkCreateOpen(false)}
              />
            )}

            <DepartmentAiSuggestionPanel
              instruction={aiInstruction}
              setInstruction={setAiInstruction}
              suggestions={aiSuggestions}
              toggleSuggestion={toggleAiSuggestion}
              updateSuggestion={(key, updater) => setAiSuggestions((old) => old.map((department) => (
                department.key === key ? updater(department) : department
              )))}
              suggestMutation={aiSuggestionMutation}
              saveMutation={saveAiDepartmentsMutation}
            />

            <Panel className="overflow-hidden" data-guide-target="department-list">
              <div className="flex flex-col gap-3 border-b border-sky-100 bg-white px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-lg font-black text-slate-950">
                  Danh sách ban tổ chức
                </h3>

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

              {(updateDepartmentMutation.error || deleteDepartmentMutation.error || assignLeaderMutation.error) && (
                <div className="p-5">
                  <ErrorState
                    error={updateDepartmentMutation.error || deleteDepartmentMutation.error || assignLeaderMutation.error}
                    title="Không cập nhật được ban"
                  />
                </div>
              )}

              {!departmentsQuery.isLoading && departments.length === 0 && (
                <div className="p-5">
                  <div className="rounded-2xl border border-dashed border-sky-100 bg-sky-50/40 px-5 py-8 text-center">
                    <h4 className="text-base font-black text-slate-950">Chưa có ban tổ chức</h4>
                    <p className="mx-auto mt-2 max-w-xl text-sm font-semibold leading-6 text-slate-500">
                      Bạn có thể tạo thủ công hoặc dùng AI để gợi ý nhanh các ban phù hợp với sự kiện.
                    </p>
                    <Button as={Link} to={`/events/${eventId}/departments/new`} className="mt-4">
                      Tạo ban đầu tiên
                    </Button>
                  </div>
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
                        <th className="px-5 py-4 text-right">Thao tác</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-sky-50">
                      {departments.map((department) => (
                        <DepartmentRow
                          key={department.id}
                          department={department}
                          isEditing={editingDepartmentId === department.id}
                          editingForm={editingForm}
                          setEditingForm={setEditingForm}
                          members={members}
                          startEditing={startEditing}
                          cancelEditing={cancelEditing}
                          submitEditing={submitEditing}
                          handleDelete={handleDelete}
                          updateDepartmentMutation={updateDepartmentMutation}
                          assignLeaderMutation={assignLeaderMutation}
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
      <DeleteConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Xóa ban tổ chức"
        message={`Bạn có chắc chắn muốn xóa ban "${deleteTarget?.name || 'này'}"? Các phân công thành viên trong ban sẽ không còn hiển thị.`}
        isLoading={deleteDepartmentMutation.isPending}
        onConfirm={confirmDeleteDepartment}
        onCancel={() => setDeleteTarget(null)}
      />
    </AppLayout>
  );
};

const createEmptyDepartmentRow = () => ({
  id: crypto.randomUUID(),
  name: '',
  description: '',
  leaderUserId: '',
});

const DepartmentBulkCreatePanel = ({ eventId, members, queryClient, onClose }) => {
  const [rows, setRows] = useState([createEmptyDepartmentRow()]);
  const [localError, setLocalError] = useState('');

  const createMutation = useMutation({
    mutationFn: async (filledRows) => Promise.all(filledRows.map((row) => departmentApi.createDepartment({
      eventId,
      payload: {
        name: row.name.trim(),
        description: row.description,
        leaderUserId: row.leaderUserId ? Number(row.leaderUserId) : null,
      },
    }))),
    onSuccess: () => {
      setRows([createEmptyDepartmentRow()]);
      setLocalError('');
      queryClient.invalidateQueries({ queryKey: ['eventDepartments', eventId] });
      queryClient.invalidateQueries({ queryKey: ['eventMembers', eventId] });
      queryClient.invalidateQueries({ queryKey: ['leaderSnapshot', eventId] });
      onClose();
    },
  });

  const updateRow = (rowId, field, value) => {
    setLocalError('');
    setRows((old) => old.map((row) => (row.id === rowId ? { ...row, [field]: value } : row)));
  };

  const addRow = () => setRows((old) => [...old, createEmptyDepartmentRow()]);

  const removeRow = (rowId) => {
    setRows((old) => (old.length === 1 ? [createEmptyDepartmentRow()] : old.filter((row) => row.id !== rowId)));
  };

  const saveRows = () => {
    const filledRows = rows.filter((row) => row.name.trim());
    if (filledRows.length === 0) {
      setLocalError('Cần nhập ít nhất một tên ban.');
      return;
    }
    createMutation.mutate(filledRows);
  };

  return (
    <Panel className="overflow-hidden p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sky-100 bg-white px-5 py-4">
        <div>
          <h3 className="text-lg font-black text-slate-950">Tạo ban theo danh sách</h3>
          <p className="mt-1 text-sm font-semibold text-slate-500">Nhập nhiều dòng giống tạo task nhanh.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={addRow} disabled={createMutation.isPending} className="rounded-2xl border border-sky-100 bg-white px-3 py-2 text-sm font-black text-sky-700 shadow-sm hover:bg-sky-50 disabled:opacity-60">
            Thêm dòng
          </button>
          <button type="button" onClick={onClose} disabled={createMutation.isPending} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-600 shadow-sm hover:bg-slate-50 disabled:opacity-60">
            Đóng
          </button>
        </div>
      </div>

      {(localError || createMutation.error) && (
        <div className="p-5">
          <ErrorState error={localError || createMutation.error} title="Không tạo được ban" />
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-sky-50/70 text-xs font-black uppercase tracking-[0.14em] text-slate-500">
            <tr>
              <th className="w-14 px-5 py-3">#</th>
              <th className="px-5 py-3">Tên ban</th>
              <th className="px-5 py-3">Trưởng ban</th>
              <th className="px-5 py-3">Mô tả</th>
              <th className="w-24 px-5 py-3 text-right">Xóa</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sky-50">
            {rows.map((row, index) => (
              <tr key={row.id} className="bg-white">
                <td className="px-5 py-3 font-black text-slate-500">{index + 1}</td>
                <td className="px-5 py-3">
                  <input value={row.name} onChange={(event) => updateRow(row.id, 'name', event.target.value)} disabled={createMutation.isPending} className={inputClassName} placeholder="Tên ban" />
                </td>
                <td className="px-5 py-3">
                  <select value={row.leaderUserId} onChange={(event) => updateRow(row.id, 'leaderUserId', event.target.value)} disabled={createMutation.isPending} className={inputClassName}>
                    <option value="">Chưa chọn</option>
                    {members.map((member) => <option key={member.userId} value={member.userId}>{member.name}</option>)}
                  </select>
                </td>
                <td className="px-5 py-3">
                  <textarea value={row.description} onChange={(event) => updateRow(row.id, 'description', event.target.value)} disabled={createMutation.isPending} rows={1} className={`${inputClassName} min-h-11 resize-y py-3`} placeholder="Mô tả" />
                </td>
                <td className="px-5 py-3 text-right">
                  <button type="button" onClick={() => removeRow(row.id)} disabled={createMutation.isPending} className="rounded-xl px-3 py-2 text-sm font-black text-red-600 hover:bg-red-50 disabled:opacity-60">
                    Xóa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-sky-100 bg-white px-5 py-4">
        <span className="text-sm font-black text-slate-500">{rows.length} dòng đang nhập</span>
        <button type="button" onClick={saveRows} disabled={createMutation.isPending} className="rounded-2xl bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400 px-4 py-2 text-sm font-black text-white shadow-lg shadow-cyan-100 disabled:opacity-60">
          {createMutation.isPending ? 'Đang tạo...' : 'Lưu danh sách ban'}
        </button>
      </div>
    </Panel>
  );
};
const DepartmentAiSuggestionPanel = ({
  instruction,
  setInstruction,
  suggestions,
  toggleSuggestion,
  updateSuggestion,
  suggestMutation,
  saveMutation,
}) => {
  const selectedCount = suggestions.filter((department) => department.selected).length;
  const [detailSuggestion, setDetailSuggestion] = useState(null);

  return (
    <Panel className="overflow-hidden p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="text-sm font-black uppercase tracking-[0.18em] text-sky-600">
            AI gợi ý ban tổ chức
          </div>
        </div>

        <div className="flex w-full flex-col gap-2 sm:flex-row lg:max-w-xl">
          <input
            value={instruction}
            onChange={(event) => setInstruction(event.target.value)}
            placeholder="Bối cảnh AI"
            className={inputClassName}
          />

          <Button
            type="button"
            variant="secondary"
            onClick={() => suggestMutation.mutate()}
            disabled={suggestMutation.isPending}
            className="shrink-0 rounded-2xl border-sky-100 bg-white font-black text-sky-600 shadow-sm hover:bg-sky-50"
          >
            {suggestMutation.isPending ? 'Đang gợi ý...' : 'Gợi ý'}
          </Button>
        </div>
      </div>

      {(suggestMutation.error || saveMutation.error) && (
        <div className="mt-4">
          <ErrorState
            error={suggestMutation.error || saveMutation.error}
            title="Không xử lý được gợi ý AI"
          />
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="mt-5 space-y-4">
          <div className="overflow-x-auto rounded-2xl border border-sky-100 bg-white">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead className="bg-sky-50/70 text-xs font-black uppercase tracking-[0.08em] text-slate-500">
                <tr>
                  <th className="w-14 px-4 py-3">Chọn</th>
                  <th className="px-4 py-3">Ban</th>
                  <th className="px-4 py-3">Mô tả AI gợi ý</th>
                  <th className="w-36 px-4 py-3 text-right">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sky-50">
                {suggestions.map((department) => (
                  <tr
                    key={department.key}
                    role="button"
                    tabIndex={0}
                    onClick={() => setDetailSuggestion(department)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setDetailSuggestion(department);
                      }
                    }}
                    className={[
                      'cursor-pointer transition hover:bg-sky-50/70',
                      department.selected ? 'bg-sky-50/50' : 'bg-white',
                    ].join(' ')}
                  >
                    <td className="px-4 py-3 align-top">
                      <input
                        type="checkbox"
                        checked={department.selected}
                        onChange={(event) => {
                          event.stopPropagation();
                          toggleSuggestion(department.key);
                        }}
                        onClick={(event) => event.stopPropagation()}
                        className="h-4 w-4 rounded border-sky-200 text-sky-600 focus:ring-sky-200"
                        aria-label={department.selected ? 'Bỏ chọn gợi ý' : 'Chọn gợi ý'}
                      />
                    </td>
                    <td className="px-4 py-3 align-top font-black text-slate-950">
                      {department.name}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <p className="line-clamp-2 font-semibold leading-6 text-slate-600">
                        {department.description || 'Chưa có mô tả'}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right align-top text-xs font-black text-cyan-600">
                      Chi tiết
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
              {saveMutation.isPending ? 'Đang lưu...' : 'Lưu đã chọn'}
            </Button>
          </div>
        </div>
      )}

      <AiSuggestionDetailModal
        isOpen={Boolean(detailSuggestion)}
        title={detailSuggestion?.name || 'Chi tiết department gợi ý'}
        suggestion={detailSuggestion}
        onSave={(updatedSuggestion) => {
          const cleaned = stripHiddenSuggestionKeys(updatedSuggestion);
          updateSuggestion(detailSuggestion.key, (department) => ({
            ...department,
            ...cleaned,
            key: department.key,
            selected: department.selected,
          }));
        }}
        onClose={() => setDetailSuggestion(null)}
      />
    </Panel>
  );
};

const DepartmentRow = ({
  department,
  isEditing,
  editingForm,
  setEditingForm,
  members,
  startEditing,
  cancelEditing,
  submitEditing,
  handleDelete,
  updateDepartmentMutation,
  assignLeaderMutation,
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
          <span className="block min-w-0 truncate font-black text-slate-950">
            {department.name}
          </span>
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
          <div className="min-w-0 space-y-1.5" onClick={(event) => event.stopPropagation()}>
            <select
              value={department.leaderUserId ? String(department.leaderUserId) : ''}
              onChange={(event) => assignLeaderMutation.mutate({ department, leaderUserId: event.target.value })}
              disabled={assignLeaderMutation.isPending || members.length === 0}
              className={inputClassName}
              aria-label={`Gán trưởng ban cho ${department.name}`}
            >
              <option value="">Chưa chọn trưởng ban</option>
              {members.map((member) => (
                <option key={member.userId} value={member.userId}>
                  {member.name}
                </option>
              ))}
            </select>
            {department.leaderEmail && (
              <span className="block truncate text-xs font-semibold text-slate-500">
                {department.leaderEmail}
              </span>
            )}
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
                className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 px-3 py-2 text-sm font-black text-white shadow-lg shadow-emerald-100 transition hover:-translate-y-0.5 hover:shadow-xl active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
              >
                {updateDepartmentMutation.isPending ? 'Đang lưu...' : 'Lưu'}
              </button>

              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  cancelEditing();
                }}
                className="inline-flex items-center justify-center rounded-2xl border border-sky-100 bg-white px-3 py-2 text-sm font-black text-slate-600 shadow-sm transition hover:bg-sky-50 hover:text-sky-600 active:translate-y-px"
              >
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
                className="inline-flex items-center justify-center rounded-2xl border border-sky-100 bg-sky-50 px-3 py-2 text-sm font-black text-sky-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-white hover:shadow-lg hover:shadow-sky-100 active:translate-y-px"
              >
                Sửa
              </button>

              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  handleDelete(department);
                }}
                disabled={deletingThisDepartment}
                className="inline-flex items-center justify-center rounded-2xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-black text-red-600 shadow-sm transition hover:-translate-y-0.5 hover:border-red-200 hover:bg-red-100 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deletingThisDepartment ? 'Đang xóa...' : 'Xóa'}
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
};

const inputClassName = 'w-full rounded-2xl border border-sky-100 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-cyan-300 focus:bg-white focus:ring-4 focus:ring-cyan-100';

export default DepartmentListPage;

const normalizeName = (value) => String(value || '').trim().toLowerCase();
