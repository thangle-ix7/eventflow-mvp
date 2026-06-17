import { Loader2, Plus, X } from 'lucide-react';
import { buildPhasePayload } from './planningFormUtils';
import { formatDate } from '../../utils/dateUtils';

const PlanningCard = ({
  planning,
  isLeader,
  updatePlanningMutation,
  deletePlanningMutation,
  handleDeletePlanning,
  updatePhaseMutation,
  deletePhaseMutation,
  handleDeletePhase,
  newPhaseForm,
  setNewPhaseForm,
  submitNewPhase,
  createPhaseMutation,
}) => {
  const phases = planning.phases || [];

  const savePlanningIfChanged = (field, value) => {
    const payload = {
      title: planning.title || '',
      description: planning.description || null,
      [field]: field === 'title' ? value.trim() : (value.trim() || null),
    };
    const changed = payload.title !== (planning.title || '')
      || payload.description !== (planning.description || null);

    if (!isLeader || !payload.title || !changed) {
      return;
    }

    updatePlanningMutation.mutate({ eventId: planning.eventId, planningId: planning.id, payload });
  };

  const savePhaseIfChanged = (phase, field, value) => {
    const draft = {
      phaseName: phase.phaseName || '',
      objective: phase.objective || '',
      description: phase.description || '',
      orderIndex: phase.orderIndex ?? 0,
      [field]: value,
    };
    const payload = buildPhasePayload(draft);
    const changed = payload.phaseName !== (phase.phaseName || '')
      || payload.objective !== (phase.objective || null)
      || payload.description !== (phase.description || null)
      || payload.orderIndex !== (phase.orderIndex ?? 0);

    if (!isLeader || !payload.phaseName || !changed) {
      return;
    }

    updatePhaseMutation.mutate({
      eventId: planning.eventId,
      planningId: planning.id,
      phaseId: phase.id,
      payload,
    });
  };

  const savingPlanning = updatePlanningMutation.isPending
    && updatePlanningMutation.variables?.planningId === planning.id;

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="grid gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 xl:grid-cols-[minmax(220px,0.8fr)_minmax(0,1.2fr)_auto] xl:items-start">
        <div className="min-w-0">
          {isLeader ? (
            <input
              key={`planning-title-${planning.id}-${planning.updatedAt || planning.title}`}
              defaultValue={planning.title || ''}
              onBlur={(event) => savePlanningIfChanged('title', event.target.value)}
              maxLength={255}
              className="min-h-10 w-full rounded-md border border-transparent bg-white/70 px-2 text-lg font-black text-slate-950 outline-none transition hover:border-slate-200 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100"
            />
          ) : (
            <h3 className="text-lg font-black text-slate-950">{planning.title}</h3>
          )}
          <p className="mt-1 text-xs font-bold text-slate-400">
            {phases.length} dòng · tạo {formatDate(planning.createdAt)}
          </p>
        </div>

        {isLeader ? (
          <textarea
            key={`planning-description-${planning.id}-${planning.updatedAt || planning.description}`}
            defaultValue={planning.description || ''}
            onBlur={(event) => savePlanningIfChanged('description', event.target.value)}
            maxLength={2000}
            rows={2}
            placeholder="Mô tả kế hoạch"
            className="min-h-[44px] w-full resize-y rounded-md border border-transparent bg-white/70 px-2 py-2 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 hover:border-slate-200 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100"
          />
        ) : (
          <p className="text-sm font-semibold leading-6 text-slate-600">{planning.description || 'Chưa có mô tả.'}</p>
        )}

        <div className="flex items-center justify-end gap-2">
          {savingPlanning && <Loader2 size={16} className="animate-spin text-cyan-600" />}
          {isLeader && (
            <button
              type="button"
              onClick={() => handleDeletePlanning(planning)}
              disabled={deletePlanningMutation.isPending && deletePlanningMutation.variables?.planningId === planning.id}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Xóa kế hoạch"
            >
              {deletePlanningMutation.isPending && deletePlanningMutation.variables?.planningId === planning.id
                ? <Loader2 size={16} className="animate-spin" />
                : <X size={17} />}
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] border-collapse text-left text-sm">
          <thead className="bg-white text-xs font-black uppercase tracking-[0.12em] text-slate-500">
            <tr>
              <th className={headCellClassName}>#</th>
              <th className={headCellClassName}>Giai đoạn</th>
              <th className={headCellClassName}>Mục tiêu</th>
              <th className={headCellClassName}>Mô tả</th>
              {isLeader && <th className={`${headCellClassName} w-12 text-center`}> </th>}
            </tr>
          </thead>
          <tbody>
            {phases.map((phase, index) => (
              <PhaseSheetRow
                key={phase.id}
                phase={phase}
                index={index}
                isLeader={isLeader}
                savePhase={savePhaseIfChanged}
                isSaving={updatePhaseMutation.isPending && updatePhaseMutation.variables?.phaseId === phase.id}
                isDeleting={deletePhaseMutation.isPending && deletePhaseMutation.variables?.phaseId === phase.id}
                onDelete={() => handleDeletePhase({ planningId: planning.id, phase })}
              />
            ))}

            {isLeader && (
              <tr className="bg-slate-50/70">
                <td className={indexCellClassName}>+</td>
                <td className={bodyCellClassName}>
                  <input
                    value={newPhaseForm.phaseName}
                    onChange={(event) => setNewPhaseForm((old) => ({ ...old, phaseName: event.target.value }))}
                    placeholder="Thêm dòng giai đoạn"
                    className={sheetInputClassName}
                  />
                </td>
                <td className={bodyCellClassName}>
                  <textarea
                    value={newPhaseForm.objective}
                    onChange={(event) => setNewPhaseForm((old) => ({ ...old, objective: event.target.value }))}
                    rows={2}
                    placeholder="Mục tiêu"
                    className={sheetTextareaClassName}
                  />
                </td>
                <td className={bodyCellClassName}>
                  <textarea
                    value={newPhaseForm.description}
                    onChange={(event) => setNewPhaseForm((old) => ({ ...old, description: event.target.value }))}
                    rows={2}
                    placeholder="Mô tả / ghi chú"
                    className={sheetTextareaClassName}
                  />
                </td>
                <td className={`${bodyCellClassName} text-center`}>
                  <button
                    type="button"
                    onClick={() => submitNewPhase(planning)}
                    disabled={!newPhaseForm.phaseName.trim() || createPhaseMutation.isPending}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-slate-950 text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Thêm dòng"
                  >
                    {createPhaseMutation.isPending && createPhaseMutation.variables?.planningId === planning.id
                      ? <Loader2 size={16} className="animate-spin" />
                      : <Plus size={16} />}
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

const PhaseSheetRow = ({
  phase,
  index,
  isLeader,
  savePhase,
  isSaving,
  isDeleting,
  onDelete,
}) => (
  <tr className="hover:bg-slate-50">
    <td className={indexCellClassName}>{index + 1}</td>
    <td className={bodyCellClassName}>
      {isLeader ? (
        <input
          key={`phase-name-${phase.id}-${phase.updatedAt || phase.phaseName}`}
          defaultValue={phase.phaseName || ''}
          onBlur={(event) => savePhase(phase, 'phaseName', event.target.value)}
          maxLength={255}
          className={sheetInputClassName}
        />
      ) : (
        <p className="font-bold text-slate-950">{phase.phaseName}</p>
      )}
    </td>
    <td className={bodyCellClassName}>
      {isLeader ? (
        <textarea
          key={`phase-objective-${phase.id}-${phase.updatedAt || phase.objective}`}
          defaultValue={phase.objective || ''}
          onBlur={(event) => savePhase(phase, 'objective', event.target.value)}
          maxLength={2000}
          rows={2}
          className={sheetTextareaClassName}
        />
      ) : (
        <p className="font-semibold leading-6 text-slate-700">{phase.objective || '-'}</p>
      )}
    </td>
    <td className={bodyCellClassName}>
      {isLeader ? (
        <textarea
          key={`phase-description-${phase.id}-${phase.updatedAt || phase.description}`}
          defaultValue={phase.description || ''}
          onBlur={(event) => savePhase(phase, 'description', event.target.value)}
          maxLength={2000}
          rows={2}
          className={sheetTextareaClassName}
        />
      ) : (
        <p className="font-semibold leading-6 text-slate-600">{phase.description || '-'}</p>
      )}
    </td>
    {isLeader && (
      <td className={`${bodyCellClassName} text-center`}>
        <div className="flex items-center justify-center gap-1">
          {isSaving && <Loader2 size={15} className="animate-spin text-cyan-600" />}
          <button
            type="button"
            onClick={onDelete}
            disabled={isDeleting}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Xóa dòng"
          >
            {isDeleting ? <Loader2 size={15} className="animate-spin" /> : <X size={16} />}
          </button>
        </div>
      </td>
    )}
  </tr>
);

const headCellClassName = 'border-b border-slate-200 px-3 py-2';
const bodyCellClassName = 'border-b border-slate-100 px-3 py-2 align-top';
const indexCellClassName = 'w-14 border-b border-slate-100 px-3 py-3 text-center text-xs font-black text-slate-400';
const sheetInputClassName = 'min-h-10 w-full rounded-md border border-transparent bg-transparent px-2 text-sm font-bold text-slate-950 outline-none transition placeholder:text-slate-400 hover:border-slate-200 hover:bg-white focus:border-cyan-300 focus:bg-white focus:ring-2 focus:ring-cyan-100';
const sheetTextareaClassName = 'min-h-[56px] w-full resize-y rounded-md border border-transparent bg-transparent px-2 py-2 text-sm font-semibold leading-5 text-slate-700 outline-none transition placeholder:text-slate-400 hover:border-slate-200 hover:bg-white focus:border-cyan-300 focus:bg-white focus:ring-2 focus:ring-cyan-100';

export default PlanningCard;
