import { Edit3, Layers, Loader2, Plus, Save, Trash2, X } from 'lucide-react';
import { Button, EmptyState, Panel } from '../ui';
import { formatDate } from '../../utils/dateUtils';

const PlanningCard = ({
  planning,
  isLeader,
  editingPlanningId,
  editingPlanningForm,
  setEditingPlanningForm,
  startEditingPlanning,
  cancelEditingPlanning,
  submitPlanningEdit,
  updatePlanningMutation,
  deletePlanningMutation,
  handleDeletePlanning,
  editingPhaseKey,
  editingPhaseForm,
  setEditingPhaseForm,
  startEditingPhase,
  cancelEditingPhase,
  submitPhaseEdit,
  updatePhaseMutation,
  deletePhaseMutation,
  handleDeletePhase,
  newPhaseForm,
  setNewPhaseForm,
  submitNewPhase,
  createPhaseMutation,
}) => {
  const isEditingPlanning = editingPlanningId === planning.id;
  const phases = planning.phases || [];

  return (
    <Panel className="overflow-hidden">
      <div className="border-b border-slate-100 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          {isEditingPlanning ? (
            <div className="w-full space-y-3">
              <input
                value={editingPlanningForm.title}
                onChange={(event) => setEditingPlanningForm((old) => ({ ...old, title: event.target.value }))}
                maxLength={255}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-lg font-bold text-slate-950 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
              <textarea
                value={editingPlanningForm.description}
                onChange={(event) => setEditingPlanningForm((old) => ({ ...old, description: event.target.value }))}
                maxLength={2000}
                rows={3}
                className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
          ) : (
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                <Layers size={14} />
                {phases.length} phase
              </div>
              <h3 className="mt-1 text-xl font-extrabold text-slate-950">{planning.title}</h3>
              {planning.description && <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">{planning.description}</p>}
              <p className="mt-3 text-xs font-semibold text-slate-400">
                Tạo bởi {planning.createdByName || 'Leader'} • {formatDate(planning.createdAt)}
              </p>
            </div>
          )}

          {isLeader && (
            <PlanningActionButtons
              isEditing={isEditingPlanning}
              canSave={editingPlanningForm.title.trim()}
              isSaving={updatePlanningMutation.isPending}
              isDeleting={deletePlanningMutation.isPending && deletePlanningMutation.variables?.planningId === planning.id}
              onEdit={() => startEditingPlanning(planning)}
              onSave={() => submitPlanningEdit(planning.id)}
              onCancel={cancelEditingPlanning}
              onDelete={() => handleDeletePlanning(planning)}
            />
          )}
        </div>
      </div>

      {phases.length === 0 ? (
        <div className="p-4">
          <EmptyState icon={Layers} title="Planning chưa có phase" />
        </div>
      ) : (
        <div className="bg-slate-50/50 p-3">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="grid grid-cols-[92px_minmax(0,1fr)_160px] gap-3 border-b border-slate-100 bg-slate-50 px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-500 max-lg:hidden">
              <span>Phase</span>
              <span>Nội dung</span>
              <span className="text-right">Thao tác</span>
            </div>
            {phases.map((phase, index) => (
              <PhaseRow
                key={phase.id}
                phase={phase}
                index={index}
                isLeader={isLeader}
                isEditing={editingPhaseKey === `${planning.id}-${phase.id}`}
                editingPhaseForm={editingPhaseForm}
                setEditingPhaseForm={setEditingPhaseForm}
                startEditingPhase={startEditingPhase}
                cancelEditingPhase={cancelEditingPhase}
                submitPhaseEdit={() => submitPhaseEdit({ planningId: planning.id, phaseId: phase.id })}
                updatePhaseMutation={updatePhaseMutation}
                deletePhaseMutation={deletePhaseMutation}
                handleDeletePhase={() => handleDeletePhase({ planningId: planning.id, phase })}
              />
            ))}
          </div>
        </div>
      )}

      {isLeader && (
        <QuickCreatePhase
          planning={planning}
          newPhaseForm={newPhaseForm}
          setNewPhaseForm={setNewPhaseForm}
          submitNewPhase={submitNewPhase}
          createPhaseMutation={createPhaseMutation}
        />
      )}
    </Panel>
  );
};

