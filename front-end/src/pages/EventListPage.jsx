import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BadgePercent,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Plus,
  Search,
  SlidersHorizontal,
  Users,
  X,
  LayoutTemplate,
  MessageSquareHeart,
  Settings,
  UserRound
} from 'lucide-react';
import AppLayout from '../components/AppLayout';
import {
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  StatusBadge,
} from '../components/ui';
import eventApi from '../api/eventApi';
import { formatDate } from '../utils/dateUtils';

const PAGE_SIZE = 8;

const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả' },
  { value: 'ACTIVE', label: 'Đang diễn ra' },
  { value: 'DONE', label: 'Hoàn thành' },
  { value: 'CANCELLED', label: 'Đã hủy' },
];

const SORT_OPTIONS = {
  upcoming: { sort: 'eventDate', direction: 'asc' },
  newest: { sort: 'createdAt', direction: 'desc' },
  name: { sort: 'name', direction: 'asc' },
};

const EventListPage = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [sortMode, setSortMode] = useState('upcoming');
  const { sort, direction } = SORT_OPTIONS[sortMode] || SORT_OPTIONS.upcoming;

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setPage(0);
      setSearch(searchInput.trim());
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [searchInput]);

  const query = useQuery({
    queryKey: ['eventsPage', page, status, search, sort, direction],
    queryFn: () =>
      eventApi.getMyEventsPage({
        page,
        size: PAGE_SIZE,
        status,
        search,
        sort,
        direction,
      }),
  });

  const events = query.data?.content || [];
  const hasFilters = Boolean(search || status);

  const handleStatusChange = (nextStatus) => {
    setPage(0);
    setStatus(nextStatus);
  };

  const handleSortModeChange = (event) => {
    setPage(0);
    setSortMode(event.target.value);
  };

  const handleClearFilters = () => {
    setPage(0);
    setSearch('');
    setSearchInput('');
    setStatus('');
    setSortMode('upcoming');
  };

  const handleOpenEvent = (eventId) => {
    navigate(`/events/${eventId}`);
  };

  return (
    <AppLayout
      user={user}
      events={events}
      selectedEvent={null}
      onEventChange={(event) => handleOpenEvent(event.target.value)}
      onLogout={onLogout}
    >
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-600">
                Event workspace
              </p>

              <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                Sự kiện của bạn
              </h1>

              <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-600">
                Quản lý các sự kiện bạn tạo hoặc tham gia, mở workspace để theo dõi ban tổ chức, task và dashboard.
              </p>
            </div>

            <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
              <Button as={Link} to="/events/templates" variant="secondary" className="min-h-11 w-full rounded-2xl sm:w-auto">
                <LayoutTemplate size={18} />
                Thư viện Mẫu
              </Button>

              {user?.systemRole === 'ADMIN' && (
                <>
                  <Button as={Link} to="/admin/feedback" variant="secondary" className="min-h-11 w-full rounded-2xl sm:w-auto">
                    <MessageSquareHeart size={18} />
                    Feedback
                  </Button>
                  <Button as={Link} to="/admin/templates" variant="secondary" className="min-h-11 w-full rounded-2xl sm:w-auto">
                    <Settings size={18} />
                    Quản lý Mẫu
                  </Button>
                  <Button as={Link} to="/admin/discount-codes" variant="secondary" className="min-h-11 w-full rounded-2xl sm:w-auto">
                    <BadgePercent size={18} />
                    Mã giảm giá
                  </Button>
                  <Button as={Link} to="/admin/users" variant="secondary" className="min-h-11 w-full rounded-2xl sm:w-auto">
                    <UserRound size={18} />
                    User
                  </Button>
                </>
              )}

              <Button
                as={Link}
                to="/events/new"
                className="min-h-11 w-full rounded-2xl bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400 font-black text-white shadow-xl shadow-cyan-100 sm:w-auto"
              >
                <Plus size={18} />
                Tạo sự kiện
              </Button>
            </div>
        </header>

        <section className="relative overflow-hidden rounded-[2rem] border border-sky-100 bg-white p-4 shadow-xl shadow-sky-100/70">
          <div className="pointer-events-none absolute -left-16 -top-20 h-52 w-52 rounded-full bg-sky-100/70 blur-3xl" />

          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative min-w-0 flex-1">
              <Search
                className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-sky-400"
                strokeWidth={1.8}
              />

              <input
                id="event-search"
                name="search"
                aria-label="Tìm kiếm sự kiện"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Tìm sự kiện theo tên..."
                className="h-12 w-full rounded-2xl border border-sky-100 bg-sky-50/60 px-11 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-cyan-300 focus:bg-white focus:ring-4 focus:ring-cyan-100"
              />

              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput('')}
                  className="absolute right-3 top-1/2 rounded-xl p-1.5 text-slate-400 transition hover:bg-white hover:text-slate-700"
                  aria-label="Xóa tìm kiếm"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 lg:mx-0 lg:overflow-visible lg:pb-0">
              {STATUS_OPTIONS.map((option) => (
                <FilterChip
                  key={option.value || 'all'}
                  active={status === option.value}
                  label={option.label}
                  onClick={() => handleStatusChange(option.value)}
                />
              ))}
            </div>

            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
              <label className="relative min-w-0">
                <SlidersHorizontal
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-sky-400"
                  strokeWidth={1.8}
                />

                <select
                  aria-label="Sắp xếp sự kiện"
                  name="sortMode"
                  value={sortMode}
                  onChange={handleSortModeChange}
                  className="h-12 w-full min-w-0 rounded-2xl border border-sky-100 bg-white px-10 text-sm font-black text-slate-700 outline-none transition focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100 sm:min-w-44"
                >
                  <option value="upcoming">Gần nhất</option>
                  <option value="newest">Mới tạo</option>
                  <option value="name">Tên A-Z</option>
                </select>
              </label>

              {hasFilters && (
                <Button
                  type="button"
                  variant="subtle"
                  onClick={handleClearFilters}
                  className="rounded-2xl px-3 font-black text-sky-600"
                >
                  Xóa lọc
                </Button>
              )}
            </div>
          </div>
        </section>

        {query.isLoading && <LoadingState message="Đang tải danh sách sự kiện..." />}

        {query.error && (
          <ErrorState error={query.error} title="Không tải được danh sách sự kiện" />
        )}

        {!query.isLoading && !query.error && events.length === 0 && (
          <EventListEmpty hasFilters={hasFilters} onClearFilters={handleClearFilters} />
        )}

        {!query.isLoading && !query.error && events.length > 0 && (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {events.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onOpen={() => handleOpenEvent(event.id)}
                />
              ))}
            </div>

            <div className="flex justify-end">
              <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:flex">
                <Button
                  type="button"
                  onClick={() => setPage((old) => Math.max(old - 1, 0))}
                  disabled={page === 0}
                  variant="secondary"
                  className="rounded-2xl"
                >
                  <ChevronLeft size={16} />
                  Trước
                </Button>

                <Button
                  type="button"
                  onClick={() => setPage((old) => old + 1)}
                  disabled={query.data?.last !== false}
                  variant="secondary"
                  className="rounded-2xl"
                >
                  Sau
                  <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
};

