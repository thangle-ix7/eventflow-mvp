import { useState } from 'react';
import { CheckCircle2, Loader2, Plus, Save, Sparkles, X } from 'lucide-react';
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
}) => {
  const [lastAddedPhaseIndex, setLastAddedPhaseIndex] = useState(null);

  const updatePhase = (index, field, value) => {
    setForm((old) => ({
      ...old,
      phases: old.phases.map((phase, phaseIndex) => (
        phaseIndex === index ? { ...phase, [field]: value } : phase
      )),
    }));
  };

  const addPhase = () => {
    setForm((old) => {
      const nextIndex = old.phases.length;
      setLastAddedPhaseIndex(nextIndex);
      return {
        ...old,
        phases: [...old.phases, buildEmptyPhaseForm(nextIndex)],
      };
    });
  };

  const removePhase = (index) => {
    setForm((old) => {
      const phases = old.phases.filter((_phase, phaseIndex) => phaseIndex !== index);
      return {
        ...old,
        phases: phases.length
          ? phases.map((phase, phaseIndex) => ({ ...phase, orderIndex: phaseIndex }))
          : [buildEmptyPhaseForm(0)],
      };
    });
  };

  return (
  <form onSubmit={onSubmit} className="rounded-lg border border-slate-200 bg-white shadow-sm">
    <div className="grid gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 xl:grid-cols-[minmax(220px,0.8fr)_minmax(0,1.2fr)_auto] xl:items-start">
      <div className="min-w-0">
        <input
          value={form.title}
          onChange={(event) => setForm((old) => ({ ...old, title: event.target.value }))}
          maxLength={255}
          placeholder="Tên kế hoạch"
          className="min-h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-lg font-black text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100"
        />
        <p className="mt-1 text-xs font-bold text-slate-400">
          {countFilledPhases(form.phases)} dòng sẽ được lưu
        </p>
      </div>

      <textarea
        value={form.description}
        onChange={(event) => setForm((old) => ({ ...old, description: event.target.value }))}
        maxLength={2000}
        placeholder="Mô tả kế hoạch"
        rows={2}
        className={`${inputClassName} min-h-[44px] py-2`}
      />

      <div className="flex flex-col gap-2 sm:flex-row xl:justify-end">
        <button
          type="button"
          onClick={addPhase}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 transition hover:bg-slate-100"
        >
          <Plus size={16} />
          Thêm dòng
        </button>

        <button
          type="submit"
          disabled={!form.title.trim() || createMutation.isPending}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {createMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Tạo kế hoạch
        </button>
      </div>
    </div>

    <div className="grid gap-3 border-b border-slate-100 px-4 py-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
      <input
        value={aiInstruction}
        onChange={(event) => setAiInstruction(event.target.value)}
        placeholder="Bối cảnh cho AI nếu muốn gợi ý nhanh"
        className={inputClassName}
      />

      <button
        type="button"
        onClick={() => aiMutation.mutate()}
        disabled={aiMutation.isPending}
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-cyan-200 bg-white px-3 text-sm font-black text-cyan-700 transition hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {aiMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
        AI gợi ý
      </button>
    </div>

    {aiMutation.error && (
      <div className="border-t border-red-100 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">
        {aiMutation.error.userMessage || aiMutation.error.message}
      </div>
    )}

    {aiApplied && (
      <div className="flex flex-wrap items-center gap-2 border-b border-emerald-100 bg-emerald-50/60 px-4 py-2 text-sm font-black text-emerald-800">
        <CheckCircle2 size={16} />
        AI đã điền bản nháp, bạn có thể sửa từng dòng trước khi tạo.
      </div>
    )}

    <DraftPhaseSheet
      phases={form.phases}
      lastAddedPhaseIndex={lastAddedPhaseIndex}
      updatePhase={updatePhase}
      removePhase={removePhase}
    />
  </form>
  );
};

const DraftPhaseSheet = ({ phases, lastAddedPhaseIndex, updatePhase, removePhase }) => (
  <div className="overflow-x-auto bg-white">
    <table className="w-full min-w-[980px] border-collapse text-left text-sm">
      <thead className="bg-white text-xs font-black uppercase tracking-[0.12em] text-slate-500">
        <tr>
          <th className={headCellClassName}>#</th>
          <th className={headCellClassName}>Giai đoạn</th>
          <th className={headCellClassName}>Mục tiêu</th>
          <th className={headCellClassName}>Mô tả</th>
          <th className={`${headCellClassName} w-12 text-center`}> </th>
        </tr>
      </thead>
      <tbody>
        {phases.map((phase, index) => (
          <tr key={`${phase.orderIndex}-${index}`} className="align-top hover:bg-slate-50">
            <td className={indexCellClassName}>{index + 1}</td>
            <td className={bodyCellClassName}>
              <input
                autoFocus={lastAddedPhaseIndex === index}
                value={phase.phaseName}
                onChange={(event) => updatePhase(index, 'phaseName', event.target.value)}
                maxLength={255}
                placeholder="Tên giai đoạn"
                className={sheetInputClassName}
              />
            </td>
            <td className={bodyCellClassName}>
              <textarea
                value={phase.objective}
                onChange={(event) => updatePhase(index, 'objective', event.target.value)}
                maxLength={2000}
                rows={2}
                placeholder="Mục tiêu"
                className={sheetTextareaClassName}
              />
            </td>
            <td className={bodyCellClassName}>
              <textarea
                value={phase.description}
                onChange={(event) => updatePhase(index, 'description', event.target.value)}
                maxLength={2000}
                rows={2}
                placeholder="Mô tả / ghi chú"
                className={sheetTextareaClassName}
              />
            </td>
            <td className={`${bodyCellClassName} text-center`}>
              <button
                type="button"
                onClick={() => removePhase(index)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                aria-label="Xóa dòng"
              >
                <X size={16} />
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const inputClassName = 'min-h-10 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100';
const headCellClassName = 'border-b border-slate-200 px-3 py-2';
const bodyCellClassName = 'border-b border-slate-100 px-3 py-2 align-top';
const indexCellClassName = 'w-14 border-b border-slate-100 px-3 py-3 text-center text-xs font-black text-slate-400';
const sheetInputClassName = 'min-h-10 w-full rounded-md border border-transparent bg-transparent px-2 text-sm font-bold text-slate-950 outline-none transition placeholder:text-slate-400 hover:border-slate-200 hover:bg-white focus:border-cyan-300 focus:bg-white focus:ring-2 focus:ring-cyan-100';
const sheetTextareaClassName = 'min-h-[56px] w-full resize-y rounded-md border border-transparent bg-transparent px-2 py-2 text-sm font-semibold leading-5 text-slate-700 outline-none transition placeholder:text-slate-400 hover:border-slate-200 hover:bg-white focus:border-cyan-300 focus:bg-white focus:ring-2 focus:ring-cyan-100';

export default PlanningComposer;
