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
      <div className="border-b border-sky-100 bg-white px-4 py-4">
        <div className="grid gap-4">
          <div className="min-w-0">
            <h3 className="text-lg font-black text-slate-950">Tạo planning</h3>
            {aiApplied && (
              <p className="mt-1 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700">
                <CheckCircle2 size={15} />
                Đã điền nháp từ AI
              </p>
            )}
          </div>

          <label className="grid gap-2">
            <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500 sm:col-span-2">
              AI context
            </span>
            <input
              value={aiInstruction}
              onChange={(event) => setAiInstruction(event.target.value)}
              placeholder="Quy mô, mục tiêu, kiểu sự kiện..."
              className="min-h-12 min-w-0 rounded-2xl border border-sky-100 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100"
            />
            <Button type="button" variant="secondary" onClick={() => aiMutation.mutate()} disabled={aiMutation.isPending} className="min-h-12 rounded-2xl">
              {aiMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              Gợi ý AI
            </Button>
          </label>
        </div>
        {aiMutation.error && (
          <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
            {aiMutation.error.userMessage || aiMutation.error.message}
          </div>
        )}
      </div>

      <div className="grid gap-4 p-4">
        <div className="space-y-4 rounded-2xl border border-sky-100 bg-sky-50/40 p-4">
          <label className="block text-sm font-black text-slate-800">
            Tên kế hoạch
            <input
              value={form.title}
              onChange={(event) => setForm((old) => ({ ...old, title: event.target.value }))}
              maxLength={255}
              placeholder="VD: Kế hoạch vận hành sự kiện"
              className={inputClassName}
            />
          </label>
          <label className="block text-sm font-black text-slate-800">
            Mô tả
            <textarea
              value={form.description}
              onChange={(event) => setForm((old) => ({ ...old, description: event.target.value }))}
              maxLength={2000}
              rows={5}
              placeholder="Mục tiêu tổng quan, phạm vi và lưu ý vận hành."
              className={textareaClassName}
            />
          </label>
        </div>

        <div className="space-y-4 rounded-2xl border border-sky-100 bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-black text-slate-900">Phase roadmap</p>
            <Button type="button" variant="secondary" onClick={() => addDraftPhase(setForm)} className="min-h-10 rounded-2xl">
              <Plus size={16} />
              Thêm phase
            </Button>
          </div>

          <div className="space-y-3">
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

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-sky-100 bg-sky-50/50 px-4 py-4">
        <p className="rounded-2xl bg-white px-3 py-2 text-sm font-black text-slate-600 shadow-sm">
          {countFilledPhases(form.phases)} / {form.phases.length} phase có tên sẽ được lưu
        </p>
        <Button type="submit" disabled={!form.title.trim() || createMutation.isPending} className="min-h-12 rounded-2xl">
          {createMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Lưu planning
        </Button>
      </div>
    </form>
  </Panel>
);

const PhaseDraftRow = ({ phase, index, setForm, canRemove }) => (
  <div className="rounded-2xl border border-sky-100 bg-sky-50/40 p-3">
    <div className="mb-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white text-sm font-black text-sky-700 shadow-sm">
          {index + 1}
        </span>
        <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Phase</span>
      </div>

      {canRemove && (
        <button
          type="button"
          onClick={() => removeDraftPhase(setForm, index)}
          className="rounded-xl p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
          aria-label="Xóa phase"
        >
          <X size={16} />
        </button>
      )}
    </div>

    <div className="grid gap-3 lg:grid-cols-2">
      <label className="block text-xs font-black uppercase tracking-[0.12em] text-slate-500">
        Tên phase
        <input
          value={phase.phaseName}
          onChange={(event) => updateDraftPhase(setForm, index, 'phaseName', event.target.value)}
          maxLength={255}
          placeholder="VD: Chuẩn bị trước sự kiện"
          className={inputClassName}
        />
      </label>

      <label className="block text-xs font-black uppercase tracking-[0.12em] text-slate-500">
        Mục tiêu
        <input
          value={phase.objective}
          onChange={(event) => updateDraftPhase(setForm, index, 'objective', event.target.value)}
          maxLength={2000}
          placeholder="Mục tiêu phase"
          className={inputClassName}
        />
      </label>

      <label className="block text-xs font-black uppercase tracking-[0.12em] text-slate-500 lg:col-span-2">
        Mô tả
        <textarea
          value={phase.description}
          onChange={(event) => updateDraftPhase(setForm, index, 'description', event.target.value)}
          maxLength={2000}
          rows={3}
          placeholder="Các việc chính cần chuẩn bị"
          className={textareaClassName}
        />
      </label>
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

const inputClassName = 'mt-1 min-h-12 w-full rounded-2xl border border-sky-100 bg-white px-4 py-2.5 text-sm font-semibold normal-case tracking-normal text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100';
const textareaClassName = 'mt-1 min-h-[120px] w-full resize-y rounded-2xl border border-sky-100 bg-white px-4 py-3 text-sm font-semibold normal-case tracking-normal text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100';

export default PlanningComposer;
