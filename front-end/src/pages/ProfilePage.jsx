import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight,
  Bot,
  CalendarDays,
  Camera,
  CheckCircle2,
  CreditCard,
  Edit3,
  HardDrive,
  Layers3,
  Loader2,
  Mail,
  Phone,
  Save,
  Send,
  ShieldCheck,
  Sparkles,
  Unlink,
  User,
  UsersRound,
  X,
} from 'lucide-react';
import AppLayout from '../components/AppLayout';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import { Button } from '../components/ui';
import { TELEGRAM_REOPEN_EVENT } from '../components/TelegramOnboarding';
import eventApi from '../api/eventApi';
import subscriptionApi from '../api/subscriptionApi';
import userApi from '../api/userApi';
import { formatDate } from '../utils/dateUtils';

const ProfilePage = ({ user, onLogout, onUserUpdate }) => {
  const queryClient = useQueryClient();
  const [selectedFileName, setSelectedFileName] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({ name: '', phoneNumber: '' });
  const [disconnectConfirmOpen, setDisconnectConfirmOpen] = useState(false);

  const profileQuery = useQuery({
    queryKey: ['profile', user.userId],
    queryFn: () => userApi.getProfile(user.userId, { preferCache: false }),
    enabled: Boolean(user?.userId),
  });

  const profile = profileQuery.data || user;

  const avatarQuery = useQuery({
    queryKey: ['profileAvatar', user.userId, profileQuery.data?.avatarUrl],
    queryFn: () => userApi.getAvatarBlob(user.userId),
    enabled: Boolean(user?.userId && profileQuery.data?.avatarUrl),
  });

  const subscriptionQuery = useQuery({
    queryKey: ['subscriptionOverview', user.userId],
    queryFn: subscriptionApi.getCurrentSubscription,
    enabled: Boolean(user?.userId),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  const eventsQuery = useQuery({
    queryKey: ['profileEvents', user.userId],
    queryFn: eventApi.getMyEvents,
    enabled: Boolean(user?.userId),
    staleTime: 60_000,
  });

  const profileEvents = useMemo(() => eventsQuery.data || [], [eventsQuery.data]);
  const eventEntitlementQueries = useQueries({
    queries: profileEvents.map((event) => ({
      queryKey: ['eventEntitlement', String(event.id)],
      queryFn: () => subscriptionApi.getEventEntitlement(event.id),
      enabled: Boolean(user?.userId && event.id),
      staleTime: 60_000,
      retry: false,
    })),
  });

  const eventEntitlements = useMemo(() => profileEvents.map((event, index) => ({
    event,
    entitlement: eventEntitlementQueries[index]?.data,
    isLoading: eventEntitlementQueries[index]?.isLoading,
    error: eventEntitlementQueries[index]?.error,
  })), [eventEntitlementQueries, profileEvents]);

  const avatarPreviewUrl = useMemo(
    () => (avatarQuery.data ? URL.createObjectURL(avatarQuery.data) : ''),
    [avatarQuery.data]
  );

  const updateProfileMutation = useMutation({
    mutationFn: () => userApi.updateProfile({
      userId: user.userId,
      payload: {
        name: form.name.trim(),
        phoneNumber: form.phoneNumber.trim() || null,
      },
    }),
    onSuccess: (nextProfile) => {
      queryClient.setQueryData(['profile', user.userId], nextProfile);
      queryClient.invalidateQueries({ queryKey: ['userProfile', user.userId] });
      onUserUpdate?.({ ...user, ...nextProfile });
      setIsEditing(false);
    },
  });

  const uploadMutation = useMutation({
    mutationFn: userApi.uploadAvatar,
    onSuccess: (nextProfile) => {
      queryClient.setQueryData(['profile', user.userId], nextProfile);
      queryClient.invalidateQueries({ queryKey: ['profileAvatar', user.userId] });
      queryClient.invalidateQueries({ queryKey: ['userProfile', user.userId] });
      onUserUpdate?.({ ...user, ...nextProfile });
      setSelectedFileName('');
    },
  });

  const disconnectTelegramMutation = useMutation({
    mutationFn: () => userApi.disconnectTelegram(user.userId),
    onSuccess: () => {
      const nextProfile = { ...profile, telegramChatId: null, telegram_chat_id: null };
      setDisconnectConfirmOpen(false);
      queryClient.setQueryData(['profile', user.userId], nextProfile);
      queryClient.invalidateQueries({ queryKey: ['userProfile', user.userId] });
      onUserUpdate?.({ ...user, telegramChatId: null, telegram_chat_id: null });
    },
  });

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setSelectedFileName(file.name);
    uploadMutation.mutate({ userId: user.userId, file });
  };

  const handleDisconnectTelegram = () => {
    setDisconnectConfirmOpen(true);
  };

  const handleConnectTelegram = () => {
    window.dispatchEvent(new Event(TELEGRAM_REOPEN_EVENT));
  };

  const handleStartEdit = () => {
    setForm({
      name: profile?.name || '',
      phoneNumber: profile?.phoneNumber || '',
    });
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setForm({
      name: profile?.name || '',
      phoneNumber: profile?.phoneNumber || '',
    });
    setIsEditing(false);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!form.name.trim()) {
      return;
    }
    updateProfileMutation.mutate();
  };

  const connectedTelegram = Boolean(profile.telegramChatId || profile.telegram_chat_id);
  const error = profileQuery.error ||
    updateProfileMutation.error ||
    uploadMutation.error ||
    avatarQuery.error ||
    disconnectTelegramMutation.error ||
    subscriptionQuery.error ||
    eventsQuery.error;

  return (
    <AppLayout
      user={user}
      selectedEvent={null}
      onLogout={onLogout}
      showTelegramOnboarding={false}
    >
      <div className="mx-auto max-w-6xl space-y-6">
        <header>
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-center">
              <div className="relative h-28 w-28 shrink-0">
                <div className="relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-[2rem] border border-sky-100 bg-gradient-to-br from-sky-50 to-emerald-50 text-sky-600 shadow-xl shadow-sky-100">
                  {avatarPreviewUrl ? (
                    <img
                      src={avatarPreviewUrl}
                      alt={profile.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <User size={46} strokeWidth={1.8} />
                  )}
                </div>

                {uploadMutation.isPending && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-[2rem] bg-white/75 backdrop-blur-sm">
                    <Loader2 size={26} className="animate-spin text-sky-600" />
                  </div>
                )}

                <label className="absolute -bottom-2 -right-2 flex h-11 w-11 cursor-pointer items-center justify-center rounded-2xl border border-sky-100 bg-white text-sky-600 shadow-lg shadow-sky-100 transition hover:-translate-y-0.5 hover:bg-sky-50">
                  <Camera size={18} strokeWidth={1.8} />
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleFileChange}
                    className="sr-only"
                  />
                </label>
              </div>

              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-600">
                  My profile
                </p>

                <h1 className="mt-1 truncate text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                  {profile.name}
                </h1>

                <p className="mt-2 flex items-center gap-2 break-words text-sm font-semibold text-slate-500">
                  <Mail size={16} className="shrink-0 text-sky-400" />
                  {profile.email}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <ProfilePill tone={profile.emailVerified ? 'emerald' : 'amber'}>
                    {profile.emailVerified ? 'Email đã xác thực' : 'Email chưa xác thực'}
                  </ProfilePill>

                  <ProfilePill tone={connectedTelegram ? 'sky' : 'slate'}>
                    {connectedTelegram ? 'Đã kết nối Telegram' : 'Chưa kết nối Telegram'}
                  </ProfilePill>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-sky-100 bg-white px-4 py-2 text-sm font-black text-sky-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-sky-50 hover:shadow-lg hover:shadow-sky-100">
                <Camera size={18} />
                Đổi ảnh
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleFileChange}
                  className="sr-only"
                />
              </label>

              {!isEditing && (
                <Button
                  type="button"
                  onClick={handleStartEdit}
                  className="min-h-11 rounded-2xl bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400 font-black text-white shadow-xl shadow-cyan-100"
                >
                  <Edit3 size={18} />
                  Sửa profile
                </Button>
              )}
            </div>
          </div>

          {selectedFileName && (
            <p className="mt-4 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-xs font-black text-slate-500">
              Đang upload: {selectedFileName}
            </p>
          )}

          {profileQuery.isLoading && (
            <div className="mt-4 flex items-center gap-2 rounded-2xl border border-sky-100 bg-sky-50 p-4 text-sm font-black text-slate-500">
              <Loader2 size={18} className="animate-spin text-sky-600" />
              Đang tải profile...
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold leading-6 text-red-700">
              {error.userMessage || error.message || 'Không xử lý được profile'}
            </div>
          )}
        </header>

        <SubscriptionPanel
          overview={subscriptionQuery.data}
          isLoading={subscriptionQuery.isLoading}
        />

        <EventEntitlementsPanel
          events={eventEntitlements}
          isLoading={eventsQuery.isLoading || eventEntitlementQueries.some((query) => query.isLoading)}
          error={eventsQuery.error || eventEntitlementQueries.find((query) => query.error)?.error}
        />

        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="overflow-hidden rounded-[2rem] border border-sky-100 bg-white shadow-xl shadow-sky-100/70">
            <div className="flex items-start justify-between gap-3 border-b border-sky-100 bg-gradient-to-r from-sky-50 via-white to-emerald-50 px-5 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-emerald-400 text-white shadow-lg shadow-cyan-100">
                  <User className="h-5 w-5" strokeWidth={1.8} />
                </div>

                <div>
                  <h2 className="text-lg font-black text-slate-950">
                    Thông tin cá nhân
                  </h2>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    Cập nhật họ tên và số điện thoại dùng trong EventFlow.
                  </p>
                </div>
              </div>

              {isEditing && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="rounded-2xl p-2 text-slate-400 transition hover:bg-white hover:text-slate-700"
                  aria-label="Hủy chỉnh sửa"
                >
                  <X size={18} />
                </button>
              )}
            </div>

            {isEditing ? (
              <form onSubmit={handleSubmit} className="grid gap-5 p-5">
                <label className="grid gap-2 text-sm font-black text-slate-700">
                  Họ tên
                  <input
                    name="name"
                    value={form.name}
                    onChange={(event) => setForm((old) => ({ ...old, name: event.target.value }))}
                    maxLength={100}
                    required
                    className={inputClassName}
                  />
                </label>

                <label className="grid gap-2 text-sm font-black text-slate-700">
                  Số điện thoại
                  <input
                    name="phoneNumber"
                    value={form.phoneNumber}
                    onChange={(event) => setForm((old) => ({ ...old, phoneNumber: event.target.value }))}
                    maxLength={15}
                    placeholder="Chưa cập nhật"
                    className={inputClassName}
                  />
                </label>

                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleCancelEdit}
                    className="rounded-2xl"
                  >
                    Hủy
                  </Button>

                  <Button
                    type="submit"
                    disabled={updateProfileMutation.isPending || !form.name.trim()}
                    className="rounded-2xl bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400 font-black text-white shadow-xl shadow-cyan-100"
                  >
                    {updateProfileMutation.isPending ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Save size={18} />
                    )}
                    Lưu thay đổi
                  </Button>
                </div>
              </form>
            ) : (
              <div className="grid gap-4 p-5 sm:grid-cols-2">
                <InfoItem icon={User} label="Họ tên" value={profile.name} />
                <InfoItem icon={Phone} label="Số điện thoại" value={profile.phoneNumber || 'Chưa cập nhật'} />
                <InfoItem icon={Mail} label="Email đăng nhập" value={profile.email} />
                <InfoItem icon={ShieldCheck} label="Trạng thái email" value={profile.emailVerified ? 'Đã xác thực' : 'Chưa xác thực'} />
                <InfoItem icon={CalendarDays} label="Ngày tạo tài khoản" value={formatDate(profile.createdAt)} />
              </div>
            )}
          </section>

          <section className="overflow-hidden rounded-[2rem] border border-sky-100 bg-white shadow-xl shadow-sky-100/70">
            <div className="border-b border-sky-100 bg-gradient-to-r from-sky-50 via-white to-emerald-50 px-5 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-emerald-400 text-white shadow-lg shadow-cyan-100">
                  <Send className="h-5 w-5" strokeWidth={1.8} />
                </div>

                <div>
                  <h2 className="text-lg font-black text-slate-950">
                    Telegram
                  </h2>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    Kết nối Telegram để nhận nhắc deadline và thông báo task.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5">
              <TelegramInfoItem
                connected={connectedTelegram}
                isDisconnecting={disconnectTelegramMutation.isPending}
                onConnect={handleConnectTelegram}
                onDisconnect={handleDisconnectTelegram}
              />
            </div>
          </section>
        </div>

        <section className="grid gap-4 md:grid-cols-3">
          <SummaryCard
            icon={<ShieldCheck size={20} />}
            label="Email"
            value={profile.emailVerified ? 'Verified' : 'Unverified'}
            tone={profile.emailVerified ? 'emerald' : 'amber'}
          />

          <SummaryCard
            icon={<Send size={20} />}
            label="Telegram"
            value={connectedTelegram ? 'Connected' : 'Not connected'}
            tone={connectedTelegram ? 'sky' : 'slate'}
          />

          <SummaryCard
            icon={<Sparkles size={20} />}
            label="Account"
            value={formatDate(profile.createdAt)}
            tone="sky"
          />
        </section>
        <DeleteConfirmModal
          isOpen={disconnectConfirmOpen}
          title="Ngắt kết nối Telegram"
          message="Bạn có chắc chắn muốn ngắt kết nối Telegram khỏi tài khoản EventFlow này? Bạn sẽ không còn nhận nhắc deadline và thông báo task qua Telegram."
          confirmLabel="Ngắt kết nối"
          isLoading={disconnectTelegramMutation.isPending}
          onConfirm={() => disconnectTelegramMutation.mutate()}
          onCancel={() => setDisconnectConfirmOpen(false)}
        />
      </div>
    </AppLayout>
  );
};

