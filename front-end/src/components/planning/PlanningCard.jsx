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
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="grid gap-4 border-b border-slate-200 bg-slate-50 px-4 py-4 xl:grid-cols-[minmax(260px,0.9fr)_minmax(0,1.2fr)_auto] xl:items-start">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-sky-600">Roadmap sự kiện</p>
          {isLeader ? (
            <input
              key={`planning-title-${planning.id}-${planning.updatedAt || planning.title}`}
              defaultValue={planning.title || ''}
              onBlur={(event) => savePlanningIfChanged('title', event.target.value)}
              maxLength={255}
              className="mt-2 min-h-11 w-full rounded-lg border border-transparent bg-white px-3 text-lg font-black text-slate-950 outline-none transition hover:border-slate-200 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100"
            />
          ) : (
            <h3 className="mt-2 text-lg font-black text-slate-950">{planning.title}</h3>
          )}
          <p className="mt-2 text-xs font-bold text-slate-500">
            {phases.length} giai đoạn · tạo {formatDate(planning.createdAt)}
          </p>
        </div>

        {isLeader ? (
          <textarea
            key={`planning-description-${planning.id}-${planning.updatedAt || planning.description}`}
            defaultValue={planning.description || ''}
            onBlur={(event) => savePlanningIfChanged('description', event.target.value)}
            maxLength={2000}
            rows={3}
            placeholder="Mục tiêu chung của sự kiện"
            className="min-h-[88px] w-full resize-y rounded-lg border border-transparent bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 hover:border-slate-200 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100"
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
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Xóa kế hoạch"
            >
              {deletePlanningMutation.isPending && deletePlanningMutation.variables?.planningId === planning.id
                ? <Loader2 size={16} className="animate-spin" />
                : <X size={17} />}
            </button>
          )}
        </div>
      </div>

      <RoadmapMarkers phases={phases} />

      <div className="grid gap-4 bg-slate-50/60 p-4 xl:grid-cols-2">
        {phases.map((phase, index) => (
          <PhaseRoadmapCard
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
          <NewPhaseCard
            planning={planning}
            form={newPhaseForm}
            setForm={setNewPhaseForm}
            submitNewPhase={submitNewPhase}
            createPhaseMutation={createPhaseMutation}
          />
        )}
      </div>
    </section>
  );
};

const RoadmapMarkers = ({ phases }) => {
  if (!phases.length) return null;

  return (
    <div className="overflow-x-auto border-b border-slate-200 bg-white px-4 py-3">
      <div className="grid min-w-[720px] gap-2" style={{ gridTemplateColumns: `repeat(${phases.length}, minmax(160px, 1fr))` }}>
        {phases.map((phase, index) => (
          <div key={`marker-${phase.id}`} className="flex items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-950 text-xs font-black text-white">
              {index + 1}
            </span>
            <span className="min-w-0 truncate text-xs font-black text-slate-700">
              {phase.phaseName || `Giai đoạn ${index + 1}`}
            </span>
            {index < phases.length - 1 && <span className="h-px flex-1 bg-slate-200" />}
          </div>
        ))}
      </div>
    </div>
  );
};

