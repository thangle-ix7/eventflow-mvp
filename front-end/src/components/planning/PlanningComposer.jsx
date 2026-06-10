import { CheckCircle2, Loader2, Plus, Save, Sparkles, X } from 'lucide-react';
import { Button, Panel } from '../ui';
import { buildEmptyPhaseForm, countFilledPhases } from './planningFormUtils';

const PlanningComposer = ({
  form,
  setForm,
  aiInstruction,
  setAiInstruction,
  aiApplied,
  aiMutation,
  createMutation,
  onSubmit,
}) => (
  <Panel className="overflow-hidden">
    <form onSubmit={onSubmit}>
      <div className="border-b border-slate-100 bg-slate-50/70 p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h3 className="text-base font-extrabold text-slate-950">Tạo planning</h3>
            {aiApplied && (
              <p className="mt-1 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700">
                <CheckCircle2 size={15} />
                Đã điền nháp từ AI, bạn có thể chỉnh lại trước khi lưu.
              </p>
            )}
          </div>
          <div className="flex w-full flex-col gap-2 sm:flex-row xl:max-w-2xl">
            <input
              value={aiInstruction}
              onChange={(event) => setAiInstruction(event.target.value)}
              placeholder="Context cho AI: quy mô, mục tiêu, kiểu sự kiện..."
              className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
            <Button type="button" variant="secondary" onClick={() => aiMutation.mutate()} disabled={aiMutation.isPending}>
              {aiMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              Gợi ý AI
            </Button>
          </div>
        </div>
        {aiMutation.error && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {aiMutation.error.userMessage || aiMutation.error.message}
          </div>
        )}
      </div>

      <div className="grid gap-4 p-4 xl:grid-cols-[minmax(280px,0.85fr)_minmax(0,1.15fr)]">
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-slate-700">
            Tên kế hoạch
            <input
              value={form.title}
              onChange={(event) => setForm((old) => ({ ...old, title: event.target.value }))}
              maxLength={255}
              placeholder="VD: Kế hoạch vận hành sự kiện"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Mô tả
            <textarea
              value={form.description}
              onChange={(event) => setForm((old) => ({ ...old, description: event.target.value }))}
              maxLength={2000}
              rows={5}
              placeholder="Mục tiêu tổng quan, phạm vi và lưu ý khi chạy planning."
              className="mt-1 w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </label>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-slate-800">Phase roadmap</p>
              <p className="text-xs font-medium text-slate-500">Mỗi phase là một dòng để dễ scan và chỉnh nhanh.</p>
            </div>
            <Button type="button" variant="secondary" onClick={() => addDraftPhase(setForm)}>
              <Plus size={16} />
              Thêm phase
            </Button>
          </div>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            {form.phases.map((phase, index) => (
              <PhaseDraftRow
                key={`${index}-${phase.orderIndex}`}
                phase={phase}
                index={index}
                setForm={setForm}
                canRemove={form.phases.length > 1}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 p-4">
        <p className="text-sm font-semibold text-slate-500">
          {countFilledPhases(form.phases)} phase sẽ được lưu
        </p>
        <Button type="submit" disabled={!form.title.trim() || createMutation.isPending}>
          {createMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Lưu planning
        </Button>
      </div>
    </form>
  </Panel>
);

const PhaseDraftRow = ({ phase, index, setForm, canRemove }) => (
  <div className="grid gap-3 border-b border-slate-100 p-3 last:border-b-0 lg:grid-cols-[86px_minmax(0,1fr)_minmax(180px,0.65fr)_40px] lg:items-start">
    <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-slate-400">
      <span className="inline-flex h-7 w-7 items-center justify-center rounded bg-slate-100 text-slate-600">{index + 1}</span>
      Phase
    </div>
    <div className="grid gap-2">
      <input
        value={phase.phaseName}
        onChange={(event) => updateDraftPhase(setForm, index, 'phaseName', event.target.value)}
        maxLength={255}
        placeholder="Tên phase"
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
      />
      <textarea
        value={phase.description}
        onChange={(event) => updateDraftPhase(setForm, index, 'description', event.target.value)}
        maxLength={2000}
        rows={2}
        placeholder="Mô tả ngắn việc cần chuẩn bị"
        className="resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
      />
    </div>
    <textarea
      value={phase.objective}
      onChange={(event) => updateDraftPhase(setForm, index, 'objective', event.target.value)}
      maxLength={2000}
      rows={3}
      placeholder="Mục tiêu phase"
      className="resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
    />
    <div className="flex justify-end">
      {canRemove && (
        <button
          type="button"
          onClick={() => removeDraftPhase(setForm, index)}
          className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
          aria-label="Xóa phase"
        >
          <X size={16} />
        </button>
      )}
    </div>
  </div>
);

const addDraftPhase = (setForm) => {
  setForm((old) => ({
    ...old,
    phases: [...old.phases, buildEmptyPhaseForm(old.phases.length)],
  }));
};

const removeDraftPhase = (setForm, index) => {
  setForm((old) => ({
    ...old,
    phases: old.phases.filter((_phase, phaseIndex) => phaseIndex !== index),
  }));
};

const updateDraftPhase = (setForm, index, field, value) => {
  setForm((old) => ({
    ...old,
    phases: old.phases.map((phase, phaseIndex) => (
      phaseIndex === index ? { ...phase, [field]: value } : phase
    )),
  }));
};

export default PlanningComposer;
