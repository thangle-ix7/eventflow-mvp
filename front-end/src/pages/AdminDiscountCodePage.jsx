import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BadgePercent,
  CalendarClock,
  Copy,
  Power,
  RefreshCcw,
  Ticket,
} from 'lucide-react';
import subscriptionApi from '../api/subscriptionApi';
import { Button, EmptyState, ErrorState, LoadingState, PageHeader } from '../components/ui';

const DEFAULT_FORM = {
  code: '',
  targetPlanCode: '',
  discountPercent: 100,
  maxRedemptions: '',
  expiresAt: '',
  description: '',
  active: true,
};

const AdminDiscountCodePage = () => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(DEFAULT_FORM);
  const [copiedCode, setCopiedCode] = useState(null);

  const plansQuery = useQuery({
    queryKey: ['subscriptionPlans'],
    queryFn: subscriptionApi.getPlans,
    staleTime: 5 * 60 * 1000,
  });

  const codesQuery = useQuery({
    queryKey: ['adminDiscountCodes'],
    queryFn: subscriptionApi.getDiscountCodes,
  });

  const paidPlans = useMemo(
    () => (plansQuery.data || []).filter((plan) => Number(plan.priceVnd || 0) > 0),
    [plansQuery.data],
  );

  const createMutation = useMutation({
    mutationFn: subscriptionApi.createDiscountCode,
    onSuccess: () => {
      setForm(DEFAULT_FORM);
      queryClient.invalidateQueries({ queryKey: ['adminDiscountCodes'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: subscriptionApi.updateDiscountCode,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminDiscountCodes'] });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: subscriptionApi.deactivateDiscountCode,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminDiscountCodes'] });
    },
  });

  const handleChange = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setForm((current) => ({ ...current, [field]: value }));
  };

  const buildPayload = (source) => ({
    code: source.code.trim() || undefined,
    targetPlanCode: source.targetPlanCode,
    discountPercent: Number(source.discountPercent || 100),
    maxRedemptions: source.maxRedemptions ? Number(source.maxRedemptions) : null,
    expiresAt: source.expiresAt || null,
    description: source.description.trim() || null,
    active: source.active,
  });

  const handleSubmit = (event) => {
    event.preventDefault();
    createMutation.mutate(buildPayload(form));
  };

  const handleCopy = async (code) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    window.setTimeout(() => setCopiedCode(null), 1200);
  };

  const handleToggleActive = (item) => {
    updateMutation.mutate({
      id: item.id,
      code: item.code,
      targetPlanCode: item.targetPlanCode,
      discountPercent: item.discountPercent,
      maxRedemptions: item.maxRedemptions,
      expiresAt: toDateTimeLocal(item.expiresAt),
      description: item.description || null,
      active: !item.active,
    });
  };

  const codes = codesQuery.data || [];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="Mã giảm giá theo gói"
        description="Sinh mã giảm giá cho từng gói subscription hoặc Event Pass, đặt phần trăm giảm và giới hạn lượt dùng."
      />

      <form onSubmit={handleSubmit} className="rounded-[2rem] border border-sky-100 bg-white p-5 shadow-xl shadow-sky-100/70">
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr]">
          <label className="grid gap-1.5 text-sm font-bold text-slate-700">
            Gói áp dụng
            <select
              required
              value={form.targetPlanCode}
              onChange={handleChange('targetPlanCode')}
              className="h-12 rounded-2xl border border-sky-100 bg-sky-50/70 px-3 text-sm font-black text-slate-800 outline-none transition focus:border-cyan-300 focus:bg-white focus:ring-4 focus:ring-cyan-100"
            >
              <option value="">Chọn gói</option>
              {paidPlans.map((plan) => (
                <option key={plan.code} value={plan.code}>
                  {plan.displayName} · {formatPrice(plan.priceVnd)}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1.5 text-sm font-bold text-slate-700">
            Phần trăm giảm
            <input
              type="number"
              min="1"
              max="100"
              required
              value={form.discountPercent}
              onChange={handleChange('discountPercent')}
              className="h-12 rounded-2xl border border-sky-100 bg-sky-50/70 px-3 text-sm font-black text-slate-800 outline-none transition focus:border-cyan-300 focus:bg-white focus:ring-4 focus:ring-cyan-100"
            />
          </label>

          <label className="grid gap-1.5 text-sm font-bold text-slate-700">
            Số lượt dùng
            <input
              type="number"
              min="1"
              value={form.maxRedemptions}
              onChange={handleChange('maxRedemptions')}
              placeholder="Không giới hạn"
              className="h-12 rounded-2xl border border-sky-100 bg-sky-50/70 px-3 text-sm font-black text-slate-800 outline-none transition placeholder:font-semibold placeholder:text-slate-400 focus:border-cyan-300 focus:bg-white focus:ring-4 focus:ring-cyan-100"
            />
          </label>

          <label className="grid gap-1.5 text-sm font-bold text-slate-700">
            Hết hạn
            <input
              type="datetime-local"
              value={form.expiresAt}
              onChange={handleChange('expiresAt')}
              className="h-12 rounded-2xl border border-sky-100 bg-sky-50/70 px-3 text-sm font-black text-slate-800 outline-none transition focus:border-cyan-300 focus:bg-white focus:ring-4 focus:ring-cyan-100"
            />
          </label>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[0.8fr_1.2fr_auto] lg:items-end">
          <label className="grid gap-1.5 text-sm font-bold text-slate-700">
            Mã tùy chọn
            <input
              value={form.code}
              onChange={(event) => setForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))}
              placeholder="Để trống để tự sinh"
              className="h-12 rounded-2xl border border-sky-100 bg-sky-50/70 px-3 text-sm font-black uppercase tracking-wide text-slate-800 outline-none transition placeholder:normal-case placeholder:font-semibold placeholder:tracking-normal placeholder:text-slate-400 focus:border-cyan-300 focus:bg-white focus:ring-4 focus:ring-cyan-100"
            />
          </label>

          <label className="grid gap-1.5 text-sm font-bold text-slate-700">
            Ghi chú
            <input
              value={form.description}
              onChange={handleChange('description')}
              placeholder="Ví dụ: mã test nội bộ tháng 6"
              className="h-12 rounded-2xl border border-sky-100 bg-sky-50/70 px-3 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-cyan-300 focus:bg-white focus:ring-4 focus:ring-cyan-100"
            />
          </label>

          <Button type="submit" disabled={createMutation.isPending || plansQuery.isLoading}>
            <BadgePercent className="h-4 w-4" />
            Sinh mã
          </Button>
        </div>

        {createMutation.error && (
          <div className="mt-4">
            <ErrorState error={createMutation.error} title="Chưa sinh được mã giảm giá" onDismiss={() => createMutation.reset()} />
          </div>
        )}
      </form>

      {codesQuery.isLoading && <LoadingState message="Đang tải mã giảm giá..." />}
      {codesQuery.error && <ErrorState error={codesQuery.error} title="Không tải được mã giảm giá" />}

      {!codesQuery.isLoading && !codesQuery.error && codes.length === 0 && (
        <EmptyState
          icon={Ticket}
          title="Chưa có mã giảm giá"
          description="Chọn gói, phần trăm giảm rồi sinh mã để cấp cho tài khoản test."
        />
      )}

      {codes.length > 0 && (
        <section className="overflow-hidden rounded-[2rem] border border-sky-100 bg-white shadow-xl shadow-sky-100/70">
          <div className="grid gap-3 border-b border-sky-100 bg-sky-50/70 px-5 py-4 text-xs font-black uppercase tracking-[0.16em] text-slate-500 md:grid-cols-[1.1fr_1fr_0.55fr_0.7fr_0.8fr_0.7fr]">
            <span>Mã</span>
            <span>Gói</span>
            <span>Giảm</span>
            <span>Lượt dùng</span>
            <span>Hết hạn</span>
            <span>Thao tác</span>
          </div>

          <div className="divide-y divide-sky-50">
            {codes.map((item) => (
              <article key={item.id} className="grid gap-3 px-5 py-4 text-sm font-semibold text-slate-700 md:grid-cols-[1.1fr_1fr_0.55fr_0.7fr_0.8fr_0.7fr] md:items-center">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-black tracking-wide text-slate-950">{item.code}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(item.code)}
                      className="rounded-xl p-1.5 text-slate-400 transition hover:bg-sky-50 hover:text-sky-600"
                      aria-label="Sao chép mã"
                      title={copiedCode === item.code ? 'Đã sao chép' : 'Sao chép mã'}
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                  {item.description && <p className="mt-1 truncate text-xs font-semibold text-slate-500">{item.description}</p>}
                </div>

                <span className="font-black text-slate-800">{item.targetPlanName || item.targetPlanCode}</span>

                <span className="inline-flex w-fit items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                  {item.discountPercent}%
                </span>

                <span>
                  {item.redeemedCount || 0}
                  {item.maxRedemptions ? ` / ${item.maxRedemptions}` : ' / không giới hạn'}
                </span>

                <span className="inline-flex items-center gap-2 text-slate-500">
                  <CalendarClock className="h-4 w-4 text-sky-500" />
                  {formatDateTime(item.expiresAt)}
                </span>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    className="min-h-9 px-3"
                    onClick={() => handleToggleActive(item)}
                    disabled={updateMutation.isPending}
                  >
                    <Power className="h-4 w-4" />
                    {item.active ? 'Tắt' : 'Bật'}
                  </Button>
                  {item.active && (
                    <Button
                      type="button"
                      variant="danger"
                      className="min-h-9 px-3"
                      onClick={() => deactivateMutation.mutate(item.id)}
                      disabled={deactivateMutation.isPending}
                    >
                      <RefreshCcw className="h-4 w-4" />
                      Hủy
                    </Button>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

const formatPrice = (value) => `${Number(value || 0).toLocaleString('vi-VN')}đ`;

const formatDateTime = (value) => {
  if (!value) return 'Không giới hạn';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Không giới hạn';
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const toDateTimeLocal = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
};

export default AdminDiscountCodePage;
