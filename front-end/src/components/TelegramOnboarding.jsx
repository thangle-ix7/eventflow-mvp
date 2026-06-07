import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Check,
  ClipboardCheck,
  Copy,
  ExternalLink,
  Loader2,
  MessageCircle,
  MousePointerClick,
  Send,
  X,
} from 'lucide-react';
import userApi from '../api/userApi';
import { appConfig } from '../config/appConfig';

const TELEGRAM_REOPEN_EVENT = 'eventflow:open-telegram-onboarding';

const TelegramOnboarding = ({ userId }) => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [linkToken, setLinkToken] = useState(null);
  const [copiedCommand, setCopiedCommand] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null);

  const { data: user, refetch, isLoading, error, isFetching } = useQuery({
    queryKey: ['userProfile', userId],
    queryFn: () => userApi.getProfile(userId, { preferCache: false }),
    enabled: Boolean(userId) && open,
    refetchInterval: (query) => {
      const chatId = query.state.data?.telegramChatId || query.state.data?.telegram_chat_id;
      return open && !chatId ? 10000 : false;
    },
    refetchIntervalInBackground: false,
  });

  const isTelegramConnected = Boolean(user?.telegramChatId || user?.telegram_chat_id);

  const createTokenMutation = useMutation({
    mutationFn: () => userApi.createTelegramLinkToken(userId),
    onSuccess: (tokenResponse) => setLinkToken(tokenResponse),
  });

  const telegramWebUrl = `https://web.telegram.org/k/#@${appConfig.telegramBotUsername}`;
  const startCommand = linkToken?.token ? `/start ${linkToken.token}` : '';

  useEffect(() => {
    const openOnboarding = () => {
      setOpen(true);
      setConnectionStatus(null);
    };

    window.addEventListener(TELEGRAM_REOPEN_EVENT, openOnboarding);
    return () => window.removeEventListener(TELEGRAM_REOPEN_EVENT, openOnboarding);
  }, []);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const onVisibility = () => {
      if (document.visibilityState === 'visible' && !isTelegramConnected) refetch();
    };
    window.addEventListener('focus', refetch);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', refetch);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [refetch, isTelegramConnected, open]);

  useEffect(() => {
    if (!isTelegramConnected) {
      return;
    }

    queryClient.invalidateQueries({ queryKey: ['profile', userId] });
  }, [isTelegramConnected, queryClient, userId]);

  const handleCollapse = () => {
    setOpen(false);
  };

  const copyStartCommand = async (token) => {
    try {
      await navigator.clipboard.writeText(`/start ${token}`);
      return true;
    } catch {
      return false;
    }
  };

  const getToken = async () => linkToken || createTokenMutation.mutateAsync();

  const handleStartGuidedFlow = async () => {
    try {
      const tokenResponse = await getToken();
      const copied = await copyStartCommand(tokenResponse.token);
      setCopiedCommand(copied);
      window.open(telegramWebUrl, '_blank', 'noopener,noreferrer');
      setConnectionStatus({
        type: copied ? 'info' : 'warning',
        message: copied
          ? `Đã copy lệnh và mở Telegram Web. Chọn đúng @${appConfig.telegramBotUsername}, dán lệnh, rồi bấm Xác nhận.`
          : `Đã mở Telegram Web. Hãy chọn đúng @${appConfig.telegramBotUsername}, copy lệnh, rồi bấm Xác nhận.`,
      });
      window.setTimeout(() => setCopiedCommand(false), 2500);
    } catch {
      // Mutation error is rendered below.
    }
  };

  const handleCopyCommand = async () => {
    try {
      const tokenResponse = await getToken();
      const copied = await copyStartCommand(tokenResponse.token);
      setCopiedCommand(copied);
      setConnectionStatus({
        type: copied ? 'info' : 'warning',
        message: copied
          ? `Đã copy lệnh. Mở đúng bot @${appConfig.telegramBotUsername}, dán lệnh này và bấm Xác nhận.`
          : `Trình duyệt không cho copy tự động. Hãy copy thủ công và gửi vào @${appConfig.telegramBotUsername}.`,
      });
      window.setTimeout(() => setCopiedCommand(false), 2500);
    } catch {
      // Mutation error is rendered below when available.
    }
  };

  const handleOpenTelegramApp = async () => {
    try {
      const tokenResponse = await getToken();
      window.open(
        `https://t.me/${appConfig.telegramBotUsername}?start=${tokenResponse.token}`,
        '_blank',
        'noopener,noreferrer'
      );
      setConnectionStatus({
        type: 'warning',
        message: 'Nếu Telegram chỉ mở màn chat và không hiện nút Xác nhận, quay lại đây và dùng Copy lệnh.',
      });
    } catch {
      // Mutation error is rendered below.
    }
  };

  const handleCheckConnection = async () => {
    setConnectionStatus({
      type: 'info',
      message: 'Đang kiểm tra kết nối Telegram...',
    });

    const result = await refetch();
    const chatId = result.data?.telegramChatId || result.data?.telegram_chat_id;
    setConnectionStatus(
      chatId
        ? {
            type: 'success',
            message: 'Kết nối Telegram thành công. Bạn sẽ nhận nhắc việc deadline qua bot.',
          }
        : {
            type: 'warning',
            message: `Chưa kết nối. Hãy gửi lệnh vào đúng bot @${appConfig.telegramBotUsername}, không phải chat cá nhân hoặc bot khác.`,
          }
    );
  };

  if (!open) return null;
  if (isLoading) return null;
  if (isTelegramConnected && connectionStatus?.type !== 'success') {
    return null;
  }

  return (
    <div className="fixed bottom-3 left-3 right-3 z-50 mx-auto max-h-[calc(100vh-1.5rem)] max-w-3xl overflow-y-auto rounded-xl border border-indigo-200 bg-white shadow-xl shadow-slate-950/10 sm:bottom-4 sm:left-4 sm:right-4">
      <div className="border-b border-slate-100 px-4 py-3 sm:px-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <MessageCircle className="h-5 w-5" strokeWidth={1.8} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase text-indigo-600">Nhắc deadline tự động</p>
              <h2 className="text-lg font-extrabold text-slate-950">Kết nối Telegram trong 2 phút</h2>
              <p className="mt-1 text-sm leading-5 text-slate-600">
                EventFlow sẽ gửi nhắc việc qua bot. Bạn chỉ cần copy một lệnh, gửi cho bot và bấm Xác nhận.
              </p>
              <div className="mt-2 inline-flex max-w-full items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-bold text-indigo-700">
                <MessageCircle className="h-3.5 w-3.5 shrink-0" strokeWidth={1.8} />
                <span className="truncate">Đúng bot: @{appConfig.telegramBotUsername}</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCollapse}
            className="inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
            aria-label="Đóng hướng dẫn kết nối Telegram"
          >
            <X className="h-4 w-4" strokeWidth={1.8} />
            Đóng
          </button>
        </div>
      </div>

      <div className="grid gap-4 px-4 py-4 sm:px-5 lg:grid-cols-[1fr_15rem]">
        <div className="space-y-3">
          <StepItem
            icon={<ExternalLink className="h-4 w-4" strokeWidth={1.8} />}
            title={`Mở đúng bot @${appConfig.telegramBotUsername}`}
            description="Nếu Telegram hỏi QR, quét bằng điện thoại. Sau đó kiểm tra tên chat đang mở đúng là bot này."
          />
          <StepItem
            icon={<Copy className="h-4 w-4" strokeWidth={1.8} />}
            title="Dán lệnh đã copy vào chat bot"
            description="Không gửi lệnh vào chat cá nhân, nhóm, hoặc bot khác. Nếu chưa copy được, dùng nút Copy lệnh."
          />
          <StepItem
            icon={<MousePointerClick className="h-4 w-4" strokeWidth={1.8} />}
            title="Bấm Xác nhận trong Telegram"
            description="Sau khi bấm Xác nhận, quay lại EventFlow và kiểm tra kết nối."
          />
        </div>

        <div className="space-y-2">
          <button
            type="button"
            onClick={handleStartGuidedFlow}
            disabled={createTokenMutation.isPending}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {createTokenMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.8} />
            ) : (
              <ClipboardCheck className="h-4 w-4" strokeWidth={1.8} />
            )}
            Copy lệnh và mở Telegram
          </button>

          <button
            type="button"
            onClick={handleCheckConnection}
            disabled={isFetching}
            className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {isFetching ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.8} /> : <Check className="h-4 w-4" strokeWidth={1.8} />}
            Tôi đã xác nhận, kiểm tra
          </button>

          <button
            type="button"
            onClick={handleCopyCommand}
            disabled={createTokenMutation.isPending}
            className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {copiedCommand ? (
              <Check className="h-4 w-4 text-emerald-600" strokeWidth={1.8} />
            ) : (
              <Copy className="h-4 w-4" strokeWidth={1.8} />
            )}
            {copiedCommand ? 'Đã copy' : 'Chỉ copy lệnh'}
          </button>

          <button
            type="button"
            onClick={handleOpenTelegramApp}
            disabled={createTokenMutation.isPending}
            className="inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-700 disabled:opacity-60"
          >
            <Send className="h-3.5 w-3.5" strokeWidth={1.8} />
            Mở app Telegram nếu đã cài
          </button>
        </div>
      </div>

      {(error || createTokenMutation.error) && (
        <div className="mx-4 mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 sm:mx-5">
          Không thể tạo/kiểm tra link kết nối:{' '}
          {(error || createTokenMutation.error).userMessage ||
            (error || createTokenMutation.error).message}
        </div>
      )}

      {connectionStatus && (
        <div
          className={`mx-4 mb-3 rounded-lg border px-3 py-2 text-sm leading-5 sm:mx-5 ${
            connectionStatus.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : connectionStatus.type === 'warning'
                ? 'border-amber-200 bg-amber-50 text-amber-700'
                : 'border-indigo-200 bg-indigo-50 text-indigo-700'
          }`}
        >
          {connectionStatus.message}
        </div>
      )}

      {startCommand && (
        <div className="mx-4 mb-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-500 sm:mx-5">
          <p className="font-semibold text-slate-700">Lệnh gửi cho @{appConfig.telegramBotUsername}</p>
          <p className="mt-1 break-all font-mono text-slate-800">{startCommand}</p>
          <p className="mt-1">
            Lệnh này chỉ có tác dụng khi gửi trong chat @{appConfig.telegramBotUsername}. Nếu đang ở chat khác, hãy chuyển về đúng bot trước.
          </p>
        </div>
      )}
    </div>
  );
};

const StepItem = ({ icon, title, description }) => (
  <div className="flex gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-indigo-600 ring-1 ring-slate-200">
      {icon}
    </div>
    <div className="min-w-0">
      <p className="text-sm font-bold text-slate-900">{title}</p>
      <p className="mt-0.5 text-xs leading-5 text-slate-600">{description}</p>
    </div>
  </div>
);

export { TELEGRAM_REOPEN_EVENT };
export default TelegramOnboarding;
