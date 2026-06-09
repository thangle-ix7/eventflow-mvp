import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
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
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <Panel className="w-full max-w-md p-6 text-center">
        <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${
          isSuccess ? 'bg-emerald-50 text-emerald-600' : isError ? 'bg-red-50 text-red-600' : 'bg-indigo-50 text-indigo-600'
        }`}>
          {isSuccess && <CheckCircle2 size={30} />}
          {isError && <XCircle size={30} />}
          {!isSuccess && !isError && <Loader2 size={30} className="animate-spin" />}
        </div>

        <h1 className="mt-5 text-2xl font-extrabold text-slate-950">
          {isSuccess ? 'Đã tham gia sự kiện' : isError ? 'Không xác nhận được' : 'Đang xác nhận'}
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-600">
          {isSuccess
            ? confirmMutation.data?.message
            : isError
              ? (confirmMutation.error?.userMessage || confirmMutation.error?.message || 'Lời mời không hợp lệ hoặc đã hết hạn.')
              : 'Vui lòng chờ trong giây lát.'}
        </p>

        <div className="mt-6 flex justify-center gap-2">
          {isSuccess && eventId ? (
            <Button as={Link} to={`/events/${eventId}`}>
              Mở sự kiện
            </Button>
          ) : (
            <Button as={Link} to="/login" variant="secondary">
              Đăng nhập
            </Button>
          )}
        </div>
      </Panel>
    </main>
  );
};

export default InvitationConfirmPage;
