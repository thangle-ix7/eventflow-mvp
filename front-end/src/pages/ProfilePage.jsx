import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CalendarDays,
  Camera,
  Edit3,
  Loader2,
  Mail,
  Phone,
  Save,
  Send,
  ShieldCheck,
  Sparkles,
  Unlink,
  User,
  X,
} from 'lucide-react';
import AppLayout from '../components/AppLayout';
import { Button } from '../components/ui';
import { TELEGRAM_REOPEN_EVENT } from '../components/TelegramOnboarding';
import userApi from '../api/userApi';
import { formatDate } from '../utils/dateUtils';

const ProfilePage = ({ user, onLogout, onUserUpdate }) => {
  const queryClient = useQueryClient();
  const [selectedFileName, setSelectedFileName] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({ name: '', phoneNumber: '' });

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
    const confirmed = window.confirm('Ngắt kết nối Telegram khỏi tài khoản EventFlow này?');
    if (confirmed) {
      disconnectTelegramMutation.mutate();
    }
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
    disconnectTelegramMutation.error;

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
      </div>
    </AppLayout>
  );
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

const inputClassName = 'h-11 rounded-2xl border border-sky-100 bg-sky-50/60 px-4 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-cyan-300 focus:bg-white focus:ring-4 focus:ring-cyan-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500';

export default ProfilePage;
