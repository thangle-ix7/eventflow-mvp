import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, Mail } from 'lucide-react';

const Header = ({
  showNav = true,
  showLogin = true,
  ctaLabel = 'Bắt đầu',
  ctaTo = '/login',
}) => {
  const location = useLocation();
  const isLandingPage = location.pathname === '/';

  const sectionHref = (id) => (isLandingPage ? `#${id}` : `/#${id}`);

  return (
    <header className="sticky top-0 z-50 border-b border-sky-100/80 bg-white/80 backdrop-blur-2xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 lg:px-8">
        <Link to="/" className="group flex min-w-0 items-center gap-3">
          <div className="relative shrink-0">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-sky-400 to-emerald-400 opacity-35 blur-md transition group-hover:opacity-70" />
            <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-sky-100 bg-white shadow-lg shadow-sky-200/60">
              <img
                src="/event-flow-logo-mark.png"
                alt="EventFlow logo"
                className="h-8 w-8 object-contain"
              />
            </div>
          </div>

          <div className="min-w-0">
            <p className="text-xl font-black leading-none tracking-tight text-slate-950">
              <span>Event</span>
              <span className="bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                Flow
              </span>
            </p>
            <p className="mt-1 truncate text-xs font-bold uppercase tracking-[0.22em] text-slate-400">
              AI Event Planning
            </p>
          </div>
        </Link>

        {showNav && (
          <nav className="hidden items-center gap-8 text-sm font-bold text-slate-600 lg:flex">
            <a href={sectionHref('features')} className="transition hover:text-sky-500">
              Tính năng
            </a>
            <a href={sectionHref('workflow')} className="transition hover:text-sky-500">
              Quy trình
            </a>
            <a href={sectionHref('audience')} className="transition hover:text-sky-500">
              Người dùng
            </a>
            <a href={sectionHref('value')} className="transition hover:text-sky-500">
              Giá trị
            </a>
          </nav>
        )}

        <div className="flex shrink-0 items-center gap-3">
          <a
            href="mailto:support@eventflow.vn"
            className="hidden items-center gap-2 rounded-full px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-sky-50 hover:text-sky-600 xl:inline-flex"
          >
            <Mail className="h-4 w-4" />
            Liên hệ
          </a>

          {showLogin && (
            <Link
              to="/login"
              className="hidden rounded-full px-5 py-2.5 text-sm font-extrabold text-slate-700 transition hover:bg-sky-50 hover:text-sky-600 sm:inline-flex"
            >
              Đăng nhập
            </Link>
          )}

          <Link
            to={ctaTo}
            className="group inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400 px-5 py-2.5 text-sm font-black text-white shadow-xl shadow-cyan-300/40 transition hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-cyan-300/60"
          >
            {ctaLabel}
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Header;