const EventEntitlementsPanel = ({ events, isLoading, error }) => {
  const visibleEvents = events.filter(({ event }) => event?.id);

  return (
    <section className="overflow-hidden rounded-[2rem] border border-sky-100 bg-white shadow-xl shadow-sky-100/70">
      <div className="flex flex-col gap-4 border-b border-sky-100 bg-gradient-to-r from-sky-50 via-white to-emerald-50 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-emerald-400 text-white shadow-lg shadow-cyan-100">
            <Layers3 className="h-6 w-6" strokeWidth={1.8} />
          </div>

          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-600">
              Quyền lợi theo event
            </p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
              Event Pass, quota và tính năng đã kích hoạt
            </h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Event có Event Pass sẽ dùng quota riêng. Event chưa mua pass sẽ kế thừa subscription của leader.
            </p>
          </div>
        </div>

        <Button as={Link} to="/pricing" variant="secondary" className="shrink-0 rounded-2xl">
          Mua Event Pass
          <ArrowRight size={16} />
        </Button>
      </div>

      {isLoading && visibleEvents.length === 0 && (
        <div className="flex items-center gap-3 p-5 text-sm font-black text-slate-500">
          <Loader2 size={18} className="animate-spin text-sky-600" />
          Đang tải quyền lợi theo event...
        </div>
      )}

      {error && (
        <div className="mx-5 mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold leading-6 text-red-700">
          {error.userMessage || error.message || 'Chưa tải được quyền lợi theo event.'}
        </div>
      )}

      {!isLoading && !error && visibleEvents.length === 0 && (
        <div className="p-5 text-sm font-semibold text-slate-500">
          Bạn chưa tham gia event nào để hiển thị quota Event Pass.
        </div>
      )}

      {visibleEvents.length > 0 && (
        <div className="grid gap-4 p-5 xl:grid-cols-2">
          {visibleEvents.map(({ event, entitlement, isLoading: loadingItem, error: itemError }) => (
            <EventEntitlementCard
              key={event.id}
              event={event}
              entitlement={entitlement}
              isLoading={loadingItem}
              error={itemError}
            />
          ))}
        </div>
      )}
    </section>
  );
};

