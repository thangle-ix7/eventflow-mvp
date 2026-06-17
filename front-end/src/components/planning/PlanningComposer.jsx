import { useState } from 'react';
import { CheckCircle2, Loader2, Save, Sparkles } from 'lucide-react';
import { countFilledPhases } from './planningFormUtils';
import AiSuggestionDetailModal from '../AiSuggestionDetailModal';
import { stripHiddenSuggestionKeys } from '../../utils/aiSuggestionUtils';

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
  const [detailSuggestion, setDetailSuggestion] = useState(null);

  return (
  <form onSubmit={onSubmit} className="rounded-lg border border-slate-200 bg-white shadow-sm">
    <div className="grid gap-3 p-4 xl:grid-cols-[minmax(220px,0.8fr)_minmax(0,1fr)_minmax(220px,0.8fr)_auto_auto] xl:items-center">
      <input
        value={form.title}
        onChange={(event) => setForm((old) => ({ ...old, title: event.target.value }))}
        maxLength={255}
        placeholder="Tên kế hoạch"
        className={inputClassName}
      />

      <textarea
        value={form.description}
        onChange={(event) => setForm((old) => ({ ...old, description: event.target.value }))}
        maxLength={2000}
        placeholder="Mô tả ngắn"
        rows={1}
        className={`${inputClassName} min-h-10 py-2`}
      />

      <input
        value={aiInstruction}
        onChange={(event) => setAiInstruction(event.target.value)}
        placeholder="Bối cảnh cho AI"
        className={inputClassName}
      />

      <button
        type="button"
        onClick={() => aiMutation.mutate()}
        disabled={aiMutation.isPending}
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-cyan-200 bg-white px-3 text-sm font-black text-cyan-700 transition hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {aiMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
        AI
      </button>

      <button
        type="submit"
        disabled={!form.title.trim() || createMutation.isPending}
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {createMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
        Tạo
      </button>
    </div>

    {aiMutation.error && (
      <div className="border-t border-red-100 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">
        {aiMutation.error.userMessage || aiMutation.error.message}
      </div>
    )}

    {aiApplied && <AiPlanningPreview form={form} onOpenDetail={setDetailSuggestion} />}
    <AiSuggestionDetailModal
      isOpen={Boolean(detailSuggestion)}
      title={detailSuggestion?.phaseName || detailSuggestion?.title || 'Chi tiết kế hoạch gợi ý'}
      suggestion={detailSuggestion}
      onSave={(updatedSuggestion) => {
        const cleaned = stripHiddenSuggestionKeys(updatedSuggestion);
        setForm((old) => ({
          ...old,
          title: cleaned.title ?? old.title,
          description: cleaned.description ?? old.description,
          phases: old.phases.map((phase, index) => (
            index === detailSuggestion.__phaseIndex
              ? {
                ...phase,
                phaseName: cleaned.phaseName ?? phase.phaseName,
                objective: cleaned.objective ?? phase.objective,
                description: cleaned.phaseDescription ?? phase.description,
                orderIndex: cleaned.orderIndex ?? phase.orderIndex,
              }
              : phase
          )),
        }));
      }}
      onClose={() => setDetailSuggestion(null)}
    />
  </form>
  );
};

const AiPlanningPreview = ({ form, onOpenDetail }) => (
  <div className="border-t border-emerald-100 bg-emerald-50/40">
    <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
      <span className="inline-flex items-center gap-2 text-sm font-black text-emerald-800">
        <CheckCircle2 size={16} />
        Xem trước AI
      </span>
      <span className="text-sm font-bold text-emerald-700">
        {countFilledPhases(form.phases)} dòng sẽ được lưu
      </span>
    </div>

    <div className="overflow-x-auto bg-white">
      <table className="w-full min-w-[960px] border-collapse text-left text-sm">
        <thead className="bg-slate-50 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
          <tr>
            <th className={headCellClassName}>Kế hoạch</th>
            <th className={headCellClassName}>#</th>
            <th className={headCellClassName}>Giai đoạn</th>
            <th className={headCellClassName}>Mục tiêu</th>
            <th className={headCellClassName}>Mô tả</th>
          </tr>
        </thead>
        <tbody>
          {form.phases.map((phase, index) => (
            <tr
              key={`${phase.orderIndex}-${index}`}
              className="cursor-pointer align-top hover:bg-sky-50/60"
              onClick={() => onOpenDetail({
                title: form.title,
                description: form.description,
                phaseName: phase.phaseName,
                objective: phase.objective,
                phaseDescription: phase.description,
                orderIndex: phase.orderIndex ?? index,
                __phaseIndex: index,
              })}
            >
              <td className={bodyCellClassName}>
                {index === 0 && (
                  <div className="max-w-[320px]">
                    <p className="whitespace-pre-wrap break-words font-black text-slate-950">
                      {form.title || 'Chưa có tên kế hoạch'}
                    </p>
                    {form.description && (
                      <p className="mt-2 whitespace-pre-wrap break-words font-semibold leading-6 text-slate-600">
                        {form.description}
                      </p>
                    )}
                  </div>
                )}
              </td>
              <td className="w-14 border-b border-slate-100 px-3 py-3 text-center text-xs font-black text-slate-400">
                {index + 1}
              </td>
              <td className={bodyCellClassName}>
                <p className="whitespace-pre-wrap break-words font-bold text-slate-900">
                  {phase.phaseName || '-'}
                </p>
              </td>
              <td className={bodyCellClassName}>
                <p className="whitespace-pre-wrap break-words font-semibold leading-6 text-slate-700">
                  {phase.objective || '-'}
                </p>
              </td>
              <td className={bodyCellClassName}>
                <p className="whitespace-pre-wrap break-words font-semibold leading-6 text-slate-600">
                  {phase.description || '-'}
                </p>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const inputClassName = 'min-h-10 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100';
const headCellClassName = 'border-b border-slate-200 px-3 py-2';
const bodyCellClassName = 'border-b border-slate-100 px-3 py-3 align-top';

export default PlanningComposer;
