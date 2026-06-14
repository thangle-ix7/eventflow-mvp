import { Link } from 'react-router-dom';
import {
  ArrowRight,
  HeartHandshake,
  Mail,
  MapPin,
  Rocket,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

const LandingFooter = () => {
  return (
    <footer className="relative z-10 overflow-hidden bg-slate-950 text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 top-0 h-80 w-80 rounded-full bg-sky-400/20 blur-3xl" />
        <div className="absolute bottom-[-140px] right-[-80px] h-96 w-96 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:48px_48px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-5 py-16 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.15fr_1.85fr]">
          <div>
            <Link to="/" className="group inline-flex">
              <FooterBrand />
            </Link>

            <p className="mt-6 max-w-md text-base font-medium leading-8 text-slate-300">
              EventFlow là nền tảng hỗ trợ đội nhóm lên kế hoạch, chia việc,
              quản lý nhân sự và theo dõi tiến độ sự kiện bằng một quy trình rõ ràng,
              hiện đại và mượt mà hơn.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <FooterBadge icon={<Sparkles className="h-4 w-4" />} label="AI Planning" />
              <FooterBadge icon={<ShieldCheck className="h-4 w-4" />} label="Clear Workflow" />
              <FooterBadge icon={<Rocket className="h-4 w-4" />} label="Fast Execution" />
            </div>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <FooterColumn title="Sản phẩm">
              <FooterLink href="#features">Tính năng</FooterLink>
              <FooterLink href="#workflow">Quy trình</FooterLink>
              <FooterLink href="#audience">Người dùng</FooterLink>
              <FooterLink href="#value">Giá trị</FooterLink>
            </FooterColumn>

            <FooterColumn title="Tính năng">
              <FooterLink href="#features">AI đề xuất kế hoạch</FooterLink>
              <FooterLink href="#features">Quản lý sự kiện</FooterLink>
              <FooterLink href="#features">Quản lý nhân sự</FooterLink>
              <FooterLink href="#features">Quản lý công việc</FooterLink>
            </FooterColumn>

            <FooterColumn title="Phù hợp với">
              <FooterLink href="#audience">CLB sinh viên</FooterLink>
              <FooterLink href="#audience">Đội tổ chức sự kiện</FooterLink>
              <FooterLink href="#audience">Team marketing</FooterLink>
              <FooterLink href="#audience">Startup team</FooterLink>
            </FooterColumn>

            <FooterColumn title="Liên hệ">
              <div className="space-y-4 text-sm font-semibold text-slate-300">
                <div className="flex items-start gap-3">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
                  <span>support@eventflow.vn</span>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                  <span>FPT University, Hà Nội</span>
                </div>

                <div className="flex items-start gap-3">
                  <HeartHandshake className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" />
                  <span>Made for event teams</span>
                </div>
              </div>
            </FooterColumn>
          </div>
        </div>

        <div className="mt-12 overflow-hidden rounded-[2rem] border border-white/10 bg-white/10 p-5 backdrop-blur-xl md:p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xl font-black text-white">
                Sẵn sàng để team bạn quản lý sự kiện chuyên nghiệp hơn?
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-400">
                Bắt đầu tạo sự kiện, chia task và theo dõi tiến độ với EventFlow.
              </p>
            </div>

            <Link
              to="/login"
              className="group inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400 px-6 py-3.5 text-sm font-black text-white shadow-xl shadow-cyan-950/30 transition hover:-translate-y-1 hover:shadow-2xl"
            >
              Đi tới đăng nhập
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
            </Link>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-white/10 pt-6 text-sm font-semibold text-slate-400 md:flex-row md:items-center md:justify-between">
          <p>© 2026 EventFlow. All rights reserved.</p>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <a href="#features" className="transition hover:text-cyan-300">
              Product
            </a>
            <a href="#workflow" className="transition hover:text-cyan-300">
              Workflow
            </a>
            <a href="#value" className="transition hover:text-cyan-300">
              Get started
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

const FooterBrand = () => (
  <div className="flex items-center gap-3">
    <div className="relative">
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-sky-400 to-emerald-400 opacity-35 blur-md transition group-hover:opacity-70" />
      <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/10 shadow-lg shadow-sky-950/30">
        <img
          src="/event-flow-logo-mark.png"
          alt="EventFlow logo"
          className="h-8 w-8 object-contain"
        />
      </div>
    </div>

    <div>
      <p className="text-xl font-black leading-none tracking-tight text-white">
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

const FooterColumn = ({ title, children }) => (
  <div>
    <h3 className="mb-5 text-sm font-black uppercase tracking-[0.22em] text-white">
      {title}
    </h3>

    <div className="space-y-3">{children}</div>
  </div>
);

const FooterLink = ({ href, children }) => (
  <a
    href={href}
    className="block text-sm font-semibold text-slate-400 transition hover:translate-x-1 hover:text-cyan-300"
  >
    {children}
  </a>
);

const FooterBadge = ({ icon, label }) => (
  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-black text-cyan-100 backdrop-blur">
    <span className="text-emerald-300">{icon}</span>
    {label}
  </div>
);

export default LandingFooter;