import { X, Zap } from 'lucide-react';
import { Button, Panel, StatusBadge } from './ui';
import { formatDate } from '../utils/dateUtils';

const TemplatePreviewModal = ({ isOpen, template, onClose, onInstantiate }) => {
  if (!isOpen || !template) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Panel className="relative w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-6">
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-bold text-slate-950">{template.name}</h2>
            {template.description && (
              <p className="mt-2 text-slate-600">{template.description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex-none rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="text-xs font-semibold text-slate-500">TRẠNG THÁI</p>
              <StatusBadge status={template.status || 'ACTIVE'} className="mt-2" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">PHÒNG BAN</p>
              <p className="mt-2 text-lg font-bold text-slate-900">{template.departmentCount || 0}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">TASK</p>
              <p className="mt-2 text-lg font-bold text-slate-900">{template.taskCount || 0}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">TẠO LÚC</p>
              <p className="mt-2 text-sm text-slate-600">{formatDate(template.createdAt)}</p>
            </div>
          </div>

          {/* Departments Section */}
          {template.departments && template.departments.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700">Phòng ban</h3>
              <div className="mt-3 space-y-2">
                {template.departments.map((dept) => (
                  <div key={dept.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                    <div>
                      <p className="font-medium text-slate-900">{dept.name}</p>
                      {dept.description && (
                        <p className="text-sm text-slate-500">{dept.description}</p>
                      )}
                    </div>
                    <span className="text-xs font-semibold text-slate-500">
                      {dept.taskCount || 0} task
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tasks Section */}
          {template.tasks && template.tasks.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700">Task</h3>
              <div className="mt-3 space-y-2">
                {template.tasks.slice(0, 10).map((task) => (
                  <div key={task.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                    <div>
                      <p className="font-medium text-slate-900">{task.name}</p>
                      {task.description && (
                        <p className="text-sm text-slate-500 line-clamp-1">{task.description}</p>
                      )}
                    </div>
                    <span className="text-xs font-semibold text-slate-500">
                      {task.priority || 'MEDIUM'}
                    </span>
                  </div>
                ))}
                {template.tasks.length > 10 && (
                  <p className="text-xs text-slate-500 text-center pt-2">
                    ...và {template.tasks.length - 10} task khác
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 border-t border-slate-200 p-6">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Hủy
          </Button>
          <Button onClick={() => onInstantiate(template)} className="flex-1">
            <Zap size={18} />
            Dùng Template này
          </Button>
        </div>
      </Panel>
    </div>
  );
};

export default TemplatePreviewModal;
