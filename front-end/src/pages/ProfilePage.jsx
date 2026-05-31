import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Camera, Loader2, Mail, Send, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import userApi from '../api/userApi';

const ProfilePage = ({ user, onLogout, onUserUpdate }) => {
  const queryClient = useQueryClient();
  const [selectedFileName, setSelectedFileName] = useState('');

  const profileQuery = useQuery({
    queryKey: ['profile', user.userId],
    queryFn: () => userApi.getProfile(user.userId, { preferCache: false }),
    enabled: Boolean(user?.userId),
  });

  const avatarQuery = useQuery({
    queryKey: ['profileAvatar', user.userId, profileQuery.data?.avatarUrl],
    queryFn: () => userApi.getAvatarBlob(user.userId),
    enabled: Boolean(user?.userId && profileQuery.data?.avatarUrl),
  });

  const avatarPreviewUrl = useMemo(
    () => (avatarQuery.data ? URL.createObjectURL(avatarQuery.data) : ''),
    [avatarQuery.data]
  );

  const uploadMutation = useMutation({
    mutationFn: userApi.uploadAvatar,
    onSuccess: (profile) => {
      queryClient.setQueryData(['profile', user.userId], profile);
      queryClient.invalidateQueries({ queryKey: ['profileAvatar', user.userId] });
      onUserUpdate?.({ ...user, avatarUrl: profile.avatarUrl });
      setSelectedFileName('');
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

  const profile = profileQuery.data || user;

  return (
    <AppLayout
      user={user}
      selectedEvent={null}
      onLogout={onLogout}
      showTelegramOnboarding={false}
    >
      <div className="mx-auto max-w-3xl space-y-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700"
        >
          <ArrowLeft size={16} />
          Quay lại trang chủ
        </Link>

        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="relative h-28 w-28 shrink-0">
              <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-blue-50 text-blue-600">
                {avatarPreviewUrl ? (
                  <img
                    src={avatarPreviewUrl}
                    alt={profile.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <User size={44} />
                )}
              </div>
              {uploadMutation.isPending && (
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-white/70">
                  <Loader2 size={24} className="animate-spin text-blue-600" />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-blue-600">Profile cá nhân</p>
              <h2 className="mt-1 text-2xl font-bold text-gray-900">{profile.name}</h2>
              <p className="mt-1 text-sm text-gray-500">
                Quản lý thông tin tài khoản và ảnh đại diện EventFlow.
              </p>
              <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                <Camera size={18} />
                Upload ảnh profile
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleFileChange}
                  className="sr-only"
                />
              </label>
              <p className="mt-2 text-xs text-gray-500">
                Hỗ trợ JPG, PNG, WEBP. Tối đa 2MB. File được lưu qua Supabase Storage khi cấu hình Supabase đang bật.
              </p>
              {selectedFileName && (
                <p className="mt-2 text-xs font-semibold text-gray-600">
                  Đang upload: {selectedFileName}
                </p>
              )}
            </div>
          </div>

          {profileQuery.isLoading && (
            <div className="mt-5 flex items-center gap-2 rounded-lg bg-gray-50 p-3 text-sm text-gray-500">
              <Loader2 size={18} className="animate-spin" />
              Đang tải profile...
            </div>
          )}

          {(profileQuery.error || uploadMutation.error || avatarQuery.error) && (
            <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {profileQuery.error?.userMessage ||
                uploadMutation.error?.userMessage ||
                avatarQuery.error?.userMessage ||
                'Không xử lý được profile'}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900">Thông tin tài khoản</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <InfoItem icon={<User size={18} />} label="Họ tên" value={profile.name} />
            <InfoItem icon={<Mail size={18} />} label="Email" value={profile.email} />
            <InfoItem
              icon={<Send size={18} />}
              label="Telegram"
              value={profile.telegramChatId ? 'Đã kết nối' : 'Chưa kết nối'}
            />
            <InfoItem label="User ID" value={profile.userId} />
          </div>
        </section>
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

export default ProfilePage;