const EventEntitlementCard = ({ event, entitlement, isLoading, error }) => {
  const plan = entitlement?.plan;
  const features = resolveActivatedFeatures(plan);
  const sourceLabel = {
    EVENT_PASS: 'Event Pass đã kích hoạt',
    LEADER_SUBSCRIPTION: 'Kế thừa subscription leader',
    DEFAULT_FREE: 'Gói Free mặc định',
  }[entitlement?.source] || 'Đang xác định quyền lợi';

  return (
    <article className="rounded-2xl border border-sky-100 bg-sky-50/40 p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="truncate text-lg font-black text-slate-950">{event.name}</p>
          <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-slate-400">
            {event.role || 'MEMBER'} · {event.status || 'UNKNOWN'}
          </p>
        </div>

        <span className={`inline-flex w-fit rounded-full border px-3 py-1.5 text-xs font-black shadow-sm ${
          entitlement?.source === 'EVENT_PASS'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
            : 'border-sky-200 bg-white text-sky-700'
        }`}>
          {sourceLabel}
        </span>
      </div>

      {isLoading && !entitlement && (
        <div className="mt-4 flex items-center gap-2 text-sm font-black text-slate-500">
          <Loader2 size={16} className="animate-spin text-sky-600" />
          Đang kiểm tra gói event...
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-xs font-bold leading-5 text-red-700">
          {error.userMessage || error.message || 'Chưa tải được quyền lợi của event này.'}
        </div>
      )}

      {plan && (
        <>
          <div className="mt-4 rounded-2xl border border-white bg-white p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Gói áp dụng</p>
                <p className="mt-1 text-xl font-black text-slate-950">{plan.displayName}</p>
              </div>
              <p className="text-sm font-black text-sky-700">{formatPlanPrice(plan)}</p>
            </div>

            {entitlement.expiresAt && (
              <p className="mt-3 rounded-2xl bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700">
                Event Pass hết hạn: {formatDate(entitlement.expiresAt)}
              </p>
            )}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <CompactQuota
              label="Members"
              value={formatQuota(entitlement.membersUsed, plan.maxUsersPerEvent, plan.unlimitedUsers)}
              exceeded={isQuotaExceeded(entitlement.membersUsed, plan.maxUsersPerEvent, plan.unlimitedUsers)}
            />
            <CompactQuota
              label="Storage"
              value={formatBytesQuota(entitlement.storageBytesUsed, plan.storageLimitBytes, plan.unlimitedStorage)}
              exceeded={isQuotaExceeded(entitlement.storageBytesUsed, plan.storageLimitBytes, plan.unlimitedStorage)}
            />
            <CompactQuota
              label="AI credits"
              value={formatEventAiQuota(entitlement, plan)}
              exceeded={isEventAiExceeded(entitlement, plan)}
            />
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {features.map((feature) => (
              <span
                key={feature.label}
                className={`inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-black ${
                  feature.active
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 bg-white text-slate-400'
                }`}
              >
                <CheckCircle2 size={14} />
                {feature.label}
              </span>
            ))}
          </div>
        </>
      )}
    </article>
  );
};

