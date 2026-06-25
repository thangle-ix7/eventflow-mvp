import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Bot,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Copy,
  CreditCard,
  Layers3,
  LockKeyhole,
  Percent,
  QrCode,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Tag,
  Ticket,
  UsersRound,
  WalletCards,
  X,
} from 'lucide-react';
import eventApi from '../api/eventApi';
import subscriptionApi from '../api/subscriptionApi';
import { Button, ErrorState } from '../components/ui';

const PLAN_ORDER = ['FREE', 'CLUB', 'PRO_AGENCY', 'EVENT_STANDARD', 'EVENT_PREMIUM', 'ENTERPRISE'];

const FALLBACK_PLANS = [
  {
    code: 'FREE',
    displayName: 'Free',
    planType: 'SUBSCRIPTION',
    billingInterval: 'MONTHLY',
    priceVnd: 0,
    targetSegment: 'Cá nhân, CLB nhỏ đang thử EventFlow',
    maxActiveEvents: 1,
    maxUsersPerEvent: 3,
    storageLimitBytes: 536870912,
    aiCreditsPerMonth: 5,
    features: ['Task cơ bản', 'Phòng ban', 'Dashboard cơ bản', 'Template public'],
  },
  {
    code: 'CLUB',
    displayName: 'Club',
    planType: 'SUBSCRIPTION',
    billingInterval: 'MONTHLY',
    priceVnd: 199000,
    targetSegment: 'CLB, nhóm nhỏ, lớp, đội project',
    maxActiveEvents: 3,
    maxUsersPerEvent: 30,
    storageLimitBytes: 10737418240,
    aiCreditsPerMonth: 50,
    features: ['Kanban/task', 'Calendar', 'Reminder', 'Documents/reports', 'Email invite'],
  },
  {
    code: 'PRO_AGENCY',
    displayName: 'Pro Agency',
    planType: 'SUBSCRIPTION',
    billingInterval: 'YEARLY',
    priceVnd: 6990000,
    targetSegment: 'Agency sự kiện, doanh nghiệp SME',
    unlimitedEvents: true,
    maxUsersPerEvent: 50,
    storageLimitBytes: 53687091200,
    aiCreditsPerMonth: 300,
    features: ['Không giới hạn sự kiện', 'Timeline/Gantt-ready', 'Export', 'Advanced reports', 'Logo doanh nghiệp'],
  },
  {
    code: 'ENTERPRISE',
    displayName: 'Enterprise',
    planType: 'SUBSCRIPTION',
    billingInterval: 'CUSTOM',
    priceVnd: 70000000,
    targetSegment: 'Tập đoàn 200-500+ nhân sự',
    unlimitedEvents: true,
    unlimitedUsers: true,
    unlimitedStorage: true,
    unlimitedAi: true,
    features: ['Custom users/events/storage', 'SSO-ready', 'SLA', 'Audit nâng cao', 'ERP/kế toán-ready'],
  },
  {
    code: 'EVENT_STANDARD',
    displayName: 'Event Pass Standard',
    planType: 'EVENT_PASS',
    billingInterval: 'ONE_TIME',
    priceVnd: 399000,
    targetSegment: 'Một sự kiện vừa/nhỏ',
    maxUsersPerEvent: 15,
    storageLimitBytes: 10737418240,
    aiCreditsPerEvent: 50,
    eventDurationDays: 90,
    features: ['1 event', 'Task basic', 'Budget-ready', 'Documents/reports'],
  },
  {
    code: 'EVENT_PREMIUM',
    displayName: 'Event Pass Premium',
    planType: 'EVENT_PASS',
    billingInterval: 'ONE_TIME',
    priceVnd: 999000,
    targetSegment: 'Một sự kiện lớn, year-end, festival',
    maxUsersPerEvent: 50,
    storageLimitBytes: 21474836480,
    aiCreditsPerEvent: 1000,
    eventDurationDays: 120,
    features: ['1 event', 'QR check-in-ready', 'Landing page-ready', 'Auto email-ready', 'Priority support'],
  },
];

