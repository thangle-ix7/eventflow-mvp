import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Check, Copy, ExternalLink, MessageCircle, X } from 'lucide-react';
import userApi from '../api/userApi';
import { appConfig } from '../config/appConfig';

const TelegramOnboarding = ({ userId }) => {
  const [dismissed, setDismissed] = useState(() => {
    return sessionStorage.getItem('telegram_dismissed_session') === 'true';
  });
  const [linkToken, setLinkToken] = useState(null);
  const [copiedCommand, setCopiedCommand] = useState(false);

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

  const startCommand = linkToken?.token ? `/start ${linkToken.token}` : '';

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

  const handleCopyCommand = async () => {
    try {
      const tokenResponse =
        linkToken || (await createTokenMutation.mutateAsync());
      await navigator.clipboard.writeText(`/start ${tokenResponse.token}`);
      setCopiedCommand(true);
      window.setTimeout(() => setCopiedCommand(false), 2500);
    } catch {
      // Mutation/clipboard error is rendered below when available.
    }
  };

  if (isLoading || isTelegramConnected || dismissed) return null;

  return (
    <div className="fixed bottom-3 left-3 right-3 z-50 mx-auto max-h-[calc(100vh-1.5rem)] max-w-4xl overflow-y-auto rounded-xl border border-indigo-200 bg-white p-3 shadow-xl shadow-slate-950/10 sm:bottom-4 sm:left-4 sm:right-4 sm:p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <MessageCircle className="h-4 w-4" strokeWidth={1.8} />
          </div>
          <div className="min-w-0">
            <h2 className="font-bold text-slate-950">Kết nối Telegram</h2>
            <p className="mt-1 text-sm leading-5 text-slate-600">
              Nhận nhắc nhở deadline tự động. Mở bot rồi xác nhận tài khoản trong Telegram.
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

        <div className="grid shrink-0 grid-cols-[1fr_auto] gap-2 sm:grid-cols-[1fr_1fr_1fr_auto] lg:min-w-[520px]">
          <button
            type="button"
            onClick={handleOpenTelegram}
            disabled={createTokenMutation.isPending}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <ExternalLink className="h-4 w-4" strokeWidth={1.8} />
            {createTokenMutation.isPending ? 'Đang tạo link...' : 'Mở Telegram'}
          </button>

          <button
            type="button"
            onClick={handleCopyCommand}
            disabled={createTokenMutation.isPending}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 max-sm:col-span-2 max-sm:row-start-2"
          >
            {copiedCommand ? (
              <Check className="h-4 w-4 text-emerald-600" strokeWidth={1.8} />
            ) : (
              <Copy className="h-4 w-4" strokeWidth={1.8} />
            )}
            {copiedCommand ? 'Đã copy' : 'Copy lệnh'}
          </button>

          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="min-h-10 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 max-sm:col-span-2"
          >
            {isFetching ? 'Đang kiểm tra...' : 'Kiểm tra kết nối'}
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Bỏ qua kết nối Telegram"
          >
            <X className="h-4 w-4" strokeWidth={1.8} />
          </button>
        </div>
      </div>
      {telegramConnectUrl && (
        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-500">
          <p>
            Nếu trình duyệt không mở được Telegram, tìm bot{' '}
            <span className="font-semibold text-slate-700">@{appConfig.telegramBotUsername}</span>{' '}
            trên Telegram Web/điện thoại rồi gửi:
          </p>
          <p className="mt-1 break-all font-mono font-semibold text-slate-800">{startCommand}</p>
        </div>
      )}
    </div>
  );
};

export default TelegramOnboarding;
