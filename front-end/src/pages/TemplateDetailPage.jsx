import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import {
  Button,
  ErrorState,
  LoadingState,
  StatusBadge,
} from '../components/ui';
import TemplateInstantiationModal from '../components/TemplateInstantiationModal';
import templateApi from '../api/templateApi';
import { formatDate } from '../utils/dateUtils';

const TemplateDetailPage = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const { templateId } = useParams();
  const [showInstantiateModal, setShowInstantiateModal] = useState(false);

  const query = useQuery({
    queryKey: ['template', templateId],
    queryFn: () => templateApi.getTemplate(templateId),
    enabled: Boolean(templateId),
  });

  const template = query.data;

  const handleInstantiateSuccess = (newEvent) => {
    navigate(`/events/${newEvent.id}`);
  };

  if (query.isLoading) {
    return (
      <AppLayout user={user} events={[]} selectedEvent={null} onLogout={onLogout}>
        <LoadingState message="Đang tải template..." />
      </AppLayout>
    );
  }

  if (query.error || !template) {
    return (
      <AppLayout user={user} events={[]} selectedEvent={null} onLogout={onLogout}>
        <div className="mx-auto max-w-7xl">
          <ErrorState
            error={query.error}
            title="Không tải được template"
            onDismiss={() => navigate('/events/templates')}
          />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout user={user} events={[]} selectedEvent={null} onLogout={onLogout}>
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <section className="flex items-start gap-4">
          <Button
            variant="subtle"
            onClick={() => navigate('/events/templates')}
            className="flex-none"
          >
            <ArrowLeft size={18} />
            Quay lại
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-slate-950">{template.name}</h1>
            {template.description && (
              <p className="mt-2 text-slate-600">{template.description}</p>
            )}
          </div>
        </section>

        {/* Template Metadata */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold text-slate-500">TRẠNG THÁI</p>
            <div className="mt-2">
              <StatusBadge status={template.status || 'ACTIVE'} />
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold text-slate-500">PHÒNG BAN</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{template.departmentCount || 0}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold text-slate-500">TASK</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{template.taskCount || 0}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold text-slate-500">TẠO LÚC</p>
            <p className="mt-2 text-sm text-slate-600">{formatDate(template.createdAt)}</p>
          </div>
        </section>

        {/* Departments Section */}
        {template.departments && template.departments.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-slate-950 mb-4">Phòng ban ({template.departments.length})</h2>
            <div className="space-y-3">
              {template.departments.map((dept) => (
                <div
                  key={dept.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 hover:shadow-md transition"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900">{dept.name}</h3>
                      {dept.description && (
                        <p className="mt-1 text-sm text-slate-600">{dept.description}</p>
                      )}
                    </div>
                    <span className="flex-none rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700">
                      {dept.taskCount || 0} task
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Tasks Section */}
        {template.tasks && template.tasks.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-slate-950 mb-4">Task ({template.tasks.length})</h2>
            <div className="space-y-3">
              {template.tasks.map((task) => (
                <div
                  key={task.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 hover:shadow-md transition"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900">{task.name}</h3>
                      {task.description && (
                        <p className="mt-1 text-sm text-slate-600">{task.description}</p>
                      )}
                    </div>
                    <div className="flex-none flex gap-2">
                      {task.priority && (
                        <span className="rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
                          {task.priority}
                        </span>
                      )}
                      {task.status && (
                        <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                          {task.status}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Action Button */}
        <section className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => navigate('/events/templates')}
            className="flex-1"
          >
            Quay lại danh sách
          </Button>
          <Button
            onClick={() => setShowInstantiateModal(true)}
            className="flex-1"
          >
            Dùng template này
          </Button>
        </section>
      </div>

      {/* Modals */}
      <TemplateInstantiationModal
        isOpen={showInstantiateModal}
        template={template}
        onClose={() => setShowInstantiateModal(false)}
        onSuccess={handleInstantiateSuccess}
      />
    </AppLayout>
  );
};

export default TemplateDetailPage;
