import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  Search,
  Users,
} from 'lucide-react';
import AppLayout from '../components/AppLayout';
import eventApi from '../api/eventApi';
import { formatDate } from '../utils/dateUtils';

const PAGE_SIZE = 8;

const EventListPage = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('eventDate');
  const [direction, setDirection] = useState('asc');

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
  const totalElements = query.data?.totalElements || 0;
  const totalPages = query.data?.totalPages || 0;
  const hasFilters = Boolean(search || status);

  const pageTitle = useMemo(() => {
    if (totalElements === 0) return 'Danh sách sự kiện';
    return `${totalElements} sự kiện của bạn`;
  }, [totalElements]);

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    setPage(0);
    setSearch(searchInput.trim());
  };

  const handleStatusChange = (event) => {
    setPage(0);
    setStatus(event.target.value);
  };

  const handleSortChange = (event) => {
    setPage(0);
    setSort(event.target.value);
  };

  const handleDirectionChange = (event) => {
    setPage(0);
    setDirection(event.target.value);
  };

  const handleClearFilters = () => {
    setPage(0);
    setSearch('');
    setSearchInput('');
    setStatus('');
    setSort('eventDate');
    setDirection('asc');
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
      showTelegramOnboarding={false}
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-blue-600">EventFlow</p>
            <h2 className="mt-1 text-2xl font-bold text-gray-900">{pageTitle}</h2>
            <p className="mt-1 text-sm text-gray-500">
              Xem các sự kiện bạn tạo với role LEADER hoặc đang tham gia với role MEMBER.
            </p>
          </div>
          <Link
            to="/events/new"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <Plus size={18} />
            Tạo sự kiện
          </Link>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <form
            onSubmit={handleSearchSubmit}
            className="grid gap-3 lg:grid-cols-[1fr_160px_160px_140px_auto]"
          >
            <label className="relative block">
              <span className="sr-only">Tìm kiếm sự kiện</span>
              <Search
                size={18}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Tìm theo tên sự kiện"
                className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 text-sm outline-none focus:border-blue-500"
              />
            </label>

            <select
              value={status}
              onChange={handleStatusChange}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="DONE">DONE</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>

            <select
              value={sort}
              onChange={handleSortChange}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            >
              <option value="eventDate">Ngày diễn ra</option>
              <option value="name">Tên sự kiện</option>
              <option value="status">Trạng thái</option>
              <option value="createdAt">Ngày tạo</option>
            </select>

            <select
              value={direction}
              onChange={handleDirectionChange}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            >
              <option value="asc">Tăng dần</option>
              <option value="desc">Giảm dần</option>
            </select>

            <button
              type="submit"
              className="rounded-lg border border-blue-600 px-4 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50"
            >
              Tìm kiếm
            </button>
          </form>
        </div>

        {query.isLoading && <EventListLoading />}

        {query.error && (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            <AlertCircle size={20} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">Không tải được danh sách sự kiện</p>
              <p className="mt-1 text-sm">
                {query.error.userMessage || query.error.message}
              </p>
            </div>
          </div>
        )}

        {!query.isLoading && !query.error && events.length === 0 && (
          <EventListEmpty hasFilters={hasFilters} onClearFilters={handleClearFilters} />
        )}

        {!query.isLoading && !query.error && events.length > 0 && (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              {events.map((event) => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => handleOpenEvent(event.id)}
                  className="rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:border-blue-200 hover:bg-blue-50/40"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-base font-semibold text-gray-900">
                          {event.name}
                        </h3>
                        <RoleBadge role={event.role} />
                      </div>
                      <div className="mt-3 flex flex-wrap gap-3 text-sm text-gray-500">
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarDays size={16} />
                          {formatDate(event.eventDate)}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Users size={16} />
                          {event.role === 'LEADER' ? 'Bạn tạo sự kiện' : 'Bạn tham gia'}
                        </span>
                      </div>
                    </div>
                    <ArrowRight size={18} className="mt-1 shrink-0 text-gray-400" />
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                      {event.status || 'ACTIVE'}
                    </span>
                    <span className="text-xs text-gray-500">
                      Tạo lúc {formatDate(event.createdAt)}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-gray-500">
                Trang <span className="font-semibold text-gray-900">{page + 1}</span>
                {totalPages > 0 && (
                  <>
                    {' '}trên{' '}
                    <span className="font-semibold text-gray-900">{totalPages}</span>
                  </>
                )}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPage((old) => Math.max(old - 1, 0))}
                  disabled={page === 0}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ChevronLeft size={16} />
                  Trước
                </button>
                <button
                  type="button"
                  onClick={() => setPage((old) => old + 1)}
                  disabled={query.data?.last !== false}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Sau
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
};

const RoleBadge = ({ role }) => {
  const isLeader = role === 'LEADER';

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-bold ${
        isLeader
          ? 'bg-blue-100 text-blue-700'
          : 'bg-gray-100 text-gray-700'
      }`}
    >
      {isLeader ? 'LEADER' : 'MEMBER'}
    </span>
  );
};

const EventListLoading = () => (
  <div className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white p-8 text-gray-500">
    <Loader2 size={20} className="animate-spin" />
    Đang tải danh sách sự kiện...
  </div>
);

const EventListEmpty = ({ hasFilters, onClearFilters }) => (
  <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
      <CalendarDays size={28} />
    </div>
    <h3 className="mt-4 text-lg font-semibold text-gray-900">
      {hasFilters ? 'Không tìm thấy sự kiện phù hợp' : 'Bạn chưa có sự kiện nào'}
    </h3>
    <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
      {hasFilters
        ? 'Thử đổi từ khóa, trạng thái hoặc thứ tự sắp xếp.'
        : 'Tạo sự kiện đầu tiên để bắt đầu quản lý ban, task và dashboard.'}
    </p>
    <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
      {hasFilters && (
        <button
          type="button"
          onClick={onClearFilters}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Xóa bộ lọc
        </button>
      )}
      <Link
        to="/events/new"
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
      >
        <Plus size={18} />
        Tạo sự kiện
      </Link>
    </div>
  </div>
);

export default EventListPage;