const PlanningActionButtons = ({
  isEditing,
  canSave,
  isSaving,
  isDeleting,
  onEdit,
  onSave,
  onCancel,
  onDelete,
}) => (
  <div className="flex shrink-0 flex-wrap gap-2">
    {isEditing ? (
      <>
        <Button type="button" onClick={onSave} disabled={!canSave || isSaving}>
          {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Lưu
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          <X size={16} />
          Hủy
        </Button>
      </>
    ) : (
      <>
        <Button type="button" variant="secondary" onClick={onEdit}>
          <Edit3 size={16} />
          Sửa
        </Button>
        <Button type="button" variant="danger" onClick={onDelete} disabled={isDeleting}>
          {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
          Xóa
        </Button>
      </>
    )}
  </div>
);

const PhaseRow = ({
  phase,
  index,
  isLeader,
  isEditing,
  editingPhaseForm,
  setEditingPhaseForm,
  startEditingPhase,
  cancelEditingPhase,
  submitPhaseEdit,
  updatePhaseMutation,
  deletePhaseMutation,
  handleDeletePhase,
}) => (
  <div className="group border-b border-slate-100 px-4 py-3 last:border-b-0 hover:bg-indigo-50/30">
    <div className="grid gap-3 lg:grid-cols-[92px_minmax(0,1fr)_160px] lg:items-start">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded bg-slate-100 text-xs font-extrabold text-slate-700">
          {index + 1}
        </span>
        <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Phase</span>
      </div>

      {isEditing ? (
        <div className="grid min-w-0 gap-3 sm:grid-cols-2">
          <input
            value={editingPhaseForm.phaseName}
            onChange={(event) => setEditingPhaseForm((old) => ({ ...old, phaseName: event.target.value }))}
            maxLength={255}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 sm:col-span-2"
          />
          <textarea
            value={editingPhaseForm.objective}
            onChange={(event) => setEditingPhaseForm((old) => ({ ...old, objective: event.target.value }))}
            maxLength={2000}
            rows={3}
            placeholder="Mục tiêu"
            className="resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
          <textarea
            value={editingPhaseForm.description}
            onChange={(event) => setEditingPhaseForm((old) => ({ ...old, description: event.target.value }))}
            maxLength={2000}
            rows={3}
            placeholder="Mô tả"
            className="resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        </div>
      ) : (
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-bold text-slate-950">{phase.phaseName}</p>
            {phase.objective && (
              <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700">
                Mục tiêu
              </span>
            )}
          </div>
          {phase.objective && <p className="mt-1 text-sm font-semibold text-indigo-700">{phase.objective}</p>}
          {phase.description && <p className="mt-1 max-w-4xl text-sm leading-6 text-slate-600">{phase.description}</p>}
        </div>
      )}

      {isLeader && (
        <div className="flex shrink-0 flex-wrap justify-start gap-2 lg:justify-end">
          {isEditing ? (
            <>
              <Button type="button" className="min-h-9 px-3 py-1.5" onClick={submitPhaseEdit} disabled={!editingPhaseForm.phaseName.trim() || updatePhaseMutation.isPending}>
                {updatePhaseMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Lưu
              </Button>
              <Button type="button" variant="secondary" className="min-h-9 px-3 py-1.5" onClick={cancelEditingPhase}>
                <X size={16} />
                Hủy
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="secondary" className="min-h-9 px-3 py-1.5" onClick={() => startEditingPhase(phase)}>
                <Edit3 size={16} />
                Sửa
              </Button>
              <Button
                type="button"
                variant="danger"
                className="min-h-9 px-3 py-1.5"
                onClick={handleDeletePhase}
                disabled={deletePhaseMutation.isPending && deletePhaseMutation.variables?.phaseId === phase.id}
              >
                {deletePhaseMutation.isPending && deletePhaseMutation.variables?.phaseId === phase.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                Xóa
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  </div>
);

const QuickCreatePhase = ({
  planning,
  newPhaseForm,
  setNewPhaseForm,
  submitNewPhase,
  createPhaseMutation,
}) => (
  <div className="border-t border-slate-100 bg-white p-4">
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
      <input
        value={newPhaseForm.phaseName}
        onChange={(event) => setNewPhaseForm((old) => ({ ...old, phaseName: event.target.value }))}
        placeholder="+ Tạo phase mới"
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
      />
      <input
        value={newPhaseForm.objective}
        onChange={(event) => setNewPhaseForm((old) => ({ ...old, objective: event.target.value }))}
        placeholder="Mục tiêu phase"
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
      />
      <Button type="button" onClick={() => submitNewPhase(planning)} disabled={!newPhaseForm.phaseName.trim() || createPhaseMutation.isPending}>
        {createPhaseMutation.isPending && createPhaseMutation.variables?.planningId === planning.id ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
        Thêm phase
      </Button>
    </div>
  </div>
);

export default PlanningCard;