const CompactQuota = ({ label, value, exceeded }) => (
  <div className={`rounded-2xl border p-3 ${exceeded ? 'border-red-200 bg-red-50' : 'border-white bg-white'}`}>
    <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">{label}</p>
    <p className={`mt-1 text-sm font-black ${exceeded ? 'text-red-700' : 'text-slate-950'}`}>{value}</p>
  </div>
);

const resolveActivatedFeatures = (plan) => {
  const code = plan?.code;
  return [
    { label: 'Calendar', active: ['CLUB', 'PRO_AGENCY', 'ENTERPRISE', 'EVENT_PREMIUM'].includes(code) },
    { label: 'Documents', active: ['CLUB', 'PRO_AGENCY', 'ENTERPRISE', 'EVENT_STANDARD', 'EVENT_PREMIUM'].includes(code) },
    { label: 'Reports', active: ['CLUB', 'PRO_AGENCY', 'ENTERPRISE', 'EVENT_STANDARD', 'EVENT_PREMIUM'].includes(code) },
    { label: 'QR Check-in', active: ['PRO_AGENCY', 'ENTERPRISE', 'EVENT_PREMIUM'].includes(code) },
  ];
};

const formatEventAiQuota = (entitlement, plan) => {
  const used = entitlement?.aiCreditsUsed || 0;
  const limit = plan.planType === 'EVENT_PASS' ? plan.aiCreditsPerEvent : plan.aiCreditsPerMonth;
  if (plan.unlimitedAi || limit == null) {
    return `${used} / ∞`;
  }
  return `${used} / ${limit}`;
};

