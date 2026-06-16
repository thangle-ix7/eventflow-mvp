import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { CheckCircle2, Loader2, MessageSquareHeart, X } from 'lucide-react';
import feedbackApi from '../api/feedbackApi';
import { Button, ErrorState, Panel } from './ui';

const CATEGORY_OPTIONS = [
  { value: 'GENERAL', label: 'Góp ý chung' },
  { value: 'NEED', label: 'Nhu cầu mới' },
  { value: 'BUG', label: 'Báo lỗi' },
  { value: 'FLOW', label: 'Flow chưa hợp lý' },
  { value: 'TEMPLATE', label: 'Template sự kiện' },
];

const FeedbackModal = ({ isOpen, selectedEvent, user, onClose }) => {
  const [form, setForm] = useState({
    category: 'GENERAL',
    message: '',
    contactEmail: user?.email || '',
    anonymous: false,
    publicVisible: false,
  });

  const mutation = useMutation({
    mutationFn: feedbackApi.submitFeedback,
    onSuccess: () => {
      setForm((old) => ({
        ...old,
        message: '',
        publicVisible: false,
      }));
    },
  });

  if (!isOpen) return null;

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    mutation.reset();
    setForm((old) => ({
      ...old,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!form.message.trim() || mutation.isPending) return;

    mutation.mutate({
      eventId: selectedEvent?.id || null,
      category: form.category,
      message: form.message,
      contactEmail: form.contactEmail || null,
      anonymous: form.anonymous,
      publicVisible: form.publicVisible,
    });
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <Panel className="w-full max-w-xl overflow-hidden">
        <div className="flex items-start justify-between gap-4 border-b border-sky-100 bg-gradient-to-r from-sky-50 via-white to-emerald-50 px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-sky-600 shadow-sm">
              <MessageSquareHeart size={20} />
            </span>
            <div>
              <h2 className="text-lg font-black text-slate-950">Gửi feedback cho EventFlow</h2>
              <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                Gửi lỗi, nhu cầu mới, flow chưa hợp lý hoặc template bạn muốn có. Team sẽ phản hồi qua thông báo EventFlow, Telegram hoặc email khi xử lý.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl p-2 text-slate-400 transition hover:bg-white hover:text-slate-700"
            aria-label="Đóng feedback"
          >
            <X size={18} />
          </button>
        </div>

        {mutation.isSuccess ? (
          <div className="p-6">
            <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5 text-emerald-800">
              <CheckCircle2 className="h-7 w-7" />
              <h3 className="mt-3 font-black">Đã nhận feedback của bạn</h3>
              <p className="mt-2 text-sm font-semibold leading-6">
                Cảm ơn bạn. Khi team xem hoặc phản hồi, bạn sẽ nhận thông báo trong EventFlow; nếu đã kết nối Telegram hoặc email thì hệ thống sẽ gửi theo kênh phù hợp.
              </p>
            </div>

            <div className="mt-4 flex justify-end">
              <Button onClick={onClose}>Xong</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 p-5">
            {mutation.error && (
              <ErrorState
                title="Không gửi được feedback"
                error={mutation.error}
                onDismiss={() => mutation.reset()}
              />
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-black text-slate-700">
                Loại feedback
                <select
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  className={inputClassName}
                >
                  {CATEGORY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-black text-slate-700">
                Email nhận phản hồi
                <input
                  name="contactEmail"
                  type="email"
                  value={form.contactEmail}
                  onChange={handleChange}
                  placeholder="support hoặc email của bạn"
                  className={inputClassName}
                />
              </label>
            </div>

            <label className="block text-sm font-black text-slate-700">
              Nội dung
              <textarea
                name="message"
                value={form.message}
                onChange={handleChange}
                required
                maxLength={4000}
                rows={6}
                placeholder="Ví dụ: Với giải đấu 16 đội, tụi mình cần xem rủi ro sân bãi/y tế/trọng tài rõ hơn..."
                className={`${inputClassName} min-h-36 resize-y py-3`}
              />
            </label>

            <div className="space-y-3 rounded-2xl border border-sky-100 bg-sky-50/60 p-4">
              <label className="flex items-start gap-3 text-sm font-semibold text-slate-700">
                <input
                  name="anonymous"
                  type="checkbox"
                  checked={form.anonymous}
                  onChange={handleChange}
                  className="mt-1 h-4 w-4 rounded border-sky-200 text-sky-500"
                />
                <span>
                  Gửi ẩn danh trong hệ thống. Nếu bạn để lại email, team chỉ dùng để phản hồi feedback này.
                </span>
              </label>

              <label className="flex items-start gap-3 text-sm font-semibold text-slate-700">
                <input
                  name="publicVisible"
                  type="checkbox"
                  checked={form.publicVisible}
                  onChange={handleChange}
                  className="mt-1 h-4 w-4 rounded border-sky-200 text-sky-500"
                />
                <span>
                  Cho phép EventFlow dùng góp ý này làm insight công khai hoặc roadmap note, không công khai email.
                </span>
              </label>
            </div>

            {selectedEvent?.name && (
              <p className="rounded-2xl bg-slate-50 px-4 py-3 text-xs font-bold text-slate-500">
                Feedback sẽ được gắn với event: <span className="text-slate-800">{selectedEvent.name}</span>
              </p>
            )}

            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="secondary" onClick={onClose}>
                Hủy
              </Button>
              <Button type="submit" disabled={!form.message.trim() || mutation.isPending}>
                {mutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <MessageSquareHeart size={16} />}
                Gửi feedback
              </Button>
            </div>
          </form>
        )}
      </Panel>
    </div>
  );
};

const inputClassName = 'mt-2 w-full rounded-2xl border border-sky-100 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100';

export default FeedbackModal;
