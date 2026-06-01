import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { MessageCircle, X } from 'lucide-react';
import userApi from '../api/userApi';
import { appConfig } from '../config/appConfig';

const TelegramOnboarding = ({ userId }) => {
  const [dismissed, setDismissed] = useState(() => {
    return sessionStorage.getItem('telegram_dismissed_session') === 'true';
  });
  const [linkToken, setLinkToken] = useState(null);

  const { data: user, refetch, isLoading, error, isFetching } = useQuery({
    queryKey: ['userProfile', userId],
    queryFn: () => userApi.getProfile(userId, { preferCache: false }),
    enabled: Boolean(userId) && !dismissed,
    refetchInterval: (query) => {
      const chatId = query.state.data?.telegramChatId || query.state.data?.telegram_chat_id;
      return chatId ? false : 10000;
    },
    refetchIntervalInBackground: false,
  });

  const isTelegramConnected = Boolean(user?.telegramChatId || user?.telegram_chat_id);

  const createTokenMutation = useMutation({
    mutationFn: () => userApi.createTelegramLinkToken(userId),
    onSuccess: (tokenResponse) => setLinkToken(tokenResponse),
  });

  const telegramConnectUrl = useMemo(
    () =>
      linkToken?.token
        ? `https://t.me/${appConfig.telegramBotUsername}?start=${linkToken.token}`
        : null,
    [linkToken]
  );

  useEffect(() => {
    if (dismissed) return;
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && !isTelegramConnected) refetch();
    };
    window.addEventListener('focus', refetch);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', refetch);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [refetch, isTelegramConnected, dismissed]);

  const handleDismiss = () => {
    sessionStorage.setItem('telegram_dismissed_session', 'true');
    setDismissed(true);
  };

  const handleOpenTelegram = async () => {
    try {
      const tokenResponse =
        linkToken || (await createTokenMutation.mutateAsync());

      window.open(
        `https://t.me/${appConfig.telegramBotUsername}?start=${tokenResponse.token}`,
        '_blank',
        'noopener,noreferrer'
      );
    } catch {
      // Mutation error is rendered below.
    }
  };

  if (isLoading || isTelegramConnected || dismissed) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-4xl rounded-xl border border-indigo-200 bg-white p-3 shadow-xl shadow-slate-950/10 sm:p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <MessageCircle className="h-4 w-4" strokeWidth={1.8} />
          </div>
          <div>
            <h2 className="font-bold text-slate-950">Kết nối Telegram</h2>
            <p className="mt-1 text-sm leading-5 text-slate-600">
              Nhận nhắc nhở deadline tự động. Bạn có thể bỏ qua và tiếp tục dùng dashboard.
            </p>
          </div>
        </div>

        {(error || createTokenMutation.error) && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            Không thể tạo/kiểm tra link kết nối:{' '}
            {(error || createTokenMutation.error).userMessage ||
              (error || createTokenMutation.error).message}
          </div>
        )}

        <div className="grid shrink-0 grid-cols-[1fr_1fr_auto] gap-2">
          <button
            type="button"
            onClick={handleOpenTelegram}
            disabled={createTokenMutation.isPending}
            className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {createTokenMutation.isPending ? 'Đang tạo link...' : 'Mở Telegram'}
          </button>

          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {isFetching ? 'Đang kiểm tra...' : 'Đã Start'}
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Bỏ qua kết nối Telegram"
          >
            <X className="h-4 w-4" strokeWidth={1.8} />
          </button>
        </div>
      </div>
      {telegramConnectUrl && (
        <p className="mt-3 break-all text-xs text-slate-400">
          Hoặc mở Telegram và gõ:{' '}
          <span className="font-mono font-semibold">/start {linkToken.token}</span>
        </p>
      )}
    </div>
  );
};

export default TelegramOnboarding;
