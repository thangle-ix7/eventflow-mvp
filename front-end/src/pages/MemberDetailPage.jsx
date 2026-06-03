import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { CalendarDays, Loader2, Mail, Send, Shield, Users } from 'lucide-react';
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
    <AppLayout user={user} events={event ? [event] : []} selectedEvent={event} onEventChange={() => {}} onLogout={onLogout}>
      <div className="mx-auto max-w-3xl space-y-6">
        {(eventQuery.isLoading || memberQuery.isLoading) && (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white p-8 text-gray-500">
            <Loader2 size={20} className="animate-spin" />
            Đang tải member...
          </div>
        )}

        {(eventQuery.error || memberQuery.error) && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            {eventQuery.error?.userMessage || memberQuery.error?.userMessage || 'Không tải được member'}
          </div>
        )}

        {member && (
          <>
            <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <UserAvatar userId={member.userId} avatarUrl={member.avatarUrl} name={member.name} size="lg" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-blue-600">Member detail</p>
                  <h2 className="mt-1 break-words text-2xl font-bold text-gray-900">{member.name}</h2>
                  <p className="mt-1 break-words text-sm text-gray-500">{member.email}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">{member.role}</span>
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                      {member.departmentName || 'Chưa thuộc department'}
                    </span>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${member.telegramLinked ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {member.telegramLinked ? 'Đã kết nối Telegram' : 'Chưa kết nối Telegram'}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900">Thông tin member</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <InfoItem icon={<Mail size={18} />} label="Email" value={member.email} />
                <InfoItem icon={<Shield size={18} />} label="Role trong event" value={member.role} />
                <InfoItem icon={<Users size={18} />} label="Department" value={member.departmentName || 'Chưa gán'} />
                <InfoItem icon={<Send size={18} />} label="Telegram" value={member.telegramLinked ? 'Đã kết nối' : 'Chưa kết nối'} />
                <InfoItem icon={<CalendarDays size={18} />} label="Tham gia event" value={formatDate(member.joinedAt)} />
                <InfoItem icon={<CalendarDays size={18} />} label="Ngày tạo tài khoản" value={formatDate(member.accountCreatedAt)} />
              </div>
            </section>
          </>
        )}
      </div>
    </AppLayout>
  );
};

const InfoItem = ({ icon, label, value }) => (
  <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
    <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
      {icon}
      {label}
    </div>
    <p className="mt-1 break-words text-sm text-gray-900">{value || 'N/A'}</p>
  </div>
);

export default MemberDetailPage;
