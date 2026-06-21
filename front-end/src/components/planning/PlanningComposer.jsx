import { useState } from 'react';
import { CheckCircle2, Loader2, Plus, Save, Sparkles, X } from 'lucide-react';
import { buildEmptyPhaseForm, countFilledPhases } from './planningFormUtils';

const QUICK_PHASES = [
  {
    phaseName: 'Khởi động',
    objective: 'Chốt phạm vi, ngân sách, timeline và người phụ trách chính.',
    description: 'Xác nhận mục tiêu sự kiện, khách mời, địa điểm dự kiến và các ràng buộc quan trọng.',
  },
  {
    phaseName: 'Chuẩn bị',
    objective: 'Hoàn tất nội dung, nhân sự, nhà cung cấp và checklist vận hành.',
    description: 'Tách việc theo ban, khóa deadline, kiểm tra rủi ro và chuẩn bị phương án dự phòng.',
  },
  {
    phaseName: 'Vận hành sự kiện',
    objective: 'Điều phối đúng timeline, xử lý phát sinh và giữ trải nghiệm khách mời ổn định.',
    description: 'Theo dõi run sheet, điểm danh nhân sự, cập nhật tình huống và quyết định nhanh tại hiện trường.',
  },
  {
    phaseName: 'Tổng kết',
    objective: 'Đóng việc, thu thập phản hồi và rút kinh nghiệm cho lần sau.',
    description: 'Gửi cảm ơn, đối soát chi phí, gom dữ liệu report và ghi nhận bài học chính.',
  },
];

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

  const applyQuickPhases = () => {
    setLastAddedPhaseIndex(null);
    setForm((old) => ({
      ...old,
      phases: QUICK_PHASES.map((phase, index) => ({
        ...buildEmptyPhaseForm(index),
        ...phase,
      })),
    }));
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
    <form onSubmit={onSubmit} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="grid gap-4 border-b border-slate-200 bg-slate-50 px-4 py-4 xl:grid-cols-[minmax(260px,0.9fr)_minmax(0,1.2fr)_auto] xl:items-start">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-sky-600">Bản đồ kế hoạch</p>
          <input
            value={form.title}
            onChange={(event) => setForm((old) => ({ ...old, title: event.target.value }))}
            maxLength={255}
            placeholder="Tên kế hoạch"
            className="mt-2 min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-lg font-black text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100"
          />
          <p className="mt-2 text-xs font-bold text-slate-500">
            {countFilledPhases(form.phases)} giai đoạn sẵn sàng lưu
          </p>
        </div>

        <textarea
          value={form.description}
          onChange={(event) => setForm((old) => ({ ...old, description: event.target.value }))}
          maxLength={2000}
          placeholder="Mục tiêu chung của sự kiện"
          rows={3}
          className={`${inputClassName} min-h-[88px] resize-y py-2`}
        />

        <div className="flex flex-col gap-2 sm:flex-row xl:flex-col xl:items-stretch">
          <button
            type="button"
            onClick={applyQuickPhases}
            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 transition hover:bg-slate-100"
          >
            Khung mẫu
          </button>
          <button
            type="button"
            onClick={addPhase}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 transition hover:bg-slate-100"
          >
            <Plus size={16} />
            Giai đoạn
          </button>
          <button
            type="submit"
            disabled={!form.title.trim() || createMutation.isPending}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
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
          placeholder="Bối cảnh AI"
          className={inputClassName}
        />

        <button
          type="button"
          onClick={() => aiMutation.mutate()}
          disabled={aiMutation.isPending}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-cyan-200 bg-white px-3 text-sm font-black text-cyan-700 transition hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-60"
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
          AI đã điền bản nháp.
        </div>
      )}

      <DraftPhaseRoadmap
        phases={form.phases}
        lastAddedPhaseIndex={lastAddedPhaseIndex}
        updatePhase={updatePhase}
        removePhase={removePhase}
      />
    </form>
  );
};

const DraftPhaseRoadmap = ({ phases, lastAddedPhaseIndex, updatePhase, removePhase }) => (
  <div className="bg-slate-50/60 p-4">
    <div className="mb-4 grid gap-2 sm:grid-cols-4">
      {phases.map((phase, index) => (
        <div key={`${phase.orderIndex}-marker-${index}`} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-950 text-xs font-black text-white">
            {index + 1}
          </span>
          <span className="min-w-0 truncate text-xs font-black text-slate-700">
            {phase.phaseName || `Giai đoạn ${index + 1}`}
          </span>
        </div>
      ))}
    </div>

    <div className="grid gap-4 xl:grid-cols-2">
      {phases.map((phase, index) => (
        <article key={`${phase.orderIndex}-${index}`} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sm font-black text-sky-700">
                {index + 1}
              </span>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">Giai đoạn</p>
                <input
                  autoFocus={lastAddedPhaseIndex === index}
                  value={phase.phaseName}
                  onChange={(event) => updatePhase(index, 'phaseName', event.target.value)}
                  maxLength={255}
                  placeholder="Tên giai đoạn"
                  className={titleInputClassName}
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => removePhase(index)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600"
              aria-label="Xóa giai đoạn"
            >
              <X size={16} />
            </button>
          </div>

          <label className="block">
            <span className={fieldLabelClassName}>Mục tiêu thành công</span>
            <textarea
              value={phase.objective}
              onChange={(event) => updatePhase(index, 'objective', event.target.value)}
              maxLength={2000}
              rows={3}
              placeholder="Kết quả cần đạt"
              className={phaseTextareaClassName}
            />
          </label>

          <label className="mt-3 block">
            <span className={fieldLabelClassName}>Triển khai</span>
            <textarea
              value={phase.description}
              onChange={(event) => updatePhase(index, 'description', event.target.value)}
              maxLength={2000}
              rows={3}
              placeholder="Việc cần chuẩn bị"
              className={phaseTextareaClassName}
            />
          </label>
        </article>
      ))}
    </div>
  </div>
);

const inputClassName = 'min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100';
const titleInputClassName = 'mt-1 min-h-9 w-full rounded-lg border border-transparent bg-transparent px-2 text-base font-black text-slate-950 outline-none transition placeholder:text-slate-400 hover:border-slate-200 hover:bg-slate-50 focus:border-cyan-300 focus:bg-white focus:ring-2 focus:ring-cyan-100';
const fieldLabelClassName = 'text-xs font-black uppercase tracking-[0.12em] text-slate-400';
const phaseTextareaClassName = 'mt-1 min-h-[86px] w-full resize-y rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2 text-sm font-semibold leading-5 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-cyan-300 focus:bg-white focus:ring-2 focus:ring-cyan-100';

export default PlanningComposer;