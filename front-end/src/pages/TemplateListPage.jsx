import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  X,
} from 'lucide-react';
import AppLayout from '../components/AppLayout';
import {
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
} from '../components/ui';
import TemplateCard from '../components/TemplateCard';
import TemplatePreviewModal from '../components/TemplatePreviewModal';
import TemplateInstantiationModal from '../components/TemplateInstantiationModal';
import templateApi from '../api/templateApi';

const PAGE_SIZE = 12;
const SORT_OPTIONS = {
  newest: { sort: 'createdDate', direction: 'desc' },
  name: { sort: 'name', direction: 'asc' },
  tasks: { sort: 'taskCount', direction: 'desc' },
};

const TemplateListPage = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [sortMode, setSortMode] = useState('newest');
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [instantiateTemplate, setInstantiateTemplate] = useState(null);

  const { sort, direction } = SORT_OPTIONS[sortMode] || SORT_OPTIONS.newest;

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setPage(0);
      setSearch(searchInput.trim());
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [searchInput]);

  const query = useQuery({
    queryKey: ['templatesPage', page, search, sort, direction],
    queryFn: () =>
      templateApi.getTemplatesPage({
        page,
        size: PAGE_SIZE,
        search,
        sort,
        direction,
      }),
  });

  const templates = query.data?.content || [];
  const isLastPage = query.data?.last !== false;

  const handleSortChange = (event) => {
    setPage(0);
    setSortMode(event.target.value);
  };

  const handleClearFilters = () => {
    setPage(0);
    setSearch('');
    setSearchInput('');
    setSortMode('newest');
  };

  const handlePreview = (template) => {
    setPreviewTemplate(template);
  };

  const handleInstantiate = (template) => {
    setPreviewTemplate(null);
    setInstantiateTemplate(template);
  };

  const handleInstantiateSuccess = (newEvent) => {
    setInstantiateTemplate(null);
    navigate(`/events/${newEvent.id}`);
  };

  return (
    <AppLayout user={user} events={[]} selectedEvent={null} onLogout={onLogout}>
      <div className="mx-auto max-w-7xl space-y-5">
        {/* Header */}
        <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
              Templates
            </h1>
            <p className="mt-2 text-slate-600">Chọn template để tạo sự kiện mới</p>
          </div>
          <Button onClick={() => navigate('/events/new')} variant="secondary" className="w-full sm:w-auto">
            Hoặc tạo từ đầu
          </Button>
        </section>

        {/* Filters */}
        <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            {/* Search */}
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" strokeWidth={1.8} />
              <input
                id="template-search"
                name="search"
                aria-label="Tìm kiếm template"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Tìm template"
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

            {/* Sort */}
            <select
              value={sortMode}
              onChange={handleSortChange}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            >
              <option value="newest">Mới nhất</option>
              <option value="name">Theo tên</option>
              <option value="tasks">Task nhiều nhất</option>
            </select>

            {search && (
              <Button variant="subtle" onClick={handleClearFilters} className="text-xs">
                Xóa bộ lọc
              </Button>
            )}
          </div>
        </section>

        {/* Templates Grid */}
        {query.isLoading ? (
          <LoadingState message="Đang tải templates..." />
        ) : query.error ? (
          <ErrorState
            error={query.error}
            title="Không tải được templates"
            onDismiss={() => query.refetch()}
          />
        ) : templates.length === 0 ? (
          <EmptyState
            title="Không tìm thấy template"
            description={search ? 'Hãy thử từ khóa khác' : 'Chưa có template nào. Liên hệ admin để tạo.'}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {templates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onPreview={handlePreview}
                onSelect={handleInstantiate}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {templates.length > 0 && (
          <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-sm text-slate-600">
              Trang {page + 1} - Hiển thị {templates.length} / {query.data?.totalElements || 0}
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => setPage((old) => Math.max(old - 1, 0))}
                disabled={page === 0}
                className="text-xs"
              >
                <ChevronLeft size={16} />
                Trước
              </Button>
              <Button
                variant="secondary"
                onClick={() => setPage((old) => old + 1)}
                disabled={isLastPage}
                className="text-xs"
              >
                Sau
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <TemplatePreviewModal
        isOpen={Boolean(previewTemplate)}
        template={previewTemplate}
        onClose={() => setPreviewTemplate(null)}
        onInstantiate={handleInstantiate}
      />
      <TemplateInstantiationModal
        isOpen={Boolean(instantiateTemplate)}
        template={instantiateTemplate}
        onClose={() => setInstantiateTemplate(null)}
        onSuccess={handleInstantiateSuccess}
      />
    </AppLayout>
  );
};

export default TemplateListPage;
