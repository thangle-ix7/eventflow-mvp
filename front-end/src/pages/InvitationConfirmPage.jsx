import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2, Sparkles, XCircle } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import eventMemberApi from '../api/eventMemberApi';
import { Button, Panel } from '../components/ui';

const InvitationConfirmPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const confirmMutation = useMutation({
    mutationFn: eventMemberApi.confirmInvitation,
  });

  useEffect(() => {
    if (token && confirmMutation.isIdle) {
      confirmMutation.mutate(token);
    }
  }, [confirmMutation, token]);

  const isSuccess = confirmMutation.isSuccess;
  const isError = !token || confirmMutation.isError;
  const eventId = confirmMutation.data?.eventId;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#F8FCFF] px-4 py-10">
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-sky-100 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 right-0 h-[28rem] w-[28rem] rounded-full bg-emerald-100/80 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(14,165,233,0.07)_1px,transparent_1px),linear-gradient(to_bottom,rgba(14,165,233,0.07)_1px,transparent_1px)] bg-[size:48px_48px]" />

      <Panel className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-sky-100 bg-white/90 p-0 text-center shadow-2xl shadow-sky-100/80 backdrop-blur-xl">
        <div className="relative border-b border-sky-100 bg-gradient-to-r from-sky-50 via-white to-emerald-50 px-6 py-5">
          <Link to="/" className="mx-auto inline-flex items-center justify-center gap-3">
            <span className="relative flex h-12 w-12 items-center justify-center">
              <span className="absolute inset-0 rounded-2xl bg-gradient-to-br from-sky-400 to-emerald-400 opacity-40 blur-md" />
              <span className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-lg shadow-sky-100">
                <img src="/event-flow-logo-mark.png" alt="EventFlow" className="h-8 w-8 object-contain" />
              </span>
            </span>

            <span className="text-xl font-black tracking-tight text-slate-950">
              <span>Event</span>
              <span className="bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                Flow
              </span>
            </span>
          </Link>
        </div>

        <div className="relative px-6 py-8">
          <div
            className={`mx-auto flex h-16 w-16 items-center justify-center rounded-3xl shadow-lg ${
              isSuccess
                ? 'bg-emerald-50 text-emerald-600 shadow-emerald-100'
                : isError
                  ? 'bg-red-50 text-red-600 shadow-red-100'
                  : 'bg-sky-50 text-sky-600 shadow-sky-100'
            }`}
          >
            {isSuccess && <CheckCircle2 size={34} strokeWidth={1.8} />}
            {isError && <XCircle size={34} strokeWidth={1.8} />}
            {!isSuccess && !isError && <Loader2 size={34} className="animate-spin" strokeWidth={1.8} />}
          </div>

          <p className="mt-6 inline-flex rounded-full bg-sky-50 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-sky-600">
            Invitation status
          </p>

          <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950">
            {isSuccess ? 'Đã tham gia sự kiện' : isError ? 'Không xác nhận được' : 'Đang xác nhận'}
          </h1>

          <p className="mx-auto mt-4 max-w-sm text-sm font-semibold leading-7 text-slate-600">
            {isSuccess
              ? confirmMutation.data?.message
              : isError
                ? (confirmMutation.error?.userMessage || confirmMutation.error?.message || 'Lời mời không hợp lệ hoặc đã hết hạn.')
                : 'EventFlow đang kiểm tra lời mời của bạn. Vui lòng chờ trong giây lát.'}
          </p>

          <div className="mt-7 flex justify-center gap-2">
            {isSuccess && eventId ? (
              <Button
                as={Link}
                to={`/events/${eventId}`}
                className="min-h-11 rounded-2xl bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400 px-5 font-black text-white shadow-xl shadow-cyan-100"
              >
                <Sparkles size={16} />
                Mở sự kiện
              </Button>
            ) : (
              <Button
                as={Link}
                to="/login"
                variant="secondary"
                className="min-h-11 rounded-2xl border-sky-100 bg-white px-5 font-black text-sky-600 shadow-sm hover:bg-sky-50"
              >
                Đăng nhập
              </Button>
            )}
          </div>
        </div>
      </Panel>
    </main>
  );
};

export default InvitationConfirmPage;