const PhaseRoadmapCard = ({
  phase,
  index,
  isLeader,
  savePhase,
  isSaving,
  isDeleting,
  onDelete,
}) => (
  <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
    <div className="mb-3 flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sm font-black text-sky-700">
          {index + 1}
        </span>
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">Giai đoạn</p>
          {isLeader ? (
            <input
              key={`phase-name-${phase.id}-${phase.updatedAt || phase.phaseName}`}
              defaultValue={phase.phaseName || ''}
              onBlur={(event) => savePhase(phase, 'phaseName', event.target.value)}
              maxLength={255}
              className={titleInputClassName}
            />
          ) : (
            <h4 className="mt-1 font-black text-slate-950">{phase.phaseName}</h4>
          )}
        </div>
      </div>

      {isLeader && (
        <div className="flex items-center gap-1">
          {isSaving && <Loader2 size={15} className="animate-spin text-cyan-600" />}
          <button
            type="button"
            onClick={onDelete}
            disabled={isDeleting}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Xóa giai đoạn"
          >
            {isDeleting ? <Loader2 size={15} className="animate-spin" /> : <X size={16} />}
          </button>
        </div>
      )}
    </div>

    <div className="grid gap-3">
      <PhaseField
        label="Mục tiêu thành công"
        value={phase.objective}
        editable={isLeader}
        onBlur={(value) => savePhase(phase, 'objective', value)}
        storageKey={`phase-objective-${phase.id}-${phase.updatedAt || phase.objective}`}
        placeholder="Kết quả cần đạt"
      />
      <PhaseField
        label="Triển khai"
        value={phase.description}
        editable={isLeader}
        onBlur={(value) => savePhase(phase, 'description', value)}
        storageKey={`phase-description-${phase.id}-${phase.updatedAt || phase.description}`}
        placeholder="Việc cần chuẩn bị"
      />
    </div>
  </article>
);

const PhaseField = ({ label, value, editable, onBlur, storageKey, placeholder }) => (
  <label className="block">
    <span className={fieldLabelClassName}>{label}</span>
    {editable ? (
      <textarea
        key={storageKey}
        defaultValue={value || ''}
        onBlur={(event) => onBlur(event.target.value)}
        maxLength={2000}
        rows={3}
        placeholder={placeholder}
        className={phaseTextareaClassName}
      />
    ) : (
      <p className="mt-1 min-h-[64px] rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm font-semibold leading-6 text-slate-700">
        {value || '-'}
      </p>
    )}
  </label>
);

const NewPhaseCard = ({ planning, form, setForm, submitNewPhase, createPhaseMutation }) => (
  <article className="rounded-xl border border-dashed border-slate-300 bg-white p-4 shadow-sm">
    <div className="mb-3 flex items-center gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-black text-slate-500">
        +
      </span>
      <div>
        <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">Giai đoạn mới</p>
        <input
          value={form.phaseName}
          onChange={(event) => setForm((old) => ({ ...old, phaseName: event.target.value }))}
          placeholder="Tên giai đoạn"
          className={titleInputClassName}
        />
      </div>
    </div>

    <label className="block">
      <span className={fieldLabelClassName}>Mục tiêu thành công</span>
      <textarea
        value={form.objective}
        onChange={(event) => setForm((old) => ({ ...old, objective: event.target.value }))}
        rows={3}
        placeholder="Kết quả cần đạt"
        className={phaseTextareaClassName}
      />
    </label>

    <label className="mt-3 block">
      <span className={fieldLabelClassName}>Triển khai</span>
      <textarea
        value={form.description}
        onChange={(event) => setForm((old) => ({ ...old, description: event.target.value }))}
        rows={3}
        placeholder="Việc cần chuẩn bị"
        className={phaseTextareaClassName}
      />
    </label>

    <button
      type="button"
      onClick={() => submitNewPhase(planning)}
      disabled={!form.phaseName.trim() || createPhaseMutation.isPending}
      className="mt-4 inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {createPhaseMutation.isPending && createPhaseMutation.variables?.planningId === planning.id
        ? <Loader2 size={16} className="animate-spin" />
        : <Plus size={16} />}
      Thêm giai đoạn
    </button>
  </article>
);

const titleInputClassName = 'mt-1 min-h-9 w-full rounded-lg border border-transparent bg-transparent px-2 text-base font-black text-slate-950 outline-none transition placeholder:text-slate-400 hover:border-slate-200 hover:bg-slate-50 focus:border-cyan-300 focus:bg-white focus:ring-2 focus:ring-cyan-100';
const fieldLabelClassName = 'text-xs font-black uppercase tracking-[0.12em] text-slate-400';
const phaseTextareaClassName = 'mt-1 min-h-[86px] w-full resize-y rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2 text-sm font-semibold leading-5 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-cyan-300 focus:bg-white focus:ring-2 focus:ring-cyan-100';

export default PlanningCard;