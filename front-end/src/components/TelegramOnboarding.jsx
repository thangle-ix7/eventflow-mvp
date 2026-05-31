import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import userApi from '../api/userApi';
import { appConfig } from '../config/appConfig';

const TelegramOnboarding = ({ userId }) => {
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem('telegram_dismissed') === 'true';
  });

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

  const telegramConnectUrl = useMemo(
    () => `https://t.me/${appConfig.telegramBotUsername}?start=${userId}`,
    [userId]
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
    localStorage.setItem('telegram_dismissed', 'true');
    setDismissed(true);
  };

  if (isLoading || isTelegramConnected || dismissed) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-md w-full mx-4 text-center">
        <div className="mb-6 flex justify-center">
          <div className="bg-blue-100 p-4 rounded-full">
            <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        <h2 className="text-2xl font-bold text-gray-800 mb-2">Kết nối Telegram</h2>
        <p className="text-gray-500 text-sm mb-1">
          ID của bạn: <span className="font-mono font-semibold text-gray-700">{userId}</span>
        </p>
        <p className="text-gray-600 mb-6 mt-2">
          Kết nối Telegram để nhận nhắc nhở tự động từ EventFlow.
        </p>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            Không thể kiểm tra trạng thái: {error.userMessage || error.message}
          </div>
        )}

        <a
          href={telegramConnectUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors duration-200 shadow-lg shadow-blue-200"
        >
          Mở Telegram và kết nối
        </a>

        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="mt-3 w-full py-2 px-4 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 disabled:opacity-60"
        >
          {isFetching ? 'Đang kiểm tra...' : 'Tôi đã bấm Start trên Telegram'}
        </button>

        <button
          type="button"
          onClick={handleDismiss}
          className="mt-2 w-full py-2 px-4 rounded-xl text-gray-400 text-sm hover:text-gray-600 transition-colors"
        >
          Bỏ qua, làm sau
        </button>

        <p className="mt-4 text-xs text-gray-400">
          Hoặc mở Telegram và gõ:{' '}
          <span className="font-semibold font-mono">/start {userId}</span>
        </p>
      </div>
    </div>
  );
};

export default TelegramOnboarding;
