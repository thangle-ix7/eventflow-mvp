import { useState } from 'react';
import { CheckCircle2, ClipboardCheck, Mail, QrCode, Search, Trash2 } from 'lucide-react';
import DeleteConfirmModal from '../../components/DeleteConfirmModal';
import { Button, EmptyState, ErrorState, Panel, SelectControl, StatusBadge, TextInput } from '../../components/ui';
import { buildCheckInPayload } from './checkInUtils';

const CheckInDeskPanel = ({
  canManage,
  effectiveSessionId,
  selectedSession,
  checkInToken,
  setCheckInToken,
  checkInMutation,
  lastCheckIn,
  inviteResult,
  sendInviteMutation,
  sendSessionInvitesMutation,
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  filteredAttendees,
  typeLabels,
  statusLabels,
  eventId,
  confirmAttendeeMutation,
  deleteAttendeeMutation,
}) => {
  const [deleteTarget, setDeleteTarget] = useState(null);

  const confirmDeleteAttendee = () => {
    if (!deleteTarget) {
      return;
    }

    deleteAttendeeMutation.mutate(
      { eventId, attendeeId: deleteTarget.id },
      { onSuccess: () => setDeleteTarget(null) }
    );
  };

  return (
    <>
  <Panel className="p-5">
    <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.14em] text-sky-600">Check-in</p>
        <h3 className="mt-1 text-lg font-black text-slate-950">Quầy check-in</h3>
        <p className="mt-1 text-sm font-semibold text-slate-500">{selectedSession?.name || 'Chưa chọn session'}</p>
      </div>
      {canManage && effectiveSessionId && (
        <Button
          type="button"
          variant="secondary"
          className="min-h-10 px-3"
          disabled={sendSessionInvitesMutation.isPending}
          onClick={() => sendSessionInvitesMutation.mutate({ eventId, sessionId: Number(effectiveSessionId) })}
        >
          <Mail className="h-4 w-4" />
          Gửi email
        </Button>
      )}
    </div>

    <form
      className="mt-4 grid gap-3 border-b border-slate-100 pb-4"
      onSubmit={(eventSubmit) => {
        eventSubmit.preventDefault();
        checkInMutation.mutate({ eventId, payload: buildCheckInPayload(checkInToken, effectiveSessionId) });
      }}
    >
      <TextInput
        icon={QrCode}
        value={checkInToken}
        placeholder="Quét QR hoặc nhập mã mời"
        onChange={(eventChange) => setCheckInToken(eventChange.target.value)}
      />
      <Button type="submit" disabled={!effectiveSessionId || !checkInToken.trim() || checkInMutation.isPending}>
        <ClipboardCheck className="h-4 w-4" />
        Check-in
      </Button>
    </form>

    {checkInMutation.error && (
      <div className="mt-4">
        <ErrorState error={checkInMutation.error} title="Check-in không thành công" />
      </div>
    )}

    {lastCheckIn && (
      <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
        <p className="font-black">{lastCheckIn.message}</p>
        <p className="mt-1 text-sm font-semibold">{lastCheckIn.attendee?.fullName}</p>
      </div>
    )}

    {inviteResult && (
      <div className="mt-4 rounded-lg border border-sky-200 bg-sky-50 p-4 text-sm font-bold text-sky-800">
        <p>Đã gửi {inviteResult.sentCount} email, bỏ qua {inviteResult.skippedCount}.</p>
        {inviteResult.errors?.length > 0 && (
          <ul className="mt-2 space-y-1 text-xs text-sky-700">
            {inviteResult.errors.slice(0, 4).map((error) => <li key={error}>{error}</li>)}
          </ul>
        )}
      </div>
    )}

    {(sendInviteMutation.error || sendSessionInvitesMutation.error) && (
      <div className="mt-4">
        <ErrorState error={sendInviteMutation.error || sendSessionInvitesMutation.error} title="Không gửi được email check-in" />
      </div>
    )}

    <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_180px]">
      <TextInput icon={Search} value={search} placeholder="Tìm tên, email, số điện thoại" onChange={(eventChange) => setSearch(eventChange.target.value)} />
      <SelectControl value={statusFilter} onChange={(eventChange) => setStatusFilter(eventChange.target.value)}>
        <option value="">Tất cả trạng thái</option>
        {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </SelectControl>
    </div>

    <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
      <div className="hidden grid-cols-[1.35fr_0.75fr_0.75fr_0.9fr_auto] gap-3 bg-slate-50 px-4 py-3 text-xs font-black uppercase tracking-[0.08em] text-slate-500 md:grid">
        <span>Khách mời</span>
        <span>Loại</span>
        <span>Trạng thái</span>
        <span>Mã mời / QR</span>
        <span />
      </div>
      <div className="divide-y divide-slate-100">
        {filteredAttendees.map((attendee) => (
          <div key={attendee.id} className="grid gap-3 px-4 py-4 md:grid-cols-[1.35fr_0.75fr_0.75fr_0.9fr_auto] md:items-center">
            <div className="min-w-0">
              <p className="font-black text-slate-950">{attendee.fullName}</p>
              <p className="mt-1 truncate text-sm font-semibold text-slate-500">{attendee.email || attendee.phone || 'Chưa có liên hệ'}</p>
            </div>
            <span className="text-sm font-semibold text-slate-700">{typeLabels[attendee.attendeeType] || attendee.attendeeType}</span>
            <StatusBadge status={attendee.status === 'CHECKED_IN' ? 'DONE' : attendee.status === 'CONFIRMED' ? 'ACTIVE' : 'TODO'}>
              {statusLabels[attendee.status] || attendee.status}
            </StatusBadge>
            <div className="space-y-1">
              <code className="inline-block rounded-lg bg-sky-50 px-2 py-1 text-xs font-black tracking-[0.08em] text-sky-700">{attendee.inviteCode || 'Chưa có mã'}</code>
              <p className="break-all text-[11px] font-semibold text-slate-500">{attendee.qrToken}</p>
            </div>
            <div className="flex items-center justify-end gap-2">
              {attendee.status !== 'CHECKED_IN' && (
                <Button
                  type="button"
                  variant="secondary"
                  className="min-h-9 px-3"
                  onClick={() => checkInMutation.mutate({ eventId, payload: { attendeeId: attendee.id, sessionId: Number(effectiveSessionId) } })}
                >
                  Check-in
                </Button>
              )}
              {canManage && attendee.status === 'INVITED' && (
                <button
                  type="button"
                  className="rounded-lg p-2 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600"
                  onClick={() => confirmAttendeeMutation.mutate({ eventId, attendeeId: attendee.id })}
                  title="Xác nhận"
                  aria-label="Xác nhận khách mời"
                >
                  <CheckCircle2 className="h-4 w-4" />
                </button>
              )}
              {canManage && attendee.email && (
                <button
                  type="button"
                  className="rounded-lg p-2 text-slate-400 hover:bg-sky-50 hover:text-sky-600 disabled:opacity-50"
                  disabled={sendInviteMutation.isPending}
                  onClick={() => sendInviteMutation.mutate({ eventId, attendeeId: attendee.id })}
                  title="Gửi email"
                  aria-label="Gửi email check-in"
                >
                  <Mail className="h-4 w-4" />
                </button>
              )}
              {canManage && (
                <button
                  type="button"
                  className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  onClick={() => setDeleteTarget(attendee)}
                  title="Xóa"
                  aria-label="Xóa khách mời"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        ))}
        {filteredAttendees.length === 0 && (
          <div className="p-4">
            <EmptyState icon={QrCode} title="Chưa có khách trong session" />
          </div>
        )}
      </div>
    </div>
  </Panel>
      <DeleteConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Xóa khách mời"
        message={`Bạn có chắc chắn muốn xóa "${deleteTarget?.fullName || 'khách mời này'}" khỏi danh sách check-in? Hành động này sẽ xóa mã mời/QR đã phát cho khách.`}
        isLoading={deleteAttendeeMutation.isPending}
        onConfirm={confirmDeleteAttendee}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
};

export default CheckInDeskPanel;
