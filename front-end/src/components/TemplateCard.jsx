import { Eye, Zap } from 'lucide-react';
import { Button, Panel, StatusBadge } from './ui';
import { formatDate } from '../utils/dateUtils';

const TemplateCard = ({ template, onPreview, onSelect }) => {
  return (
    <Panel className="flex flex-col gap-4 p-4 transition hover:shadow-md">
      {/* Header */}
      <div className="flex-1">
        <h3 className="text-lg font-bold text-slate-950 line-clamp-2">{template?.name || 'Template'}</h3>
        {template?.description && (
          <p className="mt-2 text-sm text-slate-600 line-clamp-2">{template.description}</p>
        )}
      </div>

      {/* Stats */}
      <div className="flex gap-4 border-t border-slate-200 pt-3">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-semibold text-slate-500">PHÒNG BAN</p>
          <p className="text-lg font-bold text-slate-900">{template?.departmentCount || 0}</p>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-xs font-semibold text-slate-500">TASK</p>
          <p className="text-lg font-bold text-slate-900">{template?.taskCount || 0}</p>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-xs font-semibold text-slate-500">TRẠNG THÁI</p>
          <StatusBadge status={template?.status || 'ACTIVE'} className="text-xs" />
        </div>
      </div>

      {/* Metadata */}
      {template?.createdAt && (
        <p className="text-xs text-slate-500">Tạo: {formatDate(template.createdAt)}</p>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-2 border-t border-slate-200">
        {onPreview && (
          <Button
            variant="secondary"
            onClick={() => onPreview(template)}
            className="flex-1 text-xs"
          >
            <Eye size={16} />
            Xem
          </Button>
        )}
        {onSelect && (
          <Button
            onClick={() => onSelect(template)}
            className="flex-1 text-xs"
          >
            <Zap size={16} />
            Dùng ngay
          </Button>
        )}
      </div>
    </Panel>
  );
};

export default TemplateCard;
