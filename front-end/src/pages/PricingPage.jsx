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
  CreditCard,
  Layers3,
  Percent,
  ShieldCheck,
  UsersRound,
} from 'lucide-react';
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

const PricingPage = ({ user }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [manualCheckoutMessage, setManualCheckoutMessage] = useState(null);
  const [discountCode, setDiscountCode] = useState('');

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
      if (response?.checkoutUrl) {
        window.location.assign(response.checkoutUrl);
        return;
      }
      if (response?.discountAmountVnd > 0) {
        setDiscountCode('');
      }
      setManualCheckoutMessage(response?.message || 'Đã ghi nhận yêu cầu nâng cấp.');
    },
  });

  const plans = useMemo(() => {
    const items = plansQuery.data?.length ? plansQuery.data : FALLBACK_PLANS;
    return [...items].sort((a, b) => PLAN_ORDER.indexOf(a.code) - PLAN_ORDER.indexOf(b.code));
  }, [plansQuery.data]);

  const subscriptions = plans.filter((plan) => plan.planType === 'SUBSCRIPTION');
  const eventPasses = plans.filter((plan) => plan.planType === 'EVENT_PASS');

  const handleSubscribe = (plan) => {
    if (!user?.userId) {
      navigate('/login');
      return;
    }
    checkoutMutation.mutate({
      planCode: plan.code,
      discountCode: discountCode.trim() || undefined,
    });
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
              Gói tháng/năm phù hợp đội làm sự kiện thường xuyên. Event Pass dành cho một sự kiện lớn cần mở thêm sức chứa, storage và AI.
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

        {checkoutMutation.error && (
          <div className="mt-8">
            <ErrorState error={checkoutMutation.error} title="Chưa tạo được yêu cầu nâng cấp" onDismiss={() => checkoutMutation.reset()} />
          </div>
        )}

        {user && (
          <section className="mt-8 rounded-2xl border border-sky-100 bg-white p-4 shadow-lg shadow-sky-100/60">
            <label htmlFor="discount-code" className="text-sm font-black text-slate-800">
              Mã giảm giá
            </label>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative min-w-0 flex-1">
                <Percent className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-sky-500" />
                <input
                  id="discount-code"
                  value={discountCode}
                  onChange={(event) => setDiscountCode(event.target.value.toUpperCase())}
                  placeholder="Nhập mã admin cấp cho gói muốn mua"
                  className="h-12 w-full rounded-2xl border border-sky-100 bg-sky-50/70 px-11 text-sm font-black uppercase tracking-wide text-slate-800 outline-none transition placeholder:normal-case placeholder:font-semibold placeholder:tracking-normal placeholder:text-slate-400 focus:border-cyan-300 focus:bg-white focus:ring-4 focus:ring-cyan-100"
                />
              </div>
              {discountCode && (
              <Button type="button" variant="secondary" onClick={() => setDiscountCode('')} className="w-full sm:w-auto">
                Xóa mã
              </Button>
              )}
            </div>
          </section>
        )}

        {
          <>
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
                    loading={checkoutMutation.isPending}
                    onAction={() => handleSubscribe(plan)}
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
                    loading={checkoutMutation.isPending}
                    onAction={() => (user ? navigate('/events') : navigate('/login'))}
                  />
                ))}
              </div>
            </section>
          </>
        }
      </main>
    </div>
  );
};

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

const PlanCard = ({ plan, highlighted = false, eventPass = false, loading, onAction }) => {
  const enterprise = plan.code === 'ENTERPRISE';
  const free = plan.code === 'FREE';
  const actionLabel = enterprise
    ? 'Liên hệ sales'
    : free
      ? 'Bắt đầu miễn phí'
      : eventPass
        ? 'Chọn sự kiện'
        : 'Yêu cầu nâng cấp';

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
        {enterprise ? (
          <Button as="a" href="mailto:sales@eventflow.local?subject=EventFlow Enterprise" variant="secondary" className="w-full">
            {actionLabel}
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button type="button" onClick={onAction} disabled={loading} className="w-full">
            {actionLabel}
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
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

const formatPrice = (plan) => {
  if (plan.code === 'ENTERPRISE') {
    return 'Liên hệ';
  }
  if (!plan.priceVnd) {
    return '0đ';
  }
  return `${Number(plan.priceVnd).toLocaleString('vi-VN')}đ`;
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
