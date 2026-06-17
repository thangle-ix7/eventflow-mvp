import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Bot,
  CalendarCheck2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  Clock3,
  Layers3,
  LayoutDashboard,
  MessageSquareText,
  MousePointerClick,
  PartyPopper,
  Sparkles,
  Target,
  UsersRound,
  WandSparkles,
  Zap,
} from 'lucide-react';
import LandingFooter from '../components/LandingFooter';

const LandingPage = () => {
  return (
    <div className="min-h-screen overflow-hidden bg-[#F8FCFF] text-slate-950">
      <style>
        {`
          @keyframes ef-float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-18px); }
          }

          @keyframes ef-float-soft {
            0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
            50% { transform: translate3d(0, -12px, 0) scale(1.02); }
          }

          @keyframes ef-marquee {
            from { transform: translateX(0); }
            to { transform: translateX(-50%); }
          }

          @keyframes ef-progress {
            from { width: 12%; }
            to { width: 78%; }
          }

          @keyframes ef-orbit {
            from { transform: rotate(0deg) translateX(12px) rotate(0deg); }
            to { transform: rotate(360deg) translateX(12px) rotate(-360deg); }
          }

          html {
            scroll-behavior: smooth;
          }

          .ef-grid {
            background-image:
              linear-gradient(to right, rgba(14, 165, 233, 0.08) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(14, 165, 233, 0.08) 1px, transparent 1px);
            background-size: 48px 48px;
          }

          .ef-marquee-track {
            animation: ef-marquee 28s linear infinite;
          }

          .ef-progress-bar {
            animation: ef-progress 1.8s ease-out forwards;
          }
        `}
      </style>

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 ef-grid opacity-70" />
        <div className="absolute -left-40 -top-40 h-[460px] w-[460px] rounded-full bg-sky-300/35 blur-3xl" />
        <div className="absolute right-[-180px] top-24 h-[520px] w-[520px] rounded-full bg-emerald-300/30 blur-3xl" />
        <div className="absolute bottom-[-220px] left-1/2 h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-cyan-300/25 blur-3xl" />
      </div>

      <header className="sticky top-0 z-50 border-b border-sky-100/80 bg-white/75 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
          <Link to="/" className="group">
            <BrandLogo />
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-bold text-slate-600 lg:flex">
            <a href="#features" className="transition hover:text-sky-500">
              Tính năng
            </a>
            <a href="#workflow" className="transition hover:text-sky-500">
              Quy trình
            </a>
            <a href="#audience" className="transition hover:text-sky-500">
              Người dùng
            </a>
            <a href="#value" className="transition hover:text-sky-500">
              Giá trị
            </a>
            <Link to="/pricing" className="transition hover:text-sky-500">
              Bảng giá
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="hidden rounded-full px-5 py-2.5 text-sm font-extrabold text-slate-700 transition hover:bg-sky-50 hover:text-sky-600 sm:inline-flex"
            >
              Đăng nhập
            </Link>

            <Link
              to="/login"
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400 px-5 py-2.5 text-sm font-black text-white shadow-xl shadow-cyan-300/40 transition hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-cyan-300/60"
            >
              Bắt đầu
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        <section className="mx-auto grid min-h-[calc(100vh-80px)] max-w-7xl items-center gap-14 px-5 py-16 lg:grid-cols-[1.02fr_0.98fr] lg:px-8 lg:py-20">
          <div>
            <div
              className="mb-7 inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-white/80 px-4 py-2 text-sm font-black text-sky-600 shadow-lg shadow-sky-100/80 backdrop-blur"
              style={{ animation: 'ef-float-soft 5s ease-in-out infinite' }}
            >
              <Sparkles className="h-4 w-4 text-emerald-500" />
              AI tự động đề xuất kế hoạch sự kiện từ ý tưởng ban đầu
            </div>

            <h1 className="max-w-5xl text-5xl font-black leading-[1.04] tracking-tight text-slate-950 md:text-6xl lg:text-7xl">
              Quản lý sự kiện{' '}
              <span className="bg-gradient-to-r from-sky-500 via-cyan-500 to-emerald-400 bg-clip-text text-transparent">
                mượt hơn,
              </span>{' '}
              rõ hơn và ít chaos hơn.
            </h1>

            <p className="mt-7 max-w-2xl text-lg font-medium leading-8 text-slate-600 md:text-xl">
              EventFlow giúp đội nhóm tạo kế hoạch, chia phòng ban, giao việc,
              theo dõi deadline và phối hợp vận hành sự kiện trong một nền tảng duy nhất.
            </p>

            <div className="mt-9 flex flex-col gap-4 sm:flex-row">
              <Link
                to="/login"
                className="group inline-flex items-center justify-center gap-3 rounded-2xl bg-slate-950 px-7 py-4 text-base font-black text-white shadow-2xl shadow-slate-300/80 transition hover:-translate-y-1 hover:bg-slate-800"
              >
                Tạo sự kiện đầu tiên
                <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
              </Link>

              <a
                href="#features"
                className="group inline-flex items-center justify-center gap-3 rounded-2xl border border-sky-100 bg-white px-7 py-4 text-base font-black text-slate-800 shadow-xl shadow-sky-100/80 transition hover:-translate-y-1 hover:border-cyan-200 hover:text-sky-600"
              >
                Khám phá tính năng
                <ChevronRight className="h-5 w-5 transition group-hover:translate-x-1" />
              </a>
            </div>

            <div className="mt-10 grid max-w-3xl gap-4 sm:grid-cols-3">
              <MiniStat value="AI" label="Gợi ý kế hoạch" icon={<Bot className="h-5 w-5" />} />
              <MiniStat value="4 bước" label="Quy trình rõ ràng" icon={<Layers3 className="h-5 w-5" />} />
              <MiniStat value="Realtime" label="Theo dõi tiến độ" icon={<Zap className="h-5 w-5" />} />
            </div>
          </div>

          <div className="relative">
            <div className="absolute -left-8 top-12 hidden rounded-3xl border border-sky-100 bg-white/90 p-4 shadow-2xl shadow-sky-200/60 backdrop-blur-xl md:block">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-emerald-400 text-white">
                  <WandSparkles className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-black text-slate-950">AI đã tạo timeline</p>
                  <p className="text-xs font-bold text-slate-400">12 đầu việc mới</p>
                </div>
              </div>
            </div>

            <div className="absolute -right-4 bottom-20 hidden rounded-3xl border border-emerald-100 bg-white/90 p-4 shadow-2xl shadow-emerald-200/60 backdrop-blur-xl md:block">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400 text-white">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-black text-slate-950">Deadline ổn áp</p>
                  <p className="text-xs font-bold text-slate-400">78% hoàn thành</p>
                </div>
              </div>
            </div>

            <div
              className="relative mx-auto max-w-[620px]"
              style={{ animation: 'ef-float 7s ease-in-out infinite' }}
            >
              <div className="absolute inset-0 rounded-[3rem] bg-gradient-to-br from-sky-300/80 via-cyan-200/60 to-emerald-300/70 blur-3xl" />

              <div className="relative rounded-[3rem] border border-white bg-white/70 p-4 shadow-[0_30px_90px_rgba(14,165,233,0.22)] backdrop-blur-2xl">
                <div className="overflow-hidden rounded-[2.4rem] border border-sky-100 bg-white">
                  <div className="flex items-center justify-between border-b border-sky-100 bg-gradient-to-r from-sky-50 to-emerald-50 px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white shadow-md shadow-sky-100">
                        <img
                          src="/event-flow-logo-mark.png"
                          alt="EventFlow"
                          className="h-7 w-7 object-contain"
                        />
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-950">Event Dashboard</p>
                        <p className="text-xs font-bold text-slate-400">AI planning workspace</p>
                      </div>
                    </div>

                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-600">
                      Đang chạy
                    </span>
                  </div>

                  <div className="grid gap-0 lg:grid-cols-[88px_1fr]">
                    <aside className="hidden border-r border-sky-100 bg-sky-50/60 px-4 py-5 lg:block">
                      <div className="space-y-4">
                        <SidebarIcon active icon={<LayoutDashboard className="h-5 w-5" />} />
                        <SidebarIcon icon={<CalendarDays className="h-5 w-5" />} />
                        <SidebarIcon icon={<UsersRound className="h-5 w-5" />} />
                        <SidebarIcon icon={<ClipboardList className="h-5 w-5" />} />
                        <SidebarIcon icon={<MessageSquareText className="h-5 w-5" />} />
                      </div>
                    </aside>

                    <div className="p-5">
                      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-500">
                            Upcoming Event
                          </p>
                          <h2 className="mt-2 text-2xl font-black text-slate-950">
                            FPTU Music Festival
                          </h2>
                        </div>

                        <div className="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-right">
                          <p className="text-xs font-bold text-slate-400">Tiến độ</p>
                          <p className="text-xl font-black text-sky-600">78%</p>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-3">
                        <DashboardStat label="Task" value="48" icon={<ClipboardCheck className="h-4 w-4" />} />
                        <DashboardStat label="Team" value="6" icon={<UsersRound className="h-4 w-4" />} />
                        <DashboardStat label="Ngày còn lại" value="12" icon={<Clock3 className="h-4 w-4" />} />
                      </div>

                      <div className="mt-5 rounded-3xl border border-sky-100 bg-gradient-to-br from-sky-50 to-white p-5">
                        <div className="mb-4 flex items-center justify-between">
                          <div>
                            <h3 className="font-black text-slate-950">Kế hoạch sự kiện</h3>
                            <p className="mt-1 text-sm font-semibold text-slate-500">
                              AI đề xuất theo từng giai đoạn
                            </p>
                          </div>

                          <Sparkles className="h-5 w-5 text-emerald-500" />
                        </div>

                        <div className="h-3 overflow-hidden rounded-full bg-sky-100">
                          <div className="ef-progress-bar h-full rounded-full bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400" />
                        </div>
                      </div>

                      <div className="mt-5 space-y-3">
                        <TaskPreview
                          title="Lên ý tưởng & mục tiêu sự kiện"
                          status="Done"
                          tone="blue"
                          done
                        />
                        <TaskPreview
                          title="Chia team truyền thông, hậu cần, check-in"
                          status="Doing"
                          tone="green"
                        />
                        <TaskPreview
                          title="Theo dõi ngân sách và deadline"
                          status="Next"
                          tone="cyan"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div
                className="absolute right-14 top-10 h-4 w-4 rounded-full bg-emerald-400 shadow-lg shadow-emerald-300"
                style={{ animation: 'ef-orbit 4s linear infinite' }}
              />
            </div>
          </div>
        </section>

        <section className="border-y border-sky-100 bg-white/70 py-5 backdrop-blur">
          <div className="overflow-hidden">
            <div className="ef-marquee-track flex w-[200%] items-center gap-4">
              {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, index) => (
                <div
                  key={`${item}-${index}`}
                  className="flex shrink-0 items-center gap-2 rounded-full border border-sky-100 bg-white px-5 py-2.5 text-sm font-black text-slate-600 shadow-sm"
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-7xl px-5 py-24 lg:px-8">
          <SectionHeading
            eyebrow="Tính năng chính"
            title="Tất cả thứ đội tổ chức sự kiện cần, nằm gọn trong một flow."
            description="Từ lúc mới có ý tưởng đến khi tổng kết sau sự kiện, EventFlow giúp mọi người biết mình cần làm gì, ai phụ trách và deadline nào đang tới."
          />

          <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={<WandSparkles className="h-6 w-6" />}
              title="AI đề xuất kế hoạch"
              description="Nhập ý tưởng ban đầu, hệ thống hỗ trợ gợi ý khung kế hoạch, các giai đoạn triển khai và đầu việc cần chuẩn bị."
            />
            <FeatureCard
              icon={<CalendarCheck2 className="h-6 w-6" />}
              title="Quản lý sự kiện"
              description="Tạo sự kiện, cập nhật thông tin, quản lý timeline, trạng thái và toàn bộ hoạt động trong một dashboard rõ ràng."
            />
            <FeatureCard
              icon={<UsersRound className="h-6 w-6" />}
              title="Quản lý nhân sự"
              description="Thêm thành viên, chia phòng ban, phân quyền Event Leader, Team Leader và Team Member theo từng sự kiện."
            />
            <FeatureCard
              icon={<ClipboardList className="h-6 w-6" />}
              title="Quản lý công việc"
              description="Tạo master task, chia subtask, giao việc cho team, theo dõi tiến độ, deadline và trạng thái hoàn thành."
            />
            <FeatureCard
              icon={<MessageSquareText className="h-6 w-6" />}
              title="Nhắc nhở & feedback"
              description="Giúp team không bỏ sót việc quan trọng, dễ phản hồi tiến độ và cập nhật vấn đề trong quá trình triển khai."
            />
            <FeatureCard
              icon={<Target className="h-6 w-6" />}
              title="Theo dõi hiệu quả"
              description="Nắm được tổng quan số task, tiến độ, nhân sự, deadline và tình trạng vận hành của từng sự kiện."
            />
          </div>
        </section>

        <section id="workflow" className="relative py-24">
          <div className="absolute inset-x-0 top-1/2 h-72 -translate-y-1/2 bg-gradient-to-r from-sky-100 via-cyan-50 to-emerald-100" />

          <div className="relative mx-auto max-w-7xl px-5 lg:px-8">
            <div className="overflow-hidden rounded-[2.5rem] border border-white bg-white/80 p-6 shadow-2xl shadow-sky-100/80 backdrop-blur-2xl md:p-10">
              <div className="grid gap-10 lg:grid-cols-[0.82fr_1.18fr]">
                <div>
                  <div className="mb-5 inline-flex rounded-full bg-sky-100 px-4 py-2 text-sm font-black text-sky-600">
                    Workflow thông minh
                  </div>
                  <h2 className="text-4xl font-black tracking-tight text-slate-950 md:text-5xl">
                    Từ ý tưởng đến vận hành chỉ trong 4 bước.
                  </h2>
                  <p className="mt-5 text-lg font-medium leading-8 text-slate-600">
                    Không cần quản lý bằng quá nhiều file rời rạc. EventFlow gom kế hoạch,
                    nhân sự, công việc và tiến độ vào một quy trình dễ hiểu.
                  </p>

                  <Link
                    to="/login"
                    className="group mt-8 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 to-emerald-400 px-6 py-3.5 text-sm font-black text-white shadow-xl shadow-cyan-200 transition hover:-translate-y-1"
                  >
                    Trải nghiệm workflow
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                  </Link>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <WorkflowStep
                    number="01"
                    title="Tạo sự kiện"
                    description="Nhập tên, mô tả, thời gian, mục tiêu và các thông tin cơ bản của sự kiện."
                    icon={<PartyPopper className="h-6 w-6" />}
                  />
                  <WorkflowStep
                    number="02"
                    title="AI gợi ý kế hoạch"
                    description="Hệ thống đề xuất khung triển khai để team bắt đầu nhanh hơn."
                    icon={<Bot className="h-6 w-6" />}
                  />
                  <WorkflowStep
                    number="03"
                    title="Chia team & giao việc"
                    description="Phân phòng ban, thêm nhân sự, chia task và subtask rõ ràng."
                    icon={<UsersRound className="h-6 w-6" />}
                  />
                  <WorkflowStep
                    number="04"
                    title="Theo dõi tiến độ"
                    description="Cập nhật trạng thái, deadline, feedback và tổng kết sau sự kiện."
                    icon={<ClipboardCheck className="h-6 w-6" />}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="audience" className="mx-auto max-w-7xl px-5 py-24 lg:px-8">
          <SectionHeading
            eyebrow="Phù hợp với ai?"
            title="Dành cho những đội nhóm muốn tổ chức sự kiện chuyên nghiệp hơn."
            description="EventFlow đặc biệt hợp với môi trường học đường, câu lạc bộ, startup, đội marketing và các nhóm thường xuyên vận hành sự kiện."
          />

          <div className="mt-14 grid gap-5 md:grid-cols-3">
            <AudienceCard
              title="Câu lạc bộ sinh viên"
              description="Dễ chia ban, giao việc, kiểm soát deadline và tránh tình trạng một người ôm quá nhiều việc."
              icon={<UsersRound className="h-6 w-6" />}
            />
            <AudienceCard
              title="Đội tổ chức sự kiện"
              description="Quản lý timeline, nhân sự, nhiệm vụ và tiến độ triển khai trong cùng một workspace."
              icon={<CalendarDays className="h-6 w-6" />}
            />
            <AudienceCard
              title="Team marketing nội bộ"
              description="Lên kế hoạch activation, workshop, webinar hoặc campaign offline một cách gọn gàng."
              icon={<MousePointerClick className="h-6 w-6" />}
            />
          </div>
        </section>

        <section id="value" className="mx-auto max-w-7xl px-5 py-24 lg:px-8">
          <div className="relative overflow-hidden rounded-[2.75rem] bg-slate-950 p-8 text-white shadow-2xl shadow-slate-300 md:p-12 lg:p-14">
            <div className="absolute -left-28 -top-28 h-80 w-80 rounded-full bg-sky-400/35 blur-3xl" />
            <div className="absolute -bottom-36 right-0 h-96 w-96 rounded-full bg-emerald-400/30 blur-3xl" />

            <div className="relative grid gap-10 lg:grid-cols-[1fr_0.86fr] lg:items-center">
              <div>
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-black text-cyan-100">
                  <Sparkles className="h-4 w-4 text-emerald-300" />
                  Sẵn sàng để team đỡ rối hơn?
                </div>

                <h2 className="max-w-3xl text-4xl font-black tracking-tight md:text-5xl">
                  Biến cách team bạn quản lý sự kiện từ thủ công sang thông minh.
                </h2>

                <p className="mt-5 max-w-2xl text-lg font-medium leading-8 text-slate-300">
                  Bắt đầu với một ý tưởng, để EventFlow giúp bạn tạo flow triển khai,
                  phân công rõ ràng và theo dõi tiến độ đến khi sự kiện hoàn thành.
                </p>

                <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                  <Link
                    to="/login"
                    className="group inline-flex items-center justify-center gap-3 rounded-2xl bg-white px-7 py-4 text-base font-black text-slate-950 shadow-xl transition hover:-translate-y-1 hover:bg-sky-50"
                  >
                    Đi tới đăng nhập
                    <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
                  </Link>

                  <a
                    href="#features"
                    className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/10 px-7 py-4 text-base font-black text-white backdrop-blur transition hover:-translate-y-1 hover:bg-white/15"
                  >
                    Xem lại tính năng
                  </a>
                </div>
              </div>

              <div className="relative rounded-[2rem] border border-white/10 bg-white/10 p-5 backdrop-blur">
                <div className="grid grid-cols-2 gap-4">
                  <ValueMetric value="60%" label="Giảm thời gian lên kế hoạch" />
                  <ValueMetric value="1 nơi" label="Quản lý toàn bộ sự kiện" />
                  <ValueMetric value="24/7" label="Theo dõi trạng thái" />
                  <ValueMetric value="0 chaos" label="Team rõ việc hơn" />
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
};

const MARQUEE_ITEMS = [
  'AI gợi ý kế hoạch',
  'Quản lý sự kiện',
  'Chia phòng ban',
  'Giao task & subtask',
  'Theo dõi deadline',
  'Nhắc nhở tiến độ',
  'Feedback sau sự kiện',
  'Dashboard trực quan',
];

const BrandLogo = () => (
  <div className="flex items-center gap-3">
    <div className="relative">
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-sky-400 to-emerald-400 opacity-35 blur-md transition group-hover:opacity-70" />
      <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-sky-100 bg-white shadow-lg shadow-sky-200/60">
        <img
          src="/event-flow-logo-mark.png"
          alt="EventFlow logo"
          className="h-8 w-8 object-contain"
        />
      </div>
    </div>

    <div>
      <p className="text-xl font-black leading-none tracking-tight text-slate-950">
        <span>Event</span>
        <span className="bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
          Flow
        </span>
      </p>

      <p className="mt-1 text-xs font-bold uppercase tracking-[0.22em] text-slate-400">
        AI Event Planning
      </p>
    </div>
  </div>
);

const MiniStat = ({ value, label, icon }) => (
  <div className="group rounded-3xl border border-sky-100 bg-white/80 p-5 shadow-xl shadow-sky-100/70 backdrop-blur transition hover:-translate-y-1 hover:border-cyan-200 hover:shadow-2xl hover:shadow-cyan-100">
    <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-emerald-400 text-white shadow-lg shadow-cyan-200">
      {icon}
    </div>
    <p className="text-2xl font-black text-slate-950">{value}</p>
    <p className="mt-1 text-sm font-bold text-slate-500">{label}</p>
  </div>
);

const SidebarIcon = ({ icon, active = false }) => (
  <div
    className={`flex h-12 w-12 items-center justify-center rounded-2xl transition ${
      active
        ? 'bg-gradient-to-br from-sky-500 to-emerald-400 text-white shadow-lg shadow-cyan-200'
        : 'bg-white text-slate-400 hover:text-sky-500'
    }`}
  >
    {icon}
  </div>
);

const DashboardStat = ({ label, value, icon }) => (
  <div className="rounded-3xl border border-sky-100 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-sky-100">
    <div className="mb-3 flex items-center justify-between">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
        {label}
      </p>
      <div className="text-sky-500">{icon}</div>
    </div>
    <p className="text-2xl font-black text-slate-950">{value}</p>
  </div>
);

const TaskPreview = ({ title, status, done = false, tone = 'blue' }) => {
  const toneClass = {
    blue: 'from-sky-500 to-cyan-400',
    green: 'from-emerald-400 to-green-500',
    cyan: 'from-cyan-400 to-emerald-400',
  }[tone];

  return (
    <div className="group flex items-center justify-between gap-4 rounded-3xl border border-sky-100 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-sky-100">
      <div className="flex min-w-0 items-center gap-3">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${toneClass} text-white shadow-md shadow-cyan-100`}>
          {done ? <CheckCircle2 className="h-5 w-5" /> : <Clock3 className="h-5 w-5" />}
        </div>

        <p className="truncate text-sm font-black text-slate-800">{title}</p>
      </div>

      <span className="shrink-0 rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-sky-600">
        {status}
      </span>
    </div>
  );
};

const SectionHeading = ({ eyebrow, title, description }) => (
  <div className="mx-auto max-w-3xl text-center">
    <p className="text-sm font-black uppercase tracking-[0.25em] text-sky-500">
      {eyebrow}
    </p>
    <h2 className="mt-4 text-4xl font-black tracking-tight text-slate-950 md:text-5xl">
      {title}
    </h2>
    <p className="mt-5 text-lg font-medium leading-8 text-slate-600">
      {description}
    </p>
  </div>
);

const FeatureCard = ({ icon, title, description }) => (
  <div className="group relative overflow-hidden rounded-[2rem] border border-sky-100 bg-white p-6 shadow-xl shadow-sky-100/70 transition duration-300 hover:-translate-y-2 hover:border-cyan-200 hover:shadow-2xl hover:shadow-cyan-100">
    <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-gradient-to-br from-sky-100 to-emerald-100 opacity-0 blur-2xl transition group-hover:opacity-100" />

    <div className="relative mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-emerald-400 text-white shadow-lg shadow-cyan-200">
      {icon}
    </div>

    <h3 className="relative text-xl font-black text-slate-950">{title}</h3>
    <p className="relative mt-3 text-base font-medium leading-7 text-slate-600">
      {description}
    </p>
  </div>
);

const WorkflowStep = ({ number, title, description, icon }) => (
  <div className="group rounded-[2rem] border border-sky-100 bg-white p-6 shadow-lg shadow-sky-100/60 transition hover:-translate-y-2 hover:shadow-2xl hover:shadow-cyan-100">
    <div className="mb-5 flex items-center justify-between">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-emerald-400 p-3 text-white shadow-lg shadow-cyan-200">
        {icon}
      </div>
      <span className="text-3xl font-black text-sky-100 transition group-hover:text-sky-200">
        {number}
      </span>
    </div>

    <h3 className="text-xl font-black text-slate-950">{title}</h3>
    <p className="mt-3 font-medium leading-7 text-slate-600">{description}</p>
  </div>
);

const AudienceCard = ({ title, description, icon }) => (
  <div className="rounded-[2rem] border border-sky-100 bg-gradient-to-br from-white to-sky-50 p-7 shadow-xl shadow-sky-100/70 transition hover:-translate-y-2 hover:shadow-2xl hover:shadow-cyan-100">
    <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-sky-500 shadow-lg shadow-sky-100">
      {icon}
    </div>

    <h3 className="text-xl font-black text-slate-950">{title}</h3>
    <p className="mt-3 font-medium leading-7 text-slate-600">{description}</p>
  </div>
);

const ValueMetric = ({ value, label }) => (
  <div className="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur transition hover:-translate-y-1 hover:bg-white/15">
    <p className="text-3xl font-black text-white">{value}</p>
    <p className="mt-2 text-sm font-bold leading-6 text-slate-300">{label}</p>
  </div>
);

export default LandingPage;