const CHECKOUT_GUARDS = [
  'Đơn thanh toán được tạo theo từng gói, từng user và có mã đơn riêng.',
  'Voucher chỉ được áp ở bước thanh toán để tránh áp nhầm gói.',
  'payOS/webhook xác nhận trước khi EventFlow kích hoạt quyền lợi.',
];

const PricingPage = ({ user }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [manualCheckoutMessage, setManualCheckoutMessage] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [checkoutStep, setCheckoutStep] = useState('details');
  const [checkoutResult, setCheckoutResult] = useState(null);
  const [checkoutPreview, setCheckoutPreview] = useState(null);
  const [discountCode, setDiscountCode] = useState('');
  const [selectedEventId, setSelectedEventId] = useState('');
  const [copiedOrder, setCopiedOrder] = useState(false);

  const paymentMessage = useMemo(() => {
    const payment = searchParams.get('payment');
    const payOsStatus = searchParams.get('status');
    const cancelled = searchParams.get('cancel') === 'true';
    if (!payment && !payOsStatus && !cancelled) return null;

    const message = searchParams.get('message');
    if (cancelled) {
      return message || 'Bạn đã hủy thanh toán. Gói hiện tại chưa thay đổi.';
    }
    if (payOsStatus) {
      return payOsStatus === 'PAID'
        ? 'payOS đã ghi nhận thanh toán. Gói sẽ được cập nhật sau khi webhook xác nhận.'
        : 'Thanh toán chưa hoàn tất. Gói hiện tại chưa thay đổi.';
    }
    return (
      message ||
        (payment === 'success'
          ? 'Thanh toán thành công. Gói của bạn đã được cập nhật.'
          : 'Thanh toán chưa thành công hoặc đã bị hủy.')
    );
  }, [searchParams]);
  const checkoutMessage = manualCheckoutMessage || paymentMessage;

  const plansQuery = useQuery({
    queryKey: ['subscriptionPlans'],
    queryFn: subscriptionApi.getPlans,
    staleTime: 5 * 60 * 1000,
  });

  const checkoutMutation = useMutation({
    mutationFn: subscriptionApi.createCheckout,
    onSuccess: (response) => {
      setCheckoutResult(response);
      setCopiedOrder(false);
      if (response?.checkoutUrl) {
        setCheckoutStep('payment');
        setManualCheckoutMessage(null);
        return;
      }
      if (response?.discountAmountVnd > 0) {
        setDiscountCode('');
      }
      setManualCheckoutMessage(response?.message || 'Đã ghi nhận yêu cầu nâng cấp.');
      setCheckoutStep('payment');
    },
  });

  const previewMutation = useMutation({
    mutationFn: subscriptionApi.previewCheckout,
    onSuccess: (response) => {
      setCheckoutPreview(response);
    },
  });

  const plans = useMemo(() => {
    const items = plansQuery.data?.length ? plansQuery.data : FALLBACK_PLANS;
    return [...items].sort((a, b) => PLAN_ORDER.indexOf(a.code) - PLAN_ORDER.indexOf(b.code));
  }, [plansQuery.data]);

  const subscriptions = plans.filter((plan) => plan.planType === 'SUBSCRIPTION');
  const eventPasses = plans.filter((plan) => plan.planType === 'EVENT_PASS');
  const eventPassSelected = selectedPlan?.planType === 'EVENT_PASS';

  const eventsQuery = useQuery({
    queryKey: ['pricingEventPassEvents'],
    queryFn: eventApi.getMyEvents,
    enabled: Boolean(user?.userId && eventPassSelected),
    staleTime: 60 * 1000,
  });

  const leaderEvents = useMemo(() => {
    const items = Array.isArray(eventsQuery.data) ? eventsQuery.data : [];
    return items.filter((event) => (
      event.role === 'LEADER'
      && !['DONE', 'CANCELLED', 'CANCELED'].includes(String(event.status || '').toUpperCase())
    ));
  }, [eventsQuery.data]);

  const buildCheckoutPayload = () => ({
    planCode: selectedPlan.code,
    eventId: eventPassSelected ? Number(selectedEventId) || undefined : undefined,
    discountCode: discountCode.trim() || undefined,
  });

  const openPlanDetail = (plan) => {
    setSelectedPlan(plan);
    setCheckoutStep('details');
    setCheckoutResult(null);
    setCheckoutPreview(null);
    setDiscountCode('');
    setSelectedEventId('');
    setCopiedOrder(false);
    checkoutMutation.reset();
    previewMutation.reset();
  };

  const closeCheckout = () => {
    setSelectedPlan(null);
    setCheckoutStep('details');
    setCheckoutResult(null);
    setCheckoutPreview(null);
    setDiscountCode('');
    setSelectedEventId('');
    setCopiedOrder(false);
    checkoutMutation.reset();
    previewMutation.reset();
  };

  const handleSubscribe = () => {
    if (!selectedPlan) return;
    if (!user?.userId) {
      navigate('/login');
      return;
    }
    checkoutMutation.mutate(buildCheckoutPayload());
  };

  const handleApplyDiscount = () => {
    if (!selectedPlan || !discountCode.trim()) return;
    if (!user?.userId) {
      navigate('/login');
      return;
    }
    previewMutation.mutate(buildCheckoutPayload());
  };

  const handleDiscountChange = (value) => {
    setDiscountCode(value.toUpperCase());
    setCheckoutPreview(null);
    previewMutation.reset();
    checkoutMutation.reset();
  };

  const handleEventChange = (value) => {
    setSelectedEventId(value);
    setCheckoutPreview(null);
    previewMutation.reset();
    checkoutMutation.reset();
  };

  const copyOrderCode = async () => {
    const orderCode = getOrderCode(checkoutResult);
    if (!orderCode || !navigator.clipboard) return;
    await navigator.clipboard.writeText(orderCode);
    setCopiedOrder(true);
  };

  return (
    <div className="min-h-screen bg-[#F8FCFF] text-slate-950">
      <header className="border-b border-sky-100 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-4 sm:px-5 lg:px-8">
          <Link to="/" className="inline-flex min-w-0 items-center gap-3 text-sm font-black text-slate-700 transition hover:text-sky-600">
            <ArrowLeft className="h-4 w-4" />
            <span className="truncate">EventFlow</span>
          </Link>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            {user ? (
              <Button as={Link} to="/events" variant="secondary">
                Vào workspace
              </Button>
            ) : (
              <Button as={Link} to="/login">
                Đăng nhập
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-5 sm:py-12 lg:px-8">
        <section className="grid gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-end">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-white px-4 py-2 text-sm font-black text-sky-600 shadow-sm">
              <CreditCard className="h-4 w-4" />
              Subscription & Event Pass
            </div>
            <h1 className="max-w-3xl break-words text-3xl font-black tracking-tight text-slate-950 sm:text-4xl md:text-5xl">
              Chọn gói theo cách team bạn tổ chức sự kiện.
            </h1>
            <p className="mt-5 max-w-2xl text-base font-semibold leading-7 text-slate-600">
              Vào trang giá chỉ để xem gói. Voucher và QR thanh toán chỉ xuất hiện sau khi bạn chọn gói, kiểm tra chi tiết và tạo đơn.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <PricingMetric icon={CalendarDays} value="1-∞" label="Sự kiện" />
            <PricingMetric icon={UsersRound} value="3-50+" label="User/event" />
            <PricingMetric icon={Bot} value="5-1000" label="AI credits" />
          </div>
        </section>

        {checkoutMessage && (
          <div className={`mt-8 rounded-2xl border p-4 text-sm font-bold ${
            checkoutMessage.includes('chưa thành công') || checkoutMessage.includes('hủy')
              || checkoutMessage.includes('chưa hoàn tất')
              ? 'border-rose-200 bg-rose-50 text-rose-700'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700'
          }`}>
            {checkoutMessage}
          </div>
        )}

        {plansQuery.isLoading && (
          <div className="mt-10 rounded-2xl border border-sky-100 bg-white p-4 text-sm font-bold text-sky-700 shadow-sm">
            Đang đồng bộ bảng giá từ server. Bạn vẫn có thể xem bảng giá chuẩn bên dưới.
          </div>
        )}

        {plansQuery.error && (
          <div className="mt-10">
            <ErrorState
              error="Đang dùng bảng giá dự phòng vì backend chưa phản hồi."
              title="Chưa đồng bộ được bảng giá từ server"
            />
          </div>
        )}

        <section className="mt-12">
          <SectionTitle
            eyebrow="Gói subscription"
            title="Cho CLB, agency và team vận hành thường xuyên"
          />
          <div className="mt-6 grid gap-5 lg:grid-cols-4">
            {subscriptions.map((plan) => (
              <PlanCard
                key={plan.code}
                plan={plan}
                highlighted={plan.code === 'PRO_AGENCY'}
                onAction={() => openPlanDetail(plan)}
              />
            ))}
          </div>
        </section>

        <section className="mt-14">
          <SectionTitle
            eyebrow="Event Pass"
            title="Cho một sự kiện lớn cần mở quota riêng"
          />
          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            {eventPasses.map((plan) => (
              <PlanCard
                key={plan.code}
                plan={plan}
                eventPass
                onAction={() => openPlanDetail(plan)}
              />
            ))}
          </div>
        </section>
      </main>

      {selectedPlan && (
        <CheckoutDialog
          plan={selectedPlan}
          user={user}
          checkoutStep={checkoutStep}
          checkoutResult={checkoutResult}
          checkoutPreview={checkoutPreview}
          discountCode={discountCode}
          onDiscountChange={handleDiscountChange}
          selectedEventId={selectedEventId}
          onEventChange={handleEventChange}
          leaderEvents={leaderEvents}
          eventsLoading={eventsQuery.isLoading}
          eventsError={eventsQuery.error}
          checkoutError={checkoutMutation.error}
          previewError={previewMutation.error}
          loading={checkoutMutation.isPending}
          previewLoading={previewMutation.isPending}
          copiedOrder={copiedOrder}
          onClose={closeCheckout}
          onCheckout={handleSubscribe}
          onApplyDiscount={handleApplyDiscount}
          onCopyOrder={copyOrderCode}
          onGoEvents={() => navigate(user ? '/events' : '/login')}
        />
      )}
    </div>
  );
};

const CheckoutDialog = ({
  plan,
  user,
  checkoutStep,
  checkoutResult,
  checkoutPreview,
  discountCode,
  onDiscountChange,
  selectedEventId,
  onEventChange,
  leaderEvents,
  eventsLoading,
  eventsError,
  checkoutError,
  previewError,
  loading,
  previewLoading,
  copiedOrder,
  onClose,
  onCheckout,
  onApplyDiscount,
  onCopyOrder,
  onGoEvents,
}) => {
  const enterprise = plan.code === 'ENTERPRISE';
  const eventPass = plan.planType === 'EVENT_PASS';
  const paidPlan = !enterprise && Number(plan.priceVnd || 0) > 0;
  const activeQuote = checkoutResult || checkoutPreview;
  const finalAmount = activeQuote?.finalAmountVnd ?? activeQuote?.amountVnd ?? plan.priceVnd ?? 0;
  const discountAmount = activeQuote?.discountAmountVnd ?? 0;
  const orderCode = getOrderCode(checkoutResult);
  const eventPassBlocked = eventPass && !selectedEventId;
  const canApplyDiscount = paidPlan && discountCode.trim() && !eventPassBlocked && !previewLoading && !loading;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/55 px-4 py-6 backdrop-blur-sm">
      <div className="mx-auto flex min-h-full w-full max-w-5xl items-center">
        <section className="relative grid w-full overflow-hidden rounded-3xl border border-sky-100 bg-white shadow-2xl shadow-slate-950/20 lg:grid-cols-[1fr_0.88fr]">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-sky-200 hover:text-sky-700"
            aria-label="Đóng"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="p-5 sm:p-7 lg:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-sky-700">
                {eventPass ? <Ticket className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
                {eventPass ? 'Event Pass' : 'Subscription'}
              </span>
              {plan.code === 'PRO_AGENCY' && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  Khuyên dùng
                </span>
              )}
            </div>

            <h2 className="mt-5 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
              {plan.displayName}
            </h2>
            <p className="mt-3 text-sm font-semibold leading-6 text-slate-600 sm:text-base">
              {plan.targetSegment}
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <DetailMetric icon={CalendarDays} label="Sự kiện" value={formatEvents(plan, eventPass)} />
              <DetailMetric icon={UsersRound} label="Thành viên" value={formatUsers(plan)} />
              <DetailMetric icon={Layers3} label="Lưu trữ" value={formatStorage(plan)} />
              <DetailMetric icon={Bot} label="AI credits" value={formatAi(plan)} />
            </div>

            <div className="mt-7">
              <h3 className="text-sm font-black uppercase tracking-[0.14em] text-slate-500">Tính năng chính</h3>
              <div className="mt-3 grid gap-2">
                {(plan.features || []).map((feature) => (
                  <div key={feature} className="flex items-start gap-2 text-sm font-semibold leading-6 text-slate-700">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-7 grid gap-3 rounded-2xl border border-cyan-100 bg-cyan-50/60 p-4">
              {CHECKOUT_GUARDS.map((guard) => (
                <div key={guard} className="flex items-start gap-2 text-sm font-bold leading-6 text-slate-700">
                  <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
                  <span>{guard}</span>
                </div>
              ))}
            </div>
          </div>

          <aside className="border-t border-sky-100 bg-slate-50/80 p-5 sm:p-7 lg:border-l lg:border-t-0 lg:p-8">
            <div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-xl shadow-sky-100/60">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                    {checkoutStep === 'payment' ? 'Thanh toán đơn hàng' : 'Tóm tắt gói'}
                  </p>
                  <p className="mt-2 text-xl font-black text-slate-950">{formatPrice(plan)}</p>
                  <p className="mt-1 text-sm font-bold text-slate-500">{formatInterval(plan)}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
                  <ReceiptText className="h-6 w-6" />
                </div>
              </div>

              <div className="mt-5 space-y-3 border-t border-slate-100 pt-5">
                <PriceRow label="Giá gốc" value={formatMoney(plan.priceVnd || 0)} />
                {discountAmount > 0 && (
                  <PriceRow label="Voucher" value={`-${formatMoney(discountAmount)}`} success />
                )}
                <PriceRow label="Cần thanh toán" value={formatMoney(finalAmount)} strong />
              </div>

              {checkoutStep === 'details' && eventPass && (
                <div className="mt-5">
                  <label htmlFor="event-pass-target" className="text-sm font-black text-slate-800">
                    Sự kiện áp dụng Event Pass
                  </label>
                  <div className="mt-3">
                    <select
                      id="event-pass-target"
                      value={selectedEventId}
                      onChange={(event) => onEventChange(event.target.value)}
                      disabled={!user || eventsLoading || Boolean(eventsError)}
                      className="h-12 w-full rounded-2xl border border-sky-100 bg-sky-50/70 px-4 text-sm font-black text-slate-800 outline-none transition focus:border-cyan-300 focus:bg-white focus:ring-4 focus:ring-cyan-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                    >
                      <option value="">
                        {user ? 'Chọn event bạn đang lead' : 'Đăng nhập để chọn event'}
                      </option>
                      {leaderEvents.map((event) => (
                        <option key={event.id} value={event.id}>
                          {event.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {eventsLoading && (
                    <p className="mt-2 text-xs font-bold text-sky-700">Đang tải danh sách event...</p>
                  )}
                  {eventsError && (
                    <p className="mt-2 text-xs font-bold text-rose-700">Chưa tải được danh sách event. Vui lòng thử lại.</p>
                  )}
                  {user && !eventsLoading && !eventsError && leaderEvents.length === 0 && (
                    <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold leading-5 text-amber-800">
                      Bạn cần là leader của một event đang hoạt động/draft để mua Event Pass.
                    </div>
                  )}
                </div>
              )}

              {checkoutStep === 'details' && paidPlan && (
                <div className="mt-5">
                  <label htmlFor="checkout-discount-code" className="text-sm font-black text-slate-800">
                    Mã voucher
                  </label>
                  <div className="mt-3 flex gap-2">
                    <div className="relative min-w-0 flex-1">
                      <Percent className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-sky-500" />
                      <input
                        id="checkout-discount-code"
                        value={discountCode}
                        onChange={(event) => onDiscountChange(event.target.value)}
                        placeholder="Nhập mã nếu có"
                        className="h-12 w-full rounded-2xl border border-sky-100 bg-sky-50/70 px-11 text-sm font-black uppercase tracking-wide text-slate-800 outline-none transition placeholder:normal-case placeholder:font-semibold placeholder:tracking-normal placeholder:text-slate-400 focus:border-cyan-300 focus:bg-white focus:ring-4 focus:ring-cyan-100"
                      />
                    </div>
                    {discountCode && (
                      <button
                        type="button"
                        onClick={() => onDiscountChange('')}
                        className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:border-sky-200 hover:text-sky-700"
                        aria-label="Xóa mã"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
                    <p className="text-xs font-bold leading-5 text-slate-500">
                      {discountAmount > 0
                        ? `Đã áp dụng ${activeQuote?.discountCode || discountCode.trim()}: giảm ${formatMoney(discountAmount)}.`
                        : 'Bấm áp dụng để kiểm tra mã trước khi tạo đơn payOS.'}
                    </p>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={onApplyDiscount}
                      disabled={!canApplyDiscount}
                      className="w-full sm:w-auto"
                    >
                      {previewLoading ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          Đang kiểm tra
                        </>
                      ) : (
                        'Áp dụng'
                      )}
                    </Button>
                  </div>
                  {previewError && (
                    <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold leading-5 text-rose-700">
                      {previewError?.userMessage || previewError?.message || 'Mã giảm giá không hợp lệ.'}
                    </div>
                  )}
                  <div className="mt-3 flex items-start gap-2 rounded-2xl bg-amber-50 p-3 text-xs font-bold leading-5 text-amber-800">
                    <Tag className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>Áp dụng mã chỉ preview giá, chưa tạo transaction. Khi thanh toán, backend kiểm tra lại lần nữa trước khi tạo link payOS.</span>
                  </div>
                </div>
              )}

              {checkoutError && (
                <div className="mt-5">
                  <ErrorState error={checkoutError} title="Chưa tạo được đơn thanh toán" />
                </div>
              )}

              {checkoutStep === 'payment' && (
                <PaymentPanel
                  result={checkoutResult}
                  orderCode={orderCode}
                  copiedOrder={copiedOrder}
                  onCopyOrder={onCopyOrder}
                />
              )}

              <div className="mt-6 grid gap-3">
                {enterprise ? (
                  <Button as="a" href="mailto:sales@eventflow.local?subject=EventFlow Enterprise" variant="secondary" className="w-full">
                    Liên hệ sales
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : checkoutStep === 'payment' && checkoutResult?.checkoutUrl ? (
                  <Button as="a" href={checkoutResult.checkoutUrl} target="_blank" rel="noreferrer" className="w-full">
                    Mở QR thanh toán payOS
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : checkoutStep === 'payment' ? (
                  <Button type="button" onClick={onClose} className="w-full">
                    Hoàn tất
                  </Button>
                ) : eventPass && !user ? (
                  <Button type="button" onClick={onGoEvents} className="w-full">
                    Đăng nhập để chọn event
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button type="button" onClick={onCheckout} disabled={loading || eventPassBlocked} className="w-full">
                    {user
                      ? (loading ? 'Đang tạo đơn...' : Number(plan.priceVnd || 0) > 0 ? 'Tạo đơn thanh toán' : 'Kích hoạt gói Free')
                      : Number(plan.priceVnd || 0) > 0 ? 'Đăng nhập để thanh toán' : 'Đăng nhập để bắt đầu'}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
                {checkoutStep === 'payment' && checkoutResult?.checkoutUrl && (
                  <p className="text-center text-xs font-bold leading-5 text-slate-500">
                    Sau khi thanh toán, quay lại EventFlow. Webhook payOS sẽ kích hoạt gói khi tiền khớp với mã đơn.
                  </p>
                )}
              </div>
            </div>
          </aside>
        </section>
      </div>
    </div>
  );
};

const PaymentPanel = ({ result, orderCode, copiedOrder, onCopyOrder }) => {
  if (!result) return null;

  if (!result.checkoutUrl) {
    return (
      <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold leading-6 text-emerald-800">
        {result.message || 'Đơn đã được xử lý thành công.'}
      </div>
    );
  }

  return (
    <div className="mt-5 space-y-4">
      <div className="rounded-2xl border border-sky-100 bg-sky-50/80 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-sky-700 shadow-sm">
            <QrCode className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-black text-slate-950">QR thanh toán bảo mật qua payOS</p>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">
              Bấm mở payOS để quét QR ngân hàng chính thức. EventFlow không tự nhận tiền thủ công ngoài đơn này.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 text-sm">
        <PaymentFact icon={WalletCards} label="Cổng thanh toán" value="payOS" />
        <PaymentFact icon={Clock3} label="Trạng thái" value="Đang chờ thanh toán" />
        {orderCode && (
          <div className="rounded-2xl border border-slate-100 bg-white p-3">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Mã đơn hàng</p>
            <div className="mt-2 flex items-center justify-between gap-2">
              <p className="min-w-0 truncate font-black text-slate-800">{orderCode}</p>
              <button
                type="button"
                onClick={onCopyOrder}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-sky-200 hover:text-sky-700"
                aria-label="Sao chép mã đơn hàng"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
            {copiedOrder && <p className="mt-2 text-xs font-bold text-emerald-600">Đã sao chép mã đơn.</p>}
          </div>
        )}
      </div>
    </div>
  );
};

const PaymentFact = ({ icon: Icon, label, value }) => (
  <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3">
    <Icon className="h-4 w-4 shrink-0 text-sky-600" />
    <div className="min-w-0">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="mt-1 truncate font-black text-slate-800">{value}</p>
    </div>
  </div>
);

const DetailMetric = ({ icon: Icon, label, value }) => (
  <div className="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
      <Icon className="h-5 w-5" />
    </div>
    <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">{label}</p>
    <p className="mt-1 text-sm font-black leading-5 text-slate-800">{value}</p>
  </div>
);

const SectionTitle = ({ eyebrow, title }) => (
  <div>
    <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-600">{eyebrow}</p>
    <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">{title}</h2>
  </div>
);

const PricingMetric = ({ icon: Icon, value, label }) => (
  <div className="rounded-2xl border border-sky-100 bg-white p-4 shadow-lg shadow-sky-100/60">
    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
      <Icon className="h-5 w-5" />
    </div>
    <p className="text-2xl font-black text-slate-950">{value}</p>
    <p className="mt-1 text-sm font-bold text-slate-500">{label}</p>
  </div>
);

const PlanCard = ({ plan, highlighted = false, eventPass = false, onAction }) => {
  const enterprise = plan.code === 'ENTERPRISE';
  const free = plan.code === 'FREE';
  const actionLabel = enterprise
    ? 'Xem tư vấn'
    : free
      ? 'Xem gói Free'
      : eventPass
        ? 'Xem Event Pass'
        : 'Xem chi tiết';

  return (
    <article className={`relative flex min-h-[420px] flex-col rounded-2xl border bg-white p-6 shadow-xl transition hover:-translate-y-1 ${
      highlighted ? 'border-sky-300 shadow-cyan-100' : 'border-sky-100 shadow-sky-100/70'
    }`}>
      {highlighted && (
        <div className="mb-4 inline-flex w-fit items-center gap-1 rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-sky-700 sm:absolute sm:right-5 sm:top-5 sm:mb-0">
          <BadgeCheck className="h-3.5 w-3.5" />
          Khuyên dùng
        </div>
      )}

      <div className={highlighted ? 'pr-0 sm:pr-24' : ''}>
        <h3 className="text-xl font-black text-slate-950">{plan.displayName}</h3>
        <p className="mt-2 min-h-12 text-sm font-semibold leading-6 text-slate-500">
          {plan.targetSegment}
        </p>
      </div>

      <div className="mt-5">
        <p className="break-words text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
          {formatPrice(plan)}
        </p>
        <p className="mt-1 text-sm font-bold text-slate-500">{formatInterval(plan)}</p>
      </div>

      <div className="mt-6 grid gap-2 text-sm font-bold text-slate-700">
        <LimitRow icon={CalendarDays} label={formatEvents(plan, eventPass)} />
        <LimitRow icon={UsersRound} label={formatUsers(plan)} />
        <LimitRow icon={Layers3} label={formatStorage(plan)} />
        <LimitRow icon={Bot} label={formatAi(plan)} />
        {enterprise && <LimitRow icon={ShieldCheck} label="SLA, SSO-ready, hỗ trợ 1:1" />}
      </div>

      <div className="mt-6 space-y-2">
        {(plan.features || []).slice(0, 5).map((feature) => (
          <div key={feature} className="flex items-start gap-2 text-sm font-semibold leading-6 text-slate-600">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
            <span>{feature}</span>
          </div>
        ))}
      </div>

      <div className="mt-auto pt-6">
        <Button type="button" onClick={onAction} variant={enterprise ? 'secondary' : 'primary'} className="w-full">
          {actionLabel}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </article>
  );
};

const LimitRow = ({ icon: Icon, label }) => (
  <div className="flex items-center gap-2 rounded-xl bg-sky-50/70 px-3 py-2">
    <Icon className="h-4 w-4 shrink-0 text-sky-600" />
    <span>{label}</span>
  </div>
);

const PriceRow = ({ label, value, strong = false, success = false }) => (
  <div className="flex items-center justify-between gap-4 text-sm font-bold">
    <span className="text-slate-500">{label}</span>
    <span className={`${strong ? 'text-lg font-black text-slate-950' : ''} ${success ? 'text-emerald-600' : ''}`}>
      {value}
    </span>
  </div>
);

const getOrderCode = (checkoutResult) => {
  if (!checkoutResult?.transactionId) return null;
  return `EF${checkoutResult.transactionId}`;
};

const formatMoney = (value) => `${Number(value || 0).toLocaleString('vi-VN')}đ`;

const formatPrice = (plan) => {
  if (plan.code === 'ENTERPRISE') {
    return 'Liên hệ';
  }
  if (!plan.priceVnd) {
    return '0đ';
  }
  return formatMoney(plan.priceVnd);
};

const formatInterval = (plan) => {
  if (plan.billingInterval === 'MONTHLY') return '/ tháng';
  if (plan.billingInterval === 'YEARLY') return '/ năm';
  if (plan.billingInterval === 'ONE_TIME') return '/ sự kiện';
  if (plan.billingInterval === 'CUSTOM') return 'theo hợp đồng';
  return '';
};

const formatEvents = (plan, eventPass) => {
  if (eventPass) return `1 sự kiện · ${plan.eventDurationDays || 90} ngày`;
  if (plan.unlimitedEvents) return 'Không giới hạn sự kiện';
  return `${plan.maxActiveEvents || 1} active event`;
};

const formatUsers = (plan) => {
  if (plan.unlimitedUsers) return 'User custom';
  return `Tối đa ${plan.maxUsersPerEvent || 0} user/event`;
};

const formatStorage = (plan) => {
  if (plan.unlimitedStorage) return 'Storage custom';
  const gb = plan.storageLimitBytes / 1024 / 1024 / 1024;
  if (gb >= 1) return `${formatNumber(gb)} GB storage`;
  return `${Math.round(plan.storageLimitBytes / 1024 / 1024)} MB storage`;
};

const formatAi = (plan) => {
  if (plan.unlimitedAi) return 'AI fair-use custom';
  if (plan.aiCreditsPerEvent) return `${plan.aiCreditsPerEvent} AI credits/event`;
  return `${plan.aiCreditsPerMonth || 0} AI credits/tháng`;
};

const formatNumber = (value) => Number.isInteger(value) ? value : value.toFixed(1);

export default PricingPage;