const formatEventRange = (event) => {
  const start = event?.startTime || event?.eventDate;
  const end = event?.endTime;
  if (!end || end === start) {
    return formatDate(start);
  }
  return `${formatDate(start)} - ${formatDate(end)}`;
};

const FilterChip = ({ active, label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`min-h-10 shrink-0 rounded-2xl border px-4 py-2 text-sm font-black shadow-sm transition ${
      active
        ? 'border-sky-200 bg-sky-50 text-sky-700 shadow-sky-100'
        : 'border-sky-100 bg-white text-slate-600 hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700'
    }`}
  >
    {label}
  </button>
);

const EventCard = ({ event, onOpen }) => (
  <button
    type="button"
    onClick={onOpen}
    className="group relative flex h-full min-h-[260px] flex-col overflow-hidden rounded-[2rem] border border-sky-100 bg-white p-5 text-left shadow-xl shadow-sky-100/70 transition hover:-translate-y-1 hover:shadow-2xl hover:shadow-cyan-100"
  >
    <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-sky-100/80 opacity-0 blur-3xl transition group-hover:opacity-100" />
    <div className="pointer-events-none absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-emerald-100/70 opacity-0 blur-3xl transition group-hover:opacity-100" />

    <div className="relative flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={event.status || 'ACTIVE'} />
          <StatusBadge status={event.role} />
        </div>

        <h2 className="mt-4 line-clamp-2 text-xl font-black leading-snug text-slate-950">
          {event.name}
        </h2>
      </div>

      <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-500 transition group-hover:bg-gradient-to-br group-hover:from-sky-500 group-hover:to-emerald-400 group-hover:text-white group-hover:shadow-lg group-hover:shadow-cyan-100">
        <ArrowRight size={18} />
      </span>
    </div>

    <div className="relative mt-5 grid gap-3 text-sm font-semibold text-slate-600">
      <EventMeta icon={CalendarDays} text={formatEventRange(event)} />
      <EventMeta icon={MapPin} text={event.location || 'Chưa cập nhật địa điểm'} />
      <EventMeta icon={Users} text={event.role === 'LEADER' ? 'Bạn điều phối' : 'Bạn tham gia'} />
    </div>

    <div className="relative mt-auto pt-5">
      <span className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1.5 text-sm font-black text-sky-600 transition group-hover:bg-white group-hover:text-emerald-600">
        Mở workspace
        <ArrowRight size={15} />
      </span>
    </div>
  </button>
);

const EventMeta = ({ icon: Icon, text }) => (
  <span className="inline-flex min-w-0 items-center gap-2">
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-500">
      <Icon size={16} strokeWidth={1.8} />
    </span>
    <span className="min-w-0 truncate">{text}</span>
  </span>
);

const EventListEmpty = ({ hasFilters, onClearFilters }) => (
  <EmptyState
    icon={CalendarDays}
    title={hasFilters ? 'Không tìm thấy sự kiện' : 'Bạn chưa có sự kiện nào'}
    description={
      hasFilters
        ? 'Không có sự kiện nào khớp với bộ lọc hiện tại. Hãy thử xóa lọc hoặc đổi từ khóa tìm kiếm.'
        : 'Tạo sự kiện đầu tiên để bắt đầu quản lý ban tổ chức, task và dashboard trên EventFlow.'
    }
    actions={
      <>
        {hasFilters && (
          <Button
            type="button"
            onClick={onClearFilters}
            variant="secondary"
            className="rounded-2xl"
          >
            Xóa lọc
          </Button>
        )}

        <Button
          as={Link}
          to="/events/new"
          className="rounded-2xl bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400 font-black text-white shadow-xl shadow-cyan-100"
        >
          <Plus size={18} />
          Tạo sự kiện
        </Button>
      </>
    }
  />
);

export default EventListPage;

