import { useState } from 'react';
import { Save, X } from 'lucide-react';
import { HIDDEN_SUGGESTION_KEYS } from '../utils/aiSuggestionUtils';

const AiSuggestionDetailModal = ({
  isOpen,
  title = 'Chi tiết gợi ý AI',
  suggestion,
  editable = true,
  onSave,
  onClose,
}) => {
  if (!isOpen || !suggestion) {
    return null;
  }

  return (
    <AiSuggestionDetailModalContent
      key={getSuggestionIdentity(suggestion)}
      title={title}
      suggestion={suggestion}
      editable={editable}
      onSave={onSave}
      onClose={onClose}
    />
  );
};

const AiSuggestionDetailModalContent = ({
  title,
  suggestion,
  editable,
  onSave,
  onClose,
}) => {
  const [draft, setDraft] = useState(() => cloneValue(suggestion));

  const canEdit = editable && typeof onSave === 'function';
  const entries = toEntries(draft).filter(([key]) => !HIDDEN_SUGGESTION_KEYS.has(key));
  const handleSave = () => {
    onSave?.(draft);
    onClose?.();
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/55 px-3 py-6 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-600">
              Gợi ý AI
            </p>
            <h3 className="mt-1 break-words text-xl font-black text-slate-950">
              {title}
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-slate-500 transition hover:bg-white hover:text-slate-950"
            aria-label="Đóng chi tiết gợi ý"
          >
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto p-5">
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="w-full border-collapse text-left text-sm">
              <tbody>
                {entries.map(([key, value]) => (
                  <tr key={key} className="border-b border-slate-100 last:border-b-0">
                    <th className="w-44 bg-slate-50 px-4 py-3 align-top text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                      {formatKey(key)}
                    </th>
                    <td className="px-4 py-3 align-top">
                      <DetailValue
                        value={value}
                        editable={canEdit}
                        onChange={(nextValue) => setDraft((old) => setValueAtPath(old, [key], nextValue))}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {canEdit && (
          <div className="flex shrink-0 justify-end gap-2 border-t border-slate-200 bg-white px-5 py-3">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-10 items-center justify-center rounded-md border border-slate-200 bg-white px-4 text-sm font-black text-slate-600 transition hover:bg-slate-50"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-black text-white transition hover:bg-slate-800"
            >
              <Save size={16} />
              Lưu chỉnh sửa
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const DetailValue = ({ value, editable = false, onChange }) => {
  if (value == null || value === '') {
    return editable
      ? <EditableScalar value="" onChange={onChange} />
      : <span className="font-semibold text-slate-400">-</span>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="font-semibold text-slate-400">-</span>;
    }

    return (
      <div className="space-y-3">
        {value.map((item, index) => (
          <div key={index} className="rounded-md border border-slate-100 bg-slate-50/60 p-3">
            <p className="mb-2 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
              Dòng {index + 1}
            </p>
            <DetailValue
              value={item}
              editable={editable}
              onChange={(nextValue) => onChange?.(value.map((oldItem, itemIndex) => (
                itemIndex === index ? nextValue : oldItem
              )))}
            />
          </div>
        ))}
      </div>
    );
  }

  if (typeof value === 'object') {
    return (
      <div className="grid gap-2">
                {toEntries(value).filter(([key]) => !HIDDEN_SUGGESTION_KEYS.has(key)).map(([key, nestedValue]) => (
          <div key={key} className="grid gap-1 rounded-md bg-slate-50 px-3 py-2 sm:grid-cols-[160px_minmax(0,1fr)]">
            <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
              {formatKey(key)}
            </span>
            <DetailValue
              value={nestedValue}
              editable={editable}
              onChange={(nextValue) => onChange?.(setValueAtPath(value, [key], nextValue))}
            />
          </div>
        ))}
      </div>
    );
  }

  if (typeof value === 'boolean') {
    return editable ? (
      <label className="inline-flex items-center gap-2 font-semibold text-slate-700">
        <input
          type="checkbox"
          checked={value}
          onChange={(event) => onChange?.(event.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-200"
        />
        {value ? 'Có' : 'Không'}
      </label>
    ) : (
      <span className="font-semibold text-slate-700">{value ? 'Có' : 'Không'}</span>
    );
  }

  if (editable) {
    return <EditableScalar value={value} onChange={onChange} />;
  }

  return (
    <p className="whitespace-pre-wrap break-words font-semibold leading-6 text-slate-700">
      {String(value)}
    </p>
  );
};

const EditableScalar = ({ value, onChange }) => (
  <textarea
    value={String(value ?? '')}
    onChange={(event) => onChange?.(event.target.value)}
    rows={String(value ?? '').length > 80 || String(value ?? '').includes('\n') ? 4 : 1}
    className="min-h-10 w-full resize-y rounded-md border border-slate-200 bg-white px-3 py-2 font-semibold leading-6 text-slate-700 outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100"
  />
);

const toEntries = (value) => Object.entries(value || {});

const formatKey = (key) => KEY_LABELS[key] || key
  .replace(/([A-Z])/g, ' $1')
  .replace(/_/g, ' ')
  .trim()
  .replace(/^./, (letter) => letter.toUpperCase());

const cloneValue = (value) => {
  if (value == null) {
    return value;
  }
  return JSON.parse(JSON.stringify(value));
};

const setValueAtPath = (source, path, value) => {
  const clone = Array.isArray(source) ? [...source] : { ...(source || {}) };
  let cursor = clone;
  path.slice(0, -1).forEach((key) => {
    cursor[key] = Array.isArray(cursor[key]) ? [...cursor[key]] : { ...(cursor[key] || {}) };
    cursor = cursor[key];
  });
  cursor[path[path.length - 1]] = value;
  return clone;
};

const getSuggestionIdentity = (suggestion) => JSON.stringify({
  key: suggestion?.key,
  rowId: suggestion?.__rowId,
  index: suggestion?.__suggestionIndex,
  phaseIndex: suggestion?.__phaseIndex,
  title: suggestion?.title,
  name: suggestion?.name,
});

const KEY_LABELS = {
  name: 'Tên',
  title: 'Tiêu đề',
  description: 'Mô tả',
  objective: 'Mục tiêu',
  phaseName: 'Phase',
  expectedResult: 'Kết quả kỳ vọng',
  expectedDeadline: 'Hạn kỳ vọng',
  deadline: 'Hạn',
  priority: 'Ưu tiên',
  status: 'Trạng thái',
  startTime: 'Bắt đầu',
  endTime: 'Kết thúc',
  location: 'Địa điểm',
  type: 'Loại',
  departmentId: 'ID ban',
  assigneeId: 'ID người phụ trách',
  orderIndex: 'Thứ tự',
  phases: 'Danh sách phase',
};

export default AiSuggestionDetailModal;
