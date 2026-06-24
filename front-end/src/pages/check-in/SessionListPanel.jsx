import { Link } from 'react-router-dom';
import { Button, Panel, ProgressBar, StatusBadge } from '../../components/ui';

const formatSessionTime = (value) => {
  if (!value) {
    return 'Chưa đặt giờ';
  }

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
};

const SessionListPanel = ({ eventId, sessions }) => (
  <Panel className="p-5">
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.14em] text-sky-600">Danh sách</p>
        <h3 className="mt-1 text-lg font-black text-slate-950">Session check-in</h3>
      </div>
      <p className="text-sm font-bold text-slate-500">{sessions.length} session</p>
    </div>

    <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
      <div className="hidden grid-cols-[1.25fr_0.8fr_0.75fr_0.75fr_auto] gap-3 bg-slate-50 px-4 py-3 text-xs font-black uppercase tracking-[0.08em] text-slate-500 md:grid">
        <span>Session</span>
        <span>Thời gian</span>
        <span>Khách</span>
        <span>Check-in</span>
        <span />
      </div>

      <div className="divide-y divide-slate-100">
        {sessions.map((session) => {
          const attendeeCount = Number(session.attendeeCount) || 0;
          const checkedInCount = Number(session.checkedInCount) || 0;
          const progress = attendeeCount ? Math.round((checkedInCount / attendeeCount) * 100) : 0;

          return (
            <div key={session.id} className="grid gap-3 px-4 py-4 md:grid-cols-[1.25fr_0.8fr_0.75fr_0.75fr_auto] md:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-black text-slate-950">{session.name}</p>
                  <StatusBadge status={session.active ? 'ACTIVE' : 'TODO'}>{session.active ? 'Đang mở' : 'Tạm đóng'}</StatusBadge>
                </div>
                <p className="mt-1 truncate text-sm font-semibold text-slate-500">{session.location || 'Chưa có vị trí'}</p>
              </div>

              <p className="text-sm font-semibold text-slate-600">{formatSessionTime(session.startsAt)}</p>
              <p className="text-sm font-black text-slate-800">{attendeeCount}</p>
              <div className="min-w-32">
                <div className="mb-2 flex items-center justify-between text-xs font-black text-slate-500">
                  <span>{checkedInCount}</span>
                  <span>{progress}%</span>
                </div>
                <ProgressBar value={progress} tone={progress >= 80 ? 'emerald' : 'sky'} />
              </div>

              <Button as={Link} to={`/events/${eventId}/check-in/sessions/${session.id}`} variant="secondary" className="min-h-9 px-3">
                Mở
              </Button>
            </div>
          );
        })}

        {sessions.length === 0 && (
          <div className="px-4 py-8 text-center text-sm font-bold text-slate-500">
            Chưa có session check-in.
          </div>
        )}
      </div>
    </div>
  </Panel>
);

export default SessionListPanel;
