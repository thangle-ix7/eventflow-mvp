import { Button, ErrorState, Panel, SelectControl, TextInput } from '../../components/ui';

const SessionSetupPanel = ({
  sessions,
  effectiveSessionId,
  setSelectedSessionId,
  canManage,
  sessionForm,
  setSessionForm,
  createSessionMutation,
  eventId,
}) => (
  <Panel className="p-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.14em] text-sky-600">Session</p>
        <h3 className="mt-1 text-lg font-black text-slate-950">Tạo session</h3>
      </div>
      <SelectControl
        label="Session dang dung"
        value={effectiveSessionId}
        onChange={(eventChange) => setSelectedSessionId(eventChange.target.value)}
        className="min-w-52"
      >
        {sessions.length === 0 && <option value="">Chưa có session</option>}
        {sessions.map((session) => (
          <option key={session.id} value={session.id}>{session.name}</option>
        ))}
      </SelectControl>
    </div>

    {canManage && (
      <form
        className="mt-4 grid gap-3 border-t border-slate-100 pt-4"
        onSubmit={(eventSubmit) => {
          eventSubmit.preventDefault();
          createSessionMutation.mutate({ eventId, payload: sessionForm });
        }}
      >
        <TextInput
          icon={null}
          value={sessionForm.name}
          placeholder="Tên session"
          onChange={(eventChange) => setSessionForm((old) => ({ ...old, name: eventChange.target.value }))}
        />
        <TextInput
          icon={null}
          value={sessionForm.location}
          placeholder="Cong / vi tri"
          onChange={(eventChange) => setSessionForm((old) => ({ ...old, location: eventChange.target.value }))}
        />
        <Button type="submit" disabled={!sessionForm.name.trim() || createSessionMutation.isPending}>
          Tạo session
        </Button>
      </form>
    )}

    {createSessionMutation.error && (
      <div className="mt-4">
        <ErrorState error={createSessionMutation.error} title="Không tạo được session" />
      </div>
    )}
  </Panel>
);

export default SessionSetupPanel;

