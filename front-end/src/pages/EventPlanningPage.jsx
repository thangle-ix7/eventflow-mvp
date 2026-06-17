import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import { EmptyState, ErrorState, LoadingState } from '../components/ui';
import PlanningCard from '../components/planning/PlanningCard';
import PlanningComposer from '../components/planning/PlanningComposer';
import {
  buildEmptyPhaseForm,
  buildEmptyPlanningForm,
  buildPhasePayload,
  buildPlanningPayload,
  normalizePlanningForm,
  resolveNewPhaseForm,
} from '../components/planning/planningFormUtils';
import aiSuggestionApi from '../api/aiSuggestionApi';
import eventApi from '../api/eventApi';
import planningApi from '../api/planningApi';
import ErrorPage from './ErrorPage';
import { getEventPermissions } from '../utils/permissionUtils';

const EventPlanningPage = ({ user, onLogout }) => {
  const { eventId } = useParams();
  const queryClient = useQueryClient();
  const [draftForm, setDraftForm] = useState(buildEmptyPlanningForm);
  const [aiInstruction, setAiInstruction] = useState('');
  const [aiApplied, setAiApplied] = useState(false);
  const [newPhaseForms, setNewPhaseForms] = useState({});

  const eventQuery = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => eventApi.getEvent(eventId),
    enabled: Boolean(eventId),
  });
  const event = eventQuery.data;
  const permissions = getEventPermissions(event);
  const isLeader = permissions.canManageEvent;

  const planningsQuery = useQuery({
    queryKey: ['eventPlannings', eventId],
    queryFn: () => planningApi.getPlannings(eventId),
    enabled: Boolean(eventId && event),
  });
  const plannings = useMemo(() => planningsQuery.data || [], [planningsQuery.data]);

  const invalidatePlanningQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['eventPlannings', eventId] });
  };

  const createPlanningMutation = useMutation({
    mutationFn: planningApi.createPlanning,
    onSuccess: () => {
      setDraftForm(buildEmptyPlanningForm());
      setAiApplied(false);
      invalidatePlanningQueries();
    },
  });

  const updatePlanningMutation = useMutation({
    mutationFn: planningApi.updatePlanning,
    onSuccess: invalidatePlanningQueries,
  });

  const deletePlanningMutation = useMutation({
    mutationFn: planningApi.deletePlanning,
    onSuccess: invalidatePlanningQueries,
  });

  const createPhaseMutation = useMutation({
    mutationFn: planningApi.createPhase,
    onSuccess: (_data, variables) => {
      setNewPhaseForms((old) => ({
        ...old,
        [variables.planningId]: buildEmptyPhaseForm(variables.payload.orderIndex + 1),
      }));
      invalidatePlanningQueries();
    },
  });

  const updatePhaseMutation = useMutation({
    mutationFn: planningApi.updatePhase,
    onSuccess: invalidatePlanningQueries,
  });

  const deletePhaseMutation = useMutation({
    mutationFn: planningApi.deletePhase,
    onSuccess: invalidatePlanningQueries,
  });

  const aiPlanningMutation = useMutation({
    mutationFn: () => aiSuggestionApi.suggestPlanning({
      eventId,
      instruction: aiInstruction,
    }),
    onSuccess: (data) => {
      if (data?.planning) {
        setDraftForm(normalizePlanningForm(data.planning));
        setAiApplied(true);
      }
    },
  });

  const isLoading = eventQuery.isLoading || planningsQuery.isLoading;
  const error = eventQuery.error || planningsQuery.error;

  const handleCreatePlanning = (submitEvent) => {
    submitEvent.preventDefault();
    const payload = buildPlanningPayload(draftForm);
    if (!payload.title || createPlanningMutation.isPending) {
      return;
    }

    createPlanningMutation.mutate({ eventId, payload });
  };

  const handleDeletePlanning = (planning) => {
    const confirmed = window.confirm(`Xóa kế hoạch "${planning.title}"?`);
    if (confirmed) {
      deletePlanningMutation.mutate({ eventId, planningId: planning.id });
    }
  };

  const submitNewPhase = (planning) => {
    const form = resolveNewPhaseForm(planning, newPhaseForms);
    const payload = buildPhasePayload(form);
    if (!payload.phaseName || createPhaseMutation.isPending) {
      return;
    }

    createPhaseMutation.mutate({ eventId, planningId: planning.id, payload });
  };

  const handleDeletePhase = ({ planningId, phase }) => {
    const confirmed = window.confirm(`Xóa giai đoạn "${phase.phaseName}"?`);
    if (confirmed) {
      deletePhaseMutation.mutate({ eventId, planningId, phaseId: phase.id });
    }
  };

  return (
    <AppLayout user={user} events={event ? [event] : []} selectedEvent={event} onLogout={onLogout}>
      <div className="space-y-6">
        {isLoading && <LoadingState message="Đang tải kế hoạch..." />}
        {!isLoading && error && (
          <ErrorPage
            variant="unexpected"
            title="Không tải được kế hoạch"
            message={error.userMessage || 'EventFlow chưa thể tải dữ liệu kế hoạch. Vui lòng thử lại.'}
          />
        )}

        {!isLoading && !error && (
          <>
            <div className="space-y-4">
              {isLeader && plannings.length === 0 && (
                <PlanningComposer
                  form={draftForm}
                  setForm={setDraftForm}
                  aiInstruction={aiInstruction}
                  setAiInstruction={setAiInstruction}
                  aiApplied={aiApplied}
                  aiMutation={aiPlanningMutation}
                  createMutation={createPlanningMutation}
                  onSubmit={handleCreatePlanning}
                />
              )}

              <section className="space-y-4">
                {(createPlanningMutation.error || updatePlanningMutation.error || deletePlanningMutation.error || createPhaseMutation.error || updatePhaseMutation.error || deletePhaseMutation.error) && (
                  <ErrorState
                    title="Không lưu được kế hoạch"
                    error={createPlanningMutation.error || updatePlanningMutation.error || deletePlanningMutation.error || createPhaseMutation.error || updatePhaseMutation.error || deletePhaseMutation.error}
                  />
                )}

                {plannings.length === 0 ? (
                  !isLeader && (
                    <EmptyState
                      icon={ClipboardList}
                      title="Chưa có kế hoạch"
                      description="Trưởng nhóm chưa tạo kế hoạch cho sự kiện này."
                    />
                  )
                ) : (
                  plannings.map((planning) => (
                    <PlanningCard
                      key={planning.id}
                      planning={planning}
                      isLeader={isLeader}
                      updatePlanningMutation={updatePlanningMutation}
                      deletePlanningMutation={deletePlanningMutation}
                      handleDeletePlanning={handleDeletePlanning}
                      updatePhaseMutation={updatePhaseMutation}
                      deletePhaseMutation={deletePhaseMutation}
                      handleDeletePhase={handleDeletePhase}
                      newPhaseForm={resolveNewPhaseForm(planning, newPhaseForms)}
                      setNewPhaseForm={(updater) => setNewPhaseForms((old) => ({
                        ...old,
                        [planning.id]: typeof updater === 'function'
                          ? updater(resolveNewPhaseForm(planning, old))
                          : updater,
                      }))}
                      submitNewPhase={submitNewPhase}
                      createPhaseMutation={createPhaseMutation}
                    />
                  ))
                )}
              </section>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default EventPlanningPage;