const isEventAiExceeded = (entitlement, plan) => {
  const limit = plan.planType === 'EVENT_PASS' ? plan.aiCreditsPerEvent : plan.aiCreditsPerMonth;
  return isQuotaExceeded(entitlement?.aiCreditsUsed, limit, plan.unlimitedAi);
};

const ProfilePill = ({ tone = 'slate', children }) => {
  const tones = {
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    sky: 'border-sky-200 bg-sky-50 text-sky-700',
    slate: 'border-slate-200 bg-slate-50 text-slate-700',
  };

  return (
    <span className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-black shadow-sm ${tones[tone] || tones.slate}`}>
      {children}
    </span>
  );
};

const SubscriptionPanel = ({ overview, isLoading }) => {
  const plan = overview?.plan;
  const sourceLabel = {
    SUBSCRIPTION: 'Subscription đang hoạt động',
    DEFAULT_FREE: 'Gói mặc định',
  }[overview?.source] || 'Subscription';

  if (isLoading && !overview) {
    return (
      <section className="rounded-[2rem] border border-sky-100 bg-white p-5 shadow-xl shadow-sky-100/70">
        <div className="flex items-center gap-3 text-sm font-black text-slate-500">
          <Loader2 size={18} className="animate-spin text-sky-600" />
          Đang tải thông tin gói...
        </div>
      </section>
    );
  }

  if (!plan) {
    return null;
  }

  return (
    <section className="overflow-hidden rounded-[2rem] border border-sky-100 bg-white shadow-xl shadow-sky-100/70">
      <div className="flex flex-col gap-4 border-b border-sky-100 bg-gradient-to-r from-sky-50 via-white to-emerald-50 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-emerald-400 text-white shadow-lg shadow-cyan-100">
            <CreditCard className="h-6 w-6" strokeWidth={1.8} />
          </div>

          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-600">
              Gói hiện tại
            </p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
              {plan.displayName}
            </h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              {sourceLabel} · {formatPlanPrice(plan)}
            </p>
          </div>
        </div>

        <Button as={Link} to="/pricing" variant="secondary" className="shrink-0 rounded-2xl">
          Đổi hoặc nâng cấp gói
          <ArrowRight size={16} />
        </Button>
      </div>

      <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">
        <QuotaCard
          icon={Layers3}
          label="Sự kiện active"
          value={formatQuota(overview.activeEventsUsed, plan.maxActiveEvents, plan.unlimitedEvents)}
          hint="Tính các event ACTIVE bạn là leader"
          tone={isQuotaExceeded(overview.activeEventsUsed, plan.maxActiveEvents, plan.unlimitedEvents) ? 'red' : 'sky'}
          exceeded={isQuotaExceeded(overview.activeEventsUsed, plan.maxActiveEvents, plan.unlimitedEvents)}
        />
        <QuotaCard
          icon={UsersRound}
          label="User / event"
          value={formatQuota(overview.maxMembersUsedInLedEvents, plan.maxUsersPerEvent, plan.unlimitedUsers)}
          hint="Sự kiện đông member nhất bạn đang lead"
          tone={isQuotaExceeded(overview.maxMembersUsedInLedEvents, plan.maxUsersPerEvent, plan.unlimitedUsers) ? 'red' : 'emerald'}
          exceeded={isQuotaExceeded(overview.maxMembersUsedInLedEvents, plan.maxUsersPerEvent, plan.unlimitedUsers)}
        />
        <QuotaCard
          icon={HardDrive}
          label="Storage / event"
          value={formatBytesQuota(overview.maxStorageBytesUsedInLedEvents, plan.storageLimitBytes, plan.unlimitedStorage)}
          hint="Tính file task attachment và ảnh report"
          tone={isQuotaExceeded(overview.maxStorageBytesUsedInLedEvents, plan.storageLimitBytes, plan.unlimitedStorage) ? 'red' : 'amber'}
          exceeded={isQuotaExceeded(overview.maxStorageBytesUsedInLedEvents, plan.storageLimitBytes, plan.unlimitedStorage)}
        />
        <QuotaCard
          icon={Bot}
          label="AI credits"
          value={formatAiQuota(overview, plan)}
          hint={overview.aiCreditsRemaining == null ? 'Fair-use/custom' : `Còn ${overview.aiCreditsRemaining} credit trong kỳ`}
          tone={isQuotaExceeded(overview.aiCreditsUsed, plan.aiCreditsPerMonth, plan.unlimitedAi) ? 'red' : 'violet'}
          exceeded={isQuotaExceeded(overview.aiCreditsUsed, plan.aiCreditsPerMonth, plan.unlimitedAi)}
        />
      </div>

      {overview.overLimit && (
        <div className="mx-5 mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold leading-6 text-red-700">
          <p className="font-black">Gói hiện tại đang vượt giới hạn</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {(overview.limitWarnings || []).map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
          <p className="mt-3">
            Hệ thống sẽ không cho tạo thêm hoặc kích hoạt thêm tài nguyên vượt quota. Bạn có thể nâng cấp gói hoặc giảm số event ACTIVE/member/storage.
          </p>
        </div>
      )}

      <div className="border-t border-sky-100 px-5 py-4 text-sm font-semibold leading-6 text-slate-500">
        {overview.currentPeriodEnd
          ? `Chu kỳ hiện tại kết thúc: ${formatDate(overview.currentPeriodEnd)}`
          : 'Gói custom hoặc không có ngày kết thúc chu kỳ.'}
      </div>
    </section>
  );
};

const QuotaCard = ({ icon: Icon, label, value, hint, tone = 'sky', exceeded = false }) => {
  const tones = {
    sky: 'bg-sky-50 text-sky-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    violet: 'bg-violet-50 text-violet-600',
    red: 'bg-red-50 text-red-600',
  };

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${exceeded ? 'border-red-200 bg-red-50/60' : 'border-sky-100 bg-sky-50/50'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
            {label}
          </p>
          <p className="mt-2 text-xl font-black text-slate-950">
            {value}
          </p>
        </div>

        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${tones[tone] || tones.sky}`}>
          <Icon size={18} strokeWidth={1.8} />
        </div>
      </div>

      <p className="mt-3 text-xs font-semibold leading-5 text-slate-500">
        {hint}
      </p>
    </div>
  );
};

