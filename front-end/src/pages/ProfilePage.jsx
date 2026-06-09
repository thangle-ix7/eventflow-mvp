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
      <div className="mx-auto max-w-5xl space-y-5">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
              <div className="relative h-24 w-24 shrink-0">
                <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-indigo-50 text-indigo-600">
                  {avatarPreviewUrl ? (
                    <img
                      src={avatarPreviewUrl}
                      alt={profile.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <User size={40} />
                  )}
                </div>
                {uploadMutation.isPending && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/70">
                    <Loader2 size={24} className="animate-spin text-indigo-600" />
                  </div>
                )}
              </div>

              <div className="min-w-0">
                <h1 className="truncate text-3xl font-extrabold tracking-tight text-slate-950">
                  {profile.name}
                </h1>
                <p className="mt-1 break-words text-sm font-medium text-slate-500">{profile.email}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <ProfilePill tone={profile.emailVerified ? 'emerald' : 'amber'}>
                    {profile.emailVerified ? 'Email đã xác thực' : 'Email chưa xác thực'}
                  </ProfilePill>
                  <ProfilePill tone={connectedTelegram ? 'indigo' : 'slate'}>
                    {connectedTelegram ? 'Đã kết nối Telegram' : 'Chưa kết nối Telegram'}
                  </ProfilePill>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
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
                <Button type="button" onClick={handleStartEdit}>
                  <Edit3 size={18} />
                  Sửa profile
                </Button>
              )}
            </div>
          </div>

          {selectedFileName && (
            <p className="mt-4 text-xs font-semibold text-slate-500">
              Đang upload: {selectedFileName}
            </p>
          )}

          {profileQuery.isLoading && (
            <div className="mt-5 flex items-center gap-2 rounded-lg bg-slate-50 p-3 text-sm font-medium text-slate-500">
              <Loader2 size={18} className="animate-spin" />
              Đang tải profile...
            </div>
          )}

          {error && (
            <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
              {error.userMessage || error.message || 'Không xử lý được profile'}
            </div>
          )}
        </section>

        <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-extrabold text-slate-950">Thông tin cá nhân</h2>
              </div>
              {isEditing && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Hủy chỉnh sửa"
                >
                  <X size={18} />
                </button>
              )}
            </div>

            {isEditing ? (
              <form onSubmit={handleSubmit} className="mt-5 grid gap-4">
                <label className="grid gap-1 text-sm font-semibold text-slate-700">
                  Họ tên
                  <input
                    name="name"
                    value={form.name}
                    onChange={(event) => setForm((old) => ({ ...old, name: event.target.value }))}
                    maxLength={100}
                    required
                    className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </label>
                <label className="grid gap-1 text-sm font-semibold text-slate-700">
                  Số điện thoại
                  <input
                    name="phoneNumber"
                    value={form.phoneNumber}
                    onChange={(event) => setForm((old) => ({ ...old, phoneNumber: event.target.value }))}
                    maxLength={15}
                    placeholder="Chưa cập nhật"
                    className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </label>
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <Button type="button" variant="secondary" onClick={handleCancelEdit}>
                    Hủy
                  </Button>
                  <Button type="submit" disabled={updateProfileMutation.isPending || !form.name.trim()}>
                    {updateProfileMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    Lưu thay đổi
                  </Button>
                </div>
              </form>
            ) : (
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <InfoItem icon={User} label="Họ tên" value={profile.name} />
                <InfoItem icon={Phone} label="Số điện thoại" value={profile.phoneNumber || 'Chưa cập nhật'} />
                <InfoItem icon={Mail} label="Email đăng nhập" value={profile.email} />
                <InfoItem icon={ShieldCheck} label="Trạng thái email" value={profile.emailVerified ? 'Đã xác thực' : 'Chưa xác thực'} />
                <InfoItem icon={CalendarDays} label="Ngày tạo tài khoản" value={formatDate(profile.createdAt)} />
              </div>
            )}
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-extrabold text-slate-950">Telegram</h2>
            <TelegramInfoItem
              connected={connectedTelegram}
              isDisconnecting={disconnectTelegramMutation.isPending}
              onConnect={handleConnectTelegram}
              onDisconnect={handleDisconnectTelegram}
            />
          </section>
        </div>
      </div>
    </AppLayout>
  );
};

const ProfilePill = ({ tone = 'slate', children }) => {
  const tones = {
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    indigo: 'border-indigo-200 bg-indigo-50 text-indigo-700',
    slate: 'border-slate-200 bg-slate-100 text-slate-700',
  };

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${tones[tone] || tones.slate}`}>
      {children}
    </span>
  );
};

const InfoItem = ({ icon: Icon, label, value }) => (
  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
    <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
      <Icon size={18} className="text-slate-400" strokeWidth={1.8} />
      {label}
    </div>
    <p className="mt-1 break-words text-sm font-semibold text-slate-950">{value || 'N/A'}</p>
  </div>
);

const TelegramInfoItem = ({ connected, isDisconnecting, onConnect, onDisconnect }) => (
  <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
    <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
      <Send size={18} className="text-slate-400" strokeWidth={1.8} />
      Telegram
    </div>
    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <p className={`text-sm font-bold ${connected ? 'text-emerald-700' : 'text-slate-600'}`}>
        {connected ? 'Đã kết nối' : 'Chưa kết nối'}
      </p>
      {connected ? (
        <button
          type="button"
          onClick={onDisconnect}
          disabled={isDisconnecting}
          className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
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
          className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100"
        >
          <Send size={14} />
          Kết nối
        </button>
      )}
    </div>
  </div>
);

export default ProfilePage;
