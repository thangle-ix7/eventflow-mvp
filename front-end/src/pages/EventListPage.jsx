import { useMemo, useState } from 'react';
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
} from 'lucide-react';
import AppLayout from '../components/AppLayout';
import {
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  Panel,
  SelectControl,
  StatusBadge,
} from '../components/ui';
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

  const handleStatusQuickChange = (nextStatus) => {
    setPage(0);
    setStatus(nextStatus);
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
    >
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          eyebrow="EventFlow"
          title={pageTitle}
          description="Chọn sự kiện để tiếp tục quản lý task, ban tổ chức, tài liệu và báo cáo."
          actions={
            <Button as={Link} to="/events/new">
              <Plus size={18} />
              Tạo sự kiện
            </Button>
          }
        />

        <Panel className="p-4">
          <form onSubmit={handleSearchSubmit} className="space-y-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" strokeWidth={1.8} />
              <input
                id="event-search"
                name="search"
                aria-label="Tìm kiếm sự kiện"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Tìm theo tên sự kiện"
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-11 text-sm font-medium text-slate-800 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
              />
              <Button type="submit" className="absolute right-1.5 top-1/2 hidden -translate-y-1/2 sm:inline-flex">
                Tìm
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              <FilterChip active={!status} label="Tất cả" onClick={() => handleStatusQuickChange('')} />
              <FilterChip active={status === 'ACTIVE'} label="Đang diễn ra" onClick={() => handleStatusQuickChange('ACTIVE')} />
              <FilterChip active={status === 'DONE'} label="Hoàn thành" onClick={() => handleStatusQuickChange('DONE')} />
              <FilterChip active={status === 'CANCELLED'} label="Đã hủy" onClick={() => handleStatusQuickChange('CANCELLED')} />
            </div>

            <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
              <SelectControl label="Sắp xếp" aria-label="Sắp xếp sự kiện" name="sort" value={sort} onChange={handleSortChange}>
                <option value="eventDate">Ngày diễn ra</option>
                <option value="name">Tên sự kiện</option>
                <option value="status">Trạng thái</option>
                <option value="createdAt">Ngày tạo</option>
              </SelectControl>
              <SelectControl label="Thứ tự" aria-label="Thứ tự sắp xếp" name="direction" value={direction} onChange={handleDirectionChange}>
                <option value="asc">Tăng dần</option>
                <option value="desc">Giảm dần</option>
              </SelectControl>
              <div className="flex items-end">
                <Button type="button" onClick={handleClearFilters} variant="secondary" className="w-full">
                  Làm mới
                </Button>
              </div>
            </div>
          </form>
        </Panel>

        {query.isLoading && <LoadingState message="Đang tải danh sách sự kiện..." />}

        {query.error && (
          <ErrorState error={query.error} title="Không tải được danh sách sự kiện" />
        )}

        {!query.isLoading && !query.error && events.length === 0 && (
          <EventListEmpty hasFilters={hasFilters} onClearFilters={handleClearFilters} />
        )}

        {!query.isLoading && !query.error && events.length > 0 && (
          <>
            <div className="grid gap-4 lg:grid-cols-2">
              {events.map((event) => (
                <EventCard key={event.id} event={event} onOpen={() => handleOpenEvent(event.id)} />
              ))}
            </div>

            <Panel className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">
                Trang <span className="font-semibold text-slate-950">{page + 1}</span>
                {totalPages > 0 && (
                  <>
                    {' '}trên{' '}
                    <span className="font-semibold text-slate-950">{totalPages}</span>
                  </>
                )}
              </p>
              <div className="flex gap-2">
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
            </Panel>
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
    className={`rounded-full border px-3 py-1.5 text-sm font-bold transition ${
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
    className="group rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
  >
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={event.status || 'ACTIVE'} />
          <StatusBadge status={event.role} />
        </div>
        <h3 className="mt-3 line-clamp-2 text-lg font-extrabold text-slate-950">
          {event.name}
        </h3>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">
          {event.description || 'Chưa có mô tả. Mở workspace để bổ sung thông tin và bắt đầu điều phối.'}
        </p>
      </div>
      <span className="mt-1 rounded-full bg-slate-100 p-2 text-slate-400 transition group-hover:bg-indigo-50 group-hover:text-indigo-600">
        <ArrowRight size={18} />
      </span>
    </div>

    <div className="mt-5 grid gap-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
      <span className="inline-flex items-center gap-2">
        <CalendarDays size={16} />
        {formatEventRange(event)}
      </span>
      <span className="inline-flex items-center gap-2">
        <Users size={16} />
        {event.role === 'LEADER' ? 'Bạn là người điều phối' : 'Bạn là thành viên'}
      </span>
      <span className="inline-flex items-center gap-2">
        <MapPin size={16} />
        {event.location || 'Chưa cập nhật địa điểm'}
      </span>
    </div>

    <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
      <span className="text-xs font-semibold text-slate-400">
        Tạo lúc {formatDate(event.createdAt)}
      </span>
      <span className="text-sm font-bold text-indigo-600 group-hover:text-indigo-700">
        Mở workspace
      </span>
    </div>
  </button>
);

const EventListEmpty = ({ hasFilters, onClearFilters }) => (
  <EmptyState
    icon={CalendarDays}
    title={hasFilters ? 'Không tìm thấy sự kiện phù hợp' : 'Bạn chưa có sự kiện nào'}
    description={
      hasFilters
        ? 'Thử đổi từ khóa, trạng thái hoặc thứ tự sắp xếp.'
        : 'Tạo sự kiện đầu tiên để bắt đầu quản lý ban, task và dashboard.'
    }
    actions={
      <>
      {hasFilters && (
        <Button
          type="button"
          onClick={onClearFilters}
          variant="secondary"
        >
          Xóa bộ lọc
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