const InfoItem = ({ icon: Icon, label, value }) => (
  <div className="rounded-2xl border border-sky-100 bg-sky-50/60 p-4 shadow-sm">
    <div className="flex items-center gap-2 text-sm font-black text-slate-700">
      <Icon size={18} className="text-sky-500" strokeWidth={1.8} />
      {label}
    </div>

    <p className="mt-2 break-words text-sm font-semibold leading-6 text-slate-950">
      {value || 'N/A'}
    </p>
  </div>
);

const TelegramInfoItem = ({ connected, isDisconnecting, onConnect, onDisconnect }) => (
  <div className="relative overflow-hidden rounded-[2rem] border border-sky-100 bg-sky-50/60 p-5">
    <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-sky-100 blur-3xl" />

    <div className="relative">
      <div className="flex items-center gap-2 text-sm font-black text-slate-700">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-sky-600 shadow-sm">
          <Send size={18} strokeWidth={1.8} />
        </span>
        Telegram
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className={`text-sm font-black ${connected ? 'text-emerald-700' : 'text-slate-600'}`}>
          {connected ? 'Đã kết nối' : 'Chưa kết nối'}
        </p>

        {connected ? (
          <button
            type="button"
            onClick={onDisconnect}
            disabled={isDisconnecting}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-black text-red-700 shadow-sm transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isDisconnecting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Unlink size={14} />
            )}
            Ngắt kết nối
          </button>
        ) : (
          <button
            type="button"
            onClick={onConnect}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl border border-sky-200 bg-white px-3 py-2 text-xs font-black text-sky-700 shadow-sm transition hover:bg-sky-50"
          >
            <Send size={14} />
            Kết nối
          </button>
        )}
      </div>
    </div>
  </div>
);

