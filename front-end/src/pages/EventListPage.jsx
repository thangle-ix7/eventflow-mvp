import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
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
  TextInput,
  Toolbar,
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
        <PageHeader
          eyebrow="EventFlow"
          title={pageTitle}
          description="Tập trung mọi sự kiện bạn đang dẫn dắt hoặc tham gia. Tìm nhanh, lọc trạng thái và mở đúng workspace chỉ trong một bước."
          actions={
            <Button as={Link} to="/events/new">
              <Plus size={18} />
              Tạo sự kiện
            </Button>
          }
        />

        <Toolbar>
          <form
            onSubmit={handleSearchSubmit}
            className="grid gap-3 lg:grid-cols-[1fr_160px_160px_140px_auto]"
          >
            <TextInput
              id="event-search"
              name="search"
              aria-label="Tìm kiếm sự kiện"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Tìm theo tên sự kiện"
            />

            <SelectControl
              aria-label="Lọc trạng thái sự kiện"
              name="status"
              value={status}
              onChange={handleStatusChange}
            >
              <option value="">Tất cả trạng thái</option>
              <option value="ACTIVE">Đang diễn ra</option>
              <option value="DONE">Hoàn thành</option>
              <option value="CANCELLED">Đã hủy</option>
            </SelectControl>

            <SelectControl
              aria-label="Sắp xếp sự kiện"
              name="sort"
              value={sort}
              onChange={handleSortChange}
            >
              <option value="eventDate">Ngày diễn ra</option>
              <option value="name">Tên sự kiện</option>
              <option value="status">Trạng thái</option>
              <option value="createdAt">Ngày tạo</option>
            </SelectControl>

            <SelectControl
              aria-label="Thứ tự sắp xếp"
              name="direction"
              value={direction}
              onChange={handleDirectionChange}
            >
              <option value="asc">Tăng dần</option>
              <option value="desc">Giảm dần</option>
            </SelectControl>

            <Button type="submit" variant="secondary">
              Tìm kiếm
            </Button>
          </form>
        </Toolbar>

        {query.isLoading && <LoadingState message="Đang tải danh sách sự kiện..." />}

        {query.error && (
          <ErrorState error={query.error} title="Không tải được danh sách sự kiện" />
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
                  className="rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50/40"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-base font-semibold text-slate-950">
                          {event.name}
                        </h3>
                        <StatusBadge status={event.role} />
                      </div>
                      <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-500">
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
                    <ArrowRight size={18} className="mt-1 shrink-0 text-slate-400" />
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                    <StatusBadge status={event.status || 'ACTIVE'} />
                    <span className="text-xs text-slate-500">
                      Tạo lúc {formatDate(event.createdAt)}
                    </span>
                  </div>
                </button>
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
