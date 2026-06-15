import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, X } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import {
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
} from '../components/ui';
import TemplateCard from '../components/TemplateCard';
import TemplateInstantiationModal from '../components/TemplateInstantiationModal';
import templateApi from '../api/templateApi';

const TemplateSelectPage = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSearch(searchInput.trim());
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [searchInput]);

  const query = useQuery({
    queryKey: ['templates', search],
    queryFn: () =>
      templateApi.getTemplatesPage({
        size: 100,
        search,
      }),
  });

  const templates = query.data?.content || [];

  const handleSelect = (template) => {
    setSelectedTemplate(template);
  };

  const handleInstantiateSuccess = (newEvent) => {
    navigate(`/events/${newEvent.id}`);
  };

  return (
    <AppLayout user={user} events={[]} selectedEvent={null} onLogout={onLogout}>
      <div className="mx-auto max-w-6xl space-y-5">
        {/* Header */}
        <section className="flex items-center gap-4">
          <Button
            variant="subtle"
            onClick={() => navigate('/events/new')}
            className="flex-none"
          >
            <ArrowLeft size={18} />
            Quay lại
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-slate-950">Chọn template</h1>
            <p className="mt-1 text-slate-600">Hoặc <button onClick={() => navigate('/events/new')} className="text-indigo-600 hover:text-indigo-700 font-semibold">tạo từ đầu</button></p>
          </div>
        </section>

        {/* Search */}
        <section className="flex gap-3">
          <div className="relative flex-1">
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
            actions={
              <Button onClick={() => navigate('/events/new')} variant="secondary">
                Tạo sự kiện mới
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onSelect={handleSelect}
              />
            ))}
          </div>
        )}
      </div>

      {/* Instantiation Modal */}
      <TemplateInstantiationModal
        isOpen={Boolean(selectedTemplate)}
        template={selectedTemplate}
        onClose={() => setSelectedTemplate(null)}
        onSuccess={handleInstantiateSuccess}
      />
    </AppLayout>
  );
};

export default TemplateSelectPage;
