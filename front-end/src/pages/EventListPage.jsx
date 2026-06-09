import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Plus,
  Search,
  Users,
  X,
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
      <div className="mx-auto max-w-7xl space-y-5">
        <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
              Sự kiện của bạn
            </h1>
          </div>
          <Button as={Link} to="/events/new" className="w-full sm:w-auto">
            <Plus size={18} />
            Tạo sự kiện
          </Button>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" strokeWidth={1.8} />
              <input
                id="event-search"
                name="search"
                aria-label="Tìm kiếm sự kiện"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Tìm sự kiện"
                className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-9 text-sm font-medium text-slate-800 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput('')}
                  className="absolute right-2 top-1/2 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
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

            <div className="flex items-center gap-2">
              <select
                aria-label="Sắp xếp sự kiện"
                name="sortMode"
                value={sortMode}
                onChange={handleSortModeChange}
                className="h-11 min-w-40 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              >
                <option value="upcoming">Gần nhất</option>
                <option value="newest">Mới tạo</option>
                <option value="name">Tên A-Z</option>
              </select>
              {hasFilters && (
                <Button type="button" variant="subtle" onClick={handleClearFilters} className="px-3">
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
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {events.map((event) => (
                <EventCard key={event.id} event={event} onOpen={() => handleOpenEvent(event.id)} />
              ))}
            </div>

            <div className="flex justify-end">
              <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:flex">
                <Button
                  type="button"
                  onClick={() => setPage((old) => Math.max(old - 1, 0))}
                  disabled={page === 0}
                  variant="secondary"
                >
                  <ChevronLeft size={16} />
                  Trước
                </Button>
                <Button
                  type="button"
                  onClick={() => setPage((old) => old + 1)}
                  disabled={query.data?.last !== false}
                  variant="secondary"
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
    className={`min-h-10 shrink-0 rounded-lg border px-3 py-2 text-sm font-bold transition ${
      active
        ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
        : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:text-indigo-700'
    }`}
  >
    {label}
  </button>
);

const EventCard = ({ event, onOpen }) => (
  <button
    type="button"
    onClick={onOpen}
    className="group flex h-full flex-col rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
  >
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={event.status || 'ACTIVE'} />
          <StatusBadge status={event.role} />
        </div>
        <h2 className="mt-3 line-clamp-2 text-lg font-extrabold text-slate-950">
          {event.name}
        </h2>
      </div>
      <span className="mt-0.5 shrink-0 rounded-lg bg-slate-100 p-2 text-slate-400 transition group-hover:bg-indigo-50 group-hover:text-indigo-600">
        <ArrowRight size={18} />
      </span>
    </div>

    <div className="mt-4 grid gap-2 text-sm text-slate-600">
      <EventMeta icon={CalendarDays} text={formatEventRange(event)} />
      <EventMeta icon={MapPin} text={event.location || 'Chưa cập nhật địa điểm'} />
      <EventMeta icon={Users} text={event.role === 'LEADER' ? 'Bạn điều phối' : 'Bạn tham gia'} />
    </div>

    <div className="mt-auto pt-4">
      <span className="text-sm font-bold text-indigo-600 group-hover:text-indigo-700">
        Mở workspace
      </span>
    </div>
  </button>
);

const EventMeta = ({ icon: Icon, text }) => (
  <span className="inline-flex min-w-0 items-center gap-2">
    <Icon size={16} className="shrink-0 text-slate-400" strokeWidth={1.8} />
    <span className="min-w-0 truncate">{text}</span>
  </span>
);

const EventListEmpty = ({ hasFilters, onClearFilters }) => (
  <EmptyState
    icon={CalendarDays}
    title={hasFilters ? 'Không tìm thấy sự kiện' : 'Bạn chưa có sự kiện nào'}
    actions={
      <>
      {hasFilters && (
        <Button
          type="button"
          onClick={onClearFilters}
          variant="secondary"
        >
          Xóa lọc
        </Button>
      )}
      <Button
        as={Link}
        to="/events/new"
      >
        <Plus size={18} />
        Tạo sự kiện
      </Button>
      </>
    }
  />
);

export default EventListPage;