const SummaryCard = ({ icon, label, value, tone = 'sky' }) => {
  const toneClass = {
    sky: 'bg-sky-50 text-sky-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    slate: 'bg-slate-50 text-slate-600',
  }[tone];

  return (
    <div className="group relative overflow-hidden rounded-[2rem] border border-sky-100 bg-white p-5 shadow-xl shadow-sky-100/70 transition hover:-translate-y-1 hover:shadow-2xl hover:shadow-cyan-100">
      <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-sky-100/80 opacity-0 blur-3xl transition group-hover:opacity-100" />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
            {label}
          </p>
          <p className="mt-3 truncate text-lg font-black text-slate-950">
            {value || 'N/A'}
          </p>
        </div>

        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-sm ${toneClass}`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

const formatPlanPrice = (plan) => {
  if (plan.code === 'ENTERPRISE') {
    return 'Liên hệ sales';
  }
  if (!plan.priceVnd) {
    return '0đ / tháng';
  }

  const interval = {
    MONTHLY: '/ tháng',
    YEARLY: '/ năm',
    ONE_TIME: '/ sự kiện',
    CUSTOM: 'theo hợp đồng',
  }[plan.billingInterval] || '';

  return `${Number(plan.priceVnd).toLocaleString('vi-VN')}đ ${interval}`;
};

const formatQuota = (used = 0, limit, unlimited) => {
  if (unlimited || limit == null) {
    return `${used || 0} / ∞`;
  }
  return `${used || 0} / ${limit}`;
};

const formatBytesQuota = (used = 0, limit, unlimited) => {
  if (unlimited || limit == null) {
    return `${formatBytes(used)} / ∞`;
  }
  return `${formatBytes(used)} / ${formatBytes(limit)}`;
};

const formatAiQuota = (overview, plan) => {
  const used = overview?.aiCreditsUsed || 0;
  if (plan.unlimitedAi || plan.aiCreditsPerMonth == null) {
    return `${used} / ∞`;
  }
  return `${used} / ${plan.aiCreditsPerMonth}`;
};

const isQuotaExceeded = (used = 0, limit, unlimited) => {
  if (unlimited || limit == null) {
    return false;
  }
  return Number(used || 0) > Number(limit);
};

const formatBytes = (bytes = 0) => {
  if (!bytes) {
    return '0 MB';
  }
  const gb = bytes / 1024 / 1024 / 1024;
  if (gb >= 1) {
    return `${Number.isInteger(gb) ? gb : gb.toFixed(1)} GB`;
  }
  return `${Math.ceil(bytes / 1024 / 1024)} MB`;
};

const inputClassName = 'h-11 rounded-2xl border border-sky-100 bg-sky-50/60 px-4 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-cyan-300 focus:bg-white focus:ring-4 focus:ring-cyan-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500';

export default ProfilePage;
