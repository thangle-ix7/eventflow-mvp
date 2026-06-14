import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Edit2,
  Eye,
  Plus,
  Search,
  Trash2,
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
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import templateApi from '../api/templateApi';

const PAGE_SIZE = 10;

const AdminTemplateListPage = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setPage(0);
      setSearch(searchInput.trim());
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [searchInput]);

  const query = useQuery({
    queryKey: ['adminTemplatesPage', page, search],
    queryFn: () =>
      templateApi.getTemplatesPage({
        page,
        size: PAGE_SIZE,
        search,
        sort: 'createdDate',
        direction: 'desc',
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (templateId) => templateApi.deleteTemplate(templateId),
    onSuccess: () => {
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['adminTemplatesPage'] });
    },
  });

  const templates = query.data?.content || [];
  const isLastPage = query.data?.last !== false;

  const handleDelete = (template) => {
    setDeleteTarget(template);
  };

  const confirmDelete = () => {
    deleteMutation.mutate(deleteTarget.id);
  };

  return (
    <AppLayout user={user} events={[]} selectedEvent={null} onLogout={onLogout}>
      <div className="mx-auto max-w-7xl space-y-5">
        {/* Header */}
        <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
              Quản lý Templates
            </h1>
            <p className="mt-2 text-slate-600">Tạo, sửa, xóa templates cho sự kiện</p>
          </div>
          <Button
            onClick={() => navigate('/admin/templates/new')}
            className="w-full sm:w-auto"
          >
            <Plus size={18} />
            Tạo Template
          </Button>
        </section>

        {/* Search */}
        <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
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
          </div>
        </section>

        {/* Templates Table */}
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
            title="Chưa có template"
            description="Bắt đầu bằng cách tạo template đầu tiên"
            actions={
              <Button onClick={() => navigate('/admin/templates/new')}>
                <Plus size={16} />
                Tạo Template
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 font-semibold text-slate-700">Tên</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Mô tả</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">Phòng ban</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">Task</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Trạng thái</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {templates.map((template) => (
                  <tr key={template.id} className="transition hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{template.name}</td>
                    <td className="px-4 py-3 text-slate-600 line-clamp-1">
                      {template.description || '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {template.departmentCount || 0}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {template.taskCount || 0}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={template.status || 'ACTIVE'} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => navigate(`/admin/templates/${template.id}`)}
                          className="rounded-lg p-2 text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600"
                          title="Sửa"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(template)}
                          className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                          title="Xóa"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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

      {/* Delete Confirm Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Xóa template"
        message={`Bạn có chắc chắn muốn xóa template "${deleteTarget?.name}"? Hành động này không thể hoàn tác.`}
        isLoading={deleteMutation.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </AppLayout>
  );
};

export default AdminTemplateListPage;
