import { Button, ErrorState, Panel, TextInput } from '../../components/ui';

const SessionCreatePanel = ({ canManage, eventId, sessionForm, setSessionForm, createSessionMutation }) => (
  <Panel className="p-5">
    <div>
      <p className="text-xs font-black uppercase tracking-[0.14em] text-sky-600">Session</p>
      <h3 className="mt-1 text-lg font-black text-slate-950">Tạo session</h3>
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
          placeholder="Cổng / vị trí"
          onChange={(eventChange) => setSessionForm((old) => ({ ...old, location: eventChange.target.value }))}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <TextInput
            icon={null}
            type="datetime-local"
            value={sessionForm.startsAt}
            aria-label="Bắt đầu"
            onChange={(eventChange) => setSessionForm((old) => ({ ...old, startsAt: eventChange.target.value }))}
          />
          <TextInput
            icon={null}
            type="datetime-local"
            value={sessionForm.endsAt}
            aria-label="Kết thúc"
            onChange={(eventChange) => setSessionForm((old) => ({ ...old, endsAt: eventChange.target.value }))}
          />
        </div>
        <Button type="submit" disabled={!sessionForm.name.trim() || createSessionMutation.isPending}>
          Tạo session
        </Button>
      </form>
    )}

    {!canManage && (
      <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600">
        Bạn không có quyền tạo session.
      </p>
    )}

    {createSessionMutation.error && (
      <div className="mt-4">
        <ErrorState error={createSessionMutation.error} title="Không tạo được session" />
      </div>
    )}
  </Panel>
);

export default SessionCreatePanel;
