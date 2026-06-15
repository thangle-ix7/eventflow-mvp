import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import {
  Building2,
  CalendarDays,
  Loader2,
  Mail,
  Send,
  Shield,
  Sparkles,
  UserRound,
  Users,
} from 'lucide-react';
import AppLayout from '../components/AppLayout';
import UserAvatar from '../components/UserAvatar';
import eventApi from '../api/eventApi';
import eventMemberApi from '../api/eventMemberApi';
import { formatDate } from '../utils/dateUtils';

const MemberDetailPage = ({ user, onLogout }) => {
  const { eventId, userId } = useParams();

  const eventQuery = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => eventApi.getEvent(eventId),
    enabled: Boolean(eventId),
  });

  const memberQuery = useQuery({
    queryKey: ['eventMember', eventId, userId],
    queryFn: () => eventMemberApi.getMember({ eventId, userId }),
    enabled: Boolean(eventId && userId),
  });

  const event = eventQuery.data;
  const member = memberQuery.data;

  return (
    <AppLayout
      user={user}
      events={event ? [event] : []}
      selectedEvent={event}
      onEventChange={() => {}}
      onLogout={onLogout}
    >
      <div className="mx-auto max-w-5xl space-y-6">
        {(eventQuery.isLoading || memberQuery.isLoading) && (
          <div className="relative overflow-hidden rounded-[2rem] border border-sky-100 bg-white p-8 shadow-xl shadow-sky-100/70">
            <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-sky-100 blur-3xl" />

            <div className="relative flex items-center justify-center gap-3 text-sm font-black text-slate-500">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
                <Loader2 size={22} className="animate-spin" />
              </span>
              Đang tải member...
            </div>
          </div>
        )}

        {(eventQuery.error || memberQuery.error) && (
          <div className="rounded-[2rem] border border-red-200 bg-red-50 p-5 text-sm font-semibold leading-6 text-red-700 shadow-lg shadow-red-100/70">
            {eventQuery.error?.userMessage || memberQuery.error?.userMessage || 'Không tải được member'}
          </div>
        )}

        {member && (
          <>
            <section className="relative overflow-hidden rounded-[2rem] border border-sky-100 bg-white/85 p-6 shadow-xl shadow-sky-100/70 backdrop-blur-xl">
              <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-sky-100 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-28 left-1/3 h-72 w-72 rounded-full bg-emerald-100/70 blur-3xl" />

              <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
                <UserAvatar
                  userId={member.userId}
                  avatarUrl={member.avatarUrl}
                  name={member.name}
                  size="lg"
                />

                <div className="min-w-0 flex-1">
                  <p className="inline-flex rounded-full bg-sky-50 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-sky-600">
                    Member detail
                  </p>

                  <h2 className="mt-3 break-words text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                    {member.name}
                  </h2>

                  <p className="mt-2 flex items-center gap-2 break-words text-sm font-semibold text-slate-500">
                    <Mail size={16} className="shrink-0 text-sky-400" />
                    {member.email}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <ProfileBadge tone="sky" icon={<Shield size={14} />}>
                      {member.role}
                    </ProfileBadge>

                    <ProfileBadge tone="emerald" icon={<Building2 size={14} />}>
                      {member.departmentName || 'Chưa thuộc department'}
                    </ProfileBadge>

                    <ProfileBadge tone={member.telegramLinked ? 'emerald' : 'slate'} icon={<Send size={14} />}>
                      {member.telegramLinked ? 'Đã kết nối Telegram' : 'Chưa kết nối Telegram'}
                    </ProfileBadge>
                  </div>
                </div>
              </div>
            </section>

            <section className="overflow-hidden rounded-[2rem] border border-sky-100 bg-white shadow-xl shadow-sky-100/70">
              <div className="flex items-center gap-3 border-b border-sky-100 bg-gradient-to-r from-sky-50 via-white to-emerald-50 px-5 py-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-emerald-400 text-white shadow-lg shadow-cyan-100">
                  <UserRound className="h-5 w-5" strokeWidth={1.8} />
                </div>

                <div>
                  <h3 className="text-lg font-black text-slate-950">
                    Thông tin member
                  </h3>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    Thông tin liên hệ, vai trò, department và trạng thái tham gia sự kiện.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 p-5 sm:grid-cols-2">
                <InfoItem icon={<Mail size={18} />} label="Email" value={member.email} />
                <InfoItem icon={<Shield size={18} />} label="Role trong event" value={member.role} />
                <InfoItem icon={<Users size={18} />} label="Department" value={member.departmentName || 'Chưa gán'} />
                <InfoItem icon={<Send size={18} />} label="Telegram" value={member.telegramLinked ? 'Đã kết nối' : 'Chưa kết nối'} />
                <InfoItem icon={<CalendarDays size={18} />} label="Tham gia event" value={formatDate(member.joinedAt)} />
                <InfoItem icon={<CalendarDays size={18} />} label="Ngày tạo tài khoản" value={formatDate(member.accountCreatedAt)} />
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-3">
              <SummaryCard
                icon={<Shield size={20} />}
                label="Vai trò"
                value={member.role || 'N/A'}
              />

              <SummaryCard
                icon={<Building2 size={20} />}
                label="Ban phụ trách"
                value={member.departmentName || 'Chưa gán'}
              />

              <SummaryCard
                icon={<Sparkles size={20} />}
                label="Telegram"
                value={member.telegramLinked ? 'Connected' : 'Not connected'}
              />
            </section>
          </>
        )}
      </div>
    </AppLayout>
  );
};

const ProfileBadge = ({ tone = 'sky', icon, children }) => {
  const toneClass = {
    sky: 'border-sky-200 bg-sky-50 text-sky-700',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    slate: 'border-slate-200 bg-slate-50 text-slate-600',
  }[tone];

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-black shadow-sm ${toneClass}`}>
      {icon}
      {children}
    </span>
  );
};

const InfoItem = ({ icon, label, value }) => (
  <div className="rounded-2xl border border-sky-100 bg-sky-50/60 p-4 shadow-sm">
    <div className="flex items-center gap-2 text-sm font-black text-slate-700">
      <span className="text-sky-500">{icon}</span>
      {label}
    </div>

    <p className="mt-2 break-words text-sm font-semibold leading-6 text-slate-900">
      {value || 'N/A'}
    </p>
  </div>
);

const SummaryCard = ({ icon, label, value }) => (
  <div className="group relative overflow-hidden rounded-[2rem] border border-sky-100 bg-white p-5 shadow-xl shadow-sky-100/70 transition hover:-translate-y-1 hover:shadow-2xl hover:shadow-cyan-100">
    <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-sky-100/80 opacity-0 blur-3xl transition group-hover:opacity-100" />

    <div className="relative flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
          {label}
        </p>
        <p className="mt-3 truncate text-lg font-black text-slate-950">
          {value}
        </p>
      </div>

      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 shadow-sm">
        {icon}
      </div>
    </div>
  </div>
);

export default MemberDetailPage;