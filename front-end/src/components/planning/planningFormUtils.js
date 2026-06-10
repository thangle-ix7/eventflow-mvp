export const buildEmptyPhaseForm = (orderIndex = 0) => ({
  phaseName: '',
  description: '',
  objective: '',
  orderIndex,
});

export const buildEmptyPlanningForm = () => ({
  title: '',
  description: '',
  phases: [buildEmptyPhaseForm(0)],
});

export const normalizePlanningForm = (planning) => {
  const phases = Array.isArray(planning.phases) && planning.phases.length > 0
    ? planning.phases.map((phase, index) => ({
      phaseName: phase.phaseName || '',
      description: phase.description || '',
      objective: phase.objective || '',
      orderIndex: phase.orderIndex ?? index,
    }))
    : [buildEmptyPhaseForm(0)];

  return {
    title: planning.title || '',
    description: planning.description || '',
    phases,
  };
};

export const buildPlanningPayload = (form) => ({
  title: form.title.trim(),
  description: form.description.trim() || null,
  phases: form.phases
    .map((phase, index) => buildPhasePayload({ ...phase, orderIndex: index }))
    .filter((phase) => phase.phaseName),
});

export const buildPhasePayload = (phase) => ({
  phaseName: phase.phaseName.trim(),
  description: phase.description?.trim() || null,
  objective: phase.objective?.trim() || null,
  orderIndex: Number.isFinite(Number(phase.orderIndex)) ? Number(phase.orderIndex) : 0,
});

export const countFilledPhases = (phases) => phases.filter((phase) => phase.phaseName.trim()).length;

export const resolveNewPhaseForm = (planning, phaseForms) => (
  phaseForms[planning.id] || buildEmptyPhaseForm(planning.phases?.length || 0)
);
